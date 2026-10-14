import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { pool } from "./db.ts";
import { startIcalScheduler } from "./services/ical.ts";

async function main() {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.error(`Cannot connect to MySQL at ${config.db.host}:${config.db.port}/${config.db.database}. Check server/.env and run "npm run db:setup".`);
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Bluesparks API listening on http://localhost:${config.port} (${config.env}, payments=${config.payments.gateway})`);
  });

  const stopIcal = startIcalScheduler();

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received, shutting down`);
    stopIcal();
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
