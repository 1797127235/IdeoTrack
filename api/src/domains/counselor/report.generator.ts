import puppeteer from 'puppeteer-core';
import ExcelJS from 'exceljs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { AppError } from '../../middleware/error-handler.js';
import { logger } from '../../lib/logger.js';
import type { DashboardReportData } from './counselor.types.js';

const PAGE_MARGIN = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' };

const COMMON_CHROMIUM_PATHS = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
];

function getWindowsBrowserPaths(): string[] {
  const bases = [
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)'],
    process.env.LOCALAPPDATA,
  ].filter(Boolean) as string[];

  const candidates: string[] = [];
  for (const base of bases) {
    candidates.push(
      path.join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe')
    );
  }
  return candidates;
}

function resolveExecutablePath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidates =
    process.platform === 'win32' ? getWindowsBrowserPaths() : COMMON_CHROMIUM_PATHS;

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return '';
}

function escapeHtml(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRate(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function buildReportHtml(data: DashboardReportData): string {
  const { meta, overview, classStats, taskStats, highRiskStudents, studentDetails } = data;

  const classRows = classStats
    .map(
      (row) => `
    <tr>
      <td>${escapeHtml(row.rank)}</td>
      <td>${escapeHtml(row.className)}</td>
      <td>${escapeHtml(row.collegeName)}</td>
      <td>${escapeHtml(row.studentCount)}</td>
      <td>${escapeHtml(row.checkedCount)}</td>
      <td>${escapeHtml(row.incompleteCount)}</td>
      <td>${escapeHtml(row.pendingReviewCount)}</td>
      <td><strong>${formatRate(row.completionRate)}</strong></td>
    </tr>
  `
    )
    .join('');

  const taskRows = taskStats
    .map(
      (row) => `
    <tr>
      <td>${escapeHtml(row.title)}</td>
      <td>${escapeHtml(row.scope)}</td>
      <td>${escapeHtml(row.deadline).split(' ')[0]}</td>
      <td>${escapeHtml(row.totalStudents)}</td>
      <td>${escapeHtml(row.checkedCount)}</td>
      <td>${escapeHtml(row.incompleteCount)}</td>
      <td>${escapeHtml(row.pendingReviewCount)}</td>
      <td><strong>${formatRate(row.completionRate)}</strong></td>
    </tr>
  `
    )
    .join('');

  const riskRows = highRiskStudents
    .map(
      (row) => `
    <tr>
      <td>${escapeHtml(row.studentName)}</td>
      <td>${escapeHtml(row.studentSchoolId)}</td>
      <td>${escapeHtml(row.className)}</td>
      <td>${escapeHtml(row.absentCount)} / ${escapeHtml(row.totalTasks)}</td>
      <td>${formatRate(row.absentRate)}</td>
    </tr>
  `
    )
    .join('');

  const detailRows = studentDetails
    .map(
      (row) => `
    <tr>
      <td>${escapeHtml(row.studentName)}</td>
      <td>${escapeHtml(row.studentSchoolId)}</td>
      <td>${escapeHtml(row.className)}</td>
      <td>${escapeHtml(row.completedCount)} / ${escapeHtml(row.totalTasks)}</td>
      <td>${escapeHtml(row.incompleteCount)}</td>
      <td>${escapeHtml(row.reviewCount)}</td>
      <td>${formatRate(row.completionRate)}</td>
    </tr>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(meta.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif;
      color: #1f2937;
      font-size: 13px;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .cover {
      page-break-after: always;
      text-align: center;
      padding-top: 160px;
    }
    .cover .label {
      display: inline-block;
      background: #16a65a;
      color: #fff;
      padding: 6px 16px;
      border-radius: 100px;
      font-size: 14px;
      margin-bottom: 28px;
    }
    .cover h1 {
      font-size: 32px;
      color: #111827;
      margin: 0 0 40px 0;
      letter-spacing: 2px;
    }
    .cover .meta-line {
      font-size: 15px;
      color: #4b5563;
      margin: 10px 0;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 17px;
      font-weight: bold;
      color: #111827;
      border-left: 4px solid #16a65a;
      padding-left: 10px;
      margin: 24px 0 16px 0;
    }
    .overview-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 8px;
    }
    .overview-card {
      flex: 1 1 calc(33% - 12px);
      min-width: 140px;
      background: #f6fdf9;
      border: 1px solid #d1fae5;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .overview-card .num {
      font-size: 24px;
      font-weight: bold;
      color: #16a65a;
    }
    .overview-card .label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
      color: #374151;
    }
    tr:nth-child(even) { background: #fafafa; }
    .text-center { text-align: center; }
    .muted { color: #6b7280; font-size: 11px; }
    .footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="label">IdeoTrack 数据报告</div>
    <h1>${escapeHtml(meta.title)}</h1>
    <div class="meta-line"><strong>范围：</strong>${escapeHtml(meta.scopeLabel)}</div>
    <div class="meta-line"><strong>周期：</strong>${escapeHtml(meta.startDate)} ~ ${escapeHtml(meta.endDate)}</div>
    <div class="meta-line"><strong>导出人：</strong>${escapeHtml(meta.counselorName)}</div>
    <div class="meta-line"><strong>导出时间：</strong>${formatDateTime(meta.exportedAt)}</div>
  </div>

  <div class="section">
    <div class="section-title">核心概览</div>
    <div class="overview-grid">
      <div class="overview-card">
        <div class="num">${overview.managedClassCount}</div>
        <div class="label">管理班级数</div>
      </div>
      <div class="overview-card">
        <div class="num">${overview.totalStudents}</div>
        <div class="label">学生总数</div>
      </div>
      <div class="overview-card">
        <div class="num">${overview.totalTasks}</div>
        <div class="label">任务总数</div>
      </div>
      <div class="overview-card">
        <div class="num">${formatRate(overview.avgCompletionRate)}</div>
        <div class="label">平均完成率</div>
      </div>
      <div class="overview-card">
        <div class="num">${overview.pendingReviewCount}</div>
        <div class="label">待复核数量</div>
      </div>
      <div class="overview-card">
        <div class="num">${overview.incompleteStudentCount}</div>
        <div class="label">未完成人次</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">班级完成情况</div>
    <table>
      <thead>
        <tr>
          <th>排名</th>
          <th>班级</th>
          <th>学院</th>
          <th>学生数</th>
          <th>已完成</th>
          <th>未完成</th>
          <th>待复核</th>
          <th>完成率</th>
        </tr>
      </thead>
      <tbody>
        ${classRows || '<tr><td colspan="8" class="text-center muted">暂无数据</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">任务完成情况</div>
    <table>
      <thead>
        <tr>
          <th>任务标题</th>
          <th>发布范围</th>
          <th>截止时间</th>
          <th>学生数</th>
          <th>已完成</th>
          <th>未完成</th>
          <th>待复核</th>
          <th>完成率</th>
        </tr>
      </thead>
      <tbody>
        ${taskRows || '<tr><td colspan="8" class="text-center muted">暂无数据</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">重点关注学生</div>
    <table>
      <thead>
        <tr>
          <th>姓名</th>
          <th>学号</th>
          <th>班级</th>
          <th>缺卡 / 总任务</th>
          <th>缺卡率</th>
        </tr>
      </thead>
      <tbody>
        ${riskRows || '<tr><td colspan="5" class="text-center muted">暂无数据</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">附录：学生完成情况明细</div>
    <table>
      <thead>
        <tr>
          <th>姓名</th>
          <th>学号</th>
          <th>班级</th>
          <th>已完成 / 总任务</th>
          <th>未完成</th>
          <th>待复核</th>
          <th>完成率</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows || '<tr><td colspan="7" class="text-center muted">暂无数据</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="footer">
    本报告由 IdeoTrack 自动生成，仅供内部管理使用。
  </div>
</body>
</html>`;
}

export async function createReportPdf(data: DashboardReportData): Promise<Buffer> {
  // 并发闸：Chromium 内存占用高，限制同一时刻最多一个 PDF 生成任务，
  // 其余排队等待，避免并发导出拉起多个浏览器实例导致 OOM。
  const release = await acquirePdfSlot();
  try {
    return await renderPdf(data);
  } finally {
    release();
  }
}

// 简易串行队列（零依赖）。PDF 生成本身是 I/O 密集且吃内存，串行化更稳。
let pdfChain: Promise<unknown> = Promise.resolve();
function acquirePdfSlot(): () => void {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  // 把当前任务挂到链尾，返回"轮到自己"的 promise
  pdfChain = pdfChain.then(() => wait);
  return release;
}

async function renderPdf(data: DashboardReportData): Promise<Buffer> {
  const executablePath = resolveExecutablePath();
  if (!executablePath) {
    throw new AppError(
      'PDF_BROWSER_NOT_FOUND',
      '未找到可用的 Chromium/Chrome 可执行文件。请设置 PUPPETEER_EXECUTABLE_PATH 环境变量，或在系统中安装 Chromium。',
      500
    );
  }

  logger.info({ executablePath }, '启动 Chromium 生成 PDF');

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ executablePath, err: message }, '启动 Chromium 失败');
    throw new AppError(
      'PDF_BROWSER_LAUNCH_FAILED',
      `启动 Chromium 失败：${message}`,
      500
    );
  }

  try {
    const page = await browser.newPage();
    const html = buildReportHtml(data);
    await page.setContent(html, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: PAGE_MARGIN,
    });
    logger.info({ size: pdfBuffer.length }, 'PDF 生成成功');
    return Buffer.from(pdfBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, 'PDF 渲染失败');
    throw new AppError('PDF_RENDER_FAILED', `PDF 渲染失败：${message}`, 500);
  } finally {
    await browser.close().catch(() => {
      // ignore close error
    });
  }
}

