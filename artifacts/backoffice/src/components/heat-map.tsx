import { useEffect, useRef } from "react";
import L from "@/lib/leaflet-setup";
import "leaflet.heat";
import type { MapaPin, PontoCalor } from "@workspace/api-client-react";

export function HeatMap({ pins, calor, selectedId, onSelect }: { pins: MapaPin[]; calor: PontoCalor[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([-15.78, -47.93], 4);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    if (calor.length) {
      const max = Math.max(...calor.map((c) => c.peso), 1);
      L.heatLayer(calor.map((c) => [c.lat, c.lng, c.peso]), { radius: 26, blur: 20, max, minOpacity: 0.25, gradient: { 0.2: "#1d6b8a", 0.45: "#f4b81c", 0.7: "#f0640c", 1: "#c4162a" } }).addTo(g);
    }
    pins.forEach((p) => {
      const sel = p.postoId === selectedId;
      const color = p.vencidas > 0 ? "#c4162a" : p.abertas > 0 ? "#f0640c" : p.seloIcl ? "#1f7a5a" : "#0f2230";
      const r = Math.min(14, 5 + Math.sqrt(p.denuncias) * 2);
      const mk = L.circleMarker([p.lat, p.lng], { radius: sel ? r + 4 : r, color: sel ? "#0f2230" : "#fdf8f0", weight: sel ? 3 : 1.5, fillColor: color, fillOpacity: 0.92 });
      const tip = document.createElement("div");
      const titulo = document.createElement("b");
      titulo.textContent = p.nome;
      tip.append(titulo, document.createElement("br"), `${p.abertas} abertas · ${p.vencidas} vencidas · ${p.checkins} check-ins`);
      mk.bindTooltip(tip, { direction: "top", offset: [0, -6] });
      mk.on("click", () => onSelectRef.current(p.postoId));
      mk.addTo(g);
    });
    if (!fitted.current && pins.length) {
      m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])).pad(0.15), { maxZoom: 13 });
      fitted.current = true;
    }
  }, [pins, calor, selectedId]);

  useEffect(() => {
    const p = pins.find((x) => x.postoId === selectedId);
    if (p && map.current) map.current.panTo([p.lat, p.lng], { animate: true });
  }, [selectedId, pins]);

  return <div ref={el} data-testid="map-heat" className="absolute inset-0 z-0" />;
}
