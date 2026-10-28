// Vercel serverless entry point. Static files in public/ are served by Vercel's CDN;
// every other request (the /api routes, uploads, 404s, old page redirects) comes here.
let ready; // one shared startup, even when several requests arrive at once

async function init() {
    const config = require("../server/config"); // throws if JWT_SECRET is missing in production
    const { db } = require("../server/db");
    const { createApp } = require("../server/app");
    const { seedIfEmpty } = require("../server/seed");

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
        ready = null; // retry on the next request, e.g. after the env var is added
        console.error(err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(`HomeFinder+ could not start: ${err.message}`);
        return;
    }
    return handler(req, res);
};
