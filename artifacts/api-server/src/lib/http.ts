import type { Request, Response } from "express";

interface EsquemaValidavel<T> {
  safeParse(
    dados: unknown,
  ): { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
}

export function paginar<T>(lista: T[], page: number, pageSize: number) {
  const inicio = (page - 1) * pageSize;
  return { items: lista.slice(inicio, inicio + pageSize), total: lista.length, page, pageSize };
}

export function paramId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
}

/** Valida e devolve os dados, ou responde 400 e devolve null. */
export function validar<T>(schema: EsquemaValidavel<T>, dados: unknown, res: Response): T | null {
  const r = schema.safeParse(dados);
  if (!r.success) {
    res.status(400).json({ erro: "Dados inválidos.", detalhes: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
    return null;
  }
  return r.data;
}

export const semAcento = (s: string): string => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
