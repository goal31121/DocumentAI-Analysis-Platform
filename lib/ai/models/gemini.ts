import { GoogleGenerativeAI } from '@google/generative-ai';

// Note: In Next.js runtime, environment variables are automatically loaded.
// For standalone scripts, import '../../scripts/load-env' at the top of the script file.

if (!process.env.GOOGLE_AI_API_KEY) {
  console.warn('GOOGLE_AI_API_KEY environment variable is not set. Google Gemini model will not be available.');
}

const genAI = process.env.GOOGLE_AI_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY) : null;

/**
 * Generate a response using Google Gemini Pro
 * @param prompt - The prompt to send to the model
 * @param options - Additional options for the API call
 * @returns The model's response text
 */
export async function generateGeminiResponse(
  prompt: string,
  options: {
    temperature?: number;
    maxOutputTokens?: number;
    model?: string;
  } = {}
): Promise<string> {
  if (!genAI) {
    throw new Error('Google AI API key is not configured. Please set GOOGLE_AI_API_KEY environment variable.');
  }

  const { temperature = 0.7, maxOutputTokens = 2000, model = 'gemini-pro' } = options;

  try {
    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    });

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('No response from Google Gemini API');
    }

    return text;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Google Gemini API error: ${error.message}`);
    }
    throw new Error('Google Gemini API error: Unknown error');
  }
}

/**
 * Check if Google Gemini is configured and available
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GOOGLE_AI_API_KEY && genAI !== null;
}
