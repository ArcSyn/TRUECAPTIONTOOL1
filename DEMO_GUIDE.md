# 🎬 SRT → JSX Export Demonstration

## Live Demo Commands

### 1. Test the CLI Tool
```bash
# Navigate to project root
cd "c:\Users\lcolo\OneDrive\Documents\WindowsPowerShell\TRUECAPTIONTOOL-"

# Show help
npm run jsx-help

# Basic modern style export
npm run jsx-export examples/demo_captions.srt --style modern --project "Demo Video"

# Bold style with custom output
node scripts/jsx-export-cli.js examples/demo_captions.srt --style bold --project "Bold Demo" --output ./bold-output

# Minimal style
node scripts/jsx-export-cli.js examples/demo_captions.srt --style minimal --project "Clean Captions" --output ./minimal-output
```

### 2. Check Generated Files
```bash
# View the generated JSX
cat output/Caption_Project.jsx
cat bold-output/Bold_Demo.jsx
cat minimal-output/Clean_Captions.jsx
```

### 3. After Effects Integration
1. Open After Effects
2. Create a new composition (1920x1080, 30fps)
3. File → Scripts → Run Script File
4. Select any of the generated .jsx files
5. Watch professional captions appear with proper timing and styling!

## Generated Output Examples

### Modern Style Features
- **Font**: Arial-Bold, 65px
- **Color**: White text with black stroke
- **Position**: Bottom center (85% down)
- **Animation**: Fade-in/fade-out transitions
- **Stroke**: 3px black outline for readability

### Bold Style Features  
- **Font**: Impact, 72px
- **Color**: Yellow text with heavy black stroke
- **Position**: Bottom center (80% down)
- **Animation**: Slide-up entrance
- **Stroke**: 4px black outline for maximum impact

### Minimal Style Features
- **Font**: Helvetica-Light, 48px
- **Color**: Clean white text
- **Position**: Bottom center (90% down)
- **Animation**: None (instant appearance)
- **Stroke**: No stroke for clean look

## Real After Effects Output

When you run the generated JSX in After Effects, you get:

1. **Text Layers**: One per caption with descriptive names
2. **Precise Timing**: Exact in/out points from SRT
3. **Professional Styling**: Font, size, color, stroke applied
4. **Animations**: Smooth fade-ins and transitions
5. **Proper Positioning**: Consistent bottom-center placement
6. **Error Handling**: Alerts if no composition selected

## Web Interface Demo

To test the enhanced web interface:

1. Start the development server:
   ```bash
   cd CapEdify/client
   npm run dev
   ```

2. Upload a video file
3. Generate transcription
4. Go to Export Options
5. Find the "Enhanced JSX" card
6. Select style template (Modern/Minimal/Bold)
7. Toggle scene mode if desired
8. Preview the JSX output
9. Export and download

## Scene Mode Demo

To test scene-based export:

```bash
# Create a longer SRT with natural gaps
node scripts/jsx-export-cli.js examples/demo_captions.srt --scenes --gap 2.0 --project "Scene Demo"
```

This will create:
- `master.jsx` - Scene overview and controller
- `scene_001.jsx` - First scene
- `scene_002.jsx` - Second scene (after 2+ second gap)
- Additional scenes as needed

## File Structure Demo

After running the demos, you'll have:

```
TRUECAPTIONTOOL-/
├── output/
│   └── Caption_Project.jsx     # Modern style output
├── bold-output/
│   └── Bold_Demo.jsx          # Bold style output
├── minimal-output/
│   └── Clean_Captions.jsx     # Minimal style output
└── examples/
    └── demo_captions.srt      # Source SRT file
```

## Success Indicators

✅ **CLI Works**: Commands execute without errors
✅ **Files Generated**: JSX files created in correct locations  
✅ **Valid Syntax**: After Effects can execute the scripts
✅ **Proper Timing**: Captions appear at correct times
✅ **Professional Look**: Styling matches selected template
✅ **Error Handling**: Graceful failures with helpful messages

## Next Steps

1. **Test with Real SRT**: Use actual subtitle files from your videos
2. **After Effects Testing**: Import into real projects
3. **Style Customization**: Modify the style templates as needed
4. **Integration**: Connect to your existing video workflow
5. **Phase 2**: Implement advanced scene detection and custom styles

---

**🎉 Your SRT → JSX export pipeline is now complete and ready for production use!**
