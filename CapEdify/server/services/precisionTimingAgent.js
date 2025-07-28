/**
 * PrecisionTimingAgent - Frame-accurate timing and layout optimization for After Effects
 * 
 * Purpose: Handle frame-accurate timing, text fitting, and layout optimization
 * for professional After Effects JSX caption export
 * 
 * Features:
 * - Converts Phase 3 timestamps to precise After Effects inPoint/outPoint
 * - Implements text fitting algorithms (90% comp width, auto-wrap)
 * - Handles timing edge cases (overlapping segments, zero-duration, gaps)
 * - Optimizes positioning for different composition formats
 * - Generates validation and error handling for timing conflicts
 * - Ensures frame-accurate synchronization with video content
 * 
 * Industry Standards Applied:
 * - Minimum caption duration (0.5 seconds for readability)
 * - Maximum caption duration (8 seconds per industry guidelines)
 * - Text fitting within 90% of composition width
 * - Automatic line breaking for optimal readability
 * - Gap handling between consecutive captions
 */

class PrecisionTimingAgent {
  constructor() {
    // Industry timing standards
    this.timingStandards = {
      minDuration: 0.5,        // Minimum 0.5 seconds for readability
      maxDuration: 8.0,        // Maximum 8 seconds per caption
      minGap: 0.1,             // Minimum gap between captions (0.1s)
      maxTextWidth: 0.9,       // 90% of composition width
      maxLines: 3,             // Maximum lines per caption
      readingSpeed: 180,       // Words per minute (industry standard)
      frameAccuracy: 0.001     // Millisecond precision for frame accuracy
    };

    // Layout optimization settings
    this.layoutSettings = {
      marginHorizontal: 0.05,  // 5% margin on sides
      marginVertical: 0.1,     // 10% margin top/bottom
      lineSpacing: 1.2,        // Line height multiplier
      characterLimit: 60,      // Characters per line (readability)
      wordWrapEnabled: true,   // Enable automatic word wrapping
      preventOrphans: true     // Prevent single word on last line
    };

    // Composition format presets
    this.formatPresets = {
      'HD': { width: 1920, height: 1080, frameRate: 24 },
      '4K': { width: 3840, height: 2160, frameRate: 24 },
      'Mobile': { width: 1080, height: 1920, frameRate: 30 },
      'Square': { width: 1080, height: 1080, frameRate: 30 },
      'Cinema': { width: 2560, height: 1080, frameRate: 24 }
    };
  }

