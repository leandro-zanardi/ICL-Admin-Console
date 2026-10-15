import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Ultimo score de veracidade calculado por denuncia, com os fatores que o explicam. */
export const denunciaScoresTable = pgTable("denuncia_scores", {
  denunciaId: uuid("denuncia_id").primaryKey(),
  score: integer("score").notNull(),
  faixa: text("faixa").notNull(), // confiavel | atencao | suspeita
  fatores: jsonb("fatores").notNull(),
  calculadoEm: timestamp("calculado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type DenunciaScore = typeof denunciaScoresTable.$inferSelect;
