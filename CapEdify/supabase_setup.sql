-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage logs table for API rate limiting
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcriptions_video_id ON transcriptions(video_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key ON usage_logs(api_key);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role access
CREATE POLICY IF NOT EXISTS "Allow service role full access on videos" 
ON videos FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow service role full access on transcriptions" 
ON transcriptions FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow service role full access on usage_logs" 
ON usage_logs FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('outputs', 'outputs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY IF NOT EXISTS "Allow public uploads to videos bucket" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'videos');

CREATE POLICY IF NOT EXISTS "Allow public reads from videos bucket" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'videos');

CREATE POLICY IF NOT EXISTS "Allow public uploads to outputs bucket" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'outputs');

CREATE POLICY IF NOT EXISTS "Allow public reads from outputs bucket" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'outputs');
