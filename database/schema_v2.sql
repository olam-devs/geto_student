-- ============================================================
--  GETO STUDENT — Database Schema v2.0
--  August 2026 | Zones + Roles overhaul
-- ============================================================

CREATE DATABASE IF NOT EXISTS geto_student CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE geto_student;

-- ─── ZONES ──────────────────────────────────────────────────
CREATE TABLE zones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(2) NOT NULL UNIQUE,   -- A, B, C ... G
  name        VARCHAR(100) NOT NULL,
  city        VARCHAR(80) NOT NULL DEFAULT 'Dar es Salaam',
  description TEXT,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── CLUSTERS ───────────────────────────────────────────────
CREATE TABLE clusters (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  zone_id     INT NOT NULL,
  code        VARCHAR(5) NOT NULL UNIQUE,   -- A1, A2 ... G6
  name        VARCHAR(100) NOT NULL,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

-- ─── UNIVERSITIES ───────────────────────────────────────────
CREATE TABLE universities (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  short_name  VARCHAR(40)  NOT NULL,
  area        VARCHAR(100) NOT NULL,
  district    VARCHAR(100) NOT NULL DEFAULT 'Dar es Salaam',
  zone_id     INT,
  cluster_id  INT,
  gps_lat     DECIMAL(10,8),
  gps_lng     DECIMAL(11,8),
  image_url   TEXT,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id)    REFERENCES zones(id)    ON DELETE SET NULL,
  FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE SET NULL
);

-- ─── USERS ──────────────────────────────────────────────────
-- All user types in one table (students, owners, managers, zone staff, admin)
CREATE TABLE users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(150) NOT NULL,
  email               VARCHAR(200) NOT NULL UNIQUE,
  phone               VARCHAR(20)  NOT NULL,
  whatsapp_phone      VARCHAR(20),            -- can differ from phone
  password_hash       VARCHAR(255) NOT NULL,

  -- Role: student/property_owner/property_manager are frontend users
  --       zone_manager/admin are backend staff (login at /admin)
  role                ENUM('student','property_owner','property_manager','zone_manager','admin')
                      NOT NULL DEFAULT 'student',

  status              ENUM('active','suspended','pending_verification')
                      NOT NULL DEFAULT 'active',

  -- Zone assignment (zone_manager only — which zone they cover)
  zone_id             INT,

  -- Student fields
  university_id       INT,
  student_id_number   VARCHAR(50),

  -- Owner/Manager verification
  id_document_url     TEXT,
  business_name       VARCHAR(200),
  verified            TINYINT(1) NOT NULL DEFAULT 0,
  verified_by         INT,                    -- FK to users.id (admin)
  verified_at         DATETIME,
  rejection_note      TEXT,

  -- Terms & referrals
  terms_accepted      TINYINT(1) NOT NULL DEFAULT 0,
  terms_accepted_at   DATETIME,
  referral_code       VARCHAR(20) UNIQUE,
  referred_by         INT,                    -- FK to users.id (self-ref)

  avatar_url          TEXT,
  last_login_at       DATETIME,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (zone_id)      REFERENCES zones(id)       ON DELETE SET NULL,
  FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by)  REFERENCES users(id)        ON DELETE SET NULL,
  FOREIGN KEY (referred_by)  REFERENCES users(id)        ON DELETE SET NULL
);

-- ─── PROPERTIES ─────────────────────────────────────────────
CREATE TABLE properties (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  owner_id              INT NOT NULL,         -- FK users (role=property_owner)
  name                  VARCHAR(200) NOT NULL,
  property_type         ENUM('Nyumzba ya Vyumba','Hostel','Apartment','Bedsitter',
                             'Studio','Shared House','Student Residence','Other')
                        NOT NULL,
  zone_id               INT,
  cluster_id            INT,
  nearest_university_id INT NOT NULL,
  distance_km           DECIMAL(5,2),
  transport_options     VARCHAR(300),         -- e.g. 'Daladala, Bajaji, Walk'
  area                  VARCHAR(100) NOT NULL,
  address               TEXT NOT NULL,
  description           TEXT NOT NULL,
  youtube_video_id      VARCHAR(20),          -- YouTube video ID only (not full URL)
  total_floors          TINYINT,              -- optional, for floor-based room org
  status                ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  verified              TINYINT(1) NOT NULL DEFAULT 0,
  verified_by           INT,                  -- FK to users.id
  verified_at           DATETIME,
  verification_expiry   DATE,
  views_count           INT NOT NULL DEFAULT 0,
  rejection_note        TEXT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (owner_id)              REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (zone_id)               REFERENCES zones(id)         ON DELETE SET NULL,
  FOREIGN KEY (cluster_id)            REFERENCES clusters(id)      ON DELETE SET NULL,
  FOREIGN KEY (nearest_university_id) REFERENCES universities(id),
  FOREIGN KEY (verified_by)           REFERENCES users(id)         ON DELETE SET NULL
);

