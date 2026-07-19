const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const db = require('../database');
const { requireAuth, requireSupreme, loginAdmin } = require('../auth');
const { logEdit, logDelete } = require('../sheets');

// ─── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }
    const admin = await loginAdmin(username, password);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    req.session.admin = admin;
    return res.json({ success: true, admin });
  } catch (err) {
    console.error('[Login]', err);
    return res.status(500).json({ error: 'Login failed. Try again.' });
  }
});

// ─── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ─── Session check ─────────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ admin: req.session.admin });
});

// ─── Get Registrations ─────────────────────────────────────────────────────────
router.get('/registrations', requireAuth, (req, res) => {
  try {
    const admin = req.session.admin;
    const { zone: filterZone, search, classFilter } = req.query;

    let query = 'SELECT * FROM registrations WHERE 1=1';
    const params = [];

    // Area admins can ONLY see their zone
    if (admin.role === 'area') {
      query += ' AND zone = ?';
      params.push(admin.zone);
    } else if (filterZone && filterZone !== 'All') {
      // Supreme admin zone filter
      query += ' AND zone = ?';
      params.push(filterZone);
    }

    // Search by name
    if (search && search.trim()) {
      query += ' AND (student_name LIKE ? OR guardian_name LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    // Filter by class
    if (classFilter && classFilter !== 'All') {
      query += ' AND class = ?';
      params.push(classFilter);
    }

    query += ' ORDER BY submitted_at DESC';

    const rows = db.prepare(query).all(...params);

    // Parse activities JSON for each row
    const registrations = rows.map(r => ({
      ...r,
      activities: JSON.parse(r.activities || '[]'),
    }));

    // Total count for current filter
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count').replace(' ORDER BY submitted_at DESC', '');
    const { count } = db.prepare(countQuery).get(...params);

    return res.json({ registrations, total: count });
  } catch (err) {
    console.error('[Registrations]', err);
    return res.status(500).json({ error: 'Failed to fetch registrations.' });
  }
});

// ─── Export to Excel ───────────────────────────────────────────────────────────
router.get('/export', requireAuth, (req, res) => {
  try {
    const admin = req.session.admin;
    const { zone: filterZone } = req.query;

    let query = 'SELECT * FROM registrations WHERE 1=1';
    const params = [];

    if (admin.role === 'area') {
      query += ' AND zone = ?';
      params.push(admin.zone);
    } else if (filterZone && filterZone !== 'All') {
      query += ' AND zone = ?';
      params.push(filterZone);
    }

    query += ' ORDER BY submitted_at ASC';
    const rows = db.prepare(query).all(...params);

    // Build worksheet data
    const wsData = [
      ['#', 'Student Name', "Guardian's Name", 'Contact Number', 'Class', 'Age', 'Residing Area', 'Zone', 'Activities Selected', 'Submitted At']
    ];

    rows.forEach((r, i) => {
      const activities = JSON.parse(r.activities || '[]').join(', ');
      wsData.push([
        i + 1,
        r.student_name,
        r.guardian_name,
        r.contact_number,
        r.class,
        r.age,
        r.residing_area,
        r.zone,
        activities,
        r.submitted_at,
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 22 }, { wch: 22 }, { wch: 18 },
      { wch: 10 }, { wch: 5 }, { wch: 16 }, { wch: 12 },
      { wch: 55 }, { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

    const today = new Date().toISOString().slice(0, 10);
    const filename = `SummerShine3.0_Registrations_${today}.xlsx`;

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (err) {
    console.error('[Export]', err);
    return res.status(500).json({ error: 'Export failed.' });
  }
});


// ─── Zone map (needed for re-mapping on edit) ──────────────────────────────────
const ZONE_MAP = {
  'GUDAIBIYA': 'Muharraq', 'CASENO': 'Muharraq', 'HIDD': 'Muharraq', 'JUFFAIR': 'Muharraq',
  'SALMABAD':  'Manama',   'SALMANIYA': 'Manama', 'BUDAYYA': 'Manama',
  'KHALEEFA':  'Riffa',    'SANAD': 'Riffa', 'HAMAD TOWN': 'Riffa', 'ISA TOWN': 'Riffa',
};

const VALID_CLASSES   = ['Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];
const VALID_ACTIVITIES = [
  'Outdoor Exploration & Nature Walks', 'Physical Activities & Sports',
  'Creative & Artistic Expression',     'STEM/STEAM Activities',
  'Problem Solving & Brain Games',      'Social & Emotional Learning',
  'DIY Craft Workshops',                'Technology & Media',
];

// ─── Helper: check an admin can touch a given zone ────────────────────────────
function canAccessZone(admin, zone) {
  if (admin.role === 'supreme') return true;
  return admin.zone === zone;
}

// ─── DELETE /api/admin/registrations/:id ──────────────────────────────────────
router.delete('/registrations/:id', requireAuth, (req, res) => {
  try {
    const admin = req.session.admin;
    const id    = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });

    // Fetch the record first to verify zone access
    const row = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Registration not found.' });

    if (!canAccessZone(admin, row.zone)) {
      return res.status(403).json({ error: 'You do not have permission to delete this registration.' });
    }

    db.prepare('DELETE FROM registrations WHERE id = ?').run(id);

    // Non-blocking Sheets audit log
    logDelete({ id: row.id, student_name: row.student_name, zone: row.zone }).catch(() => {});

    return res.json({ success: true, deleted_id: id });
  } catch (err) {
    console.error('[Delete]', err);
    return res.status(500).json({ error: 'Failed to delete registration.' });
  }
});

// ─── PUT /api/admin/registrations/:id ────────────────────────────────────────
router.put('/registrations/:id', requireAuth, (req, res) => {
  try {
    const admin = req.session.admin;
    const id    = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID.' });

    // Fetch existing record to verify zone access
    const existing = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Registration not found.' });

    if (!canAccessZone(admin, existing.zone)) {
      return res.status(403).json({ error: 'You do not have permission to edit this registration.' });
    }

    const { student_name, guardian_name, contact_number, class: studentClass, age, residing_area, activities } = req.body;

    // Validation
    const errors = {};
    if (!student_name || student_name.trim().length < 2)  errors.student_name   = "Student name is too short.";
    if (!guardian_name || guardian_name.trim().length < 2) errors.guardian_name  = "Guardian name is too short.";
    if (!contact_number || !/^\d{7,15}$/.test(contact_number.replace(/[\s\-\+]/g, ''))) errors.contact_number = 'Invalid phone number.';
    if (!studentClass || !VALID_CLASSES.includes(studentClass)) errors.class = 'Invalid class.';
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 6 || ageNum > 18) errors.age = 'Age must be 6–18.';
    if (!residing_area || !ZONE_MAP[residing_area]) errors.residing_area = 'Invalid area.';

    if (Object.keys(errors).length > 0) return res.status(422).json({ errors });

    // Re-map zone in case area changed
    const newZone = ZONE_MAP[residing_area];

    // Area admin cannot move a record OUT of their zone
    if (admin.role === 'area' && newZone !== admin.zone) {
      return res.status(403).json({ error: `You cannot move a registration to a different zone (${newZone}).` });
    }

    const activitiesArr = Array.isArray(activities)
      ? activities.filter(a => VALID_ACTIVITIES.includes(a))
      : [];

    db.prepare(`
      UPDATE registrations
      SET student_name = ?, guardian_name = ?, contact_number = ?, class = ?,
          age = ?, residing_area = ?, zone = ?, activities = ?
      WHERE id = ?
    `).run(
      student_name.trim(), guardian_name.trim(), contact_number.trim(),
      studentClass, ageNum, residing_area, newZone,
      JSON.stringify(activitiesArr), id
    );

    const updated = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);
    const result  = { ...updated, activities: JSON.parse(updated.activities || '[]') };

    // Non-blocking Sheets audit log
    logEdit(result).catch(() => {});

    return res.json({ success: true, registration: result });
  } catch (err) {
    console.error('[Edit]', err);
    return res.status(500).json({ error: 'Failed to update registration.' });
  }
});

module.exports = router;
