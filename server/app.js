const path = require("path");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const config = require("./config");
const { loadUser } = require("./middleware/auth");
const { sameOrigin } = require("./middleware/security");
const { notFoundHandler, errorHandler } = require("./middleware/errors");

function createApp() {
    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", 1);

    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "https://fonts.googleapis.com"],
                    styleSrcAttr: ["'unsafe-inline'"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "blob:", "https:"],
                    connectSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: config.isProd ? [] : null,
                },
            },
            crossOriginEmbedderPolicy: false,
        })
    );
    app.use(compression());
    if (!config.isTest) app.use(morgan(config.isProd ? "combined" : "dev"));

    app.use(express.json({ limit: "200kb" }));
    app.use(cookieParser());
    app.use(loadUser);

    // API
    const api = express.Router();
    api.use(sameOrigin);
    api.get("/health", (_req, res) => res.json({ ok: true }));
    api.use("/auth", require("./routes/auth"));
    api.use("/me", require("./routes/me"));
    api.use("/listings", require("./routes/listings"));
    api.use("/uploads", require("./routes/uploads"));
    api.use("/conversations", require("./routes/conversations"));
    api.use("/notifications", require("./routes/notifications"));
    app.use("/api", api);

    // Old page names from the first version of the site
    const redirects = { "/home.html": "/about.html", "/logout.html": "/login.html?loggedOut=1" };
    for (const [from, to] of Object.entries(redirects)) app.get(from, (_req, res) => res.redirect(301, to));

    // Static files
    const staticOpts = { maxAge: config.isProd ? "1h" : 0, extensions: ["html"] };
    app.use("/uploads", express.static(config.uploadDir, { maxAge: "7d", fallthrough: false }));
    app.use("/vendor/leaflet", express.static(path.join(path.dirname(require.resolve("leaflet")), ""), { maxAge: "7d" }));
    app.use(express.static(config.publicDir, staticOpts));

    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
