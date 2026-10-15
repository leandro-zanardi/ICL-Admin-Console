import { sql } from "drizzle-orm";
import { db, getAppPool, andamentosTable, configuracoesTable, denunciaGestaoTable, denunciaScoresTable } from "@workspace/db";
import { logger } from "./logger";
import { calcularReputacao, calcularScores, detectarCampanhas } from "./antifraude";
import type {
  AlertaCampanhaRow,
  AndamentoRow,
  AnpPosto,
  Capacidades,
  CheckinRow,
  ConfigRanking,
  DenunciaRow,
  GestaoRow,
  PostoRow,
  ReputacaoDenunciante,
  ScoreResultado,
  UsuarioRow,
} from "./types";

export const CONFIG_RANKING_PADRAO: ConfigRanking = { bronze: 1, prata: 3, ouro: 7 };

export interface Snapshot {
  geradoEm: Date;
  caps: Capacidades;
  denuncias: DenunciaRow[];
  denunciasPorId: Map<string, DenunciaRow>;
  postos: Map<string, PostoRow>;
  anp: Map<string, AnpPosto>;
  checkins: CheckinRow[];
  usuarios: Map<string, UsuarioRow>;
  gestao: Map<string, GestaoRow>;
  andamentos: Map<string, AndamentoRow[]>;
  scores: Map<string, ScoreResultado>;
  reputacao: Map<string, ReputacaoDenunciante>;
  alertas: AlertaCampanhaRow[];
  configRanking: ConfigRanking;
}

const TTL_MS = 20_000;
let cache: { em: number; snap: Snapshot } | null = null;
let emAndamento: Promise<Snapshot> | null = null;

export function invalidarSnapshot(): void {
  cache = null;
}

export async function getSnapshot(): Promise<Snapshot> {
  if (cache && Date.now() - cache.em < TTL_MS) return cache.snap;
  if (emAndamento) return emAndamento;
  emAndamento = construir()
    .then((snap) => {
      cache = { em: Date.now(), snap };
      return snap;
    })
    .finally(() => {
      emAndamento = null;
    });
  return emAndamento;
}

const num = (v: unknown): number | null => (v == null ? null : Number(v));
const str = (v: unknown): string | null => (v == null ? null : String(v));

export async function getConfigRanking(): Promise<ConfigRanking> {
  const rows = await db.select().from(configuracoesTable);
  const r = rows.find((x) => x.chave === "ranking");
  const v = r?.valor as Partial<ConfigRanking> | undefined;
  if (!v) return CONFIG_RANKING_PADRAO;
  return {
    bronze: Number(v.bronze ?? CONFIG_RANKING_PADRAO.bronze),
    prata: Number(v.prata ?? CONFIG_RANKING_PADRAO.prata),
    ouro: Number(v.ouro ?? CONFIG_RANKING_PADRAO.ouro),
  };
}

let capsCache: Capacidades | null = null;

/** Descobre o que o banco do app atual realmente oferece, sem assumir o schema do codigo-fonte do app. */
async function detectarCapacidades(): Promise<{ caps: Capacidades; colunas: Set<string> }> {
  const pool = getAppPool();
  const cols = await pool.query<{ column_name: string }>(
    "select column_name from information_schema.columns where table_schema='app' and table_name='denuncias'",
  );
  const colunas = new Set(cols.rows.map((r) => r.column_name));
  const tabela = await pool.query<{ n: string }>(
    "select count(*)::text n from information_schema.tables where table_schema='app' and table_name='denuncia_andamentos'",
  );
  const caps: Capacidades = {
    denunciante: ["user_id", "usuario_id", "client_id", "session_id"].some((c) => colunas.has(c)),
    localizacao: (colunas.has("lat") && colunas.has("lng")) || (colunas.has("user_lat") && colunas.has("user_lng")),
    anexos: ["foto_nome", "foto_url", "anexos"].some((c) => colunas.has(c)),
    andamentosNoApp: Number(tabela.rows[0]?.n ?? 0) > 0,
  };
  capsCache = caps;
  return { caps, colunas };
}

export async function getCapacidades(): Promise<Capacidades> {
  if (capsCache) return capsCache;
  return (await detectarCapacidades()).caps;
}

