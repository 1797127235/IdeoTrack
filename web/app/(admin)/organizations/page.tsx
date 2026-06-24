'use client';

import { useState } from 'react';

type College = {
  id: string;
  name: string;
  classCount: number;
  studentCount: number;
  counselorCount: number;
  status: 'active' | 'inactive';
};

type ClassItem = {
  id: string;
  name: string;
  college: string;
  studentCount: number;
  counselor: string;
};

const colleges: College[] = [
  { id: '1', name: '马克思主义学院', classCount: 6, studentCount: 820, counselorCount: 4, status: 'active' },
  { id: '2', name: '教育学院', classCount: 8, studentCount: 1150, counselorCount: 6, status: 'active' },
  { id: '3', name: '经济管理学院', classCount: 10, studentCount: 1380, counselorCount: 7, status: 'active' },
  { id: '4', name: '计算机学院', classCount: 7, studentCount: 960, counselorCount: 5, status: 'active' },
  { id: '5', name: '外国语学院', classCount: 5, studentCount: 620, counselorCount: 3, status: 'inactive' },
];

const classes: ClassItem[] = [
  { id: 'c1', name: '2023级思想政治教育1班', college: '马克思主义学院', studentCount: 42, counselor: '王建国' },
  { id: 'c2', name: '2023级思想政治教育2班', college: '马克思主义学院', studentCount: 38, counselor: '王建国' },
  { id: 'c3', name: '2023级小学教育1班', college: '教育学院', studentCount: 45, counselor: '李秀英' },
  { id: 'c4', name: '2023级工商管理1班', college: '经济管理学院', studentCount: 50, counselor: '张志强' },
  { id: 'c5', name: '2023级计算机科学与技术1班', college: '计算机学院', studentCount: 48, counselor: '陈伟' },
  { id: 'c6', name: '2023级英语1班', college: '外国语学院', studentCount: 36, counselor: '刘敏' },
];

function StatusBadge({ status }: { status: College['status'] }) {
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

export default function OrganizationsPage() {
  const [activeTab, setActiveTab] = useState<'college' | 'class'>('college');

  const handleAddCollege = () => {
    alert('演示功能，暂未接入后端');
  };

  const handleAddClass = () => {
    alert('演示功能，暂未接入后端');
  };

  return (
    <div className='min-h-screen'>
      <div className='mb-8 flex items-end justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-[#164E63]'>组织结构</h1>
          <p className='text-[#64748B] mt-2'>管理学院、班级等组织架构</p>
        </div>
        <div className='flex gap-3'>
          <button
            onClick={handleAddCollege}
            className='px-4 py-2 text-sm font-medium text-white bg-[#0891B2] rounded-lg hover:bg-[#164E63] transition-colors'
          >
            新增学院
          </button>
          <button
            onClick={handleAddClass}
            className='px-4 py-2 text-sm font-medium text-white bg-[#0891B2] rounded-lg hover:bg-[#164E63] transition-colors'
          >
            新增班级
          </button>
        </div>
      </div>

      <div className='bg-white rounded-2xl p-6 shadow-sm'>
        <div className='flex gap-4 mb-6 border-b border-[#E2E8F0]'>
          <button
            onClick={() => setActiveTab('college')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'college'
                ? 'text-[#0891B2] border-[#0891B2]'
                : 'text-[#64748B] border-transparent hover:text-[#164E63]'
            }`}
          >
            学院列表
          </button>
          <button
            onClick={() => setActiveTab('class')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'class'
                ? 'text-[#0891B2] border-[#0891B2]'
                : 'text-[#64748B] border-transparent hover:text-[#164E63]'
            }`}
          >
            班级列表
          </button>
        </div>

        <div className='overflow-x-auto'>
          {activeTab === 'college' ? (
            <table className='w-full'>
              <thead className='bg-[#F1F5F9]'>
                <tr className='text-left text-sm text-[#64748B]'>
                  <th className='px-4 py-3 font-medium rounded-l-lg'>学院名称</th>
                  <th className='px-4 py-3 font-medium'>班级数</th>
                  <th className='px-4 py-3 font-medium'>学生数</th>
                  <th className='px-4 py-3 font-medium'>辅导员</th>
                  <th className='px-4 py-3 font-medium rounded-r-lg'>状态</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#E2E8F0]'>
                {colleges.map((college) => (
                  <tr key={college.id}>
                    <td className='px-4 py-4 text-sm text-[#164E63] font-medium'>{college.name}</td>
                    <td className='px-4 py-4 text-sm text-[#64748B]'>{college.classCount}</td>
                    <td className='px-4 py-4 text-sm text-[#64748B]'>{college.studentCount}</td>
                    <td className='px-4 py-4 text-sm text-[#64748B]'>{college.counselorCount} 人</td>
                    <td className='px-4 py-4'>
                      <StatusBadge status={college.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className='w-full'>
              <thead className='bg-[#F1F5F9]'>
                <tr className='text-left text-sm text-[#64748B]'>
                  <th className='px-4 py-3 font-medium rounded-l-lg'>班级名称</th>
                  <th className='px-4 py-3 font-medium'>所属学院</th>
                  <th className='px-4 py-3 font-medium'>学生数</th>
                  <th className='px-4 py-3 font-medium rounded-r-lg'>辅导员</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#E2E8F0]'>
                {classes.map((cls) => (
                  <tr key={cls.id}>
                    <td className='px-4 py-4 text-sm text-[#164E63] font-medium'>{cls.name}</td>
                    <td className='px-4 py-4 text-sm text-[#64748B]'>{cls.college}</td>
                    <td className='px-4 py-4 text-sm text-[#64748B]'>{cls.studentCount}</td>
                    <td className='px-4 py-4 text-sm text-[#64748B]'>{cls.counselor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
