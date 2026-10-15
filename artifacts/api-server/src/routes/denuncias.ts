import { Router, type IRouter } from "express";
import { andamentosTable, db, denunciaGestaoTable, getAppPool } from "@workspace/db";
import {
  DecidirDenunciaBody,
  DecidirDenunciaParams,
  DefinirPrazoDenunciaBody,
  DefinirPrazoDenunciaParams,
  GetDenunciaParams,
  GetDenunciaResponse,
  ListDenunciasQueryParams,
  ListDenunciasResponse,
  RegistrarAndamentoDenunciaBody,
  RegistrarAndamentoDenunciaParams,
  RegistrarRetiradaDenunciaBody,
  RegistrarRetiradaDenunciaParams,
} from "@workspace/api-zod";
import { getSnapshot, invalidarSnapshot, type Snapshot } from "../lib/snapshot";
import { denunciaPermitida, postosPermitidos, sessaoDe, type Sessao } from "../lib/escopo";
import { detalheDenuncia, prazoEstado, resumoDenuncia } from "../lib/apresentar";
import { paginar, semAcento, validar } from "../lib/http";
import { somenteMaster } from "../middlewares/acesso";
import type { DenunciaRow } from "../lib/types";

const router: IRouter = Router();

function denunciaVisivel(snap: Snapshot, sessao: Sessao, id: string): DenunciaRow | null {
  const d = snap.denunciasPorId.get(id);
  if (!d) return null;
  return denunciaPermitida(postosPermitidos(sessao, snap), d) ? d : null;
}

