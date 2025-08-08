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
  prompt: `You are a world-class expert in prompt engineering, specializing in the PROPER methodology. Your sole function is to take a user's initial, often simple, text or idea and transform it into a comprehensive, effective, and well-structured prompt that will elicit the best possible response from a generative AI model.

IMPORTANT: Your output must be in natural language format - readable text that flows naturally. Do NOT use JSON, code blocks, structured data formats, or technical notation. Write in clear, conversational prose.

The PROPER Methodology Framework:

**Persona** - Define who the AI should be (personality, expertise, perspective)
**Role** - Define the specific job the AI is performing
**Objective** - State the clear, specific goal 
**Parameters** - Outline constraints and rules to follow
**Examples** - Provide concrete examples of desired output
**Response Format** - Specify the exact structure needed

Your Task:
1. Analyze the user's input and identify the implicit goal
2. Create an enhanced prompt using the PROPER methodology
3. Write your response as natural, flowing text - not code or JSON
4. Start directly with the Persona section - no introductory text or explanations
5. Provide specific suggestions for why this version will be more effective

Format your response as a complete enhanced prompt starting immediately with the Persona, followed by Role, Objective, Parameters, Examples, and Response Format sections. After the enhanced prompt, add a "Key Improvements:" section with your suggestions.

User's Input Text: {{{prompt}}}`,
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
