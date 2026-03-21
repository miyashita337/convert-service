-- Add video monthly conversion count for cost-based rate limiting
ALTER TABLE anonymous_users ADD COLUMN video_monthly_count INTEGER DEFAULT 0;
ALTER TABLE anonymous_users ADD COLUMN video_count_month TEXT DEFAULT '';