-- ─── PROPERTY–MANAGER ASSIGNMENTS ───────────────────────────
-- A property can have one active manager; a manager can handle multiple properties
CREATE TABLE property_manager_assignments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  property_id  INT NOT NULL,
  manager_id   INT NOT NULL,               -- FK users (role=property_manager)
  assigned_by  INT,                        -- FK users (admin or owner)
  assigned_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_active_manager (property_id, is_active),  -- one active manager per property
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id)  REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id)       ON DELETE SET NULL
);

-- ─── PROPERTY PHOTOS ────────────────────────────────────────
CREATE TABLE property_photos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  url         TEXT NOT NULL,               -- always stored as .webp
  caption     VARCHAR(200),
  is_main     TINYINT(1) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- ─── AMENITIES ──────────────────────────────────────────────
CREATE TABLE amenities (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL UNIQUE,
  icon  VARCHAR(50)
);

CREATE TABLE property_amenities (
  property_id INT NOT NULL,
  amenity_id  INT NOT NULL,
  PRIMARY KEY (property_id, amenity_id),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (amenity_id)  REFERENCES amenities(id)  ON DELETE CASCADE
);

-- ─── ROOMS (per category per property) ──────────────────────
-- Each row = one room CATEGORY (type) within a property
-- e.g. a hostel might have: Single (20 total, 15 occupied) + Shared (30 total, 28 occupied)
CREATE TABLE rooms (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  property_id     INT NOT NULL,
  room_type       ENUM('Single','Double','Shared','Master','Bedsitter','Studio') NOT NULL,
  monthly_price   INT NOT NULL,             -- TZS per month
  deposit         INT NOT NULL DEFAULT 0,
  capacity        TINYINT NOT NULL DEFAULT 1, -- people per room
  total_count     SMALLINT NOT NULL DEFAULT 1,
  occupied_count  SMALLINT NOT NULL DEFAULT 0,
  floor           TINYINT,                  -- optional floor number
  furnished       TINYINT(1) NOT NULL DEFAULT 0,
  bathroom_type   ENUM('Private','Shared') NOT NULL DEFAULT 'Shared',
  description     TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- ─── TENANTS (optional, for rent reminders) ─────────────────
-- Property manager or owner can add tenants to specific rooms
CREATE TABLE tenants (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  property_id      INT NOT NULL,
  room_id          INT NOT NULL,
  name             VARCHAR(150) NOT NULL,
  phone            VARCHAR(20)  NOT NULL,
  whatsapp_phone   VARCHAR(20),
  email            VARCHAR(200),
  lease_start      DATE NOT NULL,
  lease_end        DATE,
  monthly_rent     INT NOT NULL,            -- TZS (may differ from listed price)
  rent_due_day     TINYINT NOT NULL DEFAULT 1,  -- day of month rent is due (1-28)
  reminder_days_before TINYINT NOT NULL DEFAULT 3, -- days before due date to remind
  reminders_enabled TINYINT(1) NOT NULL DEFAULT 1,
  added_by         INT,                    -- FK to users (owner or manager)
  notes            TEXT,
  status           ENUM('active','vacated','evicted') NOT NULL DEFAULT 'active',
  vacated_at       DATE,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id)     REFERENCES rooms(id)       ON DELETE CASCADE,
  FOREIGN KEY (added_by)    REFERENCES users(id)       ON DELETE SET NULL
);

