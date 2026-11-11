"use strict";

// Teston qëndrueshmërinë e databazës në disk: inicializimi është i
// përsëritshëm (idempotent) dhe të dhënat mbijetojnë mbylljen/rihapjen —
// e njëjta garanci që duhet të vlejë pas restart-it të kontejnerit Docker.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createDb } = require("../src/db");
const { seedAdmin, seedBridgeKey } = require("../src/db/seed");
const { createParkingService } = require("../src/services/parking");

const CONFIG = { occThresholdCm: 3, maxRangeCm: 10 };
const noopHub = { broadcast() {} };

function tempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parkimi-test-"));
  return path.join(dir, "parking.db");
}

test("të dhënat mbijetojnë mbylljen dhe rihapjen e databazës", () => {
  const dbPath = tempDbPath();

  // Hapja e parë: seed + një matje që e zë vendin A-P1
  let db = createDb(dbPath);
  seedAdmin(db, { username: "admin-pers", password: "fjalekalim-i-forte" });
  const bridge = seedBridgeKey(db);
  assert.ok(bridge.created);
  const parking = createParkingService(db, CONFIG, noopHub);
  const changes = parking.applyReadings([{ key: "A-P1", cm: 2.5, sensor_ok: true }]);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].status, "occupied");
  db.close();

  // Rihapja (simulon restart të kontejnerit): gjendja duhet të jetë aty
  db = createDb(dbPath);
  const status = db
    .prepare(
      `SELECT st.status, st.distance_cm FROM spot_status st
       JOIN spots s ON s.id = st.spot_id WHERE s.spot_key = 'A-P1'`
    )
    .get();
  assert.equal(status.status, "occupied");
  assert.equal(status.distance_cm, 2.5);

  const admin = db.prepare("SELECT username FROM admin_users WHERE username = 'admin-pers'").get();
  assert.ok(admin, "admini duhet të mbijetojë rihapjen");

  const session = db
    .prepare(
      `SELECT p.* FROM parking_sessions p JOIN spots s ON s.id = p.spot_id
       WHERE s.spot_key = 'A-P1' AND p.ended_at IS NULL`
    )
    .get();
  assert.ok(session, "qëndrimi i hapur duhet të mbijetojë rihapjen");
  db.close();
  fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
});

test("inicializimi dhe seed-i janë idempotentë (nuk dyfishojnë asgjë)", () => {
  const dbPath = tempDbPath();

  let db = createDb(dbPath);
  seedAdmin(db, { username: "admin-pers", password: "fjalekalim-i-forte" });
  seedBridgeKey(db);
  const spotsBefore = db.prepare("SELECT COUNT(*) AS n FROM spots").get().n;
  db.close();

  // Riekzekutimi i plotë i inicializimit + seed-it mbi të njëjtin skedar
  db = createDb(dbPath);
  const admin2 = seedAdmin(db, { username: "admin-pers", password: "tjeter-fjalekalim" });
  const bridge2 = seedBridgeKey(db);
  assert.equal(admin2.created, false, "admini ekzistues nuk mbishkruhet");
  assert.equal(bridge2.created, false, "çelësi aktiv nuk dyfishohet");

  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM spots").get().n, spotsBefore);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM admin_users").get().n, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM api_keys WHERE is_active = 1").get().n, 1);

  // Çdo vend ka saktësisht një rresht gjendjeje dhe një kod QR
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM spot_status").get().n, spotsBefore);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM qr_codes").get().n, spotsBefore);
  db.close();
  fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
});

test("login-i bllokohet me 429 pas shumë përpjekjeve të dështuara", async () => {
  const { startTestServer, ADMIN } = require("./helpers");
  const srv = await startTestServer();
  try {
    for (let i = 0; i < 10; i++) {
      const r = await srv.api("POST", "/api/admin/login", {
        body: { username: ADMIN.username, password: "fjalekalim-gabim" },
      });
      assert.equal(r.status, 401);
    }
    const blocked = await srv.api("POST", "/api/admin/login", {
      body: { username: ADMIN.username, password: ADMIN.password },
    });
    assert.equal(blocked.status, 429, "pas 10 dështimeve edhe kredencialet e sakta bllokohen");
  } finally {
    srv.close();
  }
});

test("bootstrap në nisje krijon adminin në databazë të re, por s'prek ekzistuesin", () => {
  const { bootstrap } = require("../src/db/seed");
  const { createDb } = require("../src/db");

  // Databazë e re (si deploy i freskët në Render): admini krijohet nga env
  const db = createDb(":memory:");
  const first = bootstrap(db, { adminUsername: "emirdaku", adminPassword: "sekret-i-forte" });
  assert.equal(first.created, true);

  // Nisja e dytë (restart): nuk krijohet llogari e dytë dhe s'preket ekzistuesja
  const hashBefore = db.prepare("SELECT password_hash FROM admin_users").get().password_hash;
  const second = bootstrap(db, { adminUsername: "tjeter", adminPassword: "tjeter-fjalekalim" });
  assert.equal(second.created, false);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM admin_users").get().n, 1);
  assert.equal(db.prepare("SELECT password_hash FROM admin_users").get().password_hash, hashBefore);

  // Pa kredenciale në env: asgjë nuk krijohet, asnjë gabim
  const empty = createDb(":memory:");
  const none = bootstrap(empty, { adminUsername: "", adminPassword: "" });
  assert.equal(none.created, false);
  assert.equal(empty.prepare("SELECT COUNT(*) AS n FROM admin_users").get().n, 0);
  db.close(); empty.close();
});
