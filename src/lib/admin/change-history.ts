import crypto from "node:crypto";
import { BSON, type Document } from "mongodb";
import { assertNoRestoreInProgress } from "./backup-lock";
import { mongoCollection } from "@/src/lib/mongo";
import type { AdminModuleSlug } from "./modules";

const SAFE_COLLECTION_NAME = /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/;
const NEVER_UNDO_COLLECTIONS = new Set([
  "adminChanges",
  "auditLogs",
  "sessions",
  "loginAttempts",
  "passwordResetTokens",
  "websiteBackups",
  "websiteBackupLocks",
  "websiteRestoreOperations",
]);

export type AdminChangeRecord = {
  _id: string;
  action: string;
  module: AdminModuleSlug;
  collectionName: string;
  entityId: string;
  entityName: string;
  userId: string;
  userEmail: string;
  before: Document | null;
  after: Document | null;
  beforeFingerprint: string | null;
  afterFingerprint: string | null;
  status: "active" | "undoing" | "undone" | "conflict";
  reversible: boolean;
  undoOf?: string | null;
  undoneBy?: string | null;
  createdAt: Date;
  undoneAt?: Date | null;
};

export type RecordAdminChangeInput = {
  action: string;
  module: AdminModuleSlug;
  collectionName: string;
  entityId: string;
  entityName?: string;
  userId: string;
  userEmail: string;
  before: Document | null;
  after: Document | null;
  reversible?: boolean;
  undoOf?: string | null;
};

function canonicalEjson(value: unknown) {
  return BSON.EJSON.stringify(value, { relaxed: false });
}

export function documentFingerprint(value: unknown) {
  if (value === null || value === undefined) return null;
  return crypto.createHash("sha256").update(canonicalEjson(value)).digest("hex");
}

function documentKey(document: Document | null) {
  if (!document || document._id === null || document._id === undefined) throw new Error("A reversible change must include a document _id.");
  return document._id;
}

export async function recordAdminChange(input: RecordAdminChangeInput) {
  if (!SAFE_COLLECTION_NAME.test(input.collectionName) || NEVER_UNDO_COLLECTIONS.has(input.collectionName)) {
    throw new Error("This collection cannot be added to reversible history.");
  }
  const id = crypto.randomUUID();
  const reversible = input.reversible !== false;
  await (await mongoCollection<AdminChangeRecord>("adminChanges")).insertOne({
    _id: id,
    action: input.action,
    module: input.module,
    collectionName: input.collectionName,
    entityId: input.entityId,
    entityName: input.entityName || input.entityId,
    userId: input.userId,
    userEmail: input.userEmail,
    before: input.before,
    after: input.after,
    beforeFingerprint: documentFingerprint(input.before),
    afterFingerprint: documentFingerprint(input.after),
    status: "active",
    reversible,
    undoOf: input.undoOf || null,
    createdAt: new Date(),
    undoneAt: null,
  });
  return id;
}

export class ChangeConflictError extends Error {
  constructor() {
    super("This record has newer changes. Undo those first, or restore a full backup.");
    this.name = "ChangeConflictError";
  }
}

export async function undoAdminChange(changeId: string, user: { id: string; email: string }) {
  await assertNoRestoreInProgress();
  const changes = await mongoCollection<AdminChangeRecord>("adminChanges");
  const change = await changes.findOneAndUpdate(
    { _id: changeId, status: "active", reversible: true },
    { $set: { status: "undoing" } },
    { returnDocument: "before" },
  );
  if (!change) throw new Error("This change cannot be undone or has already been undone.");

  try {
    if (!SAFE_COLLECTION_NAME.test(change.collectionName) || NEVER_UNDO_COLLECTIONS.has(change.collectionName)) {
      throw new Error("This change targets a protected collection.");
    }
    const collection = await mongoCollection(change.collectionName);
    const key = documentKey(change.after || change.before);
    const current = await collection.findOne({ _id: key });
    if (documentFingerprint(current) !== change.afterFingerprint) {
      await changes.updateOne({ _id: changeId }, { $set: { status: "active" } });
      throw new ChangeConflictError();
    }

    if (change.before === null) {
      await collection.deleteOne({ _id: key });
    } else {
      await collection.replaceOne({ _id: key }, change.before, { upsert: true });
    }

    const inverseId = await recordAdminChange({
      action: `undo.${change.action}`,
      module: change.module,
      collectionName: change.collectionName,
      entityId: change.entityId,
      entityName: change.entityName,
      userId: user.id,
      userEmail: user.email,
      before: current,
      after: change.before,
      reversible: true,
      undoOf: change._id,
    });
    await changes.updateOne(
      { _id: changeId },
      { $set: { status: "undone", undoneAt: new Date(), undoneBy: inverseId } },
    );
    return { module: change.module, entityId: change.entityId, inverseId };
  } catch (error) {
    if (!(error instanceof ChangeConflictError)) {
      await changes.updateOne({ _id: changeId, status: "undoing" }, { $set: { status: "active" } });
    }
    throw error;
  }
}

export async function listAdminChanges(limit = 50) {
  const changes = await (await mongoCollection<AdminChangeRecord>("adminChanges"))
    .find({}, { projection: { before: 0, after: 0, beforeFingerprint: 0, afterFingerprint: 0 } })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .toArray();
  return changes;
}
