const router = require('express').Router();
const db     = require('../db');
const { authRequired, adminOnly } = require('../middleware/auth');

// ── POST /api/viewings  (student) ────────────────────────────
router.post('/', authRequired, async (req, res) => {
  if (req.user.entity === 'agent') return res.status(403).json({ message: 'Agents cannot request viewings.' });

  const { property_id, preferred_date, preferred_time, notes } = req.body;
  if (!property_id || !preferred_date)
    return res.status(400).json({ message: 'property_id and preferred_date are required.' });

  try {
    const [propRows] = await db.query('SELECT agent_id FROM properties WHERE id=? AND status="approved"', [property_id]);
    if (!propRows.length) return res.status(404).json({ message: 'Property not found.' });

    const [r] = await db.query(
      `INSERT INTO viewing_requests (student_id,property_id,preferred_date,preferred_time,notes,status,agent_id)
       VALUES (?,?,?,?,?,'pending',?)`,
      [req.user.id, property_id, preferred_date, preferred_time || 'Morning', notes || null, propRows[0].agent_id]
    );
    res.status(201).json({ message: 'Viewing request submitted.', requestId: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed.' });
  }
});

// ── GET /api/viewings  (student: own; admin: all) ─────────────
router.get('/', authRequired, async (req, res) => {
  try {
    let sql, params;
    if (req.user.role === 'admin') {
      sql = `SELECT vr.*, p.name AS property_name, u.name AS student_name, u.phone AS student_phone,
                    a.name AS agent_name, a.phone AS agent_phone
             FROM viewing_requests vr
             JOIN properties p ON p.id=vr.property_id
             JOIN users u ON u.id=vr.student_id
             JOIN agents a ON a.id=vr.agent_id
             ORDER BY vr.preferred_date ASC`;
      params = [];
    } else {
      sql = `SELECT vr.*, p.name AS property_name
             FROM viewing_requests vr
             JOIN properties p ON p.id=vr.property_id
             WHERE vr.student_id=? ORDER BY vr.preferred_date ASC`;
      params = [req.user.id];
    }
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── PUT /api/viewings/:id/status  (admin) ────────────────────
router.put('/:id/status', authRequired, adminOnly, async (req, res) => {
  const { status, notes } = req.body;
  const valid = ['pending','scheduled','completed','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  try {
    await db.query('UPDATE viewing_requests SET status=?, admin_notes=? WHERE id=?', [status, notes || null, req.params.id]);
    res.json({ updated: true });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

module.exports = router;
