const express = require("express");
const Notification = require("../models/Notification");
const Conversation = require("../models/Conversation");
const { requireAuth } = require("../middleware/auth");
const { notFound } = require("../lib/errors");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
    const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json({ items });
});

// Badge counts for the header
router.get("/counts", async (req, res) => {
    const me = String(req.user._id);
    const [notifications, conversations] = await Promise.all([
        Notification.countDocuments({ user: req.user._id, read: false }),
        Conversation.find({ participants: req.user._id }).select("unread"),
    ]);
    const messages = conversations.reduce((n, c) => n + (c.unread.get(me) || 0), 0);
    res.json({ notifications, messages });
});

router.post("/read-all", async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ success: true });
});

router.patch("/:id", async (req, res) => {
    const n = await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { read: req.body?.read !== false },
        { new: true }
    );
    if (!n) throw notFound();
    res.json(n);
});

router.delete("/:id", async (req, res) => {
    const result = await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
    if (!result.deletedCount) throw notFound();
    res.json({ success: true });
});

router.delete("/", async (req, res) => {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ success: true });
});

module.exports = router;
