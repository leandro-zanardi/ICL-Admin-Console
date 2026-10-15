import type { Snapshot } from "./snapshot";
import { anpConfirma, chaveDenunciante, distanciaM, rotuloDenunciante } from "./antifraude";
import type { Sessao } from "./escopo";
import type {
  CheckinRow,
  ConfigRanking,
  DenunciaRow,
  FaixaRanking,
  GestaoRow,
  PostoRow,
  PrazoEstado,
} from "./types";

const H = 3600 * 1000;

export function faixaRanking(verdadeiras: number, cfg: ConfigRanking): FaixaRanking {
  if (verdadeiras >= cfg.ouro) return "ouro";
  if (verdadeiras >= cfg.prata) return "prata";
  if (verdadeiras >= cfg.bronze) return "bronze";
  return "sem_faixa";
}

const STATUS_RETIRADA = new Set(["retirada", "retirada_cliente", "retirada_pelo_cliente", "retirada_cliente_resolvida"]);

export function foiRetirada(d: DenunciaRow, g: GestaoRow | undefined): boolean {
  return g?.retiradaEm != null || STATUS_RETIRADA.has(d.status);
}

export function denunciaEncerrada(d: DenunciaRow, g: GestaoRow | undefined): boolean {
  return foiRetirada(d, g) || g?.decisao != null || d.status === "respondida";
}

export function prazoEstado(d: DenunciaRow, g: GestaoRow | undefined, agora = new Date()): PrazoEstado {
  if (denunciaEncerrada(d, g)) return "encerrado";
  if (!g?.prazoEm) return "sem_prazo";
  const restante = g.prazoEm.getTime() - agora.getTime();
  if (restante < 0) return "vencido";
  if (restante < 48 * H) return "vencendo";
  return "no_prazo";
}

export function resumoDenuncia(snap: Snapshot, d: DenunciaRow, sessao: Sessao) {
  const g = snap.gestao.get(d.id);
  const score = sessao.papel === "master" ? snap.scores.get(d.id) : undefined;
  return {
    id: d.id,
    protocolo: d.protocolo,
    categoria: d.categoria,
    status: d.status,
    municipio: d.municipio,
    postoId: d.postoId,
    postoNome: d.postoId ? (snap.postos.get(d.postoId)?.nome ?? null) : null,
    descricaoResumo: d.descricao.length > 140 ? `${d.descricao.slice(0, 137)}...` : d.descricao,
    criadoEm: d.criadoEm,
    prazoEm: g?.prazoEm ?? null,
    prazoEstado: prazoEstado(d, g),
    decisao: (g?.decisao as "procedente" | "improcedente" | null | undefined) ?? null,
    retirada: foiRetirada(d, g),
    score: score?.score ?? null,
    faixa: score?.faixa ?? null,
  };
}

export function evidenciaAnp(snap: Snapshot, posto: PostoRow, categoria?: string) {
  const a = snap.anp.get(posto.id);
  return {
    autuacoes24m: posto.autuacoes24m,
    qualidadeConforme: posto.qualidadeConforme,
    notaAnp: posto.notaAnp,
    irregularidades: a?.irregularidades ?? 0,
    ensaiosNaoConformes: a?.ensaiosNaoConformes ?? 0,
    amostrasNaoConformes: a?.amostrasNaoConformes ?? 0,
    confirmaDenuncia: categoria ? anpConfirma(categoria, posto, a) : false,
  };
}

export function checkinInfo(snap: Snapshot, c: CheckinRow, sessao: Sessao) {
  const u = snap.usuarios.get(c.userId);
  return {
    id: c.id,
    postoId: c.postoId,
    postoNome: snap.postos.get(c.postoId)?.nome ?? null,
    pontos: c.pontos,
    distanciaM: c.distanciaM,
    criadoEm: c.criadoEm,
    usuarioRotulo: sessao.papel === "master" ? (u ? `Usuário ${u.id.slice(0, 8)}` : null) : null,
  };
}

function rotuloAutor(papel: string, email: string, sessao: Sessao): string {
  if (sessao.papel === "master") return `${papel === "master" ? "Time ICL" : "Posto"} (${email})`;
  return papel === "master" ? "Time ICL" : "Posto";
}

