// Vercel serverless entry point. Static files in public/ are served by Vercel's CDN;
// every other request (the /api routes, uploads, 404s, old page redirects) comes here.
let ready; // one shared startup, even when several requests arrive at once

async function init() {
    const config = require("../server/config");
    const { db } = require("../server/db");
    const { createApp } = require("../server/app");
    const { seedIfEmpty } = require("../server/seed");

    if (config.missingProdSecret) {
        console.warn("JWT_SECRET is not set: logins will not survive between instances. Add it in the Vercel project's environment variables.");
    }
    db.open(config.dataFile);
    if (config.seedOnStart) await seedIfEmpty();
    return createApp();
}

module.exports = async (req, res) => {
    let handler;
    try {
        ready ||= init();
        handler = await ready;
    } catch (err) {
        ready = null; // retry on the next request
        console.error(err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(`HomeFinder+ could not start: ${err.message}`);
        return;
    }
    return handler(req, res);
};