export async function createReportExcel(data: DashboardReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IdeoTrack';
  workbook.created = new Date();

  // 概览
  const overviewSheet = workbook.addWorksheet('概览');
  overviewSheet.addRow(['思想成长任务完成报告']);
  overviewSheet.addRow(['范围', data.meta.scopeLabel]);
  overviewSheet.addRow(['周期', `${data.meta.startDate} ~ ${data.meta.endDate}`]);
  overviewSheet.addRow(['导出人', data.meta.counselorName]);
  overviewSheet.addRow(['导出时间', formatDateTime(data.meta.exportedAt)]);
  overviewSheet.addRow([]);
  overviewSheet.addRow(['管理班级数', data.overview.managedClassCount]);
  overviewSheet.addRow(['学生总数', data.overview.totalStudents]);
  overviewSheet.addRow(['任务总数', data.overview.totalTasks]);
  overviewSheet.addRow(['平均完成率', formatRate(data.overview.avgCompletionRate)]);
  overviewSheet.addRow(['待复核数量', data.overview.pendingReviewCount]);
  overviewSheet.addRow(['未完成人次', data.overview.incompleteStudentCount]);

  // 班级完成情况
  const classSheet = workbook.addWorksheet('班级完成情况');
  classSheet.columns = [
    { header: '排名', key: 'rank', width: 8 },
    { header: '班级', key: 'className', width: 18 },
    { header: '学院', key: 'collegeName', width: 18 },
    { header: '学生数', key: 'studentCount', width: 10 },
    { header: '已完成', key: 'checkedCount', width: 10 },
    { header: '未完成', key: 'incompleteCount', width: 10 },
    { header: '待复核', key: 'pendingReviewCount', width: 10 },
    { header: '完成率', key: 'completionRate', width: 12 },
  ];
  for (const row of data.classStats) {
    classSheet.addRow({
      rank: row.rank,
      className: row.className,
      collegeName: row.collegeName,
      studentCount: row.studentCount,
      checkedCount: row.checkedCount,
      incompleteCount: row.incompleteCount,
      pendingReviewCount: row.pendingReviewCount,
      completionRate: formatRate(row.completionRate),
    });
  }

  // 任务完成情况
  const taskSheet = workbook.addWorksheet('任务完成情况');
  taskSheet.columns = [
    { header: '任务标题', key: 'title', width: 32 },
    { header: '发布范围', key: 'scope', width: 16 },
    { header: '截止时间', key: 'deadline', width: 14 },
    { header: '学生数', key: 'totalStudents', width: 10 },
    { header: '已完成', key: 'checkedCount', width: 10 },
    { header: '未完成', key: 'incompleteCount', width: 10 },
    { header: '待复核', key: 'pendingReviewCount', width: 10 },
    { header: '完成率', key: 'completionRate', width: 12 },
  ];
  for (const row of data.taskStats) {
    taskSheet.addRow({
      title: row.title,
      scope: row.scope,
      deadline: row.deadline.split(' ')[0],
      totalStudents: row.totalStudents,
      checkedCount: row.checkedCount,
      incompleteCount: row.incompleteCount,
      pendingReviewCount: row.pendingReviewCount,
      completionRate: formatRate(row.completionRate),
    });
  }

  // 重点关注学生
  const riskSheet = workbook.addWorksheet('重点关注学生');
  riskSheet.columns = [
    { header: '姓名', key: 'studentName', width: 14 },
    { header: '学号', key: 'studentSchoolId', width: 16 },
    { header: '班级', key: 'className', width: 18 },
    { header: '缺卡 / 总任务', key: 'absentRatio', width: 14 },
    { header: '缺卡率', key: 'absentRate', width: 12 },
  ];
  for (const row of data.highRiskStudents) {
    riskSheet.addRow({
      studentName: row.studentName,
      studentSchoolId: row.studentSchoolId,
      className: row.className,
      absentRatio: `${row.absentCount} / ${row.totalTasks}`,
      absentRate: formatRate(row.absentRate),
    });
  }

  // 学生明细
  const detailSheet = workbook.addWorksheet('学生明细');
  detailSheet.columns = [
    { header: '姓名', key: 'studentName', width: 14 },
    { header: '学号', key: 'studentSchoolId', width: 16 },
    { header: '班级', key: 'className', width: 18 },
    { header: '已完成 / 总任务', key: 'completedRatio', width: 16 },
    { header: '未完成', key: 'incompleteCount', width: 10 },
    { header: '待复核', key: 'reviewCount', width: 10 },
    { header: '完成率', key: 'completionRate', width: 12 },
  ];
  for (const row of data.studentDetails) {
    detailSheet.addRow({
      studentName: row.studentName,
      studentSchoolId: row.studentSchoolId,
      className: row.className,
      completedRatio: `${row.completedCount} / ${row.totalTasks}`,
      incompleteCount: row.incompleteCount,
      reviewCount: row.reviewCount,
      completionRate: formatRate(row.completionRate),
    });
  }

  // 简单表头样式
  for (const sheet of [classSheet, taskSheet, riskSheet, detailSheet]) {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFECFEFF' },
    };
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
