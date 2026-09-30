import { query, transaction } from "../config/db.js";
export async function seed() {
  const cats = [
    "T-Shirts",
    "Shirts",
    "Pants",
    "Jeans",
    "Jackets",
    "Dresses",
    "Skirts",
    "Shoes",
    "Bags",
    "Accessories",
  ];
  for (const name of cats)
    await query(
      "INSERT INTO categories(name,slug) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [name, name.toLowerCase()],
    );
  const {
    rows: [count],
  } = await query("SELECT COUNT(*) AS n FROM products");
  if (count.n) return;
  const items = [
    [
      "Straight-leg blue denim",
      "Unbranded",
      "Jeans",
      1200,
      "M",
      "Excellent",
      "100% cotton",
      "A familiar straight leg with a soft, worn-in wash. Light fading at the knees; no holes. Waist measured flat, doubled.",
      { Waist: "32 in", Rise: "11 in", Inseam: "30 in", Hem: "8 in" },
      "jeans",
    ],
    [
      "The everyday white tee",
      "Unbranded",
      "T-Shirts",
      450,
      "L",
      "Good",
      "100% cotton",
      "A simple white crewneck with a relaxed fit. Some gentle wash wear around the collar. No visible stains.",
      { Chest: "22 in", Length: "28 in", Shoulder: "19 in", Sleeve: "8 in" },
      "tee",
    ],
    [
      "Blue linen button-up",
      "Unbranded",
      "Shirts",
      950,
      "M",
      "Excellent",
      "Linen blend",
      "An easy blue button-up for warm days. Breathable fabric, a relaxed collar and all original buttons.",
      { Chest: "21 in", Length: "29 in", Shoulder: "18 in", Sleeve: "24 in" },
      "shirt",
    ],
    [
      "Brown shearling jacket",
      "Unbranded",
      "Jackets",
      1850,
      "L",
      "Good",
      "Synthetic shearling",
      "A warm brown jacket with a textured lining. Light wear on the cuffs gives it character. Best for cooler days.",
      { Chest: "23 in", Length: "27 in", Shoulder: "20 in", Sleeve: "25 in" },
      "jacket",
    ],
    [
      "Denim mini skirt",
      "Unbranded",
      "Skirts",
      850,
      "S",
      "Excellent",
      "Cotton denim",
      "A classic blue mini with a gently faded wash. Check the flat measurements for your fit.",
      { Waist: "27 in", Hip: "36 in", Length: "16 in" },
      "skirt",
    ],
    [
      "White cotton polo",
      "Unbranded",
      "Shirts",
      650,
      "M",
      "Like New",
      "Cotton pique",
      "Clean white polo with a neat collar and short sleeves. Very little visible wear.",
      { Chest: "21 in", Length: "28 in", Shoulder: "18 in", Sleeve: "9 in" },
      "polo",
    ],
    [
      "Brown crossbody bag",
      "Unbranded",
      "Bags",
      780,
      "One size",
      "Good",
      "Leather",
      "A small everyday crossbody. Natural surface creases and light edge wear; zip works smoothly.",
      { Width: "9 in", Height: "7 in", Depth: "3 in" },
      "bag",
    ],
    [
      "Two-tone low-top sneakers",
      "Unbranded",
      "Shoes",
      1450,
      "EU 39",
      "Good",
      "Leather and rubber",
      "White and black low-tops with light creasing across the toe. Soles cleaned, with visible everyday wear.",
      { Insole: "25 cm" },
      "shoes",
    ],
  ];
  await transaction(async (tx) => {
    for (const [
      name,
      brand,
      cat,
      price,
      size,
      condition,
      material,
      description,
      measurements,
      image,
    ] of items) {
      const {
        rows: [category],
      } = await tx.query("SELECT id FROM categories WHERE name=$1", [cat]);
      const {
        rows: [p],
      } = await tx.query(
        "INSERT INTO products(name,brand,category_id,price,size,condition,material,description,measurements) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
        [
          name,
          brand,
          category.id,
          price * 100,
          size,
          condition,
          material,
          description,
          JSON.stringify(measurements),
        ],
      );
      await tx.query(
        "INSERT INTO product_images(product_id,url,alt) VALUES($1,$2,$3)",
        [p.id, `/images/${image}.jpg`, name],
      );
    }
  });
}
