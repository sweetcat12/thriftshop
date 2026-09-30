# SECONDHAND

A working React + Vite storefront with an Express REST API and a SQLite database. Designed around an independent Philippine thrift shop: restrained typography, large photographs, real measurements, one-of-one stock, and pesos.

**This is a production-oriented student prototype, not a live retail operation.** Payments are explicitly simulated; no funds are collected or shipments created. Seed photos and measurements illustrate fictional inventory, not actual sale listings.

## Start locally

Requires Node.js 24.13+ and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env`; if script policy blocks npm, use `npm.cmd`.

Open **http://127.0.0.1:5173**. The API runs on **http://127.0.0.1:3001**. Development initializes and seeds the database automatically. Eight sample products, ten categories and local photographs are included. No shared passwords, reviews or fictitious sales are seeded.

SQLite is built into Node.js. No database service is required. Data persists in .data/secondhand.sqlite. Use Node 24.13+ and persistent local disk with one application instance. Node may print an experimental SQLite warning.

Run npm run db:backup for a consistent snapshot in .data/backups. Back up uploads separately. To restore, stop the app, preserve the existing database and WAL/SHM files, then restore the snapshot at SQLITE_PATH.

For an existing PGlite installation, stop the server and run npm run db:import-pglite before npm ci removes the old dependencies. The importer backs up the old database, preserves IDs and password hashes, verifies counts and relationships, and refuses to overwrite an existing SQLite file. Follow its dependency instructions if the old PGlite module is unavailable. The original database remains untouched.

## Create an administrator

Stop the development server first. Set your own credentials in `.env`:

```dotenv
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-own-long-password
ADMIN_NAME=Shop owner
```

Then run:

```sh
npm run admin:create
npm run dev
```

Sign in and open `/admin`. The command creates or promotes the specified user, hashes the password, and revokes prior sessions for that account. Remove `ADMIN_PASSWORD` from `.env` after provisioning. Public registration can only create customer accounts. There is no hardcoded admin password or UI role switch.

For a fresh customer journey, register at `/register` with a password of at least 12 characters. The delivered local preview may retain a clearly named browser-test account and cancelled test order from verification; these are excluded from the source ZIP and do not appear in a fresh installation.

## What works

- Home, collection, category and search pages with sorting and database-driven filters.
- Product details, image galleries, actual measurements, condition notes, related products and verified-purchase reviews.
- Registration, sign-in/out, profile editing and password changes.
- Database-backed cart and wishlist, saved Philippine addresses, order history and order details.
- Shipping → review → simulated payment → confirmation for GCash, Maya, COD and bank transfer.
- Admin product creation/editing, JPEG/PNG/WebP uploads, stock updates, marking sold and removing listings.
- Admin order management, customer order history, inventory and category sales summaries.
- Responsive grids (4 desktop / 3 tablet / 2 mobile), mobile menu, labelled forms, keyboard focus, native modal focus trapping, useful empty/error/loading states.

Shipping is ₱120, free from ₱2,000. Bags do not reserve stock. Checkout uses a database transaction, acquires a SQLite write lock before checking stock, calculates totals from current database prices, snapshots purchased details and decrements stock atomically. A per-customer idempotency key prevents repeated requests from creating duplicate orders. A cancelled order restores stock once. Archived products disappear from the shop while past orders retain their original information.

Order progression is `Pending → Confirmed → Packed → Shipped → Delivered`. Pending, confirmed and packed orders can be cancelled; shipped/delivered orders cannot be cancelled through this prototype. All orders have the payment status `Simulated`; sales summaries are therefore demonstration order values, not real revenue.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Express and Vite together |
| `npm run build` | Build the browser application to `dist/` |
| `npm start` | Serve API, uploads and built frontend from Express |
| `npm test` | Isolated integration tests using SQLite |
| `npm run db:migrate` | Apply the initial schema |
| `npm run db:seed` | Insert sample inventory if the catalog is empty |
| `npm run admin:create` | Provision an admin from environment variables |

## Deployment security setting

Pushing this repository does not deploy the website. See [DEPLOYMENT.md](DEPLOYMENT.md) for the server operator.

Set SECURITY_MODE=local for local HTTP development, or SECURITY_MODE=deployment for HTTPS enforcement, Secure cookies, HSTS and browser upgrade-insecure-requests protection. Restart the server after changing it. This is an environment setting, not a public button. Authentication, admin protection, password hashing, origin checks and rate limits remain active in both modes. NODE_ENV=production refuses local mode.

Before real selling, replace demo listings with your own inventory and photos, connect a real payment provider using server-side confirmation/webhooks, establish shipping/returns/contact policies, and arrange transactional email. The app intentionally does not pretend that those services are connected. Password reset and email verification are not implemented; password changes require the current password.

## API and security

See [API.md](API.md) for endpoints and payload conventions. All state-changing requests require `X-Requested-With: SECONDHAND`; browser mutations also undergo trusted-origin checking. Sessions use signed JWTs in HTTP-only, SameSite=Lax cookies. Logout and password changes revoke prior tokens through a database token version. Roles are loaded from the database on every protected request.

Passwords use bcrypt, inputs use Zod, SQL uses parameter binding, order/cart updates use transactions, and the server applies Helmet, JSON size limits, an explicit CORS allowlist and rate limits. Uploads are admin-only, capped at 5 MB, checked by file signature and stored with generated names. Secrets and hashes never appear in API responses. Destructive product actions archive listings rather than removing order history.

## Project structure

```text
src/
  components/   Shared controls and product grid
  context/      Session, cart, favorites and notifications
  hooks/        API resource loading
  layouts/      Header, navigation, footer
  pages/        Storefront, account, checkout and admin routes
  services/     Fetch wrapper and peso formatting
server/
  config/       SQLite adapter and deployment settings
  db/           Schema and catalog seed
  middleware/   Authentication, authorization and validation helpers
  models/       Product queries
  routes/       REST endpoints
  services/     Transactional checkout and order transitions
  validators/   Request schemas
  scripts/      Initialization and admin provisioning
tests/          Integration and security-boundary tests
public/images/  Locally bundled sample photography
```

## Verification

See [TESTING.md](TESTING.md) for the verified scope and remaining deployment limitations. Photos are credited in [IMAGE-CREDITS.md](IMAGE-CREDITS.md).
