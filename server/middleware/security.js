import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { query } from "../config/db.js";
import { security } from "../config/security.js";
export const production = process.env.NODE_ENV === "production";
export const secret =
  process.env.JWT_SECRET ||
  (!security.deployment ? randomBytes(48).toString("hex") : null);
if (!secret || secret.length < 32)
  throw new Error("JWT_SECRET must have at least 32 characters.");
export const cookieOptions = {
  httpOnly: true,
  secure: security.deployment,
  sameSite: "lax",
  path: "/",
};
export function session(res, user) {
  res.cookie(
    "session",
    jwt.sign({ sub: String(user.id), v: user.token_version }, secret, {
      expiresIn: "7d",
      issuer: "secondhand",
      audience: "secondhand",
    }),
    { ...cookieOptions, maxAge: 7 * 86400000 },
  );
}
export async function auth(req, res, next) {
  try {
    const payload = jwt.verify(req.cookies.session, secret, {
      issuer: "secondhand",
      audience: "secondhand",
      algorithms: ["HS256"],
    });
    const {
      rows: [user],
    } = await query(
      "SELECT id,name,email,role,token_version FROM users WHERE id=$1",
      [payload.sub],
    );
    if (!user || user.token_version !== payload.v)
      return res.status(401).json({ error: "Please sign in to continue." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Please sign in to continue." });
  }
}
export function admin(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "This page is for the shop team." });
  next();
}
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success)
      return res
        .status(400)
        .json({
          error: result.error.issues
            .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
            .join("; "),
        });
    req.valid = result.data;
    next();
  };
}
export function fail(status, message) {
  return Object.assign(new Error(message), { status });
}
