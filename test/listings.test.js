const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, loginAs, register, request, PNG } = require("./helpers");

const validListing = (images) => ({
    title: "Bright 2 BHK near the lake",
    purpose: "rent",
    price: 25000,
    propertyType: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    address: { city: "Chennai", locality: "Velachery" },
    coordinates: { lat: 12.98, lng: 80.22 },
    amenities: ["Lift", "Gym"],
    images,
});

describe("listings", () => {
    let app;
    before(async () => (app = await setup()));
    after(teardown);

    it("lists seeded listings with pagination", async () => {
        const res = await request(app).get("/api/listings?limit=5").expect(200);
        assert.equal(res.body.items.length, 5);
        assert.equal(res.body.total, 28);
        assert.equal(res.body.pages, 6);
    });

    it("filters by purpose, city, price and bedrooms", async () => {
        const res = await request(app).get("/api/listings?purpose=rent&city=chennai&maxPrice=20000&bedrooms=2&limit=48").expect(200);
        assert.ok(res.body.items.length > 0);
        for (const l of res.body.items) {
            assert.equal(l.purpose, "rent");
            assert.equal(l.address.city, "Chennai");
            assert.ok(l.price <= 20000);
            assert.ok(l.bedrooms >= 2);
        }
    });

    it("sorts by price", async () => {
        const { body } = await request(app).get("/api/listings?purpose=rent&sort=price_asc&limit=48");
        const prices = body.items.map((l) => l.price);
        assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
    });

    it("searches free text and understands 'N BHK'", async () => {
        const { body } = await request(app).get("/api/listings?q=1 bhk&limit=48");
        assert.ok(body.total > 0);
        assert.ok(body.items.every((l) => l.bedrooms === 1));
        const pool = await request(app).get("/api/listings?q=pool");
        assert.ok(pool.body.total > 0);
    });

    it("treats regex characters in search as plain text", async () => {
        await request(app).get("/api/listings?q=(.*").expect(200);
    });

    it("returns meta for filters", async () => {
        const { body } = await request(app).get("/api/listings/meta").expect(200);
        assert.ok(body.cities.length >= 5);
        assert.ok(body.purposes.rent && body.purposes.sale);
    });

    it("404s for unknown or malformed ids", async () => {
        await request(app).get("/api/listings/000000000000000000000000").expect(404);
        await request(app).get("/api/listings/not-an-id").expect(404);
    });

    it("increments views for visitors", async () => {
        const { body } = await request(app).get("/api/listings?limit=1");
        const id = body.items[0].id;
        const a = await request(app).get(`/api/listings/${id}`);
        const b = await request(app).get(`/api/listings/${id}`);
        assert.equal(b.body.views, a.body.views + 1);
    });

    it("uploads images and rejects non-images", async () => {
        const { agent } = await register(app);
        const ok = await agent.post("/api/uploads").attach("images", PNG, { filename: "a.png", contentType: "image/png" }).expect(201);
        assert.match(ok.body.urls[0], /^\/uploads\/[\w-]+\.png$/);
        await request(app).get(ok.body.urls[0]).expect(200);

        await agent.post("/api/uploads").attach("images", Buffer.from("<script>"), { filename: "x.png", contentType: "image/png" }).expect(400);
        await agent.post("/api/uploads").attach("images", Buffer.from("text"), { filename: "x.txt", contentType: "text/plain" }).expect(400);
    });

    it("creates, updates and deletes an owned listing", async () => {
        const { agent } = await register(app, { name: "Owner Person", phone: undefined });
        const created = await agent.post("/api/listings").send(validListing(["https://images.example.com/a.jpg"])).expect(201);
        const id = created.body.id;
        assert.deepEqual(created.body.coordinates, { lat: 12.98, lng: 80.22 });
        assert.equal(created.body.contact.name, "Owner Person");

        // partial update must not wipe other fields
        const patched = await agent.patch(`/api/listings/${id}`).send({ status: "rented" }).expect(200);
        assert.equal(patched.body.status, "rented");
        assert.deepEqual(patched.body.amenities, ["Lift", "Gym"]);
        assert.equal(patched.body.images.length, 1);

        // rented listings drop out of search
        const search = await request(app).get("/api/listings?q=lake&limit=48");
        assert.ok(!search.body.items.some((l) => l.id === id));

        const mine = await agent.get("/api/me/listings");
        assert.equal(mine.body.items.length, 1);

        await agent.delete(`/api/listings/${id}`).expect(200);
        await request(app).get(`/api/listings/${id}`).expect(404);
    });

    it("validates listings and requires a photo", async () => {
        const { agent } = await register(app);
        const res = await agent.post("/api/listings").send({ ...validListing([]) }).expect(400);
        assert.equal(res.body.errors.images, "Add at least one photo");
        const bad = await agent.post("/api/listings").send({ ...validListing(["javascript:alert(1)"]) }).expect(400);
        assert.ok(bad.body.errors["images.0"]);
    });

    it("prevents editing someone else's listing", async () => {
        const { agent } = await register(app);
        const { body } = await request(app).get("/api/listings?limit=1");
        await agent.patch(`/api/listings/${body.items[0].id}`).send({ price: 1 }).expect(403);
        await agent.delete(`/api/listings/${body.items[0].id}`).expect(403);
    });

    it("compares listings in the requested order", async () => {
        const { body } = await request(app).get("/api/listings?limit=3");
        const ids = body.items.map((l) => l.id).reverse();
        const res = await request(app).get(`/api/listings/compare?ids=${ids.join(",")},bogus`).expect(200);
        assert.deepEqual(res.body.items.map((l) => l.id), ids);
    });

    it("demo owner can log in", async () => {
        await loginAs(app, "owner@homefinder.plus");
    });
});
