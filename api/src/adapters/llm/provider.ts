import type { AIReviewInput, AIReviewResult } from '../../domains/reviews/reviews.types.js';

export interface LLMProvider {
  reviewReflection(input: AIReviewInput): Promise<AIReviewResult>;
}
