import { migrate, close } from "../config/db.js";
await migrate();
console.log("SQLite schema is ready.");
await close();
