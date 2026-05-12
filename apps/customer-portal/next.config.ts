import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  transpilePackages: ['@pointly/ui', '@pointly/i18n', '@pointly/shared'],
};

export default nextConfig;
