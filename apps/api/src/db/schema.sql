-- QuickConv DB Schema (D1 / SQLite)
-- Full schema reflecting all migrations

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  input_file_key TEXT NOT NULL,
  input_format TEXT NOT NULL,
  output_format TEXT NOT NULL,
  output_file_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  file_size INTEGER,
  error_message TEXT,
  user_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_expires ON jobs(expires_at);

CREATE TABLE IF NOT EXISTS anonymous_users (
  id TEXT PRIMARY KEY,
  daily_count INTEGER DEFAULT 0,
  count_date TEXT,
  last_used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_anonymous_users_count_date ON anonymous_users(count_date);

CREATE TABLE IF NOT EXISTS users (
  stripe_customer_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  auth_provider TEXT NOT NULL DEFAULT 'google',
  google_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL REFERENCES users(stripe_customer_id),
  plan TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'pass',
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_purchases_customer ON purchases(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_expires ON purchases(expires_at);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_pi ON purchases(stripe_payment_intent_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  stripe_subscription_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL REFERENCES users(stripe_customer_id),
  plan_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
