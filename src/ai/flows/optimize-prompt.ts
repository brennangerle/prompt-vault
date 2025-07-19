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
  optimizedPrompt: z.string().describe('The optimized prompt with suggestions on length and vocabulary.'),
  suggestions: z.array(z.string()).describe('Specific suggestions for improving the prompt.'),
});
export type OptimizePromptOutput = z.infer<typeof OptimizePromptOutputSchema>;

export async function optimizePrompt(input: OptimizePromptInput): Promise<OptimizePromptOutput> {
  return optimizePromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizePromptPrompt',
  input: {schema: OptimizePromptInputSchema},
  output: {schema: OptimizePromptOutputSchema},
  prompt: `You are an AI prompt optimizer. Your goal is to improve the effectiveness of prompts by suggesting improvements to their length and vocabulary.

  Provide an optimized version of the prompt and a list of specific suggestions for improvement.

  Original Prompt: {{{prompt}}}`,
});

const optimizePromptFlow = ai.defineFlow(
  {
    name: 'optimizePromptFlow',
    inputSchema: OptimizePromptInputSchema,
    outputSchema: OptimizePromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
