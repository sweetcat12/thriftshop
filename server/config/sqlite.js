import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const database = new DatabaseSync(filename, { timeout: 5000 });
  database.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
  let pending = Promise.resolve();
  const enqueue = fn => {
    const result = pending.then(fn);
    pending = result.catch(() => {});
    return result;
  };
  function run(sql, params = []) {
    const values = Object.fromEntries(params.map((value, i) => [`$${i + 1}`, typeof value === 'boolean' ? Number(value) : value]));
    const statement = database.prepare(sql);
    const rows = (params.length ? statement.all(values) : statement.all()).map(row => {
      const result = { ...row };
      for (const key of ['images', 'measurements', 'shipping_address']) {
        if (typeof result[key] === 'string') result[key] = JSON.parse(result[key]);
      }
      if ('archived' in result) result.archived = Boolean(result.archived);
      return result;
    });
    return { rows, rowCount: rows.length };
  }
  return {
    query: (sql, params) => enqueue(() => run(sql, params)),
    exec: sql => enqueue(() => database.exec(sql)),
    // Queue every operation so requests cannot enter another request's transaction.
    // BEGIN IMMEDIATE also excludes competing SQLite writers in other processes.
    transaction: fn => enqueue(async () => {
      database.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn({ query: async (sql, params) => run(sql, params) });
        database.exec('COMMIT');
        return result;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    }),
    backup: destination => enqueue(() => backup(database, destination)),
    close: () => enqueue(() => database.close()),
  };
}
