import { generateOpenAIResponse, isOpenAIConfigured } from './models/openai';
import { generateAnthropicResponse, isAnthropicConfigured } from './models/anthropic';
import { generateGeminiResponse, isGeminiConfigured } from './models/gemini';

/**
 * Available AI models
 */
export type AIModel = 'openai' | 'anthropic' | 'gemini';

/**
 * Model selection strategy
 */
export type ModelStrategy = 'fallback' | 'openai' | 'anthropic' | 'gemini';

/**
 * Model response result
 */
export interface ModelResponse {
  text: string;
  model: AIModel;
  error?: Error;
}

/**
 * Options for model selection and generation
 */
export interface ModelOptions {
  strategy?: ModelStrategy;
  preferredModel?: AIModel;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Get available models based on API key configuration
 * @returns Array of available model names
 */
export function getAvailableModels(): AIModel[] {
  const available: AIModel[] = [];
  if (isOpenAIConfigured()) available.push('openai');
  if (isAnthropicConfigured()) available.push('anthropic');
  if (isGeminiConfigured()) available.push('gemini');
  return available;
}

/**
 * Generate response using intelligent model selection with fallback
 * @param prompt - The prompt to send to the models
 * @param options - Model selection and generation options
 * @returns The model's response with metadata
 */
export async function generateResponse(prompt: string, options: ModelOptions = {}): Promise<ModelResponse> {
  const { strategy = 'fallback', preferredModel, temperature = 0.7, maxTokens = 2000 } = options;

  // If a specific model is requested, try only that model
  if (preferredModel) {
    return generateWithModel(prompt, preferredModel, { temperature, maxTokens });
  }

  // Use fallback strategy: try models in order of preference
  if (strategy === 'fallback') {
    const fallbackOrder: AIModel[] = ['openai', 'anthropic', 'gemini'];

    for (const model of fallbackOrder) {
      if (!isModelAvailable(model)) continue;

      try {
        return await generateWithModel(prompt, model, { temperature, maxTokens });
      } catch (error) {
        // Continue to next model if this one fails
        console.warn(`Model ${model} failed, trying next model...`, error);
        continue;
      }
    }

    throw new Error('All available models failed to generate a response');
  }

  // Use specific model strategy
  return generateWithModel(prompt, strategy as AIModel, { temperature, maxTokens });
}

/**
 * Generate response with a specific model
 * @param prompt - The prompt to send
 * @param model - The model to use
 * @param options - Generation options
 * @returns The model's response
 */
async function generateWithModel(
  prompt: string,
  model: AIModel,
  options: { temperature?: number; maxTokens?: number }
): Promise<ModelResponse> {
  if (!isModelAvailable(model)) {
    throw new Error(`Model ${model} is not configured or available`);
  }

  try {
    let text: string;

    switch (model) {
      case 'openai':
        text = await generateOpenAIResponse(prompt, options);
        break;
      case 'anthropic':
        text = await generateAnthropicResponse(prompt, options);
        break;
      case 'gemini':
        text = await generateGeminiResponse(prompt, {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
        });
        break;
      default:
        throw new Error(`Unknown model: ${model}`);
    }

    return {
      text,
      model,
    };
  } catch (error) {
    return {
      text: '',
      model,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Check if a specific model is available
 * @param model - The model to check
 * @returns True if the model is configured and available
 */
function isModelAvailable(model: AIModel): boolean {
  switch (model) {
    case 'openai':
      return isOpenAIConfigured();
    case 'anthropic':
      return isAnthropicConfigured();
    case 'gemini':
      return isGeminiConfigured();
    default:
      return false;
  }
}
