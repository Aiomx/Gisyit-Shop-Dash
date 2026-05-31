/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  webpack: (config, { dev }) => {
    if (dev) {
      const ignored = config.watchOptions?.ignored;
      const ignoredList = Array.isArray(ignored) ? ignored : ignored ? [ignored] : [];
      const nextIgnored = [...ignoredList, "**/dist-electron/**"].filter((pattern) =>
        typeof pattern === "string" && pattern.trim().length > 0
      );
      config.watchOptions = {
        ...config.watchOptions,
        ignored: nextIgnored,
      };
    }
    return config;
  },
  // Increase body size limit for large file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/default",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
