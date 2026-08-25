-- ============================================================
--  GETO STUDENT v3 — Landmark + Multiple Universities
-- ============================================================

-- ─── 1. Add landmark column to properties ─────────────────
-- Allows fine-grained location search ("karibu na Mlimani Mall")
ALTER TABLE properties ADD COLUMN landmark VARCHAR(200) NULL AFTER address;

-- ─── 2. Property ↔ Universities junction table ────────────
-- A property can be near multiple universities/colleges
CREATE TABLE IF NOT EXISTS property_universities (
  property_id   INT NOT NULL,
  university_id INT NOT NULL,
  PRIMARY KEY (property_id, university_id),
  FOREIGN KEY (property_id)   REFERENCES properties(id)   ON DELETE CASCADE,
  FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
);

-- ─── 3. Backfill property_universities from nearest_university_id ─
INSERT IGNORE INTO property_universities (property_id, university_id)
SELECT id, nearest_university_id FROM properties WHERE nearest_university_id IS NOT NULL;
