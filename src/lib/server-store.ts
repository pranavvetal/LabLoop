// ============================================================
// LabLoop Enterprise — Server-Side Persistent Store
// ============================================================
// A zero-dependency, file-backed JSON store that gives every browser
// instance of the app a single shared source of truth.
//
// The entire LabloopDB is serialized to <repo>/data/labloop.json on the
// server. Reads and writes are atomic (temp-file + rename) and serialized
// through an in-process promise chain so concurrent requests can never
// produce a torn write.
//
// This module is intentionally dependency-free (node:fs only) so it works
// out of the box on the Render host. Swapping in PostgreSQL later is a
// drop-in replacement of this file's internals.
// ============================================================

import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LabloopDB, initializeSeedWithHashes } from './db';

// Resolve <repo>/data regardless of where this file is compiled to.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DB_DIR = resolve(REPO_ROOT, 'data');
export const DB_PATH = resolve(DB_DIR, 'labloop.json');
export const DB_TMP_PATH = resolve(DB_DIR, 'labloop.json.tmp');

let writeQueue: Promise<void> = Promise.resolve();

/**
 * Serialize all writes through a single promise chain so two concurrent
 * requests cannot read-then-write the same file and lose an update.
 */
export function withServerLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(fn, fn);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

/**
 * Ensure the data directory exists and is writable.
 */
export async function ensureDBDir(): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
}

/**
 * Atomically write the full DB to disk. Writes to a temp file first and
 * renames over the target so a crash mid-write never corrupts the DB.
 */
export async function saveServerDB(db: LabloopDB): Promise<void> {
  await ensureDBDir();
  const payload = JSON.stringify(db);
  await fs.writeFile(DB_TMP_PATH, payload, 'utf-8');
  await fs.rename(DB_TMP_PATH, DB_PATH);
}

/**
 * Read the full DB from disk. Returns null if no DB file exists yet.
 */
export async function loadServerDB(): Promise<LabloopDB | null> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as LabloopDB;
    if (!parsed.version || parsed.version < 1) {
      return null;
    }
    return parsed;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    console.error('Failed reading server DB, reseeding:', err);
    return null;
  }
}

/**
 * Initialize the server DB from seed data on first boot. The seed is
 * hashed asynchronously so the persisted audit log is cryptographically
 * valid (SHA-256 hash chain).
 */
export async function initializeServerDB(): Promise<LabloopDB> {
  const existing = await loadServerDB();
  if (existing) return existing;

  const seeded = await initializeSeedWithHashes();
  await saveServerDB(seeded);
  console.log('[server-store] Seeded server DB at', DB_PATH);
  return seeded;
}

/**
 * Get the authoritative DB, initializing it on first run.
 */
export async function getServerDB(): Promise<LabloopDB> {
  return withServerLock(async () => {
    const existing = await loadServerDB();
    if (existing) return existing;
    return initializeServerDB();
  });
}

/**
 * Apply a partial patch to the DB and persist it. Merges shallowly per
 * top-level entity array (resources, bookings, etc.) so callers can send
 * only the fields that changed.
 */
export async function patchServerDB(patch: Partial<LabloopDB>): Promise<LabloopDB> {
  return withServerLock(async () => {
    const current = await loadServerDB();
    const base: LabloopDB = current ?? (await initializeSeedWithHashes());

    const merged: LabloopDB = { ...base } as LabloopDB;
    (Object.keys(patch) as Array<keyof LabloopDB>).forEach((key) => {
      const value = patch[key];
      if (value === undefined) return;
      // Top-level entity arrays are replaced wholesale; this matches the
      // semantics of the old saveDB() which persisted the full object.
      (merged as any)[key] = value;
    });

    await saveServerDB(merged);
    return merged;
  });
}