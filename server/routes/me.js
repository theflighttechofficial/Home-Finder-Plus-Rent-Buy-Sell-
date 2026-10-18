const express = require("express");
const { z } = require("zod");
const { db } = require("../db");
const { hashPassword, checkPassword, publicUser } = require("../models/User");
const { notify } = require("../models/Notification");
const { parse } = require("../lib/validate");
const { notFound, badRequest } = require("../lib/errors");
const { requireAuth, signOut } = require("../middleware/auth");
const { imageUpload, verifyImages, publicUrl } = require("../middleware/upload");

const router = express.Router();

// GET /api/me — returns null user for guests so pages can render without a 401
router.get("/", (req, res) => {
    if (!req.user) return res.json({ user: null });
    res.json({ user: publicUser(req.user), favourites: req.user.favourites || [] });
});

router.use(requireAuth);

const profileSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80).optional(),
    phone: z
        .string()
        .trim()
        .max(20)
        .refine((v) => v === "" || /^[+\d][\d\s-]{6,}$/.test(v), "Enter a valid phone number")
        .optional(),
    city: z.string().trim().max(60).optional(),
    bio: z.string().trim().max(400).optional(),
});

router.patch("/", (req, res) => {
    const data = parse(profileSchema, req.body);
    res.json({ user: publicUser(db.users.update(req.user.id, data)) });
});

router.post("/avatar", imageUpload.single("avatar"), verifyImages, (req, res) => {
    if (!req.file) throw badRequest("Choose an image to upload");
    res.json({ user: publicUser(db.users.update(req.user.id, { avatar: publicUrl(req.file) })) });
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
});

router.post("/password", async (req, res) => {
    const data = parse(passwordSchema, req.body);
    if (!(await checkPassword(req.user, data.currentPassword))) {
        throw badRequest("Current password is incorrect", { currentPassword: "Current password is incorrect" });
    }
    db.users.update(req.user.id, { password: await hashPassword(data.newPassword) });
    res.json({ success: true, message: "Password updated" });
});

router.delete("/", async (req, res) => {
    const { password } = parse(z.object({ password: z.string().min(1, "Enter your password") }), req.body);
    if (!(await checkPassword(req.user, password))) throw badRequest("Password is incorrect", { password: "Password is incorrect" });

    const me = req.user.id;
    const mine = new Set(db.listings.find((l) => l.owner === me).map((l) => l.id));
    db.listings.removeWhere((l) => l.owner === me);
    for (const u of db.users.find((u) => u.favourites?.some((id) => mine.has(id)))) {
        db.users.update(u.id, { favourites: u.favourites.filter((id) => !mine.has(id)) }, { touch: false });
    }
    db.notifications.removeWhere((n) => n.user === me);
    db.users.remove(me);
    signOut(res);
    res.json({ success: true });
});

// Favourites
router.get("/favourites", (req, res) => {
    // most recently saved first
    const items = [...(req.user.favourites || [])].reverse().map((id) => db.listings.get(id)).filter(Boolean);
    res.json({ items: items.map((l) => ({ ...l, isFavourite: true })) });
});

router.put("/favourites/:listingId", (req, res) => {
    const listing = db.listings.get(req.params.listingId);
    if (!listing) throw notFound("Listing not found");

    const favourites = req.user.favourites || [];
    if (!favourites.includes(listing.id)) {
        db.users.update(req.user.id, { favourites: [...favourites, listing.id] }, { touch: false });
        db.listings.update(listing.id, { favouritesCount: (listing.favouritesCount || 0) + 1 }, { touch: false });
        if (listing.owner !== req.user.id) {
            notify(listing.owner, {
                type: "favourite",
                title: `${req.user.name} saved your listing`,
                body: listing.title,
                link: `/details.html?id=${listing.id}`,
            });
        }
    }
    res.json({ success: true, isFavourite: true });
});

router.delete("/favourites/:listingId", (req, res) => {
    const { listingId } = req.params;
    const favourites = req.user.favourites || [];
    if (favourites.includes(listingId)) {
        db.users.update(req.user.id, { favourites: favourites.filter((id) => id !== listingId) }, { touch: false });
        const listing = db.listings.get(listingId);
        if (listing?.favouritesCount > 0) db.listings.update(listingId, { favouritesCount: listing.favouritesCount - 1 }, { touch: false });
    }
    res.json({ success: true, isFavourite: false });
});

// Listings owned by the current user (all statuses), newest first
router.get("/listings", (req, res) => {
    const items = db.listings.find((l) => l.owner === req.user.id).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    res.json({ items });
});

module.exports = router;
