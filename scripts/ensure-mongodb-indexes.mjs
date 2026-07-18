import "dotenv/config";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "freyaseo";

if (!uri) {
  console.error("MONGODB_URI is required.");
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

async function hasDuplicateTranslations(collectionName, groupField, localeField) {
  const duplicates = await db
    .collection(collectionName)
    .aggregate([
      {
        $match: {
          [groupField]: { $type: "string", $ne: "" },
          [localeField]: { $type: "string", $ne: "" },
        },
      },
      {
        $group: {
          _id: { group: `$${groupField}`, locale: `$${localeField}` },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .toArray();

  return duplicates.length > 0;
}

const [hasDuplicatePageTranslations, hasDuplicateBlogTranslations] = await Promise.all([
  hasDuplicateTranslations("pages", "translationKey", "locale"),
  hasDuplicateTranslations("blogPosts", "translationGroup", "language"),
]);

const indexOperations = [
  db.collection("users").createIndex({ email: 1 }, { unique: true }),
  db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
  db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  db.collection("pages").createIndex({ locale: 1, path: 1 }, { unique: true }),
  db.collection("pages").createIndex({ path: 1 }),
  db.collection("pages").createIndex({ translationKey: 1 }),
  db.collection("pages").createIndex({ updatedAt: -1 }),
  db.collection("pages").createIndex({ locale: 1, slug: 1 }),
  db.collection("blogPosts").createIndex({ language: 1, slug: 1 }, { unique: true }),
  db.collection("blogPosts").createIndex({ translationGroup: 1 }),
  db.collection("blogPosts").createIndex({ language: 1, draft: 1, publishedDate: -1, updatedAt: -1 }),
  db.collection("mediaAssets").createIndex({ url: 1 }, { unique: true }),
  db.collection("mediaAssets").createIndex({ updatedAt: -1 }),
  db.collection("redirects").createIndex({ sourceUrl: 1 }, { unique: true }),
  db.collection("redirects").createIndex({ sourceUrl: 1, active: 1 }),
  db.collection("settings").createIndex({ key: 1 }, { unique: true }),
  db.collection("auditLogs").createIndex({ createdAt: -1 }),
  db.collection("formSubmissions").createIndex({ formKey: 1, createdAt: -1 }),
];

if (hasDuplicatePageTranslations) {
  console.warn("Skipped unique page translation index because duplicate page translations already exist.");
  indexOperations.push(db.collection("pages").createIndex({ translationKey: 1, locale: 1 }, { name: "pages_translation_locale_lookup" }));
} else {
  indexOperations.push(
    db.collection("pages").createIndex(
      { translationKey: 1, locale: 1 },
      {
        name: "pages_translation_locale_unique",
        unique: true,
        partialFilterExpression: {
          translationKey: { $type: "string" },
          locale: { $type: "string" },
        },
      },
    ),
  );
}

if (hasDuplicateBlogTranslations) {
  console.warn("Skipped unique blog translation index because duplicate blog translations already exist.");
  indexOperations.push(db.collection("blogPosts").createIndex({ translationGroup: 1, language: 1 }, { name: "blog_translation_locale_lookup" }));
} else {
  indexOperations.push(
    db.collection("blogPosts").createIndex(
      { translationGroup: 1, language: 1 },
      {
        name: "blog_translation_locale_unique",
        unique: true,
        partialFilterExpression: {
          translationGroup: { $type: "string" },
          language: { $type: "string" },
        },
      },
    ),
  );
}

await Promise.all(indexOperations);

await client.close();
console.log("MongoDB indexes are ready.");
