import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { today } from "@garage/shared";
import { DATA_DIR, DB_PATH, getSqlite, reopenDb } from "../../db/client";
import { badRequest } from "../../lib/http";

export const BACKUP_DIR = path.join(DATA_DIR, "backups");
const KEEP_AUTO = 30;

export interface BackupFile {
  name: string;
  size: number;
  date: string;
}

export function listBackups(): BackupFile[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".db"))
    .map((name) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, size: stat.size, date: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function backupTo(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await getSqlite().backup(file);
}

/** Sauvegarde automatique quotidienne (une par jour), avec rotation. */
async function dailyBackup() {
  const file = path.join(BACKUP_DIR, `auto-${today()}.db`);
  if (fs.existsSync(file)) return;
  await backupTo(file);
  const autos = listBackups().filter((b) => b.name.startsWith("auto-"));
  for (const old of autos.slice(KEEP_AUTO)) fs.rmSync(path.join(BACKUP_DIR, old.name), { force: true });
}

export function scheduleBackups(log: (msg: string) => void) {
  const run = () => dailyBackup().catch((e) => log(`Échec de la sauvegarde automatique : ${e.message}`));
  run();
  setInterval(run, 60 * 60 * 1000).unref();
}

export async function exportBackup(): Promise<string> {
  const file = path.join(os.tmpdir(), `garage-export-${Date.now()}.db`);
  await backupTo(file);
  return file;
}

/** Remplace la base par une sauvegarde (la base actuelle est sauvegardée avant). */
export async function restoreBackup(content: Buffer) {
  const tmp = path.join(os.tmpdir(), `garage-restore-${Date.now()}.db`);
  fs.writeFileSync(tmp, content);
  try {
    const check = new Database(tmp, { readonly: true, fileMustExist: true });
    try {
      check.prepare("SELECT COUNT(*) FROM settings").get();
      check.prepare("SELECT COUNT(*) FROM invoices").get();
    } finally {
      check.close();
    }
  } catch {
    fs.rmSync(tmp, { force: true });
    throw badRequest("Ce fichier n'est pas une sauvegarde valide du logiciel.");
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await backupTo(path.join(BACKUP_DIR, `avant-restauration-${stamp}.db`));
  getSqlite().close();
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(DB_PATH + suffix, { force: true });
  fs.copyFileSync(tmp, DB_PATH);
  fs.rmSync(tmp, { force: true });
  reopenDb();
}
