import { Link } from "wouter";
import { useClerk } from "@clerk/react";
import { Fuel, Lock, LogOut } from "lucide-react";
import { Btn } from "@/components/kit";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SessaoCarregando() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background" data-testid="state-session-loading">
      <div className="flex flex-col items-center gap-4">
        <div className="relative grid size-12 place-items-center rounded bg-sidebar text-primary">
          <span className="pulse-ring absolute inset-0 rounded border-2 border-primary" />
          <Fuel className="size-5" />
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Verificando credenciais</div>
        <div className="hazard h-1 w-40 rounded-full opacity-70" />
      </div>
    </div>
  );
}

export function AcessoNegado({ email }: { email?: string }) {
  const { signOut } = useClerk();
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-sidebar px-5 text-sidebar-foreground">
      <div className="rise w-full max-w-md overflow-hidden rounded-lg border border-sidebar-border bg-sidebar-accent/40">
        <div className="hazard h-2" />
        <div className="p-7">
          <Lock className="mb-4 size-6 text-sidebar-primary" />
          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-sidebar-foreground/50">Erro 403 · Acesso negado</div>
          <h1 className="mt-2 font-display text-3xl font-bold">Sua conta ainda não tem acesso.</h1>
          <p className="mt-3 text-[14px] text-sidebar-foreground/70">
            Você entrou{email ? <> como <b className="text-sidebar-foreground">{email}</b></> : null}, mas este e-mail não está cadastrado no backoffice. Donos de posto são liberados pela equipe ICL, que vincula o e-mail a um posto ou a uma rede.
          </p>
          <p className="mt-3 text-[13px] text-sidebar-foreground/60">
            Se esta é a conta master, confirme que o e-mail principal verificado no Clerk é o mesmo configurado em <code>ADMIN_MASTER_EMAIL</code> nos Secrets do ambiente de desenvolvimento.
          </p>
          <Btn data-testid="button-sign-out" className="mt-6" onClick={() => signOut({ redirectUrl: basePath || "/" })}><LogOut className="size-4" />Sair e usar outra conta</Btn>
        </div>
      </div>
    </div>
  );
}

export function RestritoMaster() {
  return (
    <div className="grid place-items-center px-5 py-24 text-center">
      <Lock className="mb-3 size-6 text-primary" />
      <h1 className="font-display text-2xl font-bold">Área da equipe ICL</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Esta tela é exclusiva do papel master.</p>
      <Link href="/mapa" className="mt-4 text-[13px] font-semibold text-primary hover:underline">Voltar ao mapa</Link>
    </div>
  );
}
