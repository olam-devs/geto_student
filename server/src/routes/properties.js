const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const sharp  = require('sharp');
const multer = require('multer');
const db     = require('../db');
const { authRequired, adminOnly, approvedAgentOnly } = require('../middleware/auth');

// ─── Multer → temp storage before Sharp conversion ──────────
const tmpStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/tmp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage: tmpStorage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

async function convertToWebP(srcPath, destDir, filename) {
  fs.mkdirSync(destDir, { recursive: true });
  const outName = filename.replace(/\.[^.]+$/, '') + '.webp';
  const outPath = path.join(destDir, outName);
  await sharp(srcPath).webp({ quality: 85 }).toFile(outPath);
  fs.unlinkSync(srcPath); // remove temp file
  return outName;
}

// ── GET /api/properties  (public, with filters) ─────────────
router.get('/', async (req, res) => {
  const { university_id, room_type, price_max, verified_only, area, q } = req.query;
  try {
    let sql = `
      SELECT p.id, p.name, p.property_type, p.area, p.distance_km,
             p.status, p.verified, p.verification_date, p.verification_expiry,
             p.youtube_video_id, p.views_count, p.created_at,
             u.id AS university_id, u.name AS university_name, u.short_name AS university_short,
             (SELECT url FROM property_photos ph WHERE ph.property_id=p.id AND ph.is_main=1 LIMIT 1) AS main_photo,
             MIN(r.monthly_price) AS price_from
      FROM properties p
      JOIN universities u ON p.university_id = u.id
      LEFT JOIN rooms r ON r.property_id = p.id AND r.available_count > 0
      WHERE p.status = 'approved'`;
    const params = [];

    if (university_id) { sql += ' AND p.university_id = ?'; params.push(university_id); }
    if (verified_only === 'true') { sql += ' AND p.verified = 1'; }
    if (area)   { sql += ' AND p.area LIKE ?'; params.push(`%${area}%`); }
    if (q)      { sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (price_max) {
      sql += ' AND p.id IN (SELECT property_id FROM rooms WHERE monthly_price <= ? AND available_count > 0)';
      params.push(parseInt(price_max));
    }
    if (room_type) {
      sql += ' AND p.id IN (SELECT property_id FROM rooms WHERE room_type = ? AND available_count > 0)';
      params.push(room_type);
    }

    sql += ' GROUP BY p.id ORDER BY p.verified DESC, p.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to fetch properties.' });
  }
});

// ── GET /api/properties/:id  (public) ───────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.name AS university_name, u.short_name AS university_short,
              u.area AS university_area
       FROM properties p
       JOIN universities u ON p.university_id = u.id
       WHERE p.id = ? AND p.status = 'approved'`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Property not found.' });

    const prop = rows[0];

    // photos, amenities, rooms in parallel
    const [[photos],[amenities],[rooms],[verification]] = await Promise.all([
      db.query('SELECT * FROM property_photos WHERE property_id=? ORDER BY is_main DESC, sort_order', [prop.id]),
      db.query(`SELECT a.name, a.icon FROM amenities a
                JOIN property_amenities pa ON pa.amenity_id=a.id WHERE pa.property_id=?`, [prop.id]),
      db.query('SELECT * FROM rooms WHERE property_id=? ORDER BY monthly_price', [prop.id]),
      db.query('SELECT * FROM verification_records WHERE property_id=?', [prop.id]),
    ]);

    // bump view count
    db.query('UPDATE properties SET views_count = views_count + 1 WHERE id=?', [prop.id]);

    // never expose agent details to public
    delete prop.agent_id;

    res.json({ ...prop, photos, amenities, rooms, verification: verification[0] || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to fetch property.' });
  }
});

// ── POST /api/properties  (approved agents only) ─────────────
router.post('/', authRequired, approvedAgentOnly, async (req, res) => {
  const { name, property_type, university_id, area, address, distance_km, description, youtube_video_id, amenity_ids, rooms } = req.body;
  if (!name || !property_type || !university_id || !area || !address || !description)
    return res.status(400).json({ message: 'Required fields missing.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO properties (agent_id,name,property_type,university_id,area,address,distance_km,description,youtube_video_id,status)
       VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
      [req.user.id, name, property_type, university_id, area, address, distance_km || null, description, youtube_video_id || null]
    );
    const propId = r.insertId;

    if (Array.isArray(amenity_ids) && amenity_ids.length) {
      const vals = amenity_ids.map(aid => [propId, aid]);
      await conn.query('INSERT INTO property_amenities (property_id,amenity_id) VALUES ?', [vals]);
    }
    if (Array.isArray(rooms) && rooms.length) {
      const rvals = rooms.map(rm => [propId, rm.room_type, rm.monthly_price, rm.deposit || 0, rm.capacity || 1, rm.available_count || 1, rm.furnished ? 1 : 0, rm.bathroom_type || 'Shared']);
      await conn.query(
        'INSERT INTO rooms (property_id,room_type,monthly_price,deposit,capacity,available_count,furnished,bathroom_type) VALUES ?', [rvals]
      );
    }
    await conn.commit();
    res.status(201).json({ message: 'Property submitted for admin review.', propertyId: propId });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ message: 'Failed to create property.' });
  } finally {
    conn.release();
  }
});

// ── POST /api/properties/:id/photos  (agent, own property) ──
router.post('/:id/photos', authRequired, approvedAgentOnly, upload.array('photos', 10), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT agent_id FROM properties WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Property not found.' });
    if (rows[0].agent_id !== req.user.id) return res.status(403).json({ message: 'Not your property.' });

    const destDir = path.join(__dirname, `../../uploads/properties/${req.params.id}`);
    const savedPhotos = [];

    for (const file of req.files) {
      const webpName = await convertToWebP(file.path, destDir, file.filename);
      const url = `/uploads/properties/${req.params.id}/${webpName}`;
      const [is_main] = await db.query('SELECT COUNT(*) AS c FROM property_photos WHERE property_id=?', [req.params.id]);
      const isMain = is_main[0].c === 0 ? 1 : 0;
      await db.query('INSERT INTO property_photos (property_id,url,is_main,sort_order) VALUES (?,?,?,?)',
        [req.params.id, url, isMain, savedPhotos.length]);
      savedPhotos.push({ url, is_main: isMain });
    }
    res.json({ uploaded: savedPhotos.length, photos: savedPhotos });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Photo upload failed.' });
  }
});

// ── POST /api/properties/:id/save  (auth student) ───────────
router.post('/:id/save', authRequired, async (req, res) => {
  if (req.user.entity === 'agent') return res.status(403).json({ message: 'Agents cannot save properties.' });
  try {
    await db.query('INSERT IGNORE INTO saved_properties (student_id,property_id) VALUES (?,?)', [req.user.id, req.params.id]);
    res.json({ saved: true });
  } catch (e) { res.status(500).json({ message: 'Failed to save property.' }); }
});

// ── DELETE /api/properties/:id/save ─────────────────────────
router.delete('/:id/save', authRequired, async (req, res) => {
  try {
    await db.query('DELETE FROM saved_properties WHERE student_id=? AND property_id=?', [req.user.id, req.params.id]);
    res.json({ saved: false });
  } catch (e) { res.status(500).json({ message: 'Failed.' }); }
});

module.exports = router;
