const path = require("path");
const fs = require("fs");
const { db } = require("./db");
const { hashPassword, findByEmail } = require("./models/User");
const { notify } = require("./models/Notification");

const DEMO_PASSWORD = "Demo@1234";

const DEMO_USERS = [
    { name: "HomeFinder+ Homes", email: "owner@homefinder.plus", phone: "+91 98765 43210", city: "Chennai", bio: "Verified owner & agency account for the demo listings." },
    { name: "Aarav Mehta", email: "buyer@homefinder.plus", phone: "+91 91234 56789", city: "Bangalore", bio: "Looking for a 2–3 BHK near the city." },
];

async function upsertUser(data) {
    return findByEmail(data.email) || db.users.insert({ ...data, password: await hashPassword(DEMO_PASSWORD), favourites: [], role: "user" });
}

// Inserts demo users and listings when there are no listings yet.
async function seedIfEmpty({ force = false, log = console.log } = {}) {
    if (!force && db.listings.count() > 0) return false;

    const owner = await upsertUser(DEMO_USERS[0]);
    const buyer = await upsertUser(DEMO_USERS[1]);
    const listings = JSON.parse(fs.readFileSync(path.join(__dirname, "seed", "listings.json"), "utf8"));

    const now = Date.now();
    listings.forEach(({ location, ...l }, i) => {
        const at = new Date(now - i * 9 * 60 * 60 * 1000).toISOString();
        db.listings.insert({
            ...l,
            coordinates: location ? { lat: location.coordinates[1], lng: location.coordinates[0] } : undefined,
            status: "active",
            owner: owner.id,
            views: 40 + ((i * 37) % 260),
            favouritesCount: 0,
            createdAt: at,
            updatedAt: at,
        });
    });

    if (!db.notifications.count((n) => n.user === buyer.id)) {
        notify(buyer.id, {
            type: "system",
            title: "Welcome to HomeFinder+",
            body: "Tap the heart on any home to save it, or message an owner straight from the listing.",
            link: "/",
        });
    }

    log(`Seeded ${listings.length} listings. Demo logins: ${DEMO_USERS.map((u) => u.email).join(", ")} / ${DEMO_PASSWORD}`);
    return true;
}

module.exports = { seedIfEmpty, DEMO_PASSWORD, DEMO_USERS };

if (require.main === module) {
    const config = require("./config");
    const reset = process.argv.includes("--reset");
    (async () => {
        db.open(config.dataFile);
        if (reset) {
            for (const name of ["users", "listings", "conversations", "messages", "notifications"]) db[name].clear();
            console.log("Cleared all data.");
        }
        const seeded = await seedIfEmpty({ force: reset });
        if (!seeded) console.log("Listings already exist; nothing to do. Use `npm run seed -- --reset` to start over.");
        db.close();
    })().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
