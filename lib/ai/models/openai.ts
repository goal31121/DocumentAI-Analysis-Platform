import OpenAI from 'openai';

// Note: In Next.js runtime, environment variables are automatically loaded.
// For standalone scripts, import '../../scripts/load-env' at the top of the script file.

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY environment variable is not set. OpenAI model will not be available.');
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * Generate a response using OpenAI GPT-4 Turbo
 * @param prompt - The prompt to send to the model
 * @param options - Additional options for the API call
 * @returns The model's response text
 */
export async function generateOpenAIResponse(
  prompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  } = {}
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
  }

  const { temperature = 0.7, maxTokens = 2000, model = 'gpt-4-turbo-preview' } = options;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    return response.choices[0].message?.content || '';
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('OpenAI API error: Unknown error');
  }
}

/**
 * Check if OpenAI is configured and available
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY && openai !== null;
}
