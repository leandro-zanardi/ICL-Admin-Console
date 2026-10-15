import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListAcessosQueryKey, useAtualizarAcesso, useCriarAcesso, useListAcessos, useReenviarConviteAcesso, useRemoverAcesso, type Acesso } from "@workspace/api-client-react";
import { KeyRound, Mail, Network, Pencil, Plus, Store } from "lucide-react";
import { PageHeader, Panel, SkeletonRows, ErrorState, EmptyState, Btn, TextBox, ConfirmBtn } from "@/components/kit";
import { PostoPicker, type PostoEscolhido } from "@/components/posto-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cnpjRaiz, fmtData } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Escopo = "posto" | "rede";

function EscopoToggle({ value, onChange }: { value: Escopo; onChange: (v: Escopo) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {([["posto", Store, "Um posto", "Só o posto escolhido"], ["rede", Network, "Rede inteira", "Todos com o mesmo CNPJ raiz"]] as const).map(([k, I, t, d]) => (
        <button type="button" key={k} data-testid={`button-escopo-${k}`} onClick={() => onChange(k)} className={cn("flex items-start gap-2 rounded border p-2.5 text-left transition", value === k ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:border-foreground/30")}>
          <I className={cn("mt-0.5 size-4", value === k ? "text-primary" : "text-muted-foreground")} />
          <span><span className="block text-[13px] font-semibold">{t}</span><span className="text-[11.5px] text-muted-foreground">{d}</span></span>
        </button>
      ))}
    </div>
  );
}

function errMsg(e: unknown) { return (e as { data?: { erro?: string } } | null)?.data?.erro ?? "Tente novamente."; }

export default function Acessos() {
  const q = useListAcessos();
  const qc = useQueryClient();
  const { toast } = useToast();
  const inv = () => qc.invalidateQueries({ queryKey: getListAcessosQueryKey() });
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [escopo, setEscopo] = useState<Escopo>("posto");
  const [posto, setPosto] = useState<PostoEscolhido | null>(null);
  const [edit, setEdit] = useState<Acesso | null>(null);
  const criar = useCriarAcesso({ mutation: { onSuccess: (acesso) => { inv(); setEmail(""); setNome(""); setPosto(null); toast({ title: acesso.conviteStatus === "enviado" ? "Convite enviado" : acesso.conviteStatus === "conta_existente" ? "Acesso liberado" : "Acesso criado, convite não enviado", description: acesso.conviteStatus === "enviado" ? `Enviamos um convite para ${acesso.email}. A pessoa deve aceitar o convite e criar a própria senha.` : acesso.conviteStatus === "conta_existente" ? "Este e-mail já tem uma conta. A pessoa pode entrar com ela ou usar “Esqueci a senha” na tela de login." : "O acesso foi salvo, mas o convite por e-mail falhou. A pessoa pode usar “Criar conta” com este e-mail; se já tiver conta, use “Esqueci a senha”." }); }, onError: (e) => toast({ title: "Falha ao criar acesso", description: errMsg(e), variant: "destructive" }) } });
  const remover = useRemoverAcesso({ mutation: { onSuccess: () => { inv(); toast({ title: "Acesso removido" }); }, onError: (e) => toast({ title: "Falha ao remover", description: errMsg(e), variant: "destructive" }) } });
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div>
      <PageHeader code="07 / Gestão" title="Acessos de donos de posto" desc="Libere o backoffice por e-mail e envie um convite para a pessoa criar a própria senha. O escopo define o que o dono enxerga: um posto específico ou toda a rede (CNPJ raiz, os 8 primeiros dígitos do CNPJ)." />
      <div className="grid gap-4 px-5 py-5 md:px-7 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Panel title="Novo acesso" bodyClass="p-4">
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (posto) criar.mutate({ data: { email: email.trim(), nome: nome || null, escopoTipo: escopo, postoId: posto.id } }); }}>
            <TextBox data-testid="input-email" label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dono@postoexemplo.com.br" />
            <TextBox data-testid="input-nome" label="Nome (opcional)" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Marta Okamoto" />
            <EscopoToggle value={escopo} onChange={setEscopo} />
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{escopo === "rede" ? "Posto de referência da rede" : "Posto"}</span>
              <PostoPicker value={posto} onChange={setPosto} />
              {posto && <div className="rounded bg-muted px-2.5 py-1.5 text-[12px]">{escopo === "rede" ? <>Rede com CNPJ raiz <b className="font-mono">{cnpjRaiz(posto.cnpj) || "-"}</b></> : <>Posto <b>{posto.nome}</b></>}</div>}
            </div>
            <Btn data-testid="button-criar-acesso" disabled={!emailOk || !posto || criar.isPending}><Plus className="size-3.5" />{criar.isPending ? "Criando e enviando convite" : "Liberar e convidar"}</Btn>
          </form>
        </Panel>
        <Panel title={`Acessos cadastrados${q.data ? ` · ${q.data.length}` : ""}`}>
          {q.isLoading ? <SkeletonRows cols={4} /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyState title="Nenhum acesso cadastrado" hint="Cadastre o primeiro dono de posto ao lado." icon={<KeyRound className="size-5" />} /> : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>E-mail</th><th>Papel</th><th>Escopo</th><th>Desde</th><th className="text-right">Ações</th></tr></thead>
                <tbody>
                  {q.data.map((a, i) => (
                    <tr key={a.id} data-testid={`row-acesso-${a.id}`} className="rise" style={{ animationDelay: `${i * 16}ms` }}>
                      <td><div className="font-medium">{a.email}</div><div className="text-[11.5px] text-muted-foreground">{a.nome ?? ""}</div></td>
                      <td><span className={cn("rounded px-1.5 py-0.5 font-mono text-[10.5px] uppercase", a.papel === "master" ? "bg-sidebar text-sidebar-primary" : "bg-muted")}>{a.papel}</span></td>
                      <td className="text-[12.5px]">
                        {a.escopo.tipo === "todos" ? "Tudo" : a.escopo.tipo === "rede" ? <span className="inline-flex items-center gap-1"><Network className="size-3.5 text-primary" />Rede <b className="font-mono">{a.escopo.cnpjRaiz}</b></span> : <span className="inline-flex items-center gap-1"><Store className="size-3.5 text-muted-foreground" />{a.postoNome ?? a.escopo.postoId}</span>}
                      </td>
                      <td className="font-mono text-[11px] text-muted-foreground">{fmtData(a.criadoEm)}</td>
                      <td className="text-right">
                        {a.papel === "posto" && (
                          <span className="inline-flex gap-1">
                            <BotaoConvite acesso={a} />
                            <Btn data-testid={`button-editar-${a.id}`} variant="outline" className="h-7 px-2" onClick={() => setEdit(a)}><Pencil className="size-3" />Escopo</Btn>
                            <ConfirmBtn testId={`button-remover-${a.id}`} onConfirm={() => remover.mutate({ id: a.id })}>Remover</ConfirmBtn>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
      {edit && <EditarAcesso acesso={edit} onClose={() => setEdit(null)} onSaved={inv} />}
    </div>
  );
}

function BotaoConvite({ acesso }: { acesso: Acesso }) {
  const { toast } = useToast();
  const convite = useReenviarConviteAcesso({
    mutation: {
      onSuccess: (r) => toast({
        title: r.conviteStatus === "enviado" ? "Convite enviado" : "A conta já existe",
        description: r.conviteStatus === "enviado"
          ? `Enviamos um convite para ${acesso.email}. A pessoa deve aceitar e criar a própria senha.`
          : "A pessoa pode entrar com a conta existente ou usar “Esqueci a senha” na tela de login.",
      }),
      onError: (e) => toast({ title: "Não foi possível enviar o convite", description: errMsg(e), variant: "destructive" }),
    },
  });
  return (
    <Btn
      data-testid={`button-convidar-${acesso.id}`}
      variant="outline"
      className="h-7 px-2"
      disabled={convite.isPending}
      onClick={() => convite.mutate({ id: acesso.id })}
    >
      <Mail className="size-3" />{convite.isPending ? "Enviando" : "Reenviar convite"}
    </Btn>
  );
}

function EditarAcesso({ acesso, onClose, onSaved }: { acesso: Acesso; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [nome, setNome] = useState(acesso.nome ?? "");
  const [escopo, setEscopo] = useState<Escopo>(acesso.escopo.tipo === "rede" ? "rede" : "posto");
  const [posto, setPosto] = useState<PostoEscolhido | null>(acesso.escopo.postoId ? { id: acesso.escopo.postoId, nome: acesso.postoNome ?? acesso.escopo.postoId } : null);
  const m = useAtualizarAcesso({ mutation: { onSuccess: () => { onSaved(); toast({ title: "Escopo atualizado" }); onClose(); }, onError: (e) => toast({ title: "Falha ao atualizar", description: errMsg(e), variant: "destructive" }) } });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-card">
        <DialogHeader><DialogTitle className="font-display">Escopo de {acesso.email}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <TextBox data-testid="input-edit-nome" label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <EscopoToggle value={escopo} onChange={setEscopo} />
          <PostoPicker value={posto} onChange={setPosto} />
          {posto && <div className="rounded bg-muted px-2.5 py-1.5 text-[12px]">Selecionado: <b>{posto.nome}</b>{escopo === "rede" && posto.cnpj ? <> · raiz <b className="font-mono">{cnpjRaiz(posto.cnpj)}</b></> : null}</div>}
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn data-testid="button-salvar-acesso" disabled={!posto || m.isPending} onClick={() => posto && m.mutate({ id: acesso.id, data: { nome: nome || null, escopoTipo: escopo, postoId: posto.id } })}>{m.isPending ? "Salvando" : "Salvar"}</Btn>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
