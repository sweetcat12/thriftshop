import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readSecurityConfig } from '../server/config/security.js';

const valid = { NODE_ENV:'production', SECURITY_MODE:'deployment', APP_ORIGIN:'https://shop.example.test', JWT_SECRET:randomBytes(48).toString('hex') };
test('deployment configuration fails closed on insecure settings', () => {
  assert.equal(readSecurityConfig(valid).deployment, true);
  assert.throws(()=>readSecurityConfig({...valid,SECURITY_MODE:'local'}), /Production requires/);
  assert.throws(()=>readSecurityConfig({...valid,APP_ORIGIN:'http://shop.example.test'}), /HTTPS/);
  assert.throws(()=>readSecurityConfig({...valid,APP_ORIGIN:''}), /APP_ORIGIN/);
  assert.throws(()=>readSecurityConfig({...valid,JWT_SECRET:''}), /JWT_SECRET/);
  assert.throws(()=>readSecurityConfig({...valid,TRUSTED_PROXIES:'true'}), /TRUSTED_PROXIES/);
  assert.throws(()=>readSecurityConfig({...valid,TRUSTED_PROXIES:'0.0.0.0/0'}), /TRUSTED_PROXIES/);
  assert.throws(()=>readSecurityConfig({...valid,APP_ORIGIN:'https://shop.example.test/path'}), /origins/);
});
function probe(mode, proxies='') {
  const script = `
    import request from 'supertest';
    const {app}=await import('./server/app.js');
    const {migrate,close}=await import('./server/config/db.js');
    await migrate();
    const plain=await request(app).get('/api/health');
    const forwarded=await request(app).get('/api/health').set('X-Forwarded-Proto','https');
    const registration=await request(app).post('/api/auth/register').set('X-Forwarded-Proto','https').set('X-Requested-With','SECONDHAND').set('Origin',process.env.APP_ORIGIN).send({name:'Security Test',email:'security@example.test',password:'security-test-password'});
    const untrusted=await request(app).post('/api/auth/register').set('X-Forwarded-Proto','https').set('X-Requested-With','SECONDHAND').set('Origin','https://evil.example').send({});
    const admin=await request(app).get('/api/admin/dashboard').set('X-Forwarded-Proto','https');
    console.log(JSON.stringify({plain:plain.status,forwarded:forwarded.status,register:registration.status,cookie:registration.headers['set-cookie']?.[0]||'',hsts:forwarded.headers['strict-transport-security']||'',csp:forwarded.headers['content-security-policy'],untrusted:untrusted.status,admin:admin.status}));
    await close();
  `;
  const r=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:process.cwd(),encoding:'utf8',env:{...process.env,...valid,NODE_ENV:'test',SECURITY_MODE:mode,SQLITE_PATH:':memory:',TRUSTED_PROXIES:proxies,APP_ORIGIN:mode==='local'?'http://127.0.0.1:5173':valid.APP_ORIGIN},timeout:20000});
  assert.equal(r.status,0,r.stderr);
  return JSON.parse(r.stdout.trim());
}
test('local mode permits HTTP but keeps authorization, CSRF and HTTP-only cookies',()=>{
  const r=probe('local');
  assert.equal(r.plain,200);assert.equal(r.register,201);assert.match(r.cookie,/HttpOnly/);assert.doesNotMatch(r.cookie,/; Secure/);assert.equal(r.hsts,'');assert.equal(r.untrusted,403);assert.equal(r.admin,401);
});
test('deployment mode rejects HTTP and spoofed proxy headers by default',()=>{
  const r=probe('deployment');assert.equal(r.plain,426);assert.equal(r.forwarded,426);assert.equal(r.register,426);
});
test('deployment mode accepts HTTPS from explicitly trusted proxy, sets hardened headers and cookies',()=>{
  const r=probe('deployment','127.0.0.1,::1,::ffff:127.0.0.1');
  assert.equal(r.plain,426);assert.equal(r.forwarded,200);assert.equal(r.register,201);assert.match(r.cookie,/; Secure/);assert.match(r.cookie,/HttpOnly/);assert.match(r.hsts,/max-age=31536000/);assert.match(r.csp,/upgrade-insecure-requests/);assert.equal(r.untrusted,403);assert.equal(r.admin,401);
});
