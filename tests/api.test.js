import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID, randomBytes } from "node:crypto";
process.env.NODE_ENV = "test";
process.env.SECURITY_MODE = "local";
process.env.SQLITE_PATH = ":memory:";
process.env.JWT_SECRET = randomBytes(48).toString("hex");
const { app } = await import("../server/app.js");
const { query, migrate, close } = await import("../server/config/db.js");
const { seed } = await import("../server/db/seed.js");
const alice = request.agent(app),
  bob = request.agent(app),
  owner = request.agent(app);
const mutation = (agent, method, url) =>
  agent[method](url).set("X-Requested-With", "SECONDHAND");
const password = randomBytes(18).toString("base64url");
const shipping = {
  full_name: "Test Customer",
  email: "test@example.test",
  phone: "09171234567",
  address: "123 Test Street",
  barangay: "Test Barangay",
  city: "Quezon City",
  province: "Metro Manila",
  postal_code: "1100",
};
let aliceId, ownerId, product, order, checkoutKey;
before(async () => {
  await migrate();
  await seed();
});
after(async () => {
  await close();
});
test("health, relational seed, categories and filtered search work", async () => {
  assert.equal((await request(app).get("/api/health")).status, 200);
  const all = await request(app).get("/api/products");
  assert.equal(all.body.total, 8);
  assert.equal((await request(app).get("/api/categories")).body.length, 10);
  assert.equal(
    (await request(app).get("/api/products?q=linen")).body.products[0].name,
    "Blue linen button-up",
  );
  assert.equal(
    (await request(app).get("/api/products?category=jeans&size=M")).body.total,
    1,
  );
  assert.equal((await request(app).get("/api/products?max=500")).body.total, 1);
  assert.equal(
    (await request(app).get("/api/products?q=%27%20OR%201%3D1--")).body.total,
    0,
  );
});
test("registration validates password, hashes it and uses HTTP-only cookie", async () => {
  assert.equal(
    (
      await mutation(alice, "post", "/api/auth/register").send({
        name: "Alice",
        email: "alice@example.test",
        password: "short",
      })
    ).status,
    400,
  );
  const r = await mutation(alice, "post", "/api/auth/register").send({
    name: "Alice",
    email: "alice@example.test",
    password,
    role: "admin",
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.role, "customer");
  assert.ok(!r.body.password_hash);
  assert.match(r.headers["set-cookie"][0], /HttpOnly/);
  aliceId = r.body.id;
  const {
    rows: [u],
  } = await query("SELECT password_hash FROM users WHERE id=$1", [aliceId]);
  assert.notEqual(u.password_hash, password);
  assert.match(u.password_hash, /^\$2/);
  assert.equal(
    (
      await mutation(alice, "post", "/api/auth/register").send({
        name: "Alice",
        email: "alice@example.test",
        password,
      })
    ).status,
    409,
  );
});
test("authentication, CSRF and role boundaries are enforced", async () => {
  assert.equal((await request(app).get("/api/cart")).status, 401);
  assert.equal((await alice.get("/api/admin/dashboard")).status, 403);
  assert.equal(
    (await alice.post("/api/cart").send({ product_id: 1 })).status,
    403,
  );
  assert.equal(
    (
      await mutation(alice, "post", "/api/cart")
        .set("Origin", "https://evil.example")
        .send({ product_id: 1 })
    ).status,
    403,
  );
  assert.equal(
    (
      await mutation(bob, "post", "/api/auth/login").send({
        email: "alice@example.test",
        password: "wrong",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await mutation(bob, "post", "/api/auth/register").send({
        name: "Bob",
        email: "bob@example.test",
        password,
      })
    ).status,
    201,
  );
  const r = await mutation(owner, "post", "/api/auth/register").send({
    name: "Owner",
    email: "owner@example.test",
    password,
  });
  ownerId = r.body.id;
  await query("UPDATE users SET role='admin' WHERE id=$1", [ownerId]);
  assert.equal((await owner.get("/api/admin/dashboard")).status, 200);
});
test("favorites persist and are isolated by user", async () => {
  assert.equal(
    (await mutation(alice, "post", "/api/favorites").send({ product_id: 1 }))
      .status,
    201,
  );
  assert.equal((await alice.get("/api/favorites")).body.length, 1);
  assert.equal((await bob.get("/api/favorites")).body.length, 0);
  await mutation(alice, "delete", "/api/favorites/1");
  assert.equal((await alice.get("/api/favorites")).body.length, 0);
});
test("addresses validate Philippine fields and enforce ownership", async () => {
  assert.equal(
    (
      await mutation(alice, "post", "/api/addresses").send({
        ...shipping,
        postal_code: "bad",
      })
    ).status,
    400,
  );
  const r = await mutation(alice, "post", "/api/addresses").send(shipping);
  assert.equal(r.status, 201);
  await mutation(bob, "delete", "/api/addresses/" + r.body.id);
  assert.equal((await alice.get("/api/addresses")).body.length, 1);
  await mutation(alice, "delete", "/api/addresses/" + r.body.id);
  assert.equal((await alice.get("/api/addresses")).body.length, 0);
});
test("cart add, update, remove and one-of-one constraints work", async () => {
  assert.equal(
    (
      await mutation(alice, "post", "/api/cart").send({
        product_id: 1,
        quantity: 2,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await mutation(alice, "post", "/api/cart").send({
        product_id: 1,
        quantity: 1,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await mutation(alice, "post", "/api/cart").send({
        product_id: 1,
        quantity: 1,
      })
    ).status,
    409,
  );
  assert.equal(
    (await mutation(alice, "put", "/api/cart/1").send({ quantity: 2 })).status,
    409,
  );
  assert.equal(
    (await mutation(alice, "put", "/api/cart/1").send({ quantity: 0 })).status,
    400,
  );
  assert.equal((await alice.get("/api/cart")).body[0].quantity, 1);
  await mutation(alice, "delete", "/api/cart/1");
  assert.equal((await alice.get("/api/cart")).body.length, 0);
});
test("checkout snapshots prices, validates method and resists repeated submissions", async () => {
  await mutation(alice, "post", "/api/cart").send({
    product_id: 1,
    quantity: 1,
  });
  checkoutKey = randomUUID();
  const input = {
    shipping_address: shipping,
    payment_method: "GCash",
    idempotency_key: checkoutKey,
    total: 1,
  };
  assert.equal(
    (
      await mutation(alice, "post", "/api/orders").send({
        ...input,
        payment_method: "Invalid",
      })
    ).status,
    400,
  );
  const r = await mutation(alice, "post", "/api/orders").send(input);
  assert.equal(r.status, 201);
  order = r.body;
  assert.equal(order.subtotal, 120000);
  assert.equal(order.total, 132000);
  assert.equal(order.payment_status, "Simulated");
  assert.equal((await request(app).get("/api/products/1")).body.stock, 0);
  assert.equal((await alice.get("/api/cart")).body.length, 0);
  const again = await mutation(alice, "post", "/api/orders").send(input);
  assert.equal(again.body.id, order.id);
  assert.equal((await alice.get("/api/orders")).body.length, 1);
  assert.equal(
    (await alice.get("/api/orders/" + order.id)).body.items[0].name,
    "Straight-leg blue denim",
  );
  assert.equal((await bob.get("/api/orders/" + order.id)).status, 404);
});
test("cancellation restores stock exactly once and terminal orders stay terminal", async () => {
  assert.equal(
    (
      await mutation(owner, "put", "/api/admin/orders/" + order.id).send({
        status: "Delivered",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await mutation(owner, "put", "/api/admin/orders/" + order.id).send({
        status: "Cancelled",
      })
    ).status,
    200,
  );
  assert.equal((await request(app).get("/api/products/1")).body.stock, 1);
  await mutation(owner, "put", "/api/admin/orders/" + order.id).send({
    status: "Cancelled",
  });
  assert.equal((await request(app).get("/api/products/1")).body.stock, 1);
  assert.equal(
    (
      await mutation(owner, "put", "/api/admin/orders/" + order.id).send({
        status: "Confirmed",
      })
    ).status,
    400,
  );
});
test("two shoppers competing for one piece cannot oversell", async () => {
  await mutation(alice, "post", "/api/cart").send({
    product_id: 2,
    quantity: 1,
  });
  await mutation(bob, "post", "/api/cart").send({ product_id: 2, quantity: 1 });
  const results = await Promise.all(
    [alice, bob].map((a) =>
      mutation(a, "post", "/api/orders").send({
        shipping_address: shipping,
        payment_method: "Maya",
        idempotency_key: randomUUID(),
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal((await request(app).get("/api/products/2")).body.stock, 0);
  const {
    rows: [r],
  } = await query(
    "SELECT COUNT(*) AS n FROM order_items WHERE product_id=2",
  );
  assert.equal(r.n, 1);
  await mutation(alice, "delete", "/api/cart/2");
  await mutation(bob, "delete", "/api/cart/2");
});
test("admin product create, edit, stock and archive preserve order snapshots", async () => {
  const payload = {
    name: "Test multi-stock shirt",
    brand: "Test",
    category_id: 2,
    price: 100000,
    size: "M",
    condition: "Excellent",
    material: "Cotton",
    description: "Integration test item.",
    measurements: { Chest: "21 in" },
    stock: 3,
    images: [{ url: "/images/shirt.jpg", alt: "Blue shirt" }],
  };
  assert.equal(
    (await mutation(alice, "post", "/api/products").send(payload)).status,
    403,
  );
  let r = await mutation(owner, "post", "/api/products").send(payload);
  assert.equal(r.status, 201);
  product = r.body;
  assert.equal(
    (
      await mutation(owner, "put", "/api/products/" + product.id).send({
        ...payload,
        name: "Updated test shirt",
      })
    ).status,
    200,
  );
  await mutation(alice, "post", "/api/cart").send({
    product_id: product.id,
    quantity: 2,
  });
  assert.equal(
    (
      await mutation(alice, "put", "/api/cart/" + product.id).send({
        quantity: 3,
      })
    ).status,
    200,
  );
  await mutation(alice, "put", "/api/cart/" + product.id).send({ quantity: 2 });
  r = await mutation(alice, "post", "/api/orders").send({
    shipping_address: shipping,
    payment_method: "Cash on Delivery",
    idempotency_key: randomUUID(),
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.shipping, 0);
  assert.equal(r.body.total, 200000);
  const o = r.body;
  await mutation(owner, "put", "/api/products/" + product.id).send({
    ...payload,
    price: 50000,
  });
  await mutation(owner, "delete", "/api/products/" + product.id);
  assert.equal(
    (await request(app).get("/api/products/" + product.id)).status,
    404,
  );
  const snapshot = await alice.get("/api/orders/" + o.id);
  assert.equal(snapshot.body.items[0].price, 100000);
  assert.equal(snapshot.body.items[0].name, "Updated test shirt");
});
test("admin upload checks binary signatures and customer access", async () => {
  assert.equal(
    (await mutation(alice, "post", "/api/admin/uploads")).status,
    403,
  );
  assert.equal(
    (
      await mutation(owner, "post", "/api/admin/uploads").attach(
        "image",
        Buffer.from("<script>alert(1)</script>"),
        "bad.jpg",
      )
    ).status,
    400,
  );
});
test("admin analytics, order listing and customer history return real records", async () => {
  const d = (await owner.get("/api/admin/dashboard")).body;
  assert.ok(d.orders >= 3);
  assert.ok(Number(d.revenue) > 0);
  assert.ok(d.categories.length);
  assert.ok((await owner.get("/api/admin/orders")).body.length >= 3);
  assert.equal((await owner.get("/api/admin/customers")).body.length, 2);
  assert.ok(
    (await owner.get("/api/admin/customers/" + aliceId + "/orders")).body
      .length >= 2,
  );
});
test("logout revokes the cookie token and login remains functional", async () => {
  const login = await mutation(alice, "post", "/api/auth/login").send({
    email: "alice@example.test",
    password,
  });
  assert.equal(login.status, 200);
  const oldCookie = login.headers["set-cookie"][0].split(";")[0];
  assert.equal((await mutation(alice, "post", "/api/auth/logout")).status, 200);
  assert.equal(
    (await request(app).get("/api/auth/me").set("Cookie", oldCookie)).status,
    401,
  );
  assert.equal((await alice.get("/api/auth/me")).status, 401);
  assert.equal(
    (
      await mutation(alice, "post", "/api/auth/login").send({
        email: "alice@example.test",
        password,
      })
    ).status,
    200,
  );
});
