import { cn } from "@/lib/utils";
import { CATEGORIAS, DECISOES, FAIXAS_RANKING, FAIXAS_SCORE, PRAZOS, STATUS, labelOf } from "@/lib/format";
import { Award, Clock, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

const base = "inline-flex items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 py-[1px] text-[11px] font-medium leading-5";

export function StatusBadge({ status }: { status: string }) {
  const c = status === "respondida" ? "border-ok/30 bg-ok/10 text-ok" : status === "encaminhada" ? "border-chart-2/30 bg-chart-2/10 text-chart-2" : "border-border bg-muted text-foreground/80";
  return <span data-testid={`status-${status}`} className={cn(base, c)}><span className="size-1.5 rounded-full bg-current" />{labelOf(STATUS, status)}</span>;
}

export function CategoriaTag({ categoria }: { categoria: string }) {
  return <span className="text-[12px] text-foreground/80">{labelOf(CATEGORIAS, categoria)}</span>;
}

export const prazoTone: Record<string, string> = {
  sem_prazo: "border-border bg-transparent text-muted-foreground",
  no_prazo: "border-chart-2/30 bg-chart-2/10 text-chart-2",
  vencendo: "border-warn/40 bg-warn/15 text-[hsl(32_90%_32%)]",
  vencido: "border-alert/40 bg-alert text-white",
  encerrado: "border-border bg-muted text-muted-foreground line-through decoration-1",
};
export const prazoBar: Record<string, string> = { sem_prazo: "bg-transparent", no_prazo: "bg-chart-2", vencendo: "bg-warn", vencido: "bg-alert", encerrado: "bg-border" };

export function PrazoBadge({ estado }: { estado: string }) {
  return <span data-testid={`prazo-${estado}`} className={cn(base, prazoTone[estado])}><Clock className="size-3" />{labelOf(PRAZOS, estado)}</span>;
}

export function FaixaScoreBadge({ faixa, score }: { faixa?: string | null; score?: number | null }) {
  if (!faixa && (score === null || score === undefined)) return null;
  const Icon = faixa === "suspeita" ? ShieldAlert : faixa === "atencao" ? ShieldQuestion : ShieldCheck;
  const c = faixa === "suspeita" ? "border-alert/40 bg-alert/10 text-alert" : faixa === "atencao" ? "border-warn/40 bg-warn/15 text-[hsl(32_90%_32%)]" : "border-ok/30 bg-ok/10 text-ok";
  return <span className={cn(base, c)}><Icon className="size-3" />{score !== null && score !== undefined && <b className="font-mono tnum">{score}</b>}{faixa && labelOf(FAIXAS_SCORE, faixa)}</span>;
}

export function DecisaoBadge({ decisao }: { decisao?: string | null }) {
  const k = decisao ?? "pendente";
  const c = k === "procedente" ? "border-primary/40 bg-primary/10 text-primary" : k === "improcedente" ? "border-border bg-muted text-muted-foreground" : "border-dashed border-border text-muted-foreground";
  return <span className={cn(base, c)}>{labelOf(DECISOES, k)}</span>;
}

const medal: Record<string, { ring: string; fill: string; text: string }> = {
  ouro: { ring: "border-[hsl(43_80%_45%)]", fill: "bg-gradient-to-b from-[hsl(46_95%_70%)] to-[hsl(40_85%_50%)]", text: "text-[hsl(35_80%_20%)]" },
  prata: { ring: "border-[hsl(210_8%_62%)]", fill: "bg-gradient-to-b from-[hsl(210_15%_92%)] to-[hsl(210_8%_70%)]", text: "text-[hsl(210_15%_22%)]" },
  bronze: { ring: "border-[hsl(24_50%_42%)]", fill: "bg-gradient-to-b from-[hsl(26_60%_70%)] to-[hsl(22_55%_45%)]", text: "text-[hsl(20_60%_15%)]" },
};

export function RankingBadge({ faixa, size = "sm" }: { faixa: string; size?: "sm" | "lg" }) {
  const m = medal[faixa];
  if (!m) return <span data-testid="badge-ranking-sem_faixa" className={cn(base, "border-dashed border-border text-muted-foreground")}>Sem faixa</span>;
  if (size === "lg") {
    return (
      <span data-testid={`badge-ranking-${faixa}`} className={cn("inline-flex size-14 flex-col items-center justify-center rounded-full border-2 shadow-sm", m.ring, m.fill, m.text)}>
        <Award className="size-5" />
        <span className="text-[9px] font-bold uppercase tracking-wider">{FAIXAS_RANKING[faixa]}</span>
      </span>
    );
  }
  return (
    <span data-testid={`badge-ranking-${faixa}`} className={cn(base, "border font-semibold", m.ring, m.fill, m.text)}>
      <Award className="size-3" />{FAIXAS_RANKING[faixa]}
    </span>
  );
}

export function SeloIcl({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <span className={cn(base, "border-sidebar bg-sidebar text-sidebar-primary font-semibold")}><ShieldCheck className="size-3" />Selo ICL</span>
  ) : <span className="text-[11px] text-muted-foreground">sem selo</span>;
}
