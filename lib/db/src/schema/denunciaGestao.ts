import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Dados de gestao do backoffice sobre uma denuncia do app (prazo, decisao, retirada). */
export const denunciaGestaoTable = pgTable("denuncia_gestao", {
  denunciaId: uuid("denuncia_id").primaryKey(),
  prazoEm: timestamp("prazo_em", { withTimezone: true }),
  prazoDefinidoPor: text("prazo_definido_por"),
  decisao: text("decisao"), // procedente | improcedente
  decisaoObservacao: text("decisao_observacao"),
  decisaoPor: text("decisao_por"),
  decisaoEm: timestamp("decisao_em", { withTimezone: true }),
  retiradaEm: timestamp("retirada_em", { withTimezone: true }),
  retiradaOrigem: text("retirada_origem"), // cliente | posto | master
  retiradaResolucao: text("retirada_resolucao"),
  retiradaPor: text("retirada_por"),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type DenunciaGestao = typeof denunciaGestaoTable.$inferSelect;
