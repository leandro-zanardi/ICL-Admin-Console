import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-5">
      <div className="rise text-center">
        <div className="font-display text-[120px] font-extrabold leading-none tracking-[-0.05em] text-foreground/10">404</div>
        <div className="hazard mx-auto -mt-4 mb-6 h-2 w-40 rounded-full" />
        <h1 className="font-display text-2xl font-bold">Bomba sem combustível</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">Esta página não existe ou foi removida.</p>
        <Link href="/" data-testid="link-home" className="mt-5 inline-block rounded bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground">Voltar ao início</Link>
      </div>
    </div>
  );
}
