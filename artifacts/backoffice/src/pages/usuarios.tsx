import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListUsuarios, type FaixaRanking } from "@workspace/api-client-react";
import { Users } from "lucide-react";
import { PageHeader, FilterBar, TextBox, SelectBox, SkeletonRows, ErrorState, EmptyState, Pagination } from "@/components/kit";
import { RankingBadge } from "@/components/badges";
import { FAIXAS_RANKING, fmtData, fmtNum, opts } from "@/lib/format";

const PAGE = 20;

export default function Usuarios() {
  const [busca, setBusca] = useState("");
  const [faixa, setFaixa] = useState("");
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ busca: busca || undefined, faixa: faixa ? (faixa as FaixaRanking) : undefined, page, pageSize: PAGE }), [busca, faixa, page]);
  const q = useListUsuarios(params);
  return (
    <div>
      <PageHeader code="05 / Comunidade" title="Usuários" desc="Consumidores do app: pontos, check-ins, resgates e denúncias." />
      <FilterBar>
        <TextBox data-testid="input-busca" label="Busca" value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} placeholder="Telefone ou e-mail" className="min-w-[240px] flex-1" />
        <SelectBox testId="select-faixa" label="Ranking" value={faixa} onChange={(v) => { setFaixa(v); setPage(1); }} options={opts(FAIXAS_RANKING)} all="Todas" />
      </FilterBar>
      <div className="px-5 py-4 md:px-7">
        <div className="overflow-hidden rounded-md border border-card-border bg-card">
          {q.isLoading ? <SkeletonRows cols={7} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data?.items.length ? <EmptyState title="Nenhum usuário encontrado" icon={<Users className="size-5" />} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Contato</th><th>Ranking</th><th className="text-right">Saldo</th><th className="text-right">Check-ins</th><th className="text-right">Resgates</th><th className="text-right">Denúncias</th><th className="text-right">Verdadeiras</th><th>Desde</th></tr></thead>
                  <tbody>
                    {q.data.items.map((u, i) => (
                      <tr key={u.id} data-testid={`row-usuario-${u.id}`} className="rise" style={{ animationDelay: `${i * 16}ms` }}>
                        <td><Link href={`/usuarios/${u.id}`} data-testid={`link-usuario-${u.id}`} className="font-medium hover:text-primary hover:underline">{u.contato}</Link></td>
                        <td><RankingBadge faixa={u.faixa} /></td>
                        <td className="text-right font-mono font-semibold tnum">{fmtNum(u.saldoPontos)}</td>
                        <td className="text-right font-mono tnum">{fmtNum(u.checkins)}</td>
                        <td className="text-right font-mono tnum">{fmtNum(u.resgates)}</td>
                        <td className="text-right font-mono tnum">{fmtNum(u.denuncias)}</td>
                        <td className="text-right font-mono tnum">{fmtNum(u.denunciasVerdadeiras)}</td>
                        <td className="font-mono text-[11px] text-muted-foreground">{fmtData(u.criadoEm)}</td>
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
