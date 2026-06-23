import { DeepSeekAdapter } from './deepseek.adapter.js';
import type { LLMProvider } from './provider.js';

export * from './provider.js';
export * from './deepseek.adapter.js';

export function createLLMProvider(): LLMProvider | null {
  if (process.env.DEEPSEEK_API_KEY) {
    return new DeepSeekAdapter();
  }
  return null;
}
