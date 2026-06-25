// basePath 统一前缀（与 web/next.config.ts 的 basePath 保持一致）。
// 仅用于绕过 Next.js 路由层、直接操作 window.location.href 的场景——
// 正常的 next/link、router.push/replace 会被 Next.js 自动加上前缀，无需手动处理。

export const BASE_PATH = "/admin";

/** 拼接 basePath 前缀，返回形如 /admin/login 的绝对路径。 */
export function withBasePath(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  return `${BASE_PATH}${path}`;
}
