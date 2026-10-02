const webpack = require("webpack");
const packageJson = require("./package.json");

// Generate a deterministic build ID based on package version, git commit, and timestamp
let gitCommit = "prod";
try {
  gitCommit = require("child_process")
    .execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
    .trim();
} catch (e) {
  gitCommit = process.env.VERCEL_GIT_COMMIT_SHA
    ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
    : "rel";
}

const buildTimestamp = Date.now();
const buildTime = new Date(buildTimestamp).toISOString();
const BUILD_ID = `${packageJson.version}-${gitCommit}-${Math.floor(buildTimestamp / 1000)}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => BUILD_ID,
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
    NEXT_PUBLIC_BUILD_TIME: buildTime,
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
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
  async headers() {
    return [
      // 1. Service Worker: Must NEVER be cached by browser HTTP cache
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      // 2. Web App Manifest: Immediate refresh for logo, icons, theme colors
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      // 3. API Version endpoint: Always dynamic
      {
        source: "/api/app-version",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      // 4. Offline Fallback page: Revalidate frequently
      {
        source: "/offline.html",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      // 5. Public Static Assets (logos, icons, favicons, fonts, images)
      // Must revalidate with server so replaced files are served fresh without stale browser cache
      {
        source: "/:path*(png|jpg|jpeg|svg|webp|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      // 6. Next.js Immutable Chunks (content-hashed by Next.js compiler)
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

