-- users: 認証済みユーザー（Google OAuth）
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

-- purchases: 買い切りパス・サブスクリプション購入履歴
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

-- jobs テーブルにユーザー紐付けカラム追加
ALTER TABLE jobs ADD COLUMN user_email TEXT;
