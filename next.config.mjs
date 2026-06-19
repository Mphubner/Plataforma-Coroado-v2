/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['motion'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
