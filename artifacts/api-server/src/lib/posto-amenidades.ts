import type { JsonValue } from "@workspace/db";
import type { PostoAtributo } from "@workspace/db";

export type EstadoAmenidade = "sim" | "nao" | "nao_verificado";
export type TipoAmenidade = "status" | "boolean" | "texto" | "horarios";
export type PeriodoDia = {
  fechado: boolean;
  diaTodo: boolean;
  abertura: string | null;
  fechamento: string | null;
};
export type HorariosFuncionamento = Record<
  "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado" | "domingo",
  PeriodoDia
>;
export type ValorAmenidade = JsonValue | null;

export interface OpcaoAmenidade {
  valor: string;
  rotulo: string;
}

export interface DefinicaoAmenidade {
  chave: string;
  rotulo: string;
  grupo: string;
  tipo: TipoAmenidade;
  opcoes: OpcaoAmenidade[];
  interno: boolean;
}

const ESTADOS: OpcaoAmenidade[] = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "nao", rotulo: "Não" },
  { valor: "nao_verificado", rotulo: "Não verificado" },
];

const STATUS_OPERACIONAL: OpcaoAmenidade[] = [
  { valor: "em_operacao", rotulo: "Em operação" },
  { valor: "fechado_temporariamente", rotulo: "Fechado temporariamente" },
  { valor: "encerrado_permanentemente", rotulo: "Encerrado permanentemente" },
  { valor: "suspenso", rotulo: "Suspenso" },
  { valor: "nao_verificado", rotulo: "Não verificado" },
];

export const CATALOGO_AMENIDADES: DefinicaoAmenidade[] = [
  { chave: "status_operacional", rotulo: "Situação operacional", grupo: "Operação", tipo: "status", opcoes: STATUS_OPERACIONAL, interno: false },
  { chave: "fuso_horario", rotulo: "Fuso horário local", grupo: "Operação", tipo: "status", opcoes: [
    { valor: "America/Sao_Paulo", rotulo: "Brasília — UTC−3" },
    { valor: "America/Manaus", rotulo: "Manaus — UTC−4" },
    { valor: "America/Rio_Branco", rotulo: "Rio Branco — UTC−5" },
    { valor: "America/Noronha", rotulo: "Fernando de Noronha — UTC−2" },
    { valor: "nao_verificado", rotulo: "Não verificado" },
  ], interno: false },
  { chave: "horarios_funcionamento", rotulo: "Horário de funcionamento", grupo: "Operação", tipo: "horarios", opcoes: [], interno: false },
  { chave: "situacao_cadastro_anp", rotulo: "Situação do cadastro na ANP", grupo: "Cadastro regulatório", tipo: "status", opcoes: [
    { valor: "autorizado", rotulo: "Autorizado" },
    { valor: "suspenso", rotulo: "Suspenso" },
    { valor: "revogado", rotulo: "Revogado" },
    { valor: "nao_verificado", rotulo: "Não verificado" },
  ], interno: false },
  { chave: "bandeira_atual", rotulo: "Bandeira atual", grupo: "Bandeira", tipo: "texto", opcoes: [], interno: false },
  { chave: "gasolina", rotulo: "Gasolina", grupo: "Combustíveis e mobilidade", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "etanol", rotulo: "Etanol", grupo: "Combustíveis e mobilidade", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "diesel_s10", rotulo: "Diesel S10", grupo: "Combustíveis e mobilidade", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "diesel_s500", rotulo: "Diesel S500", grupo: "Combustíveis e mobilidade", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "gnv", rotulo: "GNV", grupo: "Combustíveis e mobilidade", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "recarga_eletrica", rotulo: "Recarga para veículo elétrico", grupo: "Combustíveis e mobilidade", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "loja_conveniencia", rotulo: "Loja de conveniência", grupo: "Conveniência e alimentação", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "restaurante", rotulo: "Restaurante", grupo: "Conveniência e alimentação", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "cafeteria_lanchonete", rotulo: "Cafeteria ou lanchonete", grupo: "Conveniência e alimentação", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "agua_potavel", rotulo: "Água potável", grupo: "Conveniência e alimentação", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "banheiro", rotulo: "Banheiro", grupo: "Apoio ao motorista", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "chuveiro", rotulo: "Chuveiro", grupo: "Apoio ao motorista", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "estacionamento_caminhao", rotulo: "Estacionamento para caminhão", grupo: "Apoio ao motorista", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "pernoite_caminhao", rotulo: "Permite pernoite de caminhão", grupo: "Apoio ao motorista", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "area_descanso", rotulo: "Área de descanso", grupo: "Apoio ao motorista", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "wi_fi", rotulo: "Wi-Fi", grupo: "Apoio ao motorista", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "calibragem", rotulo: "Calibragem de pneus", grupo: "Serviços automotivos", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "borracharia", rotulo: "Borracharia", grupo: "Serviços automotivos", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "oficina_mecanica", rotulo: "Oficina mecânica", grupo: "Serviços automotivos", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "troca_oleo", rotulo: "Troca de óleo", grupo: "Serviços automotivos", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "lavagem", rotulo: "Lavagem de veículos", grupo: "Serviços automotivos", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "acesso_acessivel", rotulo: "Acesso para cadeira de rodas", grupo: "Acessibilidade", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "banheiro_acessivel", rotulo: "Banheiro acessível", grupo: "Acessibilidade", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "pix", rotulo: "Aceita Pix", grupo: "Pagamentos", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "cartao", rotulo: "Aceita cartão", grupo: "Pagamentos", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "convenio_frota", rotulo: "Convênio ou cartão de frota", grupo: "Pagamentos", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "equipamento_verificado_icl", rotulo: "Equipamento de abastecimento verificado pelo ICL", grupo: "Verificação ICL", tipo: "boolean", opcoes: ESTADOS, interno: false },
  { chave: "bomba_criptografada", rotulo: "Bomba criptografada — verificação interna", grupo: "Segurança interna", tipo: "boolean", opcoes: ESTADOS, interno: true },
];

