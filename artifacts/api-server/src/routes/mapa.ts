import { Router, type IRouter } from "express";
import { GetMapaQueryParams, GetMapaResponse } from "@workspace/api-zod";
import { getSnapshot } from "../lib/snapshot";
import { denunciaPermitida, postosPermitidos, sessaoDe } from "../lib/escopo";
import { denunciaEncerrada, prazoEstado } from "../lib/apresentar";
import { validar } from "../lib/http";

const router: IRouter = Router();

router.get("/mapa", async (req, res): Promise<void> => {
  const q = validar(GetMapaQueryParams, req.query, res);
  if (!q) return;
  const sessao = sessaoDe(req);
  const snap = await getSnapshot();
  const permitidos = postosPermitidos(sessao, snap);
  const desde = Date.now() - q.dias * 24 * 3600 * 1000;
  const postosVisiveis = [...snap.postos.values()].filter(
    (posto) => permitidos === null || permitidos.has(posto.id),
  );

  const denuncias = snap.denuncias.filter(
    (d) =>
      denunciaPermitida(permitidos, d) &&
      d.criadoEm.getTime() >= desde &&
      (!q.categoria || d.categoria === q.categoria) &&
      (!q.status || d.status === q.status),
  );
  const checkins = snap.checkins.filter(
    (c) => (permitidos === null || permitidos.has(c.postoId)) && c.criadoEm.getTime() >= desde,
  );

  const pins = new Map<string, { denuncias: number; abertas: number; vencidas: number; checkins: number }>();
  const pin = (id: string) => {
    let p = pins.get(id);
    if (!p) {
      p = { denuncias: 0, abertas: 0, vencidas: 0, checkins: 0 };
      pins.set(id, p);
    }
    return p;
  };
  // Os marcadores representam o cadastro completo de postos, não apenas os
  // que tiveram atividade no período. O calor continua representando denúncias.
  for (const posto of postosVisiveis) pin(posto.id);

  const calor: { lat: number; lng: number; peso: number }[] = [];
  for (const d of denuncias) {
    const posto = d.postoId ? snap.postos.get(d.postoId) : undefined;
    if (d.postoId) {
      const p = pin(d.postoId);
      const g = snap.gestao.get(d.id);
      p.denuncias++;
      if (!denunciaEncerrada(d, g)) p.abertas++;
      if (prazoEstado(d, g) === "vencido") p.vencidas++;
    }
    // O mapa de calor usa o posto: a localizacao exata do usuario e dado sensivel e nao sai desta tela.
    if (posto?.lat != null && posto?.lng != null) calor.push({ lat: posto.lat, lng: posto.lng, peso: 1 });
  }
  for (const c of checkins) pin(c.postoId).checkins++;

  const lista = [...pins.entries()].flatMap(([id, p]) => {
    const posto = snap.postos.get(id);
    if (!posto || posto.lat == null || posto.lng == null) return [];
    return [
      {
        postoId: id,
        nome: posto.nome,
        cnpj: posto.cnpj,
        bandeira: posto.bandeira,
        municipio: posto.municipio,
        lat: posto.lat,
        lng: posto.lng,
        ...p,
        seloIcl: posto.tier === "selo",
      },
    ];
  });

  res.json(
    GetMapaResponse.parse({
      pins: lista,
      calor,
      totalDenuncias: denuncias.length,
      totalCheckins: checkins.length,
      totalPostos: postosVisiveis.length,
      postosSemCoordenadas: postosVisiveis.filter((posto) => posto.lat == null || posto.lng == null).length,
    }),
  );
});

export default router;
