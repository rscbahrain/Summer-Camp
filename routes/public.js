const express = require('express');
const router = express.Router();
const db = require('../database');
const { appendRegistration } = require('../sheets');

// ─── Area → Zone Mapping ───────────────────────────────────────────────────────
const ZONE_MAP = {
  'GUDAIBIYA':   'Muharraq',
  'CASENO':      'Muharraq',
  'HIDD':        'Muharraq',
  'JUFFAIR':     'Muharraq',
  'SALMABAD':    'Manama',
  'SALMANIYA':   'Manama',
  'BUDAYYA':     'Manama',
  'KHALEEFA':    'Riffa',
  'SANAD':       'Riffa',
  'HAMAD TOWN':  'Riffa',
  'ISA TOWN':    'Riffa',
};

const VALID_CLASSES = [
  'Grade 3','Grade 4','Grade 5','Grade 6',
  'Grade 7','Grade 8','Grade 9','Grade 10'
];

const VALID_ACTIVITIES = [
  'Outdoor Exploration & Nature Walks',
  'Physical Activities & Sports',
  'Creative & Artistic Expression',
  'STEM/STEAM Activities',
  'Problem Solving & Brain Games',
  'Social & Emotional Learning',
  'DIY Craft Workshops',
  'Technology & Media',
];

// POST /api/register
router.post('/register', (req, res) => {
  try {
    const {
      student_name,
      guardian_name,
      contact_number,
      class: studentClass,
      age,
      residing_area,
      activities,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    const errors = {};

    if (!student_name || student_name.trim().length < 2)
      errors.student_name = "Don't forget your name! 🙂";

    if (!guardian_name || guardian_name.trim().length < 2)
      errors.guardian_name = "We need your guardian's name too 😊";

    if (!contact_number || !/^\d{7,15}$/.test(contact_number.replace(/[\s\-\+]/g, '')))
      errors.contact_number = 'Please enter a valid phone number (digits only) 📱';

    if (!studentClass || !VALID_CLASSES.includes(studentClass))
      errors.class = 'Please select your grade 🎓';

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 6 || ageNum > 18)
      errors.age = 'Age should be between 6 and 18 🎂';

    if (!residing_area || !ZONE_MAP[residing_area])
      errors.residing_area = 'Please select your area 📍';

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ errors });
    }

    // ── Zone lookup ─────────────────────────────────────────────────────────
    const zone = ZONE_MAP[residing_area];

    // ── Sanitize activities ─────────────────────────────────────────────────
    const activitiesArr = Array.isArray(activities)
      ? activities.filter(a => VALID_ACTIVITIES.includes(a))
      : [];

    // ── Insert ──────────────────────────────────────────────────────────────
    const stmt = db.prepare(`
      INSERT INTO registrations
        (student_name, guardian_name, contact_number, class, age, residing_area, zone, activities)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      student_name.trim(),
      guardian_name.trim(),
      contact_number.trim(),
      studentClass,
      ageNum,
      residing_area,
      zone,
      JSON.stringify(activitiesArr)
    );

    // Fetch the saved record (includes auto-set submitted_at)
    const saved = db.prepare('SELECT * FROM registrations WHERE id = ?').get(info.lastInsertRowid)
               || { id: info.lastInsertRowid, student_name: student_name.trim(), guardian_name: guardian_name.trim(), contact_number: contact_number.trim(), class: studentClass, age: ageNum, residing_area, zone, activities: activitiesArr };

    // Non-blocking Google Sheets sync
    appendRegistration(
      { ...saved, activities: activitiesArr },
      info.lastInsertRowid
    ).catch(() => {}); // already logged inside sheets.js

    return res.status(201).json({
      success: true,
      id: info.lastInsertRowid,
      student_name: student_name.trim(),
      zone,
    });

  } catch (err) {
    console.error('[Register]', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again!' });
  }
});

module.exports = router;
