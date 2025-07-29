/**
 * AgentOrchestrator - Master pipeline controller for CapEdify Phase 3
 * 
 * @description Coordinates all 4 modular agents in sequence with credit validation,
 * comprehensive logging, and intelligent error handling.
 * 
 * Pipeline Flow:
 * Input → CreditMeterAgent (validate) → [if allowed] → CaptionSplitAgent → 
 * ScriptFormatterAgent → JSXSceneBuilderAgent → JSX Output
 * 
 * Key Features:
 * • Credit validation before processing to avoid wasted compute
 * • Complete pipeline failure on any agent error (fail-fast strategy)
 * • Performance timing and logging for each agent stage
 * • Progress callbacks for frontend integration (25% → 50% → 75% → 100%)
 * • Support for both video transcription and direct SRT input
 */

const { run: creditMeterRun } = require('../agents/creditMeterAgent');
const { run: captionSplitRun } = require('../agents/captionSplitAgent');
const { run: scriptFormatterRun } = require('../agents/scriptFormatterAgent');
const { run: jsxSceneBuilderRun } = require('../agents/jsxSceneBuilderAgent');

/**
 * Pipeline execution result interface
 */
class PipelineResult {
  constructor(success, data, error = null, timing = {}, agentLogs = []) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.timing = timing;
    this.agentLogs = agentLogs;
    this.completedAt = new Date().toISOString();
  }
}

/**
 * Agent execution context with logging and timing
 */
class AgentContext {
  constructor(agentName, input, userInfo = {}) {
    this.agentName = agentName;
    this.input = input;
    this.userInfo = userInfo;
    this.startTime = Date.now();
    this.logs = [];
    this.result = null;
    this.error = null;
  }

  log(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      agent: this.agentName
    };
    this.logs.push(logEntry);
    console.log(`[${this.agentName}] ${level.toUpperCase()}: ${message}`);
  }

  complete(result) {
    this.result = result;
    this.executionTime = Date.now() - this.startTime;
    this.log(`Completed in ${this.executionTime}ms`, 'success');
  }

  fail(error) {
    this.error = error;
    this.executionTime = Date.now() - this.startTime;
    this.log(`Failed after ${this.executionTime}ms: ${error.message}`, 'error');
  }
}

/**
 * Main Agent Orchestrator Class
 */
class AgentOrchestrator {
  constructor() {
    this.pipelineStartTime = null;
    this.totalExecutionTime = 0;
    this.progressCallback = null;
  }

