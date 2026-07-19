/* ═══════════════════════════════════════════════════════════════════════════
   sheets.js — Google Sheets sync via Apps Script Web App
   
   Uses the built-in fetch (Node 18+) to POST JSON to the Apps Script URL.
   No credentials.json, no googleapis package, no Google Cloud Console needed.
   
   All calls are non-blocking — a failure here NEVER prevents a registration
   from being saved to the local SQLite database.
   ═══════════════════════════════════════════════════════════════════════════ */

let config;
try {
  config = require('./sheets-config');
} catch {
  config = { ENABLED: false };
}

// ─── Validate config ──────────────────────────────────────────────────────────
function isReady() {
  if (!config.ENABLED) return false;

  const url = config.APPS_SCRIPT_URL || '';
  if (!url || url === 'YOUR_APPS_SCRIPT_URL_HERE' || !url.startsWith('https://script.google.com')) {
    if (config.ENABLED) {
      console.warn('[Sheets] APPS_SCRIPT_URL not set correctly in sheets-config.js. Sheets sync disabled.');
    }
    return false;
  }
  return true;
}

// ─── Core POST to Apps Script ─────────────────────────────────────────────────
async function postToScript(payload) {
  if (!isReady()) return;

  const body = JSON.stringify(payload);

  // Node v18+ has built-in fetch. It follows 302 redirects automatically.
  const response = await fetch(config.APPS_SCRIPT_URL, {
    method:   'POST',
    headers:  { 'Content-Type': 'application/json' },
    body,
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Apps Script returned HTTP ${response.status}`);
  }

  return response.json().catch(() => ({ success: true }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Called when a new registration is submitted.
 * Appends to "All Registrations" tab + the correct zone tab.
 */
async function appendRegistration(reg, rowNumber) {
  try {
    await postToScript({
      action:         'register',
      id:             rowNumber || reg.id,
      student_name:   reg.student_name,
      guardian_name:  reg.guardian_name,
      contact_number: reg.contact_number,
      class:          reg.class,
      age:            reg.age,
      residing_area:  reg.residing_area,
      zone:           reg.zone,
      activities:     Array.isArray(reg.activities) ? reg.activities : [],
      submitted_at:   reg.submitted_at || new Date().toLocaleString('en-GB'),
    });
    console.log(`[Sheets] ✔ Synced registration: ${reg.student_name} → ${reg.zone}`);
  } catch (err) {
    // Non-fatal — SQLite is the source of truth
    console.error('[Sheets] Sync failed (non-fatal):', err.message);
  }
}

/**
 * Called when a registration is edited in the admin dashboard.
 * Appends an [UPDATED] audit row to "All Registrations".
 */
async function logEdit(reg) {
  try {
    await postToScript({
      action:         'edit',
      id:             reg.id,
      student_name:   reg.student_name,
      guardian_name:  reg.guardian_name,
      contact_number: reg.contact_number,
      class:          reg.class,
      age:            reg.age,
      residing_area:  reg.residing_area,
      zone:           reg.zone,
      activities:     Array.isArray(reg.activities) ? reg.activities : [],
    });
    console.log(`[Sheets] ✔ Edit logged: ${reg.student_name}`);
  } catch (err) {
    console.error('[Sheets] Edit log failed (non-fatal):', err.message);
  }
}

/**
 * Called when a registration is deleted in the admin dashboard.
 * Appends a [DELETED] audit row to "All Registrations".
 */
async function logDelete(reg) {
  try {
    await postToScript({
      action: 'delete',
      id:     reg.id,
      student_name: reg.student_name,
      zone:         reg.zone,
    });
    console.log(`[Sheets] ✔ Delete logged: ${reg.student_name}`);
  } catch (err) {
    console.error('[Sheets] Delete log failed (non-fatal):', err.message);
  }
}

module.exports = { appendRegistration, logEdit, logDelete };
