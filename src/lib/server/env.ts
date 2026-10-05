/**
 * Production environment helpers.
 * Dev may use safe fallbacks; production must fail closed.
 */

const DEV_AUTH_FALLBACK =
  "skander_spare_parts_super_secret_jwt_key_2026_xyz";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * NextAuth JWT signing secret.
 * Production: NEXTAUTH_SECRET is strictly required (no hardcoded fallback).
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (secret) return secret;

  if (isProduction()) {
    throw new Error(
      "NEXTAUTH_SECRET is required in production. Generate one with: openssl rand -base64 32"
    );
  }

  return DEV_AUTH_FALLBACK;
}