  /**
   * Execute complete agent pipeline
   * @param {Object} input - Pipeline input configuration
   * @param {string} input.inputType - "video" | "srt" 
   * @param {string} input.srtContent - SRT transcript content
   * @param {string} input.userTier - User tier for credit validation
   * @param {number} input.durationMinutes - Content duration in minutes
   * @param {number} input.jobCountThisMonth - User's current month job count
   * @param {Object} input.options - Optional styling and export options
   * @param {Function} progressCallback - Progress update function (percent, message)
   * @returns {Promise<PipelineResult>} - Complete pipeline execution result
   */
  async executePipeline(input, progressCallback = null) {
    this.pipelineStartTime = Date.now();
    this.progressCallback = progressCallback;
    const agentLogs = [];
    const timing = {};

    try {
      // Validate input
      this.validateInput(input);
      
      // Update progress: Starting pipeline
      this.updateProgress(0, 'Initializing agent pipeline...');

      // STAGE 1: Credit Validation (25%)
      this.updateProgress(10, 'Checking credits and tier limits...');
      
      const creditContext = new AgentContext('CreditMeterAgent', {
        tier: input.userTier,
        durationMinutes: input.durationMinutes,
        jobCountThisMonth: input.jobCountThisMonth
      }, { userTier: input.userTier });

      creditContext.log('Starting credit validation');
      const creditResult = await creditMeterRun(creditContext.input);
      
      if (!creditResult.allowed) {
        creditContext.fail(new Error(`Credit validation failed: ${creditResult.reason}`));
        agentLogs.push(creditContext);
        timing.creditMeter = creditContext.executionTime;
        
        return new PipelineResult(false, null, {
          stage: 'credit_validation',
          agent: 'CreditMeterAgent',
          message: creditResult.reason,
          tierSuggestions: creditResult.tierSuggestions
        }, timing, agentLogs);
      }
      
      creditContext.complete(creditResult);
      creditContext.log(`Credits approved: ${creditResult.estimatedCreditsUsed} credits`);
      agentLogs.push(creditContext);
      timing.creditMeter = creditContext.executionTime;
      
      this.updateProgress(25, 'Credits validated. Processing content...');

      // STAGE 2: Caption Splitting (50%)
      this.updateProgress(35, 'Splitting transcript into logical scenes...');
      
      const splitContext = new AgentContext('CaptionSplitAgent', input.srtContent);
      splitContext.log('Starting scene splitting');
      
      const scenes = await captionSplitRun(input.srtContent);
      if (!scenes || scenes.length === 0) {
        splitContext.fail(new Error('Failed to split SRT into scenes - no valid content found'));
        agentLogs.push(splitContext);
        timing.captionSplit = splitContext.executionTime;
        
        return new PipelineResult(false, null, {
          stage: 'caption_splitting',
          agent: 'CaptionSplitAgent',
          message: 'Unable to parse SRT content into scenes'
        }, timing, agentLogs);
      }
      
      splitContext.complete(scenes);
      splitContext.log(`Generated ${scenes.length} scenes`);
      agentLogs.push(splitContext);
      timing.captionSplit = splitContext.executionTime;
      
      this.updateProgress(50, `Split into ${scenes.length} scenes. Formatting text...`);

      // STAGE 3: Script Formatting (75%)
      this.updateProgress(60, 'Cleaning and formatting caption text...');
      
      const formatContext = new AgentContext('ScriptFormatterAgent', scenes);
      formatContext.log('Starting text formatting');
      
      const formattedScenes = await scriptFormatterRun(scenes);
      if (!formattedScenes || formattedScenes.length === 0) {
        formatContext.fail(new Error('Failed to format scene text'));
        agentLogs.push(formatContext);
        timing.scriptFormatter = formatContext.executionTime;
        
        return new PipelineResult(false, null, {
          stage: 'script_formatting',
          agent: 'ScriptFormatterAgent',
          message: 'Unable to format scene text content'
        }, timing, agentLogs);
      }
      
      formatContext.complete(formattedScenes);
      formatContext.log(`Formatted ${formattedScenes.length} scenes`);
      agentLogs.push(formatContext);
      timing.scriptFormatter = formatContext.executionTime;
      
      this.updateProgress(75, 'Text formatted. Building JSX layers...');

      // STAGE 4: JSX Scene Building (100%)
      this.updateProgress(85, 'Converting scenes to After Effects JSX format...');
      
      const jsxContext = new AgentContext('JSXSceneBuilderAgent', formattedScenes);
      jsxContext.log('Starting JSX scene building');
      
      const jsxScenes = await jsxSceneBuilderRun(formattedScenes);
      if (!jsxScenes || jsxScenes.length === 0) {
        jsxContext.fail(new Error('Failed to build JSX scenes'));
        agentLogs.push(jsxContext);
        timing.jsxSceneBuilder = jsxContext.executionTime;
        
        return new PipelineResult(false, null, {
          stage: 'jsx_building',
          agent: 'JSXSceneBuilderAgent', 
          message: 'Unable to convert scenes to JSX format'
        }, timing, agentLogs);
      }
      
      jsxContext.complete(jsxScenes);
      jsxContext.log(`Built ${jsxScenes.length} JSX scenes`);
      agentLogs.push(jsxContext);
      timing.jsxSceneBuilder = jsxContext.executionTime;
      
      this.updateProgress(100, 'Pipeline complete! JSX ready for download.');

      // Calculate total execution time
      this.totalExecutionTime = Date.now() - this.pipelineStartTime;
      timing.total = this.totalExecutionTime;

      // Build final result payload
      const pipelineData = {
        jsxScenes,
        creditInfo: creditResult,
        sceneCount: scenes.length,
        metadata: {
          inputType: input.inputType,
          durationMinutes: input.durationMinutes,
          userTier: input.userTier,
          processing: {
            totalTime: this.totalExecutionTime,
            stageBreakdown: timing
          },
          options: input.options || {}
        }
      };

      console.log(`🎉 Pipeline completed successfully in ${this.totalExecutionTime}ms`);
      console.log(`📊 Stage breakdown:`, timing);

      return new PipelineResult(true, pipelineData, null, timing, agentLogs);

    } catch (error) {
      console.error('🚨 Pipeline execution failed:', error);
      
      this.totalExecutionTime = Date.now() - this.pipelineStartTime;
      timing.total = this.totalExecutionTime;

      return new PipelineResult(false, null, {
        stage: 'pipeline_execution',
        agent: 'AgentOrchestrator',
        message: error.message,
        stack: error.stack
      }, timing, agentLogs);
    }
  }

