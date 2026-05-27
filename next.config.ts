import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
  allowedDevOrigins: [
    ".space-z.ai",
    "localhost",
    "127.0.0.1",
    "preview-chat-d93e84e2-2cfa-4674-b194-ce1bf2b70d72.space-z.ai",
  ],
};

export default nextConfig;
