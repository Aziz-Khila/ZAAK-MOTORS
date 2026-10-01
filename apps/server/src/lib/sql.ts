import { getSqlite, type DB } from "../db/client";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Exec = DB | Tx;

/** Requêtes de lecture en SQL brut (jointures, agrégats). Paramètres nommés : @nom */
export function all<T>(sql: string, params: Record<string, unknown> = {}): T[] {
  return getSqlite().prepare(sql).all(params) as T[];
}

export function get<T>(sql: string, params: Record<string, unknown> = {}): T | undefined {
  return getSqlite().prepare(sql).get(params) as T | undefined;
}

export function scalar(sql: string, params: Record<string, unknown> = {}): number {
  const row = getSqlite().prepare(sql).raw().get(params) as unknown[] | undefined;
  return Number(row?.[0] ?? 0);
}

/**
 * Supprime les anciens ordres de réparation (fonction retirée de l'application) d'un client ou d'un véhicule,
 * pour qu'ils ne bloquent pas sa suppression. À appeler dans une transaction.
 */
export function deleteLegacyInterventions(column: "client_id" | "vehicle_id", id: number) {
  const sqlite = getSqlite();
  sqlite
    .prepare(
      `DELETE FROM document_lines WHERE doc_type = 'intervention'
       AND doc_id IN (SELECT id FROM interventions WHERE ${column} = @id)`,
    )
    .run({ id });
  sqlite.prepare(`DELETE FROM interventions WHERE ${column} = @id`).run({ id });
}

/** Échappe un terme pour LIKE. */
export function likeTerm(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
