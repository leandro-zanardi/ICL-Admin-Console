import { Router, type IRouter } from "express";
import { GetPostoParams, GetPostoResponse, ListPostosQueryParams, ListPostosResponse } from "@workspace/api-zod";
import { getSnapshot, type Snapshot } from "../lib/snapshot";
import { postosPermitidos, sessaoDe } from "../lib/escopo";
import { checkinInfo, evidenciaAnp, resumoDenuncia } from "../lib/apresentar";
import { paginar, paramId, semAcento, validar } from "../lib/http";
import type { PostoRow } from "../lib/types";

const router: IRouter = Router();

function contagens(snap: Snapshot) {
  const den = new Map<string, number>();
  const chk = new Map<string, number>();
  for (const d of snap.denuncias) if (d.postoId) den.set(d.postoId, (den.get(d.postoId) ?? 0) + 1);
  for (const c of snap.checkins) chk.set(c.postoId, (chk.get(c.postoId) ?? 0) + 1);
  return { den, chk };
}

function resumoPosto(p: PostoRow, den: Map<string, number>, chk: Map<string, number>) {
  return {
    id: p.id,
    nome: p.nome,
    cnpj: p.cnpj,
    bandeira: p.bandeira,
    municipio: p.municipio,
    uf: p.uf,
    tier: p.tier,
    seloIcl: p.tier === "selo",
    score: p.score,
    denuncias: den.get(p.id) ?? 0,
    checkins: chk.get(p.id) ?? 0,
  };
}

router.get("/postos", async (req, res): Promise<void> => {
  const q = validar(ListPostosQueryParams, req.query, res);
  if (!q) return;
  const sessao = sessaoDe(req);
  const snap = await getSnapshot();
  const permitidos = postosPermitidos(sessao, snap);
  const busca = q.busca ? semAcento(q.busca.trim()) : "";
  const { den, chk } = contagens(snap);
  const lista = [...snap.postos.values()]
    .filter((p) => permitidos === null || permitidos.has(p.id))
    .filter((p) => q.selo == null || (p.tier === "selo") === q.selo)
    .filter((p) => !busca || semAcento(`${p.nome} ${p.razaoSocial ?? ""} ${p.cnpj ?? ""} ${p.municipio ?? ""}`).includes(busca))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((p) => resumoPosto(p, den, chk));
  res.json(ListPostosResponse.parse(paginar(lista, q.page, q.pageSize)));
});

router.get("/postos/:id", async (req, res): Promise<void> => {
  const p = validar(GetPostoParams, { id: paramId(req) }, res);
  if (!p) return;
  const sessao = sessaoDe(req);
  const snap = await getSnapshot();
  const permitidos = postosPermitidos(sessao, snap);
  const posto = snap.postos.get(p.id);
  if (!posto || (permitidos !== null && !permitidos.has(posto.id))) {
    res.status(404).json({ erro: "Posto não encontrado." });
    return;
  }
  const { den, chk } = contagens(snap);
  const denuncias = snap.denuncias
    .filter((d) => d.postoId === posto.id)
    .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  const checkins = snap.checkins
    .filter((c) => c.postoId === posto.id)
    .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
    .slice(0, 100);
  res.json(
    GetPostoResponse.parse({
      ...resumoPosto(posto, den, chk),
      razaoSocial: posto.razaoSocial,
      endereco: posto.endereco,
      lat: posto.lat,
      lng: posto.lng,
      anp: evidenciaAnp(snap, posto),
      denunciasLista: denuncias.map((d) => resumoDenuncia(snap, d, sessao)),
      checkinsLista: checkins.map((c) => checkinInfo(snap, c, sessao)),
    }),
  );
});

export default router;