  /**
   * Generate precise timing conversion code
   * @param {Array} segments - Caption segments with start/end times
   * @param {Object} options - Timing options and preferences
   * @returns {string} - JSX code for precise timing handling
   */
  generateTimingConversionCode(segments = [], options = {}) {
    const config = { ...this.timingStandards, ...options };
    
    return `
// ===== PRECISION TIMING SYSTEM =====
// Frame-accurate timing conversion and optimization

var TIMING_STANDARDS = ${JSON.stringify(config, null, 4)};

function convertTimestampToPreciseSeconds(timestamp) {
    // Handle various timestamp formats
    if (typeof timestamp === 'number') {
        // Already in seconds - ensure precision
        return parseFloat(timestamp.toFixed(3));
    }
    
    if (typeof timestamp === 'string') {
        // Handle SRT format: 00:01:23,456 or 00:01:23.456
        var timeMatch = timestamp.match(/(\\d{2}):(\\d{2}):(\\d{2})[,\\.](\\d{3})/);
        if (timeMatch) {
            var hours = parseInt(timeMatch[1]);
            var minutes = parseInt(timeMatch[2]);
            var seconds = parseInt(timeMatch[3]);
            var milliseconds = parseInt(timeMatch[4]);
            
            return parseFloat((hours * 3600 + minutes * 60 + seconds + milliseconds / 1000).toFixed(3));
        }
        
        // Handle decimal seconds as string
        return parseFloat(parseFloat(timestamp).toFixed(3));
    }
    
    console.log("⚠️ Invalid timestamp format: " + timestamp);
    return 0;
}

function optimizeSegmentTiming(segments, comp) {
    console.log("⏱️ PrecisionTimingAgent: Optimizing timing for " + segments.length + " segments...");
    
    var optimizedSegments = [];
    var frameRate = comp.frameRate || 24;
    var frameDuration = 1 / frameRate;
    
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        var prevSegment = i > 0 ? optimizedSegments[i - 1] : null;
        var nextSegment = i < segments.length - 1 ? segments[i + 1] : null;
        
        // Convert timestamps to precise seconds
        var startTime = convertTimestampToPreciseSeconds(segment.start);
        var endTime = convertTimestampToPreciseSeconds(segment.end);
        var duration = endTime - startTime;
        
        // Apply timing optimizations
        var optimized = applyTimingStandards(startTime, endTime, duration, segment.text);
        
        // Handle overlaps with previous segment
        if (prevSegment && optimized.startTime < prevSegment.endTime) {
            optimized = resolveTimingOverlap(optimized, prevSegment, segment.text);
        }
        
        // Snap to frame boundaries for perfect sync
        optimized.startTime = snapToFrame(optimized.startTime, frameRate);
        optimized.endTime = snapToFrame(optimized.endTime, frameRate);
        
        optimizedSegments.push({
            originalIndex: i,
            text: segment.text,
            startTime: optimized.startTime,
            endTime: optimized.endTime,
            duration: optimized.endTime - optimized.startTime,
            hasTimingAdjustment: optimized.adjusted,
            frameStart: Math.round(optimized.startTime * frameRate),
            frameEnd: Math.round(optimized.endTime * frameRate)
        });
    }
    
    console.log("✅ Timing optimization complete - processed " + optimizedSegments.length + " segments");
    return optimizedSegments;
}

function applyTimingStandards(start, end, duration, text) {
    var adjusted = false;
    var newStart = start;
    var newEnd = end;
    
    // Enforce minimum duration
    if (duration < TIMING_STANDARDS.minDuration) {
        newEnd = newStart + TIMING_STANDARDS.minDuration;
        adjusted = true;
        console.log("📏 Extended short duration: " + duration.toFixed(3) + "s → " + TIMING_STANDARDS.minDuration + "s");
    }
    
    // Enforce maximum duration
    if (duration > TIMING_STANDARDS.maxDuration) {
        newEnd = newStart + TIMING_STANDARDS.maxDuration;
        adjusted = true;
        console.log("📏 Reduced long duration: " + duration.toFixed(3) + "s → " + TIMING_STANDARDS.maxDuration + "s");
    }
    
    // Calculate optimal duration based on reading speed
    var wordCount = text.split(/\\s+/).length;
    var optimalDuration = (wordCount / TIMING_STANDARDS.readingSpeed) * 60; // Convert WPM to seconds
    var calculatedEnd = newStart + Math.max(optimalDuration, TIMING_STANDARDS.minDuration);
    
    // Use calculated duration if it's reasonable
    if (calculatedEnd < newEnd && calculatedEnd > newStart + TIMING_STANDARDS.minDuration) {
        newEnd = calculatedEnd;
        adjusted = true;
    }
    
    return {
        startTime: newStart,
        endTime: newEnd,
        adjusted: adjusted
    };
}

function resolveTimingOverlap(currentSegment, previousSegment, text) {
    console.log("🔧 Resolving timing overlap...");
    
    var overlap = previousSegment.endTime - currentSegment.startTime;
    
    if (overlap > 0) {
        // Strategy 1: Add minimum gap after previous segment
        var gapStart = previousSegment.endTime + TIMING_STANDARDS.minGap;
        var newDuration = currentSegment.endTime - currentSegment.startTime;
        
        return {
            startTime: gapStart,
            endTime: gapStart + newDuration,
            adjusted: true
        };
    }
    
    return currentSegment;
}

function snapToFrame(timeInSeconds, frameRate) {
    // Snap timing to exact frame boundaries for perfect sync
    var frameNumber = Math.round(timeInSeconds * frameRate);
    return frameNumber / frameRate;
}

function validateTimingSequence(optimizedSegments) {
    console.log("🔍 Validating timing sequence...");
    
    var issues = [];
    
    for (var i = 0; i < optimizedSegments.length; i++) {
        var segment = optimizedSegments[i];
        var nextSegment = i < optimizedSegments.length - 1 ? optimizedSegments[i + 1] : null;
        
        // Check duration validity
        if (segment.duration < TIMING_STANDARDS.minDuration) {
            issues.push("Segment " + (i + 1) + " duration too short: " + segment.duration.toFixed(3) + "s");
        }
        
        if (segment.duration > TIMING_STANDARDS.maxDuration) {
            issues.push("Segment " + (i + 1) + " duration too long: " + segment.duration.toFixed(3) + "s");
        }
        
        // Check for gaps or overlaps
        if (nextSegment) {
            var gap = nextSegment.startTime - segment.endTime;
            if (gap < 0) {
                issues.push("Overlap between segments " + (i + 1) + " and " + (i + 2) + ": " + Math.abs(gap).toFixed(3) + "s");
            }
        }
        
        // Check timing logic
        if (segment.startTime >= segment.endTime) {
            issues.push("Segment " + (i + 1) + " has invalid timing: start >= end");
        }
    }
    
    console.log("✅ Timing validation complete - " + issues.length + " issues found");
    return issues;
}
`;
  }

