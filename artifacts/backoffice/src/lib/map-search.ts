import type { GetMapaParams, MapaPin } from "@workspace/api-client-react";

export function normalizarBusca(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function buscarPins(pins: MapaPin[], busca: string) {
  const buscaNormalizada = normalizarBusca(busca.trim());
  if (!buscaNormalizada) return [];

  const somenteDigitos = busca.replace(/\D/g, "");
  return pins.filter((pin) =>
    normalizarBusca(`${pin.nome} ${pin.municipio ?? ""}`).includes(buscaNormalizada) ||
    (!!somenteDigitos && (pin.cnpj ?? "").replace(/\D/g, "").includes(somenteDigitos)),
  );
}

export function criarParametrosMapa({ dias, categoria, status }: { dias: string; categoria: string; status: string }): GetMapaParams {
  return { dias: Number(dias), categoria: categoria || undefined, status: status || undefined };
}

export function selecionarResultadoBusca(postoId: string, focusVersion: number) {
  return { sel: postoId, tab: "denuncias" as const, focusVersion: focusVersion + 1, busca: "" };
}

export function obterEstadoPostoSelecionado(postoId: string | null) {
  return { id: postoId ?? "", aberto: !!postoId };
}

export interface MapaComFoco {
  getZoom(): number;
  flyTo(coordenadas: [number, number], zoom: number, options: { animate: boolean; duration: number }): unknown;
}

export function focarPostoNoMapa(mapa: MapaComFoco | null, pins: MapaPin[], postoId: string | null) {
  const pin = pins.find((item) => item.postoId === postoId);
  if (!mapa || !pin) return;
  mapa.flyTo([pin.lat, pin.lng], Math.max(mapa.getZoom(), 12), { animate: true, duration: 0.5 });
}
