-- Insert default themes (run AFTER creating tables)
-- Execute this separately in Supabase SQL Editor

INSERT INTO export_themes (name, display_name, description, theme_config, category, is_public) VALUES 
('youtube_bold', 'YouTube Bold', 'Bold yellow captions perfect for YouTube content', 
 '{"fontFamily": "Arial Black", "fontSize": "48px", "fontWeight": "900", "color": "#FFD700", "backgroundColor": "rgba(0,0,0,0.8)", "borderRadius": "8px", "padding": "12px 24px", "textAlign": "center", "animation": "fadeIn"}', 
 'system', true);

INSERT INTO export_themes (name, display_name, description, theme_config, category, is_public) VALUES 
('minimal_clean', 'Minimal Clean', 'Clean white text for professional content',
 '{"fontFamily": "Helvetica Neue", "fontSize": "36px", "fontWeight": "400", "color": "#FFFFFF", "backgroundColor": "rgba(0,0,0,0.6)", "borderRadius": "4px", "padding": "8px 16px", "textAlign": "center", "animation": "none"}',
 'system', true);

INSERT INTO export_themes (name, display_name, description, theme_config, category, is_public) VALUES 
('tiktok_trendy', 'TikTok Trendy', 'Eye-catching captions for social media',
 '{"fontFamily": "Impact", "fontSize": "42px", "fontWeight": "700", "color": "#FF6B6B", "backgroundColor": "rgba(255,255,255,0.9)", "borderRadius": "12px", "padding": "16px 20px", "textAlign": "center", "animation": "bounce", "border": "3px solid #4ECDC4"}',
 'system', true);

INSERT INTO export_themes (name, display_name, description, theme_config, category, is_public) VALUES 
('podcast_pro', 'Podcast Pro', 'Professional captions for podcast clips',
 '{"fontFamily": "Georgia", "fontSize": "32px", "fontWeight": "500", "color": "#2C3E50", "backgroundColor": "rgba(255,255,255,0.95)", "borderRadius": "6px", "padding": "12px 20px", "textAlign": "left", "animation": "slideIn"}',
 'system', true);