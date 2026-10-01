import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export const ROOT_DIR = path.resolve(import.meta.dirname, "../../../..");
export const DATA_DIR = process.env.GARAGE_DATA_DIR ?? path.join(ROOT_DIR, "data");
export const DB_PATH = path.join(DATA_DIR, "garage.db");
const MIGRATIONS_DIR = path.join(import.meta.dirname, "migrations");

export type DB = BetterSQLite3Database<typeof schema>;

let sqlite: Database.Database;
let current: DB;

function open(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  current = drizzle(sqlite, { schema });
  migrate(current, { migrationsFolder: MIGRATIONS_DIR });
}

export function initDb(file = DB_PATH) {
  open(file);
}

export function closeDb() {
  sqlite?.close();
}

/** Rouvre la base (après une restauration de sauvegarde). */
export function reopenDb(file = DB_PATH) {
  closeDb();
  open(file);
}

export function getSqlite() {
  return sqlite;
}

/** Accès à la base courante ; reste valide après une restauration. */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const value = (current as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(current) : value;
  },
});
