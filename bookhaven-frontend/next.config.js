/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Turbopack is stable in Next.js 16 — configure it here
    turbo: {
      // Handle any module resolution issues on Windows
      resolveAlias: {},
    },
  },
  output: "standalone",
  allowedDevOrigins: ["192.168.236.193"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Project Gutenberg cover images
      {
        protocol: "https",
        hostname: "www.gutenberg.org",
        port: "",
        pathname: "/**",
      },

      // Open Library cover images
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        port: "",
        pathname: "/**",
      },

      // Google Books cover images
      {
        protocol: "https",
        hostname: "books.google.com",
        port: "",
        pathname: "/**",
      },

      // Standard Ebooks cover images
      {
        protocol: "https",
        hostname: "standardebooks.org",
        port: "",
        pathname: "/**",
      },

      // Internet Archive cover images
      { protocol: "https", hostname: "archive.org", port: "", pathname: "/**" },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1",
  },
  webpack: (config) => {
    // Required for react-pdf
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

module.exports = nextConfig;
