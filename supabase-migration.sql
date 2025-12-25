-- Create scan_history table in Supabase
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS scan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  scan_time TEXT NOT NULL,
  coins_data JSONB NOT NULL
);

-- Create an index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON scan_history(created_at DESC);

-- IMPORTANT: Disable RLS for scan_history table
-- Since we use Service Role Key for server-side operations, RLS is not needed
-- If RLS is enabled, it will block inserts even with Service Role Key
ALTER TABLE scan_history DISABLE ROW LEVEL SECURITY;

