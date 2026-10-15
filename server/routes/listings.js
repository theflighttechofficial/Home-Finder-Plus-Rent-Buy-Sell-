const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");
const Listing = require("../models/Listing");
const User = require("../models/User");
const { PURPOSES, PROPERTY_TYPES, FURNISHING, FACING, LISTING_STATUS } = require("../lib/constants");
const { parse, escapeRegex } = require("../lib/validate");
const { notFound, forbidden, badRequest } = require("../lib/errors");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const SORTS = {
    newest: { createdAt: -1 },
    price_asc: { price: 1, createdAt: -1 },
    price_desc: { price: -1, createdAt: -1 },
    rating: { rating: -1, createdAt: -1 },
    popular: { views: -1, createdAt: -1 },
    bedrooms: { bedrooms: -1, price: 1 },
};

const optionalNumber = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0).optional());
const optionalString = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().optional());

const searchSchema = z.object({
    q: optionalString,
    purpose: z.enum(PURPOSES).optional().catch(undefined),
    city: optionalString,
    type: z.enum(PROPERTY_TYPES).optional().catch(undefined),
    furnishing: z.enum(FURNISHING).optional().catch(undefined),
    facing: z.enum(FACING).optional().catch(undefined),
    minPrice: optionalNumber,
    maxPrice: optionalNumber,
    bedrooms: optionalNumber,
    minRating: optionalNumber,
    parking: z.enum(["true", "false"]).optional().catch(undefined),
    amenities: optionalString,
    sort: z.enum(Object.keys(SORTS)).default("newest").catch("newest"),
    page: z.coerce.number().int().min(1).default(1).catch(1),
    limit: z.coerce.number().int().min(1).max(48).default(12).catch(12),
});

const imageUrl = z
    .string()
    .trim()
    .refine((u) => /^\/uploads\/[\w-]+\.(jpg|png|webp|gif)$/.test(u) || /^https:\/\/\S+$/.test(u), "Invalid image URL");

const listingSchema = z.object({
    title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
    description: z.string().trim().max(5000).optional(),
    purpose: z.enum(PURPOSES, "Choose rent or sale"),
    price: z.coerce.number("Enter a price").positive("Price must be greater than 0").max(1e10),
    propertyType: z.enum(PROPERTY_TYPES, "Choose a property type"),
    tag: z.string().trim().max(40).optional(),
    bedrooms: z.coerce.number("Enter the number of bedrooms").int().min(0).max(20),
    bathrooms: z.coerce.number("Enter the number of bathrooms").int().min(0).max(20),
    builtArea: optionalNumber,
    carpetArea: optionalNumber,
    floor: z.string().trim().max(20).optional(),
    totalFloors: optionalNumber,
    facing: z.enum(FACING).optional(),
    furnishing: z.enum(FURNISHING).optional(),
    parking: z.boolean().optional(),
    address: z.object(
        {
            line: z.string().trim().max(200).optional(),
            locality: z.string().trim().max(120).optional(),
            city: z.string("Enter a city").trim().min(2, "Enter a city").max(60),
            state: z.string().trim().max(60).optional(),
            pincode: z.string().trim().max(10).optional(),
        },
        "Enter the address"
    ),
    coordinates: z
        .object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) })
        .nullable()
        .optional(),
    amenities: z.array(z.string().trim().min(1).max(40)).max(40).optional(),
    nearby: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    images: z.array(imageUrl).max(12, "Up to 12 photos").optional(),
    contact: z
        .object({
            name: z.string().trim().max(80).optional(),
            phone: z.string().trim().max(20).optional(),
        })
        .optional(),
    status: z.enum(LISTING_STATUS).optional(),
});

function toDocument(data) {
    const { coordinates, ...rest } = data;
    const doc = { ...rest };
    if (coordinates) doc.location = { type: "Point", coordinates: [coordinates.lng, coordinates.lat] };
    else if (coordinates === null) doc.location = undefined;
    return doc;
}

function buildFilter(q) {
    const filter = { status: "active" };
    if (q.purpose) filter.purpose = q.purpose;
    if (q.type) filter.propertyType = q.type;
    if (q.furnishing) filter.furnishing = q.furnishing;
    if (q.facing) filter.facing = q.facing;
    if (q.city) filter["address.city"] = new RegExp(`^${escapeRegex(q.city)}$`, "i");
    if (q.bedrooms != null) filter.bedrooms = { $gte: q.bedrooms };
    if (q.minRating != null) filter.rating = { $gte: q.minRating };
    if (q.parking) filter.parking = q.parking === "true";
    if (q.minPrice != null || q.maxPrice != null) {
        filter.price = {};
        if (q.minPrice != null) filter.price.$gte = q.minPrice;
        if (q.maxPrice != null) filter.price.$lte = q.maxPrice;
    }
    if (q.amenities) {
        const list = q.amenities.split(",").map((a) => a.trim()).filter(Boolean);
        if (list.length) filter.amenities = { $all: list.map((a) => new RegExp(`^${escapeRegex(a)}$`, "i")) };
    }
    if (q.q) {
        // "2 BHK" / "2bhk" in free text becomes an exact bedroom filter
        const text = q.q.replace(/\b(\d+)\s*bhk\b/i, (_m, n) => {
            filter.bedrooms = Number(n);
            return " ";
        });
        const terms = text.split(/\s+/).filter(Boolean).slice(0, 6);
        if (terms.length) filter.$and = terms.map((term) => {
            const re = new RegExp(escapeRegex(term), "i");
            const or = [
                { title: re },
                { description: re },
                { tag: re },
                { propertyType: re },
                { "address.city": re },
                { "address.locality": re },
                { amenities: re },
            ];
            return { $or: or };
        });
    }
    return filter;
}

