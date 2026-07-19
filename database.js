/* ═══════════════════════════════════════════════════════════════════════════
   database.js — sql.js (pure WASM SQLite, no native compilation needed)
   Provides a thin better-sqlite3-compatible API so routes stay unchanged.
   ═══════════════════════════════════════════════════════════════════════════ */

const path      = require('path');
const fs        = require('fs');
const bcrypt    = require('bcrypt');
const initSqlJs = require('sql.js');

const DATA_DIR  = path.join(__dirname, 'data');
const DB_PATH   = path.join(DATA_DIR, 'summershine.db');
const SALT_ROUNDS = 12;

// Internal sql.js Database instance (populated after init)
let sqlJsDb;

// ─── Persistence ──────────────────────────────────────────────────────────────
function saveDB() {
  const data   = sqlJsDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// ─── Low-level helpers ────────────────────────────────────────────────────────
function sqlAll(sql, params = []) {
  const stmt = sqlJsDb.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function sqlGet(sql, params = []) {
  return sqlAll(sql, params)[0] || undefined;
}

function sqlRun(sql, params = []) {
  sqlJsDb.run(sql, params);
  saveDB();
  const row = sqlGet('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: row ? row.id : null, changes: 1 };
}

// ─── better-sqlite3-compatible wrapper (used by routes & auth unchanged) ──────
const db = {
  pragma: () => {},   // no-op — sql.js handles its own WAL internally

  exec: (sql) => {
    // Split multi-statement SQL on ; lines and run each individually
    sql.split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(s => sqlJsDb.run(s + ';'));
    saveDB();
  },

  prepare: (sql) => ({
    run: (...args) => sqlRun(sql, args),

    all: (...args) => {
      // Support both .all(a,b,c) and .all(...arraySpread)
      const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
      return sqlAll(sql, params);
    },

    get: (...args) => {
      const params = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
      return sqlGet(sql, params);
    },
  }),
};

// ─── Schema ───────────────────────────────────────────────────────────────────
function createSchema() {
  sqlJsDb.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name   TEXT    NOT NULL,
      guardian_name  TEXT    NOT NULL,
      contact_number TEXT    NOT NULL,
      class          TEXT    NOT NULL,
      age            INTEGER NOT NULL,
      residing_area  TEXT    NOT NULL,
      zone           TEXT    NOT NULL,
      activities     TEXT    NOT NULL DEFAULT '[]',
      submitted_at   DATETIME DEFAULT (datetime('now','localtime'))
    )
  `);

  sqlJsDb.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL,
      zone          TEXT
    )
  `);

  saveDB();
}

// ─── Admin Seeding ────────────────────────────────────────────────────────────
const SEED_ADMINS = [
  { username: 'supreme',   password: 'SummerShine2026!', role: 'supreme', zone: null       },
  { username: 'muharraq',  password: 'MuharraqZone26!',  role: 'area',    zone: 'Muharraq' },
  { username: 'manama',    password: 'ManamaZone26!',     role: 'area',    zone: 'Manama'   },
  { username: 'riffa',     password: 'RiffaZone26!',      role: 'area',    zone: 'Riffa'    },
];

async function seedAdmins() {
  for (const admin of SEED_ADMINS) {
    const existing = sqlGet('SELECT id FROM admins WHERE username = ?', [admin.username]);
    if (!existing) {
      const hash = await bcrypt.hash(admin.password, SALT_ROUNDS);
      sqlRun(
        'INSERT OR IGNORE INTO admins (username, password_hash, role, zone) VALUES (?, ?, ?, ?)',
        [admin.username, hash, admin.role, admin.zone]
      );
      console.log(`[DB] Seeded admin: ${admin.username}`);
    }
  }
}

// ─── Initialization (async — server waits on db.ready) ────────────────────────
db.ready = (async () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlJsDb = new SQL.Database(fileBuffer);
    console.log('[DB] Loaded existing database from disk');
  } else {
    sqlJsDb = new SQL.Database();
    console.log('[DB] Created new database');
  }

  createSchema();
  await seedAdmins();
  console.log('[DB] Ready ✔');
})();

module.exports = db;
