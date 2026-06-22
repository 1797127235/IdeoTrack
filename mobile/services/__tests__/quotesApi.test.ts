import { getDailyQuote } from '../quotesApi';
import { request } from '../api';

jest.mock('../api', () => ({
  request: jest.fn(),
}));

const mockedRequest = jest.mocked(request);

describe('quotesApi', () => {
  afterEach(() => {
    mockedRequest.mockReset();
  });

  it('fetches daily quote without date', async () => {
    mockedRequest.mockResolvedValue({
      success: true,
      data: { id: 'q1', content: '今日名言', author: '作者', source: '出处' },
    });

    const quote = await getDailyQuote();

    expect(mockedRequest).toHaveBeenCalledWith('/api/quotes/daily');
    expect(quote.id).toBe('q1');
    expect(quote.content).toBe('今日名言');
  });

  it('encodes date in query string', async () => {
    mockedRequest.mockResolvedValue({
      success: true,
      data: { id: 'q1', content: '名言', author: null, source: null },
    });

    await getDailyQuote('2024-01-01');

    expect(mockedRequest).toHaveBeenCalledWith('/api/quotes/daily?date=2024-01-01');
  });

  it('throws when API returns error', async () => {
    mockedRequest.mockResolvedValue({
      success: false,
      error: { code: 'QUOTE_NOT_FOUND', message: '获取失败' },
    });

    await expect(getDailyQuote()).rejects.toThrow('获取失败');
  });

  it('throws when response data is missing', async () => {
    mockedRequest.mockResolvedValue({ success: true });

    await expect(getDailyQuote()).rejects.toThrow('获取每日名言失败');
  });
});