export function detalheDenuncia(snap: Snapshot, d: DenunciaRow, sessao: Sessao) {
  const master = sessao.papel === "master";
  const g = snap.gestao.get(d.id);
  const posto = d.postoId ? snap.postos.get(d.postoId) : undefined;
  const chave = chaveDenunciante(d);
  const score = master ? snap.scores.get(d.id) : undefined;
  const user = d.userId ? snap.usuarios.get(d.userId) : undefined;
  const rep = chave ? snap.reputacao.get(chave) : undefined;

  let denunciante = null as null | {
    tipo: "usuario" | "aparelho" | "desconhecido";
    id: string | null;
    rotulo: string;
    contato: string | null;
    totalDenuncias: number;
    procedentes: number;
    improcedentes: number;
    faixaRanking: FaixaRanking;
    criadoEm: Date | null;
  };
  let historico: ReturnType<typeof resumoDenuncia>[] = [];
  let checkinsDenunciante: ReturnType<typeof checkinInfo>[] = [];
  if (master) {
    denunciante = {
      tipo: chave ? (chave.startsWith("u:") ? "usuario" : "aparelho") : "desconhecido",
      id: chave ? chave.slice(2) : null,
      rotulo: chave ? rotuloDenunciante(chave) : "Denunciante não identificado",
      contato: user?.contato ?? null,
      totalDenuncias: rep?.denuncias.length ?? 1,
      procedentes: rep?.procedentes ?? 0,
      improcedentes: rep?.improcedentes ?? 0,
      faixaRanking: faixaRanking(rep?.verdadeiras ?? 0, snap.configRanking),
      criadoEm: user?.criadoEm ?? null,
    };
    historico = (rep?.denuncias ?? [])
      .filter((o) => o.id !== d.id)
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
      .map((o) => resumoDenuncia(snap, o, sessao));
    if (d.userId && d.postoId) {
      checkinsDenunciante = snap.checkins
        .filter((c) => c.userId === d.userId && c.postoId === d.postoId)
        .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
        .map((c) => checkinInfo(snap, c, sessao));
    }
  }

  const andamentos = snap.andamentos.get(d.id) ?? [];
  const linha: { tipo: "criada" | "andamento" | "prazo" | "decisao" | "retirada"; titulo: string; mensagem: string | null; autor: string | null; criadoEm: Date }[] = [
    { tipo: "criada", titulo: "Denúncia recebida", mensagem: null, autor: null, criadoEm: d.criadoEm },
  ];
  for (const a of andamentos) {
    linha.push({
      tipo: "andamento",
      titulo: a.status === "respondida" ? "Resposta registrada" : "Encaminhada ao posto",
      mensagem: a.mensagem,
      autor: rotuloAutor(a.autorPapel, a.autorEmail, sessao),
      criadoEm: a.criadoEm,
    });
  }
  if (g?.decisao && g.decisaoEm) {
    linha.push({
      tipo: "decisao",
      titulo: g.decisao === "procedente" ? "Decisão: procedente" : "Decisão: improcedente",
      mensagem: master ? g.decisaoObservacao : null,
      autor: master ? g.decisaoPor : "Time ICL",
      criadoEm: g.decisaoEm,
    });
  }
  if (g?.retiradaEm) {
    linha.push({
      tipo: "retirada",
      titulo: "Denúncia retirada / resolvida",
      mensagem: g.retiradaResolucao,
      autor: g.retiradaOrigem === "cliente" ? "Cliente" : g.retiradaOrigem === "posto" ? "Posto" : "Time ICL",
      criadoEm: g.retiradaEm,
    });
  }
  linha.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());

  let dist: number | null = null;
  if (d.lat != null && d.lng != null && posto?.lat != null && posto?.lng != null) {
    dist = distanciaM(d.lat, d.lng, posto.lat, posto.lng);
  }

  return {
    ...resumoDenuncia(snap, d, sessao),
    descricao: d.descricao,
    anexos: d.fotoNome ? [{ nome: d.fotoNome, url: null }] : [],
    localizacaoUsuario: master && d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng, peso: 1 } : null,
    distanciaPostoM: master ? dist : null,
    denunciante,
    historicoDenunciante: historico,
    checkinsDenunciante,
    evidenciaAnp: posto ? evidenciaAnp(snap, posto, d.categoria) : null,
    fatores: score?.fatores ?? [],
    linhaDoTempo: linha,
    decisaoObservacao: master ? (g?.decisaoObservacao ?? null) : null,
    decisaoPor: master ? (g?.decisaoPor ?? null) : null,
    decisaoEm: g?.decisaoEm ?? null,
    retiradaInfo: g?.retiradaEm
      ? {
          origem: (g.retiradaOrigem as "cliente" | "posto" | "master") ?? "master",
          resolucao: g.retiradaResolucao,
          retiradaEm: g.retiradaEm,
          autor: master ? g.retiradaPor : null,
        }
      : null,
    disponibilidade: {
      denunciante: snap.caps.denunciante,
      localizacao: snap.caps.localizacao,
      anexos: snap.caps.anexos,
      andamentosNoApp: snap.caps.andamentosNoApp,
    },
  };
}
