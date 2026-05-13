import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  transpilePackages: ['@pointly/ui', '@pointly/i18n', '@pointly/shared'],
};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  sourcemaps: { disable: true },
});
