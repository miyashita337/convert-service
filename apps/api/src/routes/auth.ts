import { Hono } from "hono";
import type { Env, AppVariables } from "../types/env";
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
  createJwt,
} from "../services/auth";
import { upsertUser } from "../repositories/user-repository";

const auth = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/auth/google — redirect to Google OAuth consent screen
auth.get("/google", (c) => {
  const url = getGoogleAuthUrl(c.env);
  return c.redirect(url);
});

// GET /api/auth/google/callback — handle OAuth callback
auth.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const error = c.req.query("error");
  const frontendUrl = c.env.FRONTEND_URL || "https://quickconv.cc";

  if (error || !code) {
    return c.redirect(`${frontendUrl}?auth_error=cancelled`);
  }

  try {
    const { accessToken } = await exchangeCodeForTokens(c.env, code);
    const googleUser = await getGoogleUserInfo(accessToken);
    const user = await upsertUser(
      c.env.DB,
      googleUser.email,
      googleUser.id,
      googleUser.name
    );

    const jwt = await createJwt(
      {
        email: user.email,
        plan: user.plan,
        picture: googleUser.picture,
        name: googleUser.name,
      },
      c.env.JWT_SECRET
    );

    // Set HTTP-only cookie and redirect to frontend
    const cookieOptions = [
      `qc_auth=${jwt}`,
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      "Max-Age=604800", // 7 days
    ].join("; ");

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${frontendUrl}?auth=success`,
        "Set-Cookie": cookieOptions,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("OAuth callback error:", message);
    return c.redirect(`${frontendUrl}?auth_error=failed&detail=${encodeURIComponent(message)}`);
  }
});

// GET /api/auth/me — get current user info (from JWT cookie)
auth.get("/me", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ authenticated: false }, 200);
  }

  // Also return picture/name from JWT for display
  const cookie = c.req.header("Cookie");
  const match = cookie?.match(/qc_auth=([^;]+)/);
  let picture = "";
  let name = "";

  if (match) {
    try {
      // Decode JWT payload (already verified by middleware)
      const payloadB64 = match[1].split(".")[1];
      const padded =
        payloadB64.replace(/-/g, "+").replace(/_/g, "/") +
        "=".repeat((4 - (payloadB64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));
      picture = payload.picture || "";
      name = payload.name || "";
    } catch {
      // ignore parse errors
    }
  }

  return c.json({
    authenticated: true,
    email: user.email,
    plan: user.plan,
    picture,
    name,
  });
});

// POST /api/auth/logout — clear auth cookie
auth.post("/logout", (c) => {
  const cookieOptions = [
    "qc_auth=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");

  return c.json(
    { success: true },
    200,
    { "Set-Cookie": cookieOptions }
  );
});

export default auth;
