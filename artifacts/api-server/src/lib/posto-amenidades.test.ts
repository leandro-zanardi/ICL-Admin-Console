import assert from "node:assert/strict";
import test from "node:test";
import type { PostoAtributo } from "@workspace/db";
import {
  abertoAgora, CATALOGO_AMENIDADES, dataCalendarioValida, definicaoAmenidade,
  hojeEmSaoPaulo, normalizarValorAmenidade, projetarAmenidadesPublicas,
  validarValorAmenidade, valorPadraoAmenidade, type HorariosFuncionamento,
} from "./posto-amenidades";

const INSTANTE = new Date("2026-10-16T15:00:00.000Z"); // sexta, 12h em Brasília
const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] as const;

function semana(): HorariosFuncionamento {
  return Object.fromEntries(DIAS.map((dia) => [dia, {
    fechado: true, diaTodo: false, abertura: null, fechamento: null,
  }])) as HorariosFuncionamento;
}

function atributo(chave: string, overrides: Partial<PostoAtributo> = {}): PostoAtributo {
  return {
    postoId: "posto-teste", chave, valor: "sim", fonte: "Fonte restrita de teste",
    verificadoEm: "2026-10-16", revisarEm: "2026-11-16", publico: true,
    atualizadoPor: "teste@example.com", atualizadoEm: INSTANTE, ...overrides,
  };
}

test("todo catálogo tem chave única e dados ausentes não viram 'não'", () => {
  assert.equal(new Set(CATALOGO_AMENIDADES.map((item) => item.chave)).size, CATALOGO_AMENIDADES.length);
  for (const campo of CATALOGO_AMENIDADES) {
    const valor = valorPadraoAmenidade(campo);
    assert.equal(validarValorAmenidade(campo.chave, valor), true, campo.chave);
    assert.notEqual(valor, "nao");
  }
  assert.equal(definicaoAmenidade("campo_inexistente"), undefined);
});

test("estados, cadastro regulatório e fuso só aceitam suas opções", () => {
  assert.equal(validarValorAmenidade("loja_conveniencia", "talvez"), false);
  assert.equal(validarValorAmenidade("situacao_cadastro_anp", "autorizado"), true);
  assert.equal(validarValorAmenidade("situacao_cadastro_anp", "em_operacao"), false);
  assert.equal(validarValorAmenidade("status_operacional", "em_operacao"), true);
  assert.equal(validarValorAmenidade("fuso_horario", "America/Manaus"), true);
  assert.equal(validarValorAmenidade("fuso_horario", "Mars/Olympus"), false);
  assert.equal(validarValorAmenidade("bandeira_atual", "a".repeat(121)), false);
});

test("horário desconhecido, incompleto e contraditório não confirma abertura", () => {
  assert.equal(validarValorAmenidade("horarios_funcionamento", null), true);
  assert.equal(validarValorAmenidade("horarios_funcionamento", {}), false);
  const h = semana();
  h.sexta = { fechado: true, diaTodo: true, abertura: null, fechamento: null };
  assert.equal(validarValorAmenidade("horarios_funcionamento", h), false);
  assert.equal(abertoAgora(null, null, INSTANTE, "America/Sao_Paulo"), null);
  assert.equal(abertoAgora(semana(), "em_operacao", INSTANTE), null);
});

test("aberto agora respeita horário, fuso local e fechamento exclusivo", () => {
  const h = semana();
  h.sexta = { fechado: false, diaTodo: false, abertura: "11:00", fechamento: "13:00" };
  assert.equal(abertoAgora(h, "em_operacao", INSTANTE, "America/Sao_Paulo"), true);
  assert.equal(abertoAgora(h, "em_operacao", INSTANTE, "America/Rio_Branco"), false);
  assert.equal(abertoAgora(h, "em_operacao", new Date("2026-10-16T16:00:00Z"), "America/Sao_Paulo"), false);
  h.sexta = { fechado: false, diaTodo: true, abertura: null, fechamento: null };
  assert.equal(abertoAgora(h, null, INSTANTE, "America/Sao_Paulo"), true);
  assert.equal(abertoAgora(h, "fechado_temporariamente", INSTANTE, "America/Sao_Paulo"), false);
  assert.equal(abertoAgora(h, "encerrado_permanentemente", INSTANTE, "America/Sao_Paulo"), false);
  assert.equal(abertoAgora(h, "suspenso", INSTANTE, "America/Sao_Paulo"), false);
});

