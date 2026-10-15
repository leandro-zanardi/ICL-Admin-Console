const TZ = "America/Sao_Paulo";
const dtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dtData = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
const dtCurta = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "short" });
const num = new Intl.NumberFormat("pt-BR");

export const fmtDataHora = (s?: string | null) => (s ? dtHora.format(new Date(s)) : "-");
export const fmtData = (s?: string | null) => (s ? dtData.format(new Date(s)) : "-");
export const fmtDiaCurto = (s: string) => dtCurta.format(new Date(s.length === 10 ? s + "T12:00:00Z" : s));
export const fmtNum = (n?: number | null) => (n === null || n === undefined ? "-" : num.format(n));
export const fmtDist = (m?: number | null) => (m === null || m === undefined ? "-" : m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(m)} m`);
export const fmtHoras = (h: number) => (h < 48 ? `${h.toFixed(1).replace(".", ",")} h` : `${(h / 24).toFixed(1).replace(".", ",")} dias`);

export const CATEGORIAS: Record<string, string> = {
  qualidade_combustivel: "Qualidade do combustível",
  volume_bomba: "Volume da bomba",
  posto_clone: "Posto clone",
  outra: "Outra",
};
export const STATUS: Record<string, string> = { recebida: "Recebida", encaminhada: "Encaminhada", respondida: "Respondida" };
export const PRAZOS: Record<string, string> = { sem_prazo: "Sem prazo", no_prazo: "No prazo", vencendo: "Vencendo", vencido: "Vencido", encerrado: "Encerrado" };
export const FAIXAS_SCORE: Record<string, string> = { confiavel: "Confiável", atencao: "Atenção", suspeita: "Suspeita" };
export const FAIXAS_RANKING: Record<string, string> = { ouro: "Ouro", prata: "Prata", bronze: "Bronze", sem_faixa: "Sem faixa" };
export const DECISOES: Record<string, string> = { procedente: "Procedente", improcedente: "Improcedente", pendente: "Pendente" };
export const ORIGENS: Record<string, string> = { cliente: "Cliente", posto: "Posto", master: "Equipe ICL" };
export const labelOf = (m: Record<string, string>, k?: string | null) => (k ? m[k] ?? k : "-");
export const opts = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }));
export const cnpjRaiz = (cnpj?: string | null) => (cnpj ? cnpj.replace(/\D/g, "").slice(0, 8) : "");
