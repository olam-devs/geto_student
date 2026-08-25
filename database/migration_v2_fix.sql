-- ============================================================
--  GETO STUDENT — Migration v2 FIX (MySQL 8.0 compatible)
--  Re-runs only the ALTER TABLE / CREATE INDEX parts
--  Tables and INSERTs already ran — skipping them
-- ============================================================

-- ─── USERS: new columns ─────────────────────────────────────
ALTER TABLE users ADD COLUMN whatsapp_phone    VARCHAR(20)  AFTER phone;
ALTER TABLE users ADD COLUMN zone_id           INT          AFTER status;
ALTER TABLE users ADD COLUMN student_id_number VARCHAR(50)  AFTER university_id;
ALTER TABLE users ADD COLUMN id_document_url   TEXT         AFTER avatar_url;
ALTER TABLE users ADD COLUMN business_name     VARCHAR(200) AFTER id_document_url;
ALTER TABLE users ADD COLUMN verified          TINYINT(1) NOT NULL DEFAULT 0 AFTER business_name;
ALTER TABLE users ADD COLUMN verified_by       INT          AFTER verified;
ALTER TABLE users ADD COLUMN verified_at       DATETIME     AFTER verified_by;
ALTER TABLE users ADD COLUMN rejection_note    TEXT         AFTER verified_at;
ALTER TABLE users ADD COLUMN terms_accepted    TINYINT(1) NOT NULL DEFAULT 0 AFTER rejection_note;
ALTER TABLE users ADD COLUMN terms_accepted_at DATETIME     AFTER terms_accepted;
ALTER TABLE users ADD COLUMN last_login_at     DATETIME     AFTER updated_at;

-- ─── UNIVERSITIES: zone/cluster linkage ─────────────────────
ALTER TABLE universities ADD COLUMN zone_id    INT AFTER district;
ALTER TABLE universities ADD COLUMN cluster_id INT AFTER zone_id;

-- ─── PROPERTIES: new columns ────────────────────────────────
ALTER TABLE properties ADD COLUMN owner_id              INT          AFTER id;
ALTER TABLE properties ADD COLUMN zone_id               INT          AFTER university_id;
ALTER TABLE properties ADD COLUMN cluster_id            INT          AFTER zone_id;
ALTER TABLE properties ADD COLUMN transport_options     VARCHAR(300) AFTER distance_km;
ALTER TABLE properties ADD COLUMN nearest_university_id INT          AFTER university_id;
ALTER TABLE properties ADD COLUMN total_floors          TINYINT      AFTER youtube_video_id;
ALTER TABLE properties ADD COLUMN verified_by           INT          AFTER verified;
ALTER TABLE properties ADD COLUMN verified_at           DATETIME     AFTER verified_by;

-- ─── Populate owner_id from agent migration ──────────────────
UPDATE properties p
  JOIN agents a ON p.agent_id = a.id
  JOIN users u ON u.email = a.email AND u.role = 'property_owner'
SET p.owner_id = u.id
WHERE p.owner_id IS NULL;

-- Copy university_id → nearest_university_id
UPDATE properties SET nearest_university_id = university_id WHERE nearest_university_id IS NULL;

-- ─── ROOMS: new columns ──────────────────────────────────────
ALTER TABLE rooms ADD COLUMN total_count    SMALLINT NOT NULL DEFAULT 1  AFTER capacity;
ALTER TABLE rooms ADD COLUMN occupied_count SMALLINT NOT NULL DEFAULT 0  AFTER total_count;
ALTER TABLE rooms ADD COLUMN floor          TINYINT                      AFTER occupied_count;
ALTER TABLE rooms ADD COLUMN description    TEXT                         AFTER bathroom_type;

UPDATE rooms SET total_count = available_count WHERE total_count = 1 AND available_count > 1;

-- ─── BOOKINGS: new columns ───────────────────────────────────
ALTER TABLE bookings ADD COLUMN owner_id INT AFTER property_id;

UPDATE bookings b
  JOIN properties p ON b.property_id = p.id
SET b.owner_id = p.owner_id
WHERE b.owner_id IS NULL;

-- ─── VIEWING REQUESTS: new columns ──────────────────────────
ALTER TABLE viewing_requests ADD COLUMN owner_id INT AFTER property_id;

UPDATE viewing_requests v
  JOIN properties p ON v.property_id = p.id
SET v.owner_id = p.owner_id
WHERE v.owner_id IS NULL;

-- ─── INDEXES (plain — MySQL 8.0 needs no IF NOT EXISTS) ─────
CREATE INDEX idx_users_role         ON users(role);
CREATE INDEX idx_users_zone         ON users(zone_id);
CREATE INDEX idx_properties_owner   ON properties(owner_id);
CREATE INDEX idx_properties_zone    ON properties(zone_id);
CREATE INDEX idx_properties_cluster ON properties(cluster_id);
CREATE INDEX idx_tenants_property   ON tenants(property_id);
CREATE INDEX idx_pma_manager        ON property_manager_assignments(manager_id, is_active);
