import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env, useSsl } from "../config/env";

const pool = new Pool({
	connectionString: env.DATABASE_URL,
	ssl: useSsl,
});

export const db = drizzle(pool);
export type DrizzleDb = typeof db;
