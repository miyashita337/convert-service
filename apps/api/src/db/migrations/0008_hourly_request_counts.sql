-- Hourly request counts for cost guard middleware
CREATE TABLE IF NOT EXISTS hourly_request_counts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
