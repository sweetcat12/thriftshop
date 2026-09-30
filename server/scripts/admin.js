import "dotenv/config";
import bcrypt from "bcryptjs";
import { query, migrate, close } from "../config/db.js";
const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = "Shop owner" } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12 || Buffer.byteLength(ADMIN_PASSWORD, 'utf8') > 72)
  throw new Error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env.",
  );
await migrate();
await query(
  "INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'admin') ON CONFLICT(email) DO UPDATE SET role='admin', password_hash=EXCLUDED.password_hash, token_version=users.token_version+1",
  [
    ADMIN_NAME,
    ADMIN_EMAIL.toLowerCase().trim(),
    await bcrypt.hash(ADMIN_PASSWORD, 12),
  ],
);
console.log("Admin account created/updated.");
await close();
