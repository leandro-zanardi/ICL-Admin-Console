import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * Pool de conexao com o banco do app ICL (somente leitura, exceto andamentos,
 * status de denuncia e recompensas). Nunca executar DDL neste banco.
 */
export function getAppPool(): pg.Pool {
  if (!pool) {
    const url = process.env.APP_DATABASE_URL;
    if (!url) {
      throw new Error("APP_DATABASE_URL must be set to read the ICL app database.");
    }
    pool = new Pool({ connectionString: url, max: 5 });
  }
  return pool;
}