-- ─── BOOKINGS ───────────────────────────────────────────────
CREATE TABLE bookings (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  student_id     INT NOT NULL,
  property_id    INT NOT NULL,
  room_id        INT NOT NULL,
  owner_id       INT NOT NULL,             -- property owner (for portal filtering)
  move_in_date   DATE NOT NULL,
  move_in_notes  TEXT,
  status         ENUM('pending','accepted','payment_pending','confirmed',
                      'move_in_completed','cancelled','rejected')
                 NOT NULL DEFAULT 'pending',
  admin_notes    TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id)  REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id)  ON DELETE CASCADE,
  FOREIGN KEY (room_id)     REFERENCES rooms(id)        ON DELETE CASCADE,
  FOREIGN KEY (owner_id)    REFERENCES users(id)        ON DELETE CASCADE
);

-- ─── VIEWING REQUESTS ───────────────────────────────────────
CREATE TABLE viewing_requests (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  student_id      INT NOT NULL,
  property_id     INT NOT NULL,
  owner_id        INT NOT NULL,
  preferred_date  DATE NOT NULL,
  preferred_time  VARCHAR(20) NOT NULL DEFAULT 'Morning',
  notes           TEXT,
  status          ENUM('pending','scheduled','completed','cancelled') NOT NULL DEFAULT 'pending',
  admin_notes     TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id)  REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id)  ON DELETE CASCADE,
  FOREIGN KEY (owner_id)    REFERENCES users(id)        ON DELETE CASCADE
);

-- ─── SAVED PROPERTIES ───────────────────────────────────────
CREATE TABLE saved_properties (
  student_id  INT NOT NULL,
  property_id INT NOT NULL,
  saved_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, property_id),
  FOREIGN KEY (student_id)  REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id)  ON DELETE CASCADE
);

-- ─── REFERRALS ──────────────────────────────────────────────
CREATE TABLE referrals (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id     INT NOT NULL,
  referred_id     INT NOT NULL,
  referral_code   VARCHAR(20) NOT NULL,
  status          ENUM('registered','verified','booked','rewarded') NOT NULL DEFAULT 'registered',
  reward_amount   INT NOT NULL DEFAULT 0,
  paid_at         DATETIME,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── VERIFICATION RECORDS ───────────────────────────────────
CREATE TABLE verification_records (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  property_id           INT NOT NULL UNIQUE,
  verified_by           INT,               -- admin or zone_manager user id
  inspection_date       DATE,
  owner_identity        TINYINT(1) DEFAULT 0,
  location_confirmed    TINYINT(1) DEFAULT 0,
  rooms_confirmed       TINYINT(1) DEFAULT 0,
  water_confirmed       TINYINT(1) DEFAULT 0,
  electricity_confirmed TINYINT(1) DEFAULT 0,
  security_confirmed    TINYINT(1) DEFAULT 0,
  price_confirmed       TINYINT(1) DEFAULT 0,
  notes                 TEXT,
  expiry_date           DATE,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id)       ON DELETE SET NULL
);

-- ─── NOTIFICATIONS ──────────────────────────────────────────
CREATE TABLE notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  link        VARCHAR(300),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── AUDIT LOG ──────────────────────────────────────────────
CREATE TABLE audit_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  actor_id   INT,
  actor_type ENUM('student','property_owner','property_manager','zone_manager','admin','system')
             NOT NULL,
  action     VARCHAR(100) NOT NULL,
  entity     VARCHAR(50),
  entity_id  INT,
  details    JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX idx_users_role         ON users(role);
CREATE INDEX idx_users_zone         ON users(zone_id);
CREATE INDEX idx_users_status       ON users(status);
CREATE INDEX idx_properties_owner   ON properties(owner_id);
CREATE INDEX idx_properties_zone    ON properties(zone_id);
CREATE INDEX idx_properties_cluster ON properties(cluster_id);
CREATE INDEX idx_properties_uni     ON properties(nearest_university_id);
CREATE INDEX idx_properties_status  ON properties(status);
CREATE INDEX idx_properties_verified ON properties(verified);
CREATE INDEX idx_rooms_property     ON rooms(property_id);
CREATE INDEX idx_rooms_type         ON rooms(room_type);
CREATE INDEX idx_bookings_student   ON bookings(student_id);
CREATE INDEX idx_bookings_property  ON bookings(property_id);
CREATE INDEX idx_bookings_owner     ON bookings(owner_id);
CREATE INDEX idx_tenants_property   ON tenants(property_id);
CREATE INDEX idx_tenants_status     ON tenants(status);
CREATE INDEX idx_viewings_student   ON viewing_requests(student_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_pma_manager        ON property_manager_assignments(manager_id, is_active);
