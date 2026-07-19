/* ═══════════════════════════════════════════════════════════════════════════
   sheets-config.js — Google Sheets sync configuration
   
   HOW TO ENABLE (see APPS_SCRIPT_SETUP.md for full guide):
   1. Open your Google Sheet → Extensions → Apps Script
   2. Paste the contents of apps-script.gs → Save
   3. Deploy → New deployment → Web app → Anyone → Deploy
   4. Copy the Web App URL
   5. Paste it below, set ENABLED: true, and restart the server
   ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  ENABLED: true, // ← Make sure this is true!
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwmSP7OwySp3c5ZHQLifToX7UsRNy8oQt-Pbq2sZR7FAJCrtxQSzH0pesS_6vTVDI7Gbg/exec',
};