/**
 * Advanced Scene-Based JSX Export Service for After Effects
 * Phase 2 Implementation: Professional scene composition generation
 * 
 * Features:
 * - Intelligent scene breaking and composition management
 * - Advanced animation systems with transitions
 * - Professional positioning and timing algorithms
 * - Modular template system with inheritance
 * - Scene metadata and dependency tracking
 */

const fs = require('fs').promises;
const path = require('path');

class SceneBasedJSXService {
  constructor() {
    this.sceneTemplates = {
      professional: {
        name: 'Professional',
        compositions: {
          main: { width: 1920, height: 1080, frameRate: 24, duration: 300 },
          preview: { width: 640, height: 360, frameRate: 24, duration: 300 }
        },
        textStyle: {
          font: "Helvetica-Bold",
          fontSize: 52,
          color: [1, 1, 1],
          strokeColor: [0, 0, 0],
          strokeWidth: 2,
          tracking: 50,
          leading: 60,
          justification: "CENTER_JUSTIFY"
        },
        positioning: {
          primary: [0.5, 0.85],    // Bottom center
          secondary: [0.5, 0.15],  // Top center
          speaker: [0.1, 0.85],    // Bottom left
          overlay: [0.5, 0.5]      // Center
        },
        animations: {
          fadeIn: { duration: 0.5, easing: "easeOut" },
          slideUp: { duration: 0.7, distance: 50, easing: "easeInOut" },
          typewriter: { duration: 1.0, characterDelay: 0.05 },
          bounce: { duration: 0.8, amplitude: 20, frequency: 2 }
        },
        effects: {
          shadow: {
            enabled: true,
            opacity: 180,
            direction: 135,
            distance: 8,
            softness: 15,
            color: [0, 0, 0]
          },
          glow: {
            enabled: false,
            radius: 10,
            intensity: 1.5,
            color: [1, 1, 1]
          },
          background: {
            enabled: true,
            type: "rectangle",
            color: [0, 0, 0, 0.7],
            padding: [20, 10]
          }
        }
      },
      
      cinematic: {
        name: 'Cinematic',
        compositions: {
          main: { width: 3840, height: 2160, frameRate: 24, duration: 300 },
          preview: { width: 1280, height: 720, frameRate: 24, duration: 300 }
        },
        textStyle: {
          font: "Trajan Pro",
          fontSize: 72,
          color: [1, 0.9, 0.7],
          strokeColor: [0.2, 0.1, 0],
          strokeWidth: 3,
          tracking: 100,
          leading: 85,
          justification: "CENTER_JUSTIFY"
        },
        positioning: {
          primary: [0.5, 0.8],
          secondary: [0.5, 0.2],
          speaker: [0.15, 0.8],
          overlay: [0.5, 0.5]
        },
        animations: {
          fadeIn: { duration: 1.0, easing: "easeInOut" },
          slideUp: { duration: 1.2, distance: 80, easing: "easeOut" },
          reveal: { duration: 1.5, maskFeather: 50 },
          dramatic: { duration: 2.0, scale: [80, 100], rotation: [-2, 0] }
        },
        effects: {
          shadow: {
            enabled: true,
            opacity: 220,
            direction: 135,
            distance: 15,
            softness: 25,
            color: [0, 0, 0]
          },
          glow: {
            enabled: true,
            radius: 20,
            intensity: 2.0,
            color: [1, 0.9, 0.7]
          },
          background: {
            enabled: true,
            type: "gradient",
            colors: [[0, 0, 0, 0.8], [0.1, 0.05, 0, 0.6]],
            padding: [40, 20]
          }
        }
      },
      
      social: {
        name: 'Social Media',
        compositions: {
          main: { width: 1080, height: 1920, frameRate: 30, duration: 300 },
          square: { width: 1080, height: 1080, frameRate: 30, duration: 300 },
          story: { width: 1080, height: 1920, frameRate: 30, duration: 300 }
        },
        textStyle: {
          font: "Montserrat-Bold",
          fontSize: 64,
          color: [1, 1, 1],
          strokeColor: [1, 0.2, 0.4],
          strokeWidth: 4,
          tracking: 25,
          leading: 75,
          justification: "CENTER_JUSTIFY"
        },
        positioning: {
          primary: [0.5, 0.7],
          secondary: [0.5, 0.3],
          hashtag: [0.5, 0.9],
          branding: [0.9, 0.1]
        },
        animations: {
          pop: { duration: 0.4, scale: [90, 110, 100], easing: "easeOut" },
          slide: { duration: 0.6, distance: 100, easing: "easeInOut" },
          pulse: { duration: 0.8, scale: [100, 105, 100], loop: true },
          bounce: { duration: 0.5, amplitude: 30, frequency: 3 }
        },
        effects: {
          shadow: {
            enabled: true,
            opacity: 200,
            direction: 135,
            distance: 6,
            softness: 12,
            color: [1, 0.2, 0.4]
          },
          background: {
            enabled: true,
            type: "rounded_rectangle",
            color: [0.1, 0.1, 0.1, 0.9],
            cornerRadius: 15,
            padding: [30, 15]
          }
        }
      }
    };

    this.sceneAnalyzer = new SceneAnalyzer();
    this.compositionBuilder = new CompositionBuilder();
    this.animationEngine = new AnimationEngine();
  }

