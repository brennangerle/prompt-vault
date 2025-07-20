/**
 * @fileOverview Error handling utilities for AI operations
 */

/**
 * Handles errors from AI operations with provider-specific error messages
 * @param error The error object
 * @param operation The operation being performed (for logging)
 * @returns A formatted error object with additional context
 */
export function handleAIError(error: any, operation: string): Error {
  console.error(`AI Error during ${operation}:`, error);
  
  // Get the current model provider
  const modelProvider = process.env.MODEL_PROVIDER?.toLowerCase() || 'groq';
  
  // Check for common error patterns
  if (error.message?.includes('API key')) {
    if (modelProvider === 'groq') {
      return new Error(`GROQ API key error: Please check your GROQ_API_KEY environment variable. ${error.message}`);
    } else {
      return new Error(`API key error: Please check your API key configuration. ${error.message}`);
    }
  }
  
  if (error.message?.includes('model')) {
    if (modelProvider === 'groq') {
      return new Error(`GROQ model error: The specified model may not be available or valid. Please check your GROQ_MODEL environment variable. ${error.message}`);
    } else {
      return new Error(`Model error: The specified model may not be available or valid. ${error.message}`);
    }
  }
  
  if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
    if (modelProvider === 'groq') {
      return new Error(`GROQ rate limit exceeded: You've reached your API usage limits. ${error.message}`);
    } else {
      return new Error(`Rate limit exceeded: You've reached your API usage limits. ${error.message}`);
    }
  }
  
  // Default error message
  return new Error(`AI operation failed (${modelProvider}): ${error.message || 'Unknown error'}`);
}

/**
 * Logs performance metrics for AI operations
 * @param operation The operation being measured
 * @param startTime The start time in milliseconds
 */
export function logPerformance(operation: string, startTime: number): void {
  const endTime = Date.now();
  const duration = endTime - startTime;
  const modelProvider = process.env.MODEL_PROVIDER?.toLowerCase() || 'groq';
  
  console.log(`AI operation '${operation}' completed in ${duration}ms using ${modelProvider}`);
}