import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pointly/i18n', '@pointly/ui', '@pointly/assets'],
};

export default nextConfig;