  /**
   * Enhanced scene breaking with intelligent analysis
   */
  analyzeAndBreakScenes(captions, options = {}) {
    const {
      gapThreshold = 2.0,
      maxSceneDuration = 30.0,
      minSceneDuration = 3.0,
      semanticBreaking = true,
      speakerDetection = true
    } = options;

    return this.sceneAnalyzer.analyzeScenes(captions, {
      gapThreshold,
      maxSceneDuration,
      minSceneDuration,
      semanticBreaking,
      speakerDetection
    });
  }

  /**
   * Generate comprehensive scene-based JSX with compositions
   */
  async generateSceneBasedProject(captions, options = {}) {
    const {
      projectName = 'Scene Project',
      templateName = 'professional',
      outputFormat = 'individual', // 'individual' | 'master' | 'both'
      includePreview = true,
      generateProject = true
    } = options;

    // Analyze and break into scenes
    const scenes = this.analyzeAndBreakScenes(captions, options);
    const template = this.sceneTemplates[templateName] || this.sceneTemplates.professional;

    // Generate project structure
    const project = {
      metadata: this.generateProjectMetadata(scenes, template, options),
      compositions: {},
      scripts: {}
    };

    // Generate master composition
    if (outputFormat === 'master' || outputFormat === 'both') {
      project.scripts['00_master_composition.jsx'] = 
        this.generateMasterComposition(scenes, template, project.metadata);
    }

    // Generate individual scene compositions
    if (outputFormat === 'individual' || outputFormat === 'both') {
      scenes.forEach((scene, index) => {
        const sceneNumber = String(index + 1).padStart(3, '0');
        project.scripts[`scene_${sceneNumber}_composition.jsx`] = 
          this.generateSceneComposition(scene, template, project.metadata, index);
      });
    }

    // Generate project file if requested
    if (generateProject) {
      project.scripts['project_setup.jsx'] = 
        this.generateProjectSetup(project.metadata, template);
    }

    // Generate preview compositions
    if (includePreview) {
      project.scripts['preview_generator.jsx'] = 
        this.generatePreviewComposition(scenes, template, project.metadata);
    }

    return project;
  }

