-- Advanced Export System Database Schema
-- Tables for export presets and exports tracking

-- Export presets for user-defined templates
CREATE TABLE IF NOT EXISTS export_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  config_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add constraints
  CONSTRAINT export_presets_name_length CHECK (length(name) >= 1 AND length(name) <= 255),
  CONSTRAINT export_presets_user_name_unique UNIQUE (user_id, name)
);

-- Exports tracking table
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  job_ids JSONB NOT NULL, -- Array of job IDs
  formats JSONB NOT NULL, -- Array of export formats
  jsx_style VARCHAR(50),
  zip_mode VARCHAR(50) NOT NULL DEFAULT 'grouped',
  compress BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  download_url TEXT,
  processed_jobs INTEGER DEFAULT 0,
  errors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Add constraints
  CONSTRAINT exports_status_check CHECK (status IN ('processing', 'completed', 'failed', 'expired')),
  CONSTRAINT exports_zip_mode_check CHECK (zip_mode IN ('individual', 'grouped', 'combined')),
  CONSTRAINT exports_jsx_style_check CHECK (jsx_style IS NULL OR jsx_style IN ('bold', 'modern', 'plain')),
  CONSTRAINT exports_expires_future CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_export_presets_user_id ON export_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_export_presets_created_at ON export_presets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);
CREATE INDEX IF NOT EXISTS idx_exports_export_id ON exports(export_id);
CREATE INDEX IF NOT EXISTS idx_exports_status ON exports(status);
CREATE INDEX IF NOT EXISTS idx_exports_expires_at ON exports(expires_at);
CREATE INDEX IF NOT EXISTS idx_exports_created_at ON exports(created_at DESC);

-- Function to update updated_at timestamp
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
  cleanup_count INTEGER;
BEGIN
  -- Update status of expired exports
  UPDATE exports 
  SET status = 'expired' 
  WHERE status != 'expired' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Log cleanup if any records were updated
  IF cleanup_count > 0 THEN
    RAISE NOTICE 'Marked % exports as expired', cleanup_count;
  END IF;
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (if pg_cron is available)
-- This will attempt to create the job, but won't fail if pg_cron isn't installed
DO $$
BEGIN
  -- Try to schedule cleanup every hour
  PERFORM cron.schedule('cleanup-expired-exports', '0 * * * *', 'SELECT cleanup_expired_exports();');
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available - expired exports cleanup must be run manually';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule automated cleanup: %', SQLERRM;
END $$;

-- Sample export preset configurations for reference
COMMENT ON TABLE export_presets IS 'User-defined export templates with format preferences';
COMMENT ON COLUMN export_presets.config_json IS 'JSON configuration: {"formats": ["jsx", "srt"], "jsxStyle": "bold", "zipMode": "grouped", "compress": true}';

COMMENT ON TABLE exports IS 'Export job tracking with expiration and download URLs';
COMMENT ON COLUMN exports.job_ids IS 'Array of pipeline job IDs to export';
COMMENT ON COLUMN exports.formats IS 'Array of requested export formats: jsx, srt, txrt, ytvv';
COMMENT ON COLUMN exports.errors IS 'Array of error messages if any jobs failed';

-- Grant permissions (adjust as needed for your setup)
-- These commands may need to be run by a superuser depending on your setup
-- GRANT SELECT, INSERT, UPDATE, DELETE ON export_presets TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON exports TO authenticated;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;