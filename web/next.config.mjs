/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { externalDir: true }, // allow importing the engine from ../src
};
export default nextConfig;
