const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const { unauthorized } = require("../lib/errors");

const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    path: "/",
};

function signIn(res, user) {
    const token = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    res.cookie(config.cookieName, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function signOut(res) {
    res.clearCookie(config.cookieName, cookieOptions);
}

// Attaches req.user when a valid session cookie is present. Never rejects.
async function loadUser(req, res, next) {
    const token = req.cookies?.[config.cookieName];
    if (!token) return next();

    try {
        const { sub } = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(sub);
        if (user) req.user = user;
        else signOut(res);
    } catch {
        signOut(res);
    }
    next();
}

function requireAuth(req, _res, next) {
    if (!req.user) return next(unauthorized());
    next();
}

module.exports = { signIn, signOut, loadUser, requireAuth };
