import assert from "node:assert/strict";
import test from "node:test";
import type { MapaPin } from "@workspace/api-client-react";
import { buscarPins, criarParametrosMapa, focarPostoNoMapa, obterEstadoPostoSelecionado, selecionarResultadoBusca } from "./map-search";

const pins: MapaPin[] = [
  {
    postoId: "posto-sao-luis",
    nome: "Posto Central",
    cnpj: "12.345.678/0001-90",
    municipio: "São Luís",
    lat: -2.53,
    lng: -44.3,
    denuncias: 3,
    abertas: 1,
    vencidas: 0,
    checkins: 8,
    seloIcl: true,
  },
  {
    postoId: "posto-curitiba",
    nome: "Auto Posto Curitiba",
    cnpj: "98.765.432/0001-10",
    municipio: "Curitiba",
    lat: -25.43,
    lng: -49.27,
    denuncias: 1,
    abertas: 0,
    vencidas: 0,
    checkins: 4,
    seloIcl: false,
  },
];

test("busca posto pelo nome", () => {
  assert.deepEqual(buscarPins(pins, "central").map((pin) => pin.postoId), ["posto-sao-luis"]);
});

test("busca município com ou sem acentos", () => {
  assert.deepEqual(buscarPins(pins, "São Luís").map((pin) => pin.postoId), ["posto-sao-luis"]);
  assert.deepEqual(buscarPins(pins, "Sao Luis").map((pin) => pin.postoId), ["posto-sao-luis"]);
});

test("busca CNPJ com pontuação ou somente números", () => {
  assert.deepEqual(buscarPins(pins, "12.345.678/0001-90").map((pin) => pin.postoId), ["posto-sao-luis"]);
  assert.deepEqual(buscarPins(pins, "12345678000190").map((pin) => pin.postoId), ["posto-sao-luis"]);
});

test("selecionar um resultado limpa a busca, abre denúncias e incrementa o foco", () => {
  assert.deepEqual(selecionarResultadoBusca("posto-sao-luis", 4), {
    sel: "posto-sao-luis",
    tab: "denuncias",
    focusVersion: 5,
    busca: "",
  });
});

test("o posto selecionado mantém os detalhes aptos a abrir e é focado no mapa", () => {
  const selection = selecionarResultadoBusca("posto-sao-luis", 0);
  const detailState = obterEstadoPostoSelecionado(selection.sel);
  const moves: Array<{ coordenadas: [number, number]; zoom: number; options: { animate: boolean; duration: number } }> = [];
  const mapa = {
    getZoom: () => 7,
    flyTo: (coordenadas: [number, number], zoom: number, options: { animate: boolean; duration: number }) => {
      moves.push({ coordenadas, zoom, options });
    },
  };

  focarPostoNoMapa(mapa, pins, selection.sel);

  assert.equal(selection.sel, pins[0].postoId);
  assert.deepEqual(detailState, { id: "posto-sao-luis", aberto: true });
  assert.deepEqual(moves, [{
    coordenadas: [-2.53, -44.3],
    zoom: 12,
    options: { animate: true, duration: 0.5 },
  }]);
});

test("filtros do mapa são construídos sem incluir a busca textual", () => {
  assert.deepEqual(criarParametrosMapa({ dias: "90", categoria: "combustivel", status: "aberta" }), {
    dias: 90,
    categoria: "combustivel",
    status: "aberta",
  });
  assert.deepEqual(criarParametrosMapa({ dias: "30", categoria: "", status: "" }), {
    dias: 30,
    categoria: undefined,
    status: undefined,
  });
});
