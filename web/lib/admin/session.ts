export const ADMIN_COOKIE = "guitar_admin";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

const encoder = new TextEncoder();

async function signature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
  );
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createAdminSession(
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
  ttlSeconds = ADMIN_SESSION_SECONDS,
): Promise<string> {
  const expires = nowSeconds + ttlSeconds;
  const payload = `v1.${expires}`;
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifyAdminSession(
  value: string | undefined,
  secret: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1_000),
): Promise<boolean> {
  if (!value || !secret) return false;

  const [version, expiresRaw, supplied] = value.split(".");
  const expires = Number(expiresRaw);
  if (
    version !== "v1" ||
    !Number.isInteger(expires) ||
    expires <= nowSeconds ||
    !supplied
  ) {
    return false;
  }

  return supplied === (await signature(`${version}.${expires}`, secret));
}
