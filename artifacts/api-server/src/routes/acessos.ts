import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { acessosTable, db, type Acesso } from "@workspace/db";
import {
  AtualizarAcessoBody,
  AtualizarAcessoParams,
  AtualizarAcessoResponse,
  CriarAcessoBody,
  CriarAcessoResponse,
  ListAcessosResponse,
  RemoverAcessoParams,
  ReenviarConviteAcessoParams,
  ReenviarConviteAcessoResponse,
} from "@workspace/api-zod";
import { getSnapshot, type Snapshot } from "../lib/snapshot";
import { cnpjRaiz, sessaoDeAcesso } from "../lib/escopo";
import { validar } from "../lib/http";
import { logger } from "../lib/logger";
import { somenteMaster } from "../middlewares/acesso";

const router: IRouter = Router();
router.use("/acessos", somenteMaster);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function apresentar(a: Acesso, snap: Snapshot) {
  const s = sessaoDeAcesso(a);
  return {
    id: String(a.id),
    email: a.email,
    nome: a.nome,
    papel: s.papel,
    escopo: s.escopo,
    postoNome: a.postoId ? (snap.postos.get(a.postoId)?.nome ?? null) : null,
    criadoEm: a.criadoEm,
  };
}

function idNumerico(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function enviarConvite(email: string): Promise<"enviado" | "conta_existente"> {
  const contas = await clerkClient.users.getUserList({ emailAddress: [email], limit: 1 });
  if (contas.data.length > 0) return "conta_existente";
  await clerkClient.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: "/sign-up",
    notify: true,
    ignoreExisting: true,
  });
  return "enviado";
}

router.get("/acessos", async (_req, res): Promise<void> => {
  const snap = await getSnapshot();
  const rows = await db.select().from(acessosTable).orderBy(acessosTable.criadoEm);
  res.json(ListAcessosResponse.parse(rows.map((a) => apresentar(a, snap))));
});

router.post("/acessos", async (req, res): Promise<void> => {
  const b = validar(CriarAcessoBody, req.body, res);
  if (!b) return;
  const email = b.email.trim().toLowerCase();
  if (!EMAIL.test(email)) {
    res.status(400).json({ erro: "E-mail inválido." });
    return;
  }
  const snap = await getSnapshot();
  const posto = snap.postos.get(b.postoId);
  if (!posto) {
    res.status(400).json({ erro: "Posto não encontrado." });
    return;
  }
  const raiz = cnpjRaiz(posto.cnpj);
  if (b.escopoTipo === "rede" && !raiz) {
    res.status(400).json({ erro: "Este posto não tem CNPJ cadastrado, então não é possível definir a rede." });
    return;
  }
  const [criado] = await db
    .insert(acessosTable)
    .values({
      email,
      nome: b.nome?.trim() || null,
      papel: "posto",
      escopoTipo: b.escopoTipo,
      postoId: posto.id,
      cnpjRaiz: b.escopoTipo === "rede" ? raiz : null,
    })
    .onConflictDoNothing()
    .returning();
  if (!criado) {
    res.status(409).json({ erro: "Já existe um acesso cadastrado para este e-mail." });
    return;
  }
  let conviteStatus: "enviado" | "conta_existente" | "falha" = "falha";
  try {
    conviteStatus = await enviarConvite(email);
  } catch (err) {
    logger.error({ err }, "Acesso criado, mas não foi possível enviar convite do Clerk");
  }
  res.status(201).json(CriarAcessoResponse.parse({ ...apresentar(criado, snap), conviteStatus }));
});

router.post("/acessos/:id/convite", async (req, res): Promise<void> => {
  const p = validar(ReenviarConviteAcessoParams, req.params, res);
  if (!p) return;
  const id = idNumerico(p.id);
  if (id == null) {
    res.status(404).json({ erro: "Acesso não encontrado." });
    return;
  }
  const [acesso] = await db.select().from(acessosTable).where(eq(acessosTable.id, id));
  if (!acesso || acesso.papel !== "posto") {
    res.status(404).json({ erro: "Acesso de posto não encontrado." });
    return;
  }
  try {
    const conviteStatus = await enviarConvite(acesso.email);
    res.json(ReenviarConviteAcessoResponse.parse({ conviteStatus }));
  } catch (err) {
    logger.error({ err }, "Não foi possível reenviar convite do Clerk");
    res.status(502).json({ erro: "Não foi possível enviar o convite. Tente novamente." });
  }
});

router.put("/acessos/:id", async (req, res): Promise<void> => {
  const p = validar(AtualizarAcessoParams, req.params, res);
  const b = validar(AtualizarAcessoBody, req.body, res);
  if (!p || !b) return;
  const id = idNumerico(p.id);
  const snap = await getSnapshot();
  const posto = snap.postos.get(b.postoId);
  if (id == null) {
    res.status(404).json({ erro: "Acesso não encontrado." });
    return;
  }
  if (!posto) {
    res.status(400).json({ erro: "Posto não encontrado." });
    return;
  }
  const raiz = cnpjRaiz(posto.cnpj);
  if (b.escopoTipo === "rede" && !raiz) {
    res.status(400).json({ erro: "Este posto não tem CNPJ cadastrado, então não é possível definir a rede." });
    return;
  }
  const [atual] = await db.select().from(acessosTable).where(eq(acessosTable.id, id));
  if (!atual) {
    res.status(404).json({ erro: "Acesso não encontrado." });
    return;
  }
  if (atual.papel === "master") {
    res.status(400).json({ erro: "O escopo do administrador master não pode ser alterado." });
    return;
  }
  const [atualizado] = await db
    .update(acessosTable)
    .set({
      nome: b.nome === undefined ? atual.nome : b.nome?.trim() || null,
      escopoTipo: b.escopoTipo,
      postoId: posto.id,
      cnpjRaiz: b.escopoTipo === "rede" ? raiz : null,
    })
    .where(eq(acessosTable.id, id))
    .returning();
  res.json(AtualizarAcessoResponse.parse(apresentar(atualizado!, snap)));
});

router.delete("/acessos/:id", async (req, res): Promise<void> => {
  const p = validar(RemoverAcessoParams, req.params, res);
  if (!p) return;
  const id = idNumerico(p.id);
  if (id == null) {
    res.status(404).json({ erro: "Acesso não encontrado." });
    return;
  }
  const [atual] = await db.select().from(acessosTable).where(eq(acessosTable.id, id));
  if (!atual) {
    res.status(404).json({ erro: "Acesso não encontrado." });
    return;
  }
  if (atual.papel === "master") {
    res.status(400).json({ erro: "O administrador master não pode ser removido." });
    return;
  }
  await db.delete(acessosTable).where(eq(acessosTable.id, id));
  res.status(204).end();
});

export default router;
