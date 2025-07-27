# CapEdify - AI Video Caption Tool Instructions

## Project Architecture
This is a dual-architecture video captioning system with **monorepo structure** containing both standalone CLI tools and a full-stack web application.

### Core Components
- **Root level**: Standalone FFmpeg CLI tools (`scripts/jsx-export-cli.js`, `scripts/ff.js`)
- **CapEdify/**: Full-stack application with client-server architecture
  - **client/**: React + Vite frontend with Tailwind CSS and Radix UI components
  - **server/**: Express.js backend with Groq AI transcription and Supabase storage

## Key Technical Patterns

### Multi-Server Architecture
- **Main server**: `CapEdify/server/server.js` (production)
- **Test server**: `CapEdify/server/test-server.js` (development/testing)
- Always check which server is running when debugging API issues

### JSX Export Pipeline
The core feature converts SRT captions to After Effects JSX scripts:
```javascript
// Service pattern in server/services/jsxExportService.js
class JSXExportService {
  generateJSX(captions, style, options) // Main export logic
  parseTimestamps(srtTime) // SRT time conversion
  createScenes(captions, gapThreshold) // Scene detection
}
```

### Style System
JSX exports use preset styles (`modern`, `minimal`, `bold`) defined in `jsxExportService.js`:
- Font families, colors, stroke settings
- Animation types (fadeIn, slideUp, none)
- Positioning and shadow effects

## Development Workflows

### Starting the Application
```bash
# Full stack (recommended)
cd CapEdify && npm start  # Starts both client:5173 and server:4000

# Individual components
npm run client  # Frontend only
npm run server  # Backend only
```

### Testing Strategy
- Use `test-server.js` for isolated API testing
- Main server endpoints: `/api/videos/upload`, `/api/transcribe`, `/api/export/*`
- FFmpeg compression test: `npm run ff` (root level)

### CLI Tool Usage
Root-level CLI tools operate independently:
```bash
npm run jsx-export input.srt --style modern --scenes
npm run jsx-help  # CLI documentation
```

## Environment Configuration
Critical environment variables in `CapEdify/server/.env`:
```
GROQ_API_KEY=     # Whisper transcription service
SUPABASE_URL=     # File storage
SUPABASE_KEY=     # Storage authentication
PORT=4000         # Server port
```

## File Processing Pipeline
1. **Video Upload** → Supabase storage → FFmpeg audio extraction
2. **Audio Compression** → 99% reduction (72MB→0.68MB) maintaining speech quality
3. **Groq Transcription** → SRT format with timestamps
4. **Multi-format Export** → JSX, SRT, VTT, FCPXML, ASS formats

## Key Files to Understand
- `CapEdify/server/services/groqService.js`: AI transcription logic
- `CapEdify/server/services/jsxExportService.js`: After Effects export engine
- `CapEdify/client/src/pages/Home.tsx`: Main UI component
- `scripts/jsx-export-cli.js`: Standalone CLI converter

## Integration Points
- **Supabase**: File storage and retrieval
- **Groq API**: Whisper-based transcription
- **FFmpeg**: Video/audio processing (static binaries included)
- **React Router**: Client-side routing for multi-page UI

## Common Debugging Patterns
- Server status: `GET /health` endpoint
- File uploads: Check `uploads/` and `downloads/` directories
- JSX generation: Test with `examples/demo_captions.srt`
- FFmpeg issues: Verify static binaries in node_modules

## Styling Conventions
- **Tailwind CSS** with custom theme configuration
- **Radix UI** components for consistent interaction patterns
- **Theme switching** via `ThemeDropdown` component
- **Responsive design** with mobile-first approach
