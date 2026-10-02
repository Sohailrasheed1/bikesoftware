/**
 * Application Version & Dynamic Build Identification
 * Automatically synced with Next.js build ID and environment variables
 */

export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

export const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_ID || "dev";

export const BUILD_TIME =
  process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

/**
 * Returns a version-busted URL for static assets (images, icons, manifests, etc.)
 * Appending ?v=${BUILD_ID} ensures browsers and CDNs immediately fetch the new
 * file on every deployment without requiring manual cache clearing.
 */
export function getAssetUrl(path: string): string {
  if (!path) return "";
  // Leave external URLs and data URIs untouched
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const separator = cleanPath.includes("?") ? "&" : "?";
  return `${cleanPath}${separator}v=${BUILD_ID}`;
}
