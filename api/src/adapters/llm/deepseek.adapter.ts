import type { LLMProvider } from './provider.js';
import type { AIReviewInput, AIReviewResult } from '../../domains/reviews/reviews.types.js';

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

export class DeepSeekAdapter implements LLMProvider {
  async reviewReflection(input: AIReviewInput): Promise<AIReviewResult> {
    if (!API_KEY) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }

    const systemPrompt = `你是一名严格但友善的思政学习心得审核助手。请判断学生提交的心得是否敷衍、是否与任务原文过度重复、是否包含不当内容。只返回 JSON，格式：{"status":"ai_approved"|"pending_manual_review","reason":"string|null"}。`;
    const userPrompt = `任务内容："""${input.taskContent}"""\n学生心得："""${input.reflectionContent}"""`;

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 128,
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as AIReviewResult;
    return {
      status: parsed.status === 'pending_manual_review' ? 'pending_manual_review' : 'ai_approved',
      reason: parsed.reason ?? undefined,
    };
  }
}
