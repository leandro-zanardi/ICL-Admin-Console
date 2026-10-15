import { useState, type ReactNode } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtNum } from "@/lib/format";

export function PageHeader({ code, title, desc, actions }: { code: string; title: string; desc?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 pb-4 pt-5 md:px-7">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="inline-block h-2 w-2 bg-primary" />{code}
        </div>
        <h1 data-testid="text-page-title" className="text-[26px] font-bold leading-tight md:text-[30px]">{title}</h1>
        {desc && <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({ title, aside, children, className, bodyClass }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-md border border-card-border bg-card", className)}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/80">{title}</h2>
          {aside}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function SkeletonRows({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border/70" data-testid="state-loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-3 py-3" style={{ opacity: 1 - i * 0.08 }}>
          {Array.from({ length: cols }).map((__, j) => <Skeleton key={j} className={cn("h-3.5 bg-muted", j === 0 ? "w-24" : "flex-1")} />)}
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div data-testid="state-error" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="hazard h-1.5 w-24 rounded-full opacity-80" />
      <AlertTriangle className="size-6 text-alert" />
      <div>
        <p className="font-display text-lg font-semibold">Falha na leitura dos dados</p>
        <p className="text-[13px] text-muted-foreground">{message ?? "O servidor não respondeu como esperado. Tente novamente."}</p>
      </div>
      {onRetry && (
        <button data-testid="button-retry" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-[13px] font-medium transition hover:border-primary hover:text-primary">
          <RotateCw className="size-3.5" />Tentar de novo
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div data-testid="state-empty" className="grid-paper flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="grid size-11 place-items-center rounded-full border border-dashed border-foreground/25 bg-card text-muted-foreground">{icon ?? <Inbox className="size-5" />}</div>
      <p className="font-display text-base font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-[13px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">
      <span data-testid="text-pagination">{fmtNum(from)}-{fmtNum(to)} de {fmtNum(total)}</span>
      <div className="flex items-center gap-1">
        <button data-testid="button-page-prev" disabled={page <= 1} onClick={() => onPage(page - 1)} className="grid size-7 place-items-center rounded border border-border bg-background transition hover:border-primary disabled:opacity-40 disabled:hover:border-border"><ChevronLeft className="size-3.5" /></button>
        <span className="px-2 tnum">{page} / {pages}</span>
        <button data-testid="button-page-next" disabled={page >= pages} onClick={() => onPage(page + 1)} className="grid size-7 place-items-center rounded border border-border bg-background transition hover:border-primary disabled:opacity-40 disabled:hover:border-border"><ChevronRight className="size-3.5" /></button>
      </div>
    </div>
  );
}

export function SelectBox({ label, value, onChange, options, all = "Todos", testId, className }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; all?: string | null; testId?: string; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      {label && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</span>}
      <select data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded border border-input bg-card px-2 text-[13px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
        {all !== null && <option value="">{all}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function TextBox({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      {label && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</span>}
      <input {...props} className="h-8 rounded border border-input bg-card px-2.5 text-[13px] outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20" />
    </label>
  );
}

export function TextArea({ label, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      {label && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</span>}
      <textarea {...props} className="min-h-[72px] rounded border border-input bg-card px-2.5 py-2 text-[13px] outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20" />
    </label>
  );
}

export function Btn({ variant = "primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger" | "dark" }) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[inset_0_-2px_0_hsl(22_90%_36%)]",
    dark: "bg-sidebar text-sidebar-foreground hover:bg-sidebar/90",
    outline: "border border-border bg-card hover:border-primary hover:text-primary",
    ghost: "hover:bg-muted",
    danger: "border border-alert/40 text-alert hover:bg-alert hover:text-white",
  }[variant];
  return <button {...props} className={cn("inline-flex h-8 items-center justify-center gap-1.5 rounded px-3 text-[13px] font-semibold transition active:translate-y-px disabled:pointer-events-none disabled:opacity-50", v, className)} />;
}

export function ConfirmBtn({ onConfirm, children, confirmLabel = "Confirmar remoção", testId, disabled }: { onConfirm: () => void; children: ReactNode; confirmLabel?: string; testId?: string; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <span className="inline-flex gap-1">
      <Btn data-testid={`${testId}-confirm`} variant="danger" className="h-7 bg-alert px-2 text-white" onClick={() => { setArmed(false); onConfirm(); }}>{confirmLabel}</Btn>
      <Btn variant="ghost" className="h-7 px-2" onClick={() => setArmed(false)}>Cancelar</Btn>
    </span>
  ) : <Btn data-testid={testId} disabled={disabled} variant="danger" className="h-7 px-2" onClick={() => setArmed(true)}>{children}</Btn>;
}

export function Kpi({ label, value, sub, tone, delay = 0 }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "signal" | "alert" | "ok" | "default"; delay?: number }) {
  const bar = { signal: "bg-primary", alert: "bg-alert", ok: "bg-ok", default: "bg-foreground/70" }[tone ?? "default"];
  return (
    <div className="rise relative overflow-hidden rounded-md border border-card-border bg-card px-4 py-3" style={{ animationDelay: `${delay}ms` }}>
      <span className={cn("absolute left-0 top-0 h-full w-[3px]", bar)} />
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div data-testid={`kpi-${label}`} className="mt-1 font-display text-[28px] font-bold leading-none tnum">{value}</div>
      {sub && <div className="mt-1.5 text-[12px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Field({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border py-1.5 last:border-0">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">{k}</dt>
      <dd className="text-right text-[13px] font-medium">{v}</dd>
    </div>
  );
}

export function Indisponivel() {
  return <span className="inline-flex items-center gap-1 rounded border border-dashed border-border px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">indisponível no app atual</span>;
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-2.5 border-b border-border bg-muted/40 px-5 py-3 md:px-7">{children}</div>;
}
