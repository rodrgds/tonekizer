CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mode TEXT NOT NULL CHECK(mode IN ('letters','open')),
  tokens INTEGER NOT NULL CHECK(tokens BETWEEN 1 AND 3),
  word TEXT NOT NULL,
  length INTEGER NOT NULL,
  nickname TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(mode, tokens, word)
);
CREATE INDEX leaderboard ON scores(mode, tokens, length DESC, id ASC);
