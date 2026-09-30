import { query } from "../config/db.js";
export const productSelect = `SELECT p.*,c.name AS category,c.slug AS category_slug, COALESCE((SELECT json_group_array(json_object('id',i.id,'url',i.url,'alt',i.alt) ORDER BY i.position,i.id) FROM product_images i WHERE i.product_id=p.id),'[]') AS images FROM products p JOIN categories c ON c.id=p.category_id`;
export async function listProducts(filters = {}) {
  const params = [];
  const conditions = ["NOT p.archived"];
  const add = (value, sql) => {
    params.push(value);
    conditions.push(sql.replaceAll("?", `$${params.length}`));
  };
  if (filters.q)
    add(
      `%${String(filters.q).slice(0, 150)}%`,
      "(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ? OR c.name LIKE ?)",
    );
  if (filters.category) add(filters.category, "c.slug=?");
  for (const key of ["size", "condition", "brand"])
    if (filters[key]) add(filters[key], `p.${key}=?`);
  if (filters.min && Number.isFinite(Number(filters.min)))
    add(Number(filters.min) * 100, "p.price>=?");
  if (filters.max && Number.isFinite(Number(filters.max)))
    add(Number(filters.max) * 100, "p.price<=?");
  if (filters.available === "true") conditions.push("p.stock>0");
  const sorts = {
    newest: "p.created_at DESC,p.id ASC",
    price_asc: "p.price ASC,p.id ASC",
    price_desc: "p.price DESC,p.id ASC",
    name: "p.name ASC",
  };
  const { rows } = await query(
    `${productSelect} WHERE ${conditions.join(" AND ")} ORDER BY ${sorts[filters.sort] || sorts.newest} LIMIT 200`,
    params,
  );
  return rows;
}
export async function getProduct(id) {
  return (
    await query(`${productSelect} WHERE p.id=$1 AND NOT p.archived`, [id])
  ).rows[0];
}
