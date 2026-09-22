import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  transpilePackages: ["antd", "@ant-design/icons", "@ant-design/cssinjs", "rc-util", "rc-pagination", "rc-picker"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
