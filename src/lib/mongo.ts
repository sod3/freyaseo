import type { Collection, Db, Document, Filter, MongoClient, ObjectId } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

let mongoModulePromise: Promise<typeof import("mongodb")> | undefined;

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI?.startsWith("mongodb"));
}

export function mongoDatabaseName() {
  return process.env.MONGODB_DB || "freyaseo";
}

function mongoModule() {
  mongoModulePromise ||= import("mongodb");
  return mongoModulePromise;
}

async function clientPromise() {
  if (!isMongoConfigured()) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!globalForMongo.mongoClientPromise) {
    const { MongoClient } = await mongoModule();
    const client = new MongoClient(process.env.MONGODB_URI || "");
    globalForMongo.mongoClientPromise = client.connect();
  }

  return globalForMongo.mongoClientPromise;
}

export async function mongoDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(mongoDatabaseName());
}

export async function mongoCollection<T extends Document = Document>(name: string): Promise<Collection<T>> {
  const db = await mongoDb();
  return db.collection<T>(name);
}

function looksLikeObjectId(id: string) {
  return /^[a-f\d]{24}$/i.test(id);
}

export async function toObjectId(id: string) {
  if (!looksLikeObjectId(id)) return id;
  const { ObjectId } = await mongoModule();
  return ObjectId.isValid(id) ? new ObjectId(id) : id;
}

export function documentId(document: { _id?: unknown; id?: string }) {
  if (document.id) return document.id;
  if (document._id && typeof document._id === "object" && "toHexString" in document._id && typeof document._id.toHexString === "function") {
    return document._id.toHexString();
  }
  return String(document._id || "");
}

export async function withMongo<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  if (!isMongoConfigured()) return fallback;

  try {
    return await operation();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("CMS MongoDB unavailable; using local migration source.", error);
    }
    return fallback;
  }
}

export function mongoNow() {
  return new Date();
}

export type CmsDocument<T extends Document = Document> = T & {
  _id?: ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export async function idFilter(id: string): Promise<Filter<Document>> {
  const converted = await toObjectId(id);
  return ({ _id: converted } as unknown) as Filter<Document>;
}
