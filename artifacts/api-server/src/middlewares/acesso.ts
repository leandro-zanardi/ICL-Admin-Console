import type { NextFunction, Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { eq, sql } from "drizzle-orm";
import { acessosTable, db } from "@workspace/db";
import { logger } from "../lib/logger";
import { sessaoDeAcesso, type Sessao } from "../lib/escopo";

const emailCache = new Map<string, { email: string; nome: string | null; em: number }>();
const EMAIL_TTL_MS = 5 * 60_000;

async function emailVerificado(userId: string): Promise<{ email: string; nome: string | null } | null> {
  const c = emailCache.get(userId);
  if (c && Date.now() - c.em < EMAIL_TTL_MS) return { email: c.email, nome: c.nome };
  const user = await clerkClient.users.getUser(userId);
  const principal = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0];
  if (!principal || principal.verification?.status !== "verified") return null;
  const nome = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
  const email = principal.emailAddress.trim().toLowerCase();
  emailCache.set(userId, { email, nome, em: Date.now() });
  return { email, nome };
}

/** Exige login (Clerk) e um cadastro de acesso. Anexa a sessao ao request. */
export async function exigirAcesso(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ erro: "Não autenticado." });
    return;
  }
  try {
    const identidade = await emailVerificado(userId);
    if (!identidade) {
      res.status(403).json({ erro: "Acesso negado. O e-mail da conta não está verificado." });
      return;
    }
    let [acesso] = await db
      .select()
      .from(acessosTable)
      .where(eq(sql`lower(trim(${acessosTable.email}))`, identidade.email));
    const masterEmail = process.env.ADMIN_MASTER_EMAIL?.trim().toLowerCase();
    if (masterEmail && identidade.email === masterEmail) {
      if (!acesso) {
        [acesso] = await db
          .insert(acessosTable)
          .values({ email: identidade.email, nome: identidade.nome, papel: "master", escopoTipo: "todos" })
          .onConflictDoNothing()
          .returning();
        if (!acesso) {
          [acesso] = await db
            .select()
            .from(acessosTable)
            .where(eq(sql`lower(trim(${acessosTable.email}))`, identidade.email));
        }
      } else if (acesso.papel !== "master") {
        // O e-mail de ADMIN_MASTER_EMAIL sempre prevalece sobre um cadastro de posto anterior.
        [acesso] = await db
          .update(acessosTable)
          .set({ papel: "master", escopoTipo: "todos", postoId: null, cnpjRaiz: null })
          .where(eq(acessosTable.id, acesso.id))
          .returning();
      }
    }
    if (!acesso) {
      logger.warn(
        { masterEmailConfigurado: Boolean(masterEmail), emailMasterCorrespondente: Boolean(masterEmail && identidade.email === masterEmail) },
        "Acesso negado: e-mail Clerk sem acesso cadastrado",
      );
      res.status(403).json({
        erro: "Acesso negado. Para o admin master, o e-mail principal verificado no Clerk deve ser o mesmo cadastrado em ADMIN_MASTER_EMAIL no ambiente de desenvolvimento.",
      });
      return;
    }
    const sessao: Sessao = sessaoDeAcesso(acesso);
    if (!sessao.nome && identidade.nome) sessao.nome = identidade.nome;
    (req as Request & { sessao?: Sessao }).sessao = sessao;
    next();
  } catch (err) {
    logger.error({ err }, "Falha ao validar acesso");
    res.status(500).json({ erro: "Falha ao validar o acesso." });
  }
}

export function somenteMaster(req: Request, res: Response, next: NextFunction): void {
  const s = (req as Request & { sessao?: Sessao }).sessao;
  if (s?.papel !== "master") {
    res.status(403).json({ erro: "Recurso disponível somente para o time ICL." });
    return;
  }
  next();
}