test("turno atravessa meia-noite e também a virada de domingo para segunda", () => {
  const h = semana();
  h.domingo = { fechado: false, diaTodo: false, abertura: "22:00", fechamento: "02:00" };
  assert.equal(abertoAgora(h, null, new Date("2026-10-19T04:00:00Z"), "America/Sao_Paulo"), true);
  assert.equal(abertoAgora(h, null, new Date("2026-10-19T05:00:00Z"), "America/Sao_Paulo"), false);
});

test("valida datas reais e usa calendário de São Paulo para revisão", () => {
  assert.equal(dataCalendarioValida("2026-02-30"), false);
  assert.equal(dataCalendarioValida("2024-02-29"), true);
  assert.equal(dataCalendarioValida("2026-2-01"), false);
  assert.equal(hojeEmSaoPaulo(new Date("2026-10-17T01:00:00Z")), "2026-10-16");
});

test("projeção pública preserva 'não', omite desconhecidos, privados, vencidos e segurança", () => {
  const rows = [
    atributo("loja_conveniencia"),
    atributo("restaurante", { valor: "nao" }),
    atributo("gnv", { valor: "nao_verificado" }),
    atributo("chuveiro", { publico: false }),
    atributo("pix", { revisarEm: "2026-10-15" }),
    atributo("cartao", { verificadoEm: null }),
    atributo("wi_fi", { fonte: null }),
    atributo("gasolina", { verificadoEm: "2026-10-17" }),
    atributo("bomba_criptografada"),
    atributo("chave_fora_catalogo"),
    atributo("equipamento_verificado_icl"),
  ];
  const result = projetarAmenidadesPublicas(rows, INSTANTE);
  assert.deepEqual(result.itens.map((item) => item.chave), [
    "loja_conveniencia", "restaurante", "equipamento_verificado_icl",
  ]);
  assert.equal(result.itens[1].valor, "nao");
  assert.equal(result.abertoAgora, null);
  for (const item of result.itens) {
    assert.deepEqual(Object.keys(item).sort(), ["chave", "grupo", "rotulo", "valor", "verificadoEm"]);
    assert.equal(JSON.stringify(item).includes("teste@example.com"), false);
    assert.equal(JSON.stringify(item).includes("Fonte restrita"), false);
  }
});

test("horários públicos são normalizados e exigem um fuso público verificado", () => {
  const h = semana();
  h.sexta = { fechado: false, diaTodo: true, abertura: null, fechamento: null };
  const comExtras = { ...h, configuracaoInterna: "não publicar", sexta: { ...h.sexta, detalheInterno: "não publicar" } };
  const normalizado = normalizarValorAmenidade("horarios_funcionamento", comExtras);
  assert.equal(JSON.stringify(normalizado).includes("não publicar"), false);
  const rows = [
    atributo("horarios_funcionamento", { valor: comExtras }),
    atributo("fuso_horario", { valor: "America/Sao_Paulo" }),
    atributo("status_operacional", { valor: "em_operacao" }),
  ];
  assert.equal(projetarAmenidadesPublicas(rows, INSTANTE).abertoAgora, true);
  assert.equal(projetarAmenidadesPublicas(rows.slice(0, 1), INSTANTE).abertoAgora, null);
  assert.equal(projetarAmenidadesPublicas([
    atributo("status_operacional", { valor: "suspenso" }),
  ], INSTANTE).abertoAgora, false);
});
