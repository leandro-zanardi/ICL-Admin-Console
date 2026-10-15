import { useState } from "react";
import { useListPostos } from "@workspace/api-client-react";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { cnpjRaiz } from "@/lib/format";

export type PostoEscolhido = { id: string; nome: string; cnpj?: string | null; municipio?: string | null };

export function PostoPicker({ value, onChange }: { value: PostoEscolhido | null; onChange: (p: PostoEscolhido) => void }) {
  const [busca, setBusca] = useState("");
  const q = useListPostos({ busca: busca || undefined, page: 1, pageSize: 8 });
  return (
    <div className="rounded border border-input bg-card">
      <div className="flex items-center gap-2 border-b border-border px-2.5">
        <Search className="size-3.5 text-muted-foreground" />
        <input data-testid="input-posto-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar posto por nome, CNPJ ou município" className="h-8 flex-1 bg-transparent text-[13px] outline-none" />
      </div>
      <ul className="max-h-48 overflow-auto">
        {q.isLoading && <li className="px-3 py-2 text-[12px] text-muted-foreground">Buscando postos...</li>}
        {q.isError && <li className="px-3 py-2 text-[12px] text-alert">Falha na busca.</li>}
        {q.data?.items.length === 0 && <li className="px-3 py-2 text-[12px] text-muted-foreground">Nenhum posto encontrado.</li>}
        {q.data?.items.map((p) => {
          const sel = value?.id === p.id;
          return (
            <li key={p.id}>
              <button type="button" data-testid={`option-posto-${p.id}`} onClick={() => onChange({ id: p.id, nome: p.nome, cnpj: p.cnpj, municipio: p.municipio })} className={cn("flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[12.5px] transition hover:bg-primary/5", sel && "bg-primary/10")}>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.nome}</span>
                  <span className="font-mono text-[10.5px] text-muted-foreground">{p.cnpj ?? "sem CNPJ"} · raiz {cnpjRaiz(p.cnpj) || "-"} · {p.municipio ?? "-"}</span>
                </span>
                {sel && <Check className="size-4 text-primary" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
