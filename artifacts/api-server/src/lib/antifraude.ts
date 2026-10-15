import type {
  AlertaCampanhaRow,
  AnpPosto,
  Capacidades,
  CheckinRow,
  DenunciaRow,
  Fator,
  FaixaScore,
  GestaoRow,
  PostoRow,
  ReputacaoDenunciante,
  ScoreResultado,
  UsuarioRow,
} from "./types";

/**
 * Antifraude de denuncias: conjunto de regras transparentes e ponderadas.
 * Cada fator soma ou subtrai pontos de uma base. Dado ausente no app atual
 * gera um fator neutro (impacto 0), nunca um erro.
 */
export const SCORE_BASE = 70;
export const FAIXA_CONFIAVEL_MIN = 70;
export const FAIXA_ATENCAO_MIN = 40;

const H = 3600 * 1000;
const D = 24 * H;

export function faixaDoScore(score: number): FaixaScore {
  if (score >= FAIXA_CONFIAVEL_MIN) return "confiavel";
  if (score >= FAIXA_ATENCAO_MIN) return "atencao";
  return "suspeita";
}

export function chaveDenunciante(d: Pick<DenunciaRow, "userId" | "deviceId">): string | null {
  if (d.userId) return `u:${d.userId}`;
  if (d.deviceId) return `d:${d.deviceId}`;
  return null;
}

export function rotuloDenunciante(chave: string): string {
  const [tipo, id] = [chave.slice(0, 1), chave.slice(2)];
  return tipo === "u" ? `Usuário ${id.slice(0, 8)}` : `Aparelho ${id.slice(0, 8)}`;
}

