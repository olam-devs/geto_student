-- ============================================================
--  GETO STUDENT v5 — Highlights, Deposit Notes, Room Media, Dynamic Types
-- ============================================================

-- 1. Property highlight (short card teaser shown before student clicks)
ALTER TABLE properties ADD COLUMN highlight VARCHAR(300) NULL;

-- 2. Room deposit note (text field, e.g. "Miezi 3 ya kodi")
ALTER TABLE rooms ADD COLUMN deposit_note VARCHAR(200) NULL;

-- 3. Room photos
CREATE TABLE IF NOT EXISTS room_photos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  room_id    INT NOT NULL,
  url        VARCHAR(500) NOT NULL,
  is_main    TINYINT DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room_id (room_id)
);

-- 4. Room YouTube video links
CREATE TABLE IF NOT EXISTS room_videos (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  room_id          INT NOT NULL,
  youtube_video_id VARCHAR(20) NOT NULL,
  title            VARCHAR(200) NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room_id (room_id)
);

-- 5. Dynamic property types (admin-managed)
CREATE TABLE IF NOT EXISTS property_types (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO property_types (name, sort_order) VALUES
  ('Nyumba ya Vyumba', 1), ('Hostel', 2), ('Apartment', 3),
  ('Bedsitter', 4), ('Studio', 5), ('Shared House', 6),
  ('Student Residence', 7), ('Other', 8);

-- 6. Dynamic room types (admin-managed)
CREATE TABLE IF NOT EXISTS room_types (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO room_types (name, sort_order) VALUES
  ('Single', 1), ('Double', 2), ('Shared', 3),
  ('Master', 4), ('Bedsitter', 5), ('Studio', 6);