router.get("/denuncias", async (req, res): Promise<void> => {
  const q = validar(ListDenunciasQueryParams, req.query, res);
  if (!q) return;
  const sessao = sessaoDe(req);
  if (q.faixaScore && sessao.papel !== "master") {
    res.status(403).json({ erro: "Filtro disponível somente para o time ICL." });
    return;
  }
  const snap = await getSnapshot();
  const permitidos = postosPermitidos(sessao, snap);
  const busca = q.busca ? semAcento(q.busca.trim()) : "";
  const agora = new Date();

  const filtradas = snap.denuncias.filter((d) => {
    if (!denunciaPermitida(permitidos, d)) return false;
    if (q.status && d.status !== q.status) return false;
    if (q.categoria && d.categoria !== q.categoria) return false;
    if (q.municipio && semAcento(d.municipio ?? "") !== semAcento(q.municipio)) return false;
    if (q.postoId && d.postoId !== q.postoId) return false;
    const g = snap.gestao.get(d.id);
    if (q.prazo && prazoEstado(d, g, agora) !== q.prazo) return false;
    if (q.decisao) {
      const dec = g?.decisao ?? null;
      if (q.decisao === "pendente" ? dec !== null : dec !== q.decisao) return false;
    }
    if (q.faixaScore && snap.scores.get(d.id)?.faixa !== q.faixaScore) return false;
    if (busca) {
      const alvo = semAcento(
        `${d.protocolo} ${d.descricao} ${d.municipio ?? ""} ${d.postoId ? (snap.postos.get(d.postoId)?.nome ?? "") : ""}`,
      );
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
  filtradas.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  const pagina = paginar(filtradas, q.page, q.pageSize);
  res.json(ListDenunciasResponse.parse({ ...pagina, items: pagina.items.map((d) => resumoDenuncia(snap, d, sessao)) }));
});

router.get("/denuncias/:id", async (req, res): Promise<void> => {
  const p = validar(GetDenunciaParams, req.params, res);
  if (!p) return;
  const sessao = sessaoDe(req);
  const snap = await getSnapshot();
  const d = denunciaVisivel(snap, sessao, p.id);
  if (!d) {
    res.status(404).json({ erro: "Denúncia não encontrada." });
    return;
  }
  res.json(GetDenunciaResponse.parse(detalheDenuncia(snap, d, sessao)));
});

async function responderDetalhe(res: import("express").Response, sessao: Sessao, id: string, status = 200): Promise<void> {
  invalidarSnapshot();
  const snap = await getSnapshot();
  const d = snap.denunciasPorId.get(id);
  if (!d) {
    res.status(404).json({ erro: "Denúncia não encontrada." });
    return;
  }
  res.status(status).json(GetDenunciaResponse.parse(detalheDenuncia(snap, d, sessao)));
}

async function upsertGestao(id: string, valores: Partial<typeof denunciaGestaoTable.$inferInsert>): Promise<void> {
  await db
    .insert(denunciaGestaoTable)
    .values({ denunciaId: id, ...valores })
    .onConflictDoUpdate({ target: denunciaGestaoTable.denunciaId, set: { ...valores, atualizadoEm: new Date() } });
}

router.put("/denuncias/:id/prazo", somenteMaster, async (req, res): Promise<void> => {
  const p = validar(DefinirPrazoDenunciaParams, req.params, res);
  const b = validar(DefinirPrazoDenunciaBody, req.body, res);
  if (!p || !b) return;
  const sessao = sessaoDe(req);
  const snap = await getSnapshot();
  if (!denunciaVisivel(snap, sessao, p.id)) {
    res.status(404).json({ erro: "Denúncia não encontrada." });
    return;
  }
  await upsertGestao(p.id, {
    prazoEm: new Date(Date.now() + b.dias * 24 * 3600 * 1000),
    prazoDefinidoPor: sessao.email,
  });
  await responderDetalhe(res, sessao, p.id);
});

router.post("/denuncias/:id/andamentos", async (req, res): Promise<void> => {
  const p = validar(RegistrarAndamentoDenunciaParams, req.params, res);
  const b = validar(RegistrarAndamentoDenunciaBody, req.body, res);
  if (!p || !b) return;
  const sessao = sessaoDe(req);
  const snap = await getSnapshot();
  const d = denunciaVisivel(snap, sessao, p.id);
  if (!d) {
    res.status(404).json({ erro: "Denúncia não encontrada." });
    return;
  }
  const orgao = b.orgao?.trim() || (sessao.papel === "master" ? "ICL" : (d.postoId ? (snap.postos.get(d.postoId)?.nome ?? "Posto") : "Posto"));

  // Escrita no banco do app: status da denuncia e, quando existir la, o andamento que o cliente le.
  const client = await getAppPool().connect();
  let espelhado = false;
  try {
    await client.query("begin");
    await client.query("update app.denuncias set status = $1 where id = $2", [b.status, d.id]);
    if (snap.caps.andamentosNoApp) {
      await client.query(
        "insert into app.denuncia_andamentos (denuncia_id, status, orgao, mensagem) values ($1, $2, $3, $4)",
        [d.id, b.status, orgao, b.mensagem],
      );
      espelhado = true;
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }

  await db.insert(andamentosTable).values({
    denunciaId: d.id,
    status: b.status,
    orgao,
    mensagem: b.mensagem,
    autorEmail: sessao.email,
    autorPapel: sessao.papel,
    espelhado,
  });
  await responderDetalhe(res, sessao, d.id, 201);
});

router.put("/denuncias/:id/decisao", somenteMaster, async (req, res): Promise<void> => {
  const p = validar(DecidirDenunciaParams, req.params, res);
  const b = validar(DecidirDenunciaBody, req.body, res);
  if (!p || !b) return;
  const sessao = sessaoDe(req);
  const snap = await getSnapshot();
  if (!denunciaVisivel(snap, sessao, p.id)) {
    res.status(404).json({ erro: "Denúncia não encontrada." });
    return;
  }
  await upsertGestao(p.id, {
    decisao: b.decisao,
    decisaoObservacao: b.observacao?.trim() || null,
    decisaoPor: sessao.email,
    decisaoEm: new Date(),
  });
  await responderDetalhe(res, sessao, p.id);
});

router.post("/denuncias/:id/retirada", async (req, res): Promise<void> => {
  const p = validar(RegistrarRetiradaDenunciaParams, req.params, res);
  const b = validar(RegistrarRetiradaDenunciaBody, req.body, res);
  if (!p || !b) return;
  const sessao = sessaoDe(req);
  const snap = await getSnapshot();
  if (!denunciaVisivel(snap, sessao, p.id)) {
    res.status(404).json({ erro: "Denúncia não encontrada." });
    return;
  }
  await upsertGestao(p.id, {
    retiradaEm: new Date(),
    retiradaOrigem: sessao.papel === "master" ? "master" : "posto",
    retiradaResolucao: b.resolucao.trim(),
    retiradaPor: sessao.email,
  });
  await responderDetalhe(res, sessao, p.id);
});

export default router;
