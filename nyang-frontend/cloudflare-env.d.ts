declare namespace Cloudflare {
  interface Env {
    NYANG_ADMIN_EMAIL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
