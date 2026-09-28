const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.symlinks = false;

    // Fix Windows cross-drive path bug in Next.js internal entry resolution
    const origEntry = config.entry;
    config.entry = async () => {
      const entries = await origEntry();
      const fixPath = (p) => (typeof p === "string" ? p.replace(/^\.\/([a-zA-Z]:)/, "$1") : p);
      for (const key of Object.keys(entries)) {
        if (Array.isArray(entries[key])) {
          entries[key] = entries[key].map(fixPath);
        } else if (typeof entries[key] === "string") {
          entries[key] = fixPath(entries[key]);
        }
      }
      return entries;
    };

    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^\.\/([a-zA-Z]:)/, (resource) => {
        resource.request = resource.request.replace(/^\.\/([a-zA-Z]:)/, "$1");
      })
    );

    return config;
  },
};

module.exports = nextConfig;
