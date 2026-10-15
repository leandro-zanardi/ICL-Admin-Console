import { boolean, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Andamentos registrados pelo backoffice. Espelhados no banco do app quando a tabela existe la. */
export const andamentosTable = pgTable("andamentos", {
  id: serial("id").primaryKey(),
  denunciaId: uuid("denuncia_id").notNull(),
  status: text("status").notNull(),
  orgao: text("orgao"),
  mensagem: text("mensagem").notNull(),
  autorEmail: text("autor_email").notNull(),
  autorPapel: text("autor_papel").notNull(),
  espelhado: boolean("espelhado").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Andamento = typeof andamentosTable.$inferSelect;
