import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetPostoAmenidadesQueryKey,
  useAtualizarPostoAmenidades,
  useGetPostoAmenidades,
  type PostoAmenidade,
} from "@workspace/api-client-react";
import { AlertTriangle, Check, Clock3, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Btn, ErrorState, Panel, SkeletonRows } from "@/components/kit";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  DIAS, horarioCompleto, horarioParaApi, hojeSaoPaulo, paraFormulario,
  valorHorarioFormulario, valorPublicavel,
  type DiaFormulario, type FormularioAmenidades, type HorarioFormulario,
} from "@/lib/posto-amenidades-form";

export function PostoAmenidadesEditor({ postoId }: { postoId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = getGetPostoAmenidadesQueryKey(postoId);
  const q = useGetPostoAmenidades(postoId, {
    query: { enabled: !!postoId, queryKey, staleTime: 60_000, refetchOnWindowFocus: false },
  });
  const form = useForm<FormularioAmenidades>({ defaultValues: { itens: [] } });
  const watchedItems = form.watch("itens");
  const groups = useMemo(() => {
    const byGroup = new Map<string, { field: PostoAmenidade; index: number }[]>();
    (q.data?.itens ?? []).forEach((field, index) => {
      const fields = byGroup.get(field.grupo) ?? [];
      fields.push({ field, index });
      byGroup.set(field.grupo, fields);
    });
    return [...byGroup.entries()];
  }, [q.data?.itens]);
  const save = useAtualizarPostoAmenidades({
    mutation: {
      onSuccess: (data) => {
        form.reset(paraFormulario(data.itens));
        queryClient.setQueryData(queryKey, data);
        queryClient.invalidateQueries({ queryKey });
        toast({ title: "Status e amenidades atualizados" });
      },
      onError: (error) => toast({
        title: "Não foi possível salvar as informações",
        description: error.data?.erro ?? "Tente novamente.",
        variant: "destructive",
      }),
    },
  });

  useEffect(() => {
    if (q.data && !form.formState.isDirty) form.reset(paraFormulario(q.data.itens));
  }, [q.data, form.formState.isDirty, form.reset]);

  if (q.isLoading) return <Panel title="Status e amenidades" bodyClass="p-4"><SkeletonRows rows={5} cols={3} /></Panel>;
  if (q.isError || !q.data) return <Panel title="Status e amenidades" bodyClass="p-4"><ErrorState onRetry={() => q.refetch()} /></Panel>;

  const hasInvalidSchedule = q.data.itens.some((item, index) => {
    return item.tipo === "horarios" && !horarioCompleto(watchedItems?.[index]?.valor);
  });
  const notVerifiedCount = q.data.itens.filter((item, index) => {
    const value = watchedItems?.[index]?.valor;
    return item.tipo === "horarios"
      ? !horarioParaApi(value)
      : item.tipo === "texto"
        ? typeof value !== "string" || !value.trim()
        : value === "nao_verificado";
  }).length;

  return (
    <Panel
      title="Status e amenidades"
      aside={
        <span data-testid="status-aberto-agora" className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          <Clock3 className="size-3" />
          {q.data.abertoAgora === null ? "Horário / fuso não verificado" : q.data.abertoAgora ? "Aberto agora" : "Fechado agora"}
        </span>
      }
      bodyClass="p-4"
    >
      <p className="mb-4 max-w-3xl text-[12.5px] text-muted-foreground">
        Registre o valor, a fonte e a data da verificação. A API do cliente recebe apenas informações autorizadas e com verificação em dia; a exibição no app depende da integração do ICL App.
      </p>
      {q.data.historicoBandeira.length > 0 && (
        <div data-testid="historico-bandeira" className="mb-4 rounded border border-border bg-muted/40 p-3">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock3 className="size-3" />Histórico de bandeira
          </div>
          <ul className="space-y-1 text-[12px]">
            {q.data.historicoBandeira.map((change, index) => (
              <li key={`${change.alteradoEm}-${index}`} data-testid={`historico-bandeira-${index}`} className="flex flex-wrap gap-x-2">
                <span>{change.anterior ?? "Sem registro"} → {change.atual ?? "Sem registro"}</span>
                <span className="text-muted-foreground">{new Date(change.alteradoEm).toLocaleDateString("pt-BR")} · {change.autor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            if (hasInvalidSchedule) return;
            save.mutate({
              id: postoId,
              data: {
                itens: values.itens.map((entry) => {
                  const field = q.data!.itens.find((candidate) => candidate.chave === entry.chave)!;
                  const valor = field.tipo === "horarios" ? horarioParaApi(entry.valor) : entry.valor;
                  return {
                    chave: entry.chave,
                    valor: valor as string | Record<string, unknown> | null,
                    fonte: entry.fonte.trim() || null,
                    verificadoEm: entry.verificadoEm || null,
                    revisarEm: entry.revisarEm || null,
                    publico: field.interno ? false : entry.publico,
                    versao: entry.versao,
                  };
                }),
              },
            });
          })}
        >
          <fieldset disabled={save.isPending} className="space-y-3">
            {groups.map(([group, fields], groupIndex) => {
              const verified = fields.filter(({ field, index }) => {
                const value = watchedItems?.[index]?.valor;
                return field.tipo === "horarios"
                  ? horarioParaApi(value) !== null
                  : field.tipo === "texto"
                    ? typeof value === "string" && value.trim().length > 0
                    : typeof value === "string" && value !== "nao_verificado" && value.length > 0;
              }).length;
              return (
                <details key={group} open={groupIndex === 0} className="overflow-hidden rounded border border-border bg-card">
                  <summary data-testid={`section-amenidades-${groupIndex}`} className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/50">
                    <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em]">{group}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{verified}/{fields.length} preenchidos</span>
                  </summary>
                  <div className="grid gap-3 border-t border-border p-3 xl:grid-cols-2">
                    {fields.map(({ field, index }) => {
                      const formItem = watchedItems?.[index];
                      const canPublish = formItem ? valorPublicavel(field, formItem) : false;
                      return (
                        <article key={field.chave} data-testid={`amenidade-${field.chave}`} className="min-w-0 rounded border border-border/80 p-3">
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-[13px] font-semibold">{field.rotulo}</h3>
                              {field.interno && <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-alert"><ShieldCheck className="size-3" />Apenas interno; não publicar detalhes técnicos</p>}
                            </div>
                          </div>

                          {field.tipo === "horarios" ? (
                            <HorarioEditor
                              index={index}
                              value={formItem?.valor}
                              onChange={(value) => form.setValue(`itens.${index}.valor`, value, { shouldDirty: true, shouldValidate: true })}
                            />
                          ) : field.tipo === "texto" ? (
                            <label className="mb-3 block space-y-1">
                              <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Valor</span>
                              <Input data-testid={`input-amenidade-${field.chave}`} maxLength={120} placeholder="Não informado" {...form.register(`itens.${index}.valor` as const)} />
                            </label>
                          ) : (
                            <label className="mb-3 block space-y-1">
                              <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Valor</span>
                              <select
                                data-testid={`select-amenidade-${field.chave}`}
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px]"
                                {...form.register(`itens.${index}.valor` as const)}
                              >
                                {field.opcoes.map((option) => <option key={option.valor} value={option.valor}>{option.rotulo}</option>)}
                              </select>
                            </label>
                          )}

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <label className="space-y-1">
                              <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Fonte</span>
                              <Input data-testid={`input-fonte-${field.chave}`} maxLength={180} placeholder="Ex.: equipe ICL" {...form.register(`itens.${index}.fonte` as const)} />
                            </label>
                            <label className="space-y-1">
                              <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Verificado em</span>
                              <Input data-testid={`input-verificado-${field.chave}`} type="date" max={hojeSaoPaulo()} {...form.register(`itens.${index}.verificadoEm` as const)} />
                            </label>
                            <label className="space-y-1">
                              <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Revisar até</span>
                              <Input data-testid={`input-revisar-${field.chave}`} type="date" {...form.register(`itens.${index}.revisarEm` as const)} />
                            </label>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
                            <label className="flex items-center gap-2 text-[11.5px]">
                              <Switch
                                data-testid={`switch-publico-${field.chave}`}
                                checked={!field.interno && (formItem?.publico ?? false)}
                                disabled={field.interno || (!canPublish && !formItem?.publico)}
                                onCheckedChange={(checked) => form.setValue(`itens.${index}.publico`, checked, { shouldDirty: true })}
                              />
                              Autorizar no app
                            </label>
                            {formItem?.publico && !canPublish && !field.interno && (
                              <span className="text-[10.5px] text-warn">Oculto até confirmar fonte, data e valor.</span>
                            )}
                          </div>
                          {field.atualizadoEm && (
                            <p data-testid={`text-responsavel-${field.chave}`} className="mt-2 break-words text-[10px] text-muted-foreground">
                              Atualizado por {field.atualizadoPor ?? "Equipe ICL"} em {new Date(field.atualizadoEm).toLocaleString("pt-BR")}.
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </fieldset>

          {hasInvalidSchedule && (
            <p data-testid="error-horarios-incompletos" className="flex items-start gap-2 rounded border border-warn/30 bg-warn/5 p-2.5 text-[11.5px] text-warn">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Complete o horário de todos os dias ou marque os dias sem atendimento como fechados.
            </p>
          )}
          {notVerifiedCount > 0 && (
            <p className="text-[10.5px] text-muted-foreground">
              {notVerifiedCount} campo(s) sem valor confirmado continuam como “não verificado”; isso não significa “não”.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-[10.5px] text-muted-foreground">Valores públicos vencidos ou sem verificação são ocultados automaticamente.</p>
            <div className="flex flex-wrap gap-2">
              <Btn data-testid="button-descartar-amenidades" type="button" variant="ghost" disabled={save.isPending} onClick={async () => {
                const result = await q.refetch();
                if (result.data) form.reset(paraFormulario(result.data.itens));
              }}>Descartar alterações / recarregar</Btn>
              <Btn data-testid="button-salvar-amenidades" disabled={!form.formState.isDirty || save.isPending || hasInvalidSchedule}>
                {save.isPending ? "Salvando…" : <><Check className="size-3.5" />Salvar informações</>}
              </Btn>
            </div>
          </div>
        </form>
      </Form>
    </Panel>
  );
}

function HorarioEditor({
  index,
  value,
  onChange,
}: {
  index: number;
  value: unknown;
  onChange: (value: HorarioFormulario) => void;
}) {
  const horario = valorHorarioFormulario(value);
  return (
    <fieldset className="mb-3">
      <legend className="mb-1.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Horário semanal · selecione o fuso local em Operação</legend>
      <div className="space-y-1.5">
        {DIAS.map(({ key, label }) => {
          const dia = horario[key];
          const atualizar = (patch: Partial<DiaFormulario>) => onChange({ ...horario, [key]: { ...dia, ...patch } });
          return (
            <div key={key} className="grid grid-cols-[72px_1fr] items-center gap-2 rounded bg-muted/35 px-2 py-1.5 sm:grid-cols-[72px_1fr_1fr_1fr]">
              <Label className="text-[10.5px]">{label}</Label>
              <label className="flex items-center gap-1.5 text-[10.5px]">
                <input
                  data-testid={`check-fechado-${index}-${key}`}
                  type="checkbox"
                  checked={dia.fechado}
                  onChange={(event) => atualizar({ fechado: event.target.checked, diaTodo: false, abertura: "", fechamento: "" })}
                />
                Fechado
              </label>
              <label className="flex items-center gap-1.5 text-[10.5px]">
                <input
                  data-testid={`check-24h-${index}-${key}`}
                  type="checkbox"
                  checked={dia.diaTodo}
                  disabled={dia.fechado}
                  onChange={(event) => atualizar({ diaTodo: event.target.checked, fechado: false, abertura: "", fechamento: "" })}
                />
                24 horas
              </label>
              {!dia.fechado && !dia.diaTodo ? (
                <div className="col-span-2 grid grid-cols-2 gap-1 sm:col-span-1">
                  <Input
                    data-testid={`input-horario-${key}-abertura`}
                    aria-label={`${label}: abertura`}
                    type="time"
                    value={dia.abertura}
                    onChange={(event) => atualizar({ abertura: event.target.value })}
                    className="h-7 px-1.5 text-[11px]"
                  />
                  <Input
                    data-testid={`input-horario-${key}-fechamento`}
                    aria-label={`${label}: fechamento`}
                    type="time"
                    value={dia.fechamento}
                    onChange={(event) => atualizar({ fechamento: event.target.value })}
                    className="h-7 px-1.5 text-[11px]"
                  />
                </div>
              ) : (
                <span className="col-span-2 text-[10px] text-muted-foreground sm:col-span-1">{dia.diaTodo ? "Atendimento contínuo" : "Sem atendimento"}</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">Os horários podem atravessar a meia-noite. Se não souber, deixe todos os dias em branco.</p>
    </fieldset>
  );
}
