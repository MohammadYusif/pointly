/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['@pointly/i18n', '@pointly/ui', '@pointly/assets'],
};

export default nextConfig;
