export interface Env {
  R2_BUCKET: R2Bucket;
  DB: D1Database;
  CORS_ORIGIN: string;
  CONVERTER_URL: string;
  CONVERTER_API_KEY: string;
}

export interface AppVariables {
  clientHash: string;
  rateLimitRemaining: number;
  rateLimitLimit: number;
}
