const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

class ExportService {
  async exportToSRT(transcriptionId, styles = {}) {
    const transcription = await this.getTranscription(transcriptionId);
    let srtContent = '';
    
    transcription.result.segments.forEach((segment, index) => {
      srtContent += `${index + 1}\n`;
      srtContent += `${this.formatTimestamp(segment.start)} --> ${this.formatTimestamp(segment.end)}\n`;
      
      let text = segment.text;
      if (styles.bold) text = `<b>${text}</b>`;
      if (styles.italic) text = `<i>${text}</i>`;
      if (styles.underline) text = `<u>${text}</u>`;
      if (styles.color) text = `<font color="${styles.color}">${text}</font>`;
      
      srtContent += `${text}\n\n`;
    });

    return srtContent;
  }

  async exportToVTT(transcriptionId) {
    const transcription = await this.getTranscription(transcriptionId);
    let vttContent = 'WEBVTT\n\n';
    
    transcription.result.segments.forEach((segment, index) => {
      vttContent += `${this.formatTimestamp(segment.start).replace(',', '.')} --> ${this.formatTimestamp(segment.end).replace(',', '.')}\n`;
      vttContent += `${segment.text}\n\n`;
    });

    return vttContent;
  }

  async exportToJSX(transcriptionId) {
    const transcription = await this.getTranscription(transcriptionId);
    let jsxContent = 'const subtitles = [\n';
    
    transcription.result.segments.forEach((segment) => {
      jsxContent += `  {\n`;
      jsxContent += `    start: ${Math.floor(segment.start * 1000)},\n`;
      jsxContent += `    end: ${Math.floor(segment.end * 1000)},\n`;
      jsxContent += `    text: "${segment.text.replace(/"/g, '\\"')}"\n`;
      jsxContent += `  },\n`;
    });

    jsxContent += '];\n\nexport default subtitles;';
    return jsxContent;
  }

  async exportToFCPXML(transcriptionId) {
    const transcription = await this.getTranscription(transcriptionId);
    let fcpxml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    fcpxml += '<!DOCTYPE fcpxml>\n';
    fcpxml += '<fcpxml version="1.8">\n';
    fcpxml += '  <resources>\n';
    fcpxml += '    <format id="r1" name="FFVideoFormat1080p24" />\n';
    fcpxml += '  </resources>\n';
    fcpxml += '  <library>\n';
    fcpxml += '    <event name="Captions">\n';
    fcpxml += '      <project name="Captions Project">\n';
    fcpxml += '        <sequence format="r1">\n';
    fcpxml += '          <spine>\n';
    
    transcription.result.segments.forEach((segment) => {
      const start = segment.start;
      const duration = segment.end - segment.start;
      fcpxml += `            <title duration="${duration}s" start="${start}s" name="${segment.text.replace(/"/g, '&quot;')}" />\n`;
    });

    fcpxml += '          </spine>\n';
    fcpxml += '        </sequence>\n';
    fcpxml += '      </project>\n';
    fcpxml += '    </event>\n';
    fcpxml += '  </library>\n';
    fcpxml += '</fcpxml>';

    return fcpxml;
  }

  async exportToASS(transcriptionId) {
    const transcription = await this.getTranscription(transcriptionId);
    let assContent = '[Script Info]\nTitle: Subtitles\nScriptType: v4.00+\n\n';
    assContent += '[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n';
    assContent += 'Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1\n\n';
    assContent += '[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';

    transcription.result.segments.forEach((segment) => {
      const start = this.formatTimestampASS(segment.start);
      const end = this.formatTimestampASS(segment.end);
      assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${segment.text}\n`;
    });

    return assContent;
  }

  async exportToPremiereSRT(transcriptionId) {
    // Premier Pro can use standard SRT files
    return this.exportToSRT(transcriptionId);
  }

  formatTimestamp(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${secs},${ms}`;
  }

  formatTimestampASS(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    const hours = date.getUTCHours().toString().padStart(1, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const secs = date.getUTCSeconds().toString().padStart(2, '0');
    const cs = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(2, '0');
    return `${hours}:${minutes}:${secs}.${cs}`;
  }

  async getTranscription(transcriptionId) {
    const { data, error } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single();

    if (error) throw new Error(`Failed to get transcription: ${error.message}`);
    if (!data) throw new Error('Transcription not found');
    if (!data.result) throw new Error('Transcription has no results');

    return data;
  }
}

module.exports = new ExportService();
