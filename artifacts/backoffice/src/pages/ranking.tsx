import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetConfiguracaoRankingQueryKey, getGetRankingQueryKey, getListUsuariosQueryKey, useAtualizarConfiguracaoRanking, useGetConfiguracaoRanking, useGetRanking, type FaixaRanking } from "@workspace/api-client-react";
import { Trophy } from "lucide-react";
import { PageHeader, Panel, SelectBox, SkeletonRows, ErrorState, EmptyState, Pagination, Btn, TextBox } from "@/components/kit";
import { RankingBadge } from "@/components/badges";
import { FAIXAS_RANKING, opts } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PAGE = 20;

export default function Ranking() {
  const [faixa, setFaixa] = useState("");
  const [page, setPage] = useState(1);
  const q = useGetRanking({ faixa: faixa ? (faixa as FaixaRanking) : undefined, page, pageSize: PAGE });
  return (
    <div>
      <PageHeader code="06 / Comunidade" title="Ranking de denunciantes" desc="Ordenado por denúncias verdadeiras (procedentes). As faixas premiam quem denuncia com responsabilidade." actions={<SelectBox testId="select-faixa" value={faixa} onChange={(v) => { setFaixa(v); setPage(1); }} options={opts(FAIXAS_RANKING)} all="Todas as faixas" />} />
      <div className="grid gap-4 px-5 py-5 md:px-7 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Classificação">
          {q.isLoading ? <SkeletonRows cols={4} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data?.items.length ? <EmptyState title="Ninguém nesta faixa" icon={<Trophy className="size-5" />} /> : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th className="w-14">Pos.</th><th>Denunciante</th><th>Faixa</th><th className="text-right">Verdadeiras</th><th className="text-right">Total</th><th className="text-right">Taxa</th></tr></thead>
                  <tbody>
                    {q.data.items.map((r, i) => (
                      <tr key={r.tipo + r.id} data-testid={`row-ranking-${r.id}`} className="rise" style={{ animationDelay: `${i * 16}ms` }}>
                        <td><span className={cn("font-display text-lg font-extrabold tnum", r.posicao <= 3 ? "text-primary" : "text-foreground/40")}>{String(r.posicao).padStart(2, "0")}</span></td>
                        <td>{r.tipo === "usuario" ? <Link href={`/usuarios/${r.id}`} className="font-medium hover:text-primary">{r.rotulo}</Link> : <span className="font-medium">{r.rotulo}</span>}<div className="font-mono text-[10px] uppercase text-muted-foreground">{r.tipo}</div></td>
                        <td><RankingBadge faixa={r.faixa} /></td>
                        <td className="text-right font-mono font-semibold tnum">{r.denunciasVerdadeiras}</td>
                        <td className="text-right font-mono tnum">{r.totalDenuncias}</td>
                        <td className="text-right font-mono text-[12px] tnum">{r.totalDenuncias ? `${((r.denunciasVerdadeiras / r.totalDenuncias) * 100).toFixed(1).replace(".", ",")}%` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={PAGE} total={q.data.total} onPage={setPage} />
            </>
          )}
        </Panel>
        <ConfigFaixas />
      </div>
    </div>
  );
}

function ConfigFaixas() {
  const q = useGetConfiguracaoRanking();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [v, setV] = useState({ bronze: "", prata: "", ouro: "" });
  useEffect(() => { if (q.data) setV({ bronze: String(q.data.bronze), prata: String(q.data.prata), ouro: String(q.data.ouro) }); }, [q.data]);
  const m = useAtualizarConfiguracaoRanking({ mutation: {
    onSuccess: () => { qc.invalidateQueries({ queryKey: getGetConfiguracaoRankingQueryKey() }); qc.invalidateQueries({ queryKey: getGetRankingQueryKey() }); qc.invalidateQueries({ queryKey: getListUsuariosQueryKey() }); toast({ title: "Faixas atualizadas" }); },
    onError: () => toast({ title: "Falha ao salvar faixas", variant: "destructive" }),
  } });
  const b = Number(v.bronze), p = Number(v.prata), o = Number(v.ouro);
  const valido = b >= 1 && p > b && o > p;
  return (
    <Panel title="Faixas do ranking" bodyClass="p-4">
      {q.isLoading ? <SkeletonRows rows={3} cols={2} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : (
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); m.mutate({ data: { bronze: b, prata: p, ouro: o } }); }}>
          <p className="text-[12px] text-muted-foreground">Mínimo de denúncias verdadeiras para entrar em cada faixa.</p>
          {(["ouro", "prata", "bronze"] as const).map((k) => (
            <div key={k} className="flex items-center gap-3">
              <div className="w-20"><RankingBadge faixa={k} /></div>
              <TextBox data-testid={`input-faixa-${k}`} type="number" min={1} value={v[k]} onChange={(e) => setV((s) => ({ ...s, [k]: e.target.value }))} className="flex-1" />
            </div>
          ))}
          {!valido && <p className="text-[11.5px] text-alert">Use bronze menor que prata, e prata menor que ouro.</p>}
          <Btn data-testid="button-salvar-faixas" disabled={!valido || m.isPending}>{m.isPending ? "Salvando" : "Salvar faixas"}</Btn>
        </form>
      )}
    </Panel>
  );
}
