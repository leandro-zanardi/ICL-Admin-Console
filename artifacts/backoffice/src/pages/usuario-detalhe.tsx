import { useState } from "react";
import { Link, useParams } from "wouter";
import { getGetUsuarioQueryKey, useGetUsuario } from "@workspace/api-client-react";
import { ArrowLeft } from "lucide-react";
import { Kpi, SkeletonRows, ErrorState, EmptyState } from "@/components/kit";
import { RankingBadge } from "@/components/badges";
import { DenunciaRows, CheckinRows } from "@/components/lists";
import { fmtData, fmtDataHora, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "extrato" | "checkins" | "resgates" | "denuncias";

export default function UsuarioDetalhe() {
  const { id = "" } = useParams<{ id: string }>();
  const q = useGetUsuario(id, { query: { enabled: !!id, queryKey: getGetUsuarioQueryKey(id) } });
  const [tab, setTab] = useState<Tab>("extrato");
  if (q.isLoading) return <div className="p-7"><SkeletonRows rows={10} /></div>;
  if (q.isError || !q.data) return <div className="p-7"><ErrorState onRetry={() => q.refetch()} /></div>;
  const u = q.data;
  const tabs: [Tab, string, number][] = [["extrato", "Extrato", u.extrato.length], ["checkins", "Check-ins", u.checkinsLista.length], ["resgates", "Resgates", u.resgatesLista.length], ["denuncias", "Denúncias", u.denunciasLista.length]];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 pb-4 pt-5 md:px-7">
        <div>
          <Link href="/usuarios" className="mb-3 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary"><ArrowLeft className="size-3.5" />Usuários</Link>
          <h1 data-testid="text-usuario-contato" className="font-display text-3xl font-bold">{u.contato}</h1>
          <div className="font-mono text-[11px] text-muted-foreground">desde {fmtData(u.criadoEm)}{u.proximaFaixa ? ` · próxima faixa: ${u.proximaFaixa}` : ""}</div>
        </div>
        <RankingBadge faixa={u.faixa} size="lg" />
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 pt-5 md:grid-cols-5 md:px-7">
        <Kpi label="Saldo" value={fmtNum(u.saldoPontos)} sub="pontos" tone="signal" />
        <Kpi label="Check-ins" value={fmtNum(u.checkins)} delay={40} />
        <Kpi label="Resgates" value={fmtNum(u.resgates)} delay={80} />
        <Kpi label="Denúncias" value={fmtNum(u.denuncias)} delay={120} />
        <Kpi label="Verdadeiras" value={fmtNum(u.denunciasVerdadeiras)} tone="ok" delay={160} />
      </div>
      <div className="px-5 py-5 md:px-7">
        <div className="overflow-hidden rounded-md border border-card-border bg-card">
          <div className="flex overflow-x-auto border-b border-border">
            {tabs.map(([k, l, n]) => (
              <button key={k} data-testid={`tab-${k}`} onClick={() => setTab(k)} className={cn("whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-semibold transition", tab === k ? "border-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{l} <span className="font-mono text-[11px] text-muted-foreground">{n}</span></button>
            ))}
          </div>
          <div className="overflow-x-auto">
            {tab === "extrato" && (u.extrato.length === 0 ? <EmptyState title="Extrato vazio" /> : (
              <table className="data-table"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th className="text-right">Pontos</th></tr></thead><tbody>
                {u.extrato.map((t) => <tr key={t.id}><td className="font-mono text-[11.5px]">{fmtDataHora(t.criadoEm)}</td><td className="text-[12px]">{t.tipo}</td><td>{t.descricao ?? "-"}</td><td className={cn("text-right font-mono font-semibold tnum", t.pontos >= 0 ? "text-ok" : "text-alert")}>{t.pontos > 0 ? "+" : ""}{fmtNum(t.pontos)}</td></tr>)}
              </tbody></table>
            ))}
            {tab === "checkins" && <CheckinRows items={u.checkinsLista} showPosto showUsuario={false} />}
            {tab === "resgates" && (u.resgatesLista.length === 0 ? <EmptyState title="Nenhum resgate" /> : (
              <table className="data-table"><thead><tr><th>Data</th><th>Recompensa</th><th>Código</th><th>Status</th><th className="text-right">Custo</th></tr></thead><tbody>
                {u.resgatesLista.map((r) => <tr key={r.id}><td className="font-mono text-[11.5px]">{fmtDataHora(r.criadoEm)}</td><td>{r.recompensaNome ?? r.recompensaId}</td><td className="font-mono text-[12px]">{r.codigo}</td><td className="text-[12px]">{r.status}</td><td className="text-right font-mono tnum">{fmtNum(r.custoPontos)}</td></tr>)}
              </tbody></table>
            ))}
            {tab === "denuncias" && <DenunciaRows items={u.denunciasLista} />}
          </div>
        </div>
      </div>
    </div>
  );
}
