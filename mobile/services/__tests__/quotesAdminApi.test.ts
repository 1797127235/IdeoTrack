import { listQuotes, createQuote, updateQuote, deleteQuote } from '../quotesAdminApi';
import { request } from '../api';

jest.mock('../api', () => ({
  request: jest.fn(),
}));

const mockedRequest = jest.mocked(request);

describe('quotesAdminApi', () => {
  afterEach(() => {
    mockedRequest.mockReset();
  });

  const mockQuote = {
    id: 'q1',
    content: '名言',
    author: '作者',
    source: '出处',
    is_enabled: true,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('listQuotes fetches all quotes', async () => {
    mockedRequest.mockResolvedValue({ success: true, data: [mockQuote] });

    const quotes = await listQuotes();

    expect(mockedRequest).toHaveBeenCalledWith('/api/quotes');
    expect(quotes).toHaveLength(1);
    expect(quotes[0].id).toBe('q1');
  });

  it('createQuote posts input and returns quote', async () => {
    mockedRequest.mockResolvedValue({ success: true, data: mockQuote });

    const input = { content: '新名言', author: '作者', is_enabled: true };
    const quote = await createQuote(input);

    expect(mockedRequest).toHaveBeenCalledWith('/api/quotes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(quote.id).toBe('q1');
  });

  it('updateQuote puts input and returns quote', async () => {
    mockedRequest.mockResolvedValue({ success: true, data: { ...mockQuote, content: '已更新' } });

    const input = { content: '已更新', is_enabled: false };
    const quote = await updateQuote('q1', input);

    expect(mockedRequest).toHaveBeenCalledWith('/api/quotes/q1', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    expect(quote.content).toBe('已更新');
  });

  it('deleteQuote sends DELETE request', async () => {
    mockedRequest.mockResolvedValue({ success: true, data: null });

    await deleteQuote('q1');

    expect(mockedRequest).toHaveBeenCalledWith('/api/quotes/q1', { method: 'DELETE' });
  });

  it('throws when listQuotes API returns error', async () => {
    mockedRequest.mockResolvedValue({
      success: false,
      error: { code: 'ERROR', message: '加载失败' },
    });

    await expect(listQuotes()).rejects.toThrow('加载失败');
  });
});
