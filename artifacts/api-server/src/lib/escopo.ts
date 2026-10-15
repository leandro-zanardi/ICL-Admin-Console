import type { Request } from "express";
import type { Acesso } from "@workspace/db";
import type { Snapshot } from "./snapshot";
import type { DenunciaRow } from "./types";

export interface Sessao {
  email: string;
  nome: string | null;
  papel: "master" | "posto";
  escopo: { tipo: "todos" | "posto" | "rede"; postoId: string | null; cnpjRaiz: string | null };
}

export function sessaoDeAcesso(a: Acesso): Sessao {
  return {
    email: a.email,
    nome: a.nome,
    papel: a.papel === "master" ? "master" : "posto",
    escopo: {
      tipo: a.papel === "master" ? "todos" : a.escopoTipo === "rede" ? "rede" : "posto",
      postoId: a.postoId,
      cnpjRaiz: a.cnpjRaiz,
    },
  };
}

export function sessaoDe(req: Request): Sessao {
  const s = (req as Request & { sessao?: Sessao }).sessao;
  if (!s) throw new Error("Sessão ausente: rota sem middleware de acesso.");
  return s;
}

export function cnpjRaiz(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  const digitos = cnpj.replace(/\D/g, "");
  return digitos.length >= 8 ? digitos.slice(0, 8) : null;
}

/** Conjunto de postos que o usuario pode ver. null significa todos (master). */
export function postosPermitidos(sessao: Sessao, snap: Snapshot): Set<string> | null {
  if (sessao.papel === "master") return null;
  const ids = new Set<string>();
  if (sessao.escopo.tipo === "posto" && sessao.escopo.postoId) {
    ids.add(sessao.escopo.postoId);
  } else if (sessao.escopo.tipo === "rede" && sessao.escopo.cnpjRaiz) {
    for (const p of snap.postos.values()) {
      if (cnpjRaiz(p.cnpj) === sessao.escopo.cnpjRaiz) ids.add(p.id);
    }
    if (sessao.escopo.postoId) ids.add(sessao.escopo.postoId);
  }
  return ids;
}

export function denunciaPermitida(permitidos: Set<string> | null, d: DenunciaRow): boolean {
  if (permitidos === null) return true;
  return d.postoId != null && permitidos.has(d.postoId);
}
