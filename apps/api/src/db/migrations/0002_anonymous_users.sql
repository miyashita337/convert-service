-- anonymous_users: レート制限用カウンターテーブル
-- clientHash (SHA-256) をキーとし、生IPは保存しない
CREATE TABLE IF NOT EXISTS anonymous_users (
  id TEXT PRIMARY KEY,
  daily_count INTEGER DEFAULT 0,
  count_date TEXT,
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_anonymous_users_count_date ON anonymous_users(count_date);
