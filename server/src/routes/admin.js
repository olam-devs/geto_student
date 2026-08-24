const router = require('express').Router();
const db     = require('../db');
const { authRequired, adminOnly } = require('../middleware/auth');

// ── GET /api/admin/stats ─────────────────────────────────────
router.get('/stats', authRequired, adminOnly, async (req, res) => {
  try {
    const [[students]]    = await db.query("SELECT COUNT(*) AS c FROM users WHERE role='student'");
    const [[agents]]      = await db.query("SELECT COUNT(*) AS c FROM agents WHERE status='approved'");
    const [[pendAgents]]  = await db.query("SELECT COUNT(*) AS c FROM agents WHERE status='pending'");
    const [[properties]]  = await db.query("SELECT COUNT(*) AS c FROM properties WHERE status='approved'");
    const [[pendProps]]   = await db.query("SELECT COUNT(*) AS c FROM properties WHERE status='pending'");
    const [[verified]]    = await db.query("SELECT COUNT(*) AS c FROM properties WHERE verified=1");
    const [[bookings]]    = await db.query("SELECT COUNT(*) AS c FROM bookings");
    const [[confirmed]]   = await db.query("SELECT COUNT(*) AS c FROM bookings WHERE status='confirmed'");
    const [[viewings]]    = await db.query("SELECT COUNT(*) AS c FROM viewing_requests WHERE status='pending'");

    res.json({
      students: students.c,
      approved_agents: agents.c,
      pending_agents: pendAgents.c,
      approved_properties: properties.c,
      pending_properties: pendProps.c,
      verified_properties: verified.c,
      total_bookings: bookings.c,
      confirmed_bookings: confirmed.c,
      pending_viewings: viewings.c,
    });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── GET /api/admin/properties  (all incl. pending) ───────────
router.get('/properties', authRequired, adminOnly, async (req, res) => {
  const { status } = req.query;
  try {
    let sql = `
      SELECT p.id, p.name, p.property_type, p.area, p.status, p.verified, p.rejection_note, p.created_at,
             u.name AS university_name,
             a.name AS agent_name, a.business_name, a.phone AS agent_phone,
             (SELECT url FROM property_photos ph WHERE ph.property_id=p.id AND ph.is_main=1 LIMIT 1) AS main_photo,
             COUNT(r.id) AS room_count
      FROM properties p
      JOIN universities u ON u.id=p.university_id
      JOIN agents a ON a.id=p.agent_id
      LEFT JOIN rooms r ON r.property_id=p.id
    `;
    const params = [];
    if (status) { sql += ' WHERE p.status = ?'; params.push(status); }
    sql += ' GROUP BY p.id ORDER BY p.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── PUT /api/admin/properties/:id/approve ────────────────────
router.put('/properties/:id/approve', authRequired, adminOnly, async (req, res) => {
  try {
    await db.query("UPDATE properties SET status='approved', rejection_note=NULL WHERE id=?", [req.params.id]);
    res.json({ message: 'Property approved and now visible to students.' });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── PUT /api/admin/properties/:id/reject ─────────────────────
router.put('/properties/:id/reject', authRequired, adminOnly, async (req, res) => {
  const { note } = req.body;
  try {
    await db.query("UPDATE properties SET status='rejected', rejection_note=? WHERE id=?",
      [note || 'Rejected.', req.params.id]);
    res.json({ message: 'Property rejected.' });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── PUT /api/admin/properties/:id/verify ─────────────────────
router.put('/properties/:id/verify', authRequired, adminOnly, async (req, res) => {
  const { owner_identity, location_confirmed, rooms_confirmed, water_confirmed,
          electricity_confirmed, security_confirmed, price_confirmed, notes } = req.body;
  try {
    await db.query("UPDATE properties SET verified=1, verification_date=CURDATE(), verification_expiry=DATE_ADD(CURDATE(),INTERVAL 3 MONTH) WHERE id=?", [req.params.id]);

    await db.query(
      `INSERT INTO verification_records (property_id,verified_by,inspection_date,owner_identity,location_confirmed,
       rooms_confirmed,water_confirmed,electricity_confirmed,security_confirmed,price_confirmed,notes,expiry_date)
       VALUES (?,?,CURDATE(),?,?,?,?,?,?,?,?,DATE_ADD(CURDATE(),INTERVAL 3 MONTH))
       ON DUPLICATE KEY UPDATE
         verified_by=VALUES(verified_by), inspection_date=VALUES(inspection_date),
         owner_identity=VALUES(owner_identity), location_confirmed=VALUES(location_confirmed),
         rooms_confirmed=VALUES(rooms_confirmed), water_confirmed=VALUES(water_confirmed),
         electricity_confirmed=VALUES(electricity_confirmed), security_confirmed=VALUES(security_confirmed),
         price_confirmed=VALUES(price_confirmed), notes=VALUES(notes), expiry_date=VALUES(expiry_date)`,
      [req.params.id, req.user.id,
       owner_identity?1:0, location_confirmed?1:0, rooms_confirmed?1:0,
       water_confirmed?1:0, electricity_confirmed?1:0, security_confirmed?1:0,
       price_confirmed?1:0, notes || null]
    );
    res.json({ message: 'Property verified! Badge granted.' });
  } catch (e) { res.status(500).json({ message: 'Failed to verify.' }); }
});

// ── PUT /api/admin/properties/:id/revoke-verify ──────────────
router.put('/properties/:id/revoke-verify', authRequired, adminOnly, async (req, res) => {
  try {
    await db.query("UPDATE properties SET verified=0, verification_date=NULL, verification_expiry=NULL WHERE id=?", [req.params.id]);
    res.json({ message: 'Verification revoked.' });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── GET /api/admin/users ─────────────────────────────────────
router.get('/users', authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at,
              un.name AS university_name,
              (SELECT COUNT(*) FROM bookings b WHERE b.student_id=u.id) AS booking_count
       FROM users u
       LEFT JOIN universities un ON un.id=u.university_id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── PUT /api/admin/users/:id/suspend ─────────────────────────
router.put('/users/:id/suspend', authRequired, adminOnly, async (req, res) => {
  try {
    await db.query("UPDATE users SET status='suspended' WHERE id=? AND role!='admin'", [req.params.id]);
    res.json({ message: 'User suspended.' });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── GET /api/admin/amenities ─────────────────────────────────
router.get('/amenities', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM amenities ORDER BY name');
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

module.exports = router;
