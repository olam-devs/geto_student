-- ============================================================
--  GETO STUDENT v4 — SMS Logs + Manager Property Tracking
-- ============================================================

-- 1. Track which staff user created each property (admin vs zone_manager)
ALTER TABLE properties ADD COLUMN created_by INT NULL;
ALTER TABLE properties ADD COLUMN created_by_role VARCHAR(30) NULL;

-- 2. SMS delivery log table
CREATE TABLE IF NOT EXISTS sms_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  recipient_phone VARCHAR(20)  NOT NULL,
  message         TEXT         NOT NULL,
  reference       VARCHAR(100),
  status          VARCHAR(50)  DEFAULT 'PENDING',
  message_id      BIGINT       NULL,
  sent_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sent_at   (sent_at),
  INDEX idx_reference (reference(50)),
  INDEX idx_message_id (message_id)
);
