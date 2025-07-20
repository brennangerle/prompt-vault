# GROQ Integration

This document provides information about the GROQ integration in the application.

## Overview

The application now supports GROQ as an alternative to Google's Gemini for AI operations. This integration allows for testing and comparing the performance and capabilities of both providers.

## Configuration

### Environment Variables

To use GROQ, you need to set the following environment variables in your `.env` or `.env.local` file:

```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
MODEL_PROVIDER=groq
```

To switch back to Gemini, change the `MODEL_PROVIDER` variable:

```
MODEL_PROVIDER=gemini
```

### Available GROQ Models

Some of the available GROQ models include:

- `llama-3.3-70b-versatile` - Llama 3.3 70B versatile model (recommended)
- `llama3-70b-8192` - Llama 3 70B model with 8192 context window
- `llama3-8b-8192` - Llama 3 8B model with 8192 context window
- `mixtral-8x7b-32768` - Mixtral 8x7B model with 32768 context window

For a complete and up-to-date list of available models, refer to the [GROQ documentation](https://console.groq.com/docs/models).

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Ensure your GROQ API key is correctly set in the environment variables
   - Verify that the API key is valid and active

2. **Model Availability**
   - If you encounter model-related errors, check that the specified model is available in GROQ
   - Try using a different model if the specified one is not available

3. **Rate Limiting**
   - GROQ may have different rate limits than Gemini
   - If you encounter rate limit errors, consider implementing retry logic or reducing the frequency of requests

### Switching Back to Gemini

If you encounter issues with GROQ and need to switch back to Gemini:

1. Change the `MODEL_PROVIDER` environment variable to `gemini`
2. Restart the application

## Performance Comparison

The application includes basic performance monitoring for AI operations. You can compare the performance of GROQ and Gemini by:

1. Running the application with `MODEL_PROVIDER=groq`
2. Checking the console logs for operation durations
3. Switching to `MODEL_PROVIDER=gemini`
4. Running the same operations and comparing the durations

## Implementation Details

The GROQ integration is implemented using the `genkitx-groq` package, which provides a Genkit plugin for GROQ. The integration is designed to be seamless, with the same API interface as the Gemini integration.

The main components of the integration are:

1. **Provider Selection Mechanism** - Located in `src/ai/genkit.ts`, this mechanism selects the appropriate provider based on the `MODEL_PROVIDER` environment variable.

2. **Error Handling** - Located in `src/ai/error-handler.ts`, this utility provides provider-specific error handling and performance monitoring.

3. **AI Flows** - The existing AI flows have been updated to use the error handling and performance monitoring utilities.