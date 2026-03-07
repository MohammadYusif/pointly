import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@pointly/ui', '@pointly/i18n', '@pointly/shared'],
};

export default nextConfig;
