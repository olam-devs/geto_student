const router = require('express').Router();
const db     = require('../db');
const { authRequired, adminOnly } = require('../middleware/auth');

// ── POST /api/bookings  (student) ────────────────────────────
router.post('/', authRequired, async (req, res) => {
  if (req.user.entity === 'agent') return res.status(403).json({ message: 'Agents cannot book rooms.' });

  const { property_id, room_id, move_in_date, notes } = req.body;
  if (!property_id || !room_id || !move_in_date)
    return res.status(400).json({ message: 'property_id, room_id and move_in_date required.' });

  try {
    const [propRows] = await db.query('SELECT agent_id FROM properties WHERE id=? AND status="approved"', [property_id]);
    if (!propRows.length) return res.status(404).json({ message: 'Property not found or not active.' });

    const [roomRows] = await db.query('SELECT available_count FROM rooms WHERE id=? AND property_id=?', [room_id, property_id]);
    if (!roomRows.length) return res.status(404).json({ message: 'Room not found.' });
    if (roomRows[0].available_count < 1) return res.status(409).json({ message: 'No available spaces in this room.' });

    const [r] = await db.query(
      `INSERT INTO bookings (student_id,property_id,room_id,move_in_date,move_in_notes,status,agent_id)
       VALUES (?,?,?,?,?,'pending',?)`,
      [req.user.id, property_id, room_id, move_in_date, notes || null, propRows[0].agent_id]
    );
    res.status(201).json({ message: 'Booking request submitted.', bookingId: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to create booking.' });
  }
});

// ── GET /api/bookings  (student: own; admin: all) ────────────
router.get('/', authRequired, async (req, res) => {
  try {
    let sql, params;
    if (req.user.role === 'admin') {
      sql = `SELECT b.*, p.name AS property_name, r.room_type, r.monthly_price,
                    u.name AS student_name, u.phone AS student_phone,
                    a.name AS agent_name, a.business_name
             FROM bookings b
             JOIN properties p ON p.id=b.property_id
             JOIN rooms r ON r.id=b.room_id
             JOIN users u ON u.id=b.student_id
             JOIN agents a ON a.id=b.agent_id
             ORDER BY b.created_at DESC`;
      params = [];
    } else {
      sql = `SELECT b.*, p.name AS property_name, r.room_type, r.monthly_price
             FROM bookings b
             JOIN properties p ON p.id=b.property_id
             JOIN rooms r ON r.id=b.room_id
             WHERE b.student_id=? ORDER BY b.created_at DESC`;
      params = [req.user.id];
    }
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

// ── PUT /api/bookings/:id/status  (admin) ────────────────────
router.put('/:id/status', authRequired, adminOnly, async (req, res) => {
  const { status, notes } = req.body;
  const valid = ['pending','accepted','payment_pending','confirmed','move_in_completed','cancelled','rejected'];
  if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  try {
    await db.query('UPDATE bookings SET status=?, admin_notes=? WHERE id=?', [status, notes || null, req.params.id]);
    res.json({ updated: true });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

module.exports = router;
