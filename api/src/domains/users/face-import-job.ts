/**
 * 批量注册照导入的异步任务。
 *
 * 注册照导入要对每张图调 face 服务提特征向量（CPU 0.5-2s/张），整班几十张
 * 串行跑会超过 HTTP 超时。这里把导入做成内存 job：
 *   POST 创建 job 立即返回 jobId，后台以受控并发执行，
 *   前端轮询 GET 拿进度，完成后取最终结果。
 *
 * job 仅存进程内存（单实例部署），容器重启即丢失——管理员重新导入即可。
 * 完成后保留 30 分钟供前端拉取结果，之后自动清理，避免长期累积。
 */

import { randomUUID } from 'node:crypto';
import { runPool } from '../../lib/pool.js';
import { processFaceImportEntry } from './users.service.js';
import type { BatchFaceImportItem, FaceImportJob } from './users.types.js';

const CONCURRENCY = 4;
const JOB_TTL_MS = 30 * 60 * 1000;

const jobs = new Map<string, FaceImportJob>();

/** 创建导入任务并立即返回 jobId，后台开始执行。 */
export function createFaceImportJob(
  entries: Array<{ schoolId: string; buffer: Buffer; ext: string }>
): string {
  const id = randomUUID();
  const job: FaceImportJob = {
    id,
    status: 'pending',
    total: entries.length,
    processed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    items: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
  jobs.set(id, job);

  // 后台执行，不 await——立即把 jobId 交给前端轮询
  void runFaceImportJob(job, entries);

  return id;
}

async function runFaceImportJob(
  job: FaceImportJob,
  entries: Array<{ schoolId: string; buffer: Buffer; ext: string }>
): Promise<void> {
  job.status = 'running';
  await runPool(entries, CONCURRENCY, async (entry) => {
    const item: BatchFaceImportItem = await processFaceImportEntry(entry);
    // 流式累计进度：items 按完成顺序追加（并发下乱序，前端展示时自行排序）
    job.processed++;
    if (item.status === 'success') job.success++;
    else if (item.status === 'skipped') job.skipped++;
    else job.failed++;
    job.items.push(item);
    return item;
  });

  job.status = 'done';
  job.finishedAt = new Date().toISOString();

  // 完成后定时清理，避免长期运行进程累积已完成 job
  setTimeout(() => jobs.delete(job.id), JOB_TTL_MS);
}

/** 查询任务进度。不存在（已清理或无效 id）返回 null。 */
export function getFaceImportJob(jobId: string): FaceImportJob | null {
  return jobs.get(jobId) ?? null;
}
