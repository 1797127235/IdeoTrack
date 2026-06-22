import { getMyTasks, getMyTaskDetail } from '../tasksApi';
import { request } from '../api';

jest.mock('../api', () => ({
  request: jest.fn(),
}));

const mockedRequest = jest.mocked(request);

describe('tasksApi', () => {
  afterEach(() => {
    mockedRequest.mockReset();
  });

  const mockTask = {
    id: 't1',
    title: '今日任务',
    content: '学习内容',
    published_at: '2024-01-01T00:00:00Z',
    deadline_at: '2024-01-02T00:00:00Z',
    status: 'in_progress' as const,
  };

  it('fetches my tasks with pagination', async () => {
    mockedRequest.mockResolvedValue({ success: true, data: [mockTask] });

    const tasks = await getMyTasks(2, 10);

    expect(mockedRequest).toHaveBeenCalledWith('/api/tasks/my?page=2&limit=10');
    expect(tasks).toHaveLength(1);
  });

  it('fetches task detail', async () => {
    mockedRequest.mockResolvedValue({ success: true, data: { ...mockTask, check_in_status: 'approved' } });

    const detail = await getMyTaskDetail('t1');

    expect(mockedRequest).toHaveBeenCalledWith('/api/tasks/my/t1');
    expect(detail.check_in_status).toBe('approved');
  });

  it('throws on error', async () => {
    mockedRequest.mockResolvedValue({ success: false, error: { code: 'ERROR', message: '加载失败' } });
    await expect(getMyTasks()).rejects.toThrow('加载失败');
  });
});
