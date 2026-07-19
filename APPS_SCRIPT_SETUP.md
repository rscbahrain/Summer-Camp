# 🔗 Connect Summer Shine 3.0 to Google Sheets
## Using Google Apps Script — No Cloud Console Needed!

This takes about **5 minutes**. You only need access to Google Sheets.

---

## Step 1 — Create Your Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **"+ Blank"** to create a new sheet
3. Name it **"Summer Shine 3.0 Registrations"**

> The script will automatically create these tabs inside it:
> - 📋 **All Registrations** — every student
> - 🔵 **Muharraq Zone** — Gudaibiya, Caseno, Hidd, Juffair
> - 🟢 **Manama Zone** — Salmabad, Salmaniya, Budayya
> - 🟠 **Riffa Zone** — Khaleefa, Sanad, Hamad Town, Isa Town

---

## Step 2 — Open Apps Script

Inside your Google Sheet:
1. Click **Extensions** in the top menu
2. Click **Apps Script**

A new tab opens with a code editor.

---

## Step 3 — Paste the Script

1. **Select all** the existing code in the editor (Ctrl+A)
2. **Delete it**
3. Open the file `apps-script.gs` from your project folder
4. **Copy everything** in that file
5. **Paste it** into the Apps Script editor
6. Click **Save** (💾 icon or Ctrl+S)
7. Name the project `Summer Shine 3.0 Sync` when prompted

---

## Step 4 — Deploy as Web App

1. Click the blue **"Deploy"** button (top right)
2. Click **"New deployment"**
3. Click the ⚙️ gear icon next to "Select type" → choose **"Web app"**
4. Fill in these settings:

   | Setting | Value |
   |---|---|
   | Description | Summer Shine 3.0 Sync |
   | Execute as | **Me** |
   | Who has access | **Anyone** |

5. Click **"Deploy"**
6. If prompted, click **"Authorize access"** → sign in with your Google account → Allow

---

## Step 5 — Copy the Web App URL

After deploying, you'll see:

```
Web app URL:
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec
```

**Copy this entire URL.**

---

## Step 6 — Paste into the Server Config

Open `sheets-config.js` in your project folder:

```js
module.exports = {
  ENABLED: true,                                          // ← change to true
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxxxxxxx/exec',  // ← paste here
};
```

Save the file.

---

## Step 7 — Restart the Server

In your terminal, stop the server (Ctrl+C) and restart:
```
node server.js
```

---

## ✅ It's Working When...

Submit a test registration on the website. Within a few seconds, open your Google Sheet — you should see a new row appear in **"All Registrations"** and the correct zone tab.

---

## What Gets Written to the Sheet

| Column | Contents |
|---|---|
| No. | Registration ID |
| Student Name | Full student name |
| Guardian's Name | Parent/guardian name |
| Contact Number | Phone number |
| Class | Grade 3 – 10 |
| Age | Student age |
| Residing Area | e.g. HIDD |
| Zone | Auto-mapped: Muharraq / Manama / Riffa |
| Activities Selected | Comma-separated list |
| Submitted At | Date & time |

---

## Every Action is Tracked

| Action on Admin Dashboard | What appears in Sheet |
|---|---|
| New registration submitted | New row in **All Registrations** + zone tab |
| Registration **edited** | `[UPDATED] #ID` audit row in All Registrations |
| Registration **deleted** | `[DELETED] #ID` audit row in All Registrations |

> The Google Sheet is a **permanent log**. Deleted records still show as `[DELETED]` rows so nothing is ever truly lost.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Rows not appearing in Sheet | Make sure you deployed as **"Anyone"** access, not just yourself |
| `APPS_SCRIPT_URL not set` error | Check `sheets-config.js` — ENABLED must be `true` |
| "Authorization required" error | Re-deploy the script and click "Authorize access" |
| Only the first tab getting data | Check the script has the correct `ZONE_TAB` mapping |
| Need to update the script | In Apps Script, make changes → Deploy → **"Manage deployments"** → Edit → **Deploy** |

---

> **Note:** The Google Sheet sync runs in the background. If it fails for any reason, registrations are still safely saved to the local database and the admin dashboard continues working normally.
