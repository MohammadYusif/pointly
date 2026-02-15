/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  transpilePackages: ['@pointly/i18n', '@pointly/ui', '@pointly/assets', '@pointly/shared'],
};

export default nextConfig;
