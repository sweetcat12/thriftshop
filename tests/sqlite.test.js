import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {openDatabase} from '../server/config/sqlite.js';

test('SQLite persists data, rolls back failed transactions, and creates a consistent backup',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'secondhand-sqlite-'));
  const filename=path.join(dir,'test.sqlite');
  let db=openDatabase(filename);
  try {
    await db.exec('CREATE TABLE stock(id INTEGER PRIMARY KEY, quantity INTEGER NOT NULL CHECK(quantity>=0)); INSERT INTO stock VALUES(1,1);');
    await assert.rejects(db.transaction(async tx=>{await tx.query('UPDATE stock SET quantity=0 WHERE id=1');throw Error('rollback');}));
    assert.equal((await db.query('SELECT quantity FROM stock')).rows[0].quantity,1);
    await db.backup(path.join(dir,'backup.sqlite'));
    await db.close();db=openDatabase(filename);
    assert.equal((await db.query('SELECT quantity FROM stock')).rows[0].quantity,1);
    const copy=openDatabase(path.join(dir,'backup.sqlite'));
    assert.equal((await copy.query('SELECT quantity FROM stock')).rows[0].quantity,1);await copy.close();
  } finally {await db.close();await rm(dir,{recursive:true,force:true});}
});
test('queries outside a transaction cannot observe uncommitted data',async()=>{
  const db=openDatabase(':memory:');
  try{
    await db.exec('CREATE TABLE stock(quantity INTEGER); INSERT INTO stock VALUES(1)');
    const tx=db.transaction(async t=>{await t.query('UPDATE stock SET quantity=0');await new Promise(r=>setTimeout(r,10));throw Error('rollback');});
    const read=db.query('SELECT quantity FROM stock');
    await assert.rejects(tx);assert.equal((await read).rows[0].quantity,1);
  }finally{await db.close();}
});
