-- ============================================================
--  GETO STUDENT — Migration v1 → v2
--  Run on production AFTER backing up the database
--  Safe: uses IF NOT EXISTS / IGNORE / ALTER only where needed
-- ============================================================

-- ─── 1. ZONES & CLUSTERS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS zones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(2) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  city        VARCHAR(80) NOT NULL DEFAULT 'Dar es Salaam',
  description TEXT,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clusters (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  zone_id     INT NOT NULL,
  code        VARCHAR(5) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

-- ─── 2. USERS TABLE — add new columns ───────────────────────
-- Expand role enum (must recreate the ENUM; add new values)
ALTER TABLE users
  MODIFY COLUMN role ENUM('student','property_owner','property_manager','zone_manager','admin')
  NOT NULL DEFAULT 'student';

ALTER TABLE users
  MODIFY COLUMN status ENUM('active','suspended','pending_verification')
  NOT NULL DEFAULT 'active';

-- Add new columns (safe — IF NOT EXISTS via try/ignore approach in PHP; SQL uses ALTER ADD)
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_phone    VARCHAR(20)  AFTER phone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS zone_id           INT          AFTER status;
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id_number VARCHAR(50)  AFTER university_id;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_document_url   TEXT         AFTER avatar_url;
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name     VARCHAR(200) AFTER id_document_url;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified          TINYINT(1) NOT NULL DEFAULT 0 AFTER business_name;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_by       INT          AFTER verified;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at       DATETIME     AFTER verified_by;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_note    TEXT         AFTER verified_at;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted    TINYINT(1) NOT NULL DEFAULT 0 AFTER rejection_note;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at DATETIME     AFTER terms_accepted;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at     DATETIME     AFTER updated_at;

-- ─── 3. UNIVERSITIES — add zone/cluster linkage ──────────────
ALTER TABLE universities ADD COLUMN IF NOT EXISTS zone_id    INT AFTER district;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS cluster_id INT AFTER zone_id;

-- ─── 4. PROPERTIES — replace agent_id with owner_id + zone/cluster ──
-- First copy agent data into users table as property_owners
INSERT IGNORE INTO users (name, email, phone, password_hash, role, status, business_name, terms_accepted)
SELECT a.name, a.email, a.phone, a.password_hash, 'property_owner',
  CASE a.status WHEN 'approved' THEN 'active' WHEN 'pending' THEN 'pending_verification' ELSE 'suspended' END,
  a.business_name, 1
FROM agents a
WHERE a.email NOT IN (SELECT email FROM users);

-- Add new columns to properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id              INT          AFTER id;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS zone_id               INT          AFTER university_id;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cluster_id            INT          AFTER zone_id;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS transport_options     VARCHAR(300) AFTER distance_km;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS nearest_university_id INT          AFTER university_id;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_floors          TINYINT      AFTER youtube_video_id;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS verified_by           INT          AFTER verified;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS verified_at           DATETIME     AFTER verified_by;

-- Populate owner_id from agent migration (match by email)
UPDATE properties p
  JOIN agents a ON p.agent_id = a.id
  JOIN users u ON u.email = a.email AND u.role = 'property_owner'
SET p.owner_id = u.id
WHERE p.owner_id IS NULL;

-- Copy university_id → nearest_university_id where not set
UPDATE properties SET nearest_university_id = university_id WHERE nearest_university_id IS NULL;

-- ─── 5. ROOMS — add total/occupied counts, floor, description ──
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS total_count    SMALLINT NOT NULL DEFAULT 1  AFTER capacity;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS occupied_count SMALLINT NOT NULL DEFAULT 0  AFTER total_count;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor          TINYINT                      AFTER occupied_count;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description    TEXT                         AFTER bathroom_type;

-- Populate total_count from existing available_count
UPDATE rooms SET total_count = available_count WHERE total_count = 1 AND available_count > 1;

-- ─── 6. BOOKINGS — add owner_id, drop agent_id FK ───────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_id INT AFTER property_id;

-- Populate owner_id from properties
UPDATE bookings b
  JOIN properties p ON b.property_id = p.id
SET b.owner_id = p.owner_id
WHERE b.owner_id IS NULL;

-- ─── 7. VIEWING REQUESTS — same ─────────────────────────────
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS owner_id INT AFTER property_id;

UPDATE viewing_requests v
  JOIN properties p ON v.property_id = p.id
SET v.owner_id = p.owner_id
WHERE v.owner_id IS NULL;

-- ─── 8. NEW TABLES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_manager_assignments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  property_id  INT NOT NULL,
  manager_id   INT NOT NULL,
  assigned_by  INT,
  assigned_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id)  REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id)       ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tenants (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  property_id          INT NOT NULL,
  room_id              INT NOT NULL,
  name                 VARCHAR(150) NOT NULL,
  phone                VARCHAR(20)  NOT NULL,
  whatsapp_phone       VARCHAR(20),
  email                VARCHAR(200),
  lease_start          DATE NOT NULL,
  lease_end            DATE,
  monthly_rent         INT NOT NULL,
  rent_due_day         TINYINT NOT NULL DEFAULT 1,
  reminder_days_before TINYINT NOT NULL DEFAULT 3,
  reminders_enabled    TINYINT(1) NOT NULL DEFAULT 1,
  added_by             INT,
  notes                TEXT,
  status               ENUM('active','vacated','evicted') NOT NULL DEFAULT 'active',
  vacated_at           DATE,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id)     REFERENCES rooms(id)       ON DELETE CASCADE,
  FOREIGN KEY (added_by)    REFERENCES users(id)       ON DELETE SET NULL
);

