# REST API

Base URL in local development: `http://127.0.0.1:3001/api`. Responses are JSON. Error responses use `{ "error": "Human-readable message" }`. Send `Content-Type: application/json` and `X-Requested-With: SECONDHAND` for JSON mutations. Send the latter header with multipart uploads too. Browser clients send credentials to retain the HTTP-only session cookie.

## Public and authentication

| Method | Path | Details |
| --- | --- | --- |
| GET | `/health` | Database health; simulated payment mode |
| POST | `/auth/register` | `{name,email,password}`; 12–72 character password |
| POST | `/auth/login` | `{email,password}` |
| POST | `/auth/logout` | Authenticated; revokes sessions |
| GET | `/auth/me` | Current user; 401 if signed out |
| GET | `/categories` | All category IDs, names, slugs |
| GET | `/brands` | Distinct catalog brands |
| GET | `/products` | `{products,total}`; see query parameters below |
| GET | `/products/:id` | Full product with ordered images |
| GET | `/products/:id/reviews` | Buyer reviews; empty for seed inventory |

Product queries: `q` (name, brand, description, category), `category` (slug), `size`, `condition`, `brand`, `min`, `max` (pesos), `available=true`, `sort` (`newest`, `price_asc`, `price_desc`, `name`). Catalog responses currently cap at 200 matches; add pagination before operating a larger catalog.

## Customers

All endpoints require authentication. Ownership is always taken from the signed-in user, never a supplied user ID.

| Method | Path | Body / response |
| --- | --- | --- |
| PUT | `/account` | `{name}` |
| PUT | `/account/password` | `{current_password,password}`; revokes other sessions |
| GET | `/cart` | Products with quantity, current price and stock |
| POST | `/cart` | `{product_id,quantity}`; increments within available stock |
| PUT | `/cart/:productId` | `{quantity}`; sets positive quantity |
| DELETE | `/cart/:productId` | Removes item |
| GET | `/favorites` | Saved product records |
| POST | `/favorites` | `{product_id}` |
| DELETE | `/favorites/:productId` | Unsave |
| GET | `/addresses` | Owned saved addresses |
| POST | `/addresses` | Address object below |
| DELETE | `/addresses/:id` | Delete an owned address |
| POST | `/orders` | `{shipping_address,payment_method,idempotency_key}` |
| GET | `/orders` | Owned order history |
| GET | `/orders/:id` | Owned order + item snapshots; also available to admin |
| POST | `/products/:id/reviews` | `{rating:1..5,body}`; delivered purchasers only |

Address fields: `full_name`, `email`, `phone`, `address`, `barangay`, `city`, `province`, `postal_code`. Philippine mobile numbers use `09` followed by nine digits or `+639` followed by nine digits; postal codes are four digits.

`payment_method` is one of `GCash`, `Maya`, `Cash on Delivery`, `Bank Transfer`. Every method is simulated. `idempotency_key` is a UUID generated once per checkout attempt and retained for retries. Prices, discounts, totals, status and stock cannot be supplied by the customer. Checkout returns 409 if any item has insufficient stock.

## Administrators

Authentication and the database `admin` role are required.

| Method | Path | Details |
| --- | --- | --- |
| POST | `/products` | Full product payload |
| PUT | `/products/:id` | Full product payload; replaces images |
| DELETE | `/products/:id` | Archives listing |
| GET | `/admin/dashboard` | Inventory, order values and category aggregates |
| GET | `/admin/orders` | All orders with customer names and emails |
| PUT | `/admin/orders/:id` | `{status}`; validates progression and restores cancelled stock once |
| GET | `/admin/customers` | Customer details and order totals |
| GET | `/admin/customers/:id/orders` | Customer order history |
| POST | `/admin/uploads` | multipart `image`; returns `{url}` |

Product payload:

```json
{
  "name": "Blue linen button-up",
  "brand": "Unbranded",
  "category_id": 2,
  "price": 95000,
  "size": "M",
  "condition": "Excellent",
  "material": "Linen blend",
  "description": "Light wear, original buttons.",
  "measurements": {"Chest": "21 in", "Length": "29 in"},
  "stock": 1,
  "images": [{"url": "/images/shirt.jpg", "alt": "Blue shirt hanging on a wooden hanger"}]
}
```

Prices and monetary responses are integer **centavos**. Conditions: Like New, Excellent, Good, Fair. Use 1–8 images; HTTPS or local `/images/` and `/uploads/` paths. Uploads accept JPEG/PNG/WebP, maximum 5 MB.
