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

await Promise.all([
  db.collection("users").createIndex({ email: 1 }, { unique: true }),
  db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
  db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  db.collection("pages").createIndex({ locale: 1, path: 1 }, { unique: true }),
  db.collection("pages").createIndex({ path: 1 }),
  db.collection("pages").createIndex({ updatedAt: -1 }),
  db.collection("pages").createIndex({ locale: 1, slug: 1 }),
  db.collection("blogPosts").createIndex({ language: 1, slug: 1 }, { unique: true }),
  db.collection("blogPosts").createIndex({ language: 1, draft: 1, publishedDate: -1, updatedAt: -1 }),
  db.collection("mediaAssets").createIndex({ url: 1 }, { unique: true }),
  db.collection("mediaAssets").createIndex({ updatedAt: -1 }),
  db.collection("redirects").createIndex({ sourceUrl: 1 }, { unique: true }),
  db.collection("redirects").createIndex({ sourceUrl: 1, active: 1 }),
  db.collection("settings").createIndex({ key: 1 }, { unique: true }),
  db.collection("auditLogs").createIndex({ createdAt: -1 }),
  db.collection("formSubmissions").createIndex({ formKey: 1, createdAt: -1 }),
]);

await client.close();
console.log("MongoDB indexes are ready.");
