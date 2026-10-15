const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const env = process.env.NODE_ENV || "development";
const isProd = env === "production";

const DEV_SECRET = "homefinder-dev-secret-change-me";
const jwtSecret = process.env.JWT_SECRET || (isProd ? null : DEV_SECRET);
if (!jwtSecret) {
    throw new Error("JWT_SECRET must be set in production");
}

module.exports = {
    env,
    isProd,
    isTest: env === "test",
    port: Number(process.env.PORT) || 3000,
    mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/userDB",
    jwtSecret,
    usingDevSecret: jwtSecret === DEV_SECRET,
    jwtExpiresIn: "7d",
    cookieName: "hf_token",
    seedOnStart: process.env.SEED_ON_START !== "false",
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads"),
    publicDir: path.join(__dirname, "..", "public"),
    maxUploadMb: 5,
};
