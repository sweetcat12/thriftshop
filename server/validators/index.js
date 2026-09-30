import { z } from "zod";
const text = (max = 200) => z.string().trim().min(1).max(max);
export const passwordSchema = z.string().min(12).max(72).refine(
  value => Buffer.byteLength(value, 'utf8') <= 72,
  'Password must fit within 72 UTF-8 bytes.'
);
export const registerSchema = z.object({
  name: text(100),
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: passwordSchema,
});
export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(1).max(72),
});
export const addressSchema = z.object({
  full_name: text(100),
  email: z.email().max(254),
  phone: z
    .string()
    .trim()
    .regex(
      /^(?:\+63|0)9\d{9}$/,
      "Enter a Philippine mobile number (09… or +639…).",
    ),
  address: text(),
  barangay: text(100),
  city: text(100),
  province: text(100),
  postal_code: z.string().regex(/^\d{4}$/, "Use a four-digit postal code."),
});
export const productSchema = z.object({
  name: text(160),
  brand: text(100),
  category_id: z.coerce.number().int().positive(),
  price: z.coerce.number().int().min(0).max(100000000),
  size: text(40),
  condition: z.enum(["Like New", "Excellent", "Good", "Fair"]),
  material: text(200),
  description: text(4000),
  measurements: z.record(z.string().max(60), z.string().max(100)),
  stock: z.coerce.number().int().min(0).max(10000),
  images: z
    .array(
      z.object({
        url: z
          .string()
          .max(2000)
          .refine(
            (s) =>
              /^\/images\/[\w.-]+$|^\/uploads\/[\w.-]+$/.test(s) ||
              /^https:\/\//.test(s),
            "Use HTTPS or a local image path.",
          ),
        alt: text(200),
      }),
    )
    .min(1)
    .max(8),
});
export const cartSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(10000).default(1),
});
export const orderSchema = z.object({
  shipping_address: addressSchema,
  payment_method: z.enum([
    "GCash",
    "Maya",
    "Cash on Delivery",
    "Bank Transfer",
  ]),
  idempotency_key: z.uuid(),
});
export const statusSchema = z.object({
  status: z.enum([
    "Pending",
    "Confirmed",
    "Packed",
    "Shipped",
    "Delivered",
    "Cancelled",
  ]),
});
