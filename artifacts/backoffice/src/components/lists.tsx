import { Link } from "wouter";
import type { CheckinInfo, DenunciaResumo } from "@workspace/api-client-react";
import { CategoriaTag, DecisaoBadge, FaixaScoreBadge, PrazoBadge, StatusBadge, prazoBar } from "@/components/badges";
import { EmptyState } from "@/components/kit";
import { fmtData, fmtDataHora, fmtDist } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MapPinCheck } from "lucide-react";

export function DenunciaRows({ items, showPosto = true, compact = false }: { items: DenunciaResumo[]; showPosto?: boolean; compact?: boolean }) {
  if (!items.length) return <EmptyState title="Nenhuma denúncia" hint="Nada registrado aqui até agora." />;
  return (
    <ul className="divide-y divide-border/70">
      {items.map((d, i) => (
        <li key={d.id} className="rise" style={{ animationDelay: `${Math.min(i, 15) * 22}ms` }}>
          <Link href={`/denuncias/${d.id}`} data-testid={`link-denuncia-${d.id}`} className="group relative flex flex-col gap-1 px-4 py-2.5 transition hover:bg-primary/[0.045]">
            <span className={cn("absolute left-0 top-0 h-full w-[3px]", prazoBar[d.prazoEstado])} />
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11.5px] font-semibold group-hover:text-primary">{d.protocolo}</span>
              <span className="font-mono text-[10.5px] text-muted-foreground">{fmtData(d.criadoEm)}</span>
            </div>
            {!compact && <p className="line-clamp-1 text-[12.5px] text-foreground/80">{d.descricaoResumo}</p>}
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={d.status} />
              <PrazoBadge estado={d.prazoEstado} />
              <FaixaScoreBadge faixa={d.faixa} score={d.score} />
              {d.decisao && <DecisaoBadge decisao={d.decisao} />}
              <CategoriaTag categoria={d.categoria} />
              {showPosto && d.postoNome && <span className="text-[11.5px] text-muted-foreground">em {d.postoNome}</span>}
              {d.prazoEm && <span className="font-mono text-[10.5px] text-muted-foreground">prazo {fmtData(d.prazoEm)}</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CheckinRows({ items, showPosto = false, showUsuario = true }: { items: CheckinInfo[]; showPosto?: boolean; showUsuario?: boolean }) {
  if (!items.length) return <EmptyState title="Sem check-ins" icon={<MapPinCheck className="size-5" />} />;
  return (
    <table className="data-table">
      <thead><tr><th>Quando</th>{showPosto && <th>Posto</th>}{showUsuario && <th>Usuário</th>}<th>Distância</th><th className="text-right">Pontos</th></tr></thead>
      <tbody>
        {items.map((c) => (
          <tr key={c.id} data-testid={`row-checkin-${c.id}`}>
            <td className="font-mono text-[11.5px]">{fmtDataHora(c.criadoEm)}</td>
            {showPosto && <td><Link href={`/postos/${c.postoId}`} className="hover:text-primary hover:underline">{c.postoNome ?? c.postoId}</Link></td>}
            {showUsuario && <td>{c.usuarioRotulo ?? "-"}</td>}
            <td className="font-mono text-[11.5px]">{fmtDist(c.distanciaM)}</td>
            <td className="text-right font-mono tnum">+{c.pontos}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
