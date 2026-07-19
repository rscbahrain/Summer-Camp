const bcrypt = require('bcrypt');
const db = require('./database');

// ─── Session Configuration ─────────────────────────────────────────────────────
const SESSION_CONFIG = {
  secret: 'summershine3-secret-key-2026-rsc-bahrain',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,        // set true if HTTPS in production
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000  // 8 hours
  }
};

// ─── Middleware: Require authenticated admin ───────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

// ─── Middleware: Require supreme role ─────────────────────────────────────────
function requireSupreme(req, res, next) {
  if (req.session && req.session.admin && req.session.admin.role === 'supreme') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden. Supreme admin only.' });
}

// ─── Login helper ─────────────────────────────────────────────────────────────
async function loginAdmin(username, password) {
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) return null;

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) return null;

  return {
    id:       admin.id,
    username: admin.username,
    role:     admin.role,
    zone:     admin.zone
  };
}

module.exports = { SESSION_CONFIG, requireAuth, requireSupreme, loginAdmin };
