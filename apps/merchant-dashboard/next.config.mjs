/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pointly/i18n', '@pointly/ui', '@pointly/assets'],
};

export default nextConfig;
