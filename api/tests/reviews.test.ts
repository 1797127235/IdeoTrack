import { describe, it, expect, vi } from 'vitest';
import { aiReviewReflection } from '../src/domains/reviews/reviews.service.js';

vi.mock('../src/adapters/llm/index.js', () => ({
  createLLMProvider: vi.fn(() => null),
}));

const TASK_CONTENT =
  '本次思政课主题为“新时代青年的责任担当”，要求同学们结合社会热点与个人实际，撰写学习心得。';

function createInput(reflectionContent: string, taskContent = TASK_CONTENT) {
  return { reflectionContent, taskContent };
}

describe('Reviews Service', () => {
  describe('aiReviewReflection', () => {
    it('approves reflection with at least 10 characters', async () => {
      const result = await aiReviewReflection(
        createInput('参观完展览后，我对革命先辈的牺牲精神有了更具体的理解。')
      );
      expect(result.status).toBe('ai_approved');
      expect(result.reason).toBe('AI 初审通过');
    });

    it('marks reflection shorter than 10 characters as pending manual review', async () => {
      const result = await aiReviewReflection(createInput('太短'));
      expect(result.status).toBe('pending_manual_review');
      expect(result.reason).toBe('字数不足');
    });

    it('trims whitespace before counting characters', async () => {
      const result = await aiReviewReflection(
        createInput('   参观完展览后，我对革命先辈的牺牲精神有了更具体的理解。   ')
      );
      expect(result.status).toBe('ai_approved');
    });

    it('approves reflection with exactly 10 characters', async () => {
      const result = await aiReviewReflection(createInput('一二三四五六七八九十'));
      expect(result.status).toBe('ai_approved');
    });

    it('marks reflection containing sensitive words as pending manual review', async () => {
      const result = await aiReviewReflection(createInput('这次学习让我认识到赌博的危害。'));
      expect(result.status).toBe('pending_manual_review');
      expect(result.reason).toBe('包含敏感内容');
    });

    it('marks reflection matching template as pending manual review', async () => {
      const result = await aiReviewReflection(createInput('今天的内容很有意义，让我深受启发。'));
      expect(result.status).toBe('pending_manual_review');
      expect(result.reason).toBe('内容疑似套话');
    });

    it('marks reflection with high similarity to task content as pending manual review', async () => {
      const result = await aiReviewReflection(createInput(TASK_CONTENT));
      expect(result.status).toBe('pending_manual_review');
      expect(result.reason).toBe('与任务内容重复度过高');
    });

    it('approves reflection with low similarity to task content', async () => {
      const result = await aiReviewReflection(
        createInput('周末我参加了社区志愿服务，帮助老人使用智能手机，体会到服务他人的快乐。')
      );
      expect(result.status).toBe('ai_approved');
    });

    it('returns local result when LLM is not configured', async () => {
      const result = await aiReviewReflection(createInput('参观完展览后，我对革命先辈的牺牲精神有了更具体的理解。'));
      expect(result.status).toBe('ai_approved');
    });
  });
});
