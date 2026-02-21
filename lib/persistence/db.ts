import { openDB, type IDBPDatabase } from "idb";
import type { VisionBatchDB } from "./schema";

const DB_NAME = "visionbatch-db";
const DB_VERSION = 2; // v2: adds originalFiles store

// One-time migration: delete the legacy "tagarchitect-db" so returning users
// don't accumulate a stale unused database in their browser.
const LEGACY_DB_NAME = "tagarchitect-db";
let legacyCleanupDone = false;

async function deleteIfExists(name: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve(); // non-fatal
      req.onblocked = () => resolve(); // proceed even if blocked
    });
  } catch {
    // best-effort — never block the main DB open
  }
}

let dbInstance: IDBPDatabase<VisionBatchDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<VisionBatchDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  // Run legacy cleanup once per browser session before opening the new DB
  if (!legacyCleanupDone) {
    legacyCleanupDone = true;
    await deleteIfExists(LEGACY_DB_NAME);
  }

  dbInstance = await openDB<VisionBatchDB>(DB_NAME, DB_VERSION, {
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

      // v2: Original high-res files, stored as File objects (structured-clone).
      // Keyed by imageId. Written at upload time; deleted with the image.
      if (!db.objectStoreNames.contains("originalFiles")) {
        db.createObjectStore("originalFiles", { keyPath: "imageId" });
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

// ── originalFiles CRUD ──────────────────────────────────────────────────────

/**
 * Persist a raw File to the originalFiles store.
 * IDB stores File objects natively via structured-clone — no ArrayBuffer needed.
 * Call this during upload, after thumbnail generation, before dropping the File reference.
 */
export async function saveOriginalFile(imageId: string, file: File): Promise<void> {
  const db = await getDB();
  await db.put("originalFiles", { imageId, file, storedAt: Date.now() });
}

/**
 * Retrieve the original File for an image (e.g. for high-res export).
 * Returns undefined if the file was never persisted or has been cleaned up.
 */
export async function getOriginalFile(imageId: string): Promise<File | undefined> {
  const db = await getDB();
  const record = await db.get("originalFiles", imageId);
  return record?.file;
}

/**
 * Delete the original File for a single image.
 * Call this when an image is removed from the batch.
 */
export async function deleteOriginalFile(imageId: string): Promise<void> {
  const db = await getDB();
  await db.delete("originalFiles", imageId);
}

// ── Session / batch cleanup ──────────────────────────────────────────────────

export async function clearSessionData(sessionId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["batches", "groups", "images", "blobs", "originalFiles"], "readwrite");

  // Get all images for this session to find their associated record IDs
  const images = await tx.objectStore("images").index("bySession").getAll(sessionId);
  const imageIds = images.map((img) => img.id);

  // Delete blobs + originalFiles
  const blobStore = tx.objectStore("blobs");
  const origStore = tx.objectStore("originalFiles");
  await Promise.all([
    ...imageIds.map((id) => blobStore.delete(id)),
    ...imageIds.map((id) => origStore.delete(id)),
  ]);

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
  const db = await getDB();
  const tx = db.transaction(["batches", "groups", "images", "blobs", "originalFiles"], "readwrite");

  await tx.objectStore("batches").clear();
  await tx.objectStore("groups").clear();
  await tx.objectStore("images").clear();
  await tx.objectStore("blobs").clear();
  await tx.objectStore("originalFiles").clear();

  await tx.done;
}

/**
 * Delete a single image and its blob from IndexedDB
 */
export async function deleteImageData(imageId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["images", "blobs", "originalFiles"], "readwrite");
  await tx.objectStore("images").delete(imageId);
  await tx.objectStore("blobs").delete(imageId);
  await tx.objectStore("originalFiles").delete(imageId);
  await tx.done;
}

/**
 * Delete a group and all its images/blobs from IndexedDB
 */
export async function deleteGroupData(groupId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["groups", "images", "blobs"], "readwrite");

  // Get all images in this group
  const images = await tx.objectStore("images").index("byGroup").getAll(groupId);
  const imageIds = images.map((img) => img.id);

  // Delete all blobs
  const blobStore = tx.objectStore("blobs");
  await Promise.all(imageIds.map((id) => blobStore.delete(id)));

  // Delete all images
  const imageStore = tx.objectStore("images");
  await Promise.all(images.map((img) => imageStore.delete(img.id)));

  // Delete the group
  await tx.objectStore("groups").delete(groupId);

  await tx.done;
}

/**
 * Debug: Get counts of all items in database
 */
export async function getDBStats(): Promise<{
  batches: number;
  groups: number;
  images: number;
  blobs: number;
  originalFiles: number;
}> {
  const db = await getDB();
  const batches = await db.count("batches");
  const groups = await db.count("groups");
  const images = await db.count("images");
  const blobs = await db.count("blobs");
  const originalFiles = await db.count("originalFiles");

  return { batches, groups, images, blobs, originalFiles };
}
