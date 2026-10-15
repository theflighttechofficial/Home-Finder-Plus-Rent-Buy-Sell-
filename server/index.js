const config = require("./config");
const db = require("./db");
const { createApp } = require("./app");
const { seedIfEmpty } = require("./seed");

async function main() {
    try {
        await db.connect(config.mongoUri);
    } catch (err) {
        console.error(`Could not connect to MongoDB at ${config.mongoUri}. Is MongoDB running?`);
        console.error(err.message);
        process.exit(1);
    }
    console.log("MongoDB connected");

    if (config.usingDevSecret) console.warn("Using the development JWT secret. Set JWT_SECRET in .env for real deployments.");
    if (config.seedOnStart) await seedIfEmpty();

    const server = createApp().listen(config.port, () => {
        console.log(`HomeFinder+ running at http://localhost:${config.port}`);
    });

    const shutdown = async () => {
        server.close();
        await db.disconnect();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main();
