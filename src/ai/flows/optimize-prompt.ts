// src/ai/flows/optimize-prompt.ts
'use server';
/**
 * @fileOverview A prompt optimization AI agent.
 *
 * - optimizePrompt - A function that handles the prompt optimization process.
 * - OptimizePromptInput - The input type for the optimizePrompt function.
 * - OptimizePromptOutput - The return type for the optimizePrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizePromptInputSchema = z.object({
  prompt: z.string().describe('The prompt to be optimized.'),
});
export type OptimizePromptInput = z.infer<typeof OptimizePromptInputSchema>;

const OptimizePromptOutputSchema = z.object({
  optimizedPrompt: z.string().describe('The optimized prompt, formatted and structured according to the AUTOMA-T framework.'),
});
export type OptimizePromptOutput = z.infer<typeof OptimizePromptOutputSchema>;

export async function optimizePrompt(input: OptimizePromptInput): Promise<OptimizePromptOutput> {
  return optimizePromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizePromptPrompt',
  input: {schema: OptimizePromptInputSchema},
  output: {schema: OptimizePromptOutputSchema},
  prompt: `You are an AI prompt optimizer. Your goal is to improve the effectiveness of prompts by restructuring them according to the AUTOMA-T framework.

Analyze the user's prompt and rewrite it to fit the following structure. Format the output in markdown:

**Act as a...**

**User Persona & Audience**

**Targeted Action**

**Output Definition**

**Mode / Tonality / Style**

**Atypical Cases**

**Topic Whitelisting**

Original Prompt: {{{prompt}}}`,
});

const optimizePromptFlow = ai.defineFlow(
  {
    name: 'optimizePromptFlow',
    inputSchema: OptimizePromptInputSchema,
    outputSchema: OptimizePromptOutputSchema,
  },
  async input => {
    try {
      const startTime = Date.now();
      const modelProvider = process.env.MODEL_PROVIDER?.toLowerCase() || 'groq';
      
      let optimizedPrompt: string;
      
      if (modelProvider === 'groq') {
        // Use direct GROQ SDK
        const { generateWithGroq } = await import('@/ai/genkit');
        const promptText = `You are an AI prompt optimizer. Your goal is to improve the effectiveness of prompts by restructuring them according to the AUTOMA-T framework.

Analyze the user's prompt and rewrite it to fit the following structure. Format the output in markdown:

**Act as a...**

**User Persona & Audience**

**Targeted Action**

**Output Definition**

**Mode / Tonality / Style**

**Atypical Cases**

**Topic Whitelisting**

Original Prompt: ${input.prompt}`;
        
        optimizedPrompt = await generateWithGroq(promptText);
      } else {
        // Use Genkit for Gemini
        const {output} = await prompt(input);
        optimizedPrompt = output!.optimizedPrompt;
      }
      
      // Log performance metrics
      const endTime = Date.now();
      console.log(`Prompt optimization completed in ${endTime - startTime}ms using ${modelProvider}`);
      
      return { optimizedPrompt };
    } catch (error) {
      // Import dynamically to avoid circular dependencies
      const { handleAIError } = await import('@/ai/error-handler');
      throw handleAIError(error, 'prompt optimization');
    }
  }
);