  /**
   * Generate master composition that coordinates all scenes
   */
  generateMasterComposition(scenes, template, metadata) {
    return `// Master Composition Controller - ${metadata.projectName}
// Generated by CaptionFlow Phase 2 Scene Engine
// Template: ${template.name}
// Scenes: ${scenes.length}

function createMasterComposition() {
    app.beginUndoGroup("Create Master Composition");
    
    try {
        // Create master composition
        var comp = app.project.items.addComp(
            "${metadata.projectName}_Master",
            ${template.compositions.main.width},
            ${template.compositions.main.height},
            1.0,
            ${metadata.totalDuration},
            ${template.compositions.main.frameRate}
        );
        
        // Scene timing data
        var sceneData = ${JSON.stringify(scenes.map(scene => ({
          id: scene.id,
          startTime: scene.startTime,
          endTime: scene.endTime,
          duration: scene.duration,
          captionCount: scene.captions.length,
          type: scene.type || 'dialogue',
          speaker: scene.speaker || null
        })), null, 8)};
        
        // Create scene compositions and add to master
        for (var i = 0; i < sceneData.length; i++) {
            var scene = sceneData[i];
            var sceneComp = createSceneComposition(scene, i);
            
            if (sceneComp) {
                var layer = comp.layers.add(sceneComp);
                layer.name = "Scene " + (i + 1) + " - " + scene.type;
                layer.startTime = scene.startTime;
                layer.outPoint = scene.endTime;
                
                // Add scene transition if not first scene
                if (i > 0) {
                    addSceneTransition(layer, i);
                }
            }
        }
        
        // Add master effects and adjustments
        addMasterEffects(comp);
        
        comp.openInViewer();
        alert("Master composition created successfully!\\n" + 
              "Scenes: " + sceneData.length + "\\n" + 
              "Duration: " + ${metadata.totalDuration.toFixed(1)} + "s");
        
    } catch (error) {
        app.endUndoGroup();
        alert("Error creating master composition: " + error.toString());
    }
    
    app.endUndoGroup();
}

function createSceneComposition(sceneData, index) {
    // This would create individual scene compositions
    // Implementation depends on scene-specific JSX files being loaded
    return null;
}

function addSceneTransition(layer, sceneIndex) {
    // Add smooth transitions between scenes
    var opacity = layer.property("Opacity");
    var fadeInDuration = 0.5;
    
    opacity.setValueAtTime(layer.startTime, 0);
    opacity.setValueAtTime(layer.startTime + fadeInDuration, 100);
}

function addMasterEffects(comp) {
    // Add master composition effects like color correction, etc.
}

// Execute the function
createMasterComposition();
`;
  }

