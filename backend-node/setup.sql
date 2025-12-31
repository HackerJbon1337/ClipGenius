-- ============================================
-- ClipGenius Supabase Database Setup
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)
-- ============================================

-- 1. Videos Table
-- Stores YouTube videos that have been analyzed
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id TEXT NOT NULL,
    youtube_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by YouTube ID
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);

-- 2. Highlights Table
-- Stores the interesting moments found by AI
CREATE TABLE IF NOT EXISTS highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    start_timestamp INTEGER NOT NULL,  -- Start time in seconds
    end_timestamp INTEGER NOT NULL,    -- End time in seconds
    reason TEXT NOT NULL,              -- Why this moment is interesting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by video
CREATE INDEX IF NOT EXISTS idx_highlights_video_id ON highlights(video_id);

-- 3. Clips Table
-- Stores video clip download requests and their status
CREATE TABLE IF NOT EXISTS clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
    download_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clips_highlight_id ON clips(highlight_id);

-- 4. Enable Row Level Security (RLS)
-- For now, allow all operations (you can make this more restrictive later)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anonymous users (for MVP)
-- In production, you would want to add proper authentication
CREATE POLICY "Allow all for videos" ON videos FOR ALL USING (true);
CREATE POLICY "Allow all for highlights" ON highlights FOR ALL USING (true);
CREATE POLICY "Allow all for clips" ON clips FOR ALL USING (true);

-- 5. Create Storage Bucket for video clips
-- Note: You need to create this in the Supabase Dashboard:
-- Storage > New Bucket > Name: "clips" > Make it public

-- ============================================
-- DONE! Your database is ready.
-- ============================================
-- Next steps:
-- 1. Go to Settings > API
-- 2. Copy your Project URL and anon key
-- 3. Paste them in backend-node/.env
-- ============================================
