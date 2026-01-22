import { openDB, type IDBPDatabase } from "idb";
import type { TagArchitectDB } from "./schema";

const DB_NAME = "tagarchitect-db";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<TagArchitectDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<TagArchitectDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<TagArchitectDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Batches store
      if (!db.objectStoreNames.contains("batches")) {
        db.createObjectStore("batches", { keyPath: "sessionId" });
      }

      // Groups store with session index
      if (!db.objectStoreNames.contains("groups")) {
        const groupStore = db.createObjectStore("groups", { keyPath: "id" });
        groupStore.createIndex("bySession", "sessionId");
      }

      // Images store with indexes
      if (!db.objectStoreNames.contains("images")) {
        const imageStore = db.createObjectStore("images", { keyPath: "id" });
        imageStore.createIndex("byGroup", "groupId");
        imageStore.createIndex("bySession", "sessionId");
      }

      // Blobs store
      if (!db.objectStoreNames.contains("blobs")) {
        db.createObjectStore("blobs", { keyPath: "id" });
      }
    },
  });

  return dbInstance;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function clearSessionData(sessionId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["batches", "groups", "images", "blobs"], "readwrite");

  // Get all images for this session to find their blob IDs
  const images = await tx.objectStore("images").index("bySession").getAll(sessionId);
  const blobIds = images.map((img) => img.id);

  // Delete blobs
  const blobStore = tx.objectStore("blobs");
  await Promise.all(blobIds.map((id) => blobStore.delete(id)));

  // Delete images
  const imageStore = tx.objectStore("images");
  await Promise.all(images.map((img) => imageStore.delete(img.id)));

  // Delete groups
  const groups = await tx.objectStore("groups").index("bySession").getAll(sessionId);
  const groupStore = tx.objectStore("groups");
  await Promise.all(groups.map((g) => groupStore.delete(g.id)));

  // Delete batch
  await tx.objectStore("batches").delete(sessionId);

  await tx.done;
}
