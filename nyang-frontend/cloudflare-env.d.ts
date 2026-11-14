declare namespace Cloudflare {
  interface Env {
    NYANG_ADMIN_EMAIL?: string;
    NYANG_DEMO_PASSWORD_HASH?: string;
    KNOWLY_SUPABASE_URL?: string;
    KNOWLY_SUPABASE_KEY?: string;
    KNOWLY_LOGIN_EMAIL_DOMAIN?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
