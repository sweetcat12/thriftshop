import 'dotenv/config';
import { cp, access, mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../config/sqlite.js';

const source = path.resolve(process.env.PGLITE_PATH || '.data/postgres');
const target = path.resolve(process.env.SQLITE_PATH || '.data/secondhand.sqlite');
const exists = async file => access(file).then(() => true, () => false);
if (await exists(target)) throw new Error('SQLite destination already exists. Refusing to overwrite it.');
if (!await exists(source)) throw new Error('Legacy PGlite folder was not found. Set PGLITE_PATH.');
let PGlite;
try {
  ({ PGlite } = await import(process.env.LEGACY_PGLITE_MODULE ? pathToFileURL(path.resolve(process.env.LEGACY_PGLITE_MODULE)).href : '@electric-sql/pglite'));
} catch { throw new Error('For this one-time import, run: npm install --no-save --package-lock=false @electric-sql/pglite@0.3.14. Then run db:import-pglite and finally npm ci.'); }
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const snapshot = path.join(path.dirname(target), 'legacy-backups', `pglite-${stamp}`);
await mkdir(path.dirname(snapshot), { recursive: true });
// Work from a snapshot; the original database is never opened or modified.
await cp(source, snapshot, { recursive: true, errorOnExist: true, force: false });
const legacy = new PGlite(snapshot);
const temporary = `${target}.importing-${randomUUID()}`;
const sqlite = openDatabase(temporary);
const tables = ['users','categories','products','product_images','cart_items','favorites','addresses','orders','order_items','reviews'];
const counts = {};
let success = false;
try {
  await sqlite.exec(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await sqlite.transaction(async tx => {
    for (const table of tables) {
      const { rows } = await legacy.query(`SELECT * FROM ${table}`);
      for (const row of rows) {
        const keys = Object.keys(row);
        const values = keys.map(key => {
          const value = row[key];
          if (value instanceof Date) return value.toISOString();
          if (value && typeof value === 'object') return JSON.stringify(value);
          return value;
        });
        await tx.query(`INSERT INTO ${table} (${keys.map(k => `"${k}"`).join(',')}) VALUES (${keys.map((_,i)=>`$${i+1}`).join(',')})`, values);
      }
      const { rows: [count] } = await tx.query(`SELECT COUNT(*) AS n FROM ${table}`);
      if (count.n !== rows.length) throw new Error(`Row-count mismatch in ${table}`);
      counts[table] = count.n;
    }
    if ((await tx.query('PRAGMA foreign_key_check')).rows.length) throw new Error('Imported relationships failed validation.');
    const { rows: [integrity] } = await tx.query('PRAGMA integrity_check');
    if (integrity.integrity_check !== 'ok') throw new Error('SQLite integrity check failed.');
  });
  await sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  success = true;
} finally {
  await sqlite.close();
  await legacy.close();
  if (!success) for (const file of [temporary, `${temporary}-wal`, `${temporary}-shm`]) await rm(file, { force: true });
}
await rename(temporary, target);
console.log('Import complete. Original PGlite database preserved.');
console.log(JSON.stringify({ counts, target, backup: snapshot }, null, 2));
