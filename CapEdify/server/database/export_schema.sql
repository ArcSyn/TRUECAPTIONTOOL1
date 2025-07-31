-- CapEdify Advanced Export System Schema
-- Tables for managing export presets, custom exports, and file expiry

-- Export Presets Table - User-saved export configurations
CREATE TABLE IF NOT EXISTS export_presets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    config_json JSONB NOT NULL, -- Stores: formats, theme, zipMode, compress, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT export_presets_name_unique UNIQUE (user_id, name),
    CONSTRAINT export_presets_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Custom Exports Table - Generated export bundles with expiry
CREATE TABLE IF NOT EXISTS custom_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    job_ids TEXT[] NOT NULL, -- Array of pipeline job IDs included in export
    export_config JSONB NOT NULL, -- Full export configuration used
    
    -- File information
    zip_filename TEXT NOT NULL,
    zip_url TEXT, -- Supabase storage URL or local file path
    zip_size_bytes BIGINT,
    
    -- Status and timing
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Error handling
    error_message TEXT,
    
    -- Indexing for efficient queries
    INDEX idx_custom_exports_user_id (user_id),
    INDEX idx_custom_exports_expires_at (expires_at),
    INDEX idx_custom_exports_status (status)
);

-- Pipeline Jobs Extended Table - Enhanced job tracking with all formats
CREATE TABLE IF NOT EXISTS pipeline_jobs_extended (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE, -- Links to existing pipeline job system
    user_id UUID NOT NULL,
    
    -- Original input information
    input_filename TEXT NOT NULL,
    input_type TEXT NOT NULL CHECK (input_type IN ('video', 'srt')),
    duration_minutes NUMERIC,
    
    -- Processing configuration
    processing_config JSONB NOT NULL, -- userTier, style, position, etc.
    
    -- Generated files (all formats)
    files_generated JSONB, -- Paths to: jsx, srt, vtt, json, txt, mp4
    
    -- Status and metadata
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexing
    INDEX idx_pipeline_jobs_ext_user_id (user_id),
    INDEX idx_pipeline_jobs_ext_job_id (job_id),
    INDEX idx_pipeline_jobs_ext_status (status)
);

-- Export Themes Table - Predefined and custom caption themes
CREATE TABLE IF NOT EXISTS export_themes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Theme configuration
    theme_config JSONB NOT NULL, -- Font, colors, positioning, animation settings
    
    -- Categorization and access
    category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('system', 'user', 'custom')),
    is_public BOOLEAN DEFAULT false,
    created_by UUID, -- User who created custom theme
    
    -- Metadata
    preview_image_url TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexing
    INDEX idx_export_themes_category (category),
    INDEX idx_export_themes_public (is_public)
);

-- Insert default system themes
INSERT INTO export_themes (name, display_name, description, theme_config, category, is_public)
VALUES 
    ('youtube_bold', 'YouTube Bold', 'Bold yellow captions perfect for YouTube content', 
     '{"fontFamily": "Arial Black", "fontSize": "48px", "fontWeight": "900", "color": "#FFD700", "backgroundColor": "rgba(0,0,0,0.8)", "borderRadius": "8px", "padding": "12px 24px", "textAlign": "center", "animation": "fadeIn"}', 
     'system', true),
    
    ('minimal_clean', 'Minimal Clean', 'Clean white text for professional content',
     '{"fontFamily": "Helvetica Neue", "fontSize": "36px", "fontWeight": "400", "color": "#FFFFFF", "backgroundColor": "rgba(0,0,0,0.6)", "borderRadius": "4px", "padding": "8px 16px", "textAlign": "center", "animation": "none"}',
     'system', true),
     
    ('tiktok_trendy', 'TikTok Trendy', 'Eye-catching captions for social media',
     '{"fontFamily": "Impact", "fontSize": "42px", "fontWeight": "700", "color": "#FF6B6B", "backgroundColor": "rgba(255,255,255,0.9)", "borderRadius": "12px", "padding": "16px 20px", "textAlign": "center", "animation": "bounce", "border": "3px solid #4ECDC4"}',
     'system', true),
     
    ('podcast_pro', 'Podcast Pro', 'Professional captions for podcast clips',
     '{"fontFamily": "Georgia", "fontSize": "32px", "fontWeight": "500", "color": "#2C3E50", "backgroundColor": "rgba(255,255,255,0.95)", "borderRadius": "6px", "padding": "12px 20px", "textAlign": "left", "animation": "slideIn"}',
     'system', true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for export_presets updated_at
CREATE TRIGGER update_export_presets_updated_at 
    BEFORE UPDATE ON export_presets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically cleanup expired exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update status of expired exports
    UPDATE custom_exports 
    SET status = 'expired' 
    WHERE expires_at < NOW() 
    AND status NOT IN ('expired', 'failed');
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO export_cleanup_log (cleaned_count, cleanup_date)
    VALUES (expired_count, NOW());
    
    RETURN expired_count;
END;
$$ language 'plpgsql';

-- Export cleanup log table
CREATE TABLE IF NOT EXISTS export_cleanup_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cleaned_count INTEGER NOT NULL,
    cleanup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE export_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_jobs_extended ENABLE ROW LEVEL SECURITY;

-- Users can only access their own export presets
CREATE POLICY "Users can view own export presets" ON export_presets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own export presets" ON export_presets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own export presets" ON export_presets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own export presets" ON export_presets
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only access their own custom exports
CREATE POLICY "Users can view own custom exports" ON custom_exports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom exports" ON custom_exports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only access their own pipeline jobs
CREATE POLICY "Users can view own pipeline jobs" ON pipeline_jobs_extended
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pipeline jobs" ON pipeline_jobs_extended
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pipeline jobs" ON pipeline_jobs_extended
    FOR UPDATE USING (auth.uid() = user_id);

-- Public themes are visible to all users
CREATE POLICY "Public themes are viewable by all" ON export_themes
    FOR SELECT USING (is_public = true OR created_by = auth.uid());

-- Comments for documentation
COMMENT ON TABLE export_presets IS 'User-saved export configurations for quick reuse';
COMMENT ON TABLE custom_exports IS 'Generated export bundles with automatic expiry management';
COMMENT ON TABLE pipeline_jobs_extended IS 'Enhanced pipeline job tracking with multi-format file storage';
COMMENT ON TABLE export_themes IS 'Caption themes for customizing export appearance';

COMMENT ON COLUMN export_presets.config_json IS 'JSON configuration: {formats: string[], theme: string, zipMode: string, compress: boolean, customOptions: object}';
COMMENT ON COLUMN custom_exports.job_ids IS 'Array of pipeline job IDs included in this export bundle';
COMMENT ON COLUMN custom_exports.export_config IS 'Complete export configuration used to generate this bundle';
COMMENT ON COLUMN pipeline_jobs_extended.files_generated IS 'JSON object with paths to all generated format files: {jsx: string, srt: string, vtt: string, json: string, txt: string, mp4?: string}';