const POR_CHAVE = new Map(CATALOGO_AMENIDADES.map((campo) => [campo.chave, campo]));
const DIAS: (keyof HorariosFuncionamento)[] = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
];
const INDICE_DIA: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};
const CHAVE_DIA: (keyof HorariosFuncionamento)[] = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
];

export function definicaoAmenidade(chave: string): DefinicaoAmenidade | undefined {
  return POR_CHAVE.get(chave);
}

function horarioValido(value: unknown): value is HorariosFuncionamento {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const dias = value as Record<string, unknown>;
  return DIAS.every((dia) => {
    const item = dias[dia];
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const h = item as Record<string, unknown>;
    if (typeof h.fechado !== "boolean" || typeof h.diaTodo !== "boolean") return false;
    if (h.fechado) return !h.diaTodo && h.abertura == null && h.fechamento == null;
    if (h.diaTodo) return h.abertura == null && h.fechamento == null;
    return (
      typeof h.abertura === "string" &&
      typeof h.fechamento === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(h.abertura) &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(h.fechamento) &&
      h.abertura !== h.fechamento
    );
  });
}

export function validarValorAmenidade(chave: string, valor: unknown): valor is ValorAmenidade {
  const campo = POR_CHAVE.get(chave);
  if (!campo) return false;
  if (campo.tipo === "horarios") return valor === null || horarioValido(valor);
  if (campo.tipo === "texto") return typeof valor === "string" && valor.length <= 120;
  return campo.opcoes.some((opcao) => opcao.valor === valor);
}

/** Retorna apenas o formato conhecido; chaves arbitrárias nunca seguem para o app. */
export function normalizarValorAmenidade(chave: string, valor: ValorAmenidade): ValorAmenidade {
  const campo = POR_CHAVE.get(chave);
  if (campo?.tipo === "horarios" && horarioValido(valor)) {
    return Object.fromEntries(DIAS.map((dia) => [dia, {
      fechado: valor[dia].fechado,
      diaTodo: valor[dia].diaTodo,
      abertura: valor[dia].fechado || valor[dia].diaTodo ? null : valor[dia].abertura,
      fechamento: valor[dia].fechado || valor[dia].diaTodo ? null : valor[dia].fechamento,
    }]));
  }
  return typeof valor === "string" ? valor.trim() : valor;
}

export function valorPadraoAmenidade(campo: DefinicaoAmenidade): ValorAmenidade {
  if (campo.tipo === "horarios") return null;
  if (campo.tipo === "texto") return "";
  return "nao_verificado";
}

export function horarioPublicavel(valor: ValorAmenidade): valor is HorariosFuncionamento {
  return horarioValido(valor);
}

