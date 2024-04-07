/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  // https://nextjs.org/docs/app/api-reference/next-config-js/logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