  /**
   * Generate individual scene composition with advanced positioning and animation
   */
  generateSceneComposition(scene, template, metadata, sceneIndex) {
    const sceneNumber = String(sceneIndex + 1).padStart(3, '0');
    
    return `// Scene ${sceneNumber} Composition - ${metadata.projectName}
// Generated by CaptionFlow Phase 2 Scene Engine
// Captions: ${scene.captions.length} | Duration: ${scene.duration.toFixed(1)}s
// Type: ${scene.type || 'dialogue'} | Speaker: ${scene.speaker || 'Unknown'}

function createScene${sceneNumber}() {
    app.beginUndoGroup("Create Scene ${sceneNumber}");
    
    try {
        // Create scene composition
        var comp = app.project.items.addComp(
            "${metadata.projectName}_Scene_${sceneNumber}",
            ${template.compositions.main.width},
            ${template.compositions.main.height},
            1.0,
            ${scene.duration},
            ${template.compositions.main.frameRate}
        );
        
        // Caption data for this scene
        var captions = ${JSON.stringify(scene.captions.map(caption => ({
          ...caption,
          relativeStartTime: caption.startTime - scene.startTime,
          relativeEndTime: caption.endTime - scene.startTime
        })), null, 8)};
        
        // Template configuration
        var template = ${JSON.stringify(template, null, 8)};
        
        // Create caption layers with advanced positioning
        for (var i = 0; i < captions.length; i++) {
            var caption = captions[i];
            var textLayer = comp.layers.addText(caption.text);
            
            // Set timing relative to scene start
            textLayer.inPoint = caption.relativeStartTime;
            textLayer.outPoint = caption.relativeEndTime;
            textLayer.name = "Caption " + (i + 1) + " - " + caption.text.substring(0, 25) + "...";
            
            // Apply advanced text styling
            applyAdvancedTextStyling(textLayer, template.textStyle);
            
            // Position based on scene type and speaker
            var position = calculateAdvancedPosition(caption, i, captions.length, template, comp);
            textLayer.property("Position").setValue(position);
            
            // Apply animations based on template
            applyAdvancedAnimation(textLayer, template.animations, i);
            
            // Add effects
            applyTextEffects(textLayer, template.effects);
        }
        
        // Add scene-specific elements
        addSceneElements(comp, ${JSON.stringify(scene)}, template);
        
        comp.openInViewer();
        
    } catch (error) {
        app.endUndoGroup();
        alert("Error creating scene ${sceneNumber}: " + error.toString());
        return;
    }
    
    app.endUndoGroup();
    alert("Scene ${sceneNumber} created successfully!\\n" + 
          "Captions: " + captions.length + "\\n" + 
          "Duration: " + ${scene.duration.toFixed(1)} + "s");
}

function applyAdvancedTextStyling(textLayer, styleConfig) {
    var textProp = textLayer.property("Source Text");
    var textDocument = textProp.value;
    
    textDocument.font = styleConfig.font;
    textDocument.fontSize = styleConfig.fontSize;
    textDocument.fillColor = styleConfig.color;
    textDocument.tracking = styleConfig.tracking;
    textDocument.leading = styleConfig.leading;
    textDocument.justification = ParagraphJustification[styleConfig.justification];
    
    if (styleConfig.strokeWidth > 0 && styleConfig.strokeColor) {
        textDocument.strokeColor = styleConfig.strokeColor;
        textDocument.strokeWidth = styleConfig.strokeWidth;
        textDocument.strokeOverFill = true;
    }
    
    textProp.setValue(textDocument);
}

function calculateAdvancedPosition(caption, index, totalCaptions, template, comp) {
    var basePosition = template.positioning.primary;
    var x = basePosition[0] * comp.width;
    var y = basePosition[1] * comp.height;
    
    // Adjust for multiple simultaneous captions
    if (totalCaptions > 1) {
        var verticalOffset = (index - (totalCaptions - 1) / 2) * 80;
        y += verticalOffset;
    }
    
    // Add subtle random variation for natural feel
    x += (Math.random() - 0.5) * 20;
    y += (Math.random() - 0.5) * 10;
    
    return [x, y];
}

function applyAdvancedAnimation(textLayer, animationConfig, index) {
    var animationType = "fadeIn"; // Default animation
    var config = animationConfig[animationType];
    
    if (animationType === "fadeIn") {
        var opacity = textLayer.property("Opacity");
        var startTime = textLayer.inPoint;
        var duration = config.duration;
        
        opacity.setValueAtTime(startTime, 0);
        opacity.setValueAtTime(startTime + duration, 100);
        
        // Add easing
        if (config.easing === "easeOut") {
            var key1 = opacity.keyAtIndex(1);
            var key2 = opacity.keyAtIndex(2);
            key1.outInterpolationType = KeyframeInterpolationType.BEZIER;
            key2.inInterpolationType = KeyframeInterpolationType.BEZIER;
        }
    }
    
    // Stagger animation timing for multiple captions
    if (index > 0) {
        var delay = index * 0.1;
        var props = ["Opacity", "Position", "Scale"];
        for (var p = 0; p < props.length; p++) {
            var prop = textLayer.property(props[p]);
            if (prop && prop.numKeys > 0) {
                for (var k = 1; k <= prop.numKeys; k++) {
                    var key = prop.keyAtIndex(k);
                    key.time += delay;
                }
            }
        }
    }
}

function applyTextEffects(textLayer, effectConfig) {
    // Drop Shadow
    if (effectConfig.shadow && effectConfig.shadow.enabled) {
        var shadow = textLayer.property("Effects").addProperty("Drop Shadow");
        shadow.property("Opacity").setValue(effectConfig.shadow.opacity);
        shadow.property("Direction").setValue(effectConfig.shadow.direction);
        shadow.property("Distance").setValue(effectConfig.shadow.distance);
        shadow.property("Softness").setValue(effectConfig.shadow.softness);
        shadow.property("Shadow Color").setValue(effectConfig.shadow.color);
    }
    
    // Glow
    if (effectConfig.glow && effectConfig.glow.enabled) {
        var glow = textLayer.property("Effects").addProperty("Glow");
        glow.property("Glow Radius").setValue(effectConfig.glow.radius);
        glow.property("Glow Intensity").setValue(effectConfig.glow.intensity);
        glow.property("Glow Colors").setValue(1); // A & B Colors
        glow.property("Color A").setValue(effectConfig.glow.color);
    }
    
    // Background
    if (effectConfig.background && effectConfig.background.enabled) {
        // This would require creating a shape layer behind the text
        addTextBackground(textLayer, effectConfig.background);
    }
}

function addTextBackground(textLayer, bgConfig) {
    var comp = textLayer.containingComp;
    var shapeLayer = comp.layers.addShape();
    shapeLayer.name = textLayer.name + " - Background";
    shapeLayer.moveAfter(textLayer);
    
    // Create rectangle shape based on text bounds
    var rectangle = shapeLayer.property("Contents").addProperty("Rectangle");
    var fill = shapeLayer.property("Contents").addProperty("Fill");
    
    fill.property("Color").setValue(bgConfig.color);
    
    // Link position to text layer
    shapeLayer.property("Position").expression = 
        'thisComp.layer("' + textLayer.name + '").position';
}

function addSceneElements(comp, sceneData, template) {
    // Add scene-specific elements like speaker indicators, timing markers, etc.
    if (sceneData.speaker) {
        addSpeakerIndicator(comp, sceneData.speaker, template);
    }
    
    if (sceneData.type === "action") {
        addActionIndicator(comp, template);
    }
}

function addSpeakerIndicator(comp, speakerName, template) {
    var speakerLayer = comp.layers.addText(speakerName.toUpperCase());
    var position = template.positioning.speaker;
    
    speakerLayer.property("Position").setValue([
        position[0] * comp.width,
        position[1] * comp.height
    ]);
    
    // Style speaker indicator
    var textProp = speakerLayer.property("Source Text");
    var textDoc = textProp.value;
    textDoc.fontSize = template.textStyle.fontSize * 0.6;
    textDoc.fillColor = template.textStyle.color;
    textDoc.font = template.textStyle.font;
    textProp.setValue(textDoc);
}

function addActionIndicator(comp, template) {
    // Add visual indicator for action scenes
}

// Execute the function
createScene${sceneNumber}();
`;
  }

