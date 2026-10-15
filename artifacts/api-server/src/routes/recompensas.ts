import { Router, type IRouter } from "express";
import { getAppPool } from "@workspace/db";
import {
  AtualizarRecompensaBody,
  AtualizarRecompensaParams,
  AtualizarRecompensaResponse,
  CriarRecompensaBody,
  CriarRecompensaResponse,
  ListRecompensasResponse,
  ListResgatesQueryParams,
  ListResgatesResponse,
} from "@workspace/api-zod";
import { validar } from "../lib/http";
import { somenteMaster } from "../middlewares/acesso";

const router: IRouter = Router();
router.use(["/recompensas", "/resgates"], somenteMaster);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const recompensa = (r: any) => ({
  id: r.id,
  nome: r.nome,
  descricao: r.descricao,
  categoria: r.categoria,
  custoPontos: Number(r.custo_pontos),
  ativa: Boolean(r.ativa),
  criadoEm: r.criado_em,
});

router.get("/recompensas", async (_req, res): Promise<void> => {
  const r = await getAppPool().query("select id, nome, descricao, categoria, custo_pontos, ativa, criado_em from app.recompensas order by criado_em asc");
  res.json(ListRecompensasResponse.parse(r.rows.map(recompensa)));
});

router.post("/recompensas", async (req, res): Promise<void> => {
  const b = validar(CriarRecompensaBody, req.body, res);
  if (!b) return;
  const r = await getAppPool().query(
    "insert into app.recompensas (id, nome, descricao, categoria, custo_pontos, ativa) values (gen_random_uuid(), $1, $2, $3, $4, $5) returning id, nome, descricao, categoria, custo_pontos, ativa, criado_em",
    [b.nome.trim(), b.descricao ?? null, b.categoria ?? null, b.custoPontos, b.ativa],
  );
  res.status(201).json(CriarRecompensaResponse.parse(recompensa(r.rows[0])));
});

router.put("/recompensas/:id", async (req, res): Promise<void> => {
  const p = validar(AtualizarRecompensaParams, req.params, res);
  const b = validar(AtualizarRecompensaBody, req.body, res);
  if (!p || !b) return;
  if (!UUID.test(p.id)) {
    res.status(404).json({ erro: "Recompensa não encontrada." });
    return;
  }
  const r = await getAppPool().query(
    "update app.recompensas set nome = $2, descricao = $3, categoria = $4, custo_pontos = $5, ativa = $6 where id = $1 returning id, nome, descricao, categoria, custo_pontos, ativa, criado_em",
    [p.id, b.nome.trim(), b.descricao ?? null, b.categoria ?? null, b.custoPontos, b.ativa],
  );
  if (r.rows.length === 0) {
    res.status(404).json({ erro: "Recompensa não encontrada." });
    return;
  }
  res.json(AtualizarRecompensaResponse.parse(recompensa(r.rows[0])));
});

router.get("/resgates", async (req, res): Promise<void> => {
  const q = validar(ListResgatesQueryParams, req.query, res);
  if (!q) return;
  const pool = getAppPool();
  const [total, rows] = await Promise.all([
    pool.query<{ n: number }>("select count(*)::int n from app.resgates"),
    pool.query(
      `select r.id, r.user_id, u.contato, r.recompensa_id, rc.nome, r.codigo, r.status, r.custo_pontos, r.criado_em
         from app.resgates r
         left join app.usuarios u on u.id = r.user_id
         left join app.recompensas rc on rc.id = r.recompensa_id
        order by r.criado_em desc limit $1 offset $2`,
      [q.pageSize, (q.page - 1) * q.pageSize],
    ),
  ]);
  res.json(
    ListResgatesResponse.parse({
      total: total.rows[0]?.n ?? 0,
      page: q.page,
      pageSize: q.pageSize,
      items: rows.rows.map((r) => ({
        id: r.id,
        usuarioId: r.user_id,
        usuarioContato: r.contato,
        recompensaId: r.recompensa_id,
        recompensaNome: r.nome,
        codigo: r.codigo,
        status: r.status,
        custoPontos: Number(r.custo_pontos),
        criadoEm: r.criado_em,
      })),
    }),
  );
});

export default router;
