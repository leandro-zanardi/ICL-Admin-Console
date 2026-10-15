import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListPostos } from "@workspace/api-client-react";
import { Building2 } from "lucide-react";
import { PageHeader, FilterBar, TextBox, SelectBox, SkeletonRows, ErrorState, EmptyState, Pagination } from "@/components/kit";
import { SeloIcl } from "@/components/badges";
import { fmtNum } from "@/lib/format";
import { useSessao } from "@/lib/sessao";

const PAGE = 20;

export default function Postos() {
  const { isMaster } = useSessao();
  const [busca, setBusca] = useState("");
  const [selo, setSelo] = useState("");
  const [page, setPage] = useState(1);
  const params = useMemo(() => ({ busca: busca || undefined, selo: selo === "" ? undefined : selo === "sim", page, pageSize: PAGE }), [busca, selo, page]);
  const q = useListPostos(params);
  return (
    <div>
      <PageHeader code="09 / Postos" title="Postos" desc={isMaster ? "Todos os postos monitorados." : "Postos dentro do seu escopo de acesso."} />
      <FilterBar>
        <TextBox data-testid="input-busca" label="Busca" value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} placeholder="Nome, CNPJ ou município" className="min-w-[240px] flex-1" />
        <SelectBox testId="select-selo" label="Selo ICL" value={selo} onChange={(v) => { setSelo(v); setPage(1); }} options={[{ value: "sim", label: "Com selo" }, { value: "nao", label: "Sem selo" }]} />
      </FilterBar>
      <div className="px-5 py-4 md:px-7">
        <div className="overflow-hidden rounded-md border border-card-border bg-card">
          {q.isLoading ? <SkeletonRows cols={6} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data?.items.length ? <EmptyState title="Nenhum posto encontrado" icon={<Building2 className="size-5" />} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Posto</th><th>CNPJ</th><th>Bandeira</th><th>Local</th><th>Selo</th><th className="text-right">Score</th><th className="text-right">Denúncias</th><th className="text-right">Check-ins</th></tr></thead>
                  <tbody>
                    {q.data.items.map((p, i) => (
                      <tr key={p.id} data-testid={`row-posto-${p.id}`} className="rise" style={{ animationDelay: `${i * 16}ms` }}>
                        <td><Link href={`/postos/${p.id}`} data-testid={`link-posto-${p.id}`} className="font-medium hover:text-primary hover:underline">{p.nome}</Link>{p.tier && <div className="font-mono text-[10px] uppercase text-muted-foreground">{p.tier}</div>}</td>
                        <td className="font-mono text-[11.5px]">{p.cnpj ?? "-"}</td>
                        <td className="text-[12.5px]">{p.bandeira ?? "-"}</td>
                        <td className="text-[12.5px]">{p.municipio ?? "-"}{p.uf ? `/${p.uf}` : ""}</td>
                        <td><SeloIcl ativo={p.seloIcl} /></td>
                        <td className="text-right font-mono tnum">{p.score ?? "-"}</td>
                        <td className="text-right font-mono tnum">{fmtNum(p.denuncias)}</td>
                        <td className="text-right font-mono tnum">{fmtNum(p.checkins)}</td>
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
