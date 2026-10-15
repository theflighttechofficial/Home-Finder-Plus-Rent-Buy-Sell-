const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, loginAs, register, request } = require("./helpers");

describe("favourites, messages and notifications", () => {
    let app, owner, buyer, listingId;

    before(async () => {
        app = await setup();
        owner = await loginAs(app, "owner@homefinder.plus");
        buyer = (await register(app, { name: "Buyer Bee" })).agent;
        const { body } = await request(app).get("/api/listings?limit=1");
        listingId = body.items[0].id;
    });
    after(teardown);

    it("saves and removes favourites, notifying the owner once", async () => {
        await buyer.put(`/api/me/favourites/${listingId}`).expect(200);
        await buyer.put(`/api/me/favourites/${listingId}`).expect(200); // idempotent

        const favs = await buyer.get("/api/me/favourites");
        assert.deepEqual(favs.body.items.map((l) => l.id), [listingId]);

        const listing = await buyer.get(`/api/listings/${listingId}`);
        assert.equal(listing.body.isFavourite, true);
        assert.equal(listing.body.favouritesCount, 1);

        const notes = await owner.get("/api/notifications");
        assert.equal(notes.body.items.filter((n) => n.type === "favourite").length, 1);

        await buyer.delete(`/api/me/favourites/${listingId}`).expect(200);
        const after = await buyer.get("/api/me/favourites");
        assert.equal(after.body.items.length, 0);
    });

    it("runs a conversation between buyer and owner", async () => {
        const start = await buyer.post("/api/conversations").send({ listingId, text: "Is this available?" }).expect(201);
        const convId = start.body.id;

        // contacting again re-uses the same thread
        const again = await buyer.post("/api/conversations").send({ listingId, text: "Hello again" }).expect(201);
        assert.equal(again.body.id, convId);

        let counts = await owner.get("/api/notifications/counts");
        assert.equal(counts.body.messages, 2);

        const thread = await owner.get(`/api/conversations/${convId}/messages`);
        assert.equal(thread.body.items.length, 2);
        assert.equal(thread.body.items[0].mine, false);
        assert.equal(thread.body.conversation.other.name, "Buyer Bee");

        counts = await owner.get("/api/notifications/counts");
        assert.equal(counts.body.messages, 0);

        const reply = await owner.post(`/api/conversations/${convId}/messages`).send({ text: "Yes! Come Saturday." }).expect(201);
        const after = await buyer.get(`/api/conversations/${convId}/messages?after=${encodeURIComponent(thread.body.items[1].createdAt)}`);
        assert.deepEqual(after.body.items.map((m) => m.id), [reply.body.id]);
    });

    it("keeps conversations private to participants", async () => {
        const stranger = (await register(app)).agent;
        const { body } = await buyer.get("/api/conversations");
        await stranger.get(`/api/conversations/${body.items[0].id}/messages`).expect(404);
        await stranger.post(`/api/conversations/${body.items[0].id}/messages`).send({ text: "hi" }).expect(404);
    });

    it("won't let owners message their own listing", async () => {
        await owner.post("/api/conversations").send({ listingId, text: "me" }).expect(400);
    });

    it("marks notifications read and deletes them", async () => {
        const { body } = await owner.get("/api/notifications");
        assert.ok(body.items.length > 0);
        await owner.post("/api/notifications/read-all").expect(200);
        const counts = await owner.get("/api/notifications/counts");
        assert.equal(counts.body.notifications, 0);
        await owner.delete(`/api/notifications/${body.items[0].id}`).expect(200);
        await buyer.delete(`/api/notifications/${body.items[1].id}`).expect(404);
    });

    it("updates profile and password", async () => {
        const { agent, body } = await register(app);
        const res = await agent.patch("/api/me").send({ phone: "+91 98765 43210", city: "Pune" }).expect(200);
        assert.equal(res.body.user.city, "Pune");
        await agent.patch("/api/me").send({ phone: "abc" }).expect(400);

        await agent.post("/api/me/password").send({ currentPassword: "wrong", newPassword: "NewPassword1" }).expect(400);
        await agent.post("/api/me/password").send({ currentPassword: body.password, newPassword: "NewPassword1" }).expect(200);
        await request(app).post("/api/auth/login").send({ email: body.email, password: "NewPassword1" }).expect(200);
    });

    it("deletes an account and its listings", async () => {
        const { agent, body } = await register(app);
        await agent.post("/api/listings").send({
            title: "Zyxwv listing here", purpose: "sale", price: 5000000, propertyType: "Villa", bedrooms: 3, bathrooms: 2,
            address: { city: "Pune" }, images: ["https://images.example.com/x.jpg"],
        }).expect(201);
        await agent.delete("/api/me").send({ password: "wrong" }).expect(400);
        await agent.delete("/api/me").send({ password: body.password }).expect(200);
        const search = await request(app).get("/api/listings?q=Zyxwv");
        assert.equal(search.body.total, 0);
        await request(app).post("/api/auth/login").send({ email: body.email, password: body.password }).expect(401);
    });
});
