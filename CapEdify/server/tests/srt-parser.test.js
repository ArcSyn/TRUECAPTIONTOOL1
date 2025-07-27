/**
 * SRT Parser Test Suite
 * Comprehensive testing for SRT parsing accuracy and edge cases
 */

const jsxExportService = require('../services/jsxExportService');
const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');

class SRTParserTests {
  constructor() {
    this.testCases = [];
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Test basic SRT parsing functionality
   */
  testBasicSRTParsing() {
    const basicSRT = `1
00:00:10,500 --> 00:00:13,240
This is the first caption

2
00:00:15,000 --> 00:00:18,500
This is the second caption with longer text

3
00:00:20,750 --> 00:00:23,100
Final caption here`;

    try {
      const captions = jsxExportService.parseSRT(basicSRT);
      
      // Validate caption count
      assert.strictEqual(captions.length, 3, 'Should parse 3 captions');
      
      // Validate first caption
      assert.strictEqual(captions[0].id, 1, 'First caption ID should be 1');
      assert.strictEqual(captions[0].text, 'This is the first caption', 'First caption text mismatch');
      assert.strictEqual(captions[0].startTime, 10.5, 'First caption start time mismatch');
      assert.strictEqual(captions[0].endTime, 13.24, 'First caption end time mismatch');
      
      // Validate timing calculations
      assert.strictEqual(captions[0].duration, 2.74, 'Duration calculation incorrect');
      
      this.logTest('Basic SRT Parsing', true);
      return true;
    } catch (error) {
      this.logTest('Basic SRT Parsing', false, error.message);
      return false;
    }
  }

  /**
   * Test SRT with HTML tags and special characters
   */
  testSRTWithHTMLTags() {
    const htmlSRT = `1
00:00:10,500 --> 00:00:13,240
<i>This is italic text</i>

2
00:00:15,000 --> 00:00:18,500
<b>Bold text</b> with <u>underline</u>

3
00:00:20,750 --> 00:00:23,100
Mixed <i><b>formatting</b></i> and normal text`;

    try {
      const captions = jsxExportService.parseSRT(htmlSRT);
      
      // Validate HTML tag removal
      assert.strictEqual(captions[0].text, 'This is italic text', 'HTML tags not removed properly');
      assert.strictEqual(captions[1].text, 'Bold text with underline', 'Complex HTML tags not removed');
      assert.strictEqual(captions[2].text, 'Mixed formatting and normal text', 'Nested HTML tags not handled');
      
      this.logTest('SRT with HTML Tags', true);
      return true;
    } catch (error) {
      this.logTest('SRT with HTML Tags', false, error.message);
      return false;
    }
  }

  /**
   * Test SRT with edge case timing formats
   */
  testEdgeCaseTiming() {
    const edgeCaseSRT = `1
00:00:00,000 --> 00:00:02,999
Caption at zero start

2
23:59:58,500 --> 23:59:59,999
Caption near end of day

3
01:30:45,123 --> 01:30:47,456
Caption with precise milliseconds`;

    try {
      const captions = jsxExportService.parseSRT(edgeCaseSRT);
      
      // Validate edge case timings
      assert.strictEqual(captions[0].startTime, 0, 'Zero start time not handled');
      assert.strictEqual(captions[0].endTime, 2.999, 'High millisecond value not parsed');
      
      assert.strictEqual(captions[1].startTime, 86398.5, 'Large time value calculation incorrect');
      assert.strictEqual(captions[1].endTime, 86399.999, 'End of day timing incorrect');
      
      assert.strictEqual(captions[2].startTime, 5445.123, 'Precise millisecond parsing failed');
      assert.strictEqual(captions[2].endTime, 5447.456, 'Precise end time parsing failed');
      
      this.logTest('Edge Case Timing', true);
      return true;
    } catch (error) {
      this.logTest('Edge Case Timing', false, error.message);
      return false;
    }
  }

  /**
   * Test malformed SRT handling
   */
  testMalformedSRT() {
    const malformedSRT = `1
00:00:10,500 --> 00:00:13,240
This caption is fine

2
INVALID TIMING FORMAT
This caption has bad timing

3
00:00:20,750 --> 00:00:23,100
This caption is also fine

4
00:00:25,000 -->
Incomplete timing format`;

    try {
      const captions = jsxExportService.parseSRT(malformedSRT);
      
      // Should only parse valid captions
      assert.strictEqual(captions.length, 2, 'Should skip malformed captions and parse only valid ones');
      assert.strictEqual(captions[0].text, 'This caption is fine', 'First valid caption should be parsed');
      assert.strictEqual(captions[1].text, 'This caption is also fine', 'Second valid caption should be parsed');
      
      this.logTest('Malformed SRT Handling', true);
      return true;
    } catch (error) {
      this.logTest('Malformed SRT Handling', false, error.message);
      return false;
    }
  }

  /**
   * Test multiline captions
   */
  testMultilineCaptions() {
    const multilineSRT = `1
00:00:10,500 --> 00:00:13,240
This is a multiline caption
that spans multiple lines
and should be joined

2
00:00:15,000 --> 00:00:18,500
Another multiline
with different content

3
00:00:20,750 --> 00:00:23,100
Single line caption`;

    try {
      const captions = jsxExportService.parseSRT(multilineSRT);
      
      // Validate multiline joining
      assert.strictEqual(captions[0].text, 'This is a multiline caption that spans multiple lines and should be joined', 'Multiline caption not joined properly');
      assert.strictEqual(captions[1].text, 'Another multiline with different content', 'Second multiline caption incorrect');
      assert.strictEqual(captions[2].text, 'Single line caption', 'Single line caption affected');
      
      this.logTest('Multiline Captions', true);
      return true;
    } catch (error) {
      this.logTest('Multiline Captions', false, error.message);
      return false;
    }
  }

  /**
   * Test special characters and encoding
   */
  testSpecialCharacters() {
    const specialCharSRT = `1
00:00:10,500 --> 00:00:13,240
Café, naïve, résumé

2
00:00:15,000 --> 00:00:18,500
Chinese: 你好世界

3
00:00:20,750 --> 00:00:23,100
Symbols: ♫ ♪ → ← ↑ ↓ ★ ☆

4
00:00:25,000 --> 00:00:28,000
Math: ∞ ≠ ≤ ≥ ± × ÷`;

    try {
      const captions = jsxExportService.parseSRT(specialCharSRT);
      
      // Validate special character preservation
      assert.strictEqual(captions[0].text, 'Café, naïve, résumé', 'Accented characters not preserved');
      assert.strictEqual(captions[1].text, 'Chinese: 你好世界', 'Unicode characters not preserved');
      assert.strictEqual(captions[2].text, 'Symbols: ♫ ♪ → ← ↑ ↓ ★ ☆', 'Symbol characters not preserved');
      assert.strictEqual(captions[3].text, 'Math: ∞ ≠ ≤ ≥ ± × ÷', 'Math symbols not preserved');
      
      this.logTest('Special Characters', true);
      return true;
    } catch (error) {
      this.logTest('Special Characters', false, error.message);
      return false;
    }
  }

  /**
   * Test empty and whitespace handling
   */
  testEmptyAndWhitespace() {
    const whitespaceSRT = `1
00:00:10,500 --> 00:00:13,240
   This has leading spaces   

2
00:00:15,000 --> 00:00:18,500


3
00:00:20,750 --> 00:00:23,100
Normal caption

4
00:00:25,000 --> 00:00:28,000
	Tab characters	here	`;

    try {
      const captions = jsxExportService.parseSRT(whitespaceSRT);
      
      // Should handle whitespace appropriately
      // Empty captions should be skipped or handled gracefully
      assert(captions.length >= 2, 'Should parse non-empty captions');
      
      // Check that text is trimmed appropriately
      const firstCaption = captions.find(c => c.text.includes('leading spaces'));
      if (firstCaption) {
        assert.strictEqual(firstCaption.text.trim(), 'This has leading spaces', 'Leading/trailing spaces not handled');
      }
      
      this.logTest('Empty and Whitespace Handling', true);
      return true;
    } catch (error) {
      this.logTest('Empty and Whitespace Handling', false, error.message);
      return false;
    }
  }

  /**
   * Helper method to log test results
   */
  logTest(testName, passed, error = null) {
    if (passed) {
      console.log(`✅ ${testName}: PASSED`);
      this.results.passed++;
    } else {
      console.log(`❌ ${testName}: FAILED - ${error}`);
      this.results.failed++;
      this.results.errors.push({ test: testName, error });
    }
  }

  /**
   * Run all SRT parser tests
   */
  async runAllTests() {
    console.log('🧪 SRT Parser Test Suite');
    console.log('========================');
    
    const tests = [
      () => this.testBasicSRTParsing(),
      () => this.testSRTWithHTMLTags(),
      () => this.testEdgeCaseTiming(),
      () => this.testMalformedSRT(),
      () => this.testMultilineCaptions(),
      () => this.testSpecialCharacters(),
      () => this.testEmptyAndWhitespace()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.log(`💥 Test execution error: ${error.message}`);
        this.results.failed++;
        this.results.errors.push({ test: 'Test Execution', error: error.message });
      }
    }

    this.printResults();
    return this.results;
  }

  /**
   * Print comprehensive test results
   */
  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.errors.forEach(({ test, error }) => {
        console.log(`   ${test}: ${error}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// Export for use in other test files
module.exports = SRTParserTests;

// Run tests if called directly
if (require.main === module) {
  const testSuite = new SRTParserTests();
  testSuite.runAllTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}