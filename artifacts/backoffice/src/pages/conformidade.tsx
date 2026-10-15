import { useState } from "react";
import { Link } from "wouter";
import { useGetAntifraudeResumo, useListAlertasCampanha, useListDenunciantesAtipicos, useListDenuncias, type FaixaScore } from "@workspace/api-client-react";
import { Radar, ShieldAlert, ShieldCheck, ShieldQuestion, Users } from "lucide-react";
import { PageHeader, Panel, Kpi, SkeletonRows, ErrorState, EmptyState, Pagination } from "@/components/kit";
import { DenunciaRows } from "@/components/lists";
import { fmtDataHora, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE = 20;

export default function Conformidade() {
  const r = useGetAntifraudeResumo();
  const [faixa, setFaixa] = useState<FaixaScore>("suspeita");
  const [pFila, setPFila] = useState(1);
  const [pAt, setPAt] = useState(1);
  const fila = useListDenuncias({ faixaScore: faixa, decisao: "pendente", page: pFila, pageSize: PAGE });
  const at = useListDenunciantesAtipicos({ page: pAt, pageSize: PAGE });
  const al = useListAlertasCampanha();

  return (
    <div>
      <PageHeader code="03 / Antifraude" title="Conformidade de Denúncias" desc="Triagem das denúncias com menor veracidade, denunciantes fora do padrão e possíveis campanhas coordenadas contra um posto." />
      <div className="grid grid-cols-2 gap-3 px-5 pt-5 md:grid-cols-3 md:px-7 xl:grid-cols-6">
        {r.isError ? <div className="col-span-full rounded-md border border-border bg-card"><ErrorState onRetry={() => r.refetch()} /></div> : (
          [["Suspeitas", r.data?.suspeitas, "alert"], ["Atenção", r.data?.atencao, "signal"], ["Confiáveis", r.data?.confiaveis, "ok"], ["Pendentes de decisão", r.data?.pendentesDeDecisao, "default"], ["Denunciantes atípicos", r.data?.denunciantesAtipicos, "default"], ["Alertas de campanha", r.data?.alertasCampanha, "alert"]].map(([k, v, t], i) => (
            <Kpi key={k as string} label={k as string} value={r.isLoading ? "..." : fmtNum(v as number)} tone={t as "alert"} delay={i * 40} />
          ))
        )}
      </div>

      <div className="mx-5 mt-4 grid gap-px overflow-hidden rounded-md border border-card-border bg-border md:mx-7 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="bg-sidebar p-4 text-sidebar-foreground">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-sidebar-primary">Como o score funciona</div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-sidebar-foreground/80">Cada denúncia recebe de 0 a 100 pontos pela soma de fatores ponderados e regras explícitas (distância ao posto, check-in prévio, histórico do denunciante, evidência ANP, rajadas de denúncias). Não é aprendizado de máquina: todo fator e seu impacto aparecem na ficha da denúncia.</p>
        </div>
        {[{ i: ShieldCheck, t: "Confiável", d: "Fatores convergem. Pode seguir o fluxo normal de prazo e resposta.", c: "text-ok" }, { i: ShieldQuestion, t: "Atenção", d: "Sinais mistos. Vale ler o relato e conferir o histórico antes de decidir.", c: "text-warn" }, { i: ShieldAlert, t: "Suspeita", d: "Vários fatores negativos. Revise antes de cobrar o posto.", c: "text-alert" }].map((b) => (
          <div key={b.t} className="bg-card p-4"><b.i className={cn("size-4", b.c)} /><div className="mt-1 font-display font-bold">{b.t}</div><p className="text-[12px] text-muted-foreground">{b.d}</p></div>
        ))}
      </div>

      <div className="grid gap-4 px-5 py-5 md:px-7 xl:grid-cols-2">
        <Panel title="Fila de revisão · decisão pendente" aside={
          <div className="flex rounded border border-border p-0.5">
            {(["suspeita", "atencao"] as const).map((f) => (
              <button key={f} data-testid={`tab-fila-${f}`} onClick={() => { setFaixa(f); setPFila(1); }} className={cn("rounded-[3px] px-2 py-0.5 text-[11.5px] font-semibold transition", faixa === f ? (f === "suspeita" ? "bg-alert text-white" : "bg-warn text-foreground") : "text-muted-foreground hover:text-foreground")}>{f === "suspeita" ? "Suspeitas" : "Atenção"}</button>
            ))}
          </div>
        }>
          {fila.isLoading ? <SkeletonRows rows={6} cols={3} /> : fila.isError ? <ErrorState onRetry={() => fila.refetch()} /> : (
            <>
              {fila.data?.items.length ? <DenunciaRows items={fila.data.items} /> : <EmptyState title="Fila limpa" hint="Nenhuma denúncia nesta faixa aguardando decisão." icon={<ShieldCheck className="size-5" />} />}
              {fila.data && fila.data.total > 0 && <Pagination page={pFila} pageSize={PAGE} total={fila.data.total} onPage={setPFila} />}
            </>
          )}
        </Panel>

        <Panel title="Possíveis campanhas coordenadas" aside={<Radar className="size-4 text-alert" />}>
          {al.isLoading ? <SkeletonRows rows={4} cols={3} /> : al.isError ? <ErrorState onRetry={() => al.refetch()} /> : !al.data?.length ? <EmptyState title="Nenhum alerta" hint="Não há concentração anormal de denúncias contra um mesmo posto." icon={<Radar className="size-5" />} /> : (
            <ul className="divide-y divide-border/70">
              {al.data.map((a, i) => (
                <li key={a.postoId + i} data-testid={`alerta-${a.postoId}`} className="rise px-4 py-3" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/postos/${a.postoId}`} className="font-display font-bold hover:text-primary">{a.postoNome ?? a.postoId}</Link>
                    <span className="rounded bg-alert/10 px-1.5 font-mono text-[11px] font-semibold text-alert">score médio {a.scoreMedio.toFixed(0)}</span>
                  </div>
                  <p className="text-[12.5px] text-foreground/80">{a.motivo}</p>
                  <div className="mt-1 font-mono text-[10.5px] text-muted-foreground">{a.totalDenuncias} denuncias · {a.denunciantesDistintos} denunciantes · janela {a.janelaHoras}h · {fmtDataHora(a.primeiraEm)} a {fmtDataHora(a.ultimaEm)}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">{a.denunciaIds.slice(0, 10).map((id, j) => <Link key={id} href={`/denuncias/${id}`} className="rounded border border-border px-1.5 font-mono text-[10.5px] hover:border-primary hover:text-primary">#{j + 1}</Link>)}</div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Denunciantes atípicos" aside={<Users className="size-4 text-muted-foreground" />} className="xl:col-span-2">
          {at.isLoading ? <SkeletonRows rows={5} cols={6} /> : at.isError ? <ErrorState onRetry={() => at.refetch()} /> : !at.data?.items.length ? <EmptyState title="Nenhum denunciante atípico" /> : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Denunciante</th><th className="text-right">Total</th><th className="text-right">30 dias</th><th className="text-right">Proc. / Improc.</th><th className="text-right">Postos</th><th className="text-right">Score médio</th><th>Motivos</th></tr></thead>
                  <tbody>
                    {at.data.items.map((u) => (
                      <tr key={u.tipo + u.id} data-testid={`row-atipico-${u.id}`}>
                        <td>{u.tipo === "usuario" ? <Link href={`/usuarios/${u.id}`} className="font-medium hover:text-primary">{u.rotulo}</Link> : <span className="font-medium">{u.rotulo}</span>}<div className="font-mono text-[10px] uppercase text-muted-foreground">{u.tipo}</div></td>
                        <td className="text-right font-mono tnum">{u.totalDenuncias}</td>
                        <td className="text-right font-mono tnum">{u.denunciasUltimos30d}</td>
                        <td className="text-right font-mono tnum">{u.procedentes} / {u.improcedentes}</td>
                        <td className="text-right font-mono tnum">{u.postosDistintos}</td>
                        <td className={cn("text-right font-mono tnum", u.scoreMedio < 40 && "text-alert")}>{u.scoreMedio.toFixed(0)}</td>
                        <td><div className="flex flex-wrap gap-1">{u.motivos.map((m) => <span key={m} className="rounded bg-muted px-1.5 text-[11px]">{m}</span>)}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pAt} pageSize={PAGE} total={at.data.total} onPage={setPAt} />
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
