import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  postoAtributosHistoricoTable,
  postoAtributosTable,
  type JsonValue,
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
import { abertoAgora, CATALOGO_AMENIDADES, dataCalendarioValida, definicaoAmenidade, hojeEmSaoPaulo, horarioPublicavel, metadadosConfirmadosValidos, nomeBandeira, normalizarValorAmenidade, projetarAmenidadesPublicas, validarValorAmenidade, valorPadraoAmenidade } from "../lib/posto-amenidades";
import { validar } from "../lib/http";
import { somenteMaster } from "../middlewares/acesso";

const router: IRouter = Router();
export const postoAmenidadesPublicasRouter: IRouter = Router();
const BANDEIRA_KEY = "bandeira_atual";
class ConflitoAmenidades extends Error {}

function igual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function lerCatalogo(postoId: string) {
  const [rows, history] = await Promise.all([
    db.select().from(postoAtributosTable).where(eq(postoAtributosTable.postoId, postoId)),
    db
      .select()
      .from(postoAtributosHistoricoTable)
      .where(and(
        eq(postoAtributosHistoricoTable.postoId, postoId),
        eq(postoAtributosHistoricoTable.chave, BANDEIRA_KEY),
      ))
      .orderBy(desc(postoAtributosHistoricoTable.alteradoEm), desc(postoAtributosHistoricoTable.id)),
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
  const statusRow = porChave.get("status_operacional");
  const horarioRow = porChave.get("horarios_funcionamento");
  const fusoRow = porChave.get("fuso_horario");
  const status = statusRow && metadadosConfirmadosValidos(statusRow) ? statusRow.valor : null;
  const horarioComValor = horarioRow && metadadosConfirmadosValidos(horarioRow) ? horarioRow.valor : null;
  const horarios = horarioPublicavel(horarioComValor) ? horarioComValor : null;
  const statusValor = typeof status === "string" ? status : null;
  const fuso = fusoRow && metadadosConfirmadosValidos(fusoRow) && typeof fusoRow.valor === "string" ? fusoRow.valor : null;
  const historicoBandeira = history
    .filter((item) => !igual(item.valorAnterior, item.valorNovo))
    .map((item) => ({
      anterior: nomeBandeira(item.valorAnterior),
      atual: nomeBandeira(item.valorNovo),
      alteradoEm: item.alteradoEm,
      autor: item.alteradoPor,
    }));
  return {
    itens,
    abertoAgora: abertoAgora(horarios, statusValor, new Date(), fuso),
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
  const hoje = hojeEmSaoPaulo();
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
    if (
      (item.verificadoEm && (!dataCalendarioValida(item.verificadoEm) || item.verificadoEm > hoje)) ||
      (item.revisarEm && !dataCalendarioValida(item.revisarEm)) ||
      (item.verificadoEm && item.revisarEm && item.revisarEm < item.verificadoEm)
    ) {
      res.status(400).json({ erro: `Datas de verificação ou revisão inválidas para ${campo.rotulo}.` });
      return;
    }
    seen.add(item.chave);
  }

  try {
    await db.transaction(async (tx) => {
    // Serializa edições deste posto, inclusive quando ainda não existe nenhum atributo.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${p.id}, 0))`);
    const atuais = await tx.select().from(postoAtributosTable).where(eq(postoAtributosTable.postoId, p.id));
    const porChave = new Map(atuais.map((atual) => [atual.chave, atual]));
    for (const item of b.itens) {
      const existente = porChave.get(item.chave);
      if ((existente?.atualizadoEm.toISOString() ?? null) !== (item.versao?.toISOString() ?? null)) {
        throw new ConflitoAmenidades("Os dados foram alterados por outra sessão. Recarregue antes de salvar.");
      }
    }
    for (const item of b.itens) {
      const anterior = porChave.get(item.chave);
      const valor = normalizarValorAmenidade(item.chave, item.valor as JsonValue | null);
      const fonte = item.fonte?.trim() || null;
      const verificadoEm = item.verificadoEm;
      const revisarEm = item.revisarEm;
      const publico = campoPublicavel(item.chave, item.publico);
      if (!anterior && !fonte && !verificadoEm && !revisarEm && !publico &&
        igual(valor, valorPadraoAmenidade(definicaoAmenidade(item.chave)!))) continue;
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
  } catch (error) {
    if (!(error instanceof ConflitoAmenidades)) throw error;
    res.status(409).json({ erro: error.message });
    return;
  }

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
  res.set("Cache-Control", "no-store");
  res.json(
    GetAmenidadesPublicasPostoResponse.parse({
      postoId: p.id,
      ...projetarAmenidadesPublicas(rows),
    }),
  );
});

function campoPublicavel(chave: string, publico: boolean): boolean {
  return definicaoAmenidade(chave)?.interno ? false : publico;
}

export default router;
