/**
 * TemplateInheritanceAgent - Professional template layer handling for After Effects
 * 
 * Purpose: Handle template layer detection, styling inheritance, and fallback creation
 * for professional After Effects JSX caption export
 * 
 * Features:
 * - Detects user-selected template layers in After Effects
 * - Extracts styling properties (font, size, color, position, effects)
 * - Creates industry-standard default template when none exists
 * - Generates template duplication logic for caption layers
 * - Handles cross-composition compatibility (different sizes, frame rates)
 * 
 * Industry Standards Applied:
 * - White text with black stroke for maximum readability
 * - Bottom center positioning (industry standard for subtitles)
 * - Font size based on composition height (5% for optimal readability)
 * - Drop shadow for depth and separation from background
 */

class TemplateInheritanceAgent {
  constructor() {
    // Industry-standard subtitle styling defaults
    this.industryDefaults = {
      font: 'Arial-Bold',
      fontSize: '5%', // 5% of composition height
      color: [1, 1, 1, 1], // White (RGBA normalized 0-1)
      strokeColor: [0, 0, 0, 1], // Black stroke
      strokeWidth: 6, // Standard stroke width for readability
      justification: 'CENTER_JUSTIFY',
      position: {
        horizontal: 0.5, // Center horizontally (50%)
        vertical: 0.85   // Bottom area (85% down)
      },
      shadow: {
        enabled: true,
        opacity: 0.8,
        direction: 135, // Bottom-right shadow
        distance: 8,
        softness: 15
      },
      tracking: 0, // Letter spacing
      leading: 1.2 // Line height multiplier
    };

    // Template detection patterns
    this.templateKeywords = [
      'template', 'caption', 'subtitle', 'text', 'base', 'style'
    ];
  }

