import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.its.go.kr',
      },
      {
        protocol: 'http',
        hostname: '*.its.go.kr',
      },
      {
        protocol: 'https',
        hostname: 'topis.seoul.go.kr',
      },
      {
        protocol: 'http',
        hostname: 'topis.seoul.go.kr',
      },
    ],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
      ],
    },
  ],
};

export default nextConfig;