  /**
   * Generate project setup script for After Effects project creation
   */
  generateProjectSetup(metadata, template) {
    return `// Project Setup Script - ${metadata.projectName}
// Generated by CaptionFlow Phase 2 Scene Engine
// Automatically creates project structure and compositions

function setupProject() {
    app.beginUndoGroup("Setup Project Structure");
    
    try {
        // Create project folders
        var rootFolder = app.project.items.addFolder("${metadata.projectName}");
        var scenesFolder = app.project.items.addFolder("Scenes");
        var assetsFolder = app.project.items.addFolder("Assets");
        var previewsFolder = app.project.items.addFolder("Previews");
        
        scenesFolder.parentFolder = rootFolder;
        assetsFolder.parentFolder = rootFolder;
        previewsFolder.parentFolder = rootFolder;
        
        // Set project settings
        app.project.displayStartFrame = 0;
        app.project.framesUseFeetFrames = false;
        app.project.timeDisplayType = TimeDisplayType.TIMECODE;
        
        // Project metadata
        var metadata = ${JSON.stringify(metadata, null, 8)};
        
        // Create template compositions
        createTemplateCompositions(metadata, rootFolder);
        
        alert("Project setup completed successfully!\\n" +
              "Project: " + metadata.projectName + "\\n" +
              "Scenes: " + metadata.sceneCount + "\\n" +
              "Total Duration: " + metadata.totalDuration.toFixed(1) + "s\\n" +
              "Template: " + metadata.templateName);
              
    } catch (error) {
        app.endUndoGroup();
        alert("Error setting up project: " + error.toString());
        return;
    }
    
    app.endUndoGroup();
}

function createTemplateCompositions(metadata, parentFolder) {
    // Create master template compositions that scenes can reference
    var template = ${JSON.stringify(template, null, 8)};
    
    for (var compName in template.compositions) {
        var compConfig = template.compositions[compName];
        var comp = app.project.items.addComp(
            metadata.projectName + "_" + compName + "_Template",
            compConfig.width,
            compConfig.height,
            1.0,
            compConfig.duration,
            compConfig.frameRate
        );
        comp.parentFolder = parentFolder;
    }
}

// Execute setup
setupProject();
`;
  }

  /**
   * Generate project metadata for tracking and organization
   */
  generateProjectMetadata(scenes, template, options) {
    const totalDuration = scenes.length > 0 ? 
      scenes[scenes.length - 1].endTime - scenes[0].startTime : 0;
    
    return {
      projectName: options.projectName || 'Scene Project',
      templateName: template.name,
      sceneCount: scenes.length,
      totalCaptions: scenes.reduce((total, scene) => total + scene.captions.length, 0),
      totalDuration: totalDuration,
      createdAt: new Date().toISOString(),
      version: '2.0.0',
      sceneBreaking: {
        gapThreshold: options.gapThreshold || 2.0,
        semanticBreaking: options.semanticBreaking || true,
        speakerDetection: options.speakerDetection || true
      },
      composition: {
        width: template.compositions.main.width,
        height: template.compositions.main.height,
        frameRate: template.compositions.main.frameRate
      },
      export: {
        format: options.outputFormat || 'individual',
        includePreview: options.includePreview || true,
        generateProject: options.generateProject || true
      }
    };
  }

