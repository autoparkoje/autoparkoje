const express = require("express"), Database = require("better-sqlite3"), crypto = require("crypto"), path = require("path");
const KEY = process.env.PARKIMI_KEY || "ndrysho-kete", PORT = process.env.PORT || 3000;
const db = new Database(process.env.DB_FILE || "parkimi.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(token TEXT PRIMARY KEY, name TEXT NOT NULL, plate TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS spots(key TEXT PRIMARY KEY, status TEXT NOT NULL, cm REAL, updated INTEGER);
CREATE TABLE IF NOT EXISTS reservations(key TEXT PRIMARY KEY, token TEXT, name TEXT, plate TEXT, start INTEGER, t_end INTEGER);
CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT, name TEXT, plate TEXT, start INTEGER, until INTEGER, t_end INTEGER);
`);
const now = () => Date.now(), SPOT = /^[A-Z]-P\d+$/;
const q = s => db.prepare(s);
const upSpot = q("INSERT INTO spots(key,status,cm,updated) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET status=excluded.status,cm=excluded.cm,updated=excluded.updated");
const getSpot = q("SELECT status FROM spots WHERE key=?"), getRes = q("SELECT * FROM reservations WHERE key=?");
const openSess = q("SELECT id FROM sessions WHERE key=? AND t_end IS NULL");
const expire = () => q("DELETE FROM reservations WHERE t_end<=?").run(now());

const apply = db.transaction(list => {
  for (const s of list) {
    if (!SPOT.test(s.key) || !["free", "occupied", "unknown"].includes(s.status)) continue;
    upSpot.run(s.key, s.status, typeof s.cm === "number" ? s.cm : null, now());
    const open = openSess.get(s.key);
    if (s.status === "occupied" && !open) {
      const r = getRes.get(s.key);
      q("INSERT INTO sessions(key,name,plate,start,until) VALUES(?,?,?,?,?)").run(s.key, r ? r.name : "Vizitor", r ? r.plate : "-", now(), r ? r.t_end : null);
      if (r) q("DELETE FROM reservations WHERE key=?").run(s.key);
    } else if (open && s.status === "free") q("UPDATE sessions SET t_end=? WHERE id=?").run(now(), open.id);
  }
});

const userOf = req => q("SELECT * FROM users WHERE token=?").get((req.headers.authorization || "").replace("Bearer ", ""));
const auth = (req, res, next) => { const u = userOf(req); if (!u) return res.status(401).json({ error: "Hyr së pari" }); req.user = u; next(); };

const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/state", (req, res) => {
  expire();
  const me = userOf(req), spots = {};
  for (const s of q("SELECT key,status,cm FROM spots").all()) spots[s.key] = { status: s.status, cm: s.cm };
  res.json({
    spots,
    res: q("SELECT key,name,token,start,t_end FROM reservations").all().map(r => ({ key: r.key, name: r.name, start: r.start, end: r.t_end, mine: !!me && r.token === me.token })),
    sessions: q("SELECT key,name,start,until,t_end FROM (SELECT * FROM sessions ORDER BY id DESC LIMIT 100) ORDER BY id").all().map(s => ({ key: s.key, name: s.name, start: s.start, until: s.until, end: s.t_end }))
  });
});

app.post("/api/sensor", (req, res) => {
  if (req.headers["x-api-key"] !== KEY) return res.status(401).json({ error: "Çelës i gabuar" });
  const list = Array.isArray(req.body.spots) ? req.body.spots.slice(0, 100) : [];
  apply(list); res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 30), plate = String(req.body.plate || "").trim().toUpperCase();
  if (!name || !/^[A-Z0-9-]{3,12}$/.test(plate)) return res.status(400).json({ error: "Emër ose targë e pavlefshme" });
  const token = crypto.randomUUID();
  q("INSERT INTO users(token,name,plate) VALUES(?,?,?)").run(token, name, plate);
  res.json({ token });
});

app.post("/api/reserve", auth, (req, res) => {
  const { key, end } = req.body, t = now();
  if (!SPOT.test(String(key)) || !(end > t) || end > t + 48 * 36e5) return res.status(400).json({ error: "Orë e pavlefshme" });
  expire();
  const s = getSpot.get(key);
  if (s && s.status === "occupied") return res.status(409).json({ error: "Vendi është i zënë" });
  if (getRes.get(key)) return res.status(409).json({ error: "Vendi është tashmë i rezervuar" });
  q("DELETE FROM reservations WHERE token=?").run(req.user.token);
  q("INSERT INTO reservations(key,token,name,plate,start,t_end) VALUES(?,?,?,?,?,?)").run(key, req.user.token, req.user.name, req.user.plate, t, end);
  res.json({ ok: true });
});

app.delete("/api/reserve/:key", auth, (req, res) => {
  q("DELETE FROM reservations WHERE key=? AND token=?").run(req.params.key, req.user.token);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Parkimi në http://localhost:${PORT}` + (KEY === "ndrysho-kete" ? "  (ndrysho PARKIMI_KEY!)" : "")));
