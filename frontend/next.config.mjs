/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the static-default interruption test build separate from the live
  // API-default application build. Both are real production Next builds.
  distDir: process.env.ALAGEUM_PROFILE_BUILD === "1" ? ".next-profile" : process.env.ALAGEUM_QUOTES_BUILD === "1" ? ".next-quotes" : ".next",
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
