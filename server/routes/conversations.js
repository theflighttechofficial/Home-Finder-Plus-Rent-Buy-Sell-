const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Listing = require("../models/Listing");
const Notification = require("../models/Notification");
const { parse } = require("../lib/validate");
const { notFound, badRequest } = require("../lib/errors");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const textSchema = z.object({ text: z.string().trim().min(1, "Message can't be empty").max(2000) });
const startSchema = textSchema.extend({ listingId: z.string().refine(mongoose.isValidObjectId, "Invalid listing") });

function summarize(conv, me) {
    const other = conv.participants.find((p) => !p._id.equals(me)) || conv.participants[0];
    return {
        id: conv.id,
        other: other ? { id: other.id, name: other.name, avatar: other.avatar } : null,
        listing: conv.listing
            ? { id: conv.listing.id, title: conv.listing.title, image: conv.listing.images?.[0], price: conv.listing.price, purpose: conv.listing.purpose }
            : null,
        lastMessage: conv.lastMessage?.text
            ? { text: conv.lastMessage.text, at: conv.lastMessage.at, mine: conv.lastMessage.sender?.equals(me) }
            : null,
        unread: conv.unread.get(String(me)) || 0,
        updatedAt: conv.updatedAt,
    };
}

async function loadConversation(req) {
    const conv = await Conversation.findOne({ _id: req.params.id, participants: req.user._id })
        .populate("participants", "name avatar")
        .populate("listing", "title images price purpose");
    if (!conv) throw notFound("Conversation not found");
    return conv;
}

async function addMessage(conv, sender, text) {
    const message = await Message.create({ conversation: conv._id, sender: sender._id, text });
    conv.lastMessage = { text, sender: sender._id, at: message.createdAt };
    for (const p of conv.participants) {
        const id = String(p._id || p);
        if (id !== String(sender._id)) conv.unread.set(id, (conv.unread.get(id) || 0) + 1);
    }
    await conv.save();

    const recipients = conv.participants.filter((p) => String(p._id || p) !== String(sender._id));
    await Promise.all(
        recipients.map((r) =>
            Notification.notify(r._id || r, {
                type: "message",
                title: `New message from ${sender.name}`,
                body: text.length > 120 ? text.slice(0, 117) + "…" : text,
                link: `/messages.html?c=${conv.id}`,
            })
        )
    );
    return message;
}

// GET /api/conversations
router.get("/", async (req, res) => {
    const convs = await Conversation.find({ participants: req.user._id })
        .sort({ updatedAt: -1 })
        .populate("participants", "name avatar")
        .populate("listing", "title images price purpose");
    res.json({ items: convs.map((c) => summarize(c, req.user._id)) });
});

// POST /api/conversations — contact a listing owner (re-uses an existing thread)
router.post("/", async (req, res) => {
    const data = parse(startSchema, req.body);
    const listing = await Listing.findById(data.listingId);
    if (!listing) throw notFound("Listing not found");
    if (listing.owner.equals(req.user._id)) throw badRequest("This is your own listing");

    let conv = await Conversation.findOne({
        listing: listing._id,
        participants: { $all: [req.user._id, listing.owner] },
    });
    if (!conv) conv = await Conversation.create({ listing: listing._id, participants: [req.user._id, listing.owner] });

    await conv.populate("participants", "name avatar");
    await addMessage(conv, req.user, data.text);
    await conv.populate("listing", "title images price purpose");
    res.status(201).json(summarize(conv, req.user._id));
});

// GET /api/conversations/:id/messages?after=<iso date>
router.get("/:id/messages", async (req, res) => {
    const conv = await loadConversation(req);
    const filter = { conversation: conv._id };
    const after = req.query.after ? new Date(String(req.query.after)) : null;
    if (after && !isNaN(after)) filter.createdAt = { $gt: after };

    const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(500);

    const me = String(req.user._id);
    if (conv.unread.get(me)) {
        conv.unread.set(me, 0);
        await Conversation.updateOne({ _id: conv._id }, { $set: { [`unread.${me}`]: 0 } }, { timestamps: false });
    }

    res.json({
        conversation: summarize(conv, req.user._id),
        items: messages.map((m) => ({ ...m.toJSON(), mine: m.sender.equals(req.user._id) })),
    });
});

// POST /api/conversations/:id/messages
router.post("/:id/messages", async (req, res) => {
    const { text } = parse(textSchema, req.body);
    const conv = await loadConversation(req);
    const message = await addMessage(conv, req.user, text);
    res.status(201).json({ ...message.toJSON(), mine: true });
});

module.exports = router;
