/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http', // Or 'https' if the URLs are HTTPS
        hostname: 'books.google.com',
        port: '', // Usually empty for default ports 80/443
        pathname: '/books/content/**', // Be as specific or general as needed for the path
      },
      // You can add other hostnames here if needed
      // For example, if you still use Open Library covers sometimes:
      // {
      //   protocol: 'https',
      //   hostname: 'covers.openlibrary.org',
      //   port: '',
      //   pathname: '/b/**',
      // },
      // And for your placeholder images:
      // {
      //   protocol: 'https',
      //   hostname: 'via.placeholder.com',
      //   port: '',
      //   pathname: '/**',
      // },
    ],

    domains: ["covers.openlibrary.org"],
  },

};

module.exports = nextConfig;