export function abertoAgora(
  horarios: HorariosFuncionamento | null,
  estado: string | null,
  instante = new Date(),
  fuso: string | null = null,
): boolean | null {
  if (estado && ["fechado_temporariamente", "encerrado_permanentemente", "suspenso"].includes(estado)) {
    return false;
  }
  if (!horarios || !fuso || !validarValorAmenidade("fuso_horario", fuso) || fuso === "nao_verificado") return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instante);
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hoje = INDICE_DIA[p.weekday] ?? 0;
  const minuto = Number(p.hour) * 60 + Number(p.minute);
  const ontem = (hoje + 6) % 7;
  const periodoHoje = horarios[CHAVE_DIA[hoje]];
  const periodoOntem = horarios[CHAVE_DIA[ontem]];

  if (!periodoHoje.fechado) {
    if (periodoHoje.diaTodo) return true;
    const inicio = tempoEmMinutos(periodoHoje.abertura);
    const fim = tempoEmMinutos(periodoHoje.fechamento);
    if (inicio !== null && fim !== null) {
      if (fim > inicio && minuto >= inicio && minuto < fim) return true;
      if (fim < inicio && minuto >= inicio) return true;
    }
  }
  if (!periodoOntem.fechado && !periodoOntem.diaTodo) {
    const inicio = tempoEmMinutos(periodoOntem.abertura);
    const fim = tempoEmMinutos(periodoOntem.fechamento);
    if (inicio !== null && fim !== null && fim < inicio && minuto < fim) return true;
  }

  return false;
}

function tempoEmMinutos(tempo: string | null): number | null {
  if (!tempo || !/^([01]\d|2[0-3]):[0-5]\d$/.test(tempo)) return null;
  const [horas, minutos] = tempo.split(":").map(Number);
  return horas * 60 + minutos;
}

export function metadadosConfirmadosValidos(item: PostoAtributo, hoje = hojeEmSaoPaulo()): boolean {
  if (!item.fonte?.trim() || !item.verificadoEm) return false;
  if (!dataCalendarioValida(item.verificadoEm) || item.verificadoEm > hoje) return false;
  if (item.revisarEm && item.revisarEm < hoje) return false;
  if (item.revisarEm && (!dataCalendarioValida(item.revisarEm) || item.revisarEm < item.verificadoEm)) return false;
  if (item.valor === null || item.valor === "") return false;
  if (item.valor === "nao_verificado") return false;
  return true;
}

export function metadadosPublicosValidos(item: PostoAtributo, hoje = hojeEmSaoPaulo()): boolean {
  const campo = POR_CHAVE.get(item.chave);
  return Boolean(campo && !campo.interno && item.publico && metadadosConfirmadosValidos(item, hoje));
}

export function dataCalendarioValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

/** Projeção positiva: nunca inclui fonte, autor, histórico ou campos internos. */
export function projetarAmenidadesPublicas(rows: PostoAtributo[], instante = new Date()) {
  const hoje = hojeEmSaoPaulo(instante);
  const itens = rows
    .filter((item) => metadadosPublicosValidos(item, hoje) && validarValorAmenidade(item.chave, item.valor))
    .map((item) => {
      const campo = POR_CHAVE.get(item.chave)!;
      return {
        chave: campo.chave,
        rotulo: campo.rotulo,
        grupo: campo.grupo,
        valor: normalizarValorAmenidade(item.chave, item.valor),
        verificadoEm: item.verificadoEm!,
      };
    });
  const status = itens.find((item) => item.chave === "status_operacional")?.valor;
  const horario = itens.find((item) => item.chave === "horarios_funcionamento")?.valor ?? null;
  const fusoValor = itens.find((item) => item.chave === "fuso_horario")?.valor;
  const fuso = typeof fusoValor === "string" ? fusoValor : null;
  const hours = horarioPublicavel(horario) ? horario : null;
  const estado = typeof status === "string" ? status : null;
  return {
    itens,
    abertoAgora: estado && ["fechado_temporariamente", "encerrado_permanentemente", "suspenso"].includes(estado)
      ? false
      : hours ? abertoAgora(hours, estado, instante, fuso) : null,
  };
}

export function hojeEmSaoPaulo(instante = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instante);
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function nomeBandeira(valor: JsonValue | null): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}
