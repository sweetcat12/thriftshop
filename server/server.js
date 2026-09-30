import { app } from "./app.js";
import { migrate } from "./config/db.js";
import { seed } from "./db/seed.js";
if (process.env.NODE_ENV !== "production") {
  await migrate();
  await seed();
}
const port = Number(process.env.PORT) || 3001;
app.listen(
  port,
  process.env.HOST ||
    (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
  () => console.log(`SECONDHAND API: http://127.0.0.1:${port}`),
);
