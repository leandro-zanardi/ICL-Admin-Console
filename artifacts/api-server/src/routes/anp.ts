import { Router, type IRouter } from "express";
import { getAppPool } from "@workspace/db";
import { ListSincronizacoesAnpQueryParams, ListSincronizacoesAnpResponse } from "@workspace/api-zod";
import { validar } from "../lib/http";
import { somenteMaster } from "../middlewares/acesso";

const router: IRouter = Router();

router.get("/anp-sincronizacoes", somenteMaster, async (req, res): Promise<void> => {
  const q = validar(ListSincronizacoesAnpQueryParams, req.query, res);
  if (!q) return;
  const pool = getAppPool();
  const [total, rows] = await Promise.all([
    pool.query<{ n: number }>("select count(*)::int n from app.anp_sincronizacoes"),
    pool.query(
      "select id, status, postos_lidos, postos_atualizados, paginas_coletadas, divergencias_nota, erros, iniciado_em, concluido_em from app.anp_sincronizacoes order by coalesce(iniciado_em, criado_em) desc limit $1 offset $2",
      [q.pageSize, (q.page - 1) * q.pageSize],
    ),
  ]);
  res.json(
    ListSincronizacoesAnpResponse.parse({
      total: total.rows[0]?.n ?? 0,
      page: q.page,
      pageSize: q.pageSize,
      items: rows.rows.map((r) => ({
        id: r.id,
        status: r.status,
        postosLidos: Number(r.postos_lidos ?? 0),
        postosAtualizados: Number(r.postos_atualizados ?? 0),
        paginasColetadas: Number(r.paginas_coletadas ?? 0),
        divergenciasNota: Number(r.divergencias_nota ?? 0),
        iniciadoEm: r.iniciado_em,
        concluidoEm: r.concluido_em,
        temErros: Array.isArray(r.erros) ? r.erros.length > 0 : r.erros != null && Object.keys(r.erros).length > 0,
      })),
    }),
  );
});

export default router;
