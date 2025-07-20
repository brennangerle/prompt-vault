/**
 * Test script to compare GROQ and Gemini performance and results
 * 
 * Usage:
 * 1. Set MODEL_PROVIDER=groq in .env to test GROQ
 * 2. Run: npx tsx scripts/test-ai-providers.ts
 * 3. Set MODEL_PROVIDER=gemini in .env to test Gemini
 * 4. Run: npx tsx scripts/test-ai-providers.ts again
 * 5. Compare the results and performance
 */

import { config } from 'dotenv';
config(); // Load environment variables

import { optimizePrompt } from '../src/ai/flows/optimize-prompt';
import { generatePromptMetadata } from '../src/ai/flows/generate-prompt-metadata';
import { generateWithGroq } from '../src/ai/genkit';

// Test prompts
const testPrompts = [
  "Write a blog post about artificial intelligence trends in 2025",
  "Create a marketing email for a new fitness app launch",
  "Generate 5 ideas for social media posts about sustainable fashion"
];

// Test function for prompt optimization
async function testPromptOptimization() {
  console.log(`\n=== Testing Prompt Optimization with ${process.env.MODEL_PROVIDER} ===\n`);
  
  for (const [index, prompt] of testPrompts.entries()) {
    console.log(`\nTesting prompt ${index + 1}:`);
    console.log(`Original: "${prompt.substring(0, 50)}..."`);
    
    const startTime = Date.now();
    try {
      const result = await optimizePrompt({ prompt });
      const endTime = Date.now();
      
      console.log(`Optimized (${endTime - startTime}ms):`);
      console.log(result.optimizedPrompt);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error optimizing prompt: ${error.message}`);
      } else {
        console.error('An unknown error occurred during prompt optimization');
      }
    }
  }
}

// Test function for metadata generation
async function testMetadataGeneration() {
  console.log(`\n=== Testing Metadata Generation with ${process.env.MODEL_PROVIDER} ===\n`);
  
  for (const [index, prompt] of testPrompts.entries()) {
    console.log(`\nTesting prompt ${index + 1}:`);
    console.log(`Original: "${prompt.substring(0, 50)}..."`);
    
    const startTime = Date.now();
    try {
      const result = await generatePromptMetadata({ prompt });
      const endTime = Date.now();
      
      console.log(`Metadata (${endTime - startTime}ms):`);
      console.log(`Title: ${result.title}`);
      console.log(`Tags: ${result.tags.join(', ')}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error generating metadata: ${error.message}`);
      } else {
        console.error('An unknown error occurred during metadata generation');
      }
    }
  }
}

// Test direct GROQ SDK
async function testDirectGroq() {
  console.log(`\n=== Testing Direct GROQ SDK ===\n`);
  
  try {
    const startTime = Date.now();
    const response = await generateWithGroq("Explain the importance of fast language models in one sentence.");
    const endTime = Date.now();
    
    console.log(`Direct GROQ response (${endTime - startTime}ms):`);
    console.log(response);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error with direct GROQ: ${error.message}`);
    } else {
      console.error('An unknown error occurred during direct GROQ test');
    }
  }
}

// Run the tests
async function runTests() {
  console.log(`\n=== AI Provider Test ===`);
  console.log(`Provider: ${process.env.MODEL_PROVIDER || 'Not specified (default: groq)'}`);
  console.log(`Model: ${process.env.MODEL_PROVIDER === 'gemini' ? 'googleai/gemini-2.0-flash' : process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'}`);
  
  try {
    // Test direct GROQ SDK first
    if (process.env.MODEL_PROVIDER !== 'gemini') {
      await testDirectGroq();
    }
    
    await testPromptOptimization();
    await testMetadataGeneration();
    
    console.log(`\n=== Test Completed ===\n`);
  } catch (error) {
    console.error(`\n=== Test Failed ===\n`);
    console.error(error);
  }
}

// Execute the tests
runTests().catch(console.error);