  /**
   * Generate text fitting and layout optimization code
   * @param {Object} compInfo - Composition information
   * @param {Object} options - Layout options
   * @returns {string} - JSX code for text fitting
   */
  generateTextFittingCode(compInfo = {}, options = {}) {
    const config = { ...this.layoutSettings, ...options };
    
    return `
// ===== TEXT FITTING & LAYOUT OPTIMIZATION =====
// Professional text fitting with responsive design

var LAYOUT_SETTINGS = ${JSON.stringify(config, null, 4)};

function fitTextToComposition(textLayer, comp) {
    console.log("📐 Fitting text layer to composition: " + comp.width + "x" + comp.height);
    
    try {
        var textProp = textLayer.property("Source Text");
        var textDocument = textProp.value;
        var originalText = textDocument.text;
        
        // Calculate available width (90% of comp width)
        var maxWidth = comp.width * LAYOUT_SETTINGS.maxTextWidth;
        var margin = comp.width * LAYOUT_SETTINGS.marginHorizontal;
        
        // Get current text dimensions
        var sourceRect = textLayer.sourceRectAtTime(comp.time, false);
        var currentWidth = sourceRect.width;
        
        if (currentWidth > maxWidth) {
            console.log("📏 Text too wide (" + currentWidth + "px > " + maxWidth + "px) - applying fitting...");
            
            // Strategy 1: Enable word wrapping
            if (LAYOUT_SETTINGS.wordWrapEnabled) {
                var fittedText = applyWordWrapping(originalText, textLayer, comp);
                if (fittedText !== originalText) {
                    textDocument.text = fittedText;
                    textProp.setValue(textDocument);
                    console.log("✅ Applied word wrapping");
                    return true;
                }
            }
            
            // Strategy 2: Reduce font size proportionally
            var scaleFactor = maxWidth / currentWidth;
            var newFontSize = Math.max(16, textDocument.fontSize * scaleFactor);
            
            if (newFontSize !== textDocument.fontSize) {
                textDocument.fontSize = newFontSize;
                textProp.setValue(textDocument);
                console.log("✅ Reduced font size: " + textDocument.fontSize + "px → " + newFontSize + "px");
                return true;
            }
        }
        
        // Optimize vertical positioning
        optimizeVerticalLayout(textLayer, comp);
        
        return true;
        
    } catch (fittingError) {
        console.log("❌ Text fitting error: " + fittingError.toString());
        return false;
    }
}

function applyWordWrapping(text, textLayer, comp) {
    var words = text.split(' ');
    var lines = [];
    var currentLine = '';
    var maxCharsPerLine = LAYOUT_SETTINGS.characterLimit;
    
    for (var i = 0; i < words.length; i++) {
        var word = words[i];
        var testLine = currentLine + (currentLine ? ' ' : '') + word;
        
        if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                // Word itself is too long - break it
                lines.push(word);
                currentLine = '';
            }
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    // Limit number of lines
    if (lines.length > LAYOUT_SETTINGS.maxLines) {
        lines = lines.slice(0, LAYOUT_SETTINGS.maxLines);
        // Add ellipsis to last line if truncated
        var lastLine = lines[lines.length - 1];
        if (lastLine.length > 57) {
            lines[lines.length - 1] = lastLine.substring(0, 57) + '...';
        }
    }
    
    // Prevent orphans (single word on last line)
    if (LAYOUT_SETTINGS.preventOrphans && lines.length > 1) {
        var lastLine = lines[lines.length - 1];
        var secondLastLine = lines[lines.length - 2];
        
        if (lastLine.split(' ').length === 1 && secondLastLine.split(' ').length > 1) {
            // Move last word of second-to-last line to last line
            var secondLastWords = secondLastLine.split(' ');
            var movedWord = secondLastWords.pop();
            
            lines[lines.length - 2] = secondLastWords.join(' ');
            lines[lines.length - 1] = movedWord + ' ' + lastLine;
        }
    }
    
    return lines.join('\\n');
}

function optimizeVerticalLayout(textLayer, comp) {
    try {
        var transform = textLayer.property("Transform");
        var position = transform.property("Position").value;
        var sourceRect = textLayer.sourceRectAtTime(comp.time, false);
        
        // Ensure text doesn't go off-screen
        var textHeight = sourceRect.height;
        var marginBottom = comp.height * LAYOUT_SETTINGS.marginVertical;
        var maxY = comp.height - marginBottom - textHeight;
        
        if (position[1] > maxY) {
            var newY = Math.max(marginBottom + textHeight, maxY);
            transform.property("Position").setValue([position[0], newY]);
            console.log("📐 Adjusted vertical position to prevent overflow");
        }
        
    } catch (layoutError) {
        console.log("⚠️ Vertical layout optimization failed: " + layoutError.toString());
    }
}

function calculateOptimalFontSize(comp, textLength) {
    // Calculate responsive font size based on composition and text length
    var baseSize = comp.height * 0.05; // 5% of height
    var lengthFactor = Math.max(0.7, Math.min(1.0, 50 / textLength)); // Scale based on text length
    
    return Math.max(16, Math.min(120, Math.round(baseSize * lengthFactor)));
}

function detectCompositionFormat(comp) {
    var width = comp.width;
    var height = comp.height;
    var aspectRatio = width / height;
    
    var format = 'custom';
    var recommendations = {};
    
    // Detect common formats
    if (width === 1920 && height === 1080) {
        format = 'HD';
    } else if (width === 3840 && height === 2160) {
        format = '4K';
    } else if (width === 1080 && height === 1920) {
        format = 'Mobile';
    } else if (width === 1080 && height === 1080) {
        format = 'Square';
    } else if (aspectRatio > 2.0) {
        format = 'Cinema';
    }
    
    // Generate format-specific recommendations
    switch (format) {
        case 'Mobile':
            recommendations = {
                maxLines: 2,
                fontSize: Math.min(80, comp.height * 0.04),
                position: { x: 0.5, y: 0.75 }
            };
            break;
        case 'Square':
            recommendations = {
                maxLines: 2,
                fontSize: Math.min(90, comp.height * 0.045),
                position: { x: 0.5, y: 0.8 }
            };
            break;
        case 'Cinema':
            recommendations = {
                maxLines: 1,
                fontSize: Math.min(60, comp.height * 0.06),
                position: { x: 0.5, y: 0.85 }
            };
            break;
        default:
            recommendations = {
                maxLines: 3,
                fontSize: Math.min(100, comp.height * 0.05),
                position: { x: 0.5, y: 0.85 }
            };
    }
    
    return {
        format: format,
        aspectRatio: aspectRatio,
        recommendations: recommendations
    };
}
`;
  }

  /**
   * Generate timing application workflow
   * @param {Array} segments - Caption segments
   * @returns {string} - Complete timing workflow JSX code
   */
  generateTimingWorkflow(segments = []) {
    return `
// ===== PRECISION TIMING WORKFLOW =====

function applyPrecisionTiming(captionLayers, optimizedSegments, comp) {
    console.log("⏱️ Applying precision timing to " + captionLayers.length + " layers...");
    
    if (captionLayers.length !== optimizedSegments.length) {
        throw new Error("Mismatch between caption layers (" + captionLayers.length + 
                       ") and segments (" + optimizedSegments.length + ")");
    }
    
    var successCount = 0;
    var errors = [];
    
    for (var i = 0; i < captionLayers.length; i++) {
        var layerData = captionLayers[i];
        var segment = optimizedSegments[i];
        var layer = layerData.layer;
        
        try {
            // Apply precise timing
            layer.inPoint = segment.startTime;
            layer.outPoint = segment.endTime;
            
            // Apply text fitting
            var fittingSuccess = fitTextToComposition(layer, comp);
            
            // Update layer name with timing info
            layer.name = "Caption " + (i + 1) + " (" + 
                        segment.startTime.toFixed(1) + "s-" + 
                        segment.endTime.toFixed(1) + "s)";
            
            if (segment.hasTimingAdjustment) {
                layer.comment = "Timing adjusted for standards compliance";
            }
            
            successCount++;
            console.log("✅ Applied timing to layer " + (i + 1) + ": " + 
                       segment.startTime.toFixed(3) + "s - " + segment.endTime.toFixed(3) + "s");
                       
        } catch (layerError) {
            var errorMsg = "Failed to apply timing to layer " + (i + 1) + ": " + layerError.toString();
            errors.push(errorMsg);
            console.log("❌ " + errorMsg);
        }
    }
    
    console.log("✅ Precision timing complete - " + successCount + "/" + captionLayers.length + " successful");
    
    if (errors.length > 0) {
        console.log("⚠️ Timing errors encountered:\\n" + errors.join("\\n"));
    }
    
    return {
        success: successCount,
        total: captionLayers.length,
        errors: errors
    };
}

function generateTimingReport(optimizedSegments, comp) {
    var totalDuration = 0;
    var adjustedCount = 0;
    var averageGap = 0;
    var gaps = [];
    
    for (var i = 0; i < optimizedSegments.length; i++) {
        var segment = optimizedSegments[i];
        totalDuration += segment.duration;
        
        if (segment.hasTimingAdjustment) {
            adjustedCount++;
        }
        
        if (i < optimizedSegments.length - 1) {
            var gap = optimizedSegments[i + 1].startTime - segment.endTime;
            gaps.push(gap);
        }
    }
    
    if (gaps.length > 0) {
        averageGap = gaps.reduce(function(sum, gap) { return sum + gap; }, 0) / gaps.length;
    }
    
    var report = {
        totalSegments: optimizedSegments.length,
        totalDuration: totalDuration.toFixed(3),
        adjustedSegments: adjustedCount,
        averageGap: averageGap.toFixed(3),
        compositionInfo: {
            width: comp.width,
            height: comp.height,
            frameRate: comp.frameRate,
            duration: comp.duration
        }
    };
    
    console.log("📊 Timing Report:");
    console.log("   Segments: " + report.totalSegments);
    console.log("   Total Duration: " + report.totalDuration + "s");
    console.log("   Adjusted: " + report.adjustedSegments + "/" + report.totalSegments);
    console.log("   Average Gap: " + report.averageGap + "s");
    
    return report;
}
`;
  }

