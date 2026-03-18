-- Create dedicated subscriptions table for lifecycle management
-- Tracks Stripe subscription state independently from purchases

CREATE TABLE IF NOT EXISTS subscriptions (
  stripe_subscription_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL REFERENCES users(stripe_customer_id),
  plan_type TEXT NOT NULL,  -- 'plus_monthly' | 'plus_yearly' | 'pro_monthly' | 'pro_yearly'
  status TEXT NOT NULL DEFAULT 'active',  -- Stripe subscription status
  current_period_end TEXT,  -- ISO 8601 timestamp
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,  -- boolean (SQLite)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- DOWN migration (for rollback):
-- DROP INDEX IF EXISTS idx_subscriptions_status;
-- DROP INDEX IF EXISTS idx_subscriptions_customer;
-- DROP TABLE IF EXISTS subscriptions;
