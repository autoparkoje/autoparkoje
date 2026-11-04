process.env.TZ = process.env.TZ || "Europe/Belgrade";
const express = require("express"), Database = require("better-sqlite3"), crypto = require("crypto"), path = require("path");
const PORT = process.env.PORT || 3000, ADMIN = process.env.ADMIN_KEY || "";
const OPEN = 9, CLOSE = 23, MIN = 15, MAX = 180, STEP = MIN * 60000;
const ids = (p, n) => Array.from({ length: n }, (_, i) => `${p}-P${i + 1}`);
const SPOTS = [...ids("A", 10), ...ids("B", 12)];
const VEH = ["mercedes", "vw", "bmw", "audi", "porsche", "kamion", "tjeter"];

const db = new Database(process.env.DB_FILE || "parkimi.db");
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS bookings(
  id INTEGER PRIMARY KEY AUTOINCREMENT, spot TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, vehicle TEXT,
  start_at INTEGER NOT NULL, end_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ok', code TEXT NOT NULL, created_at INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS ix_spot ON bookings(spot, start_at, end_at);`);

const dayWindow = t => { const o = new Date(t), c = new Date(t); o.setHours(OPEN, 0, 0, 0); c.setHours(CLOSE, 0, 0, 0); return [o.getTime(), c.getTime()]; };
const mask = n => { const p = n.split(" "); return p.length > 1 ? p[0] + " " + p[p.length - 1][0].toUpperCase() + "." : p[0]; };
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

if (process.env.SEED_DEMO && !db.prepare("SELECT 1 FROM bookings").get()) {
  const t = Date.now(), ins = db.prepare("INSERT INTO bookings(spot,name,phone,vehicle,start_at,end_at,code,created_at) VALUES(?,?,?,?,?,?,?,?)");
  [["A-P1", "Arben Krasniqi", "mercedes", 20, 90], ["A-P3", "Elira Berisha", "vw", 5, 45], ["A-P7", "Besnik Gashi", "bmw", 40, 120],
   ["A-P9", "Drita Hoxha", "audi", 10, 60], ["B-P2", "Liridon Morina", "porsche", 15, 150], ["B-P5", "Faton Rama", "kamion", 30, 170],
   ["B-P8", "Vlora Shala", "vw", -30, 40]].forEach(([s, n, v, a, m]) => ins.run(s, n, "+38349000000", v, t - a * 6e4, t - a * 6e4 + m * 6e4, "demo", t));
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb" }));
app.use((q, r, n) => { r.set("X-Content-Type-Options", "nosniff"); n(); });
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/state", (req, res) => {
  const t = Date.now(), [o, c] = dayWindow(t), spots = {};
  for (const k of SPOTS) spots[k] = { status: "free", slots: [] };
  const rows = db.prepare("SELECT id,spot,name,vehicle,start_at,end_at FROM bookings WHERE status!='cancelled' AND end_at>? ORDER BY start_at").all(t);
  for (const b of rows) {
    const s = spots[b.spot]; if (!s) continue;
    const info = { vehicle: b.vehicle, name: mask(b.name), start: b.start_at, end: b.end_at };
    s.slots.push({ id: b.id, s: b.start_at, e: b.end_at, v: b.vehicle, n: info.name });
    if (b.start_at <= t && s.status !== "occupied") Object.assign(s, { status: "occupied" }, info);
    else if (b.start_at > t && s.status === "free") Object.assign(s, { status: "reserved" }, info);
  }
  res.json({ now: t, open: o, close: c, tz: process.env.TZ, min: MIN, max: MAX, spots });
});

const hits = new Map();
app.post("/api/book", (req, res) => {
  const t = Date.now(), bad = (m, c = 400) => res.status(c).json({ error: m });
  const h = (hits.get(req.ip) || []).filter(x => t - x < 36e5);
  if (h.length >= 8) return bad("Shumë kërkesa. Provo më vonë.", 429);
  const { spot, vehicle, minutes } = req.body;
  let start = Number(req.body.start);
  const name = String(req.body.name || "").trim().replace(/\s+/g, " "), phone = String(req.body.phone || "").replace(/\s/g, "");
  if (!SPOTS.includes(spot)) return bad("Vend i pavlefshëm");
  if (name.length < 2 || name.length > 40) return bad("Shkruaj emrin dhe mbiemrin");
  if (!/^\+?[0-9]{8,15}$/.test(phone)) return bad("Numër telefoni i pavlefshëm");
  if (!Number.isInteger(minutes) || minutes < MIN || minutes > MAX || minutes % MIN) return bad(`Kohëzgjatja duhet të jetë ${MIN}–${MAX} minuta`);
  if (!Number.isFinite(start) || start < t - 120000 || start > t + 864e5) return bad("Orë fillimi e pavlefshme");
  if (start < t) start = t;
  const [o, c] = dayWindow(start), end = start + minutes * 60000;
  if (start > t + 60000 && (start - o) % STEP) return bad("Ora duhet të jetë në hapa 15 minutash");
  if (start < o || end > c) return bad(`Parkingu është i hapur ${OPEN}:00–${CLOSE}:00`);
  if (db.prepare("SELECT 1 FROM bookings WHERE spot=? AND status!='cancelled' AND start_at<? AND end_at>? LIMIT 1").get(spot, end, start)) return bad("Vendi është i zënë në këtë orar", 409);
  if (db.prepare("SELECT COUNT(*) n FROM bookings WHERE phone=? AND status!='cancelled' AND end_at>?").get(phone, t).n >= 2) return bad("Ke tashmë 2 rezervime aktive", 409);
  const code = crypto.randomBytes(9).toString("base64url");
  const id = db.prepare("INSERT INTO bookings(spot,name,phone,vehicle,start_at,end_at,code,created_at) VALUES(?,?,?,?,?,?,?,?)")
    .run(spot, name, phone, VEH.includes(vehicle) ? vehicle : "tjeter", start, end, code, t).lastInsertRowid;
  h.push(t); hits.set(req.ip, h);
  res.json({ id, code, start, end });
});

app.post("/api/booking/:id/end", (req, res) => {
  const b = db.prepare("SELECT * FROM bookings WHERE id=?").get(req.params.id), t = Date.now();
  if (!b || !eq(b.code, req.body.code || "")) return res.status(403).json({ error: "Nuk lejohet" });
  if (b.status === "ok" && b.end_at > t) {
    if (b.start_at > t) db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(b.id);
    else db.prepare("UPDATE bookings SET status='ended', end_at=? WHERE id=?").run(t, b.id);
  }
  res.json({ ok: true });
});

const adm = (req, res, next) => {
  if (!ADMIN) return res.status(503).json({ error: "ADMIN_KEY nuk është vendosur" });
  if (!eq(req.headers["x-admin-key"] || "", ADMIN)) return res.status(401).json({ error: "Çelës i gabuar" });
  next();
};
app.get("/api/admin/bookings", adm, (req, res) =>
  res.json({ tz: process.env.TZ, rows: db.prepare("SELECT id,spot,name,phone,vehicle,start_at,end_at,status,created_at FROM bookings ORDER BY id DESC LIMIT 1000").all() }));

app.listen(PORT, () => console.log(`Parkimi në http://localhost:${PORT}  (${process.env.TZ})`));
