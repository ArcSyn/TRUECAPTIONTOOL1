-- CapEdify Export System - Simplified Schema
-- Execute this in Supabase SQL Editor

-- Export Presets Table
CREATE TABLE IF NOT EXISTS export_presets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    config_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT export_presets_name_unique UNIQUE (user_id, name)
);

-- Custom Exports Table
CREATE TABLE IF NOT EXISTS custom_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    job_ids TEXT[] NOT NULL,
    export_config JSONB NOT NULL,
    zip_filename TEXT NOT NULL,
    zip_url TEXT,
    zip_size_bytes BIGINT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    error_message TEXT
);

-- Pipeline Jobs Extended Table
CREATE TABLE IF NOT EXISTS pipeline_jobs_extended (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    input_filename TEXT NOT NULL,
    input_type TEXT NOT NULL CHECK (input_type IN ('video', 'srt')),
    duration_minutes NUMERIC,
    processing_config JSONB NOT NULL,
    files_generated JSONB,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Export Themes Table
CREATE TABLE IF NOT EXISTS export_themes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    theme_config JSONB NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('system', 'user', 'custom')),
    is_public BOOLEAN DEFAULT false,
    created_by UUID,
    preview_image_url TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_exports_user_id ON custom_exports (user_id);
CREATE INDEX IF NOT EXISTS idx_custom_exports_expires_at ON custom_exports (expires_at);
CREATE INDEX IF NOT EXISTS idx_custom_exports_status ON custom_exports (status);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_ext_user_id ON pipeline_jobs_extended (user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_ext_job_id ON pipeline_jobs_extended (job_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_ext_status ON pipeline_jobs_extended (status);
CREATE INDEX IF NOT EXISTS idx_export_themes_category ON export_themes (category);
CREATE INDEX IF NOT EXISTS idx_export_themes_public ON export_themes (is_public);

-- Enable RLS
ALTER TABLE export_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_jobs_extended ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own export presets" ON export_presets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own export presets" ON export_presets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own export presets" ON export_presets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own export presets" ON export_presets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own custom exports" ON custom_exports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom exports" ON custom_exports FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own pipeline jobs" ON pipeline_jobs_extended FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pipeline jobs" ON pipeline_jobs_extended FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pipeline jobs" ON pipeline_jobs_extended FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public themes are viewable by all" ON export_themes FOR SELECT USING (is_public = true OR created_by = auth.uid());