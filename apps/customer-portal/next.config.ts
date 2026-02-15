import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  transpilePackages: ['@pointly/ui', '@pointly/i18n', '@pointly/shared'],
};

export default nextConfig;
