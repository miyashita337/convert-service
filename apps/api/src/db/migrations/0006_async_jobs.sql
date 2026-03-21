-- Add async job support: progress tracking and category classification
ALTER TABLE jobs ADD COLUMN progress INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN category TEXT DEFAULT 'image';
