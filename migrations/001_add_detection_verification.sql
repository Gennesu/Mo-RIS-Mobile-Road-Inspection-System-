ALTER TABLE detections
  ADD COLUMN verification_status VARCHAR(24) NOT NULL DEFAULT 'confirmed' AFTER status,
  ADD COLUMN verifier_label VARCHAR(50) NULL AFTER verification_status,
  ADD COLUMN verifier_confidence FLOAT NULL AFTER verifier_label,
  ADD COLUMN verification_note VARCHAR(500) NULL AFTER verifier_confidence,
  ADD COLUMN verified_at TIMESTAMP NULL DEFAULT NULL AFTER verification_note,
  ADD KEY idx_detections_verification_status (verification_status);
