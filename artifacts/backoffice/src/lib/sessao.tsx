import { createContext, useContext, type ReactNode } from "react";
import type { Sessao } from "@workspace/api-client-react";

const Ctx = createContext<Sessao | null>(null);

export function SessaoProvider({ value, children }: { value: Sessao; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSessao() {
  const s = useContext(Ctx);
  if (!s) throw new Error("Sessão indisponível");
  return { sessao: s, isMaster: s.papel === "master" };
}
