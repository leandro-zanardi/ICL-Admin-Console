import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListRecompensasQueryKey, useAtualizarRecompensa, useCriarRecompensa, useListRecompensas, type Recompensa } from "@workspace/api-client-react";
import { Gift, Pencil, Plus } from "lucide-react";
import { PageHeader, SkeletonRows, ErrorState, EmptyState, Btn, TextBox, TextArea } from "@/components/kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { fmtNum } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Recompensas() {
  const q = useListRecompensas();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<Recompensa | "nova" | null>(null);
  const atualizar = useAtualizarRecompensa({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListRecompensasQueryKey() }), onError: () => toast({ title: "Falha ao atualizar", variant: "destructive" }) } });
  const toggle = (r: Recompensa) => atualizar.mutate({ id: r.id, data: { nome: r.nome, descricao: r.descricao ?? null, categoria: r.categoria ?? null, custoPontos: r.custoPontos, ativa: !r.ativa } });

  return (
    <div>
      <PageHeader code="11 / Comunidade" title="Recompensas" desc="Catálogo que os consumidores trocam por pontos de check-in e denúncias verdadeiras." actions={<Btn data-testid="button-nova-recompensa" onClick={() => setForm("nova")}><Plus className="size-3.5" />Nova recompensa</Btn>} />
      <div className="px-5 py-5 md:px-7">
        {q.isLoading ? <div className="rounded-md border border-border bg-card"><SkeletonRows cols={4} /></div> : q.isError ? <div className="rounded-md border border-border bg-card"><ErrorState onRetry={() => q.refetch()} /></div> : !q.data?.length ? <div className="rounded-md border border-border bg-card"><EmptyState title="Catálogo vazio" hint="Crie a primeira recompensa." icon={<Gift className="size-5" />} /></div> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {q.data.map((r, i) => (
              <article key={r.id} data-testid={`card-recompensa-${r.id}`} className={cn("rise group relative flex flex-col overflow-hidden rounded-md border bg-card transition", r.ativa ? "border-card-border hover:border-primary/50" : "border-dashed border-border opacity-70")} style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{r.categoria ?? "Sem categoria"}</div>
                    <h3 className="font-display text-lg font-bold leading-tight">{r.nome}</h3>
                    <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">{r.descricao ?? ""}</p>
                  </div>
                  <div className="text-right"><div className="font-display text-2xl font-extrabold text-primary tnum">{fmtNum(r.custoPontos)}</div><div className="font-mono text-[10px] uppercase text-muted-foreground">pontos</div></div>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-border px-4 py-2">
                  <label className="flex items-center gap-2 text-[12.5px]"><Switch data-testid={`switch-ativa-${r.id}`} checked={r.ativa} onCheckedChange={() => toggle(r)} disabled={atualizar.isPending} />{r.ativa ? "Ativa" : "Inativa"}</label>
                  <Btn data-testid={`button-editar-${r.id}`} variant="ghost" className="h-7 px-2" onClick={() => setForm(r)}><Pencil className="size-3" />Editar</Btn>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {form && <RecompensaForm inicial={form === "nova" ? null : form} onClose={() => setForm(null)} />}
    </div>
  );
}

function RecompensaForm({ inicial, onClose }: { inicial: Recompensa | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [v, setV] = useState({ nome: inicial?.nome ?? "", descricao: inicial?.descricao ?? "", categoria: inicial?.categoria ?? "", custo: String(inicial?.custoPontos ?? ""), ativa: inicial?.ativa ?? true });
  const ok = { onSuccess: () => { qc.invalidateQueries({ queryKey: getListRecompensasQueryKey() }); toast({ title: inicial ? "Recompensa atualizada" : "Recompensa criada" }); onClose(); }, onError: () => toast({ title: "Falha ao salvar", variant: "destructive" as const }) };
  const criar = useCriarRecompensa({ mutation: ok });
  const atualizar = useAtualizarRecompensa({ mutation: ok });
  const custo = Number(v.custo);
  const valido = v.nome.trim().length >= 2 && custo >= 1;
  const pending = criar.isPending || atualizar.isPending;
  const submit = () => {
    const data = { nome: v.nome.trim(), descricao: v.descricao || null, categoria: v.categoria || null, custoPontos: custo, ativa: v.ativa };
    if (inicial) atualizar.mutate({ id: inicial.id, data }); else criar.mutate({ data });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader><DialogTitle className="font-display">{inicial ? "Editar recompensa" : "Nova recompensa"}</DialogTitle></DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (valido) submit(); }}>
          <TextBox data-testid="input-nome" label="Nome" value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} placeholder="Lavagem completa" />
          <TextArea data-testid="input-descricao" label="Descrição" value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <TextBox data-testid="input-categoria" label="Categoria" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })} placeholder="Serviços" />
            <TextBox data-testid="input-custo" label="Custo em pontos" type="number" min={1} value={v.custo} onChange={(e) => setV({ ...v, custo: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-[13px]"><Switch data-testid="switch-ativa" checked={v.ativa} onCheckedChange={(c) => setV({ ...v, ativa: c })} />Disponível no app</label>
          <div className="flex justify-end gap-2">
            <Btn type="button" variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn data-testid="button-salvar-recompensa" disabled={!valido || pending}>{pending ? "Salvando" : "Salvar"}</Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
