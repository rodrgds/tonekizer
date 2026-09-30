CREATE TABLE submission_limits (
  key TEXT PRIMARY KEY,
  minute INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
CREATE INDEX submission_limits_expiry ON submission_limits(minute);
