import { useState } from "react";
import { Link } from "wouter";
import { useListResgates } from "@workspace/api-client-react";
import { Ticket } from "lucide-react";
import { PageHeader, SkeletonRows, ErrorState, EmptyState, Pagination } from "@/components/kit";
import { fmtDataHora, fmtNum } from "@/lib/format";

const PAGE = 20;

export default function Resgates() {
  const [page, setPage] = useState(1);
  const q = useListResgates({ page, pageSize: PAGE });
  return (
    <div>
      <PageHeader code="12 / Comunidade" title="Resgates" desc="Trocas de pontos por recompensas feitas pelos consumidores." />
      <div className="px-5 py-4 md:px-7">
        <div className="overflow-hidden rounded-md border border-card-border bg-card">
          {q.isLoading ? <SkeletonRows cols={6} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data?.items.length ? <EmptyState title="Nenhum resgate" icon={<Ticket className="size-5" />} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Data</th><th>Usuário</th><th>Recompensa</th><th>Código</th><th>Status</th><th className="text-right">Custo</th></tr></thead>
                  <tbody>
                    {q.data.items.map((r, i) => (
                      <tr key={r.id} data-testid={`row-resgate-${r.id}`} className="rise" style={{ animationDelay: `${i * 16}ms` }}>
                        <td className="whitespace-nowrap font-mono text-[11.5px]">{fmtDataHora(r.criadoEm)}</td>
                        <td><Link href={`/usuarios/${r.usuarioId}`} className="hover:text-primary hover:underline">{r.usuarioContato ?? r.usuarioId}</Link></td>
                        <td>{r.recompensaNome ?? r.recompensaId}</td>
                        <td><span className="rounded border border-dashed border-border px-1.5 font-mono text-[12px]">{r.codigo}</span></td>
                        <td className="text-[12px]">{r.status}</td>
                        <td className="text-right font-mono font-semibold tnum">{fmtNum(r.custoPontos)}</td>
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
