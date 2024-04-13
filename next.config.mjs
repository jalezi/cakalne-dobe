/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 's-maxage=1, stale-while-revalidate=59',
          },
        ],
      },
    ];
  },
  // https://nextjs.org/docs/app/api-reference/next-config-js/logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
