import type { NextConfig } from "next";

// basePath: 管理后台挂在主域名 /admin/ 路径下，复用主域名的 DNS + HTTPS 证书，
// 无需为 admin.ideotrack.cc.cd 单独配子域名 DNS（见 Caddyfile）。
// 页面路由（next/link、router.push、_next 静态资源）由 Next.js 自动加 /admin 前缀，
// API 调用走独立的 NEXT_PUBLIC_API_URL，不受影响。
const nextConfig: NextConfig = {
  basePath: "/admin",
  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin/login",
        permanent: false,
        basePath: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
