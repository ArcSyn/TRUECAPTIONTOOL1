#!/usr/bin/env python3
"""
SRT to After Effects JSX Converter
Converts .srt subtitle files to .jsx scripts for After Effects
"""

import re
import sys
import os

def parse_srt_time(time_str):
    """Convert SRT time format (00:00:01,500) to seconds"""
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    hours = int(parts[0])
    minutes = int(parts[1])
    seconds = float(parts[2])
    return hours * 3600 + minutes * 60 + seconds

def parse_srt_file(srt_path):
    """Parse SRT file and return list of subtitle entries"""
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by double newlines to get subtitle blocks
    blocks = re.split(r'\n\s*\n', content.strip())
    
    subtitles = []
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) >= 3:
            # Skip the index number (first line)
            time_line = lines[1]
            text_lines = lines[2:]
            
            # Parse time range
            time_match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})', time_line)
            if time_match:
                start_time = parse_srt_time(time_match.group(1))
                end_time = parse_srt_time(time_match.group(2))
                text = ' '.join(text_lines).strip()
                
                # Clean up text for JSX
                text = text.replace('"', '\\"').replace('\n', '\\r')
                
                subtitles.append({
                    'start': start_time,
                    'end': end_time,
                    'text': text
                })
    
    return subtitles

def generate_jsx(subtitles, comp_name="Captions", width=1920, height=1080, fps=30):
    """Generate After Effects JSX script from subtitles"""
    
    jsx_template = f'''// Auto-generated After Effects caption script
// Created from SRT file conversion

// Create new composition
var comp = app.project.items.addComp("{comp_name}", {width}, {height}, 1, 60, {fps});

// Caption data
var captions = [
'''
    
    # Add each subtitle entry
    for i, sub in enumerate(subtitles):
        jsx_template += f'    {{start: {sub["start"]:.3f}, end: {sub["end"]:.3f}, text: "{sub["text"]}"}}'
        if i < len(subtitles) - 1:
            jsx_template += ','
        jsx_template += '\n'
    
    jsx_template += '''];

// Create text layers for each caption
for (var i = 0; i < captions.length; i++) {
    var entry = captions[i];
    
    // Create text layer
    var textLayer = comp.layers.addText(entry.text);
    
    // Set timing
    textLayer.startTime = entry.start;
    textLayer.outPoint = entry.end;
    textLayer.inPoint = entry.start;
    
    // Basic styling
    var textProp = textLayer.property("Source Text");
    var textDocument = textProp.value;
    textDocument.fontSize = 48;
    textDocument.fillColor = [1, 1, 1]; // White
    textDocument.font = "Arial";
    textDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
    textProp.setValue(textDocument);
    
    // Position at bottom center
    var position = textLayer.property("Transform").property("Position");
    position.setValue([comp.width/2, comp.height - 100]);
    
    // Add subtle drop shadow
    var dropShadow = textLayer.property("Effects").addProperty("Drop Shadow");
    dropShadow.property("Opacity").setValue(75);
    dropShadow.property("Direction").setValue(135);
    dropShadow.property("Distance").setValue(5);
    dropShadow.property("Softness").setValue(10);
}

alert("Caption import complete! " + captions.length + " subtitles added to composition.");
'''
    
    return jsx_template

def convert_srt_to_jsx(srt_path, jsx_path=None):
    """Main conversion function"""
    if not os.path.exists(srt_path):
        print(f"❌ Error: SRT file not found: {srt_path}")
        return False
    
    # Generate output path if not provided
    if jsx_path is None:
        jsx_path = srt_path.replace('.srt', '_captions.jsx')
    
    print(f"🎬 Converting SRT to After Effects JSX...")
    print(f"📁 Input:  {srt_path}")
    print(f"📁 Output: {jsx_path}")
    
    try:
        # Parse SRT file
        subtitles = parse_srt_file(srt_path)
        print(f"📝 Found {len(subtitles)} subtitle entries")
        
        if not subtitles:
            print("❌ No valid subtitles found in SRT file")
            return False
        
        # Generate JSX script
        jsx_content = generate_jsx(subtitles)
        
        # Write JSX file
        with open(jsx_path, 'w', encoding='utf-8') as f:
            f.write(jsx_content)
        
        print(f"✅ Conversion complete!")
        print(f"🎯 To use in After Effects:")
        print(f"   1. Open After Effects")
        print(f"   2. File → Scripts → Run Script File...")
        print(f"   3. Select: {jsx_path}")
        print(f"   4. Click Open")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during conversion: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python srt_to_jsx.py input.srt [output.jsx]")
        print("Example: python srt_to_jsx.py demo_captions.srt")
        sys.exit(1)
    
    srt_file = sys.argv[1]
    jsx_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    success = convert_srt_to_jsx(srt_file, jsx_file)
    sys.exit(0 if success else 1)
