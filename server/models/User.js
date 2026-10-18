const bcrypt = require("bcryptjs");
const { db } = require("../db");

const hashPassword = (plain) => bcrypt.hash(String(plain), 10);

// Returns true when `plain` matches. Accounts created before hashing are upgraded in place.
async function checkPassword(user, plain) {
    if (!user?.password) return false;
    if (user.password.startsWith("$2")) return bcrypt.compare(String(plain), user.password);

    if (user.password !== plain) return false;
    db.users.update(user.id, { password: await hashPassword(plain) }, { touch: false });
    return true;
}

const normalizeEmail = (email) => String(email).trim().toLowerCase();
const findByEmail = (email) => db.users.findOne((u) => u.email === normalizeEmail(email));

// The user as other people and the browser may see it
function publicUser(u) {
    if (!u) return null;
    const { password: _password, favourites: _favourites, ...rest } = u;
    return rest;
}

// Name and avatar only, for embedding in listings and conversations
const userSummary = (u) => (u ? { id: u.id, name: u.name, avatar: u.avatar } : null);

module.exports = { hashPassword, checkPassword, findByEmail, normalizeEmail, publicUser, userSummary };