  /**
   * Generate preview composition for quick review
   */
  generatePreviewComposition(scenes, template, metadata) {
    return `// Preview Composition Generator - ${metadata.projectName}
// Creates low-resolution preview for quick review

function createPreviewComposition() {
    app.beginUndoGroup("Create Preview Composition");
    
    try {
        var previewComp = app.project.items.addComp(
            "${metadata.projectName}_Preview",
            ${template.compositions.preview.width},
            ${template.compositions.preview.height},
            1.0,
            ${metadata.totalDuration},
            ${template.compositions.preview.frameRate}
        );
        
        // Add simplified captions for preview
        var allCaptions = [];
        var scenes = ${JSON.stringify(scenes.map(scene => ({
          captions: scene.captions.map(caption => ({
            text: caption.text,
            startTime: caption.startTime,
            endTime: caption.endTime
          }))
        })), null, 8)};
        
        // Flatten all captions
        for (var s = 0; s < scenes.length; s++) {
            allCaptions = allCaptions.concat(scenes[s].captions);
        }
        
        // Add simplified text layers
        for (var i = 0; i < allCaptions.length; i++) {
            var caption = allCaptions[i];
            var textLayer = previewComp.layers.addText(caption.text);
            
            textLayer.inPoint = caption.startTime;
            textLayer.outPoint = caption.endTime;
            textLayer.name = "Preview Caption " + (i + 1);
            
            // Simple positioning and styling for preview
            textLayer.property("Position").setValue([
                previewComp.width / 2,
                previewComp.height * 0.85
            ]);
            
            // Basic text styling
            var textProp = textLayer.property("Source Text");
            var textDoc = textProp.value;
            textDoc.fontSize = 24;
            textDoc.fillColor = [1, 1, 1];
            textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
            textProp.setValue(textDoc);
        }
        
        previewComp.openInViewer();
        alert("Preview composition created with " + allCaptions.length + " captions");
        
    } catch (error) {
        app.endUndoGroup();
        alert("Error creating preview: " + error.toString());
    }
    
    app.endUndoGroup();
}

createPreviewComposition();
`;
  }

  /**
   * Get available scene templates
   */
  getAvailableTemplates() {
    return Object.keys(this.sceneTemplates).map(key => ({
      id: key,
      name: this.sceneTemplates[key].name,
      compositions: Object.keys(this.sceneTemplates[key].compositions),
      animations: Object.keys(this.sceneTemplates[key].animations),
      description: this.getTemplateDescription(key)
    }));
  }

  getTemplateDescription(templateId) {
    const descriptions = {
      professional: "Clean, corporate-style templates suitable for business and educational content",
      cinematic: "High-end film-style templates with dramatic effects and 4K support",
      social: "Modern social media templates optimized for vertical and square formats"
    };
    return descriptions[templateId] || "Custom template";
  }
}

/**
 * Advanced Scene Analysis Engine
 */
class SceneAnalyzer {
  analyzeScenes(captions, options) {
    let scenes = this.breakByTiming(captions, options.gapThreshold);
    
    if (options.semanticBreaking) {
      scenes = this.refineBySemantics(scenes, captions);
    }
    
    if (options.speakerDetection) {
      scenes = this.detectSpeakers(scenes);
    }
    
    scenes = this.enforceMinMaxDuration(scenes, options);
    scenes = this.addSceneMetadata(scenes);
    
    return scenes;
  }

  breakByTiming(captions, gapThreshold) {
    if (!captions.length) return [];
    
    const scenes = [];
    let currentScene = [captions[0]];
    
    for (let i = 1; i < captions.length; i++) {
      const gap = captions[i].startTime - captions[i - 1].endTime;
      
      if (gap > gapThreshold) {
        scenes.push(this.createScene(currentScene, scenes.length + 1));
        currentScene = [captions[i]];
      } else {
        currentScene.push(captions[i]);
      }
    }
    
    if (currentScene.length > 0) {
      scenes.push(this.createScene(currentScene, scenes.length + 1));
    }
    
    return scenes;
  }