  /**
   * Validate pipeline input parameters
   * @param {Object} input - Input to validate
   */
  validateInput(input) {
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: Expected configuration object');
    }

    if (!input.inputType || !['video', 'srt'].includes(input.inputType)) {
      throw new Error('Invalid inputType: Expected "video" or "srt"');
    }

    if (!input.srtContent || typeof input.srtContent !== 'string') {
      throw new Error('Invalid srtContent: Expected non-empty string');
    }

    if (!input.userTier || !['free', 'creator', 'studio'].includes(input.userTier)) {
      throw new Error('Invalid userTier: Expected "free", "creator", or "studio"');
    }

    if (typeof input.durationMinutes !== 'number' || input.durationMinutes <= 0) {
      throw new Error('Invalid durationMinutes: Expected positive number');
    }

    if (typeof input.jobCountThisMonth !== 'number' || input.jobCountThisMonth < 0) {
      throw new Error('Invalid jobCountThisMonth: Expected non-negative number');
    }
  }

  /**
   * Update pipeline progress
   * @param {number} percent - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  updateProgress(percent, message) {
    if (this.progressCallback && typeof this.progressCallback === 'function') {
      this.progressCallback(percent, message);
    }
    console.log(`📈 Pipeline Progress: ${percent}% - ${message}`);
  }

  /**
   * Get pipeline performance summary
   * @param {Object} timing - Timing data from pipeline execution
   * @returns {Object} - Performance summary
   */
  getPerformanceSummary(timing) {
    const totalTime = timing.total || 0;
    
    return {
      totalExecutionTime: totalTime,
      stageBreakdown: {
        creditValidation: timing.creditMeter || 0,
        sceneSplitting: timing.captionSplit || 0,
        textFormatting: timing.scriptFormatter || 0,
        jsxBuilding: timing.jsxSceneBuilder || 0
      },
      efficiency: {
        averageTimePerStage: totalTime / 4,
        fastestStage: Math.min(...Object.values(timing).filter(t => t > 0)),
        slowestStage: Math.max(...Object.values(timing).filter(t => t > 0))
      }
    };
  }
}

/**
 * Singleton orchestrator instance
 */
const orchestrator = new AgentOrchestrator();

/**
 * Execute agent pipeline - Main entry point
 * @param {Object} input - Pipeline configuration
 * @param {Function} progressCallback - Progress update callback
 * @returns {Promise<PipelineResult>} - Pipeline execution result
 */
async function executePipeline(input, progressCallback = null) {
  return orchestrator.executePipeline(input, progressCallback);
}

/**
 * Test function for development
 */
async function test() {
  console.log('🧪 Testing AgentOrchestrator...\n');

  const testInput = {
    inputType: 'srt',
    srtContent: `1
00:00:01,000 --> 00:00:03,500
Hello everyone, welcome to our video.

2
00:00:03,500 --> 00:00:06,000
Today we're going to talk about AI.

3
00:00:06,000 --> 00:00:08,500
It's a fascinating subject that affects us all.

4
00:00:10,000 --> 00:00:13,000
Let's start with the basics. What is AI?`,
    userTier: 'creator',
    durationMinutes: 0.5,
    jobCountThisMonth: 5,
    options: {
      style: 'modern',
      position: 'bottom'
    }
  };

  const progressCallback = (percent, message) => {
    console.log(`📊 ${percent}%: ${message}`);
  };

  const result = await executePipeline(testInput, progressCallback);
  
  console.log('\n🎯 Pipeline Result:');
  console.log(`Success: ${result.success}`);
  if (result.success) {
    console.log(`JSX Scenes: ${result.data.jsxScenes.length}`);
    console.log(`Credit Cost: ${result.data.creditInfo.estimatedCreditsUsed}`);
    console.log(`Total Time: ${result.timing.total}ms`);
  } else {
    console.log(`Error: ${result.error.message}`);
    console.log(`Failed at: ${result.error.stage}`);
  }
}

// Run test if called directly
if (require.main === module) {
  test();
}

module.exports = { 
  executePipeline, 
  AgentOrchestrator, 
  PipelineResult,
  AgentContext 
};