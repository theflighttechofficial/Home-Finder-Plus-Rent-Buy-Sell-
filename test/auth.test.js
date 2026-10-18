const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { db, setup, teardown, register, request } = require("./helpers");

describe("auth", () => {
    let app;
    before(async () => (app = await setup()));
    after(teardown);

    it("registers, sets an httpOnly session cookie and never returns the password", async () => {
        const { res, agent } = await register(app);
        assert.equal(res.status, 201);
        assert.equal(res.body.user.password, undefined);
        const cookie = res.headers["set-cookie"].join(";");
        assert.match(cookie, /hf_token=/);
        assert.match(cookie, /HttpOnly/i);

        const me = await agent.get("/api/me");
        assert.equal(me.body.user.email, res.body.user.email);
    });

    it("stores passwords hashed", async () => {
        const { body } = await register(app);
        const raw = db.users.findOne((u) => u.email === body.email);
        assert.match(raw.password, /^\$2[aby]\$/);
    });

    it("rejects duplicate emails case-insensitively", async () => {
        const { body } = await register(app);
        const { res } = await register(app, { email: body.email.toUpperCase() });
        assert.equal(res.status, 409);
    });

    it("validates input with field errors", async () => {
        const res = await request(app).post("/api/auth/register").send({ name: "A", email: "bad", password: "123" });
        assert.equal(res.status, 400);
        assert.ok(res.body.errors.name && res.body.errors.email && res.body.errors.password);
    });

    it("logs in with correct credentials only", async () => {
        const { body } = await register(app);
        const bad = await request(app).post("/api/auth/login").send({ email: body.email, password: "nope" });
        assert.equal(bad.status, 401);
        const good = await request(app).post("/api/auth/login").send({ email: body.email, password: body.password });
        assert.equal(good.status, 200);
    });

    it("upgrades legacy plain-text passwords on login", async () => {
        db.users.insert({ name: "Legacy", email: "legacy@example.com", password: "oldpass1" });
        const res = await request(app).post("/api/auth/login").send({ email: "legacy@example.com", password: "oldpass1" });
        assert.equal(res.status, 200);
        const raw = db.users.findOne((u) => u.email === "legacy@example.com");
        assert.match(raw.password, /^\$2/);
    });

    it("logs out", async () => {
        const { agent } = await register(app);
        await agent.post("/api/auth/logout").expect(200);
        const me = await agent.get("/api/me");
        assert.equal(me.body.user, null);
    });

    it("blocks cross-site state-changing requests", async () => {
        const res = await request(app).post("/api/auth/logout").set("Origin", "https://evil.example");
        assert.equal(res.status, 403);
    });

    it("protects private endpoints", async () => {
        await request(app).get("/api/me/favourites").expect(401);
        await request(app).get("/api/conversations").expect(401);
        await request(app).post("/api/listings").send({}).expect(401);
    });
});

describe("data file", () => {
    let app;
    before(async () => (app = await setup()));
    after(teardown);

    it("persists to disk and reloads", async () => {
        const { body } = await register(app, { name: "Persist Me" });
        db.close(); // flush
        const file = db.file;
        db.open(file);
        assert.equal(db.users.findOne((u) => u.email === body.email).name, "Persist Me");
        assert.equal(db.listings.count(), 28);
    });
});
