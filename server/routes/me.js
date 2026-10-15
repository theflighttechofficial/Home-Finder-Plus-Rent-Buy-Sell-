const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");
const User = require("../models/User");
const Listing = require("../models/Listing");
const Notification = require("../models/Notification");
const { parse } = require("../lib/validate");
const { notFound, badRequest } = require("../lib/errors");
const { requireAuth, signOut } = require("../middleware/auth");
const { imageUpload, verifyImages, publicUrl } = require("../middleware/upload");

const router = express.Router();

// GET /api/me — returns null user for guests so pages can render without a 401
router.get("/", async (req, res) => {
    if (!req.user) return res.json({ user: null });
    res.json({ user: req.user, favourites: req.user.favourites.map(String) });
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

router.patch("/", async (req, res) => {
    const data = parse(profileSchema, req.body);
    req.user.set(data);
    await req.user.save();
    res.json({ user: req.user });
});

router.post("/avatar", imageUpload.single("avatar"), verifyImages, async (req, res) => {
    if (!req.file) throw badRequest("Choose an image to upload");
    req.user.avatar = publicUrl(req.file);
    await req.user.save();
    res.json({ user: req.user });
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(128),
});

router.post("/password", async (req, res) => {
    const data = parse(passwordSchema, req.body);
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.checkPassword(data.currentPassword))) {
        throw badRequest("Current password is incorrect", { currentPassword: "Current password is incorrect" });
    }
    await user.setPassword(data.newPassword);
    await user.save();
    res.json({ success: true, message: "Password updated" });
});

router.delete("/", async (req, res) => {
    const { password } = parse(z.object({ password: z.string().min(1, "Enter your password") }), req.body);
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.checkPassword(password))) throw badRequest("Password is incorrect", { password: "Password is incorrect" });

    const listings = await Listing.find({ owner: user._id }).distinct("_id");
    await Promise.all([
        Listing.deleteMany({ owner: user._id }),
        User.updateMany({ favourites: { $in: listings } }, { $pull: { favourites: { $in: listings } } }),
        Notification.deleteMany({ user: user._id }),
    ]);
    await user.deleteOne();
    signOut(res);
    res.json({ success: true });
});

// Favourites
router.get("/favourites", async (req, res) => {
    const listings = await Listing.find({ _id: { $in: req.user.favourites } });
    const order = new Map(req.user.favourites.map((id, i) => [String(id), i]));
    listings.sort((a, b) => order.get(b.id) - order.get(a.id)); // most recently saved first
    res.json({ items: listings.map((l) => ({ ...l.toJSON(), isFavourite: true })) });
});

router.put("/favourites/:listingId", async (req, res) => {
    const { listingId } = req.params;
    if (!mongoose.isValidObjectId(listingId)) throw notFound();
    const listing = await Listing.findById(listingId);
    if (!listing) throw notFound("Listing not found");

    // timestamps off so modifiedCount reflects whether the favourite was actually new
    const result = await User.updateOne({ _id: req.user._id }, { $addToSet: { favourites: listing._id } }, { timestamps: false });
    if (result.modifiedCount) {
        await Listing.updateOne({ _id: listing._id }, { $inc: { favouritesCount: 1 } });
        if (!listing.owner.equals(req.user._id)) {
            await Notification.notify(listing.owner, {
                type: "favourite",
                title: `${req.user.name} saved your listing`,
                body: listing.title,
                link: `/details.html?id=${listing.id}`,
            });
        }
    }
    res.json({ success: true, isFavourite: true });
});

router.delete("/favourites/:listingId", async (req, res) => {
    const { listingId } = req.params;
    if (!mongoose.isValidObjectId(listingId)) throw notFound();

    const result = await User.updateOne({ _id: req.user._id }, { $pull: { favourites: listingId } }, { timestamps: false });
    if (result.modifiedCount) {
        await Listing.updateOne({ _id: listingId, favouritesCount: { $gt: 0 } }, { $inc: { favouritesCount: -1 } });
    }
    res.json({ success: true, isFavourite: false });
});

// Listings owned by the current user (all statuses)
router.get("/listings", async (req, res) => {
    const items = await Listing.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ items });
});

module.exports = router;
