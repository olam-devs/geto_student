-- Migration v6 (2026-11-02): house availability + traffic sources for admin analytics
-- MySQL 8.0. The API also adds these columns automatically on its first request (migrate()
-- in php-api/index.php), so running this file by hand is optional.

ALTER TABLE properties ADD COLUMN availability ENUM('available','full') NOT NULL DEFAULT 'available';
ALTER TABLE properties ADD COLUMN availability_updated_at TIMESTAMP NULL;

-- First page of a visit only: where the visitor came from (NULL on later pages)
ALTER TABLE page_views ADD COLUMN source VARCHAR(40) NULL;
ALTER TABLE page_views ADD COLUMN referrer_host VARCHAR(120) NULL;

-- Rollback:
-- ALTER TABLE properties DROP COLUMN availability, DROP COLUMN availability_updated_at;
-- ALTER TABLE page_views DROP COLUMN source, DROP COLUMN referrer_host;
