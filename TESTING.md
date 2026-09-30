# Verification record

Verified locally on 28–29 September 2026 using Node.js 24 and the Codex browser.

## Automated checks

- `npm run build`: passed. Vite produced a production browser bundle (about 322 kB JS / 100 kB gzip).
- `npm test`: **19 tests passed, 0 failed** using isolated SQLite databases.
- `npm audit --omit=dev`: reported **0 production dependency vulnerabilities** on the verification date.

The integration tests cover:

1. Database health, seed data, search and category/price filters, including SQL-like search input.
2. Registration validation, password hashing, HTTP-only cookies and rejection of public admin-role injection.
3. Authentication, CSRF-origin/header checks and customer/admin authorization boundaries.
4. Persistent favorites and user isolation.
5. Philippine address validation and address ownership.
6. Cart add/update/remove and stock limits.
7. Checkout server-side totals, item snapshots, stock decrement and idempotent retries.
8. Valid order transitions and exactly-once stock restoration on cancellation.
9. Two competing checkouts for one remaining piece: exactly one order succeeds.
10. Admin product creation/editing/archive and preservation of prior order prices.
11. Upload signature rejection and admin-only access.
12. Inventory, sales, customer history and order endpoints.
13. Logout token revocation and subsequent login.

## Browser checks

- Desktop storefront and product detail inspected at 1440 px wide.
- Tablet catalog at 900 px: three product columns, no horizontal overflow.
- Mobile catalog at 390 px: two product columns, working filter disclosure, no horizontal overflow.
- Product image loading checked; the photos are bundled locally.
- Registered a test customer, saved a favorite, added an item to the bag, and completed shipping → review → GCash simulation → order confirmation on mobile.
- Confirmed the order number, purchased items, address, payment label and server-calculated total.
- Signed in to the test administrator account; viewed overview, products, orders, customers, sales and account addresses.
- Cancelled the browser test order and verified inventory returned.
- Created a temporary product using an actual JPEG upload, edited its price, then archived it through the confirmation dialog.
- Checked empty-state behavior and persisted sessions across a server restart.
- Browser console: no warnings or errors in the final checked pages.
- Optional WebMCP tools registered successfully. Catalog search returned the matching item; add-to-bag updated the visible cart. Invalid inputs failed without modifying data. The verification bag was emptied afterward.

The local preview retains the test account, a cancelled test order and an archived test product. A fresh installation from the ZIP seeds only the eight sample products and categories. No runtime database, credentials or uploaded test files are included in the ZIP.

## Limits of verification

- SQLite upgrade verified on 1 October 2026: 19 tests passed, including disk persistence, rollback, backups, transaction isolation, security configuration, proxy spoof rejection and hardened cookies/headers. Earlier browser checks describe the original UI. No deployment performed.
- Real payment providers, couriers, transactional email, password recovery and email verification are not connected. Payments are deliberately simulated.
- The Docker image was not built here because Docker was not installed in the environment.
- This is a single-store prototype. Production launch still requires the operator’s own inventory, legal/contact/returns information, HTTPS, database and upload backups, and real payment reconciliation.
- Automated accessibility auditing and assistive-technology certification were not performed. Semantic landmarks, labels, focus styles, native dialog behavior, responsive grids and image alternatives were reviewed during browser testing.
