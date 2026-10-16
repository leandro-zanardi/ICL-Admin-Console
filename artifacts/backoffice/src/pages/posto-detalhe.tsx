import { Link, useParams } from "wouter";
import { getGetPostoQueryKey, useGetPosto } from "@workspace/api-client-react";
import { ArrowLeft } from "lucide-react";
import { Panel, Field, Kpi, SkeletonRows, ErrorState } from "@/components/kit";
import { SeloIcl } from "@/components/badges";
import { DenunciaRows, CheckinRows } from "@/components/lists";
import { cnpjRaiz, fmtNum } from "@/lib/format";
import { PostoAmenidadesEditor } from "@/components/posto-amenidades-editor";
import { useSessao } from "@/lib/sessao";

export default function PostoDetalhe() {
  const { isMaster } = useSessao();
  const { id = "" } = useParams<{ id: string }>();
  const q = useGetPosto(id, { query: { enabled: !!id, queryKey: getGetPostoQueryKey(id) } });
  if (q.isLoading) return <div className="p-7"><SkeletonRows rows={10} /></div>;
  if (q.isError || !q.data) return <div className="p-7"><ErrorState onRetry={() => q.refetch()} /></div>;
  const p = q.data;
  const abertas = p.denunciasLista.filter((d) => d.prazoEstado !== "encerrado").length;
  const vencidas = p.denunciasLista.filter((d) => d.prazoEstado === "vencido").length;
  return (
    <div>
      <div className="border-b border-border bg-sidebar px-5 pb-5 pt-5 text-sidebar-foreground md:px-7">
        <Link href="/postos" className="mb-3 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-primary"><ArrowLeft className="size-3.5" />Postos</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-sidebar-foreground/50">{p.bandeira ?? "Bandeira branca"} · {p.municipio ?? "-"}{p.uf ? `/${p.uf}` : ""}</div>
            <h1 data-testid="text-posto-nome" className="font-display text-3xl font-bold">{p.nome}</h1>
            <div className="text-[12.5px] text-sidebar-foreground/60">{p.endereco ?? ""}</div>
          </div>
          <SeloIcl ativo={p.seloIcl} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 pt-5 md:grid-cols-4 md:px-7">
        <Kpi label="Denúncias" value={fmtNum(p.denuncias)} tone="signal" />
        <Kpi label="Em aberto" value={fmtNum(abertas)} delay={40} />
        <Kpi label="Vencidas" value={fmtNum(vencidas)} tone="alert" delay={80} />
        <Kpi label="Check-ins" value={fmtNum(p.checkins)} tone="ok" delay={120} />
      </div>
      <div className="grid gap-4 px-5 py-5 md:px-7 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Cadastro" bodyClass="px-4 py-2">
            <dl>
              <Field k="Razão social" v={p.razaoSocial ?? "-"} />
              <Field k="CNPJ" v={<span className="font-mono">{p.cnpj ?? "-"}</span>} />
              <Field k="CNPJ raiz" v={<span className="font-mono">{cnpjRaiz(p.cnpj) || "-"}</span>} />
              <Field k="Tier" v={p.tier ?? "-"} />
              <Field k="Score" v={p.score ?? "-"} />
              <Field k="Coordenadas" v={p.lat !== null && p.lat !== undefined && p.lng !== null && p.lng !== undefined ? <span className="font-mono text-[12px]">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span> : "-"} />
            </dl>
          </Panel>
          <Panel title="Dados ANP" aside={p.anp.confirmaDenuncia ? <span className="rounded bg-primary px-1.5 font-mono text-[10px] font-semibold uppercase text-primary-foreground">alerta</span> : null} bodyClass="px-4 py-2">
            <dl>
              <Field k="Nota ANP" v={p.anp.notaAnp ?? "-"} />
              <Field k="Autuações 24m" v={p.anp.autuacoes24m ?? "-"} />
              <Field k="Qualidade" v={p.anp.qualidadeConforme === null || p.anp.qualidadeConforme === undefined ? "-" : p.anp.qualidadeConforme ? "Conforme" : <span className="text-alert">Não conforme</span>} />
              <Field k="Irregularidades" v={p.anp.irregularidades} />
              <Field k="Ensaios NC" v={p.anp.ensaiosNaoConformes} />
              <Field k="Amostras NC" v={p.anp.amostrasNaoConformes} />
            </dl>
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title={`Denúncias · ${p.denunciasLista.length}`}><DenunciaRows items={p.denunciasLista} showPosto={false} /></Panel>
          <Panel title={`Check-ins · ${p.checkinsLista.length}`}><div className="overflow-x-auto"><CheckinRows items={p.checkinsLista} /></div></Panel>
        </div>
      </div>
      {isMaster && <div className="px-5 pb-6 md:px-7"><PostoAmenidadesEditor postoId={p.id} /></div>}
    </div>
  );
}
