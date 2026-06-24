'use client';

const kpiCards = [
  { label: '今日打卡率', value: '92%', color: '#0891B2' },
  { label: '打卡人数', value: '3,682', color: '#22C55E' },
  { label: '心得数', value: '345', color: '#8B5CF6' },
  { label: '未打卡', value: '312', color: '#F59E0B' },
];

const collegeRates = [
  { name: '马克思主义学院', rate: 96 },
  { name: '教育学院', rate: 93 },
  { name: '经济管理学院', rate: 90 },
  { name: '计算机学院', rate: 87 },
  { name: '外国语学院', rate: 82 },
  { name: '艺术学院', rate: 78 },
];

const trendData = [
  { date: '6.18', rate: 84 },
  { date: '6.19', rate: 86 },
  { date: '6.20', rate: 85 },
  { date: '6.21', rate: 88 },
  { date: '6.22', rate: 90 },
  { date: '6.23', rate: 91 },
  { date: '6.24', rate: 92 },
];

function BarChart() {
  const maxRate = Math.max(...collegeRates.map((d) => d.rate));

  return (
    <div className='h-64 w-full'>
      <svg className='w-full h-full' viewBox='0 0 600 200'>
        {[0, 50, 100, 150].map((y) => (
          <line key={y} x1='40' y1={y} x2='580' y2={y} stroke='#E2E8F0' strokeWidth='1' />
        ))}
        {collegeRates.map((college, i) => {
          const barHeight = (college.rate / 100) * 140;
          const x = 60 + i * 88;
          const y = 150 - barHeight;
          return (
            <g key={college.name}>
              <rect
                x={x}
                y={y}
                width='48'
                height={barHeight}
                fill='#0891B2'
                rx='4'
              />
              <text
                x={x + 24}
                y={y - 8}
                textAnchor='middle'
                fill='#164E63'
                fontSize='12'
                fontWeight='500'
              >
                {college.rate}%
              </text>
              <text
                x={x + 24}
                y='175'
                textAnchor='middle'
                fill='#64748B'
                fontSize='11'
              >
                {college.name.slice(0, 4)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LineChart() {
  const maxRate = Math.max(...trendData.map((d) => d.rate));
  const minRate = Math.min(...trendData.map((d) => d.rate));
  const range = maxRate - minRate || 1;

  const points = trendData
    .map((d, i) => {
      const x = 40 + (i / (trendData.length - 1)) * 520;
      const y = 160 - ((d.rate - minRate) / range) * 120;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className='h-64 w-full'>
      <svg className='w-full h-full' viewBox='0 0 600 200'>
        {[0, 40, 80, 120, 160].map((y) => (
          <line key={y} x1='40' y1={y} x2='580' y2={y} stroke='#E2E8F0' strokeWidth='1' />
        ))}
        <polygon
          points={`40,160 ${points} 580,160`}
          fill='rgba(8, 145, 178, 0.1)'
        />
        <polyline
          points={points}
          fill='none'
          stroke='#0891B2'
          strokeWidth='3'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        {trendData.map((d, i) => {
          const x = 40 + (i / (trendData.length - 1)) * 520;
          const y = 160 - ((d.rate - minRate) / range) * 120;
          return (
            <g key={d.date}>
              <circle cx={x} cy={y} r='4' fill='#0891B2' />
              <text x={x} y='190' textAnchor='middle' fill='#64748B' fontSize='11'>
                {d.date}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ReportsPage() {
  const handleExport = () => {
    alert('演示功能，暂未接入后端');
  };

  return (
    <div className='min-h-screen'>
      <div className='mb-8 flex items-end justify-between flex-wrap gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-[#164E63]'>报表统计</h1>
          <p className='text-[#64748B] mt-2'>查看多维度数据统计和导出报表</p>
        </div>
        <div className='flex items-center gap-3'>
          <input
            type='text'
            value='2026-06-01'
            disabled
            className='px-3 py-2 text-sm text-[#64748B] bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg'
          />
          <span className='text-[#64748B]'>至</span>
          <input
            type='text'
            value='2026-06-24'
            disabled
            className='px-3 py-2 text-sm text-[#64748B] bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg'
          />
          <button
            onClick={handleExport}
            className='px-4 py-2 text-sm font-medium text-white bg-[#0891B2] rounded-lg hover:bg-[#164E63] transition-colors'
          >
            导出报表
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        {kpiCards.map((card) => (
          <div key={card.label} className='bg-white rounded-2xl p-6 shadow-sm'>
            <div className='flex items-center justify-between mb-4'>
              <span className='text-sm text-[#64748B]'>{card.label}</span>
              <span
                className='w-2 h-8 rounded-full'
                style={{ backgroundColor: card.color }}
              />
            </div>
            <span className='text-3xl font-bold text-[#164E63]'>{card.value}</span>
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <div className='bg-white rounded-2xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-[#164E63] mb-6'>各学院打卡率</h2>
          <BarChart />
        </div>

        <div className='bg-white rounded-2xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-[#164E63] mb-6'>7日打卡率趋势</h2>
          <LineChart />
        </div>
      </div>
    </div>
  );
}
