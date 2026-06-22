import { listTasks, createTask, updateTask, delistTask } from '../tasksAdminApi';
import { request } from '../api';

jest.mock('../api', () => ({
  request: jest.fn(),
}));

const mockedRequest = jest.mocked(request);

describe('tasksAdminApi', () => {
  afterEach(() => {
    mockedRequest.mockReset();
  });

  const mockTask = {
    id: 't1',
    title: '任务',
    content: '内容',
    scope_type: 'class' as const,
    scope_label: '班级',
    target_college_id: null,
    target_class_id: 'c1',
    created_by: 'u1',
    published_at: '2024-01-01T00:00:00Z',
    deadline_at: '2024-01-02T00:00:00Z',
    status: 'published' as const,
    total_assignees: 30,
    completed_count: 10,
    completion_rate: 33.3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  it('lists tasks with filters', async () => {
    mockedRequest.mockResolvedValue({
      success: true,
      data: { items: [mockTask], total: 1, page: 1, limit: 20 },
    });

    const result = await listTasks({ status: 'published', scope_type: 'class' });

    expect(mockedRequest).toHaveBeenCalledWith('/api/tasks?status=published&scope_type=class');
    expect(result.items[0].completion_rate).toBe(33.3);
    expect(result.total).toBe(1);
  });

  it('creates a task', async () => {
    mockedRequest.mockResolvedValue({ success: true, data: mockTask });

    const input = {
      title: '新任务',
      content: '新内容',
      scope_type: 'school' as const,
      published_at: '2024-01-01T00:00:00Z',
      deadline_at: '2024-01-02T00:00:00Z',
    };
    const task = await createTask(input);

    expect(mockedRequest).toHaveBeenCalledWith('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(task.id).toBe('t1');
  });

  it('updates a task', async () => {
    mockedRequest.mockResolvedValue({ success: true, data: { ...mockTask, title: '已更新' } });

    const task = await updateTask('t1', { title: '已更新' });

    expect(mockedRequest).toHaveBeenCalledWith('/api/tasks/t1', {
      method: 'PUT',
      body: JSON.stringify({ title: '已更新' }),
    });
    expect(task.title).toBe('已更新');
  });

  it('delists a task', async () => {
    mockedRequest.mockResolvedValue({ success: true, data: { ...mockTask, status: 'delisted' } });

    const task = await delistTask('t1');

    // P1: 走独立的 PATCH /delist 端点，不再用 PUT 改 status
    expect(mockedRequest).toHaveBeenCalledWith('/api/tasks/t1/delist', {
      method: 'PATCH',
    });
    expect(task.status).toBe('delisted');
  });
});
