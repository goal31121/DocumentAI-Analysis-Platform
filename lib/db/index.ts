import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, sessions, accounts, verifications, documents, conversations, messages, usage } from './schema';

// Note: In Next.js runtime, environment variables are automatically loaded.
// For standalone scripts, import '../scripts/load-env' at the top of the script file.

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set. Database operations will fail.');
}

const schema = {
  users,
  sessions,
  accounts,
  verifications,
  documents,
  conversations,
  messages,
  usage,
};

const client = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL)
  : (null as unknown as ReturnType<typeof postgres>);

export const db = client ? drizzle(client, { schema }) : (null as unknown as ReturnType<typeof drizzle>);

export type Database = typeof db;
