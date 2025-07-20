// Simple script to test GROQ model availability
const { config } = require('dotenv');
config();

// Test different model names that might work with genkitx-groq
const testModels = [
  'llama3-8b',
  'llama3-70b',
  'llama-3-8b',
  'llama-3-70b',
  'mixtral-8x7b',
  'gemma-7b',
  'llama3-8b-8192',
  'llama3-70b-8192'
];

console.log('Testing GROQ model names...');
console.log('Available models to test:', testModels);
console.log('\nNote: You can manually test these by updating GROQ_MODEL in .env');
console.log('Current GROQ_MODEL:', process.env.GROQ_MODEL);
console.log('Current MODEL_PROVIDER:', process.env.MODEL_PROVIDER);