function tokens(texto: string): Set<string> {
  const limpo = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return new Set(limpo.split(/[^a-z0-9]+/).filter((t) => t.length >= 3));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function distanciaM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** A denuncia e confirmada por evidencia oficial da ANP contra o posto? */
export function anpConfirma(categoria: string, posto: PostoRow | undefined, anp: AnpPosto | undefined): boolean {
  if (!posto || !anp) return false;
  switch (categoria) {
    case "qualidade_combustivel":
      return anp.ensaiosNaoConformes > 0 || anp.amostrasNaoConformes > 0 || posto.qualidadeConforme === false;
    case "volume_bomba":
      return anp.irregularidadesVolume > 0;
    case "posto_clone":
      return anp.irregularidadesBandeira > 0 || posto.bandeiraConsistente === false;
    default:
      return false;
  }
}

export function temEvidenciaAnp(posto: PostoRow | undefined, anp: AnpPosto | undefined): boolean {
  if (!posto) return false;
  return (
    (posto.autuacoes24m ?? 0) > 0 ||
    posto.qualidadeConforme === false ||
    (anp != null && (anp.irregularidades > 0 || anp.ensaiosNaoConformes > 0 || anp.amostrasNaoConformes > 0))
  );
}

export function denunciaVerdadeira(
  d: DenunciaRow,
  gestao: GestaoRow | undefined,
  postos: Map<string, PostoRow>,
  anp: Map<string, AnpPosto>,
): boolean {
  if (gestao?.decisao === "procedente") return true;
  if (gestao?.decisao === "improcedente") return false;
  if (!d.postoId) return false;
  return anpConfirma(d.categoria, postos.get(d.postoId), anp.get(d.postoId));
}

export interface ContextoAntifraude {
  denuncias: DenunciaRow[];
  postos: Map<string, PostoRow>;
  anp: Map<string, AnpPosto>;
  checkins: CheckinRow[];
  usuarios: Map<string, UsuarioRow>;
  gestao: Map<string, GestaoRow>;
  caps: Capacidades;
}

function fator(chave: string, nome: string, impacto: number, detalhe: string, neutro = false): Fator {
  return { chave, nome, impacto, neutro: neutro || impacto === 0, detalhe };
}

export function calcularScores(ctx: ContextoAntifraude): Map<string, ScoreResultado> {
  const { denuncias, postos, anp, checkins, usuarios, gestao, caps } = ctx;
  const porDenunciante = new Map<string, DenunciaRow[]>();
  const porPosto = new Map<string, DenunciaRow[]>();
  for (const d of denuncias) {
    const k = chaveDenunciante(d);
    if (k) {
      const l = porDenunciante.get(k) ?? [];
      l.push(d);
      porDenunciante.set(k, l);
    }
    if (d.postoId) {
      const l = porPosto.get(d.postoId) ?? [];
      l.push(d);
      porPosto.set(d.postoId, l);
    }
  }
  const tok = new Map<string, Set<string>>();
  for (const d of denuncias) tok.set(d.id, tokens(d.descricao));
  const checkinsPorUsuarioPosto = new Map<string, CheckinRow[]>();
  for (const c of checkins) {
    const k = `${c.userId}:${c.postoId}`;
    const l = checkinsPorUsuarioPosto.get(k) ?? [];
    l.push(c);
    checkinsPorUsuarioPosto.set(k, l);
  }

  const out = new Map<string, ScoreResultado>();
  for (const d of denuncias) {
    const t = d.criadoEm.getTime();
    const chave = chaveDenunciante(d);
    const outras = chave ? (porDenunciante.get(chave) ?? []).filter((o) => o.id !== d.id) : [];
    const posto = d.postoId ? postos.get(d.postoId) : undefined;
    const fatores: Fator[] = [];

    // 1. Volume e frequencia do denunciante
    if (!chave) {
      fatores.push(fator("volume_frequencia", "Volume e frequência do denunciante", 0, "Denunciante não identificado no app atual.", true));
    } else {
      const recentes = outras.filter((o) => Math.abs(o.criadoEm.getTime() - t) <= 30 * D).length + 1;
      if (recentes >= 5) fatores.push(fator("volume_frequencia", "Volume e frequência do denunciante", -15, `${recentes} denúncias do mesmo denunciante em 30 dias.`));
      else if (recentes >= 3) fatores.push(fator("volume_frequencia", "Volume e frequência do denunciante", -8, `${recentes} denúncias do mesmo denunciante em 30 dias.`));
      else fatores.push(fator("volume_frequencia", "Volume e frequência do denunciante", 0, `${recentes} denúncia(s) do denunciante em 30 dias, dentro do esperado.`));
    }

    // 2. Taxa de improcedentes do denunciante (decisoes de outras denuncias)
    if (!chave) {
      fatores.push(fator("taxa_improcedente", "Histórico de decisões do denunciante", 0, "Denunciante não identificado no app atual.", true));
    } else {
      const decididas = outras.filter((o) => gestao.get(o.id)?.decisao);
      const imp = decididas.filter((o) => gestao.get(o.id)?.decisao === "improcedente").length;
      const proc = decididas.length - imp;
      if (decididas.length < 2) {
        fatores.push(fator("taxa_improcedente", "Histórico de decisões do denunciante", 0, "Poucas decisões anteriores para avaliar o histórico.", true));
      } else {
        const taxa = imp / decididas.length;
        const pct = Math.round(taxa * 100);
        if (taxa >= 0.5) fatores.push(fator("taxa_improcedente", "Histórico de decisões do denunciante", -25, `${pct}% das denúncias decididas foram improcedentes (${imp} de ${decididas.length}).`));
        else if (taxa >= 0.25) fatores.push(fator("taxa_improcedente", "Histórico de decisões do denunciante", -10, `${pct}% das denúncias decididas foram improcedentes (${imp} de ${decididas.length}).`));
        else if (proc / decididas.length >= 0.5) fatores.push(fator("taxa_improcedente", "Histórico de decisões do denunciante", 10, `${proc} de ${decididas.length} denúncias anteriores foram procedentes.`));
        else fatores.push(fator("taxa_improcedente", "Histórico de decisões do denunciante", 0, `${pct}% de improcedentes, sem sinal forte.`));
      }
    }

    // 3. Repeticao contra o mesmo posto
    if (!chave || !d.postoId) {
      fatores.push(fator("repeticao_posto", "Repetição contra o mesmo posto", 0, !d.postoId ? "Denúncia sem posto vinculado." : "Denunciante não identificado no app atual.", true));
    } else {
      const mesmas = outras.filter((o) => o.postoId === d.postoId).length;
      if (mesmas >= 2) fatores.push(fator("repeticao_posto", "Repetição contra o mesmo posto", -15, `O denunciante já fez ${mesmas} outras denúncias contra este posto.`));
      else if (mesmas === 1) fatores.push(fator("repeticao_posto", "Repetição contra o mesmo posto", -6, "O denunciante já fez outra denúncia contra este posto."));
      else fatores.push(fator("repeticao_posto", "Repetição contra o mesmo posto", 0, "Primeira denúncia do denunciante contra este posto."));
    }

    // 4. Rajada contra o posto
    if (!d.postoId) {
      fatores.push(fator("rajada_posto", "Rajada de denúncias contra o posto", 0, "Denúncia sem posto vinculado.", true));
    } else {
      const janela = (porPosto.get(d.postoId) ?? []).filter((o) => Math.abs(o.criadoEm.getTime() - t) <= 24 * H).length;
      if (janela >= 5) fatores.push(fator("rajada_posto", "Rajada de denúncias contra o posto", -15, `${janela} denúncias contra o mesmo posto em 24 horas.`));
      else if (janela >= 3) fatores.push(fator("rajada_posto", "Rajada de denúncias contra o posto", -8, `${janela} denúncias contra o mesmo posto em 24 horas.`));
      else fatores.push(fator("rajada_posto", "Rajada de denúncias contra o posto", 0, "Sem rajada de denúncias contra o posto."));
    }

    // 5. Texto duplicado ou muito parecido
    {
      const meu = tok.get(d.id)!;
      if (meu.size < 2) {
        fatores.push(fator("texto_duplicado", "Texto duplicado ou muito parecido", 0, "Texto curto demais para comparar.", true));
      } else {
        let melhor = 0;
        let mesmoDenunciante = false;
        for (const o of denuncias) {
          if (o.id === d.id) continue;
          const s = jaccard(meu, tok.get(o.id)!);
          if (s > melhor) {
            melhor = s;
            mesmoDenunciante = chave != null && chaveDenunciante(o) === chave;
          }
        }
        const pct = Math.round(melhor * 100);
        if (melhor >= 0.8) fatores.push(fator("texto_duplicado", "Texto duplicado ou muito parecido", mesmoDenunciante ? -25 : -20, `Texto ${pct}% igual ao de outra denúncia${mesmoDenunciante ? " do mesmo denunciante" : ""}.`));
        else if (melhor >= 0.6) fatores.push(fator("texto_duplicado", "Texto duplicado ou muito parecido", -10, `Texto ${pct}% parecido com o de outra denúncia.`));
        else fatores.push(fator("texto_duplicado", "Texto duplicado ou muito parecido", 0, "Texto original."));
      }
    }

    // 6. Evidencia
    if (!caps.anexos) {
      fatores.push(fator("evidencia", "Evidência anexada", 0, "O app atual não informa anexos.", true));
    } else if (d.fotoNome) {
      fatores.push(fator("evidencia", "Evidência anexada", 5, "A denúncia tem anexo."));
    } else if (d.descricao.trim().length < 40) {
      fatores.push(fator("evidencia", "Evidência anexada", -10, "Sem anexo e com descrição curta (menos de 40 caracteres)."));
    } else {
      fatores.push(fator("evidencia", "Evidência anexada", -5, "Sem anexo."));
    }

    // 7. Distancia usuario x posto
    if (d.lat == null || d.lng == null || posto?.lat == null || posto?.lng == null) {
      fatores.push(fator("distancia", "Distância entre o usuário e o posto", 0, "Localização do usuário indisponível no app atual.", true));
    } else {
      const dist = distanciaM(d.lat, d.lng, posto.lat, posto.lng);
      if (dist > 5000) fatores.push(fator("distancia", "Distância entre o usuário e o posto", -15, `Denúncia feita a ${(dist / 1000).toFixed(1)} km do posto.`));
      else if (dist > 1000) fatores.push(fator("distancia", "Distância entre o usuário e o posto", -6, `Denúncia feita a ${(dist / 1000).toFixed(1)} km do posto.`));
      else if (dist <= 300) fatores.push(fator("distancia", "Distância entre o usuário e o posto", 5, `Denúncia feita a ${dist} m do posto.`));
      else fatores.push(fator("distancia", "Distância entre o usuário e o posto", 0, `Denúncia feita a ${dist} m do posto.`));
    }

    // 8. Check-in previo no posto
    if (!d.userId || !d.postoId) {
      fatores.push(fator("checkin_previo", "Check-in prévio no posto", 0, !d.userId ? "Denunciante não vinculado a um usuário no app atual." : "Denúncia sem posto vinculado.", true));
    } else {
      const antes = (checkinsPorUsuarioPosto.get(`${d.userId}:${d.postoId}`) ?? []).filter((c) => c.criadoEm.getTime() <= t).length;
      if (antes > 0) fatores.push(fator("checkin_previo", "Check-in prévio no posto", 10, `${antes} check-in(s) do usuário neste posto antes da denúncia.`));
      else fatores.push(fator("checkin_previo", "Check-in prévio no posto", -3, "O usuário não fez check-in neste posto antes da denúncia."));
    }

    // 9. Idade da conta
    const usuario = d.userId ? usuarios.get(d.userId) : undefined;
    if (!usuario) {
      fatores.push(fator("idade_conta", "Idade da conta", 0, "Conta do denunciante indisponível no app atual.", true));
    } else {
      const idade = t - usuario.criadoEm.getTime();
      const dias = Math.max(0, Math.floor(idade / D));
      if (idade < D) fatores.push(fator("idade_conta", "Idade da conta", -10, "Conta criada há menos de 24 horas."));
      else if (idade < 7 * D) fatores.push(fator("idade_conta", "Idade da conta", -5, `Conta com ${dias} dias.`));
      else if (idade >= 90 * D) fatores.push(fator("idade_conta", "Idade da conta", 5, `Conta com ${dias} dias.`));
      else fatores.push(fator("idade_conta", "Idade da conta", 0, `Conta com ${dias} dias.`));
    }

    // 10. Corroboracao por outros denunciantes
    if (!d.postoId) {
      fatores.push(fator("corroboracao", "Corroboração por outros denunciantes", 0, "Denúncia sem posto vinculado.", true));
    } else {
      const distintos = new Set<string>();
      for (const o of porPosto.get(d.postoId) ?? []) {
        if (o.id === d.id || o.categoria !== d.categoria) continue;
        if (Math.abs(o.criadoEm.getTime() - t) > 30 * D) continue;
        const k = chaveDenunciante(o);
        if (k && k !== chave) distintos.add(k);
      }
      if (distintos.size >= 3) fatores.push(fator("corroboracao", "Corroboração por outros denunciantes", 12, `${distintos.size} outros denunciantes relataram o mesmo problema neste posto.`));
      else if (distintos.size >= 1) fatores.push(fator("corroboracao", "Corroboração por outros denunciantes", 8, `${distintos.size} outro(s) denunciante(s) relataram o mesmo problema neste posto.`));
      else fatores.push(fator("corroboracao", "Corroboração por outros denunciantes", 0, "Nenhum outro denunciante identificado relatou o mesmo problema."));
    }

    // 11. Evidencia oficial da ANP
    if (!posto) {
      fatores.push(fator("evidencia_anp", "Evidência oficial da ANP", 0, "Denúncia sem posto vinculado.", true));
    } else if (anpConfirma(d.categoria, posto, anp.get(posto.id))) {
      fatores.push(fator("evidencia_anp", "Evidência oficial da ANP", 12, "A ANP tem registros contra este posto compatíveis com a categoria da denúncia."));
    } else if (temEvidenciaAnp(posto, anp.get(posto.id))) {
      fatores.push(fator("evidencia_anp", "Evidência oficial da ANP", 4, "A ANP tem registros contra este posto, mas não da mesma categoria."));
    } else {
      fatores.push(fator("evidencia_anp", "Evidência oficial da ANP", 0, "Sem registros da ANP contra este posto.", true));
    }

    const soma = fatores.reduce((s, f) => s + f.impacto, 0);
    const score = Math.max(0, Math.min(100, SCORE_BASE + soma));
    out.set(d.id, { score, faixa: faixaDoScore(score), fatores });
  }
  return out;
}

export function calcularReputacao(
  ctx: ContextoAntifraude,
  scores: Map<string, ScoreResultado>,
  agora: Date,
): Map<string, ReputacaoDenunciante> {
  const mapa = new Map<string, ReputacaoDenunciante>();
  for (const d of ctx.denuncias) {
    const chave = chaveDenunciante(d);
    if (!chave) continue;
    let r = mapa.get(chave);
    if (!r) {
      r = {
        chave,
        tipo: chave.startsWith("u:") ? "usuario" : "aparelho",
        id: chave.slice(2),
        rotulo: rotuloDenunciante(chave),
        denuncias: [],
        procedentes: 0,
        improcedentes: 0,
        verdadeiras: 0,
        ultimos30d: 0,
        postosDistintos: 0,
        scoreMedio: 0,
        motivos: [],
      };
      mapa.set(chave, r);
    }
    r.denuncias.push(d);
  }
  for (const r of mapa.values()) {
    const postos = new Set<string>();
    const porPosto = new Map<string, number>();
    let soma = 0;
    for (const d of r.denuncias) {
      const g = ctx.gestao.get(d.id);
      if (g?.decisao === "procedente") r.procedentes++;
      if (g?.decisao === "improcedente") r.improcedentes++;
      if (denunciaVerdadeira(d, g, ctx.postos, ctx.anp)) r.verdadeiras++;
      if (agora.getTime() - d.criadoEm.getTime() <= 30 * D) r.ultimos30d++;
      if (d.postoId) {
        postos.add(d.postoId);
        porPosto.set(d.postoId, (porPosto.get(d.postoId) ?? 0) + 1);
      }
      soma += scores.get(d.id)?.score ?? SCORE_BASE;
    }
    r.postosDistintos = postos.size;
    r.scoreMedio = Math.round(soma / r.denuncias.length);
    const decididas = r.procedentes + r.improcedentes;
    if (r.ultimos30d >= 5) r.motivos.push(`${r.ultimos30d} denúncias nos últimos 30 dias.`);
    if (decididas >= 2 && r.improcedentes / decididas >= 0.5) r.motivos.push(`${r.improcedentes} de ${decididas} denúncias decididas foram improcedentes.`);
    const maxMesmo = Math.max(0, ...porPosto.values());
    if (maxMesmo >= 3) r.motivos.push(`${maxMesmo} denúncias contra o mesmo posto.`);
    if (r.denuncias.length >= 2 && r.scoreMedio < FAIXA_ATENCAO_MIN + 10) r.motivos.push(`Score médio baixo (${r.scoreMedio}).`);
  }
  return mapa;
}

export function detectarCampanhas(
  ctx: ContextoAntifraude,
  scores: Map<string, ScoreResultado>,
): AlertaCampanhaRow[] {
  const janelaMs = 72 * H;
  const porPosto = new Map<string, DenunciaRow[]>();
  for (const d of ctx.denuncias) {
    if (!d.postoId) continue;
    const l = porPosto.get(d.postoId) ?? [];
    l.push(d);
    porPosto.set(d.postoId, l);
  }
  const alertas: AlertaCampanhaRow[] = [];
  for (const [postoId, lista] of porPosto) {
    const ordenada = [...lista].sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
    // Melhor janela de 72h (a que concentra mais denuncias)
    let melhor: DenunciaRow[] = [];
    for (let i = 0; i < ordenada.length; i++) {
      const base = ordenada[i]!.criadoEm.getTime();
      const grupo = ordenada.filter((o) => o.criadoEm.getTime() >= base && o.criadoEm.getTime() <= base + janelaMs);
      if (grupo.length > melhor.length) melhor = grupo;
    }
    if (melhor.length < 3) continue;
    const chaves = melhor.map((d) => chaveDenunciante(d));
    const conhecidas = chaves.filter((k): k is string => k != null);
    const distintos = new Set(conhecidas).size + (chaves.length - conhecidas.length);
    const scoreMedio = Math.round(melhor.reduce((s, d) => s + (scores.get(d.id)?.score ?? SCORE_BASE), 0) / melhor.length);
    const motivos: string[] = [];
    if (conhecidas.length > 0 && new Set(conhecidas).size < conhecidas.length) motivos.push("denunciantes repetidos");
    const duplicadas = melhor.filter((d) => (scores.get(d.id)?.fatores ?? []).some((f) => f.chave === "texto_duplicado" && f.impacto < 0)).length;
    if (duplicadas >= 2) motivos.push(`${duplicadas} textos duplicados ou parecidos`);
    if (scoreMedio < FAIXA_CONFIAVEL_MIN) motivos.push(`score médio baixo (${scoreMedio})`);
    if (motivos.length === 0) continue;
    const posto = ctx.postos.get(postoId);
    alertas.push({
      postoId,
      postoNome: posto?.nome ?? null,
      totalDenuncias: melhor.length,
      denunciantesDistintos: distintos,
      janelaHoras: 72,
      primeiraEm: melhor[0]!.criadoEm,
      ultimaEm: melhor[melhor.length - 1]!.criadoEm,
      scoreMedio,
      motivo: `${melhor.length} denúncias em até 72 horas contra o mesmo posto: ${motivos.join(", ")}.`,
      denunciaIds: melhor.map((d) => d.id),
    });
  }
  return alertas.sort((a, b) => b.ultimaEm.getTime() - a.ultimaEm.getTime());
}
