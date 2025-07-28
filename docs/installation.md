# 📦 Installation Guide

## System Requirements

### Minimum Requirements
- **Node.js**: 18.0.0 or higher
- **NPM**: 9.0.0 or higher  
- **RAM**: 4GB minimum (8GB recommended for Phase 3)
- **Storage**: 2GB free space for models and dependencies
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

### Recommended Requirements
- **Node.js**: 20.0.0 or higher
- **RAM**: 16GB for optimal performance
- **CPU**: Multi-core processor for parallel chunk processing
- **Storage**: SSD for faster file operations

## Quick Installation

### Option 1: Local Mode (Recommended)

This is the simplest setup that requires no external services:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/capedify.git
cd capedify

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env and set TRANSCRIPTION_MODE=LOCAL

# 4. Download whisper.cpp (automatic on first run)
npm run setup:whisper

# 5. Start the application
npm start
```

### Option 2: Cloud Mode (Advanced)

For production deployments with cloud storage:

```bash
# Same as above, plus configure cloud services in .env:
TRANSCRIPTION_MODE=GROQ
GROQ_API_KEY=your_groq_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

## Detailed Setup Guide

### 1. Node.js Installation

#### Windows
Download from [nodejs.org](https://nodejs.org/) and run the installer.

#### macOS
```bash
# Using Homebrew
brew install node

# Or download from nodejs.org
```

#### Linux (Ubuntu/Debian)
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/capedify.git
cd capedify

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies  
cd ../client && npm install

# Return to root
cd ..
```

### 3. Environment Configuration

Create `server/.env` file:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Transcription Mode (LOCAL, GROQ, or HYBRID)
TRANSCRIPTION_MODE=LOCAL

# Whisper Configuration (for LOCAL mode)
WHISPER_MODEL=small
WHISPER_PATH=./whisper-cpp/Release/whisper-cli.exe
MODELS_PATH=./whisper-cpp/models

# Phase 3 Configuration
CHUNKING_THRESHOLD=45
CHUNK_DURATION=30
CHUNK_OVERLAP=2

# Cloud Configuration (optional)
GROQ_API_KEY=your_groq_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### 4. Whisper.cpp Setup

#### Automatic Setup (Recommended)
```bash
npm run setup:whisper
```

#### Manual Setup
1. Download whisper.cpp release from [GitHub](https://github.com/ggerganov/whisper.cpp/releases)
2. Extract to `./whisper-cpp/`
3. Download model files to `./whisper-cpp/models/`:
   - `ggml-small.bin` (244MB, recommended)
   - Or other models as needed

### 5. Verification

```bash
# Start the application
npm start

# In another terminal, test the health endpoint
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "✅ LOCAL Server is healthy - Phase 3 Ready",
  "phase": "3",
  "features": {
    "chunked_transcription": true,
    "long_form_videos": "3-5+ minutes"
  }
}
```

## Troubleshooting

### Common Issues

#### "Cannot find module" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
rm -rf server/node_modules server/package-lock.json
rm -rf client/node_modules client/package-lock.json
npm install
```

#### Port 4000 already in use
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:4000 | xargs kill
```

#### Whisper executable not found
```bash
# Verify whisper path
ls -la ./whisper-cpp/Release/

# Download manually if needed
cd whisper-cpp
# Download appropriate release for your platform
```

#### FFmpeg issues
```bash
# FFmpeg is installed automatically via @ffmpeg-installer/ffmpeg
# If issues persist, install system FFmpeg:

# Windows (using Chocolatey)
choco install ffmpeg

# macOS
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

### Performance Issues

#### Slow transcription
- Use `small` model for balance of speed/accuracy
- Ensure SSD storage for better I/O
- Close other applications to free RAM

#### Out of memory errors
- Reduce `CHUNK_DURATION` to 20 seconds
- Lower `concurrentProcessing` to 2
- Use `tiny` model for testing

## Next Steps

1. **Verify Installation**: Test with a short video file
2. **Configure Whisper Model**: Choose the right model for your needs
3. **Test Phase 3**: Upload a 2-3 minute video to test chunking
4. **After Effects Setup**: Install AE 2018+ for JSX import
5. **Read API Documentation**: [API Guide](api.md)

## Updates

### Keeping CapEdify Updated

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install
cd server && npm install
cd ../client && npm install

# Restart application
npm start
```

### Version Information

Check your version:
```bash
npm run version
```

Current release: **Phase 3 Complete** (v3.0.0)