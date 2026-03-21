import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This resolves to the root directory where your .env usually sits
const projectRoot = path.resolve(__dirname, "../../../../");
const rootEnvPath = path.join(projectRoot, ".env");

// 💡 Try to load from the file, but don't crash if it's missing (it's missing in AWS)
dotenv.config({ path: rootEnvPath });
// Also load from current directory as a fallback
dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3001", 10),
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRES_IN: "7d",
  BCRYPT_SALT_ROUNDS: 12,
  DATABASE_URL: process.env.DATABASE_URL as string,

  // 💡 Ensure this matches your AWS UI or local .env
  SEED_ADMIN_PASSWORD:
    process.env.INITIAL_SUPERADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD,

  // RESEND INTEGRATION
  RESEND_API_KEY: process.env.RESEND_API_KEY as string,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // TWILIO INTEGRATION
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID as string,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN as string,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER as string,

  // AWS S3 INTEGRATION
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID as string,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY as string,
  AWS_REGION: process.env.AWS_REGION || "af-south-1",
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME as string,

  get isProduction() {
    return this.NODE_ENV === "production";
  },
  get isDevelopment() {
    return this.NODE_ENV === "development";
  },
};

// FAIL-FAST: Critical variables for Identity, Mail, and Storage
const requiredVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "RESEND_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_BUCKET_NAME",
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    // 💡 Only log the missing key. Don't mention the file path to avoid confusion.
    console.error(`❌ FATAL: Missing environment variable: ${key}`);
    process.exit(1);
  }
}

export default env;
