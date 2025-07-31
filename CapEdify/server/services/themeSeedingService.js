/**
 * Theme Seeding Service - Populate default export themes
 * 
 * @description Service to populate the export_themes table with default system themes.
 * Ensures the export system has themes available immediately after database setup.
 */

const { createClient } = require('@supabase/supabase-js');

class ThemeSeedingService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE
    );
    
    // Default system themes
    this.defaultThemes = [
      {
        name: 'youtube_bold',
        display_name: 'YouTube Bold',
        description: 'Bold yellow captions perfect for YouTube content',
        theme_config: {
          fontFamily: 'Arial Black',
          fontSize: '48px',
          fontWeight: '900',
          color: '#FFD700',
          backgroundColor: 'rgba(0,0,0,0.8)',
          borderRadius: '8px',
          padding: '12px 24px',
          textAlign: 'center',
          animation: 'fadeIn'
        },
        category: 'system',
        is_public: true
      },
      {
        name: 'minimal_clean',
        display_name: 'Minimal Clean',
        description: 'Clean white text for professional content',
        theme_config: {
          fontFamily: 'Helvetica Neue',
          fontSize: '36px',
          fontWeight: '400',
          color: '#FFFFFF',
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: '4px',
          padding: '8px 16px',
          textAlign: 'center',
          animation: 'none'
        },
        category: 'system',
        is_public: true
      },
      {
        name: 'tiktok_trendy',
        display_name: 'TikTok Trendy',
        description: 'Eye-catching captions for social media',
        theme_config: {
          fontFamily: 'Impact',
          fontSize: '42px',
          fontWeight: '700',
          color: '#FF6B6B',
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderRadius: '12px',
          padding: '16px 20px',
          textAlign: 'center',
          animation: 'bounce',
          border: '3px solid #4ECDC4'
        },
        category: 'system',
        is_public: true
      },
      {
        name: 'podcast_pro',
        display_name: 'Podcast Pro',
        description: 'Professional captions for podcast clips',
        theme_config: {
          fontFamily: 'Georgia',
          fontSize: '32px',
          fontWeight: '500',
          color: '#2C3E50',
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: '6px',
          padding: '12px 20px',
          textAlign: 'left',
          animation: 'slideIn'
        },
        category: 'system',
        is_public: true
      }
    ];
  }

  /**
   * Seed default themes into the database
   * @returns {Object} Result summary
   */
  async seedDefaultThemes() {
    try {
      console.log('🎨 Starting theme seeding process...');
      
      // Check which themes already exist
      const { data: existingThemes, error: fetchError } = await this.supabase
        .from('export_themes')
        .select('name')
        .in('name', this.defaultThemes.map(t => t.name));

      if (fetchError) {
        throw new Error(`Failed to check existing themes: ${fetchError.message}`);
      }

      const existingThemeNames = new Set(existingThemes?.map(t => t.name) || []);
      const themesToInsert = this.defaultThemes.filter(theme => !existingThemeNames.has(theme.name));

      if (themesToInsert.length === 0) {
        console.log('✅ All default themes already exist');
        return {
          success: true,
          message: 'All default themes already exist',
          inserted: 0,
          skipped: this.defaultThemes.length
        };
      }

      // Insert new themes
      const { data: insertedThemes, error: insertError } = await this.supabase
        .from('export_themes')
        .insert(themesToInsert)
        .select('name, display_name');

      if (insertError) {
        throw new Error(`Failed to insert themes: ${insertError.message}`);
      }

      console.log(`✅ Successfully inserted ${themesToInsert.length} themes:`);
      themesToInsert.forEach(theme => {
        console.log(`   - ${theme.display_name} (${theme.name})`);
      });

      return {
        success: true,
        message: `Successfully seeded ${themesToInsert.length} default themes`,
        inserted: themesToInsert.length,
        skipped: this.defaultThemes.length - themesToInsert.length,
        themes: insertedThemes
      };

    } catch (error) {
      console.error('❌ Theme seeding failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all available themes (for testing)
   * @returns {Array} Available themes
   */
  async getAllThemes() {
    try {
      const { data: themes, error } = await this.supabase
        .from('export_themes')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch themes: ${error.message}`);
      }

      return themes || [];
    } catch (error) {
      console.error('❌ Failed to fetch themes:', error);
      return [];
    }
  }

  /**
   * Reset themes (remove and re-add all default themes)
   * @returns {Object} Result summary
   */
  async resetDefaultThemes() {
    try {
      console.log('🔄 Resetting default themes...');

      // Delete existing default themes
      const { error: deleteError } = await this.supabase
        .from('export_themes')
        .delete()
        .in('name', this.defaultThemes.map(t => t.name));

      if (deleteError) {
        throw new Error(`Failed to delete existing themes: ${deleteError.message}`);
      }

      // Re-insert all default themes
      return await this.seedDefaultThemes();

    } catch (error) {
      console.error('❌ Theme reset failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ThemeSeedingService();