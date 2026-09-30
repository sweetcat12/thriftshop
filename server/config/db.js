import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { openDatabase } from './sqlite.js';
const filename = process.env.SQLITE_PATH || '.data/secondhand.sqlite';
if (process.env.NODE_ENV === 'production' && filename === ':memory:') throw new Error('Production requires a persistent SQLITE_PATH.');
const database = openDatabase(filename);
export const query = database.query;
export const transaction = database.transaction;
export const close = database.close;
export const backupDatabase = database.backup;
export async function migrate() {
  const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await database.exec(sql);
}
