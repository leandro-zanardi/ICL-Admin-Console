import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { Award, BarChart3, Building2, Database, FileWarning, Fuel, Gift, KeyRound, LogOut, Map as MapIcon, Menu, RotateCcw, ScanSearch, Ticket, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessao } from "@/lib/sessao";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Item = { href: string; label: string; icon: typeof MapIcon; master?: boolean };
const groups: { title: string; items: Item[] }[] = [
  { title: "Operação", items: [
    { href: "/mapa", label: "Mapa", icon: MapIcon },
    { href: "/denuncias", label: "Denúncias", icon: FileWarning },
    { href: "/conformidade", label: "Conformidade", icon: ScanSearch, master: true },
    { href: "/recall", label: "Recall", icon: RotateCcw },
    { href: "/postos", label: "Postos", icon: Building2 },
  ] },
  { title: "Comunidade", items: [
    { href: "/usuarios", label: "Usuários", icon: Users, master: true },
    { href: "/ranking", label: "Ranking", icon: Award, master: true },
    { href: "/recompensas", label: "Recompensas", icon: Gift, master: true },
    { href: "/resgates", label: "Resgates", icon: Ticket, master: true },
  ] },
  { title: "Gestão", items: [
    { href: "/painel", label: "Painel", icon: BarChart3, master: true },
    { href: "/acessos", label: "Acessos", icon: KeyRound, master: true },
    { href: "/anp", label: "Sincronização ANP", icon: Database, master: true },
  ] },
];

export function Shell({ children }: { children: ReactNode }) {
  const { sessao, isMaster } = useSessao();
  const { signOut } = useClerk();
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const iniciais = (sessao.nome ?? sessao.email).split(/[\s@.]/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

  const nav = (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {groups.map((g) => {
        const items = g.items.filter((i) => isMaster || !i.master);
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <div className="mb-1.5 px-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-sidebar-foreground/40">{g.title}</div>
            <ul className="flex flex-col gap-px">
              {items.map((i) => {
                const active = loc === i.href || loc.startsWith(i.href + "/");
                return (
                  <li key={i.href}>
                    <Link href={i.href} onClick={() => setOpen(false)} data-testid={`link-nav-${i.href.slice(1)}`} className={cn("group relative flex items-center gap-2.5 rounded px-2 py-1.5 text-[13px] transition-colors", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}>
                      <span className={cn("absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-sidebar-primary transition-opacity", active ? "opacity-100" : "opacity-0")} />
                      <i.icon className={cn("size-4", active ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80")} />
                      {i.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const side = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
        <div className="grid size-8 place-items-center rounded bg-sidebar-primary text-sidebar-primary-foreground"><Fuel className="size-4" /></div>
        <div className="leading-tight">
          <div className="font-display text-[15px] font-bold tracking-tight">ICL Backoffice</div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-sidebar-foreground/50">Rede Regular</div>
        </div>
      </div>
      <div className="mx-3 mt-3 rounded border border-sidebar-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/60">
        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-sidebar-primary align-middle" />
        {isMaster ? "Equipe ICL · acesso total" : sessao.escopo.tipo === "rede" ? `Rede ${sessao.escopo.cnpjRaiz ?? ""}` : "Posto"}
      </div>
      {nav}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-full border border-sidebar-primary/50 bg-sidebar-accent font-mono text-[11px] font-semibold text-sidebar-primary">{iniciais}</div>
          <div className="min-w-0 flex-1 leading-tight">
            <div data-testid="text-user-name" className="truncate text-[12.5px] font-semibold">{sessao.nome ?? "Sem nome"}</div>
            <div data-testid="text-user-email" className="truncate font-mono text-[10.5px] text-sidebar-foreground/55">{sessao.email}</div>
          </div>
          <button data-testid="button-sign-out" title="Sair" onClick={() => signOut({ redirectUrl: basePath || "/" })} className="grid size-8 place-items-center rounded text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-primary"><LogOut className="size-4" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh]">
      <aside className="sticky top-0 hidden h-[100dvh] w-[232px] shrink-0 md:block">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-[1000] md:hidden">
          <div className="absolute inset-0 bg-sidebar/60" onClick={() => setOpen(false)} />
          <div className="rise absolute inset-y-0 left-0 w-[260px]">{side}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-2.5 text-sidebar-foreground md:hidden">
          <span className="font-display font-bold">ICL Backoffice</span>
          <button data-testid="button-menu" onClick={() => setOpen((o) => !o)}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