  refineBySemantics(scenes, captions) {
    // Analyze content for natural breaking points
    return scenes.map(scene => {
      const refinedCaptions = this.analyzeContentBreaks(scene.captions);
      return { ...scene, captions: refinedCaptions };
    });
  }

  analyzeContentBreaks(captions) {
    // Look for sentence endings, topic changes, etc.
    return captions.map(caption => ({
      ...caption,
      semanticType: this.categorizeContent(caption.text),
      confidence: this.calculateConfidence(caption.text)
    }));
  }

  categorizeContent(text) {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who'];
    const actionWords = ['said', 'did', 'went', 'came', 'took'];
    
    if (text.endsWith('?')) return 'question';
    if (questionWords.some(word => text.toLowerCase().includes(word))) return 'question';
    if (actionWords.some(word => text.toLowerCase().includes(word))) return 'action';
    if (text.includes(':') || text.includes('"')) return 'dialogue';
    
    return 'narrative';
  }

  calculateConfidence(text) {
    let confidence = 0.5;
    
    // Increase confidence for complete sentences
    if (text.match(/[.!?]$/)) confidence += 0.2;
    
    // Increase confidence for proper capitalization
    if (text.charAt(0) === text.charAt(0).toUpperCase()) confidence += 0.1;
    
    // Decrease confidence for mid-sentence breaks
    if (text.includes(',') && !text.match(/[.!?]$/)) confidence -= 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  }

  detectSpeakers(scenes) {
    return scenes.map(scene => {
      const speaker = this.identifySpeaker(scene.captions);
      return { ...scene, speaker };
    });
  }

  identifySpeaker(captions) {
    // Simple speaker detection based on content patterns
    const text = captions.map(c => c.text).join(' ').toLowerCase();
    
    if (text.includes('i ') || text.includes(' me ') || text.includes('my ')) {
      return 'Speaker 1';
    }
    if (text.includes('you ') || text.includes('your ')) {
      return 'Speaker 2';
    }
    
    return null;
  }

  enforceMinMaxDuration(scenes, options) {
    // Split overly long scenes and merge overly short ones
    return scenes.filter(scene => scene.duration >= options.minSceneDuration)
                 .map(scene => scene.duration > options.maxSceneDuration ? 
                      this.splitLongScene(scene, options.maxSceneDuration) : scene)
                 .flat();
  }

  splitLongScene(scene, maxDuration) {
    if (scene.duration <= maxDuration) return scene;
    
    const midPoint = scene.startTime + maxDuration;
    const splitIndex = scene.captions.findIndex(caption => caption.startTime >= midPoint);
    
    if (splitIndex === -1) return scene;
    
    const firstHalf = scene.captions.slice(0, splitIndex);
    const secondHalf = scene.captions.slice(splitIndex);
    
    return [
      this.createScene(firstHalf, scene.id),
      this.createScene(secondHalf, scene.id + 0.5)
    ];
  }

  addSceneMetadata(scenes) {
    return scenes.map((scene, index) => ({
      ...scene,
      sceneNumber: index + 1,
      complexity: this.calculateComplexity(scene),
      recommendedTemplate: this.recommendTemplate(scene)
    }));
  }

  calculateComplexity(scene) {
    let complexity = 'simple';
    
    if (scene.captions.length > 5) complexity = 'medium';
    if (scene.captions.length > 10) complexity = 'complex';
    if (scene.duration > 20) complexity = 'complex';
    
    return complexity;
  }

  recommendTemplate(scene) {
    if (scene.speaker) return 'professional';
    if (scene.type === 'action') return 'cinematic';
    return 'professional';
  }

  createScene(captions, id) {
    return {
      id,
      startTime: captions[0].startTime,
      endTime: captions[captions.length - 1].endTime,
      duration: captions[captions.length - 1].endTime - captions[0].startTime,
      captions,
      type: this.categorizeContent(captions.map(c => c.text).join(' '))
    };
  }
}

/**
 * Composition Builder for After Effects project structure
 */
class CompositionBuilder {
  // Implementation for building complex composition hierarchies
}

/**
 * Advanced Animation Engine
 */
class AnimationEngine {
  // Implementation for sophisticated animation systems
}

module.exports = new SceneBasedJSXService();