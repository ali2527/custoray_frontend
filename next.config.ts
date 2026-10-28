import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  transpilePackages: ["antd", "@ant-design/icons", "@ant-design/cssinjs", "rc-util", "rc-pagination", "rc-picker"],
  async redirects() {
    return [
      { source: "/dashboard", destination: "/home", permanent: false },
      { source: "/dashboard/:path*", destination: "/:path*", permanent: false },
    ];
  },
};

export default withPWA(nextConfig);
