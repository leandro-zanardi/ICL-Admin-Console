import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const configuracoesTable = pgTable("configuracoes", {
  chave: text("chave").primaryKey(),
  valor: jsonb("valor").notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});
