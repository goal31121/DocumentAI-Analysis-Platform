import Anthropic from '@anthropic-ai/sdk';

// Note: In Next.js runtime, environment variables are automatically loaded.
// For standalone scripts, import '../../scripts/load-env' at the top of the script file.

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('ANTHROPIC_API_KEY environment variable is not set. Anthropic Claude model will not be available.');
}

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  : null;

/**
 * Generate a response using Anthropic Claude 3.5 Sonnet
 * @param prompt - The prompt to send to the model
 * @param options - Additional options for the API call
 * @returns The model's response text
 */
export async function generateAnthropicResponse(
  prompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  } = {}
): Promise<string> {
  if (!anthropic) {
    throw new Error('Anthropic API key is not configured. Please set ANTHROPIC_API_KEY environment variable.');
  }

  const { temperature = 0.7, maxTokens = 2000, model = 'claude-3-5-sonnet-20241022' } = options;

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    if (!message.content || message.content.length === 0) {
      throw new Error('No response from Anthropic API');
    }

    // Extract text from content blocks
    const textBlocks = message.content.filter((block) => block.type === 'text');
    if (textBlocks.length === 0) {
      throw new Error('No text content in Anthropic API response');
    }

    return (textBlocks[0] as Anthropic.TextBlock).text;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
    throw new Error('Anthropic API error: Unknown error');
  }
}

/**
 * Check if Anthropic is configured and available
 */
export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY && anthropic !== null;
}
