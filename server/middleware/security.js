const { forbidden } = require("../lib/errors");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Blocks cross-site state-changing requests: if the browser sends an Origin, it must match our host.
function sameOrigin(req, _res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.get("origin");
    if (!origin) return next();

    try {
        if (new URL(origin).host === req.get("host")) return next();
    } catch {
        // fall through
    }
    next(forbidden("Cross-site request blocked"));
}

module.exports = { sameOrigin };
