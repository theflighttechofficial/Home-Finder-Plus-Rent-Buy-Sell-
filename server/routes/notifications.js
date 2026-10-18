const express = require("express");
const { db } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { notFound } = require("../lib/errors");

const router = express.Router();
router.use(requireAuth);

const newestFirst = (a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0);

router.get("/", (req, res) => {
    const items = db.notifications.find((n) => n.user === req.user.id).sort(newestFirst).slice(0, 100);
    res.json({ items });
});

// Badge counts for the header
router.get("/counts", (req, res) => {
    const me = req.user.id;
    const notifications = db.notifications.count((n) => n.user === me && !n.read);
    const messages = db.conversations.find((c) => c.participants.includes(me)).reduce((n, c) => n + (c.unread?.[me] || 0), 0);
    res.json({ notifications, messages });
});

router.post("/read-all", (req, res) => {
    for (const n of db.notifications.find((n) => n.user === req.user.id && !n.read)) db.notifications.update(n.id, { read: true });
    res.json({ success: true });
});

function loadOwn(req) {
    const n = db.notifications.get(req.params.id);
    if (!n || n.user !== req.user.id) throw notFound();
    return n;
}

router.patch("/:id", (req, res) => {
    const n = loadOwn(req);
    res.json(db.notifications.update(n.id, { read: req.body?.read !== false }));
});

router.delete("/:id", (req, res) => {
    db.notifications.remove(loadOwn(req).id);
    res.json({ success: true });
});

router.delete("/", (req, res) => {
    db.notifications.removeWhere((n) => n.user === req.user.id);
    res.json({ success: true });
});

module.exports = router;