  /**
   * Calculate optimal timing for segments based on content
   * @param {Array} segments - Raw caption segments
   * @param {Object} compInfo - Composition information
   * @returns {Array} - Optimized timing data
   */
  calculateOptimalTiming(segments, compInfo = {}) {
    const { frameRate = 24 } = compInfo;
    const frameDuration = 1 / frameRate;
    
    return segments.map((segment, index) => {
      const textLength = segment.text.length;
      const wordCount = segment.text.split(/\s+/).length;
      
      // Calculate reading time (industry standard: 180 WPM)
      const readingTime = (wordCount / this.timingStandards.readingSpeed) * 60;
      
      // Ensure minimum duration
      const optimalDuration = Math.max(
        this.timingStandards.minDuration,
        Math.min(this.timingStandards.maxDuration, readingTime)
      );
      
      // Snap to frame boundaries
      const frameStart = Math.round(segment.start * frameRate);
      const frameEnd = Math.round((segment.start + optimalDuration) * frameRate);
      
      return {
        index: index,
        originalStart: segment.start,
        originalEnd: segment.end,
        optimizedStart: frameStart / frameRate,
        optimizedEnd: frameEnd / frameRate,
        duration: (frameEnd - frameStart) / frameRate,
        wordCount: wordCount,
        readingTime: readingTime,
        isAdjusted: Math.abs(segment.end - segment.start - optimalDuration) > 0.1
      };
    });
  }

