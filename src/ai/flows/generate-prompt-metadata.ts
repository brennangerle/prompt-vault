'use server';
/**
 * @fileOverview A flow to generate metadata for a prompt.
 *
 * - generatePromptMetadata - A function that generates title and tags for a given prompt.
 * - GeneratePromptMetadataInput - The input type for the generatePromptMetadata function.
 * - GeneratePromptMetadataOutput - The return type for the generatePromptMetadata function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePromptMetadataInputSchema = z.object({
  prompt: z.string().describe('The prompt content.'),
});
export type GeneratePromptMetadataInput = z.infer<typeof GeneratePromptMetadataInputSchema>;

const GeneratePromptMetadataOutputSchema = z.object({
  title: z.string().describe('A concise and descriptive title for the prompt, under 10 words.'),
  tags: z.array(z.string()).describe('A list of 1 to 3 relevant tags or categories for the prompt. For example: ["Marketing", "Copywriting"].'),
});
export type GeneratePromptMetadataOutput = z.infer<typeof GeneratePromptMetadataOutputSchema>;

export async function generatePromptMetadata(input: GeneratePromptMetadataInput): Promise<GeneratePromptMetadataOutput> {
  return generatePromptMetadataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePromptMetadataPrompt',
  input: {schema: GeneratePromptMetadataInputSchema},
  output: {schema: GeneratePromptMetadataOutputSchema},
  prompt: `You are an expert at analyzing and categorizing AI prompts.
  Based on the following prompt content, generate a concise title and a list of 1-2 relevant tags.
  The title should be short and descriptive.
  The tags should help categorize the prompt for later discovery.

  Prompt Content:
  {{{prompt}}}
  `,
});

const generatePromptMetadataFlow = ai.defineFlow(
  {
    name: 'generatePromptMetadataFlow',
    inputSchema: GeneratePromptMetadataInputSchema,
    outputSchema: GeneratePromptMetadataOutputSchema,
  },
  async input => {
    try {
      const startTime = Date.now();
      const modelProvider = process.env.MODEL_PROVIDER?.toLowerCase() || 'groq';
      
      let result: GeneratePromptMetadataOutput;
      
      if (modelProvider === 'groq') {
        // Use direct GROQ SDK
        const { generateWithGroq } = await import('@/ai/genkit');
        const promptText = `You are an expert at analyzing and categorizing AI prompts.
Based on the following prompt content, generate a concise title and a list of 1-2 relevant tags.
The title should be short and descriptive.
The tags should help categorize the prompt for later discovery.

Prompt Content:
${input.prompt}

Please respond in the following JSON format:
{
  "title": "Your title here",
  "tags": ["tag1", "tag2"]
}`;
        
        const response = await generateWithGroq(promptText);
        
        try {
          // Parse the JSON response
          const parsed = JSON.parse(response);
          result = {
            title: parsed.title || 'Untitled Prompt',
            tags: Array.isArray(parsed.tags) ? parsed.tags : ['General']
          };
        } catch (parseError) {
          // Fallback if JSON parsing fails
          result = {
            title: 'AI Generated Prompt',
            tags: ['General']
          };
        }
      } else {
        // Use Genkit for Gemini
        const {output} = await prompt(input);
        result = output!;
      }
      
      // Log performance metrics
      const endTime = Date.now();
      console.log(`Metadata generation completed in ${endTime - startTime}ms using ${modelProvider}`);
      
      return result;
    } catch (error) {
      // Import dynamically to avoid circular dependencies
      const { handleAIError } = await import('@/ai/error-handler');
      throw handleAIError(error, 'metadata generation');
    }
  }
);
