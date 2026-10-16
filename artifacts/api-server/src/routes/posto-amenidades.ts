import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  postoAtributosHistoricoTable,
  postoAtributosTable,
  type JsonValue,
  type PostoAtributo,
} from "@workspace/db";
import {
  AtualizarPostoAmenidadesBody,
  AtualizarPostoAmenidadesParams,
  AtualizarPostoAmenidadesResponse,
  GetAmenidadesPublicasPostoParams,
  GetAmenidadesPublicasPostoResponse,
  GetPostoAmenidadesParams,
  GetPostoAmenidadesResponse,
} from "@workspace/api-zod";
import { sessaoDe } from "../lib/escopo";
import { getSnapshot } from "../lib/snapshot";
import { abertoAgora, CATALOGO_AMENIDADES, definicaoAmenidade, horarioPublicavel, metadadosPublicosValidos, nomeBandeira, validarValorAmenidade, valorPadraoAmenidade } from "../lib/posto-amenidades";
import { paramId, validar } from "../lib/http";
import { somenteMaster } from "../middlewares/acesso";

const router: IRouter = Router();
export const postoAmenidadesPublicasRouter: IRouter = Router();
const BANDERA_KEY = "bandeira_atual";

function toDateString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function igual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function lerCatalogo(postoId: string) {
  const [rows, history] = await Promise.all([
    db.select().from(postoAtributosTable).where(eq(postoAtributosTable.postoId, postoId)),
    db
      .select()
      .from(postoAtributosHistoricoTable)
      .where(eq(postoAtributosHistoricoTable.postoId, postoId))
      .orderBy(desc(postoAtributosHistoricoTable.alteradoEm))
      .limit(50),
  ]);
  const porChave = new Map(rows.map((row) => [row.chave, row]));
  const itens = CATALOGO_AMENIDADES.map((campo) => {
    const atual = porChave.get(campo.chave);
    return {
      chave: campo.chave,
      rotulo: campo.rotulo,
      grupo: campo.grupo,
      tipo: campo.tipo,
      opcoes: campo.opcoes,
      interno: campo.interno,
      valor: atual ? atual.valor : valorPadraoAmenidade(campo),
      fonte: atual?.fonte ?? null,
      verificadoEm: atual?.verificadoEm ?? null,
      revisarEm: atual?.revisarEm ?? null,
      publico: campo.interno ? false : (atual?.publico ?? false),
      atualizadoPor: atual?.atualizadoPor ?? null,
      atualizadoEm: atual?.atualizadoEm ?? null,
    };
  });
  const status = porChave.get("status_operacional")?.valor;
  const horario = porChave.get("horarios_funcionamento")?.valor;
  const horarioComValor = horario ?? null;
  const horarios = horarioPublicavel(horarioComValor) ? horarioComValor : null;
  const statusValor = typeof status === "string" ? status : null;
  const historicoBandeira = history
    .filter((item) => item.chave === BANDERA_KEY && !igual(item.valorAnterior, item.valorNovo))
    .map((item) => ({
      anterior: nomeBandeira(item.valorAnterior),
      atual: nomeBandeira(item.valorNovo),
      alteradoEm: item.alteradoEm,
      autor: item.alteradoPor,
    }));
  return {
    itens,
    abertoAgora: abertoAgora(horarios, statusValor),
    historicoBandeira,
  };
}

router.get("/postos/:id/amenidades", somenteMaster, async (req, res): Promise<void> => {
  const p = validar(GetPostoAmenidadesParams, req.params, res);
  if (!p) return;
  const snap = await getSnapshot();
  if (!snap.postos.has(p.id)) {
    res.status(404).json({ erro: "Posto não encontrado." });
    return;
  }
  const catalogo = await lerCatalogo(p.id);
  res.json(
    GetPostoAmenidadesResponse.parse({
      postoId: p.id,
      ...catalogo,
    }),
  );
});

