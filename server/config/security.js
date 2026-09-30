import 'dotenv/config';
import { isIP } from 'node:net';
export function readSecurityConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const mode = env.SECURITY_MODE || (production ? 'deployment' : 'local');
  if (!['local', 'deployment'].includes(mode)) throw new Error('SECURITY_MODE must be local or deployment.');
  if (production && mode !== 'deployment') throw new Error('Production requires SECURITY_MODE=deployment.');
  const deployment = mode === 'deployment';
  const origins = (env.APP_ORIGIN || (deployment ? '' : 'http://127.0.0.1:5173,http://localhost:5173')).split(',').map(s => s.trim()).filter(Boolean);
  if (!origins.length) throw new Error('Set APP_ORIGIN to your HTTPS storefront origin.');
  for (const origin of origins) {
    let url;
    try { url = new URL(origin); } catch { throw new Error('APP_ORIGIN must contain valid origins.'); }
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('APP_ORIGIN must be exact http(s) origins without paths, wildcards or credentials.');
    if (deployment && url.protocol !== 'https:') throw new Error('Deployment security requires HTTPS APP_ORIGIN values.');
  }
  if (deployment && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) throw new Error('Deployment security requires a persistent JWT_SECRET of at least 32 characters.');
  const trustedProxies = (env.TRUSTED_PROXIES || '').split(',').map(s => s.trim()).filter(Boolean);
  for (const value of trustedProxies) {
    const [address, mask, extra] = value.split('/');
    const version = isIP(address);
    if (!version || extra !== undefined || (mask !== undefined && (!/^\d+$/.test(mask) || Number(mask) < 1 || Number(mask) > (version === 4 ? 32 : 128)))) throw new Error('TRUSTED_PROXIES must be specific IP addresses or CIDRs; never true, a hop count, or a catch-all network.');
  }
  return { mode, deployment, production, origins, trustedProxies };
}
export const security = readSecurityConfig();