const CARD_FIELDS =
    "title purpose price propertyType tag bedrooms bathrooms builtArea furnishing parking rating address images status views favouritesCount createdAt facing";

async function favouriteSet(user) {
    if (!user) return new Set();
    return new Set(user.favourites.map(String));
}

function withFavourite(listings, favs) {
    return listings.map((l) => ({ ...l.toJSON(), isFavourite: favs.has(l.id) }));
}

// GET /api/listings — search, filter, sort and paginate
router.get("/", async (req, res) => {
    const q = parse(searchSchema, req.query);
    const filter = buildFilter(q);

    const [items, total] = await Promise.all([
        Listing.find(filter)
            .select(CARD_FIELDS)
            .sort(SORTS[q.sort])
            .skip((q.page - 1) * q.limit)
            .limit(q.limit),
        Listing.countDocuments(filter),
    ]);

    res.json({
        items: withFavourite(items, await favouriteSet(req.user)),
        total,
        page: q.page,
        pages: Math.max(1, Math.ceil(total / q.limit)),
        limit: q.limit,
    });
});

// GET /api/listings/meta — values for filter dropdowns and the home page
router.get("/meta", async (_req, res) => {
    const [cities, priceStats, amenities, total] = await Promise.all([
        Listing.aggregate([
            { $match: { status: "active" } },
            { $group: { _id: "$address.city", count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
        ]),
        Listing.aggregate([
            { $match: { status: "active" } },
            { $group: { _id: "$purpose", min: { $min: "$price" }, max: { $max: "$price" }, count: { $sum: 1 } } },
        ]),
        Listing.aggregate([
            { $match: { status: "active" } },
            { $unwind: "$amenities" },
            { $group: { _id: "$amenities", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 16 },
        ]),
        Listing.countDocuments({ status: "active" }),
    ]);

    res.json({
        total,
        cities: cities.map((c) => ({ name: c._id, count: c.count })),
        purposes: Object.fromEntries(priceStats.map((p) => [p._id, { min: p.min, max: p.max, count: p.count }])),
        amenities: amenities.map((a) => a._id),
        propertyTypes: PROPERTY_TYPES,
        furnishing: FURNISHING,
        facing: FACING,
    });
});

// GET /api/listings/compare?ids=a,b,c
router.get("/compare", async (req, res) => {
    const ids = String(req.query.ids || "")
        .split(",")
        .filter((id) => mongoose.isValidObjectId(id))
        .slice(0, 4);
    const listings = await Listing.find({ _id: { $in: ids } });
    const order = new Map(ids.map((id, i) => [id, i]));
    listings.sort((a, b) => order.get(a.id) - order.get(b.id));
    res.json({ items: withFavourite(listings, await favouriteSet(req.user)) });
});

// GET /api/listings/:id
router.get("/:id", async (req, res) => {
    const listing = await Listing.findById(req.params.id).populate("owner", "name avatar createdAt city");
    if (!listing) throw notFound("This listing doesn't exist or was removed");

    const isOwner = req.user && listing.owner && listing.owner._id.equals(req.user._id);
    if (listing.status === "inactive" && !isOwner) throw notFound("This listing is no longer available");

    if (!isOwner) await Listing.updateOne({ _id: listing._id }, { $inc: { views: 1 } });

    const favs = await favouriteSet(req.user);
    res.json({ ...listing.toJSON(), isFavourite: favs.has(listing.id), isOwner: Boolean(isOwner) });
});

// GET /api/listings/:id/similar
router.get("/:id/similar", async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) throw notFound();

    const items = await Listing.find({
        _id: { $ne: listing._id },
        status: "active",
        purpose: listing.purpose,
        $or: [{ "address.city": listing.address.city }, { propertyType: listing.propertyType }],
    })
        .select(CARD_FIELDS)
        .sort({ rating: -1, createdAt: -1 })
        .limit(4);

    res.json({ items: withFavourite(items, await favouriteSet(req.user)) });
});

// POST /api/listings
router.post("/", requireAuth, async (req, res) => {
    const data = parse(listingSchema, req.body);
    if (!data.images?.length) throw badRequest("Add at least one photo", { images: "Add at least one photo" });

    const doc = toDocument(data);
    doc.contact = {
        name: data.contact?.name || req.user.name,
        phone: data.contact?.phone || req.user.phone,
        verified: false,
    };
    doc.owner = req.user._id;

    const listing = await Listing.create(doc);
    res.status(201).json(listing);
});

async function loadOwned(req) {
    const listing = await Listing.findById(req.params.id);
    if (!listing) throw notFound();
    if (!listing.owner.equals(req.user._id) && req.user.role !== "admin") throw forbidden("You can only edit your own listings");
    return listing;
}

// PATCH /api/listings/:id — only the fields sent are changed
const updateSchema = listingSchema.partial();

router.patch("/:id", requireAuth, async (req, res) => {
    const listing = await loadOwned(req);
    const data = parse(updateSchema, req.body);
    if (data.images && !data.images.length) throw badRequest("Add at least one photo", { images: "Add at least one photo" });

    const doc = toDocument(data);
    if (data.contact) doc.contact = { ...listing.toObject().contact, ...data.contact };
    listing.set(doc);
    await listing.save();
    res.json(listing);
});

// DELETE /api/listings/:id
router.delete("/:id", requireAuth, async (req, res) => {
    const listing = await loadOwned(req);
    await listing.deleteOne();
    await User.updateMany({ favourites: listing._id }, { $pull: { favourites: listing._id } });
    res.json({ success: true });
});

module.exports = router;