async function construir(): Promise<Snapshot> {
  const pool = getAppPool();
  const { caps } = await detectarCapacidades();

  const [dRes, pRes, irrRes, ensRes, amoRes, ckRes, uRes, cartRes] = await Promise.all([
    pool.query("select * from app.denuncias order by criado_em asc"),
    pool.query(
      "select id, cnpj, razao_social, nome_fantasia, bandeira, endereco, municipio, uf, lat, lng, tier, score, nota_anp, autuacoes_24m, qualidade_conforme, bandeira_consistente from app.postos",
    ),
    pool.query("select posto_id, descricao, classificacao from app.irregularidades"),
    pool.query("select posto_id, count(*)::int n from app.ensaios_nao_conformes group by 1"),
    pool.query("select posto_id, count(*)::int n from app.amostras_pmqc where conforme = false group by 1"),
    pool.query("select id, user_id, posto_id, pontos, distancia_m, criado_em from app.checkins order by criado_em asc"),
    pool.query("select id, contato, criado_em from app.usuarios"),
    pool.query("select user_id, saldo_pontos from app.carteiras"),
  ]);

  const denuncias: DenunciaRow[] = dRes.rows.map((r) => ({
    id: r.id,
    protocolo: r.protocolo,
    categoria: r.categoria,
    postoId: str(r.posto_id),
    municipio: str(r.municipio),
    descricao: r.descricao ?? "",
    fotoNome: str(r.foto_nome ?? r.foto_url),
    status: r.status,
    criadoEm: new Date(r.criado_em),
    userId: str(r.user_id ?? r.usuario_id),
    deviceId: str(r.client_id ?? r.session_id),
    lat: num(r.lat ?? r.user_lat),
    lng: num(r.lng ?? r.user_lng),
  }));

  const postos = new Map<string, PostoRow>();
  for (const r of pRes.rows) {
    postos.set(r.id, {
      id: r.id,
      cnpj: str(r.cnpj),
      nome: r.nome_fantasia || r.razao_social || "Posto sem nome",
      razaoSocial: str(r.razao_social),
      bandeira: str(r.bandeira),
      endereco: str(r.endereco),
      municipio: str(r.municipio),
      uf: str(r.uf),
      lat: num(r.lat),
      lng: num(r.lng),
      tier: str(r.tier),
      score: num(r.score),
      notaAnp: num(r.nota_anp),
      autuacoes24m: num(r.autuacoes_24m),
      qualidadeConforme: r.qualidade_conforme == null ? null : Boolean(r.qualidade_conforme),
      bandeiraConsistente: r.bandeira_consistente == null ? null : Boolean(r.bandeira_consistente),
    });
  }

  const anp = new Map<string, AnpPosto>();
  const obterAnp = (id: string): AnpPosto => {
    let a = anp.get(id);
    if (!a) {
      a = { irregularidades: 0, irregularidadesVolume: 0, irregularidadesBandeira: 0, ensaiosNaoConformes: 0, amostrasNaoConformes: 0 };
      anp.set(id, a);
    }
    return a;
  };
  for (const r of irrRes.rows) {
    const a = obterAnp(r.posto_id);
    a.irregularidades++;
    const txt = `${r.descricao ?? ""} ${r.classificacao ?? ""}`.toLowerCase();
    if (/volume|bomba|medidor|quantidade|lacre|bico/.test(txt)) a.irregularidadesVolume++;
    if (/bandeira|clone|identifica/.test(txt)) a.irregularidadesBandeira++;
  }
  for (const r of ensRes.rows) obterAnp(r.posto_id).ensaiosNaoConformes = Number(r.n);
  for (const r of amoRes.rows) obterAnp(r.posto_id).amostrasNaoConformes = Number(r.n);

  const checkins: CheckinRow[] = ckRes.rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    postoId: r.posto_id,
    pontos: Number(r.pontos ?? 0),
    distanciaM: num(r.distancia_m),
    criadoEm: new Date(r.criado_em),
  }));

  const saldos = new Map<string, number>(cartRes.rows.map((r) => [r.user_id, Number(r.saldo_pontos)]));
  const usuarios = new Map<string, UsuarioRow>();
  for (const r of uRes.rows) {
    usuarios.set(r.id, { id: r.id, contato: r.contato, criadoEm: new Date(r.criado_em), saldoPontos: saldos.get(r.id) ?? 0 });
  }

  const [gestaoRows, andRows, storedScores, configRanking] = await Promise.all([
    db.select().from(denunciaGestaoTable),
    db.select().from(andamentosTable).orderBy(andamentosTable.criadoEm),
    db.select().from(denunciaScoresTable),
    getConfigRanking(),
  ]);
  const gestao = new Map<string, GestaoRow>(gestaoRows.map((g) => [g.denunciaId, g]));
  const andamentos = new Map<string, AndamentoRow[]>();
  for (const a of andRows) {
    const l = andamentos.get(a.denunciaId) ?? [];
    l.push(a);
    andamentos.set(a.denunciaId, l);
  }

  const ctx = { denuncias, postos, anp, checkins, usuarios, gestao, caps };
  const scores = calcularScores(ctx);
  const reputacao = calcularReputacao(ctx, scores, new Date());
  const alertas = detectarCampanhas(ctx, scores);

  // Persiste scores novos ou alterados (auditoria e consultas futuras)
  const guardado = new Map(storedScores.map((s) => [s.denunciaId, s]));
  const alterados = [...scores.entries()].filter(([id, s]) => {
    const g = guardado.get(id);
    return !g || g.score !== s.score || JSON.stringify(g.fatores) !== JSON.stringify(s.fatores);
  });
  if (alterados.length > 0) {
    db.insert(denunciaScoresTable)
      .values(alterados.map(([id, s]) => ({ denunciaId: id, score: s.score, faixa: s.faixa, fatores: s.fatores, calculadoEm: new Date() })))
      .onConflictDoUpdate({
        target: denunciaScoresTable.denunciaId,
        set: {
          score: sqlExcluded("score"),
          faixa: sqlExcluded("faixa"),
          fatores: sqlExcluded("fatores"),
          calculadoEm: sqlExcluded("calculado_em"),
        },
      })
      .catch((err: unknown) => logger.error({ err }, "Falha ao persistir scores de denúncias"));
  }

  return {
    geradoEm: new Date(),
    caps,
    denuncias,
    denunciasPorId: new Map(denuncias.map((d) => [d.id, d])),
    postos,
    anp,
    checkins,
    usuarios,
    gestao,
    andamentos,
    scores,
    reputacao,
    alertas,
    configRanking,
  };
}

function sqlExcluded(coluna: string) {
  return sql.raw(`excluded.${coluna}`);
}
