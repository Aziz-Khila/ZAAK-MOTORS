import type { FastifyRequest } from "fastify";
import type { z } from "zod";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Élément") => new HttpError(404, `${what} introuvable`);
export const badRequest = (message: string) => new HttpError(400, message);

export function idParam(req: FastifyRequest): number {
  const id = Number((req.params as { id?: string }).id);
  if (!Number.isInteger(id) || id <= 0) throw badRequest("Identifiant invalide");
  return id;
}

export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(result.error.issues[0]?.message ?? "Données invalides");
  }
  return result.data;
}

export function query(req: FastifyRequest): Record<string, string | undefined> {
  return (req.query ?? {}) as Record<string, string | undefined>;
}
