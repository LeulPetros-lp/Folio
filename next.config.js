/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http', // Change to https - images are likely served over HTTPS
        hostname: 'books.google.com',
        port: '',
        pathname: '/books/content/**',
      },
      
      {
        protocol: 'https', // Add this entry for Open Library covers
        hostname: 'covers.openlibrary.org',
        port: '',
        pathname: '/b/**', // Check Open Library documentation for the exact path pattern if needed, '/b/**' is common
      },
      {
        protocol: 'https', // Add this entry for your placeholder images
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**', // Allows any path on the placeholder domain
      },
    ],
    // Remove the 'domains' array if you are using remotePatterns
    // domains: ["covers.openlibrary.org"], <-- Remove or comment this out
  },
};

module.exports = nextConfig;