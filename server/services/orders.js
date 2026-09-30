import { transaction } from "../config/db.js";
import { fail } from "../middleware/security.js";
export async function createOrder(userId, data) {
  return transaction(async (tx) => {
    // BEGIN IMMEDIATE serializes the stock check and decrement across SQLite writers.
    await tx.query("SELECT id FROM users WHERE id=$1", [userId]);
    const {
      rows: [existing],
    } = await tx.query(
      "SELECT * FROM orders WHERE user_id=$1 AND idempotency_key=$2",
      [userId, data.idempotency_key],
    );
    if (existing) return existing;
    const { rows: items } = await tx.query(
      "SELECT p.*,ci.quantity FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.user_id=$1 ORDER BY p.id",
      [userId],
    );
    if (!items.length) throw fail(400, "Your bag is empty.");
    for (const p of items)
      if (p.archived || p.stock < p.quantity)
        throw fail(
          409,
          `${p.name} is no longer available in that quantity. Please update your bag.`,
        );
    const subtotal = items.reduce((s, p) => s + p.price * p.quantity, 0),
      shipping = subtotal >= 200000 ? 0 : 12000;
    const {
      rows: [order],
    } = await tx.query(
      "INSERT INTO orders(user_id,subtotal,shipping,total,shipping_address,payment_method,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [
        userId,
        subtotal,
        shipping,
        subtotal + shipping,
        JSON.stringify(data.shipping_address),
        data.payment_method,
        data.idempotency_key,
      ],
    );
    const number = `SH-${new Date().getFullYear()}-${String(order.id).padStart(5, "0")}`;
    await tx.query("UPDATE orders SET order_number=$1 WHERE id=$2", [
      number,
      order.id,
    ]);
    for (const p of items) {
      const {
        rows: [img],
      } = await tx.query(
        "SELECT url FROM product_images WHERE product_id=$1 ORDER BY position,id LIMIT 1",
        [p.id],
      );
      await tx.query(
        "INSERT INTO order_items(order_id,product_id,name,size,image,price,quantity) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [order.id, p.id, p.name, p.size, img?.url || null, p.price, p.quantity],
      );
      await tx.query(
        "UPDATE products SET stock=stock-$1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=$2",
        [p.quantity, p.id],
      );
    }
    await tx.query("DELETE FROM cart_items WHERE user_id=$1", [userId]);
    return { ...order, order_number: number };
  });
}
export async function updateStatus(id, status) {
  return transaction(async (tx) => {
    const {
      rows: [order],
    } = await tx.query("SELECT * FROM orders WHERE id=$1", [id]);
    if (!order) throw fail(404, "Order not found.");
    const allowed = {
      Pending: ["Confirmed", "Cancelled"],
      Confirmed: ["Packed", "Cancelled"],
      Packed: ["Shipped", "Cancelled"],
      Shipped: ["Delivered"],
      Delivered: [],
      Cancelled: [],
    };
    if (status === order.status) return order;
    if (!allowed[order.status].includes(status))
      throw fail(400, `Cannot change ${order.status} to ${status}.`);
    if (status === "Cancelled") {
      const { rows } = await tx.query(
        "SELECT product_id,quantity FROM order_items WHERE order_id=$1 ORDER BY product_id",
        [id],
      );
      for (const i of rows)
        if (i.product_id)
          await tx.query(
            "UPDATE products SET stock=stock+$1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=$2",
            [i.quantity, i.product_id],
          );
    }
    return (
      await tx.query(
        "UPDATE orders SET status=$1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=$2 RETURNING *",
        [status, id],
      )
    ).rows[0];
  });
}
