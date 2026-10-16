import {
  boolean,
  date,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Dados complementares mantidos pelo backoffice, sem gravar no banco do app ICL. */
export const postoAtributosTable = pgTable(
  "posto_atributos",
  {
    postoId: text("posto_id").notNull(),
    chave: text("chave").notNull(),
    valor: jsonb("valor").$type<JsonValue>(),
    fonte: text("fonte"),
    verificadoEm: date("verificado_em", { mode: "string" }),
    revisarEm: date("revisar_em", { mode: "string" }),
    publico: boolean("publico").notNull().default(false),
    atualizadoPor: text("atualizado_por"),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.postoId, table.chave] })],
);

/** Registro append-only das mudanças; necessário para preservar a trilha da bandeira. */
export const postoAtributosHistoricoTable = pgTable("posto_atributos_historico", {
  id: serial("id").primaryKey(),
  postoId: text("posto_id").notNull(),
  chave: text("chave").notNull(),
  valorAnterior: jsonb("valor_anterior").$type<JsonValue>(),
  valorNovo: jsonb("valor_novo").$type<JsonValue>(),
  alteradoPor: text("alterado_por").notNull(),
  alteradoEm: timestamp("alterado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPostoAtributoSchema = createInsertSchema(postoAtributosTable);
export type PostoAtributo = typeof postoAtributosTable.$inferSelect;
export type PostoAtributoHistorico = typeof postoAtributosHistoricoTable.$inferSelect;
