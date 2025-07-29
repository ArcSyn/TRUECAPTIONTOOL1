/**
 * JSX Export Service - Legacy compatibility wrapper
 * 
 * @description Temporary service to maintain compatibility with existing export routes.
 * The new AgentOrchestrator pipeline handles JSX generation directly.
 */

/**
 * Legacy JSX export function (placeholder)
 * @param {string} transcriptionId - Transcription ID
 * @param {Object} options - Export options
 * @returns {Promise<string>} - JSX script content
 */
async function exportJSX(transcriptionId, options = {}) {
  // This is a placeholder for the legacy export system
  // New implementations should use the AgentOrchestrator pipeline
  
  return `// Legacy JSX Export - Placeholder
// Use the new /api/pipeline/run endpoint for full agent processing
// Transcription ID: ${transcriptionId}

alert("This is a legacy JSX export. Please use the new Agent Pipeline system.");`;
}

module.exports = {
  exportJSX
};