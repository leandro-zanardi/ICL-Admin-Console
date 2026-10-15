import { useState } from "react";
import { useListSincronizacoesAnp } from "@workspace/api-client-react";
import { AlertTriangle, Database } from "lucide-react";
import { PageHeader, SkeletonRows, ErrorState, EmptyState, Pagination } from "@/components/kit";
import { fmtDataHora, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE = 20;

function duracao(a?: string | null, b?: string | null) {
  if (!a || !b) return "-";
  const s = (new Date(b).getTime() - new Date(a).getTime()) / 1000;
  return s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1).replace(".", ",")} h`;
}

export default function Anp() {
  const [page, setPage] = useState(1);
  const q = useListSincronizacoesAnp({ page, pageSize: PAGE });
  return (
    <div>
      <PageHeader code="10 / Gestão" title="Sincronização ANP" desc="Histórico somente leitura das coletas de dados públicos da ANP." />
      <div className="px-5 py-4 md:px-7">
        <div className="overflow-hidden rounded-md border border-card-border bg-card">
          {q.isLoading ? <SkeletonRows cols={7} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data?.items.length ? <EmptyState title="Nenhuma sincronização registrada" icon={<Database className="size-5" />} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Status</th><th>Início</th><th>Conclusão</th><th>Duração</th><th className="text-right">Lidos</th><th className="text-right">Atualizados</th><th className="text-right">Páginas</th><th className="text-right">Diverg. nota</th></tr></thead>
                  <tbody>
                    {q.data.items.map((s) => (
                      <tr key={s.id} data-testid={`row-sync-${s.id}`}>
                        <td><span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10.5px] uppercase", s.temErros ? "bg-alert/10 text-alert" : s.status.includes("conclu") || s.status === "ok" ? "bg-ok/10 text-ok" : "bg-muted")}>{s.temErros && <AlertTriangle className="size-3" />}{s.status}</span></td>
                        <td className="font-mono text-[11.5px]">{fmtDataHora(s.iniciadoEm)}</td>
                        <td className="font-mono text-[11.5px]">{fmtDataHora(s.concluidoEm)}</td>
                        <td className="font-mono text-[11.5px]">{duracao(s.iniciadoEm, s.concluidoEm)}</td>
                        <td className="text-right font-mono tnum">{fmtNum(s.postosLidos)}</td>
                        <td className="text-right font-mono tnum">{fmtNum(s.postosAtualizados)}</td>
                        <td className="text-right font-mono tnum">{fmtNum(s.paginasColetadas)}</td>
                        <td className={cn("text-right font-mono tnum", s.divergenciasNota > 0 && "text-primary")}>{fmtNum(s.divergenciasNota)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={PAGE} total={q.data.total} onPage={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
