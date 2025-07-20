import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import Groq from 'groq-sdk';

// Get the model provider from environment variables, default to GROQ for testing
const MODEL_PROVIDER = process.env.MODEL_PROVIDER?.toLowerCase() || 'groq';

// Lazy initialization of GROQ client
let groqClient: Groq | null = null;

const getGroqClient = () => {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is required when using GROQ provider');
    }
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groqClient;
};

/**
 * Get the appropriate plugin and model based on the configured provider
 */
const getProviderConfig = () => {
  switch (MODEL_PROVIDER) {
    case 'gemini':
      return {
        plugin: googleAI(),
        model: 'googleai/gemini-2.0-flash',
      };
    case 'groq':
    default:
      // For GROQ, we'll use a custom implementation
      return {
        plugin: googleAI(), // We'll override this with custom functions
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      };
  }
};

const {plugin, model} = getProviderConfig();

// Create the Genkit AI instance
export const ai = genkit({
  plugins: MODEL_PROVIDER === 'groq' ? [] : [plugin],
  model: MODEL_PROVIDER === 'groq' ? undefined : model,
});

// Custom GROQ functions
export async function generateWithGroq(prompt: string): Promise<string> {
  const client = getGroqClient();
  const chatCompletion = await client.chat.completions.create({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  });

  return chatCompletion.choices[0]?.message?.content || '';
}

export { getGroqClient };
