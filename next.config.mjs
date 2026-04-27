/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  async redirects() {
    return [
      {
        source: '/:day(\\d{4}-\\d{2}-\\d{2})/:procedureCode/',
        destination: '/',
        permanent: true,
      },
      {
        source: '/:day(\\d{4}-\\d{2}-\\d{2})/',
        destination: '/',
        permanent: true,
      },
    ];
  },
  // https://nextjs.org/docs/app/api-reference/next-config-js/logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typedRoutes: true,
};

export default nextConfig;
