/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Prevent caching issues with deployments
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
