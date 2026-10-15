import { useState } from "react";
import { Link } from "wouter";
import { useListRecall } from "@workspace/api-client-react";
import { RotateCcw } from "lucide-react";
import { PageHeader, SkeletonRows, ErrorState, EmptyState, Pagination } from "@/components/kit";
import { CategoriaTag } from "@/components/badges";
import { ORIGENS, fmtDataHora, fmtHoras, labelOf } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE = 20;

export default function Recall() {
  const [page, setPage] = useState(1);
  const q = useListRecall({ page, pageSize: PAGE });
  return (
    <div>
      <PageHeader code="04 / Recall" title="Recall" desc="Denúncias retiradas porque o posto resolveu o problema. É aqui que o bom atendimento fica registrado." />
      <div className="px-5 py-4 md:px-7">
        <div className="overflow-hidden rounded-md border border-card-border bg-card">
          {q.isLoading ? <SkeletonRows cols={6} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data?.items.length ? <EmptyState title="Nenhum recall ainda" hint="Quando um cliente retirar a denúncia após a resolução, ela aparece aqui." icon={<RotateCcw className="size-5" />} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Protocolo</th><th>Posto</th><th>Categoria</th><th>Resolução</th><th>Origem</th><th>Criada</th><th>Retirada</th><th className="text-right">Até resolver</th></tr></thead>
                  <tbody>
                    {q.data.items.map((r, i) => (
                      <tr key={r.denunciaId} data-testid={`row-recall-${r.denunciaId}`} className="rise" style={{ animationDelay: `${i * 16}ms` }}>
                        <td><Link href={`/denuncias/${r.denunciaId}`} className="font-mono text-[12px] font-semibold hover:text-primary hover:underline">{r.protocolo}</Link></td>
                        <td>{r.postoId ? <Link href={`/postos/${r.postoId}`} className="hover:text-primary">{r.postoNome ?? "-"}</Link> : "-"}</td>
                        <td><CategoriaTag categoria={r.categoria} /></td>
                        <td className="max-w-[320px]"><span className="line-clamp-2 text-[12.5px]">{r.resolucao ?? "-"}</span></td>
                        <td className="text-[12px]">{labelOf(ORIGENS, r.origem)}</td>
                        <td className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">{fmtDataHora(r.criadaEm)}</td>
                        <td className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">{fmtDataHora(r.retiradaEm)}</td>
                        <td className="text-right"><span className={cn("rounded px-1.5 py-0.5 font-mono text-[12px] font-semibold tnum", r.horasAteResolver <= 48 ? "bg-ok/10 text-ok" : r.horasAteResolver <= 168 ? "bg-warn/15" : "bg-alert/10 text-alert")}>{fmtHoras(r.horasAteResolver)}</span></td>
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
