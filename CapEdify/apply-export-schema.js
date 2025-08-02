#!/usr/bin/env node

/**
 * Apply Advanced Export System Database Schema
 * 
 * Creates the necessary database tables for the Advanced Export System.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function applySchema() {
  console.log('🗄️  Applying Advanced Export System Database Schema');
  console.log('=' .repeat(60));
  
  try {
    // Create export_presets table
    console.log('\n📋 Creating export_presets table...');
    const { error: presetsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS export_presets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          config_json JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          CONSTRAINT export_presets_name_length CHECK (length(name) >= 1 AND length(name) <= 255),
          CONSTRAINT export_presets_user_name_unique UNIQUE (user_id, name)
        );
      `
    });
    
    if (presetsError) {
      console.log('❌ export_presets table creation failed:', presetsError.message);
    } else {
      console.log('✅ export_presets table created successfully');
    }
    
    // Create exports table
    console.log('\n📋 Creating exports table...');
    const { error: exportsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS exports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          export_id UUID NOT NULL UNIQUE,
          user_id UUID NOT NULL,
          job_ids JSONB NOT NULL,
          formats JSONB NOT NULL,
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
          
          CONSTRAINT exports_status_check CHECK (status IN ('processing', 'completed', 'failed', 'expired')),
          CONSTRAINT exports_zip_mode_check CHECK (zip_mode IN ('individual', 'grouped', 'combined')),
          CONSTRAINT exports_jsx_style_check CHECK (jsx_style IS NULL OR jsx_style IN ('bold', 'modern', 'plain')),
          CONSTRAINT exports_expires_future CHECK (expires_at > created_at)
        );
      `
    });
    
    if (exportsError) {
      console.log('❌ exports table creation failed:', exportsError.message);
    } else {
      console.log('✅ exports table created successfully');
    }
    
    // Create indexes
    console.log('\n📋 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_export_presets_user_id ON export_presets(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_exports_export_id ON exports(export_id);',
      'CREATE INDEX IF NOT EXISTS idx_exports_status ON exports(status);',
      'CREATE INDEX IF NOT EXISTS idx_exports_expires_at ON exports(expires_at);'
    ];
    
    for (const indexSql of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (error) {
        console.log('⚠️  Index creation warning:', error.message);
      }
    }
    console.log('✅ Indexes created');
    
    console.log('\n🎉 Advanced Export System database schema applied successfully!');
    
  } catch (error) {
    console.error('❌ Schema application failed:', error);
    process.exit(1);
  }
}

// Test if we can connect to database
async function testConnection() {
  console.log('🔌 Testing database connection...');
  
  try {
    const { data, error } = await supabase.from('videos').select('count').limit(1);
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function main() {
  const connected = await testConnection();
  if (!connected) {
    console.log('💡 Make sure your .env file has correct SUPABASE_URL and SUPABASE_SERVICE_ROLE');
    process.exit(1);
  }
  
  await applySchema();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { applySchema };