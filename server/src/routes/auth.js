const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const sign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── POST /api/auth/register  (student) ──────────────────────
router.post('/register', async (req, res) => {
  const { name, email, phone, password, university_id, referral_code } = req.body;
  if (!name || !email || !phone || !password)
    return res.status(400).json({ message: 'Name, email, phone and password are required.' });

  try {
    const [exist] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exist.length) return res.status(409).json({ message: 'Email already registered.' });

    const hash  = await bcrypt.hash(password, 10);
    const myRef = `GETO-${name.split(' ')[0].toUpperCase().slice(0,6)}${Math.floor(10+Math.random()*90)}`;

    const [r] = await db.query(
      `INSERT INTO users (name,email,phone,password_hash,role,university_id,referral_code)
       VALUES (?,?,?,?,'student',?,?)`,
      [name, email, phone, hash, university_id || null, myRef]
    );

    // credit referrer if code provided
    if (referral_code) {
      const [ref] = await db.query('SELECT id FROM users WHERE referral_code = ?', [referral_code]);
      if (ref.length) {
        await db.query(
          `INSERT INTO referrals (referrer_id,referred_id,referral_code,status)
           VALUES (?,?,?,'registered')`,
          [ref[0].id, r.insertId, referral_code]
        );
        await db.query('UPDATE users SET referred_by = ? WHERE id = ?', [ref[0].id, r.insertId]);
      }
    }

    const token = sign({ id: r.insertId, role: 'student', entity: 'user', name, email });
    res.status(201).json({ token, user: { id: r.insertId, name, email, phone, role: 'student', referral_code: myRef } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// ── POST /api/auth/login  (student / admin) ─────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });

  try {
    const [rows] = await db.query(
      `SELECT u.*, un.name AS university_name FROM users u
       LEFT JOIN universities un ON u.university_id = un.id
       WHERE u.email = ?`, [email]
    );
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials.' });

    const user = rows[0];
    if (!(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: 'Invalid credentials.' });
    if (user.status === 'suspended')
      return res.status(403).json({ message: 'Account suspended. Contact support.' });

    const token = sign({ id: user.id, role: user.role, entity: 'user', name: user.name, email: user.email });
    const { password_hash, ...safe } = user;
    res.json({ token, user: safe });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Login failed.' });
  }
});

// ── POST /api/auth/agent/register ──────────────────────────
router.post('/agent/register', async (req, res) => {
  const { name, email, phone, password, business_name } = req.body;
  if (!name || !email || !phone || !password)
    return res.status(400).json({ message: 'All fields required.' });

  try {
    const [exist] = await db.query('SELECT id FROM agents WHERE email = ?', [email]);
    if (exist.length) return res.status(409).json({ message: 'Email already registered.' });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      `INSERT INTO agents (name,email,phone,password_hash,business_name,status)
       VALUES (?,?,?,?,?,'pending')`,
      [name, email, phone, hash, business_name || null]
    );
    res.status(201).json({ message: 'Registration submitted. Admin will verify your account within 24 hours.', agentId: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// ── POST /api/auth/agent/login ──────────────────────────────
router.post('/agent/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });

  try {
    const [rows] = await db.query('SELECT * FROM agents WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials.' });

    const agent = rows[0];
    if (!(await bcrypt.compare(password, agent.password_hash)))
      return res.status(401).json({ message: 'Invalid credentials.' });
    if (agent.status === 'rejected')
      return res.status(403).json({ message: 'Account rejected. Contact Geto Student support.' });
    if (agent.status === 'suspended')
      return res.status(403).json({ message: 'Account suspended.' });

    const token = sign({ id: agent.id, entity: 'agent', status: agent.status, name: agent.name, email: agent.email });
    const { password_hash, ...safe } = agent;
    res.json({ token, agent: safe });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Login failed.' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', authRequired, async (req, res) => {
  try {
    if (req.user.entity === 'agent') {
      const [r] = await db.query('SELECT id,name,email,phone,business_name,license_number,status,created_at FROM agents WHERE id=?', [req.user.id]);
      return res.json({ agent: r[0] });
    }
    const [r] = await db.query(
      `SELECT u.id,u.name,u.email,u.phone,u.role,u.status,u.university_id,u.referral_code,u.created_at,
              un.name AS university_name FROM users u
       LEFT JOIN universities un ON u.university_id=un.id WHERE u.id=?`, [req.user.id]
    );
    res.json({ user: r[0] });
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
});

module.exports = router;
