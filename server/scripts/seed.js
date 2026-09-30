import { migrate, close } from "../config/db.js";
import { seed } from "../db/seed.js";
await migrate();
await seed();
console.log("Demo catalog seeded. No customer accounts or reviews created.");
await close();
