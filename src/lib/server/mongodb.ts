import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMongoConfigured(): boolean {
  return Boolean(uri && uri.startsWith("mongodb"));
}

/** Production must never run on the in-memory store. */
export function assertMongoConfiguredForProduction(): void {
  if (process.env.NODE_ENV === "production" && !isMongoConfigured()) {
    throw new Error(
      "MONGODB_URI is required in production. In-memory database fallback is disabled."
    );
  }
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!isMongoConfigured()) {
    throw new Error(
      process.env.NODE_ENV === "production"
        ? "MONGODB_URI is required in production. Set it in your hosting environment variables."
        : "MONGODB_URI is not set in .env.local! Please add your MongoDB Atlas connection string."
    );
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db();
}
