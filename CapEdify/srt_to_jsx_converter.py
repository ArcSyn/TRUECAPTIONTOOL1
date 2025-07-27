#!/usr/bin/env python3
"""
SRT to After Effects JSX Converter
Converts .srt subtitle files to .jsx scripts that can be run in After Effects
"""

import re
import os
import argparse
from datetime import datetime

def parse_srt_time(time_str):
    """Convert SRT timestamp to seconds"""
    # Format: 00:00:10,500
    time_parts = time_str.replace(',', '.').split(':')
    hours = int(time_parts[0])
    minutes = int(time_parts[1])
    seconds = float(time_parts[2])
    return hours * 3600 + minutes * 60 + seconds

def parse_srt_file(srt_path):
    """Parse SRT file and return list of caption entries"""
    captions = []
    
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split into blocks
    blocks = re.split(r'\n\s*\n', content.strip())
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) >= 3:
            # Line 1: sequence number
            seq_num = lines[0].strip()
            
            # Line 2: timestamps
            time_line = lines[1].strip()
            start_time, end_time = time_line.split(' --> ')
            
            # Line 3+: caption text
            text = '\n'.join(lines[2:]).strip()
            
            captions.append({
                'sequence': seq_num,
                'start': parse_srt_time(start_time),
                'end': parse_srt_time(end_time),
                'text': text
            })
    
    return captions

def generate_jsx_script(captions, comp_name="Captions", comp_width=1920, comp_height=1080, fps=30):
    """Generate After Effects JSX script from captions"""
    
    jsx_template = f'''// Auto-generated After Effects script from SRT file
// Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

// Create new composition
var comp = app.project.items.addComp("{comp_name}", {comp_width}, {comp_height}, 1, {max([cap['end'] for cap in captions]) + 2}, {fps});

// Style settings
var fontSize = 48;
var fontFamily = "Arial-BoldMT";
var textColor = [1, 1, 1]; // White
var strokeColor = [0, 0, 0]; // Black
var strokeWidth = 3;

// Add captions
'''

    for i, caption in enumerate(captions):
        # Escape quotes in text
        safe_text = caption['text'].replace('"', '\\"').replace('\n', '\\n')
        
        jsx_template += f'''
// Caption {i+1}: {caption['sequence']}
var textLayer{i+1} = comp.layers.addText("{safe_text}");
var textProp{i+1} = textLayer{i+1}.property("Source Text");
var textDocument{i+1} = textProp{i+1}.value;
textDocument{i+1}.fontSize = fontSize;
textDocument{i+1}.font = fontFamily;
textDocument{i+1}.fillColor = textColor;
textDocument{i+1}.strokeColor = strokeColor;
textDocument{i+1}.strokeWidth = strokeWidth;
textDocument{i+1}.strokeOverFill = false;
textDocument{i+1}.applyStroke = true;
textDocument{i+1}.justification = ParagraphJustification.CENTER_JUSTIFY;
textProp{i+1}.setValue(textDocument{i+1});

// Position and timing
textLayer{i+1}.startTime = {caption['start']};
textLayer{i+1}.outPoint = {caption['end']};
textLayer{i+1}.inPoint = {caption['start']};

// Position at bottom center
var textPosition{i+1} = textLayer{i+1}.property("Transform").property("Position");
textPosition{i+1}.setValue([{comp_width/2}, {comp_height - 100}]);
'''

    jsx_template += '''
// Alert completion
alert("Caption import complete! " + comp.layers.length + " text layers created.");
'''
    
    return jsx_template

def convert_srt_to_jsx(srt_path, output_path=None):
    """Main conversion function"""
    if not os.path.exists(srt_path):
        raise FileNotFoundError(f"SRT file not found: {srt_path}")
    
    # Parse SRT file
    captions = parse_srt_file(srt_path)
    
    if not captions:
        raise ValueError("No captions found in SRT file")
    
    # Generate JSX script
    jsx_content = generate_jsx_script(captions)
    
    # Determine output path
    if output_path is None:
        base_name = os.path.splitext(os.path.basename(srt_path))[0]
        output_path = os.path.join(os.path.dirname(srt_path), f"{base_name}_ae_import.jsx")
    
    # Write JSX file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(jsx_content)
    
    return output_path, len(captions)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert SRT files to After Effects JSX scripts")
    parser.add_argument("srt_file", help="Path to input SRT file")
    parser.add_argument("-o", "--output", help="Output JSX file path")
    
    args = parser.parse_args()
    
    try:
        output_path, caption_count = convert_srt_to_jsx(args.srt_file, args.output)
        print(f"✅ SUCCESS: Converted {caption_count} captions")
        print(f"📁 JSX file saved: {output_path}")
        print(f"📖 Usage in After Effects:")
        print(f"   1. Open After Effects")
        print(f"   2. File → Scripts → Run Script File...")
        print(f"   3. Select: {output_path}")
        print(f"   4. Script will create composition with styled text layers")
    
    except Exception as e:
        print(f"❌ ERROR: {e}")