  /**
   * Generate template detection and inheritance JSX code
   * @param {Object} options - Template options and preferences
   * @returns {string} - JSX code for template detection and creation
   */
  generateTemplateDetectionCode(options = {}) {
    const config = { ...this.industryDefaults, ...options };
    
    return `
// ===== TEMPLATE INHERITANCE SYSTEM =====
// Professional template layer detection and inheritance

function detectTemplateLayer(comp) {
    console.log("🎨 TemplateInheritanceAgent: Detecting template layer...");
    
    // Method 1: Check for selected layers
    if (comp.selectedLayers && comp.selectedLayers.length > 0) {
        var selectedLayer = comp.selectedLayers[0];
        if (selectedLayer instanceof TextLayer) {
            console.log("✅ Using selected text layer as template: " + selectedLayer.name);
            return selectedLayer;
        }
    }
    
    // Method 2: Look for layers with template keywords in name
    var templateKeywords = ${JSON.stringify(this.templateKeywords)};
    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        if (layer instanceof TextLayer) {
            var layerName = layer.name.toLowerCase();
            for (var k = 0; k < templateKeywords.length; k++) {
                if (layerName.indexOf(templateKeywords[k]) !== -1) {
                    console.log("✅ Found template layer by name: " + layer.name);
                    return layer;
                }
            }
        }
    }
    
    console.log("ℹ️ No template layer found - will create default");
    return null;
}

function createDefaultTemplate(comp) {
    console.log("🎨 Creating industry-standard default template...");
    
    // Calculate responsive font size (5% of comp height)
    var fontSize = Math.round(comp.height * 0.05);
    var maxFontSize = 120; // Cap for very large comps
    var minFontSize = 24;  // Minimum for readability
    fontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSize));
    
    console.log("📏 Calculated font size: " + fontSize + "px for " + comp.width + "x" + comp.height + " comp");
    
    // Create template text layer
    var templateLayer = comp.layers.addText("Template Caption");
    templateLayer.name = "CapEdify_Template";
    
    // Get text properties
    var textProp = templateLayer.property("Source Text");
    var textDocument = textProp.value;
    
    // Apply industry-standard styling
    textDocument.resetCharStyle();
    textDocument.font = "${config.font}";
    textDocument.fontSize = fontSize;
    textDocument.fillColor = [${config.color.join(', ')}];
    textDocument.strokeColor = [${config.strokeColor.join(', ')}];
    textDocument.strokeWidth = ${config.strokeWidth};
    textDocument.justification = ParagraphJustification.${config.justification};
    textDocument.tracking = ${config.tracking};
    textDocument.leading = fontSize * ${config.leading};
    textDocument.applyFill = true;
    textDocument.applyStroke = true;
    
    // Update text property
    textProp.setValue(textDocument);
    
    // Position at industry-standard location (bottom center)
    var posX = comp.width * ${config.position.horizontal};
    var posY = comp.height * ${config.position.vertical};
    templateLayer.property("Transform").property("Position").setValue([posX, posY]);
    
    // Set anchor point for center alignment
    templateLayer.property("Transform").property("Anchor Point").setValue([0, 0]);
    
    ${config.shadow.enabled ? `
    // Add professional drop shadow
    try {
        var dropShadow = templateLayer.property("Effects").addProperty("ADBE Drop Shadow");
        dropShadow.property("Opacity").setValue(${config.shadow.opacity * 100});
        dropShadow.property("Direction").setValue(${config.shadow.direction});
        dropShadow.property("Distance").setValue(${config.shadow.distance});
        dropShadow.property("Softness").setValue(${config.shadow.softness});
        dropShadow.property("Shadow Color").setValue([0, 0, 0, 1]);
        console.log("✅ Added drop shadow effect");
    } catch (shadowError) {
        console.log("⚠️ Could not add drop shadow: " + shadowError.toString());
    }
    ` : ''}
    
    console.log("✅ Created default template layer: " + templateLayer.name);
    return templateLayer;
}

function extractTemplateProperties(templateLayer) {
    console.log("🔍 Extracting template properties from: " + templateLayer.name);
    
    try {
        var textProp = templateLayer.property("Source Text");
        var textDocument = textProp.value;
        var transform = templateLayer.property("Transform");
        
        // Extract core styling properties
        var properties = {
            font: textDocument.font,
            fontSize: textDocument.fontSize,
            fillColor: textDocument.fillColor,
            strokeColor: textDocument.strokeColor,
            strokeWidth: textDocument.strokeWidth,
            justification: textDocument.justification,
            tracking: textDocument.tracking,
            leading: textDocument.leading,
            position: transform.property("Position").value,
            anchorPoint: transform.property("Anchor Point").value,
            opacity: transform.property("Opacity").value,
            effects: []
        };
        
        // Extract effects (like drop shadow)
        var effects = templateLayer.property("Effects");
        for (var i = 1; i <= effects.numProperties; i++) {
            try {
                var effect = effects.property(i);
                properties.effects.push({
                    matchName: effect.matchName,
                    name: effect.name,
                    enabled: effect.enabled
                });
            } catch (effectError) {
                // Skip problematic effects
            }
        }
        
        console.log("✅ Extracted " + properties.effects.length + " effects from template");
        return properties;
        
    } catch (extractError) {
        console.log("❌ Error extracting template properties: " + extractError.toString());
        return null;
    }
}

function applyTemplateProperties(targetLayer, templateProperties) {
    if (!templateProperties) {
        console.log("⚠️ No template properties to apply");
        return false;
    }
    
    try {
        console.log("🎨 Applying template properties to: " + targetLayer.name);
        
        // Apply text styling
        var textProp = targetLayer.property("Source Text");
        var textDocument = textProp.value;
        
        textDocument.font = templateProperties.font;
        textDocument.fontSize = templateProperties.fontSize;
        textDocument.fillColor = templateProperties.fillColor;
        textDocument.strokeColor = templateProperties.strokeColor;
        textDocument.strokeWidth = templateProperties.strokeWidth;
        textDocument.justification = templateProperties.justification;
        textDocument.tracking = templateProperties.tracking;
        textDocument.leading = templateProperties.leading;
        
        textProp.setValue(textDocument);
        
        // Apply transform properties
        var transform = targetLayer.property("Transform");
        transform.property("Position").setValue(templateProperties.position);
        transform.property("Anchor Point").setValue(templateProperties.anchorPoint);
        transform.property("Opacity").setValue(templateProperties.opacity);
        
        console.log("✅ Applied template styling to " + targetLayer.name);
        return true;
        
    } catch (applyError) {
        console.log("❌ Error applying template properties: " + applyError.toString());
        return false;
    }
}

function duplicateTemplateLayer(templateLayer, newText, layerName) {
    try {
        console.log("📋 Duplicating template layer for: " + newText.substring(0, 30) + "...");
        
        // Duplicate the template layer
        var newLayer = templateLayer.duplicate();
        newLayer.name = layerName || ("Caption: " + newText.substring(0, 20) + "...");
        
        // Update text content
        var textProp = newLayer.property("Source Text");
        var textDocument = textProp.value;
        textDocument.text = newText;
        textProp.setValue(textDocument);
        
        console.log("✅ Created caption layer: " + newLayer.name);
        return newLayer;
        
    } catch (duplicateError) {
        console.log("❌ Error duplicating template layer: " + duplicateError.toString());
        return null;
    }
}

// Template system validation
function validateTemplateSystem(comp) {
    console.log("🔍 Validating template system...");
    
    var issues = [];
    
    // Check composition validity
    if (!comp || !(comp instanceof CompItem)) {
        issues.push("Invalid composition provided");
        return issues;
    }
    
    if (comp.width < 100 || comp.height < 100) {
        issues.push("Composition dimensions too small (" + comp.width + "x" + comp.height + ")");
    }
    
    if (comp.duration < 1) {
        issues.push("Composition duration too short (" + comp.duration + "s)");
    }
    
    console.log("✅ Template system validation complete - " + issues.length + " issues found");
    return issues;
}
`;
  }

