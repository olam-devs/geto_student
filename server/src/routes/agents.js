const router  = require('express').Router();
const db      = require('../db');
const { authRequired, adminOnly, approvedAgentOnly } = require('../middleware/auth');

// ── GET /api/agents/my-properties  (agent) ──────────────────
router.get('/my-properties', authRequired, approvedAgentOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.name, p.property_type, p.area, p.status, p.verified, p.views_count, p.created_at,
              u.name AS university_name,
              (SELECT url FROM property_photos ph WHERE ph.property_id=p.id AND ph.is_main=1 LIMIT 1) AS main_photo,
              COUNT(r.id) AS room_types,
              SUM(r.available_count) AS total_available
       FROM properties p
       JOIN universities u ON p.university_id = u.id
       LEFT JOIN rooms r ON r.property_id = p.id
       WHERE p.agent_id = ?
       GROUP BY p.id ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch your properties.' });
  }
});

// ── GET /api/agents/my-bookings  (agent sees bookings for their properties) ──
router.get('/my-bookings', authRequired, approvedAgentOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.id, b.move_in_date, b.status, b.created_at,
              p.name AS property_name, r.room_type, r.monthly_price,
              u.name AS student_name, u.phone AS student_phone
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       JOIN rooms r ON r.id = b.room_id
       JOIN users u ON u.id = b.student_id
       WHERE b.agent_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed.' });
  }
});

// ── PUT /api/agents/my-bookings/:id/status  (agent accept/reject) ──
router.put('/my-bookings/:id/status', authRequired, approvedAgentOnly, async (req, res) => {
  const { status } = req.body;
  const allowed = ['accepted','rejected'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  try {
    const [rows] = await db.query('SELECT agent_id FROM bookings WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Booking not found.' });
    if (rows[0].agent_id !== req.user.id) return res.status(403).json({ message: 'Not your booking.' });
    await db.query('UPDATE bookings SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ updated: true });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── GET /api/agents/my-viewings  (agent) ─────────────────────
router.get('/my-viewings', authRequired, approvedAgentOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT vr.id, vr.preferred_date, vr.preferred_time, vr.notes, vr.status, vr.created_at,
              p.name AS property_name, u.name AS student_name, u.phone AS student_phone
       FROM viewing_requests vr
       JOIN properties p ON p.id = vr.property_id
       JOIN users u ON u.id = vr.student_id
       WHERE vr.agent_id = ?
       ORDER BY vr.preferred_date ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── GET /api/agents  (admin only) ────────────────────────────
router.get('/', authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.id, a.name, a.email, a.phone, a.business_name, a.license_number,
              a.status, a.approved_at, a.rejection_note, a.created_at,
              COUNT(p.id) AS property_count
       FROM agents a
       LEFT JOIN properties p ON p.agent_id = a.id
       GROUP BY a.id ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── PUT /api/agents/:id/approve  (admin) ─────────────────────
router.put('/:id/approve', authRequired, adminOnly, async (req, res) => {
  try {
    await db.query(
      `UPDATE agents SET status='approved', approved_by=?, approved_at=NOW(), rejection_note=NULL WHERE id=?`,
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Agent approved.' });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── PUT /api/agents/:id/reject  (admin) ──────────────────────
router.put('/:id/reject', authRequired, adminOnly, async (req, res) => {
  const { note } = req.body;
  try {
    await db.query(
      `UPDATE agents SET status='rejected', rejection_note=? WHERE id=?`,
      [note || 'Application rejected.', req.params.id]
    );
    res.json({ message: 'Agent rejected.' });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── PUT /api/agents/:id/suspend  (admin) ─────────────────────
router.put('/:id/suspend', authRequired, adminOnly, async (req, res) => {
  try {
    await db.query('UPDATE agents SET status=? WHERE id=?', ['suspended', req.params.id]);
    res.json({ message: 'Agent suspended.' });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

module.exports = router;
