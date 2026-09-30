import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import path from "node:path";
import { api } from "./routes/api.js";
import { security } from "./config/security.js";
import { requireSecureTransport } from "./middleware/transport.js";
export const app = express();
const origins = security.origins;
app.disable("x-powered-by");
if (security.trustedProxies.length) app.set('trust proxy', security.trustedProxies);
app.use(
  helmet({
    strictTransportSecurity: security.deployment ? { maxAge: 31536000, includeSubDomains: false } : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: security.deployment ? [] : null,
      },
    },
  }),
);
app.use(requireSecureTransport(security));
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: "64kb" }), cookieParser());
// Non-simple same-origin requests plus Origin checking protect cookie-backed mutations.
app.use("/api", (req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (req.get("X-Requested-With") !== "SECONDHAND")
      return res.status(403).json({ error: "Untrusted request." });
    const origin = req.get("origin");
    if (origin && !origins.includes(origin))
      return res.status(403).json({ error: "Untrusted origin." });
  }
  next();
});
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again shortly." },
  }),
  api,
);
app.use("/api", (req, res) =>
  res.status(404).json({ error: "API route not found." }),
);
app.use(
  "/uploads",
  express.static(path.resolve("uploads"), {
    dotfiles: "deny",
    setHeaders: (res) => res.set("X-Content-Type-Options", "nosniff"),
  }),
);
app.use(express.static(path.resolve("dist")));
app.get("/{*path}", (req, res) =>
  res.sendFile(path.resolve("dist/index.html")),
);
app.use((error, req, res, next) => {
  if ([1555, 2067].includes(error.errcode))
    return res
      .status(409)
      .json({ error: "That email or record already exists." });
  if (error.errcode === 787)
    return res
      .status(400)
      .json({ error: "The selected record no longer exists." });
  if ([275, 1299].includes(error.errcode))
    return res.status(400).json({ error: "A required value is missing or invalid." });
  if (error.errcode === 5)
    return res.status(503).json({ error: "The store is busy. Please retry shortly." });
  if (error.code === "LIMIT_FILE_SIZE")
    return res.status(400).json({ error: "Images must be smaller than 5 MB." });
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res
    .status(status)
    .json({
      error:
        status >= 500
          ? "Something went wrong. Please try again."
          : error.message,
    });
});
