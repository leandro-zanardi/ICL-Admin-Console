import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDenunciaQueryKey, getListDenunciasQueryKey, getGetMapaQueryKey, getListRecallQueryKey, getGetAntifraudeResumoQueryKey, getGetPostoQueryKey,
  useDecidirDenuncia, useDefinirPrazoDenuncia, useGetDenuncia, useRegistrarAndamentoDenuncia, useRegistrarRetiradaDenuncia,
  type DenunciaDetalhe as TDetalhe, type NovoAndamentoStatus,
} from "@workspace/api-client-react";
import { ArrowLeft, CheckCircle2, Clock, FileText, Gavel, MapPin, MessageSquare, Paperclip, Undo2, XCircle } from "lucide-react";
import { Panel, Field, Indisponivel, SkeletonRows, ErrorState, Btn, TextArea, TextBox, SelectBox, EmptyState } from "@/components/kit";
import { CategoriaTag, DecisaoBadge, FaixaScoreBadge, PrazoBadge, RankingBadge, StatusBadge } from "@/components/badges";
import { DenunciaRows, CheckinRows } from "@/components/lists";
import { FAIXAS_SCORE, ORIGENS, fmtDataHora, fmtDist, labelOf } from "@/lib/format";
import { useSessao } from "@/lib/sessao";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const eventoIcon = { criada: FileText, andamento: MessageSquare, prazo: Clock, decisao: Gavel, retirada: Undo2 };

function useInvalidate(id: string) {
  const qc = useQueryClient();
  return (d?: TDetalhe) => {
    qc.invalidateQueries({ queryKey: getGetDenunciaQueryKey(id) });
    qc.invalidateQueries({ queryKey: getListDenunciasQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMapaQueryKey() });
    qc.invalidateQueries({ queryKey: getListRecallQueryKey() });
    qc.invalidateQueries({ queryKey: getGetAntifraudeResumoQueryKey() });
    if (d?.postoId) qc.invalidateQueries({ queryKey: getGetPostoQueryKey(d.postoId) });
  };
}

function errMsg(e: unknown) {
  const d = (e as { data?: { erro?: string } } | null)?.data;
  return d?.erro ?? (e as Error)?.message ?? "Erro inesperado";
}

