export interface Env {
  R2_BUCKET: R2Bucket;
  DB: D1Database;
  CORS_ORIGIN: string;
  CONVERTER_URL: string;
  CONVERTER_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  APP_URL: string;
  FRONTEND_URL?: string;
  SENTRY_DSN?: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export interface AuthUser {
  email: string;
  stripeCustomerId: string | null;
  plan: string;
  googleId: string | null;
}

export interface AppVariables {
  clientHash: string;
  rateLimitRemaining: number;
  rateLimitLimit: number;
  user: AuthUser | null;
}
