import { Router } from "express";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query, transaction } from "../config/db.js";
import {
  auth,
  admin,
  session,
  cookieOptions,
  validate,
  fail,
} from "../middleware/security.js";
import {
  registerSchema,
  loginSchema,
  addressSchema,
  productSchema,
  cartSchema,
  orderSchema,
  statusSchema,
  passwordSchema,
} from "../validators/index.js";
import { getProduct, listProducts, productSelect } from "../models/products.js";
import { createOrder, updateStatus } from "../services/orders.js";
export const api = Router();
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
});
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});
api.get("/health", async (req, res) => {
  await query("SELECT 1");
  res.json({ status: "ok", payments: "simulated" });
});
api.post(
  "/auth/register",
  authLimit,
  validate(registerSchema),
  async (req, res) => {
    const { name, email, password } = req.valid;
    const hash = await bcrypt.hash(password, 12);
    const {
      rows: [user],
    } = await query(
      "INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email,role,token_version",
      [name, email, hash],
    );
    session(res, user);
    res.status(201).json(publicUser(user));
  },
);
api.post("/auth/login", authLimit, validate(loginSchema), async (req, res) => {
  const {
    rows: [user],
  } = await query("SELECT * FROM users WHERE email=$1", [req.valid.email]);
  const match = await bcrypt.compare(
    req.valid.password,
    user?.password_hash ||
      "$2b$12$eImiTXuWVxfM37uY4JANjQeGfdPPNpBp/DdJJAYupufNk9XsSNmK.",
  );
  if (!user || !match) throw fail(401, "Email or password is incorrect.");
  session(res, user);
  res.json(publicUser(user));
});
api.post("/auth/logout", auth, async (req, res) => {
  await query("UPDATE users SET token_version=token_version+1 WHERE id=$1", [
    req.user.id,
  ]);
  res.clearCookie("session", cookieOptions).json({ ok: true });
});
api.get("/auth/me", auth, (req, res) => res.json(publicUser(req.user)));
api.put(
  "/account",
  auth,
  validate(z.object({ name: z.string().trim().min(1).max(100) })),
  async (req, res) => {
    const {
      rows: [user],
    } = await query(
      "UPDATE users SET name=$1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=$2 RETURNING id,name,email,role",
      [req.valid.name, req.user.id],
    );
    res.json(user);
  },
);
api.put(
  "/account/password",
  auth,
  validate(
    z.object({
      current_password: z.string().max(72),
      password: passwordSchema,
    }),
  ),
  async (req, res) => {
    const {
      rows: [user],
    } = await query("SELECT * FROM users WHERE id=$1", [req.user.id]);
    if (!(await bcrypt.compare(req.valid.current_password, user.password_hash)))
      throw fail(400, "Current password is incorrect.");
    const {
      rows: [updated],
    } = await query(
      "UPDATE users SET password_hash=$1,token_version=token_version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=$2 RETURNING *",
      [await bcrypt.hash(req.valid.password, 12), req.user.id],
    );
    session(res, updated);
    res.json({ ok: true });
  },
);
api.get("/categories", async (req, res) =>
  res.json((await query("SELECT * FROM categories ORDER BY id")).rows),
);
api.get("/brands", async (req, res) =>
  res.json(
    (
      await query(
        "SELECT DISTINCT brand FROM products WHERE NOT archived ORDER BY brand",
      )
    ).rows.map((r) => r.brand),
  ),
);
api.get("/products", async (req, res) => {
  const products = await listProducts(req.query);
  res.json({ products, total: products.length });
});
api.get("/products/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) throw fail(404, "Piece not found.");
  const p = await getProduct(req.params.id);
  if (!p) throw fail(404, "This piece is no longer listed.");
  res.json(p);
});
async function saveProduct(data, id) {
  return transaction(async (tx) => {
    const { images, ...p } = data;
    const values = [
      p.name,
      p.brand,
      p.category_id,
      p.price,
      p.size,
      p.condition,
      p.material,
      p.description,
      JSON.stringify(p.measurements),
      p.stock,
    ];
    let product;
    if (id) {
      product = (
        await tx.query(
          "UPDATE products SET name=$1,brand=$2,category_id=$3,price=$4,size=$5,condition=$6,material=$7,description=$8,measurements=$9,stock=$10,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=$11 AND NOT archived RETURNING *",
          [...values, id],
        )
      ).rows[0];
      if (!product) throw fail(404, "Product not found.");
      await tx.query("DELETE FROM product_images WHERE product_id=$1", [id]);
    } else
      product = (
        await tx.query(
          "INSERT INTO products(name,brand,category_id,price,size,condition,material,description,measurements,stock) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
          values,
        )
      ).rows[0];
    for (const [position, img] of images.entries())
      await tx.query(
        "INSERT INTO product_images(product_id,url,alt,position) VALUES($1,$2,$3,$4)",
        [product.id, img.url, img.alt, position],
      );
    return product;
  });
}
api.post("/products", auth, admin, validate(productSchema), async (req, res) =>
  res.status(201).json(await saveProduct(req.valid)),
);
api.put(
  "/products/:id",
  auth,
  admin,
  validate(productSchema),
  async (req, res) => res.json(await saveProduct(req.valid, req.params.id)),
);
api.delete("/products/:id", auth, admin, async (req, res) => {
  const r = await query(
    "UPDATE products SET archived=TRUE,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=$1 RETURNING id",
    [req.params.id],
  );
  if (!r.rows.length) throw fail(404, "Product not found.");
  res.json({ ok: true });
});
api.get("/cart", auth, async (req, res) => {
  const { rows } = await query(
    `${productSelect} JOIN cart_items ci ON ci.product_id=p.id WHERE ci.user_id=$1 ORDER BY ci.updated_at DESC`,
    [req.user.id],
  );
  const { rows: quantities } = await query(
    "SELECT product_id,quantity FROM cart_items WHERE user_id=$1",
    [req.user.id],
  );
  res.json(
    rows.map((p) => ({
      ...p,
      quantity: quantities.find((i) => i.product_id === p.id).quantity,
    })),
  );
});
async function setCart(user, id, quantity, increment) {
  return transaction(async (tx) => {
    await tx.query("SELECT id FROM users WHERE id=$1", [user]);
    const {
      rows: [p],
    } = await tx.query(
      "SELECT stock,archived FROM products WHERE id=$1",
      [id],
    );
    if (!p || p.archived) throw fail(404, "This piece is no longer listed.");
    const {
      rows: [old],
    } = await tx.query(
      "SELECT quantity FROM cart_items WHERE user_id=$1 AND product_id=$2",
      [user, id],
    );
    const next = quantity + (increment ? old?.quantity || 0 : 0);
    if (next > p.stock)
      throw fail(
        409,
        `Only ${p.stock} available. This piece may already be in your bag.`,
      );
    await tx.query(
      "INSERT INTO cart_items(user_id,product_id,quantity) VALUES($1,$2,$3) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')",
      [user, id, next],
    );
  });
}
api.post("/cart", auth, validate(cartSchema), async (req, res) => {
  await setCart(req.user.id, req.valid.product_id, req.valid.quantity, true);
  res.status(201).json({ ok: true });
});
api.put(
  "/cart/:id",
  auth,
  validate(z.object({ quantity: z.number().int().min(1).max(10000) })),
  async (req, res) => {
    await setCart(req.user.id, req.params.id, req.valid.quantity, false);
    res.json({ ok: true });
  },
);
api.delete("/cart/:id", auth, async (req, res) => {
  await query("DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2", [
    req.user.id,
    req.params.id,
  ]);
  res.json({ ok: true });
});
api.get("/favorites", auth, async (req, res) =>
  res.json(
    (
      await query(
        `${productSelect} JOIN favorites f ON f.product_id=p.id WHERE f.user_id=$1 AND NOT p.archived ORDER BY f.created_at DESC`,
        [req.user.id],
      )
    ).rows,
  ),
);
api.post(
  "/favorites",
  auth,
  validate(z.object({ product_id: z.number().int().positive() })),
  async (req, res) => {
    if (!(await getProduct(req.valid.product_id)))
      throw fail(404, "Piece not found.");
    await query(
      "INSERT INTO favorites(user_id,product_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [req.user.id, req.valid.product_id],
    );
    res.status(201).json({ ok: true });
  },
);
api.delete("/favorites/:id", auth, async (req, res) => {
  await query("DELETE FROM favorites WHERE user_id=$1 AND product_id=$2", [
    req.user.id,
    req.params.id,
  ]);
  res.json({ ok: true });
});
api.get("/addresses", auth, async (req, res) =>
  res.json(
    (
      await query("SELECT * FROM addresses WHERE user_id=$1 ORDER BY id", [
        req.user.id,
      ])
    ).rows,
  ),
);
api.post("/addresses", auth, validate(addressSchema), async (req, res) => {
  const a = req.valid;
  res
    .status(201)
    .json(
      (
        await query(
          "INSERT INTO addresses(user_id,full_name,email,phone,address,barangay,city,province,postal_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
          [
            req.user.id,
            a.full_name,
            a.email,
            a.phone,
            a.address,
            a.barangay,
            a.city,
            a.province,
            a.postal_code,
          ],
        )
      ).rows[0],
    );
});
api.delete("/addresses/:id", auth, async (req, res) => {
  await query("DELETE FROM addresses WHERE id=$1 AND user_id=$2", [
    req.params.id,
    req.user.id,
  ]);
  res.json({ ok: true });
});
api.post("/orders", auth, validate(orderSchema), async (req, res) =>
  res.status(201).json(await createOrder(req.user.id, req.valid)),
);
api.get("/orders", auth, async (req, res) =>
  res.json(
    (
      await query(
        "SELECT o.*, (SELECT SUM(quantity) FROM order_items WHERE order_id=o.id) AS item_count FROM orders o WHERE user_id=$1 ORDER BY id DESC",
        [req.user.id],
      )
    ).rows,
  ),
);
api.get("/orders/:id", auth, async (req, res) => {
  const {
    rows: [order],
  } = await query("SELECT * FROM orders WHERE id=$1 AND (user_id=$2 OR $3)", [
    req.params.id,
    req.user.id,
    req.user.role === "admin",
  ]);
  if (!order) throw fail(404, "Order not found.");
  res.json({
    ...order,
    items: (
      await query("SELECT * FROM order_items WHERE order_id=$1", [order.id])
    ).rows,
  });
});
api.get("/products/:id/reviews", async (req, res) =>
  res.json(
    (
      await query(
        "SELECT r.id,r.rating,r.body,r.created_at,u.name FROM reviews r JOIN users u ON u.id=r.user_id WHERE product_id=$1 ORDER BY r.id DESC",
        [req.params.id],
      )
    ).rows,
  ),
);
api.post(
  "/products/:id/reviews",
  auth,
  validate(
    z.object({
      rating: z.number().int().min(1).max(5),
      body: z.string().trim().min(1).max(1000),
    }),
  ),
  async (req, res) => {
    const { rows } = await query(
      "SELECT 1 FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.user_id=$1 AND oi.product_id=$2 AND o.status='Delivered'",
      [req.user.id, req.params.id],
    );
    if (!rows.length)
      throw fail(403, "Reviews are available after your order is delivered.");
    res
      .status(201)
      .json(
        (
          await query(
            "INSERT INTO reviews(user_id,product_id,rating,body) VALUES($1,$2,$3,$4) RETURNING *",
            [req.user.id, req.params.id, req.valid.rating, req.valid.body],
          )
        ).rows[0],
      );
  },
);
api.use("/admin", auth, admin);
api.get("/admin/dashboard", async (req, res) => {
  const {
    rows: [inventory],
  } = await query(
    "SELECT COUNT(*) AS total, COUNT(*) FILTER(WHERE stock>0) AS available, COUNT(*) FILTER(WHERE stock=0) AS sold, COUNT(*) FILTER(WHERE stock=1) AS low_stock FROM products WHERE NOT archived",
  );
  const {
    rows: [sales],
  } = await query(
    "SELECT COUNT(*) AS orders,COALESCE(SUM(total) FILTER(WHERE status<>'Cancelled'),0) AS revenue FROM orders",
  );
  const { rows: categories } = await query(
    "SELECT c.name,COALESCE(SUM(oi.quantity),0) AS units,COALESCE(SUM(oi.price*oi.quantity),0) AS revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id JOIN categories c ON c.id=p.category_id WHERE o.status<>'Cancelled' GROUP BY c.name ORDER BY units DESC",
  );
  res.json({ ...inventory, ...sales, categories });
});
api.get("/admin/orders", async (req, res) =>
  res.json(
    (
      await query(
        "SELECT o.*,u.name AS customer,u.email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC",
      )
    ).rows,
  ),
);
api.put("/admin/orders/:id", validate(statusSchema), async (req, res) =>
  res.json(await updateStatus(req.params.id, req.valid.status)),
);
api.get("/admin/customers", async (req, res) =>
  res.json(
    (
      await query(
        "SELECT u.id,u.name,u.email,u.created_at,COUNT(o.id) AS orders,COALESCE(SUM(o.total) FILTER(WHERE o.status<>'Cancelled'),0) AS spent FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.role='customer' GROUP BY u.id ORDER BY u.id DESC",
      )
    ).rows,
  ),
);
api.get("/admin/customers/:id/orders", async (req, res) =>
  res.json(
    (
      await query("SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC", [
        req.params.id,
      ])
    ).rows,
  ),
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
api.post("/admin/uploads", upload.single("image"), async (req, res) => {
  const b = req.file?.buffer;
  if (!b) throw fail(400, "Choose a JPEG, PNG or WebP image.");
  let ext;
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) ext = "jpg";
  else if (
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    ext = "png";
  else if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  )
    ext = "webp";
  else throw fail(400, "Only JPEG, PNG and WebP images are allowed.");
  await mkdir("uploads", { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(`uploads/${filename}`, b);
  res.status(201).json({ url: `/uploads/${filename}` });
});
