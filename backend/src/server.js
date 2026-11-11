"use strict";

const config = require("./config");
const { createApp } = require("./app");
const { bootstrap } = require("./db/seed");

const app = createApp({ config });

// Seed-i në nisje (idempotent): siguron që admini fillestar ekziston edhe kur
// databaza është krijuar rishtas (p.sh. deploy në Render pa disk të qëndrueshëm),
// ku "npm run seed" nuk ekzekutohet kurrë. Nuk shkruan asnjë sekret në logje.
bootstrap(app.locals.db, config);

const server = app.listen(config.port, () => {
  console.log(`✔ Parkimi backend: http://localhost:${config.port}`);
  console.log(`  Dokumentimi i API-së: http://localhost:${config.port}/api/docs`);
});

function shutdown() {
  console.log("\nPo mbyllet serveri…");
  app.locals.hub.close();
  server.close(() => {
    app.locals.db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);