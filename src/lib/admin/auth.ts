import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Document, ObjectId } from "mongodb";
import { documentId, idFilter, isMongoConfigured, mongoCollection } from "@/src/lib/mongo";

export const ADMIN_SESSION_COOKIE = "freya_admin_session";
const SESSION_DAYS = 1;
const REMEMBER_DAYS = 30;
const CSRF_TTL_MS = 60 * 60 * 1000;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

type UserDoc = Document & {
  _id?: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  status?: string;
  mustChangePassword?: boolean;
  failedLoginCount?: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  deletedAt?: Date | null;
  roles?: string[];
};

type SessionDoc = Document & {
  tokenHash: string;
  userId: string;
  rememberMe?: boolean;
  expiresAt: Date;
  revokedAt?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastSeenAt?: Date | null;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
};

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  ADMINISTRATOR: ["dashboard.view", "content.read", "content.write", "content.publish", "media.write", "seo.write", "forms.read"],
  EDITOR: ["dashboard.view", "content.read", "content.write", "media.write"],
  VIEWER: ["dashboard.view", "content.read", "forms.read"],
};

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters for admin authentication.");
  }
  return secret;
}

function secureCookie() {
  return process.env.NODE_ENV === "production";
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sign(value: string) {
  return crypto.createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function getRequestMeta() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for") || "";
  return {
    ipAddress: forwardedFor.split(",")[0]?.trim() || headerStore.get("x-real-ip") || null,
    userAgent: headerStore.get("user-agent") || null,
  };
}

export async function createCsrfToken() {
  const nonce = crypto.randomBytes(24).toString("base64url");
  const timestamp = Date.now().toString();
  const payload = `${nonce}.${timestamp}`;
  return `${payload}.${sign(payload)}`;
}

export async function verifyCsrfToken(token: FormDataEntryValue | null) {
  if (typeof token !== "string") return false;
  const [nonce, timestamp, signature] = token.split(".");
  if (!nonce || !timestamp || !signature) return false;
  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > CSRF_TTL_MS || issuedAt > Date.now() + 60_000) return false;
  return safeEqual(signature, sign(`${nonce}.${timestamp}`));
}

export async function createSession(userId: string, rememberMe: boolean) {
  const token = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashToken(token);
  const days = rememberMe ? REMEMBER_DAYS : SESSION_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const meta = await getRequestMeta();
  const sessions = await mongoCollection<SessionDoc>("sessions");

  await sessions.insertOne({
    tokenHash,
    userId,
    rememberMe,
    expiresAt,
    revokedAt: null,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    createdAt: new Date(),
    lastSeenAt: new Date(),
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/admin",
    maxAge: days * 24 * 60 * 60,
  });
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token && isMongoConfigured()) {
    const sessions = await mongoCollection<SessionDoc>("sessions");
    await sessions.updateOne({ tokenHash: hashToken(token), revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export const getCurrentAdminUser = cache(async (): Promise<AdminUser | null> => {
  if (!isMongoConfigured()) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessions = await mongoCollection<SessionDoc>("sessions");
  const session = await sessions.findOne(
    { tokenHash: hashToken(token) },
    { projection: { userId: 1, expiresAt: 1, revokedAt: 1, lastSeenAt: 1 } },
  );
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;

  const users = await mongoCollection<UserDoc>("users");
  const user = await users.findOne(await idFilter(session.userId), {
    projection: { email: 1, name: 1, status: 1, mustChangePassword: 1, deletedAt: 1, roles: 1 },
  });
  if (!user || user.status === "DISABLED" || user.deletedAt) return null;

  const lastSeenAt = session.lastSeenAt instanceof Date ? session.lastSeenAt : null;
  if (!lastSeenAt || Date.now() - lastSeenAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
    await sessions.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
  }

  const roles = user.roles?.length ? user.roles : ["VIEWER"];
  const permissions = new Set<string>();
  for (const role of roles) {
    for (const permission of rolePermissions[role] || []) permissions.add(permission);
  }

  return {
    id: documentId(user),
    email: user.email,
    name: user.name,
    mustChangePassword: Boolean(user.mustChangePassword),
    roles,
    permissions: Array.from(permissions),
  };
});

export function can(user: AdminUser | null, permission: string) {
  return Boolean(user?.permissions.includes("*") || user?.permissions.includes(permission));
}

export async function requireAdminUser(permission = "dashboard.view") {
  const user = await getCurrentAdminUser();
  if (!user) redirect("/admin/login");
  if (!can(user, permission)) redirect("/admin/dashboard?error=forbidden");
  return user;
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
