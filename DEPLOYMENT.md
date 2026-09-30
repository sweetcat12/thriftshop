# Deployment handoff

This is source code only. Use Node.js 24.13+ on a server with persistent local disk and one application instance.

1. Run npm ci and npm run build.
2. Configure NODE_ENV=production, SECURITY_MODE=deployment, APP_ORIGIN=https://your-real-domain, and a persistent random JWT_SECRET of at least 32 characters. Generate it using Node crypto.randomBytes(48).toString('hex').
3. Set SQLITE_PATH=.data/secondhand.sqlite, PORT=3001 and HOST=127.0.0.1 for a same-host proxy. Run npm run db:migrate. Seed only if sample inventory is wanted.
4. Provision an administrator with ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters), then npm run admin:create. Remove the provisioning password afterward.
5. Run npm start behind an HTTPS reverse proxy with a valid certificate. Set TRUSTED_PROXIES to the exact proxy IP/CIDR seen by Express; leave empty for direct connections. For a same-host loopback proxy, 127.0.0.1 may be appropriate. Container addresses differ.
6. Restrict backend access to the proxy with host binding/firewall rules. The proxy must overwrite forwarded headers, not accept client-supplied values. Never trust every address.
7. Run npm run db:backup regularly, protect backups and uploads separately, and test restoration.

Deployment mode rejects HTTP with status 426, including health checks. Run health checks through the trusted HTTPS proxy. It enables Secure cookies, HSTS and browser upgrade-insecure-requests. Local mode permits HTTP; production refuses local mode. Restart after environment changes.

TLS certificates, firewall rules and network DDoS protection remain infrastructure responsibilities. Never commit .env, database files or uploads. SQLite needs persistent local disk; avoid ephemeral/serverless storage. Rate limits are process-local; scaling requires a storage and shared-limiter redesign.

Docker Compose is an optional example, not tested here. Set APP_ORIGIN, JWT_SECRET and the actual TRUSTED_PROXIES in the host environment. It binds port 3001 to host loopback and uses persistent named volumes. Do not remove data volumes when updating.

Payments remain simulated; payment reconciliation, transactional email, password recovery, fulfillment and shop policies require integration before real sales.
