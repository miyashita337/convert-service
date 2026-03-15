-- Subscription support: extend users and purchases for recurring billing

-- Add subscription fields to users
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN plan_period TEXT DEFAULT 'monthly';

-- Add subscription_id index to purchases
CREATE INDEX IF NOT EXISTS idx_purchases_subscription ON purchases(stripe_subscription_id);
