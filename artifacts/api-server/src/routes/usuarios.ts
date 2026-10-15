import { Router, type IRouter } from "express";
import { getAppPool, configuracoesTable, db } from "@workspace/db";
import {
  AtualizarConfiguracaoRankingBody,
  AtualizarConfiguracaoRankingResponse,
  GetConfiguracaoRankingResponse,
  GetRankingQueryParams,
  GetRankingResponse,
  GetUsuarioParams,
  GetUsuarioResponse,
  ListUsuariosQueryParams,
  ListUsuariosResponse,
} from "@workspace/api-zod";
import { getSnapshot, invalidarSnapshot } from "../lib/snapshot";
import { checkinInfo, faixaRanking, resumoDenuncia } from "../lib/apresentar";
import { sessaoDe } from "../lib/escopo";
import { paginar, semAcento, validar } from "../lib/http";
import { somenteMaster } from "../middlewares/acesso";

const router: IRouter = Router();
router.use(["/usuarios", "/ranking", "/configuracoes"], somenteMaster);

async function contagemResgates(): Promise<Map<string, number>> {
  const r = await getAppPool().query<{ user_id: string; n: number }>(
    "select user_id, count(*)::int n from app.resgates group by 1",
  );
  return new Map(r.rows.map((x) => [x.user_id, x.n]));
}

router.get("/usuarios", async (req, res): Promise<void> => {
  const q = validar(ListUsuariosQueryParams, req.query, res);
  if (!q) return;
  const snap = await getSnapshot();
  const resgates = await contagemResgates();
  const checkinsPorUsuario = new Map<string, number>();
  for (const c of snap.checkins) checkinsPorUsuario.set(c.userId, (checkinsPorUsuario.get(c.userId) ?? 0) + 1);
  const busca = q.busca ? semAcento(q.busca.trim()) : "";

  const lista = [...snap.usuarios.values()]
    .map((u) => {
      const rep = snap.reputacao.get(`u:${u.id}`);
      const verdadeiras = rep?.verdadeiras ?? 0;
      return {
        id: u.id,
        contato: u.contato,
        saldoPontos: u.saldoPontos,
        checkins: checkinsPorUsuario.get(u.id) ?? 0,
        resgates: resgates.get(u.id) ?? 0,
        denuncias: rep?.denuncias.length ?? 0,
        denunciasVerdadeiras: verdadeiras,
        faixa: faixaRanking(verdadeiras, snap.configRanking),
        criadoEm: u.criadoEm,
      };
    })
    .filter((u) => (!q.faixa || u.faixa === q.faixa) && (!busca || semAcento(`${u.contato} ${u.id}`).includes(busca)))
    .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  res.json(ListUsuariosResponse.parse(paginar(lista, q.page, q.pageSize)));
});

router.get("/usuarios/:id", async (req, res): Promise<void> => {
  const p = validar(GetUsuarioParams, req.params, res);
  if (!p) return;
  const sessao = sessaoDe(req);
  const snap = await getSnapshot();
  const u = snap.usuarios.get(p.id);
  if (!u) {
    res.status(404).json({ erro: "Usuário não encontrado." });
    return;
  }
  const pool = getAppPool();
  const [extrato, resg] = await Promise.all([
    pool.query("select id, tipo, pontos, descricao, criado_em from app.transacoes_pontos where user_id = $1 order by criado_em desc limit 100", [u.id]),
    pool.query(
      "select r.id, r.user_id, r.recompensa_id, r.codigo, r.status, r.custo_pontos, r.criado_em, rc.nome from app.resgates r left join app.recompensas rc on rc.id = r.recompensa_id where r.user_id = $1 order by r.criado_em desc",
      [u.id],
    ),
  ]);
  const rep = snap.reputacao.get(`u:${u.id}`);
  const verdadeiras = rep?.verdadeiras ?? 0;
  const cfg = snap.configRanking;
  const faixa = faixaRanking(verdadeiras, cfg);
  const proximo = faixa === "sem_faixa" ? { nome: "bronze", n: cfg.bronze } : faixa === "bronze" ? { nome: "prata", n: cfg.prata } : faixa === "prata" ? { nome: "ouro", n: cfg.ouro } : null;
  const meusCheckins = snap.checkins.filter((c) => c.userId === u.id).sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());

  res.json(
    GetUsuarioResponse.parse({
      id: u.id,
      contato: u.contato,
      saldoPontos: u.saldoPontos,
      checkins: meusCheckins.length,
      resgates: resg.rows.length,
      denuncias: rep?.denuncias.length ?? 0,
      denunciasVerdadeiras: verdadeiras,
      faixa,
      criadoEm: u.criadoEm,
      extrato: extrato.rows.map((r) => ({ id: r.id, tipo: r.tipo, pontos: Number(r.pontos), descricao: r.descricao, criadoEm: r.criado_em })),
      checkinsLista: meusCheckins.map((c) => checkinInfo(snap, c, sessao)),
      resgatesLista: resg.rows.map((r) => ({
        id: r.id,
        usuarioId: r.user_id,
        usuarioContato: u.contato,
        recompensaId: r.recompensa_id,
        recompensaNome: r.nome,
        codigo: r.codigo,
        status: r.status,
        custoPontos: Number(r.custo_pontos),
        criadoEm: r.criado_em,
      })),
      denunciasLista: (rep?.denuncias ?? [])
        .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
        .map((d) => resumoDenuncia(snap, d, sessao)),
      proximaFaixa: proximo ? `Faltam ${Math.max(0, proximo.n - verdadeiras)} denúncia(s) verdadeira(s) para ${proximo.nome}.` : null,
    }),
  );
});

router.get("/ranking", async (req, res): Promise<void> => {
  const q = validar(GetRankingQueryParams, req.query, res);
  if (!q) return;
  const snap = await getSnapshot();
  const ordenado = [...snap.reputacao.values()]
    .sort((a, b) => b.verdadeiras - a.verdadeiras || b.denuncias.length - a.denuncias.length || a.chave.localeCompare(b.chave))
    .map((r, i) => ({
      posicao: i + 1,
      tipo: r.tipo,
      id: r.id,
      rotulo: r.rotulo,
      denunciasVerdadeiras: r.verdadeiras,
      totalDenuncias: r.denuncias.length,
      faixa: faixaRanking(r.verdadeiras, snap.configRanking),
    }))
    .filter((r) => !q.faixa || r.faixa === q.faixa);
  res.json(GetRankingResponse.parse({ ...paginar(ordenado, q.page, q.pageSize), configuracao: snap.configRanking }));
});

router.get("/configuracoes/ranking", async (_req, res): Promise<void> => {
  const snap = await getSnapshot();
  res.json(GetConfiguracaoRankingResponse.parse(snap.configRanking));
});

router.put("/configuracoes/ranking", async (req, res): Promise<void> => {
  const b = validar(AtualizarConfiguracaoRankingBody, req.body, res);
  if (!b) return;
  if (!(b.bronze < b.prata && b.prata < b.ouro)) {
    res.status(400).json({ erro: "As faixas precisam crescer: bronze menor que prata, e prata menor que ouro." });
    return;
  }
  await db
    .insert(configuracoesTable)
    .values({ chave: "ranking", valor: b })
    .onConflictDoUpdate({ target: configuracoesTable.chave, set: { valor: b, atualizadoEm: new Date() } });
  invalidarSnapshot();
  res.json(AtualizarConfiguracaoRankingResponse.parse(b));
});

export default router;
