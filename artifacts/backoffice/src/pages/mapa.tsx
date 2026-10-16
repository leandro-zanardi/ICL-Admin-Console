import { useMemo, useState } from "react";
import { Link } from "wouter";
import { getGetPostoQueryKey, useGetMapa, useGetPosto } from "@workspace/api-client-react";
import { ArrowUpRight, Layers, Search, X } from "lucide-react";
import { HeatMap } from "@/components/heat-map";
import { SelectBox, ErrorState, SkeletonRows, Field } from "@/components/kit";
import { SeloIcl } from "@/components/badges";
import { DenunciaRows, CheckinRows } from "@/components/lists";
import { CATEGORIAS, STATUS, fmtNum, opts } from "@/lib/format";
import { buscarPins, criarParametrosMapa, obterEstadoPostoSelecionado, selecionarResultadoBusca } from "@/lib/map-search";
import { cn } from "@/lib/utils";

const DIAS = [{ value: "7", label: "7 dias" }, { value: "30", label: "30 dias" }, { value: "90", label: "90 dias" }, { value: "180", label: "180 dias" }, { value: "365", label: "12 meses" }];

export default function Mapa() {
  const [dias, setDias] = useState("30");
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [focusVersion, setFocusVersion] = useState(0);
  const [tab, setTab] = useState<"denuncias" | "checkins">("denuncias");
  const params = useMemo(() => criarParametrosMapa({ dias, categoria, status }), [dias, categoria, status]);
  const q = useGetMapa(params);
  const estadoPostoSelecionado = obterEstadoPostoSelecionado(sel);
  const posto = useGetPosto(estadoPostoSelecionado.id, { query: { enabled: estadoPostoSelecionado.aberto, queryKey: getGetPostoQueryKey(estadoPostoSelecionado.id) } });
  const pins = useMemo(() => q.data?.pins ?? [], [q.data]);
  const calor = useMemo(() => q.data?.calor ?? [], [q.data]);
  const resultados = useMemo(() => buscarPins(pins, busca), [busca, pins]);
  const pin = pins.find((p) => p.postoId === estadoPostoSelecionado.id);

  return (
    <div className="relative h-[calc(100dvh-49px)] md:h-[100dvh]">
      <HeatMap pins={pins} calor={calor} selectedId={sel} focusVersion={focusVersion} onSelect={(id) => { setSel(id); setTab("denuncias"); }} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col gap-2 p-3 md:p-4">
        <div className="pointer-events-auto flex flex-wrap items-end gap-2.5 self-start rounded-md border border-card-border bg-card/95 p-3 shadow-lg backdrop-blur">
          <div className="mr-2">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"><span className="size-2 bg-primary" />01 / Mapa</div>
            <h1 className="font-display text-xl font-bold leading-tight">Postos cadastrados e denúncias</h1>
          </div>
          <SelectBox testId="select-dias" label="Período" value={dias} onChange={setDias} options={DIAS} all={null} />
          <SelectBox testId="select-categoria" label="Categoria" value={categoria} onChange={setCategoria} options={opts(CATEGORIAS)} all="Todas" />
          <SelectBox testId="select-status" label="Status" value={status} onChange={setStatus} options={opts(STATUS)} />
          <div className="relative w-full min-w-[220px] max-w-[320px]">
            <label htmlFor="input-busca-posto" className="mb-1 block text-[10px] font-medium text-muted-foreground">Encontrar posto</label>
            <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2.5 focus-within:ring-1 focus-within:ring-ring">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                id="input-busca-posto"
                data-testid="input-busca-posto"
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Nome, CNPJ ou município"
                autoComplete="off"
                aria-label="Buscar posto por nome, CNPJ ou município"
                className="h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
              />
            </div>
            {!!busca.trim() && (
              <ul data-testid="list-resultados-busca-posto" className="absolute inset-x-0 top-full z-[800] mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-xl">
                {resultados.length ? resultados.map((resultado) => (
                  <li key={resultado.postoId}>
                    <button
                      type="button"
                      data-testid={`button-resultado-posto-${resultado.postoId}`}
                      onClick={() => {
                        const selection = selecionarResultadoBusca(resultado.postoId, focusVersion);
                        setSel(selection.sel);
                        setTab(selection.tab);
                        setFocusVersion(selection.focusVersion);
                        setBusca(selection.busca);
                      }}
                      className="w-full rounded px-2.5 py-2 text-left transition hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none"
                    >
                      <span className="block truncate text-[13px] font-semibold">{resultado.nome}</span>
                      <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
                        {resultado.cnpj ?? "Sem CNPJ"} · {resultado.municipio ?? "Município não informado"}
                      </span>
                    </button>
                  </li>
                )) : (
                  <li data-testid="text-busca-posto-sem-resultados" className="px-2.5 py-2 text-[12px] text-muted-foreground">
                    Nenhum posto encontrado neste mapa.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
        <div className="pointer-events-auto flex gap-2 self-start">
          {[["Denúncias", q.data?.totalDenuncias], ["Check-ins", q.data?.totalCheckins], ["Postos cadastrados", q.data?.totalPostos]].map(([k, v]) => (
            <div key={k as string} className="rounded border border-sidebar-border bg-sidebar/95 px-3 py-1.5 text-sidebar-foreground shadow">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-sidebar-foreground/50">{k}</div>
              <div data-testid={`stat-mapa-${k}`} className="font-display text-lg font-bold leading-none tnum">{q.isLoading ? "..." : fmtNum(v as number | undefined)}</div>
            </div>
          ))}
        </div>
        {!!q.data?.postosSemCoordenadas && (
          <div className="pointer-events-auto self-start rounded border border-amber-500/40 bg-card/95 px-3 py-1.5 text-[11px] text-foreground shadow">
            {fmtNum(q.data.postosSemCoordenadas)} posto(s) sem latitude/longitude não podem ser posicionados no mapa.
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] hidden rounded border border-card-border bg-card/95 px-3 py-2 text-[11px] shadow md:block">
        <div className="mb-1 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground"><Layers className="size-3" />Legenda</div>
        {[["#c4162a", "Com prazo vencido"], ["#f0640c", "Com denúncias abertas"], ["#1f7a5a", "Selo ICL, sem pendências"], ["#0f2230", "Sem pendências"]].map(([c, l]) => (
          <div key={l} className="flex items-center gap-2"><span className="size-2.5 rounded-full border border-white" style={{ background: c }} />{l}</div>
        ))}
      </div>

      {q.isError && (
        <div className="absolute inset-0 z-[600] grid place-items-center bg-background/70 backdrop-blur-sm">
          <div className="rounded-md border border-border bg-card"><ErrorState onRetry={() => q.refetch()} message="Não foi possível carregar o mapa." /></div>
        </div>
      )}
      {!q.isLoading && !q.isError && pins.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[400] grid place-items-center">
          <div className="rounded-md border border-dashed border-foreground/30 bg-card/95 px-5 py-4 text-center shadow">
            <p className="font-display font-semibold">
              {q.data?.totalPostos ? "Os postos cadastrados estão sem coordenadas" : "Nenhum posto cadastrado disponível"}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {q.data?.totalPostos ? "Adicione latitude e longitude ao cadastro para posicioná-los no mapa." : "Não há postos para exibir neste escopo."}
            </p>
          </div>
        </div>
      )}

      <aside className={cn("absolute inset-y-0 right-0 z-[700] flex w-full max-w-[420px] flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out", estadoPostoSelecionado.aberto ? "translate-x-0" : "translate-x-full")}>
        {estadoPostoSelecionado.aberto && (
          <>
            <div className="flex items-start justify-between gap-2 border-b border-border bg-sidebar px-4 py-3 text-sidebar-foreground">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/50">{pin?.bandeira ?? "Bandeira branca"} · {pin?.municipio ?? posto.data?.municipio ?? "-"}</div>
                <h2 data-testid="text-posto-nome" className="truncate font-display text-lg font-bold">{posto.data?.nome ?? pin?.nome ?? "Carregando"}</h2>
              </div>
              <button data-testid="button-close-posto" onClick={() => setSel(null)} className="grid size-8 place-items-center rounded hover:bg-sidebar-accent"><X className="size-4" /></button>
            </div>
            {posto.isLoading && <SkeletonRows rows={6} cols={3} />}
            {posto.isError && <ErrorState onRetry={() => posto.refetch()} />}
            {posto.data && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="grid grid-cols-4 border-b border-border">
                  {[["Total", pin?.denuncias ?? posto.data.denuncias], ["Abertas", pin?.abertas], ["Vencidas", pin?.vencidas], ["Check-ins", pin?.checkins ?? posto.data.checkins]].map(([k, v], i) => (
                    <div key={k as string} className={cn("px-3 py-2", i && "border-l border-border")}>
                      <div className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">{k}</div>
                      <div className={cn("font-display text-xl font-bold tnum", k === "Vencidas" && Number(v) > 0 && "text-alert")}>{fmtNum(v as number | undefined)}</div>
                    </div>
                  ))}
                </div>
                <dl className="border-b border-border px-4 py-2">
                  <Field k="CNPJ" v={<span className="font-mono">{posto.data.cnpj ?? "-"}</span>} />
                  <Field k="Selo" v={<SeloIcl ativo={posto.data.seloIcl} />} />
                  <Field k="Nota ANP" v={posto.data.anp.notaAnp ?? "-"} />
                </dl>
                <div className="flex border-b border-border">
                  {(["denuncias", "checkins"] as const).map((t) => (
                    <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)} className={cn("flex-1 border-b-2 py-2 text-[12.5px] font-semibold transition", tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                      {t === "denuncias" ? `Denúncias (${posto.data.denunciasLista.length})` : `Check-ins (${posto.data.checkinsLista.length})`}
                    </button>
                  ))}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {tab === "denuncias" ? <DenunciaRows items={posto.data.denunciasLista} showPosto={false} /> : <CheckinRows items={posto.data.checkinsLista} />}
                </div>
                <Link href={`/postos/${estadoPostoSelecionado.id}`} data-testid="link-posto-detalhe" className="flex items-center justify-center gap-1.5 border-t border-border bg-card py-3 text-[13px] font-semibold text-primary transition hover:bg-primary/5">Abrir ficha do posto <ArrowUpRight className="size-4" /></Link>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
