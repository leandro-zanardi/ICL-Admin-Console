import { pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const acessosTable = pgTable("acessos", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  nome: text("nome"),
  papel: text("papel").notNull(), // master | posto
  escopoTipo: text("escopo_tipo").notNull().default("todos"), // todos | posto | rede
  postoId: uuid("posto_id"),
  cnpjRaiz: text("cnpj_raiz"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Acesso = typeof acessosTable.$inferSelect;
