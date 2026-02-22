import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '*.its.go.kr',
      },
      {
        protocol: 'http',
        hostname: 'topis.seoul.go.kr',
      },
    ],
  },
};

export default nextConfig;
