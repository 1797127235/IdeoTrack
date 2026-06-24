'use client';

import { useState } from 'react';

type Role = '学生' | '辅导员' | '管理员';

type User = {
  id: string;
  name: string;
  schoolId: string;
  role: Role;
  classOrCollege: string;
  status: 'active' | 'inactive';
};

const users: User[] = [
  { id: '1', name: '张晓明', schoolId: '2023010101', role: '学生', classOrCollege: '2023级思想政治教育1班', status: 'active' },
  { id: '2', name: '李雨桐', schoolId: '2023010102', role: '学生', classOrCollege: '2023级思想政治教育1班', status: 'active' },
  { id: '3', name: '王浩然', schoolId: '2023010103', role: '学生', classOrCollege: '2023级小学教育1班', status: 'active' },
  { id: '4', name: '刘思远', schoolId: '2023010104', role: '学生', classOrCollege: '2023级工商管理1班', status: 'inactive' },
  { id: '5', name: '王建国', schoolId: 'T2023001', role: '辅导员', classOrCollege: '马克思主义学院', status: 'active' },
  { id: '6', name: '李秀英', schoolId: 'T2023002', role: '辅导员', classOrCollege: '教育学院', status: 'active' },
  { id: '7', name: '张志强', schoolId: 'T2023003', role: '辅导员', classOrCollege: '经济管理学院', status: 'active' },
  { id: '8', name: '陈管理员', schoolId: 'A2023001', role: '管理员', classOrCollege: '系统管理部', status: 'active' },
];

const roleFilters: Array<'全部' | Role> = ['全部', '学生', '辅导员', '管理员'];

function RoleBadge({ role }: { role: Role }) {
  const colors = {
    学生: 'bg-[#DBEAFE] text-[#1E40AF]',
    辅导员: 'bg-[#D1FAE5] text-[#065F46]',
    管理员: 'bg-[#FEF3C7] text-[#92400E]',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role]}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: User['status'] }) {
  const isActive = status === 'active';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#F1F5F9] text-[#64748B]'
      }`}
    >
      {isActive ? '启用中' : '已停用'}
    </span>
  );
}

export default function UsersPage() {
  const [activeFilter, setActiveFilter] = useState<'全部' | Role>('全部');

  const filteredUsers = activeFilter === '全部' ? users : users.filter((user) => user.role === activeFilter);

  const handleAddUser = () => {
    alert('演示功能，暂未接入后端');
  };

  return (
    <div className='min-h-screen'>
      <div className='mb-8 flex items-end justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-[#164E63]'>用户管理</h1>
          <p className='text-[#64748B] mt-2'>管理学生、辅导员和管理员账号</p>
        </div>
        <button
          onClick={handleAddUser}
          className='px-4 py-2 text-sm font-medium text-white bg-[#0891B2] rounded-lg hover:bg-[#164E63] transition-colors'
        >
          新增用户
        </button>
      </div>

      <div className='bg-white rounded-2xl p-6 shadow-sm'>
        <div className='flex flex-wrap gap-3 mb-6'>
          {roleFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeFilter === filter
                  ? 'bg-[#0891B2] text-white'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#164E63]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-[#F1F5F9]'>
              <tr className='text-left text-sm text-[#64748B]'>
                <th className='px-4 py-3 font-medium rounded-l-lg'>姓名</th>
                <th className='px-4 py-3 font-medium'>学工号</th>
                <th className='px-4 py-3 font-medium'>角色</th>
                <th className='px-4 py-3 font-medium'>班级/学院</th>
                <th className='px-4 py-3 font-medium rounded-r-lg'>状态</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#E2E8F0]'>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className='px-4 py-4 text-sm text-[#164E63] font-medium'>{user.name}</td>
                  <td className='px-4 py-4 text-sm text-[#64748B]'>{user.schoolId}</td>
                  <td className='px-4 py-4'>
                    <RoleBadge role={user.role} />
                  </td>
                  <td className='px-4 py-4 text-sm text-[#64748B]'>{user.classOrCollege}</td>
                  <td className='px-4 py-4'>
                    <StatusBadge status={user.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
