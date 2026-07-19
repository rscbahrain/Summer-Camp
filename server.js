const express = require('express');
const session = require('express-session');
const path = require('path');

// Initialize DB (async — must await db.ready before listening)
const db = require('./database');

const { SESSION_CONFIG } = require('./auth');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;


// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session(SESSION_CONFIG));

// ─── Subdomain Routing Middleware ──────────────────────────────────────────────
app.use((req, res, next) => {
  const host = req.headers.host || '';
  // If the subdomain is "admin", map root "/" requests to "/admin" internally
  if (host.toLowerCase().startsWith('admin.') && req.path === '/') {
    req.url = '/admin';
  }
  next();
});

// ─── Static Files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// ─── Admin SPA Fallback ────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// ─── Public SPA Fallback ───────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start (wait for DB to be ready first) ────────────────────────────────────
db.ready
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🌞 Summer Shine 3.0 server running at http://localhost:${PORT}`);
      console.log(`📋 Admin dashboard at http://localhost:${PORT}/admin\n`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });
