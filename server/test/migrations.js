import { readFile, readdir } from 'node:fs/promises';

const directory = new URL('../../prisma/migrations/', import.meta.url);
export async function applyMigration(db, name) {
  const sql = await readFile(new URL(`${name}/migration.sql`, directory), 'utf8');
  for (const statement of sql.split(';').filter((value) => value.trim())) await db.$executeRawUnsafe(statement);
}
export async function applyMigrations(db) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const name of entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()) await applyMigration(db, name);
}
