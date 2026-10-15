process.env.NODE_ENV = "test";
process.env.UPLOAD_DIR = require("path").join(require("os").tmpdir(), "homefinder-test-uploads");

const mongoose = require("mongoose");
const request = require("supertest");
const { createApp } = require("../server/app");
const { seedIfEmpty } = require("../server/seed");

const TEST_URI = process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/homefinder_test";

async function setup() {
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.dropDatabase();
    await seedIfEmpty({ log: () => {} });
    return createApp();
}

async function teardown() {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
}

// Returns a supertest agent that keeps the session cookie
async function loginAs(app, email, password = "Demo@1234") {
    const agent = request.agent(app);
    const res = await agent.post("/api/auth/login").send({ email, password });
    if (res.status !== 200) throw new Error(`login failed: ${res.body.message}`);
    return agent;
}

async function register(app, data = {}) {
    const agent = request.agent(app);
    const body = { name: "Test User", email: `user${Date.now()}${Math.random().toString(16).slice(2, 6)}@example.com`, password: "Password123", ...data };
    const res = await agent.post("/api/auth/register").send(body);
    return { agent, res, body };
}

// 1x1 PNG
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000201a5b2f2d70000000049454e44ae426082", "hex");

module.exports = { setup, teardown, loginAs, register, request, PNG };
