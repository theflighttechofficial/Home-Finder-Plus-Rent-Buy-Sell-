const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const env = process.env.NODE_ENV || "development";
const isProd = env === "production";
// Vercel's file system is read-only except /tmp, and /tmp is wiped when an instance stops
const onVercel = Boolean(process.env.VERCEL);
const writableRoot = onVercel ? path.join("/tmp", "homefinder") : path.join(__dirname, "..");

const DEV_SECRET = "homefinder-dev-secret-change-me";
const jwtSecret = process.env.JWT_SECRET || (isProd ? null : DEV_SECRET);
if (!jwtSecret) {
    throw new Error("JWT_SECRET must be set in production. Add it as an environment variable (any long random string).");
}

module.exports = {
    env,
    isProd,
    isTest: env === "test",
    onVercel,
    port: Number(process.env.PORT) || 3000,
    // JSON file that holds all app data (":memory:" keeps it in memory only)
    dataFile: process.env.DATA_FILE || path.join(writableRoot, "data", "homefinder.json"),
    jwtSecret,
    usingDevSecret: jwtSecret === DEV_SECRET,
    jwtExpiresIn: "7d",
    cookieName: "hf_token",
    seedOnStart: process.env.SEED_ON_START !== "false",
    uploadDir: process.env.UPLOAD_DIR || path.join(writableRoot, "uploads"),
    publicDir: path.join(__dirname, "..", "public"),
    maxUploadMb: 5,
};
