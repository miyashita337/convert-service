import type { Env } from "../types/env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export function getGoogleAuthUrl(env: Env): string {
  const redirectUri = `${env.APP_URL}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  env: Env,
  code: string
): Promise<{ accessToken: string; idToken: string }> {
  const redirectUri = `${env.APP_URL}/api/auth/google/callback`;
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token exchange failed: ${error}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    id_token: string;
  };
  return { accessToken: data.access_token, idToken: data.id_token };
}

export async function getGoogleUserInfo(
  accessToken: string
): Promise<{ email: string; id: string; name: string; picture: string }> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to get Google user info");
  }

  return response.json() as Promise<{
    email: string;
    id: string;
    name: string;
    picture: string;
  }>;
}

// JWT using Web Crypto API (available in Workers)
const encoder = new TextEncoder();

async function createHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function createJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds = 7 * 24 * 60 * 60 // 7 days
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(fullPayload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await createHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));

  return `${signingInput}.${base64url(signature)}`;
}

export async function verifyJwt(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await createHmacKey(secret);
  const signatureBytes = base64urlDecode(signatureB64);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(signingInput)
  );

  if (!valid) return null;

  const payload = JSON.parse(
    new TextDecoder().decode(base64urlDecode(payloadB64))
  ) as Record<string, unknown>;

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) return null;

  return payload;
}
