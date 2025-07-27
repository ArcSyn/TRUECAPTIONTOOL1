# CapEdify CLI

Command-line interface for CapEdify video transcription and caption export.

## 🚀 Quick Start

```bash
# Install dependencies
cd CapEdify
npm install

# Make CLI available globally (optional)
npm link

# Quick transcription + JSX export
capedify quick video.mp4 --style modern

# Or run directly
node cli.js quick video.mp4 --style modern
```

## 📋 Commands

### Transcribe Video

```bash
capedify transcribe video.mp4
capedify transcribe video.mp4 --language en --model whisper-1
```

### Export Captions

```bash
# Basic SRT export
capedify export <transcriptionId> --format srt

# JSX export with styling
capedify export <transcriptionId> --format jsx --style bold

# Scene-based JSX export
capedify export <transcriptionId> --format jsx --style modern --scene-mode

# Custom output path
capedify export <transcriptionId> --format jsx --output ./my-captions.jsx
```

### Quick Workflow

```bash
# One-command transcribe + JSX export
capedify quick video.mp4 --style minimal
```

### Utility Commands

```bash
# Check server status
capedify status

# List available export formats
capedify formats

# Show help
capedify --help
```

## 🎨 JSX Styles

- **modern**: Clean, contemporary styling with subtle animations
- **minimal**: Simple, lightweight captions with basic styling  
- **bold**: High-impact captions with strong visual presence

## 📁 Output

### Single JSX File

```text
captions_<transcriptionId>.jsx
```

### Scene Mode (Multiple Files)

```text
scenes_<transcriptionId>/
├── Scene_1.jsx
├── Scene_2.jsx
└── Scene_3.jsx
```

## 🔧 Configuration

Set custom API URL:

```bash
export API_URL=http://localhost:3000/api
```

## 📖 Examples

```bash
# Transcribe a video
capedify transcribe presentation.mp4

# Export to different formats
capedify export abc123 --format srt
capedify export abc123 --format vtt  
capedify export abc123 --format jsx --style bold

# Quick workflow for After Effects
capedify quick webinar.mp4 --style modern

# Scene-based export for long videos
capedify export abc123 --format jsx --style minimal --scene-mode --gap-threshold 3.0
```

## 🛠️ Development

```bash
# Install CLI dependencies
npm install

# Test CLI locally
node cli.js --help

# Install globally for development
npm link

# Uninstall global link
npm unlink
```
