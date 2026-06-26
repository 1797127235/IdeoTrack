/**
 * 受控并发池：以最多 `concurrency` 路并发跑完一组异步任务，按原顺序返回结果。
 *
 * 用于批量注册照导入等需要限流的后台任务——避免一次性打爆下游 face 服务
 * （CPU 推理吃满会 OOM/超时），也避免串行执行拖到 HTTP 超时之外。
 */

export async function runPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const size = Math.max(1, concurrency);
  let cursor = 0;

  // 每个 worker 不停领取下一个游标任务，直到全部完成
  async function next(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(size, items.length) }, () => next());
  await Promise.all(workers);
  return results;
}
