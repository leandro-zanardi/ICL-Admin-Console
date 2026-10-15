import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListDenuncias, type FaixaScore, type ListDenunciasDecisao, type PrazoEstado } from "@workspace/api-client-react";
import { Search, X } from "lucide-react";
import { PageHeader, FilterBar, SelectBox, TextBox, SkeletonRows, ErrorState, EmptyState, Pagination, Btn } from "@/components/kit";
import { CategoriaTag, DecisaoBadge, FaixaScoreBadge, PrazoBadge, StatusBadge, prazoBar } from "@/components/badges";
import { CATEGORIAS, DECISOES, FAIXAS_SCORE, PRAZOS, STATUS, fmtData, fmtDataHora, opts } from "@/lib/format";
import { useSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";

const PAGE = 20;

export default function Denuncias() {
  const { isMaster } = useSessao();
  const [busca, setBusca] = useState("");
  const [f, setF] = useState({ status: "", categoria: "", municipio: "", faixaScore: "", prazo: "", decisao: "" });
  const [page, setPage] = useState(1);
  const set = (k: keyof typeof f) => (v: string) => { setF((o) => ({ ...o, [k]: v })); setPage(1); };
  const params = useMemo(() => ({
    busca: busca || undefined, status: f.status || undefined, categoria: f.categoria || undefined, municipio: f.municipio || undefined,
    faixaScore: isMaster && f.faixaScore ? (f.faixaScore as FaixaScore) : undefined,
    prazo: f.prazo ? (f.prazo as PrazoEstado) : undefined, decisao: f.decisao ? (f.decisao as ListDenunciasDecisao) : undefined,
    page, pageSize: PAGE,
  }), [busca, f, page, isMaster]);
  const q = useListDenuncias(params);
  const ativos = Object.values(f).filter(Boolean).length + (busca ? 1 : 0);

  return (
    <div>
      <PageHeader code="02 / Denúncias" title="Denúncias" desc="Fila de denúncias dos consumidores. A barra lateral de cada linha indica o estado do prazo." />
      <FilterBar>
        <label className="relative flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Busca</span>
          <Search className="absolute bottom-2 left-2.5 size-3.5 text-muted-foreground" />
          <input data-testid="input-busca" value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} placeholder="Protocolo, posto ou texto" className="h-8 rounded border border-input bg-card pl-8 pr-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </label>
        <SelectBox testId="select-status" label="Status" value={f.status} onChange={set("status")} options={opts(STATUS)} />
        <SelectBox testId="select-categoria" label="Categoria" value={f.categoria} onChange={set("categoria")} options={opts(CATEGORIAS)} all="Todas" />
        <TextBox data-testid="input-municipio" label="Município" value={f.municipio} onChange={(e) => set("municipio")(e.target.value)} placeholder="Ex.: Belo Horizonte" className="w-40" />
        {isMaster && <SelectBox testId="select-faixa" label="Faixa score" value={f.faixaScore} onChange={set("faixaScore")} options={opts(FAIXAS_SCORE)} all="Todas" />}
        <SelectBox testId="select-prazo" label="Prazo" value={f.prazo} onChange={set("prazo")} options={opts(PRAZOS)} />
        <SelectBox testId="select-decisao" label="Decisão" value={f.decisao} onChange={set("decisao")} options={opts(DECISOES)} all="Todas" />
        {ativos > 0 && <Btn data-testid="button-limpar" variant="ghost" onClick={() => { setBusca(""); setF({ status: "", categoria: "", municipio: "", faixaScore: "", prazo: "", decisao: "" }); setPage(1); }}><X className="size-3.5" />Limpar ({ativos})</Btn>}
      </FilterBar>
      <div className="px-5 py-4 md:px-7">
        <div className="overflow-hidden rounded-md border border-card-border bg-card">
          {q.isLoading ? <SkeletonRows cols={6} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data?.items.length ? (
            <EmptyState title="Nenhuma denúncia encontrada" hint="Ajuste os filtros ou amplie a busca." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th className="w-1 p-0" /><th>Protocolo</th><th>Posto</th><th>Categoria</th><th>Status</th><th>Prazo</th>{isMaster && <th>Score</th>}<th>Decisão</th><th>Criada</th></tr></thead>
                  <tbody>
                    {q.data.items.map((d, i) => (
                      <tr key={d.id} data-testid={`row-denuncia-${d.id}`} className={cn("rise", d.prazoEstado === "vencido" && "bg-alert/[0.04]")} style={{ animationDelay: `${i * 16}ms` }}>
                        <td className="relative w-1 p-0"><span className={cn("absolute inset-y-0 left-0 w-[3px]", prazoBar[d.prazoEstado])} /></td>
                        <td><Link href={`/denuncias/${d.id}`} data-testid={`link-denuncia-${d.id}`} className="font-mono text-[12px] font-semibold hover:text-primary hover:underline">{d.protocolo}</Link><div className="line-clamp-1 max-w-[260px] text-[11.5px] text-muted-foreground">{d.descricaoResumo}</div></td>
                        <td>{d.postoId ? <Link href={`/postos/${d.postoId}`} className="hover:text-primary">{d.postoNome ?? "-"}</Link> : "-"}<div className="text-[11px] text-muted-foreground">{d.municipio ?? ""}</div></td>
                        <td><CategoriaTag categoria={d.categoria} /></td>
                        <td><StatusBadge status={d.status} />{d.retirada && <div className="mt-0.5 font-mono text-[10px] uppercase text-ok">retirada</div>}</td>
                        <td><PrazoBadge estado={d.prazoEstado} />{d.prazoEm && <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{fmtData(d.prazoEm)}</div>}</td>
                        {isMaster && <td><FaixaScoreBadge faixa={d.faixa} score={d.score} /></td>}
                        <td><DecisaoBadge decisao={d.decisao} /></td>
                        <td className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">{fmtDataHora(d.criadoEm)}</td>
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
