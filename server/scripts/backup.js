import { mkdir } from 'node:fs/promises';
import { backupDatabase, close } from '../config/db.js';
await mkdir('.data/backups', { recursive: true });
const destination = `.data/backups/secondhand-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
try { await backupDatabase(destination); console.log(`SQLite backup saved: ${destination}`); }
finally { await close(); }
