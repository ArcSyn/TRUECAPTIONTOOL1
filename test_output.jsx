// CapEdify Phase 3 - After Effects JSX Export
// Generated: 2025-07-29T21:54:42.393Z
// Project: LineBreakTest
// Scenes: 1
// Duration: 1 minutes
// User Tier: free

// Initialize After Effects project
var project = app.project;
var comp = project.items.addComp("LineBreakTest", 1920, 1080, 1, 60, 30);


// Scene 1: This is a very long caption that
should definitely...
var textLayer1 = comp.layers.addText("This is a very long caption that
should definitely be broken into");
textLayer1.name = "Scene_1";
textLayer1.startTime = 0;
textLayer1.outPoint = 2;

// Apply styling
var textProp1 = textLayer1.property("Source Text");
var textDoc1 = textProp1.value;
textDoc1.fontSize = 48;
textDoc1.fillColor = [1, 1, 1]; // White text
textDoc1.font = "Arial-BoldMT";
textDoc1.justification = ParagraphJustification.CENTER_JUSTIFY;
textProp1.setValue(textDoc1);

// Position text layer
textLayer1.property("Transform").property("Position").setValue([960, 900]); // Bottom center

// Add fade-in animation
var opacity1 = textLayer1.property("Transform").property("Opacity");
opacity1.setValueAtTime(0, 0);
opacity1.setValueAtTime(0.3, 100);


// Add fade-out animation  
opacity1.setValueAtTime(1.7, 100);
opacity1.setValueAtTime(2, 0);

// Finalize composition
comp.duration = 60;
project.save();

alert("CapEdify JSX import complete! 1 text layers created.");
