const path = require("path");
const fs = require("fs");
const User = require("./models/User");
const Listing = require("./models/Listing");
const Notification = require("./models/Notification");

const DEMO_PASSWORD = "Demo@1234";

const DEMO_USERS = [
    { name: "HomeFinder+ Homes", email: "owner@homefinder.plus", phone: "+91 98765 43210", city: "Chennai", bio: "Verified owner & agency account for the demo listings." },
    { name: "Aarav Mehta", email: "buyer@homefinder.plus", phone: "+91 91234 56789", city: "Bangalore", bio: "Looking for a 2–3 BHK near the city." },
];

async function upsertUser(data) {
    let user = await User.findOne({ email: data.email });
    if (!user) {
        user = new User(data);
        await user.setPassword(DEMO_PASSWORD);
        await user.save();
    }
    return user;
}

// Inserts demo users and listings when the listings collection is empty.
async function seedIfEmpty({ force = false, log = console.log } = {}) {
    if (!force && (await Listing.estimatedDocumentCount()) > 0) return false;

    const [owner, buyer] = await Promise.all(DEMO_USERS.map(upsertUser));
    const listings = JSON.parse(fs.readFileSync(path.join(__dirname, "seed", "listings.json"), "utf8"));

    const now = Date.now();
    await Listing.insertMany(
        listings.map((l, i) => ({
            ...l,
            owner: owner._id,
            views: 40 + ((i * 37) % 260),
            createdAt: new Date(now - i * 9 * 60 * 60 * 1000),
            updatedAt: new Date(now - i * 9 * 60 * 60 * 1000),
        }))
    );

    if (!(await Notification.exists({ user: buyer._id }))) {
        await Notification.notify(buyer._id, {
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
    const db = require("./db");
    const force = process.argv.includes("--reset");
    (async () => {
        await db.connect(config.mongoUri);
        if (force) {
            await Promise.all([Listing.deleteMany({}), Notification.deleteMany({})]);
            console.log("Cleared listings and notifications.");
        }
        const seeded = await seedIfEmpty({ force });
        if (!seeded) console.log("Listings already exist; nothing to do. Use `npm run seed -- --reset` to start over.");
        await db.disconnect();
    })().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
