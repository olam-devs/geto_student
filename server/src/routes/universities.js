const router = require('express').Router();
const db = require('../db');

// GET /api/universities
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.*, COUNT(p.id) AS property_count
       FROM universities u
       LEFT JOIN properties p ON p.university_id = u.id AND p.status = 'approved'
       WHERE u.active = 1
       GROUP BY u.id
       ORDER BY u.name`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load universities.' });
  }
});

module.exports = router;