-- ─── 9. ZONE/CLUSTER SEED DATA ───────────────────────────────
INSERT IGNORE INTO zones (code, name, city, description) VALUES
('A','UDSM / Ardhi / Ubungo','Dar es Salaam','Ubungo–UDSM–Ardhi–Sinza corridor'),
('B','Kinondoni / Mwenge','Dar es Salaam','Kinondoni–Mwenge–Mikocheni corridor'),
('C','Upanga / City Centre','Dar es Salaam','Upanga–Kariakoo–Ilala–City Centre'),
('D','City / Kigamboni','Dar es Salaam','City Centre–Kigamboni corridor'),
('E','Tegeta / Boko / Mbezi','Dar es Salaam','Tegeta–Boko–Mbezi corridor'),
('F','Mbezi / Kimara / West','Dar es Salaam','Mbezi–Kimara–Kibamba corridor'),
('G','Temeke / Chang''ombe / Kurasini','Dar es Salaam','Separate operational zone');

INSERT IGNORE INTO clusters (zone_id, code, name)
SELECT z.id,'A1','UDSM' FROM zones z WHERE z.code='A' UNION ALL
SELECT z.id,'A2','Ardhi' FROM zones z WHERE z.code='A' UNION ALL
SELECT z.id,'A3','Ubungo' FROM zones z WHERE z.code='A' UNION ALL
SELECT z.id,'A4','Sinza' FROM zones z WHERE z.code='A' UNION ALL
SELECT z.id,'A5','Kijitonyama' FROM zones z WHERE z.code='A' UNION ALL
SELECT z.id,'B1','Kinondoni' FROM zones z WHERE z.code='B' UNION ALL
SELECT z.id,'B2','Mwenge' FROM zones z WHERE z.code='B' UNION ALL
SELECT z.id,'B3','Mikocheni' FROM zones z WHERE z.code='B' UNION ALL
SELECT z.id,'B4','Kijitonyama B' FROM zones z WHERE z.code='B' UNION ALL
SELECT z.id,'B5','Kairuki' FROM zones z WHERE z.code='B' UNION ALL
SELECT z.id,'C1','MUHAS / Upanga' FROM zones z WHERE z.code='C' UNION ALL
SELECT z.id,'C2','IFM / DIT' FROM zones z WHERE z.code='C' UNION ALL
SELECT z.id,'C3','CBE' FROM zones z WHERE z.code='C' UNION ALL
SELECT z.id,'C4','Kariakoo' FROM zones z WHERE z.code='C' UNION ALL
SELECT z.id,'C5','City Centre' FROM zones z WHERE z.code='C' UNION ALL
SELECT z.id,'D1','City Centre D' FROM zones z WHERE z.code='D' UNION ALL
SELECT z.id,'D2','Kigamboni' FROM zones z WHERE z.code='D' UNION ALL
SELECT z.id,'D3','Mjimwema' FROM zones z WHERE z.code='D' UNION ALL
SELECT z.id,'E1','Tegeta' FROM zones z WHERE z.code='E' UNION ALL
SELECT z.id,'E2','Wazo' FROM zones z WHERE z.code='E' UNION ALL
SELECT z.id,'E3','Boko' FROM zones z WHERE z.code='E' UNION ALL
SELECT z.id,'E4','Mbezi Beach' FROM zones z WHERE z.code='E' UNION ALL
SELECT z.id,'E5','Mbezi' FROM zones z WHERE z.code='E' UNION ALL
SELECT z.id,'F1','Mbezi' FROM zones z WHERE z.code='F' UNION ALL
SELECT z.id,'F2','Kimara' FROM zones z WHERE z.code='F' UNION ALL
SELECT z.id,'F3','Kibamba' FROM zones z WHERE z.code='F' UNION ALL
SELECT z.id,'F4','Goba' FROM zones z WHERE z.code='F' UNION ALL
SELECT z.id,'G1','Temeke' FROM zones z WHERE z.code='G' UNION ALL
SELECT z.id,'G2','Chang''ombe' FROM zones z WHERE z.code='G' UNION ALL
SELECT z.id,'G3','Kurasini' FROM zones z WHERE z.code='G' UNION ALL
SELECT z.id,'G4','Bandari' FROM zones z WHERE z.code='G' UNION ALL
SELECT z.id,'G5','Kigamboni G' FROM zones z WHERE z.code='G' UNION ALL
SELECT z.id,'G6','Mbagala' FROM zones z WHERE z.code='G';

-- ─── 10. NEW AMENITY NAMES (Swahili) ─────────────────────────
UPDATE amenities SET name='Maji 24/7'          WHERE name='Water 24/7';
UPDATE amenities SET name='Umeme'              WHERE name='Electricity';
UPDATE amenities SET name='Walinzi'            WHERE name='Security Guard';
UPDATE amenities SET name='Jiko/Meko'          WHERE name='Kitchen';
UPDATE amenities SET name='Chumba cha Kusomea' WHERE name='Study Room';
UPDATE amenities SET name='Fanicha'            WHERE name='Furnished';

-- ─── 11. ADD NEW INDEXES ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_zone         ON users(zone_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner   ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_zone    ON properties(zone_id);
CREATE INDEX IF NOT EXISTS idx_properties_cluster ON properties(cluster_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property   ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_pma_manager        ON property_manager_assignments(manager_id, is_active);