router.put("/postos/:id/amenidades", somenteMaster, async (req, res): Promise<void> => {
  const p = validar(AtualizarPostoAmenidadesParams, req.params, res);
  if (!p) return;
  const b = validar(AtualizarPostoAmenidadesBody, req.body, res);
  if (!b) return;
  const snap = await getSnapshot();
  if (!snap.postos.has(p.id)) {
    res.status(404).json({ erro: "Posto não encontrado." });
    return;
  }
  const sessao = sessaoDe(req);
  const seen = new Set<string>();
  for (const item of b.itens) {
    const campo = definicaoAmenidade(item.chave);
    if (!campo || seen.has(item.chave) || !validarValorAmenidade(item.chave, item.valor)) {
      res.status(400).json({ erro: `Valor inválido para o campo ${item.chave}.` });
      return;
    }
    if (campo.interno && item.publico) {
      res.status(400).json({ erro: "Informações internas de segurança não podem ser publicadas." });
      return;
    }
    seen.add(item.chave);
  }

  await db.transaction(async (tx) => {
    for (const item of b.itens) {
      const [anterior] = await tx
        .select()
        .from(postoAtributosTable)
        .where(
          and(
            eq(postoAtributosTable.postoId, p.id),
            eq(postoAtributosTable.chave, item.chave),
          ),
        );
      const valor = item.valor as JsonValue | null;
      const fonte = item.fonte?.trim() || null;
      const verificadoEm = toDateString(item.verificadoEm);
      const revisarEm = toDateString(item.revisarEm);
      const publico = campoPublicavel(item.chave, item.publico);
      const mudou =
        !anterior ||
        !igual(anterior.valor, valor) ||
        anterior.fonte !== fonte ||
        anterior.verificadoEm !== verificadoEm ||
        anterior.revisarEm !== revisarEm ||
        anterior.publico !== publico;
      if (!mudou) continue;

      if (!igual(anterior?.valor ?? null, valor)) {
        await tx.insert(postoAtributosHistoricoTable).values({
          postoId: p.id,
          chave: item.chave,
          valorAnterior: anterior?.valor ?? null,
          valorNovo: valor,
          alteradoPor: sessao.email,
        });
      }

      await tx
        .insert(postoAtributosTable)
        .values({
          postoId: p.id,
          chave: item.chave,
          valor,
          fonte,
          verificadoEm,
          revisarEm,
          publico,
          atualizadoPor: sessao.email,
        })
        .onConflictDoUpdate({
          target: [postoAtributosTable.postoId, postoAtributosTable.chave],
          set: {
            valor,
            fonte,
            verificadoEm,
            revisarEm,
            publico,
            atualizadoPor: sessao.email,
            atualizadoEm: new Date(),
          },
        });
    }
  });

  const catalogo = await lerCatalogo(p.id);
  res.json(
    AtualizarPostoAmenidadesResponse.parse({
      postoId: p.id,
      ...catalogo,
    }),
  );
});

postoAmenidadesPublicasRouter.get("/postos-publicos/:id/amenidades", async (req, res): Promise<void> => {
  const p = validar(GetAmenidadesPublicasPostoParams, req.params, res);
  if (!p) return;
  const rows = await db.select().from(postoAtributosTable).where(eq(postoAtributosTable.postoId, p.id));
  const publicRows = rows.filter((item) => {
    return (
      metadadosPublicosValidos(item) &&
      validarValorAmenidade(item.chave, item.valor)
    );
  });
  const items = publicRows.map((item) => {
    const campo = definicaoAmenidade(item.chave)!;
    return {
      chave: campo.chave,
      rotulo: campo.rotulo,
      grupo: campo.grupo,
      valor: item.valor,
      verificadoEm: item.verificadoEm!,
    };
  });
  const status = publicRows.find((item) => item.chave === "status_operacional")?.valor;
  const hoursRow = publicRows.find((item) => item.chave === "horarios_funcionamento");
  const hoursValue = hoursRow?.valor ?? null;
  const hours = horarioPublicavel(hoursValue) ? hoursValue : null;
  const estado = typeof status === "string" ? status : null;
  res.set("Cache-Control", "public, max-age=60");
  res.json(
    GetAmenidadesPublicasPostoResponse.parse({
      postoId: p.id,
      abertoAgora: hoursRow && hours ? abertoAgora(hours, estado) : null,
      itens: items,
    }),
  );
});

function campoPublicavel(chave: string, publico: boolean): boolean {
  return definicaoAmenidade(chave)?.interno ? false : publico;
}

export default router;
