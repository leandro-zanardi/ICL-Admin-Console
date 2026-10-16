import assert from "node:assert/strict";
import test from "node:test";
import type { PostoAmenidade } from "@workspace/api-client-react";
import {
  DIAS, horarioCompleto, horarioParaApi, hojeSaoPaulo, paraFormulario,
  valorHorarioFormulario, valorPublicavel,
} from "./posto-amenidades-form";

const field: PostoAmenidade = {
  chave: "restaurante", rotulo: "Restaurante", grupo: "Alimentação", tipo: "boolean",
  opcoes: [], interno: false, valor: "nao", fonte: "Equipe ICL",
  verificadoEm: "2026-10-16", revisarEm: null, publico: true,
  atualizadoPor: "teste@example.com", atualizadoEm: "2026-10-16T15:00:00.000Z",
};

test("formulário preserva valor negativo, visibilidade, datas e versão da leitura", () => {
  const item = paraFormulario([field]).itens[0];
  assert.equal(item.valor, "nao");
  assert.equal(item.publico, true);
  assert.equal(item.verificadoEm, "2026-10-16");
  assert.equal(item.versao, field.atualizadoEm);
});

test("horário em branco não significa posto fechado", () => {
  const vazio = valorHorarioFormulario(null);
  assert.equal(horarioCompleto(vazio), true);
  assert.equal(horarioParaApi(vazio), null);
  vazio.segunda.abertura = "06:00";
  assert.equal(horarioCompleto(vazio), false);
  assert.equal(horarioParaApi(vazio), null);
});

test("serializa fechado e 24h com horas nulas e suporta turno noturno", () => {
  const value = valorHorarioFormulario(null);
  for (const { key } of DIAS) value[key].fechado = true;
  value.segunda = { fechado: false, diaTodo: true, abertura: "", fechamento: "" };
  value.terca = { fechado: false, diaTodo: false, abertura: "22:00", fechamento: "02:00" };
  assert.equal(horarioCompleto(value), true);
  const body = horarioParaApi(value)!;
  assert.deepEqual(body.segunda, { fechado: false, diaTodo: true, abertura: null, fechamento: null });
  assert.deepEqual(body.quarta, { fechado: true, diaTodo: false, abertura: null, fechamento: null });
  assert.equal(body.terca.fechamento, "02:00");
  assert.deepEqual(horarioParaApi(valorHorarioFormulario(body)), body);
});

test("bloqueia horários contraditórios ou início igual ao fim sem opção 24h", () => {
  const value = valorHorarioFormulario(null);
  for (const { key } of DIAS) value[key].fechado = true;
  value.segunda.diaTodo = true;
  assert.equal(horarioCompleto(value), false);
  value.segunda = { fechado: false, diaTodo: false, abertura: "08:00", fechamento: "08:00" };
  assert.equal(horarioCompleto(value), false);
});

test("publicação exige valor, fonte e data e nunca permite atributo interno", () => {
  const item = paraFormulario([{ ...field, verificadoEm: hojeSaoPaulo() }]).itens[0];
  assert.equal(valorPublicavel(field, item), true);
  assert.equal(valorPublicavel(field, { ...item, fonte: "" }), false);
  assert.equal(valorPublicavel(field, { ...item, verificadoEm: "" }), false);
  assert.equal(valorPublicavel(field, { ...item, valor: "nao_verificado" }), false);
  assert.equal(valorPublicavel({ ...field, interno: true }, item), false);
  assert.equal(paraFormulario([{ ...field, interno: true }]).itens[0].publico, false);
});
