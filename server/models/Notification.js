const { db } = require("../db");

function notify(userId, { type = "system", title, body, link }) {
    return db.notifications.insert({ user: userId, type, title, body, link, read: false });
}

module.exports = { notify };
