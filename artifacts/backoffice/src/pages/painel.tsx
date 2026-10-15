import { useState } from "react";
import { useGetPainel } from "@workspace/api-client-react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, Kpi, SelectBox, ErrorState, SkeletonRows, EmptyState } from "@/components/kit";
import { fmtDiaCurto, fmtNum } from "@/lib/format";

const DIAS = [{ value: "7", label: "7 dias" }, { value: "30", label: "30 dias" }, { value: "90", label: "90 dias" }, { value: "365", label: "12 meses" }];

export default function Painel() {
  const [dias, setDias] = useState("30");
  const q = useGetPainel({ dias: Number(dias) });
  const d = q.data;
  return (
    <div>
      <PageHeader code="08 / Gestão" title="Painel" desc="Uso do app e saúde da fila de denúncias." actions={<SelectBox testId="select-dias" value={dias} onChange={setDias} options={DIAS} all={null} />} />
      {q.isError ? <div className="p-7"><ErrorState onRetry={() => q.refetch()} /></div> : (
        <>
          <div className="grid grid-cols-2 gap-3 px-5 pt-5 md:grid-cols-3 md:px-7 xl:grid-cols-6">
            <Kpi label="Usuários" value={q.isLoading ? "..." : fmtNum(d?.usuarios)} />
            <Kpi label="Check-ins" value={q.isLoading ? "..." : fmtNum(d?.checkins)} delay={40} />
            <Kpi label="Denúncias abertas" value={q.isLoading ? "..." : fmtNum(d?.denunciasAbertas)} sub={d ? `de ${fmtNum(d.denunciasTotal)} no total` : undefined} tone="signal" delay={80} />
            <Kpi label="Vencidas" value={q.isLoading ? "..." : fmtNum(d?.denunciasVencidas)} tone="alert" delay={120} />
            <Kpi label="Resgates" value={q.isLoading ? "..." : fmtNum(d?.resgates)} delay={160} />
            <Kpi label="Postos com selo" value={q.isLoading ? "..." : fmtNum(d?.postosComSelo)} sub={d ? `${d.postosTotal ? ((d.postosComSelo / d.postosTotal) * 100).toFixed(1).replace(".", ",") : 0}% de ${fmtNum(d.postosTotal)}` : undefined} tone="ok" delay={200} />
          </div>
          <div className="px-5 py-5 md:px-7">
            <Panel title="Uso diário" bodyClass="p-4">
              {q.isLoading ? <SkeletonRows rows={6} /> : !d?.usoDiario.length ? <EmptyState title="Sem dados no período" /> : (
                <div className="h-[340px]" data-testid="chart-uso">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={d.usoDiario} margin={{ left: -16, right: 8, top: 8 }}>
                      <defs>
                        {[["c", "var(--color-chart-2)"], ["d", "var(--color-chart-1)"], ["b", "var(--color-chart-3)"]].map(([k, c]) => (
                          <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={0.35} /><stop offset="100%" stopColor={c} stopOpacity={0} /></linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="dia" tickFormatter={fmtDiaCurto} tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip labelFormatter={(l) => fmtDiaCurto(String(l))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="buscas" name="Buscas" stroke="var(--color-chart-3)" fill="url(#gb)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="checkins" name="Check-ins" stroke="var(--color-chart-2)" fill="url(#gc)" strokeWidth={2} />
                      <Area type="monotone" dataKey="denuncias" name="Denúncias" stroke="var(--color-chart-1)" fill="url(#gd)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