  /**
   * Generate template inheritance workflow
   * @param {Object} segments - Caption segments data
   * @param {Object} options - Export options
   * @returns {string} - Complete template inheritance JSX code
   */
  generateTemplateWorkflow(segments, options = {}) {
    const config = { ...this.industryDefaults, ...options };
    
    return `
// ===== TEMPLATE INHERITANCE WORKFLOW =====

function initializeTemplateSystem(comp) {
    console.log("🚀 TemplateInheritanceAgent: Initializing template system...");
    
    // Validate environment
    var validationIssues = validateTemplateSystem(comp);
    if (validationIssues.length > 0) {
        var errorMsg = "Template system validation failed:\\n" + validationIssues.join("\\n");
        alert(errorMsg);
        throw new Error(errorMsg);
    }
    
    // Detect or create template
    var templateLayer = detectTemplateLayer(comp);
    if (!templateLayer) {
        templateLayer = createDefaultTemplate(comp);
    }
    
    // Extract template properties for reuse
    var templateProperties = extractTemplateProperties(templateLayer);
    
    // Store template info
    return {
        layer: templateLayer,
        properties: templateProperties,
        isDefault: !detectTemplateLayer(comp)
    };
}

function processTemplateInheritance(templateSystem, captionSegments) {
    console.log("🎨 Processing template inheritance for " + captionSegments.length + " segments...");
    
    var createdLayers = [];
    var templateLayer = templateSystem.layer;
    
    for (var i = 0; i < captionSegments.length; i++) {
        var segment = captionSegments[i];
        
        try {
            // Create layer name
            var layerName = "Caption " + (i + 1) + " (" + 
                           segment.start.toFixed(1) + "s-" + 
                           segment.end.toFixed(1) + "s)";
            
            // Duplicate template with new text
            var captionLayer = duplicateTemplateLayer(templateLayer, segment.text, layerName);
            
            if (captionLayer) {
                createdLayers.push({
                    layer: captionLayer,
                    segment: segment,
                    index: i
                });
            }
            
        } catch (segmentError) {
            console.log("❌ Error processing segment " + (i + 1) + ": " + segmentError.toString());
        }
    }
    
    console.log("✅ Template inheritance complete - created " + createdLayers.length + " caption layers");
    return createdLayers;
}
`;
  }

  /**
   * Get industry-standard styling recommendations
   * @param {Object} compInfo - Composition information (width, height, frameRate)
   * @returns {Object} - Recommended styling based on comp specs
   */
  getIndustryRecommendations(compInfo = {}) {
    const { width = 1920, height = 1080, frameRate = 24 } = compInfo;
    
    // Calculate responsive sizing
    const fontSize = Math.max(24, Math.min(120, Math.round(height * 0.05)));
    const strokeWidth = Math.max(4, Math.min(12, Math.round(fontSize * 0.1)));
    
    // Determine optimal positioning based on aspect ratio
    const aspectRatio = width / height;
    let positionY = 0.85; // Default bottom
    
    if (aspectRatio > 2) {
      // Ultra-wide (cinema) - move subtitles up slightly
      positionY = 0.8;
    } else if (aspectRatio < 1) {
      // Portrait (mobile) - move subtitles up more
      positionY = 0.75;
    }
    
    return {
      recommended: {
        fontSize: fontSize,
        strokeWidth: strokeWidth,
        position: { horizontal: 0.5, vertical: positionY },
        maxWidth: width * 0.9, // 90% of comp width
        maxLines: Math.floor(height / (fontSize * 1.2) * 0.3) // Max 30% of screen height
      },
      metadata: {
        aspectRatio: aspectRatio,
        classification: aspectRatio > 2 ? 'cinema' : aspectRatio < 1 ? 'portrait' : 'standard'
      }
    };
  }

  /**
   * Generate validation and error handling code
   * @returns {string} - JSX validation code
   */
  generateValidationCode() {
    return `
// ===== TEMPLATE VALIDATION & ERROR HANDLING =====

function validateCaptionLayer(layer, segment) {
    var issues = [];
    
    if (!layer) {
        issues.push("Layer creation failed");
        return issues;
    }
    
    if (!(layer instanceof TextLayer)) {
        issues.push("Layer is not a text layer");
    }
    
    try {
        var textProp = layer.property("Source Text");
        var textDocument = textProp.value;
        
        if (!textDocument.text || textDocument.text.length === 0) {
            issues.push("Layer has empty text content");
        }
        
        if (textDocument.fontSize < 10) {
            issues.push("Font size too small (" + textDocument.fontSize + "px)");
        }
        
    } catch (textError) {
        issues.push("Text properties validation failed: " + textError.toString());
    }
    
    return issues;
}

function handleTemplateError(error, context, segment) {
    var errorMsg = "TemplateInheritanceAgent Error in " + context + ":\\n" +
                  "Segment: " + (segment ? segment.text.substring(0, 50) + "..." : "N/A") + "\\n" +
                  "Error: " + error.toString();
    
    console.log("❌ " + errorMsg);
    
    // Don't throw - log and continue with other segments
    return {
        success: false,
        error: errorMsg,
        context: context,
        segment: segment
    };
}
`;
  }
}

module.exports = new TemplateInheritanceAgent();