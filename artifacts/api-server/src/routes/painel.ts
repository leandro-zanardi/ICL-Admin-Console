import { Router, type IRouter } from "express";
import { getAppPool } from "@workspace/db";
import { GetPainelQueryParams, GetPainelResponse } from "@workspace/api-zod";
import { getSnapshot } from "../lib/snapshot";
import { denunciaEncerrada, prazoEstado } from "../lib/apresentar";
import { validar } from "../lib/http";
import { somenteMaster } from "../middlewares/acesso";

const router: IRouter = Router();

const diaSp = (d: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);

router.get("/painel", somenteMaster, async (req, res): Promise<void> => {
  const q = validar(GetPainelQueryParams, req.query, res);
  if (!q) return;
  const snap = await getSnapshot();
  const pool = getAppPool();
  const [resg, eventos] = await Promise.all([
    pool.query<{ n: number }>("select count(*)::int n from app.resgates"),
    pool.query<{ dia: string; event_type: string; n: number }>(
      `select to_char((criado_em at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD') dia, event_type, count(*)::int n
         from analytics.eventos
        where criado_em >= now() - ($1::int * interval '1 day') and event_type in ('checkin','denuncia','busca')
        group by 1, 2`,
      [q.dias],
    ),
  ]);

  const serie = new Map<string, { dia: string; checkins: number; denuncias: number; buscas: number }>();
  for (let i = q.dias - 1; i >= 0; i--) {
    const dia = diaSp(new Date(Date.now() - i * 24 * 3600 * 1000));
    serie.set(dia, { dia, checkins: 0, denuncias: 0, buscas: 0 });
  }
  for (const e of eventos.rows) {
    const linha = serie.get(e.dia);
    if (!linha) continue;
    if (e.event_type === "checkin") linha.checkins = e.n;
    else if (e.event_type === "denuncia") linha.denuncias = e.n;
    else linha.buscas = e.n;
  }

  let abertas = 0;
  let vencidas = 0;
  for (const d of snap.denuncias) {
    const g = snap.gestao.get(d.id);
    if (!denunciaEncerrada(d, g)) abertas++;
    if (prazoEstado(d, g) === "vencido") vencidas++;
  }
  const postos = [...snap.postos.values()];
  res.json(
    GetPainelResponse.parse({
      usuarios: snap.usuarios.size,
      checkins: snap.checkins.length,
      denunciasAbertas: abertas,
      denunciasTotal: snap.denuncias.length,
      denunciasVencidas: vencidas,
      resgates: resg.rows[0]?.n ?? 0,
      postosComSelo: postos.filter((p) => p.tier === "selo").length,
      postosTotal: postos.length,
      usoDiario: [...serie.values()],
    }),
  );
});

export default router;
