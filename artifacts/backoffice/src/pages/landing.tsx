import { Link } from "wouter";
import { useHealthCheck } from "@workspace/api-client-react";
import { ArrowRight, Clock, Fuel, MapPinned, ScanSearch, ShieldCheck } from "lucide-react";

const linhas = [
  { t: "08:42", p: "Posto Serra Azul · Contagem", c: "Volume da bomba", s: "vencendo" },
  { t: "08:17", p: "Auto Posto Ipiranga Sul · Goiânia", c: "Qualidade do combustível", s: "vencido" },
  { t: "07:55", p: "Posto Trevo BR-040 · Sete Lagoas", c: "Posto clone", s: "no_prazo" },
  { t: "07:31", p: "Rede Caminho Livre · Uberlândia", c: "Qualidade do combustível", s: "respondida" },
];
const tone: Record<string, string> = { vencendo: "bg-warn", vencido: "bg-alert", no_prazo: "bg-chart-2", respondida: "bg-ok" };

export default function Landing() {
  const h = useHealthCheck();
  const ok = h.data?.status === "ok";
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="flex items-center justify-between border-b border-border px-5 py-3 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded bg-sidebar text-primary"><Fuel className="size-4" /></div>
          <span className="font-display text-[17px] font-bold">ICL Backoffice</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:inline">/ Rede Regular</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sign-in" data-testid="link-sign-in" className="rounded px-3 py-1.5 text-[13px] font-semibold transition hover:bg-muted">Entrar</Link>
          <Link href="/sign-up" data-testid="link-sign-up" className="rounded bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground transition hover:bg-primary/90">Criar conta</Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="grid-paper absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.1fr_1fr] md:px-10 md:py-24">
          <div className="rise">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em]">
              <span className="relative inline-flex size-2"><span className="pulse-ring absolute inset-0 rounded-full bg-primary" /><span className="relative size-2 rounded-full bg-primary" /></span>
              Sala de controle da fiscalização
            </div>
            <h1 className="font-display text-[44px] font-extrabold leading-[0.95] tracking-[-0.035em] md:text-[68px]">
              Cada denúncia<br />tem um <span className="relative inline-block text-primary">prazo<span className="hazard absolute -bottom-1 left-0 h-2 w-full rounded-sm" /></span>.<br />Cada posto, uma resposta.
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              O backoffice do ICL - Rede Regular conecta quem abastece a quem vende. A equipe ICL faz a triagem, cobra e decide. O dono do posto vê as denúncias do seu CNPJ e responde ao cliente direto pelo app.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-in" data-testid="button-hero-entrar" className="inline-flex items-center gap-2 rounded bg-sidebar px-5 py-3 text-[14px] font-semibold text-sidebar-foreground transition hover:bg-sidebar/90">Entrar no painel <ArrowRight className="size-4 text-primary" /></Link>
              <Link href="/sign-up" data-testid="button-hero-cadastro" className="inline-flex items-center gap-2 rounded border border-border bg-card px-5 py-3 text-[14px] font-semibold transition hover:border-primary hover:text-primary">Sou dono de posto</Link>
            </div>
          </div>

          <div className="rise rounded-lg border border-sidebar-border bg-sidebar p-1 text-sidebar-foreground shadow-[0_30px_60px_-30px_hsl(203_48%_11%/.6)]" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center justify-between px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/50">
              <span>Fila de hoje</span><span>America/Sao_Paulo</span>
            </div>
            <ul className="divide-y divide-sidebar-border rounded bg-sidebar-accent/40">
              {linhas.map((l, i) => (
                <li key={i} className="rise flex items-center gap-3 px-3 py-3" style={{ animationDelay: `${260 + i * 90}ms` }}>
                  <span className={`h-8 w-[3px] rounded ${tone[l.s]}`} />
                  <span className="font-mono text-[11px] text-sidebar-foreground/50">{l.t}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{l.p}</span>
                    <span className="text-[11.5px] text-sidebar-foreground/60">{l.c}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-3 gap-px p-px font-mono">
              {[["Abertas", "214"], ["Vencidas", "17"], ["Resolvidas 7d", "86"]].map(([k, v]) => (
                <div key={k} className="px-3 py-3"><div className="text-[9.5px] uppercase tracking-[0.14em] text-sidebar-foreground/45">{k}</div><div className="font-display text-2xl font-bold text-sidebar-foreground">{v}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl md:grid-cols-[1.4fr_1fr_1fr]">
          {[
            { i: MapPinned, t: "Mapa primeiro", d: "Ao entrar, você vê onde as denúncias se concentram: mapa de calor e um pino por posto, filtrado por período, categoria e status." },
            { i: Clock, t: "Prazo que pesa", d: "A equipe ICL define o prazo. Vencendo e vencido saltam na tela." },
            { i: ScanSearch, t: "Antifraude explicável", d: "Score de veracidade por regras e pesos visíveis. Nada de caixa-preta." },
          ].map((f, i) => (
            <div key={f.t} className={`px-6 py-8 md:px-10 ${i ? "border-t border-border md:border-l md:border-t-0" : ""}`}>
              <f.i className="mb-3 size-5 text-primary" />
              <h3 className="font-display text-lg font-bold">{f.t}</h3>
              <p className="mt-1 text-[13.5px] text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-2 md:px-10">
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Equipe ICL</div>
          <h2 className="mt-2 font-display text-3xl font-bold">Vê tudo. Decide.</h2>
          <p className="mt-2 text-[14px] text-muted-foreground">Procedente ou improcedente, com observação registrada. Ranking ouro, prata e bronze para quem denuncia com verdade. Recompensas, resgates, acessos e histórico ANP.</p>
        </div>
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">Dono de posto</div>
          <h2 className="mt-2 font-display text-3xl font-bold">Vê o seu. Responde.</h2>
          <p className="mt-2 text-[14px] text-muted-foreground">Só o seu posto ou a sua rede, pelo CNPJ raiz. Registre andamentos que o cliente lê no app e informe a resolução. Quem resolve aparece no recall.</p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-[12px]"><ShieldCheck className="size-3.5 text-ok" />Acesso liberado pela equipe ICL, por e-mail</div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground md:px-10">
        <span>ICL - Rede Regular · Backoffice</span>
        <span data-testid="status-api" className="inline-flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${h.isLoading ? "bg-muted-foreground" : ok ? "bg-ok" : "bg-alert"}`} />
          {h.isLoading ? "verificando servidor" : ok ? "servidor operacional" : "servidor indisponível"}
        </span>
      </footer>
    </div>
  );
}
