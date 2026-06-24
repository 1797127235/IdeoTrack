'use client';

import { useState } from 'react';

interface Quote {
  id: string;
  content: string;
  source: string;
  displayOrder: number;
  isEnabled: boolean;
}

const mockQuotes: Quote[] = [
  { id: '1', content: '青年有理想，国家有力量。', source: '人民日报', displayOrder: 1, isEnabled: true },
  { id: '2', content: '功崇惟志，业广惟勤。', source: '尚书', displayOrder: 2, isEnabled: true },
  { id: '3', content: '空谈误国，实干兴邦。', source: '尚书', displayOrder: 3, isEnabled: false },
  { id: '4', content: '苟利国家生死以，岂因祸福避趋之。', source: '林则徐', displayOrder: 4, isEnabled: true },
  { id: '5', content: '为中华之崛起而读书。', source: '周恩来', displayOrder: 5, isEnabled: true },
];

export default function QuotesPage() {
  const [quotes] = useState<Quote[]>(mockQuotes);

  const handleAdd = () => {
    alert('演示功能：新增名言暂未接入后端');
  };

  const handleToggle = (id: string) => {
    alert(`演示功能：切换名言 ${id} 状态暂未接入后端`);
  };

  return (
    <div className='min-h-screen'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-[#164E63]'>名言管理</h1>
          <p className='text-[#64748B] mt-2'>管理每日名言库和展示配置</p>
        </div>
        <button
          onClick={handleAdd}
          className='px-4 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0E7490] transition-colors'
        >
          新增名言
        </button>
      </div>
      <div className='bg-white rounded-2xl shadow-sm overflow-hidden'>
        <table className='w-full text-sm text-left'>
          <thead className='bg-[#F1F5F9] text-[#64748B]'>
            <tr>
              <th className='px-6 py-4 font-medium'>排序</th>
              <th className='px-6 py-4 font-medium'>名言内容</th>
              <th className='px-6 py-4 font-medium'>作者/来源</th>
              <th className='px-6 py-4 font-medium'>状态</th>
              <th className='px-6 py-4 font-medium text-right'>操作</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-[#E2E8F0]'>
            {quotes.map((quote) => (
              <tr key={quote.id} className='hover:bg-[#F8FAFC]'>
                <td className='px-6 py-4 text-[#164E63] font-medium'>{quote.displayOrder}</td>
                <td className='px-6 py-4 text-[#334155] max-w-md truncate'>{quote.content}</td>
                <td className='px-6 py-4 text-[#64748B]'>{quote.source}</td>
                <td className='px-6 py-4'>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      quote.isEnabled
                        ? 'bg-[#DCFCE7] text-[#166534]'
                        : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}
                  >
                    {quote.isEnabled ? '已启用' : '已停用'}
                  </span>
                </td>
                <td className='px-6 py-4 text-right'>
                  <button
                    onClick={() => handleToggle(quote.id)}
                    className='text-[#0891B2] hover:text-[#0E7490] font-medium'
                  >
                    {quote.isEnabled ? '停用' : '启用'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
