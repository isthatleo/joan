import { config } from "dotenv";
config();

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(process.env.DATABASE_URL, { fullResults: false });

const baseDb = drizzle(sql, { schema });

type RawQueryArgs = [TemplateStringsArray, ...unknown[]] | [string, unknown[]?];

async function queryRaw(...args: RawQueryArgs) {
  if (Array.isArray(args[0]) && "raw" in args[0]) {
    const [strings, ...params] = args as [TemplateStringsArray, ...unknown[]];
    return sql(strings, ...params);
  }

  const [query, params] = args as [string, unknown[]?];
  return sql.query(query, params);
}

export const db = Object.assign(baseDb, {
  $queryRaw: queryRaw,
  $sql: sql,
});
