const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { setup, teardown, request } = require("./helpers");

describe("pages and static assets", () => {
    let app;
    before(async () => (app = await setup()));
    after(teardown);

    const pages = fs.readdirSync(path.join(__dirname, "..", "public")).filter((f) => f.endsWith(".html"));

    for (const page of pages) {
        it(`serves ${page} with its scripts and styles`, async () => {
            const res = await request(app).get(`/${page}`).expect(page === "404.html" ? 200 : 200);
            const refs = [...res.text.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1].split("?")[0]);
            for (const ref of refs) {
                if (ref.startsWith("/details.html") || ref.startsWith("/search.html") || ref.endsWith(".html") || ref === "/") continue;
                await request(app).get(ref).expect(200);
            }
        });
    }

    it("sends security headers", async () => {
        const res = await request(app).get("/");
        assert.match(res.headers["content-security-policy"], /script-src 'self'/);
        assert.equal(res.headers["x-content-type-options"], "nosniff");
        assert.equal(res.headers["x-powered-by"], undefined);
    });

    it("redirects old page names", async () => {
        await request(app).get("/home.html").expect(301).expect("location", "/about.html");
    });

    it("returns the 404 page for unknown routes and JSON for unknown API routes", async () => {
        const page = await request(app).get("/nope").expect(404);
        assert.match(page.text, /404/);
        const api = await request(app).get("/api/nope").expect(404);
        assert.equal(api.body.success, false);
    });

    it("has no inline scripts (CSP-safe)", () => {
        for (const page of pages) {
            const html = fs.readFileSync(path.join(__dirname, "..", "public", page), "utf8");
            assert.ok(!/<script>(?!\s*<\/script>)/.test(html), `${page} has an inline script`);
            assert.ok(!/\son(click|load|submit|change|input)=/.test(html), `${page} has an inline handler`);
        }
    });
});
