const express = require("express");
const { z } = require("zod");
const { db, isId } = require("../db");
const { userSummary } = require("../models/User");
const { notify } = require("../models/Notification");
const { parse } = require("../lib/validate");
const { notFound, badRequest } = require("../lib/errors");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const textSchema = z.object({ text: z.string().trim().min(1, "Message can't be empty").max(2000) });
const startSchema = textSchema.extend({ listingId: z.string().refine(isId, "Invalid listing") });

function summarize(conv, me) {
    const otherId = conv.participants.find((p) => p !== me) || conv.participants[0];
    const listing = conv.listing ? db.listings.get(conv.listing) : null;
    return {
        id: conv.id,
        other: userSummary(db.users.get(otherId)),
        listing: listing ? { id: listing.id, title: listing.title, image: listing.images?.[0], price: listing.price, purpose: listing.purpose } : null,
        lastMessage: conv.lastMessage ? { text: conv.lastMessage.text, at: conv.lastMessage.at, mine: conv.lastMessage.sender === me } : null,
        unread: conv.unread?.[me] || 0,
        updatedAt: conv.updatedAt,
    };
}

function loadConversation(req) {
    const conv = db.conversations.get(req.params.id);
    if (!conv || !conv.participants.includes(req.user.id)) throw notFound("Conversation not found");
    return conv;
}

const asMessage = (m, me) => ({ ...m, mine: m.sender === me });

function addMessage(conv, sender, text) {
    const message = db.messages.insert({ conversation: conv.id, sender: sender.id, text });
    const updated = db.conversations.mutate(conv.id, (c) => {
        c.lastMessage = { text, sender: sender.id, at: message.createdAt };
        c.unread ||= {};
        for (const p of c.participants) if (p !== sender.id) c.unread[p] = (c.unread[p] || 0) + 1;
    });

    for (const p of conv.participants) {
        if (p === sender.id) continue;
        notify(p, {
            type: "message",
            title: `New message from ${sender.name}`,
            body: text.length > 120 ? text.slice(0, 117) + "…" : text,
            link: `/messages.html?c=${conv.id}`,
        });
    }
    return { message, conv: updated };
}

// GET /api/conversations
router.get("/", (req, res) => {
    const me = req.user.id;
    const convs = db.conversations.find((c) => c.participants.includes(me)).sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
    res.json({ items: convs.map((c) => summarize(c, me)) });
});

// POST /api/conversations — contact a listing owner (re-uses an existing thread)
router.post("/", (req, res) => {
    const data = parse(startSchema, req.body);
    const me = req.user.id;
    const listing = db.listings.get(data.listingId);
    if (!listing) throw notFound("Listing not found");
    if (listing.owner === me) throw badRequest("This is your own listing");

    let conv = db.conversations.findOne((c) => c.listing === listing.id && c.participants.includes(me) && c.participants.includes(listing.owner));
    if (!conv) conv = db.conversations.insert({ listing: listing.id, participants: [me, listing.owner], unread: {} });

    ({ conv } = addMessage(conv, req.user, data.text));
    res.status(201).json(summarize(conv, me));
});

// GET /api/conversations/:id/messages?after=<iso date>
router.get("/:id/messages", (req, res) => {
    const me = req.user.id;
    let conv = loadConversation(req);
    const after = req.query.after ? new Date(String(req.query.after)) : null;
    const afterIso = after && !isNaN(after) ? after.toISOString() : null;

    const messages = db.messages
        .find((m) => m.conversation === conv.id && (!afterIso || m.createdAt > afterIso))
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
        .slice(-500);

    if (conv.unread?.[me]) conv = db.conversations.mutate(conv.id, (c) => void (c.unread[me] = 0), { touch: false });

    res.json({ conversation: summarize(conv, me), items: messages.map((m) => asMessage(m, me)) });
});

// POST /api/conversations/:id/messages
router.post("/:id/messages", (req, res) => {
    const { text } = parse(textSchema, req.body);
    const conv = loadConversation(req);
    const { message } = addMessage(conv, req.user, text);
    res.status(201).json(asMessage(message, req.user.id));
});

module.exports = router;
