import "dotenv/config";

export const config = {
  appName: process.env.APP_NAME || "GeM Bid Compliance API",
  environment: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8000),
  apiPrefix: process.env.API_PREFIX || "/api",
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gem_bid_compliance",
  jwtSecret: process.env.JWT_SECRET_KEY || "dev_secret_key_987654321",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  maxUploadSize: Number(process.env.MAX_UPLOAD_SIZE || 10485760),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "",
  supabaseBucket: process.env.SUPABASE_BUCKET || "bid-uploads",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
};
