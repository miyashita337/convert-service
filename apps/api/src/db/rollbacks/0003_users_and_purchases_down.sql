-- Rollback: 0003_users_and_purchases

-- SQLite does not support DROP COLUMN directly in older versions.
-- For D1, we recreate jobs without user_email if needed.
-- In practice, ALTER TABLE ADD COLUMN is safe to leave.

DROP INDEX IF EXISTS idx_purchases_stripe_pi;
DROP INDEX IF EXISTS idx_purchases_expires;
DROP INDEX IF EXISTS idx_purchases_customer;
DROP TABLE IF EXISTS purchases;

DROP INDEX IF EXISTS idx_users_google_id;
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
