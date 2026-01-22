import { openDB, type IDBPDatabase } from "idb";
import type { TagArchitectDB } from "./schema";

const DB_NAME = "tagarchitect-db";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<TagArchitectDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<TagArchitectDB>> {
  if (dbInstance) {
    console.log("[DB] Returning cached DB instance");
    return dbInstance;
  }

  console.log(`[DB] Opening database: ${DB_NAME} v${DB_VERSION}`);

  dbInstance = await openDB<TagArchitectDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`[DB] UPGRADE: v${oldVersion} -> v${newVersion}`);

      // Batches store
      if (!db.objectStoreNames.contains("batches")) {
        console.log("[DB] Creating 'batches' store");
        db.createObjectStore("batches", { keyPath: "sessionId" });
      }

      // Groups store with session index
      if (!db.objectStoreNames.contains("groups")) {
        console.log("[DB] Creating 'groups' store with bySession index");
        const groupStore = db.createObjectStore("groups", { keyPath: "id" });
        groupStore.createIndex("bySession", "sessionId");
      }

      // Images store with indexes
      if (!db.objectStoreNames.contains("images")) {
        console.log("[DB] Creating 'images' store with byGroup and bySession indexes");
        const imageStore = db.createObjectStore("images", { keyPath: "id" });
        imageStore.createIndex("byGroup", "groupId");
        imageStore.createIndex("bySession", "sessionId");
      }

      // Blobs store
      if (!db.objectStoreNames.contains("blobs")) {
        console.log("[DB] Creating 'blobs' store");
        db.createObjectStore("blobs", { keyPath: "id" });
      }
    },
  });

  console.log("[DB] Database opened successfully");
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

/**
 * NUCLEAR OPTION: Clear ALL data from ALL stores.
 * Use this to fix corrupted database state.
 */
export async function nukeAllData(): Promise<void> {
  console.log("[DB] ====== NUKING ALL DATA ======");
  const db = await getDB();
  const tx = db.transaction(["batches", "groups", "images", "blobs"], "readwrite");

  // Clear all stores
  await tx.objectStore("batches").clear();
  await tx.objectStore("groups").clear();
  await tx.objectStore("images").clear();
  await tx.objectStore("blobs").clear();

  await tx.done;
  console.log("[DB] ====== ALL DATA NUKED ======");
}

/**
 * Debug: Get counts of all items in database
 */
export async function getDBStats(): Promise<{
  batches: number;
  groups: number;
  images: number;
  blobs: number;
}> {
  const db = await getDB();
  const batches = await db.count("batches");
  const groups = await db.count("groups");
  const images = await db.count("images");
  const blobs = await db.count("blobs");

  console.log(`[DB] Stats: batches=${batches}, groups=${groups}, images=${images}, blobs=${blobs}`);
  return { batches, groups, images, blobs };
}
