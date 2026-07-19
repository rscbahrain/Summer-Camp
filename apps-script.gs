/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Summer Shine 3.0 — Google Apps Script
 * 
 * HOW TO USE:
 * 1. Open your Google Sheet
 * 2. Click Extensions → Apps Script
 * 3. Delete any existing code and paste THIS entire file
 * 4. Click Save (💾), then Deploy → New deployment
 * 5. Type: Web app | Execute as: Me | Who has access: Anyone
 * 6. Click Deploy → copy the Web App URL
 * 7. Paste the URL into sheets-config.js on your server
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Column headers (written once when a sheet is first created) ──────────────
const HEADERS = [
  'No.', 'Student Name', "Guardian's Name", 'Contact Number',
  'Class', 'Age', 'Residing Area', 'Zone', 'Activities Selected', 'Submitted At'
];

// ─── Zone → Sheet tab mapping ─────────────────────────────────────────────────
const ZONE_TAB = {
  'Muharraq': 'Muharraq Zone',
  'Manama':   'Manama Zone',
  'Riffa':    'Riffa Zone'
};

// ─── Palette (matches the Summer Shine 3.0 branding) ─────────────────────────
const COLORS = {
  headerBg:      '#FFD93D',  // sunflower yellow
  headerText:    '#1A1A2E',
  muharraqBg:    '#E1F5FE',  // sky blue
  manamaBg:      '#E8F8F2',  // green
  riffaBg:       '#FFF0E0',  // orange
  allBg:         '#FFFDF5',  // off-white
  altRow:        '#FFF8DC',  // light yellow
  updatedBg:     '#FFF3B0',  // audit row highlight
};

// ─── Entry point — called by every POST from the Node server ──────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss      = SpreadsheetApp.getActiveSpreadsheet();

    if (payload.action === 'register') {
      handleRegister(ss, payload);
    } else if (payload.action === 'edit') {
      handleEdit(ss, payload);
    } else if (payload.action === 'delete') {
      handleDelete(ss, payload);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ─── Also support GET (useful for testing the URL is working) ─────────────────
function doGet(e) {
  return jsonResponse({ ok: true, app: 'Summer Shine 3.0 Registration Sync', version: '1.0' });
}

// ══════════════════════════════════════════════════════════════════════════════
// HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

function handleRegister(ss, reg) {
  const activities = formatActivities(reg.activities);
  const row = buildRow(reg, activities);

  // 1. All Registrations tab
  const allSheet = getOrCreateSheet(ss, 'All Registrations', COLORS.allBg);
  appendStyledRow(allSheet, row, false);

  // 2. Zone-specific tab
  const zoneTabName = ZONE_TAB[reg.zone];
  if (zoneTabName) {
    const zoneBg = { 'Muharraq Zone': COLORS.muharraqBg, 'Manama Zone': COLORS.manamaBg, 'Riffa Zone': COLORS.riffaBg }[zoneTabName] || COLORS.allBg;
    const zoneSheet = getOrCreateSheet(ss, zoneTabName, zoneBg);
    appendStyledRow(zoneSheet, row, false);
  }

  Logger.log('Registered: ' + reg.student_name + ' → ' + reg.zone);
}

function handleEdit(ss, reg) {
  const activities = formatActivities(reg.activities);
  // Append an audit row to "All Registrations" so edits are traceable
  const allSheet = getOrCreateSheet(ss, 'All Registrations', COLORS.allBg);
  const auditRow = ['[UPDATED] #' + (reg.id || '?')].concat(buildRow(reg, activities).slice(1));
  appendStyledRow(allSheet, auditRow, true);
  Logger.log('Edit logged: ' + reg.student_name);
}

function handleDelete(ss, reg) {
  // Append a deletion audit row instead of removing (keep data history)
  const allSheet = getOrCreateSheet(ss, 'All Registrations', COLORS.allBg);
  const auditRow = ['[DELETED] #' + (reg.id || '?'), reg.student_name || '', '', '', '', '', '', reg.zone || '', '', new Date().toLocaleString()];
  appendStyledRow(allSheet, auditRow, true);
  Logger.log('Delete logged: ' + reg.student_name);
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function buildRow(reg, activitiesStr) {
  return [
    reg.id            || '',
    reg.student_name  || '',
    reg.guardian_name || '',
    reg.contact_number|| '',
    reg.class         || '',
    reg.age           || '',
    reg.residing_area || '',
    reg.zone          || '',
    activitiesStr,
    reg.submitted_at  || new Date().toLocaleString('en-GB'),
  ];
}

function formatActivities(activities) {
  if (!activities) return '';
  if (Array.isArray(activities)) return activities.join(', ');
  return String(activities);
}

function getOrCreateSheet(ss, name, altRowColor) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    styleNewSheet(sheet, altRowColor);
    Logger.log('Created sheet: ' + name);
  }
  return sheet;
}

function styleNewSheet(sheet, altRowColor) {
  // Write + style header row
  sheet.appendRow(HEADERS);
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground(COLORS.headerBg);
  headerRange.setFontColor(COLORS.headerText);
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);
  headerRange.setHorizontalAlignment('center');

  // Freeze header row
  sheet.setFrozenRows(1);

  // Set column widths for readability
  sheet.setColumnWidth(1, 50);   // No.
  sheet.setColumnWidth(2, 180);  // Student Name
  sheet.setColumnWidth(3, 180);  // Guardian Name
  sheet.setColumnWidth(4, 130);  // Contact
  sheet.setColumnWidth(5, 90);   // Class
  sheet.setColumnWidth(6, 60);   // Age
  sheet.setColumnWidth(7, 130);  // Area
  sheet.setColumnWidth(8, 110);  // Zone
  sheet.setColumnWidth(9, 340);  // Activities
  sheet.setColumnWidth(10, 160); // Submitted At

  // Store the alt row color as a named range property (for new rows)
  // We'll just use a default alt-row color for now
}

function appendStyledRow(sheet, row, isAudit) {
  sheet.appendRow(row);
  const lastRow   = sheet.getLastRow();
  const rowRange  = sheet.getRange(lastRow, 1, 1, HEADERS.length);

  if (isAudit) {
    rowRange.setBackground(COLORS.updatedBg);
    rowRange.setFontStyle('italic');
  } else {
    // Alternating row color
    rowRange.setBackground(lastRow % 2 === 0 ? '#FFFFFF' : COLORS.altRow);
  }

  // Wrap text in Activities column
  sheet.getRange(lastRow, 9).setWrap(true);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
