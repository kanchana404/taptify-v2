/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  async rewrites() {
    return [
      {
        source: '/api/webhook/stripe/connect',
        destination: '/api/webhooks/stripe/connect',
      },
      {
        source: '/api/webhook/stripe',
        destination: '/api/webhooks/stripe',
      },
    ];
  },
};

export default nextConfig;