  /**
   * Generate validation and error handling code
   * @returns {string} - JSX validation code
   */
  generateValidationCode() {
    return `
// ===== TIMING VALIDATION & ERROR HANDLING =====

function validateTimingIntegrity(segments, comp) {
    console.log("🔍 PrecisionTimingAgent: Validating timing integrity...");
    
    var critical = [];
    var warnings = [];
    
    // Check composition validity
    if (!comp || comp.duration <= 0) {
        critical.push("Invalid composition or zero duration");
        return { critical: critical, warnings: warnings };
    }
    
    // Validate each segment
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        
        // Check basic timing validity
        if (segment.startTime < 0) {
            critical.push("Segment " + (i + 1) + " has negative start time");
        }
        
        if (segment.endTime > comp.duration) {
            warnings.push("Segment " + (i + 1) + " extends beyond composition duration");
        }
        
        if (segment.startTime >= segment.endTime) {
            critical.push("Segment " + (i + 1) + " has invalid timing (start >= end)");
        }
        
        // Check duration standards
        if (segment.duration < TIMING_STANDARDS.minDuration) {
            warnings.push("Segment " + (i + 1) + " duration below minimum (" + segment.duration.toFixed(3) + "s)");
        }
        
        if (segment.duration > TIMING_STANDARDS.maxDuration) {
            warnings.push("Segment " + (i + 1) + " duration above maximum (" + segment.duration.toFixed(3) + "s)");
        }
    }
    
    console.log("✅ Timing validation complete - " + critical.length + " critical, " + warnings.length + " warnings");
    
    return {
        critical: critical,
        warnings: warnings,
        isValid: critical.length === 0
    };
}

function handleTimingError(error, segment, index) {
    var context = "Segment " + (index + 1) + (segment ? " (" + segment.text.substring(0, 30) + "...)" : "");
    var errorMsg = "PrecisionTimingAgent Error - " + context + ":\\n" + error.toString();
    
    console.log("❌ " + errorMsg);
    
    return {
        success: false,
        error: errorMsg,
        segment: segment,
        index: index
    };
}
`;
  }
}

module.exports = new PrecisionTimingAgent();