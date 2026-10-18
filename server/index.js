const config = require("./config");
const { db } = require("./db");
const { createApp } = require("./app");
const { seedIfEmpty } = require("./seed");

async function main() {
    try {
        db.open(config.dataFile);
    } catch (err) {
        console.error(`Could not read the data file at ${config.dataFile}.`);
        console.error(err.message);
        process.exit(1);
    }
    console.log(`Data file: ${config.dataFile}`);

    if (config.usingDevSecret) console.warn("Using the development JWT secret. Set JWT_SECRET in .env for real deployments.");
    if (config.seedOnStart) await seedIfEmpty();

    const server = createApp().listen(config.port, () => {
        console.log(`HomeFinder+ running at http://localhost:${config.port}`);
    });

    const shutdown = () => {
        server.close();
        db.close();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main();
