const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const env = process.env.NODE_ENV || "development";
const isProd = env === "production";
// Vercel's file system is read-only except /tmp, and /tmp is wiped when an instance stops
const onVercel = Boolean(process.env.VERCEL);
const writableRoot = onVercel ? path.join("/tmp", "homefinder") : path.join(__dirname, "..");

const DEV_SECRET = "homefinder-dev-secret-change-me";
// In production without JWT_SECRET, fall back to a random secret for this process instead of
// refusing to start: browsing keeps working, but logins reset whenever the process restarts
// (and on Vercel can drop when a request lands on a different instance). Set JWT_SECRET to fix.
const missingProdSecret = isProd && !process.env.JWT_SECRET;
const jwtSecret = process.env.JWT_SECRET || (isProd ? require("crypto").randomBytes(48).toString("hex") : DEV_SECRET);

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
    missingProdSecret,
    jwtExpiresIn: "7d",
    cookieName: "hf_token",
    seedOnStart: process.env.SEED_ON_START !== "false",
    uploadDir: process.env.UPLOAD_DIR || path.join(writableRoot, "uploads"),
    publicDir: path.join(__dirname, "..", "public"),
    maxUploadMb: 5,
};