export default function DenunciaDetalhe() {
  const { id = "" } = useParams<{ id: string }>();
  const { isMaster } = useSessao();
  const q = useGetDenuncia(id, { query: { enabled: !!id, queryKey: getGetDenunciaQueryKey(id) } });

  if (q.isLoading) return <div className="p-7"><SkeletonRows rows={10} /></div>;
  if (q.isError || !q.data) return <div className="p-7"><ErrorState onRetry={() => q.refetch()} message={(q.error as { status?: number } | null)?.status === 404 ? "Denúncia não encontrada ou fora do seu escopo." : undefined} /></div>;
  const d = q.data;
  const disp = d.disponibilidade;
  const encerrada = d.retirada || !!d.decisao;

  return (
    <div>
      <div className="border-b border-border px-5 pb-4 pt-5 md:px-7">
        <Link href="/denuncias" data-testid="link-voltar" className="mb-3 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary"><ArrowLeft className="size-3.5" />Denúncias</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[11px] text-muted-foreground">Protocolo</div>
            <h1 data-testid="text-protocolo" className="font-mono text-2xl font-semibold tracking-tight md:text-3xl">{d.protocolo}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={d.status} /><PrazoBadge estado={d.prazoEstado} /><DecisaoBadge decisao={d.decisao} /><CategoriaTag categoria={d.categoria} />
              {d.retirada && <span className="rounded border border-ok/30 bg-ok/10 px-1.5 text-[11px] font-medium text-ok">Retirada</span>}
            </div>
          </div>
          <div className="text-right">
            {d.postoId && <Link href={`/postos/${d.postoId}`} className="font-display text-lg font-bold hover:text-primary">{d.postoNome}</Link>}
            <div className="font-mono text-[11px] text-muted-foreground">{d.municipio ?? "-"} · criada {fmtDataHora(d.criadoEm)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-5 py-5 md:px-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Relato do consumidor" bodyClass="p-4">
            <p data-testid="text-descricao" className="whitespace-pre-wrap text-[14px] leading-relaxed">{d.descricao}</p>
            <div className="mt-4 border-t border-dashed border-border pt-3">
              <div className="mb-2 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground"><Paperclip className="size-3" />Anexos</div>
              {!disp.anexos ? <Indisponivel /> : d.anexos.length === 0 ? <span className="text-[12.5px] text-muted-foreground">Nenhum anexo enviado.</span> : (
                <ul className="flex flex-wrap gap-2">
                  {d.anexos.map((a, i) => (
                    <li key={i}>{a.url ? <a href={a.url} target="_blank" rel="noreferrer" data-testid={`link-anexo-${i}`} className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-[12px] hover:border-primary hover:text-primary"><Paperclip className="size-3" />{a.nome}</a> : <span className="inline-flex items-center gap-1.5 rounded border border-dashed border-border px-2 py-1 text-[12px] text-muted-foreground">{a.nome}</span>}</li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Localização" bodyClass="px-4 py-2">
              {!disp.localizacao ? <div className="py-2"><Indisponivel /></div> : (
                <dl>
                  <Field k="Usuário lat/lng" v={d.localizacaoUsuario ? <span className="font-mono">{d.localizacaoUsuario.lat.toFixed(5)}, {d.localizacaoUsuario.lng.toFixed(5)}</span> : "-"} />
                  <Field k="Distância ao posto" v={<span className={cn("font-mono", (d.distanciaPostoM ?? 0) > 2000 && "text-alert")}>{fmtDist(d.distanciaPostoM)}</span>} />
                  {d.localizacaoUsuario && <Field k="Mapa" v={<a className="inline-flex items-center gap-1 text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${d.localizacaoUsuario.lat}&mlon=${d.localizacaoUsuario.lng}#map=16/${d.localizacaoUsuario.lat}/${d.localizacaoUsuario.lng}`}><MapPin className="size-3" />Abrir</a>} />}
                </dl>
              )}
            </Panel>
            <Panel title="Evidência ANP do posto" aside={d.evidenciaAnp?.confirmaDenuncia ? <span className="rounded bg-primary px-1.5 font-mono text-[10px] font-semibold uppercase text-primary-foreground">confirma</span> : null} bodyClass="px-4 py-2">
              {!d.evidenciaAnp ? <p className="py-2 text-[12.5px] text-muted-foreground">Sem dados ANP para este posto.</p> : (
                <dl>
                  <Field k="Autuações 24m" v={d.evidenciaAnp.autuacoes24m ?? "-"} />
                  <Field k="Qualidade" v={d.evidenciaAnp.qualidadeConforme === null || d.evidenciaAnp.qualidadeConforme === undefined ? "-" : d.evidenciaAnp.qualidadeConforme ? "Conforme" : <span className="text-alert">Não conforme</span>} />
                  <Field k="Nota ANP" v={d.evidenciaAnp.notaAnp ?? "-"} />
                  <Field k="Irregularidades" v={d.evidenciaAnp.irregularidades} />
                  <Field k="Ensaios / amostras NC" v={`${d.evidenciaAnp.ensaiosNaoConformes} / ${d.evidenciaAnp.amostrasNaoConformes}`} />
                </dl>
              )}
            </Panel>
          </div>

          {isMaster && (d.score !== null && d.score !== undefined || d.fatores.length > 0) && (
            <Panel title="Score de veracidade" aside={<FaixaScoreBadge faixa={d.faixa} score={d.score} />} bodyClass="p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="font-display text-5xl font-extrabold tnum">{d.score ?? "-"}</div>
                <div className="flex-1">
                  <div className="relative h-2 overflow-hidden rounded-full bg-gradient-to-r from-alert via-warn to-ok">
                    <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground" style={{ left: `${Math.max(0, Math.min(100, d.score ?? 0))}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-muted-foreground">Faixa {labelOf(FAIXAS_SCORE, d.faixa)}. Soma transparente de fatores ponderados por regra, sem aprendizado de máquina.</p>
                </div>
              </div>
              <ul className="divide-y divide-border/70 rounded border border-border">
                {d.fatores.map((fa) => (
                  <li key={fa.chave} data-testid={`fator-${fa.chave}`} className="flex items-center gap-3 px-3 py-2">
                    <span className={cn("w-12 shrink-0 text-right font-mono text-[13px] font-semibold tnum", fa.neutro ? "text-muted-foreground" : fa.impacto > 0 ? "text-ok" : "text-alert")}>{fa.neutro ? "0" : fa.impacto > 0 ? `+${fa.impacto}` : fa.impacto}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium">{fa.nome}</span><span className="text-[11.5px] text-muted-foreground">{fa.detalhe}</span></span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {isMaster && d.denunciante !== null && d.denunciante !== undefined && (
            <Panel title="Denunciante" aside={<RankingBadge faixa={d.denunciante.faixaRanking} />} bodyClass="p-0">
              {!disp.denunciante ? <div className="p-4"><Indisponivel /></div> : (
                <>
                  <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-5">
                    {[["Identificação", d.denunciante.tipo === "usuario" && d.denunciante.id ? <Link href={`/usuarios/${d.denunciante.id}`} className="text-primary hover:underline">{d.denunciante.rotulo}</Link> : d.denunciante.rotulo], ["Contato", d.denunciante.contato ?? "-"], ["Denúncias", d.denunciante.totalDenuncias], ["Procedentes", d.denunciante.procedentes], ["Improcedentes", d.denunciante.improcedentes]].map(([k, v], i) => (
                      <div key={i} className="bg-card px-3 py-2"><div className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">{k as string}</div><div className="truncate text-[13px] font-semibold">{v}</div></div>
                    ))}
                  </div>
                  <div className="border-t border-border px-4 py-2 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">Histórico do denunciante</div>
                  <DenunciaRows items={d.historicoDenunciante} compact />
                  <div className="border-t border-border px-4 py-2 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">Check-ins do denunciante</div>
                  <div className="overflow-x-auto"><CheckinRows items={d.checkinsDenunciante} showPosto showUsuario={false} /></div>
                </>
              )}
            </Panel>
          )}
          {!isMaster && d.checkinsDenunciante.length > 0 && (
            <Panel title="Check-ins do cliente neste contexto"><div className="overflow-x-auto"><CheckinRows items={d.checkinsDenunciante} showPosto showUsuario={false} /></div></Panel>
          )}

          <Panel title="Linha do tempo" bodyClass="p-4">
            {d.linhaDoTempo.length === 0 ? <EmptyState title="Sem eventos" /> : (
              <ol className="relative ml-3 border-l border-border">
                {d.linhaDoTempo.map((e, i) => {
                  const I = eventoIcon[e.tipo] ?? FileText;
                  return (
                    <li key={i} className="rise relative pb-4 pl-6 last:pb-0" style={{ animationDelay: `${i * 40}ms` }}>
                      <span className={cn("absolute -left-[13px] top-0 grid size-6 place-items-center rounded-full border-2 border-card", e.tipo === "decisao" ? "bg-primary text-primary-foreground" : e.tipo === "retirada" ? "bg-ok text-white" : "bg-sidebar text-sidebar-foreground")}><I className="size-3" /></span>
                      <div className="flex flex-wrap items-baseline gap-x-2"><span className="text-[13px] font-semibold">{e.titulo}</span><span className="font-mono text-[10.5px] text-muted-foreground">{fmtDataHora(e.criadoEm)}{e.autor ? ` · ${e.autor}` : ""}</span></div>
                      {e.mensagem && <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] text-foreground/80">{e.mensagem}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Prazo" bodyClass="px-4 py-3">
            <dl>
              <Field k="Estado" v={<PrazoBadge estado={d.prazoEstado} />} />
              <Field k="Vence em" v={<span className="font-mono">{fmtDataHora(d.prazoEm)}</span>} />
            </dl>
            {isMaster && !encerrada && <PrazoForm id={d.id} />}
          </Panel>

          {(d.decisao || isMaster) && (
            <Panel title="Decisão" bodyClass="px-4 py-3">
              {d.decisao ? (
                <dl>
                  <Field k="Resultado" v={<DecisaoBadge decisao={d.decisao} />} />
                  <Field k="Por" v={d.decisaoPor ?? "-"} />
                  <Field k="Em" v={<span className="font-mono">{fmtDataHora(d.decisaoEm)}</span>} />
                  {d.decisaoObservacao && <p className="mt-2 rounded bg-muted px-2.5 py-2 text-[12.5px]">{d.decisaoObservacao}</p>}
                </dl>
              ) : <DecisaoForm id={d.id} />}
            </Panel>
          )}

          {!d.retirada && (
            <Panel title="Registrar andamento" bodyClass="px-4 py-3">
              {!disp.andamentosNoApp && <p className="mb-2 text-[11.5px] text-muted-foreground">O app atual pode não exibir andamentos ao cliente.</p>}
              <AndamentoForm id={d.id} isMaster={isMaster} />
            </Panel>
          )}

          <Panel title="Retirada / resolução" bodyClass="px-4 py-3">
            {d.retiradaInfo ? (
              <dl>
                <Field k="Origem" v={labelOf(ORIGENS, d.retiradaInfo.origem)} />
                <Field k="Em" v={<span className="font-mono">{fmtDataHora(d.retiradaInfo.retiradaEm)}</span>} />
                <Field k="Autor" v={d.retiradaInfo.autor ?? "-"} />
                {d.retiradaInfo.resolucao && <p className="mt-2 rounded bg-ok/10 px-2.5 py-2 text-[12.5px]">{d.retiradaInfo.resolucao}</p>}
              </dl>
            ) : <RetiradaForm id={d.id} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PrazoForm({ id }: { id: string }) {
  const [dias, setDias] = useState("7");
  const inv = useInvalidate(id);
  const { toast } = useToast();
  const m = useDefinirPrazoDenuncia({ mutation: { onSuccess: (d) => { inv(d); toast({ title: "Prazo definido" }); }, onError: (e) => toast({ title: "Falha ao definir prazo", description: errMsg(e), variant: "destructive" }) } });
  const n = Number(dias);
  return (
    <form className="mt-3 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); m.mutate({ id, data: { dias: n } }); }}>
      <TextBox data-testid="input-prazo-dias" label="Dias para o posto" type="number" min={1} max={90} value={dias} onChange={(e) => setDias(e.target.value)} className="w-28" />
      <Btn data-testid="button-definir-prazo" disabled={m.isPending || !(n >= 1 && n <= 90)}><Clock className="size-3.5" />{m.isPending ? "Salvando" : "Definir prazo"}</Btn>
    </form>
  );
}

function DecisaoForm({ id }: { id: string }) {
  const [obs, setObs] = useState("");
  const inv = useInvalidate(id);
  const { toast } = useToast();
  const m = useDecidirDenuncia({ mutation: { onSuccess: (d) => { inv(d); toast({ title: "Decisão registrada" }); }, onError: (e) => toast({ title: "Falha ao decidir", description: errMsg(e), variant: "destructive" }) } });
  return (
    <div className="flex flex-col gap-2">
      <TextArea data-testid="input-decisao-obs" label="Observação (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Fundamento da decisão" />
      <div className="grid grid-cols-2 gap-2">
        <Btn data-testid="button-procedente" disabled={m.isPending} onClick={() => m.mutate({ id, data: { decisao: "procedente", observacao: obs || null } })}><CheckCircle2 className="size-3.5" />Procedente</Btn>
        <Btn data-testid="button-improcedente" variant="dark" disabled={m.isPending} onClick={() => m.mutate({ id, data: { decisao: "improcedente", observacao: obs || null } })}><XCircle className="size-3.5" />Improcedente</Btn>
      </div>
    </div>
  );
}

function AndamentoForm({ id, isMaster }: { id: string; isMaster: boolean }) {
  const [status, setStatus] = useState<NovoAndamentoStatus>(isMaster ? "encaminhada" : "respondida");
  const [msg, setMsg] = useState("");
  const [orgao, setOrgao] = useState("");
  const inv = useInvalidate(id);
  const { toast } = useToast();
  const m = useRegistrarAndamentoDenuncia({ mutation: { onSuccess: (d) => { inv(d); setMsg(""); setOrgao(""); toast({ title: "Andamento registrado", description: "O cliente verá esta mensagem no app." }); }, onError: (e) => toast({ title: "Falha ao registrar", description: errMsg(e), variant: "destructive" }) } });
  const ok = msg.trim().length >= 3;
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); m.mutate({ id, data: { status, mensagem: msg.trim(), orgao: orgao || null } }); }}>
      <SelectBox testId="select-andamento-status" label="Novo status" value={status} onChange={(v) => setStatus(v as NovoAndamentoStatus)} options={[{ value: "encaminhada", label: "Encaminhada" }, { value: "respondida", label: "Respondida" }]} all={null} />
      {status === "encaminhada" && <TextBox data-testid="input-orgao" label="Órgão (opcional)" value={orgao} onChange={(e) => setOrgao(e.target.value)} placeholder="Ex.: ANP, Procon" />}
      <TextArea data-testid="input-andamento-msg" label="Mensagem ao cliente" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={2000} placeholder="O que foi feito até aqui" />
      <Btn data-testid="button-registrar-andamento" disabled={m.isPending || !ok}><MessageSquare className="size-3.5" />{m.isPending ? "Enviando" : "Registrar andamento"}</Btn>
    </form>
  );
}

function RetiradaForm({ id }: { id: string }) {
  const [res, setRes] = useState("");
  const inv = useInvalidate(id);
  const { toast } = useToast();
  const m = useRegistrarRetiradaDenuncia({ mutation: { onSuccess: (d) => { inv(d); toast({ title: "Resolução registrada" }); }, onError: (e) => toast({ title: "Falha ao registrar", description: errMsg(e), variant: "destructive" }) } });
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); m.mutate({ id, data: { resolucao: res.trim() } }); }}>
      <TextArea data-testid="input-resolucao" label="Como foi resolvido" value={res} onChange={(e) => setRes(e.target.value)} maxLength={2000} placeholder="Ex.: bomba aferida pelo Inmetro e lacrada" />
      <Btn data-testid="button-registrar-retirada" variant="outline" disabled={m.isPending || res.trim().length < 3}><Undo2 className="size-3.5" />Registrar resolução</Btn>
    </form>
  );
}
