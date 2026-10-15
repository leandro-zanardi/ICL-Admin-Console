import { Router, type IRouter } from "express";
import {
  GetAntifraudeResumoResponse,
  ListAlertasCampanhaResponse,
  ListDenunciantesAtipicosQueryParams,
  ListDenunciantesAtipicosResponse,
  ListRecallQueryParams,
  ListRecallResponse,
} from "@workspace/api-zod";
import { getSnapshot } from "../lib/snapshot";
import { denunciaPermitida, postosPermitidos, sessaoDe } from "../lib/escopo";
import { foiRetirada } from "../lib/apresentar";
import { paginar, validar } from "../lib/http";
import { somenteMaster } from "../middlewares/acesso";

const router: IRouter = Router();

router.get("/antifraude/resumo", somenteMaster, async (_req, res): Promise<void> => {
  const snap = await getSnapshot();
  let suspeitas = 0;
  let atencao = 0;
  let confiaveis = 0;
  let pendentes = 0;
  for (const d of snap.denuncias) {
    const s = snap.scores.get(d.id);
    if (!s) continue;
    if (s.faixa === "suspeita") suspeitas++;
    else if (s.faixa === "atencao") atencao++;
    else confiaveis++;
    if (s.faixa !== "confiavel" && !snap.gestao.get(d.id)?.decisao) pendentes++;
  }
  res.json(
    GetAntifraudeResumoResponse.parse({
      suspeitas,
      atencao,
      confiaveis,
      pendentesDeDecisao: pendentes,
      denunciantesAtipicos: [...snap.reputacao.values()].filter((r) => r.motivos.length > 0).length,
      alertasCampanha: snap.alertas.length,
    }),
  );
});

router.get("/antifraude/denunciantes", somenteMaster, async (req, res): Promise<void> => {
  const q = validar(ListDenunciantesAtipicosQueryParams, req.query, res);
  if (!q) return;
  const snap = await getSnapshot();
  const lista = [...snap.reputacao.values()]
    .filter((r) => r.motivos.length > 0)
    .sort((a, b) => b.motivos.length - a.motivos.length || a.scoreMedio - b.scoreMedio);
  const pagina = paginar(lista, q.page, q.pageSize);
  res.json(
    ListDenunciantesAtipicosResponse.parse({
      ...pagina,
      items: pagina.items.map((r) => ({
        tipo: r.tipo,
        id: r.id,
        rotulo: r.rotulo,
        totalDenuncias: r.denuncias.length,
        denunciasUltimos30d: r.ultimos30d,
        procedentes: r.procedentes,
        improcedentes: r.improcedentes,
        postosDistintos: r.postosDistintos,
        scoreMedio: r.scoreMedio,
        motivos: r.motivos,
      })),
    }),
  );
});

router.get("/antifraude/alertas", somenteMaster, async (_req, res): Promise<void> => {
  const snap = await getSnapshot();
  res.json(ListAlertasCampanhaResponse.parse(snap.alertas));
});

router.get("/recall", async (req, res): Promise<void> => {
  const q = validar(ListRecallQueryParams, req.query, res);
  if (!q) return;
  const sessao = sessaoDe(req);
  const snap = await getSnapshot();
  const permitidos = postosPermitidos(sessao, snap);
  const itens = snap.denuncias
    .filter((d) => denunciaPermitida(permitidos, d) && foiRetirada(d, snap.gestao.get(d.id)))
    .map((d) => {
      const g = snap.gestao.get(d.id);
      const retiradaEm = g?.retiradaEm ?? d.criadoEm;
      return {
        denunciaId: d.id,
        protocolo: d.protocolo,
        categoria: d.categoria,
        postoId: d.postoId,
        postoNome: d.postoId ? (snap.postos.get(d.postoId)?.nome ?? null) : null,
        origem: (g?.retiradaOrigem as "cliente" | "posto" | "master" | null) ?? "cliente",
        resolucao: g?.retiradaResolucao ?? null,
        criadaEm: d.criadoEm,
        retiradaEm,
        horasAteResolver: Math.max(0, Math.round((retiradaEm.getTime() - d.criadoEm.getTime()) / 3600000)),
      };
    })
    .sort((a, b) => b.retiradaEm.getTime() - a.retiradaEm.getTime());
  res.json(ListRecallResponse.parse(paginar(itens, q.page, q.pageSize)));
});

export default router;
