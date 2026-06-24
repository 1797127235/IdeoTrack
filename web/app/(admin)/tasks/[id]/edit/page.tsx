'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface TaskData {
  id: string;
  title: string;
  content: string;
  guiding_questions: string[] | null;
  source_url: string | null;
  video_url: string | null;
  scope_type: string;
  scope_id: string | null;
  source_task_id: string | null;
  published_at: string;
  deadline_at: string;
  status: string;
}

interface TaskStats {
  total: number;
  completed: number;
  rate: number;
}

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<TaskData | null>(null);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    guiding_questions: [''],
    source_url: '',
    video_url: '',
    deadline_at: '',
  });

  useEffect(() => {
    loadTask();
    loadStats();
  }, [taskId]);

  async function loadTask() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('加载任务失败');
      }

      const data = await response.json();
      const foundTask = data.data;

      setTask(foundTask);
      setFormData({
        title: foundTask.title,
        content: foundTask.content,
        guiding_questions: foundTask.guiding_questions || [''],
        source_url: foundTask.source_url || '',
        video_url: foundTask.video_url || '',
        deadline_at: foundTask.deadline_at.slice(0, 16),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载任务失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${taskId}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...formData.guiding_questions];
    newQuestions[index] = value;
    setFormData(prev => ({ ...prev, guiding_questions: newQuestions }));
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      guiding_questions: [...prev.guiding_questions, '']
    }));
  };

  const removeQuestion = (index: number) => {
    if (formData.guiding_questions.length > 1) {
      const newQuestions = formData.guiding_questions.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, guiding_questions: newQuestions }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const filteredQuestions = formData.guiding_questions.filter(q => q.trim() !== '');

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          guiding_questions: filteredQuestions.length > 0 ? filteredQuestions : null,
          source_url: formData.source_url || null,
          video_url: formData.video_url || null,
          deadline_at: new Date(formData.deadline_at).toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || '保存失败');
      }

      router.push('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelist = async () => {
    if (!confirm('确定要下架此任务吗？下架后学生将无法看到此任务。')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${taskId}/delist`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || '下架失败');
      }

      router.push('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : '下架失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECFEFF] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8 text-[#64748B]">加载中...</div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-[#ECFEFF] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8 text-[#EF4444]">{error || '任务不存在'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ECFEFF] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#164E63]">编辑任务</h1>
          <p className="text-[#64748B] mt-2">修改任务内容或下架任务</p>
        </div>

        {/* 任务统计 */}
        {stats && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-[#164E63] mb-4">任务统计</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#0891B2]">{stats.total}</div>
                <div className="text-sm text-[#64748B]">总人数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#22C55E]">{stats.completed}</div>
                <div className="text-sm text-[#64748B]">已完成</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#164E63]">{stats.rate}%</div>
                <div className="text-sm text-[#64748B]">完成率</div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-[#EF4444]/10 border border-[#EF4444] rounded-lg text-[#EF4444]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#164E63] mb-4">基本信息</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#164E63] mb-2">
                  任务标题 <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  disabled={!!task.source_task_id}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
                  placeholder="请输入任务标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#164E63] mb-2">
                  任务正文 <span className="text-[#EF4444]">*</span>
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  maxLength={2000}
                  rows={6}
                  disabled={!!task.source_task_id}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
                  placeholder="请输入任务内容"
                />
              </div>
            </div>
          </div>

          {/* 可选内容 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#164E63] mb-4">可选内容</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#164E63] mb-2">
                  思考题
                </label>
                {formData.guiding_questions.map((question, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => handleQuestionChange(index, e.target.value)}
                      disabled={!!task.source_task_id}
                      className="flex-1 px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
                      placeholder={`思考题 ${index + 1}`}
                    />
                    {formData.guiding_questions.length > 1 && !task.source_task_id && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="px-3 py-3 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg"
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
                {!task.source_task_id && (
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="text-[#0891B2] hover:text-[#164E63] text-sm font-medium"
                  >
                    + 添加思考题
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#164E63] mb-2">
                  外部链接
                </label>
                <input
                  type="url"
                  name="source_url"
                  value={formData.source_url}
                  onChange={handleChange}
                  disabled={!!task.source_task_id}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#164E63] mb-2">
                  视频 URL
                </label>
                <input
                  type="url"
                  name="video_url"
                  value={formData.video_url}
                  onChange={handleChange}
                  disabled={!!task.source_task_id}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
                  placeholder="https://video.example.com"
                />
              </div>
            </div>
          </div>

          {/* 时间设置 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#164E63] mb-4">时间设置</h2>
            
            <div>
              <label className="block text-sm font-medium text-[#164E63] mb-2">
                截止时间 <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="datetime-local"
                name="deadline_at"
                value={formData.deadline_at}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent"
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleDelist}
              className="px-6 py-3 bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626]"
            >
              下架任务
            </button>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#F1F5F9]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
