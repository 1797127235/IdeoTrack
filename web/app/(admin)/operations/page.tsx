'use client';

import { useState } from 'react';

type StatusType = 'normal' | 'warning' | 'running';

type StatusCard = {
  name: string;
  status: StatusType;
  detail: string;
};

const statusCards: StatusCard[] = [
  { name: 'API 服务', status: 'normal', detail: '响应时间 24ms' },
  { name: '数据库', status: 'normal', detail: '连接数 12/100' },
  { name: '微信服务', status: 'normal', detail: '消息队列正常' },
  { name: '定时任务', status: 'running', detail: '最近执行 2 分钟前' },
];

type LogLevel = 'info' | 'warning' | 'error';

const systemLogs: Array<{ id: string; time: string; level: LogLevel; message: string }> = [
  { id: '1', time: '2026-06-24 09:23:12', level: 'info', message: '每日打卡统计任务执行完成' },
  { id: '2', time: '2026-06-24 09:15:00', level: 'info', message: '系统备份完成，耗时 45s' },
  { id: '3', time: '2026-06-24 08:42:31', level: 'warning', message: '微信 access_token 即将过期，已自动刷新' },
  { id: '4', time: '2026-06-24 07:00:00', level: 'info', message: '定时任务「每日名言推送」开始执行' },
  { id: '5', time: '2026-06-23 23:59:58', level: 'info', message: '日终结算完成' },
  { id: '6', time: '2026-06-23 18:12:05', level: 'error', message: '数据库连接池短暂超时，已自动恢复' },
];

const statusConfig = {
  normal: { label: '正常', dot: 'bg-[#22C55E]', bg: 'bg-[#D1FAE5]' },
  warning: { label: '警告', dot: 'bg-[#F59E0B]', bg: 'bg-[#FEF3C7]' },
  running: { label: '运行中', dot: 'bg-[#0891B2]', bg: 'bg-[#CFFAFE]' },
};

const levelConfig: Record<LogLevel, { label: string; className: string }> = {
  info: { label: 'INFO', className: 'bg-[#DBEAFE] text-[#1E40AF]' },
  warning: { label: 'WARN', className: 'bg-[#FEF3C7] text-[#92400E]' },
  error: { label: 'ERROR', className: 'bg-[#FEE2E2] text-[#991B1B]' },
};

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className='flex items-center justify-between py-3'>
      <span className='text-sm text-[#164E63] font-medium'>{label}</span>
      <button
        type='button'
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-[#0891B2]' : 'bg-[#CBD5E1]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function OperationsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newUserRegistration, setNewUserRegistration] = useState(true);

  const handleClearCache = () => {
    alert('演示功能，暂未接入后端');
  };

  return (
    <div className='min-h-screen'>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold text-[#164E63]'>运维管理</h1>
        <p className='text-[#64748B] mt-2'>系统配置、日志和运维管理</p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        {statusCards.map((card) => {
          const config = statusConfig[card.status];
          return (
            <div key={card.name} className='bg-white rounded-2xl p-6 shadow-sm'>
              <div className='flex items-center justify-between mb-4'>
                <span className='text-sm text-[#64748B]'>{card.name}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
              </div>
              <div className='flex items-center gap-2'>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} text-[#164E63]`}>
                  {config.label}
                </span>
                <span className='text-sm text-[#64748B]'>{card.detail}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-[#164E63] mb-6'>最近系统日志</h2>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-[#F1F5F9]'>
                <tr className='text-left text-sm text-[#64748B]'>
                  <th className='px-4 py-3 font-medium rounded-l-lg'>时间</th>
                  <th className='px-4 py-3 font-medium'>级别</th>
                  <th className='px-4 py-3 font-medium rounded-r-lg'>消息</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#E2E8F0]'>
                {systemLogs.map((log) => (
                  <tr key={log.id}>
                    <td className='px-4 py-4 text-sm text-[#64748B] whitespace-nowrap'>{log.time}</td>
                    <td className='px-4 py-4'>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${levelConfig[log.level].className}`}>
                        {levelConfig[log.level].label}
                      </span>
                    </td>
                    <td className='px-4 py-4 text-sm text-[#164E63]'>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className='space-y-6'>
          <div className='bg-white rounded-2xl p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-[#164E63] mb-4'>系统开关</h2>
            <Toggle
              label='维护模式'
              checked={maintenanceMode}
              onChange={setMaintenanceMode}
            />
            <div className='border-t border-[#E2E8F0]' />
            <Toggle
              label='新用户注册'
              checked={newUserRegistration}
              onChange={setNewUserRegistration}
            />
          </div>

          <div className='bg-white rounded-2xl p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-[#164E63] mb-4'>缓存管理</h2>
            <p className='text-sm text-[#64748B] mb-4'>清理系统缓存数据，不会影响业务数据。</p>
            <button
              onClick={handleClearCache}
              className='w-full px-4 py-2 text-sm font-medium text-white bg-[#0891B2] rounded-lg hover:bg-[#164E63] transition-colors'
            >
              清理缓存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
