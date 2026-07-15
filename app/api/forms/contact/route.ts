import crypto from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { isMongoConfigured, mongoCollection } from "@/src/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const submissionSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().max(220),
  phone: z.string().max(80).optional().default(""),
  subject: z.string().max(180).optional().default("Website contact"),
  message: z.string().max(2000).optional().default(""),
  sourcePage: z.string().max(300).optional().default("/"),
  language: z.enum(["en", "el"]).optional().default("en"),
});

function clean(value: string) {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

function hashIp(value: string | null) {
  if (!value) return null;
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function getContactFormId() {
  const forms = await mongoCollection("forms");
  const existing = await forms.findOne({ key: "contact" });
  if (existing?._id) return String(existing._id);
  const result = await forms.insertOne({
    key: "contact",
    title: { en: "Contact", el: "Contact" },
    submitLabel: { en: "Submit", el: "Submit" },
    successMessage: { en: "Thank you.", el: "Thank you." },
    errorMessage: { en: "Please check the form.", el: "Please check the form." },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId.toHexString();
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Please check the form and try again." }, { status: 400 });
  }

  if (!isMongoConfigured()) {
    return Response.json({ ok: true, stored: false });
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipHash = hashIp(forwardedFor?.split(",")[0]?.trim() || null);
  if (ipHash) {
    const recent = await (await mongoCollection("formSubmissions")).countDocuments({
      ipHash,
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    });
    if (recent >= 5) {
      return Response.json({ ok: false, message: "Please wait before sending another message." }, { status: 429 });
    }
  }

  const data = parsed.data;
  const formId = await getContactFormId();
  await (await mongoCollection("formSubmissions")).insertOne({
    formId,
    formKey: "contact",
    name: clean(data.name),
    email: clean(data.email),
    phone: clean(data.phone),
    subject: clean(data.subject),
    message: clean(data.message),
    sourcePage: clean(data.sourcePage),
    language: data.language,
    payload: {
      sourcePage: clean(data.sourcePage),
    },
    ipHash,
    userAgent: request.headers.get("user-agent") || "",
    createdAt: new Date(),
  });

  return Response.json({ ok: true, stored: true });
}
