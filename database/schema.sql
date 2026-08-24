-- ============================================================
--  GETO STUDENT — Database Schema (MySQL)
--  Version 1.0  |  August 2026
-- ============================================================

CREATE DATABASE IF NOT EXISTS geto_student CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE geto_student;

-- ─── UNIVERSITIES ───────────────────────────────────────────
CREATE TABLE universities (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  short_name  VARCHAR(40)  NOT NULL,
  area        VARCHAR(100) NOT NULL,
  district    VARCHAR(100) NOT NULL DEFAULT 'Dar es Salaam',
  gps_lat     DECIMAL(10,8),
  gps_lng     DECIMAL(11,8),
  image_url   TEXT,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(200) NOT NULL UNIQUE,
  phone           VARCHAR(20)  NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('student','admin','support') NOT NULL DEFAULT 'student',
  status          ENUM('active','suspended','pending') NOT NULL DEFAULT 'active',
  university_id   INT,
  referral_code   VARCHAR(20) UNIQUE,
  referred_by     INT,                      -- FK to users.id (self-ref)
  avatar_url      TEXT,
  email_verified  TINYINT(1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
  FOREIGN KEY (referred_by)   REFERENCES users(id) ON DELETE SET NULL
);

-- ─── AGENTS (DALALI) ────────────────────────────────────────
CREATE TABLE agents (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(200) NOT NULL UNIQUE,
  phone           VARCHAR(20)  NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  business_name   VARCHAR(200),
  license_number  VARCHAR(100),
  id_document_url TEXT,                     -- uploaded ID (WebP)
  status          ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
  approved_by     INT,                      -- FK to users.id (admin)
  approved_at     DATETIME,
  rejection_note  TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── PROPERTIES ─────────────────────────────────────────────
CREATE TABLE properties (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  agent_id            INT NOT NULL,
  name                VARCHAR(200) NOT NULL,
  property_type       ENUM('Hostel','Apartment','House','Bedsitter','Student Residence','Shared Accommodation','Studio','Other') NOT NULL,
  university_id       INT NOT NULL,
  area                VARCHAR(100) NOT NULL,
  address             TEXT NOT NULL,
  distance_km         DECIMAL(5,2),
  description         TEXT NOT NULL,
  status              ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  verified            TINYINT(1) NOT NULL DEFAULT 0,
  verification_date   DATE,
  verification_expiry DATE,
  youtube_video_id    VARCHAR(20),           -- YouTube video ID (not full URL)
  views_count         INT NOT NULL DEFAULT 0,
  rejection_note      TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id)      REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (university_id) REFERENCES universities(id)
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
  icon  VARCHAR(10)              -- emoji icon
);

CREATE TABLE property_amenities (
  property_id INT NOT NULL,
  amenity_id  INT NOT NULL,
  PRIMARY KEY (property_id, amenity_id),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (amenity_id)  REFERENCES amenities(id)  ON DELETE CASCADE
);

-- ─── ROOMS ──────────────────────────────────────────────────
CREATE TABLE rooms (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  property_id     INT NOT NULL,
  room_type       ENUM('Single','Shared','Double','Master','Bedsitter','Studio') NOT NULL,
  monthly_price   INT NOT NULL,             -- TZS
  deposit         INT NOT NULL DEFAULT 0,
  capacity        TINYINT NOT NULL DEFAULT 1,
  available_count TINYINT NOT NULL DEFAULT 1,
  furnished       TINYINT(1) NOT NULL DEFAULT 0,
  bathroom_type   ENUM('Private','Shared') NOT NULL DEFAULT 'Shared',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- ─── BOOKINGS ───────────────────────────────────────────────
CREATE TABLE bookings (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  student_id     INT NOT NULL,
  property_id    INT NOT NULL,
  room_id        INT NOT NULL,
  move_in_date   DATE NOT NULL,
  move_in_notes  TEXT,
  status         ENUM('pending','accepted','payment_pending','confirmed','move_in_completed','cancelled','rejected') NOT NULL DEFAULT 'pending',
  agent_id       INT NOT NULL,             -- for admin reporting
  admin_notes    TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id)  REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id)  ON DELETE CASCADE,
  FOREIGN KEY (room_id)     REFERENCES rooms(id)        ON DELETE CASCADE,
  FOREIGN KEY (agent_id)    REFERENCES agents(id)       ON DELETE CASCADE
);

-- ─── SITE VIEWING REQUESTS ──────────────────────────────────
CREATE TABLE viewing_requests (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  student_id      INT NOT NULL,
  property_id     INT NOT NULL,
  preferred_date  DATE NOT NULL,
  preferred_time  VARCHAR(20) NOT NULL DEFAULT 'Morning',
  notes           TEXT,
  status          ENUM('pending','scheduled','completed','cancelled') NOT NULL DEFAULT 'pending',
  agent_id        INT NOT NULL,
  admin_notes     TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id)  REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id)  ON DELETE CASCADE,
  FOREIGN KEY (agent_id)    REFERENCES agents(id)       ON DELETE CASCADE
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
  reward_amount   INT NOT NULL DEFAULT 0,     -- TZS
  paid_at         DATETIME,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── VERIFICATION RECORDS ───────────────────────────────────
CREATE TABLE verification_records (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  property_id         INT NOT NULL UNIQUE,
  verified_by         INT,                     -- admin user id
  inspection_date     DATE,
  owner_identity      TINYINT(1) DEFAULT 0,
  location_confirmed  TINYINT(1) DEFAULT 0,
  rooms_confirmed     TINYINT(1) DEFAULT 0,
  water_confirmed     TINYINT(1) DEFAULT 0,
  electricity_confirmed TINYINT(1) DEFAULT 0,
  security_confirmed  TINYINT(1) DEFAULT 0,
  price_confirmed     TINYINT(1) DEFAULT 0,
  notes               TEXT,
  expiry_date         DATE,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── NOTIFICATIONS ──────────────────────────────────────────
CREATE TABLE notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  type        VARCHAR(50) NOT NULL,         -- e.g. 'booking_accepted', 'property_approved'
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
  actor_type ENUM('student','agent','admin','system') NOT NULL,
  action     VARCHAR(100) NOT NULL,
  entity     VARCHAR(50),
  entity_id  INT,
  details    JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX idx_properties_university  ON properties(university_id);
CREATE INDEX idx_properties_status      ON properties(status);
CREATE INDEX idx_properties_verified    ON properties(verified);
CREATE INDEX idx_properties_agent       ON properties(agent_id);
CREATE INDEX idx_rooms_property         ON rooms(property_id);
CREATE INDEX idx_bookings_student       ON bookings(student_id);
CREATE INDEX idx_bookings_property      ON bookings(property_id);
CREATE INDEX idx_bookings_agent         ON bookings(agent_id);
CREATE INDEX idx_viewings_student       ON viewing_requests(student_id);
CREATE INDEX idx_notifications_user     ON notifications(user_id, is_read);
CREATE INDEX idx_referrals_referrer     ON referrals(referrer_id);
