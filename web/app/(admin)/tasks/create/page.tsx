'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TaskFormData {
  title: string;
  content: string;
  guiding_questions: string[];
  source_url: string;
  video_url: string;
  scope_type: 'school' | 'college' | 'class' | 'pool';
  scope_id: string;
  published_at: string;
  deadline_at: string;
}

export default function CreateTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    content: '',
    guiding_questions: [''],
    source_url: '',
    video_url: '',
    scope_type: 'pool',
    scope_id: '',
    published_at: new Date().toISOString().slice(0, 16),
    deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const showScopeId = formData.scope_type !== 'pool';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 过滤空的思考题
      const filteredQuestions = formData.guiding_questions.filter(q => q.trim() !== '');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...formData,
          guiding_questions: filteredQuestions.length > 0 ? filteredQuestions : null,
          source_url: formData.source_url || null,
          video_url: formData.video_url || null,
          scope_id: formData.scope_type === 'pool' ? null : formData.scope_id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || '创建任务失败');
      }

      router.push('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ECFEFF] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#164E63]">创建新任务</h1>
          <p className="text-[#64748B] mt-2">创建思政学习任务并发布给学生</p>
        </div>

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
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent"
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
                      className="flex-1 px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent"
                      placeholder={`思考题 ${index + 1}`}
                    />
                    {formData.guiding_questions.length > 1 && (
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
                <button
                  type="button"
                  onClick={addQuestion}
                  className="text-[#0891B2] hover:text-[#164E63] text-sm font-medium"
                >
                  + 添加思考题
                </button>
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
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent"
                  placeholder="https://video.example.com"
                />
              </div>
            </div>
          </div>

          {/* 发布范围 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#164E63] mb-4">发布范围</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#164E63] mb-2">
                  范围类型 <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  name="scope_type"
                  value={formData.scope_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent"
                >
                  <option value="pool">任务池（供辅导员派发）</option>
                  <option value="school">全校</option>
                  <option value="college">学院</option>
                  <option value="class">班级</option>
                </select>
              </div>

              {showScopeId && (
                <div>
                  <label className="block text-sm font-medium text-[#164E63] mb-2">
                    范围 ID <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    name="scope_id"
                    value={formData.scope_id}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent"
                    placeholder="请输入学校/学院/班级 ID"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 时间设置 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#164E63] mb-4">时间设置</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#164E63] mb-2">
                  发布时间 <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="published_at"
                  value={formData.published_at}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0891B2] focus:border-transparent"
                />
              </div>

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
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#F1F5F9]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '创建中...' : '创建任务'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
