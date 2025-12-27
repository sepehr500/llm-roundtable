import { streamText, generateText, Output, jsonSchema } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Create OpenRouter provider
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
});

/**
 * Stream LLM response from OpenRouter
 * @param model - Model identifier (e.g., "openai/gpt-4-turbo")
 * @param systemPrompt - System prompt for the LLM
 * @param userPrompt - User prompt for the LLM
 * @param onChunk - Callback for each text chunk
 * @param onComplete - Callback when streaming is complete
 */
export async function streamLLMResponse(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void
): Promise<void> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`[LLM] Calling ${model} with extended thinking enabled...`);

      // Enable extended thinking for supported models
      // For OpenRouter, we use experimental_providerMetadata to pass thinking parameters
      const result = await streamText({
        model: openrouter(model),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
        experimental_providerMetadata: {
          openrouter: {
            reasoning: {
              effort: 'medium'  // Enable reasoning with medium effort
            }
          }
        }
        // maxTokens: 2000,
      });

      // Stream chunks as they arrive
      for await (const chunk of result.textStream) {
        onChunk(chunk);
      }

      // Call completion callback
      onComplete();
      return; // Success, exit
    } catch (error: any) {
      console.error('Error streaming LLM response:', error);

      // Check if it's a rate limit error (429)
      if (error?.statusCode === 429 && retryCount < maxRetries - 1) {
        retryCount++;
        const waitTime = Math.pow(2, retryCount) * 5000; // Exponential backoff: 5s, 10s, 20s
        console.log(`Rate limit hit. Retrying in ${waitTime / 1000}s... (attempt ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw error;
    }
  }
}

/**
 * Get a complete LLM response (non-streaming)
 * Useful for position generation where we don't need word-by-word streaming
 */
export async function getLLMResponse(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  let fullResponse = '';

  await streamLLMResponse(
    model,
    systemPrompt,
    userPrompt,
    (chunk) => {
      fullResponse += chunk;
    },
    () => {}
  );

  return fullResponse;
}

/**
 * Get structured LLM response with enforced JSON schema
 * @param model - Model identifier
 * @param systemPrompt - System prompt for the LLM
 * @param userPrompt - User prompt for the LLM
 * @param schema - Typed JSON schema created with jsonSchema helper
 * @returns Parsed output object with type safety
 */
export async function getStructuredLLMResponse<T>(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  schema: ReturnType<typeof jsonSchema<T>>
): Promise<T> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`[LLM] Calling ${model} with structured output...`);

      const result = await generateText({
        model: openrouter(model),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
        output: Output.object({
          schema: schema,
        }),
        experimental_providerMetadata: {
          openrouter: {
            reasoning: {
              effort: 'medium'
            }
          }
        }
      });

      return result.output as T;
    } catch (error: any) {
      console.error('Error getting structured LLM response:', error);

      // Check if it's a rate limit error (429)
      if (error?.statusCode === 429 && retryCount < maxRetries - 1) {
        retryCount++;
        const waitTime = Math.pow(2, retryCount) * 5000;
        console.log(`Rate limit hit. Retrying in ${waitTime / 1000}s... (attempt ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    // Filter and sort models if needed, for now just returning IDs
    // OpenRouter returns data: { data: [{ id: '...', name: '...', ... }] }
    return (data as any).data
      .map((model: any) => model.id)
      .sort();
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    // Fallback list
    return [
      'google/gemini-2.0-flash-exp:free',
      'google/gemini-2.0-flash-thinking-exp:free',
      'openai/gpt-3.5-turbo',
      'openai/gpt-4-turbo',
      'anthropic/claude-3.5-sonnet',
    ];
  }
}
