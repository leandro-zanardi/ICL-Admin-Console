import type { PostoAmenidade } from "@workspace/api-client-react";

export const DIAS = [
  { key: "segunda", label: "Segunda" },
  { key: "terca", label: "Terça" },
  { key: "quarta", label: "Quarta" },
  { key: "quinta", label: "Quinta" },
  { key: "sexta", label: "Sexta" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
] as const;
type Dia = (typeof DIAS)[number]["key"];
export type DiaFormulario = {
  fechado: boolean;
  diaTodo: boolean;
  abertura: string;
  fechamento: string;
};
export type HorarioFormulario = Record<Dia, DiaFormulario>;
type HorarioApi = Record<Dia, {
  fechado: boolean;
  diaTodo: boolean;
  abertura: string | null;
  fechamento: string | null;
}>;
export type ItemFormulario = {
  chave: string;
  valor: unknown;
  fonte: string;
  verificadoEm: string;
  revisarEm: string;
  publico: boolean;
  versao: string | null;
};
export type FormularioAmenidades = { itens: ItemFormulario[] };

function horarioVazio(): HorarioFormulario {
  return Object.fromEntries(
    DIAS.map(({ key }) => [key, { fechado: false, diaTodo: false, abertura: "", fechamento: "" }]),
  ) as HorarioFormulario;
}

function objeto(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function valorHorarioFormulario(value: unknown): HorarioFormulario {
  const raw = objeto(value);
  const horario = horarioVazio();
  if (!raw) return horario;
  for (const { key } of DIAS) {
    const dia = objeto(raw[key]);
    if (!dia) continue;
    horario[key] = {
      fechado: dia.fechado === true,
      diaTodo: dia.diaTodo === true,
      abertura: typeof dia.abertura === "string" ? dia.abertura : "",
      fechamento: typeof dia.fechamento === "string" ? dia.fechamento : "",
    };
  }
  return horario;
}

export function paraFormulario(itens: PostoAmenidade[]): FormularioAmenidades {
  return {
    itens: itens.map((item) => ({
      chave: item.chave,
      valor: item.tipo === "horarios" ? valorHorarioFormulario(item.valor) : (item.valor ?? ""),
      fonte: item.fonte ?? "",
      verificadoEm: item.verificadoEm?.slice(0, 10) ?? "",
      revisarEm: item.revisarEm?.slice(0, 10) ?? "",
      publico: item.interno ? false : item.publico,
      versao: item.atualizadoEm,
    })),
  };
}

function diaInformado(dia: Record<string, unknown> | null): boolean {
  return Boolean(dia && (dia.fechado || dia.diaTodo || dia.abertura || dia.fechamento));
}

export function horarioCompleto(value: unknown): boolean {
  const raw = objeto(value);
  if (!raw || !DIAS.some(({ key }) => diaInformado(objeto(raw[key])))) return true;
  return DIAS.every(({ key }) => {
    const dia = objeto(raw[key]);
    if (!dia || (dia.fechado && dia.diaTodo)) return false;
    if (dia.fechado === true || dia.diaTodo === true) return true;
    return typeof dia.abertura === "string" &&
      typeof dia.fechamento === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(dia.abertura) &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(dia.fechamento) &&
      dia.abertura !== dia.fechamento;
  });
}

/** Horários em branco significam desconhecido; fechado/24h não enviam horas vazias. */
export function horarioParaApi(value: unknown): HorarioApi | null {
  const raw = objeto(value);
  if (!raw || !horarioCompleto(value) || !DIAS.some(({ key }) => diaInformado(objeto(raw[key])))) return null;
  return Object.fromEntries(DIAS.map(({ key }) => {
    const dia = objeto(raw[key])!;
    const fechado = dia.fechado === true;
    const diaTodo = !fechado && dia.diaTodo === true;
    return [key, {
      fechado,
      diaTodo,
      abertura: fechado || diaTodo ? null : String(dia.abertura),
      fechamento: fechado || diaTodo ? null : String(dia.fechamento),
    }];
  })) as HorarioApi;
}

export function hojeSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function valorPublicavel(item: PostoAmenidade, formItem: ItemFormulario): boolean {
  if (item.interno || !formItem.fonte.trim() || !formItem.verificadoEm) return false;
  if (formItem.verificadoEm > hojeSaoPaulo()) return false;
  if (formItem.revisarEm && (formItem.revisarEm < hojeSaoPaulo() || formItem.revisarEm < formItem.verificadoEm)) return false;
  if (item.tipo === "horarios") return horarioParaApi(formItem.valor) !== null;
  if (item.tipo === "texto") return typeof formItem.valor === "string" && formItem.valor.trim().length > 0;
  return typeof formItem.valor === "string" && formItem.valor !== "nao_verificado" && formItem.valor.length > 0;
}
