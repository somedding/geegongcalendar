import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OAuth 콜백 URL을 캐시하지 않도록 헤더 설정
  async headers() {
    return [
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
