CREATE TABLE submission_buckets (
  key TEXT PRIMARY KEY,
  drains_at INTEGER NOT NULL
);
CREATE INDEX submission_buckets_expiry ON submission_buckets(drains_at);
