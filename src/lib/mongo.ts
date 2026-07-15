import { MongoClient, ObjectId, type Collection, type Db, type Document, type Filter } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI?.startsWith("mongodb"));
}

export function mongoDatabaseName() {
  return process.env.MONGODB_DB || "freyaseo";
}

function clientPromise() {
  if (!isMongoConfigured()) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!globalForMongo.mongoClientPromise) {
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

export function toObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : id;
}

export function documentId(document: { _id?: unknown; id?: string }) {
  if (document.id) return document.id;
  if (document._id instanceof ObjectId) return document._id.toHexString();
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
  _id?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export function idFilter(id: string): Filter<Document> {
  const converted = toObjectId(id);
  return ({ _id: converted } as unknown) as Filter<Document>;
}
