const express = require("express");
const { z } = require("zod");
const { db } = require("../db");
const { userSummary } = require("../models/User");
const { PURPOSES, PROPERTY_TYPES, FURNISHING, FACING, LISTING_STATUS } = require("../lib/constants");
const { parse } = require("../lib/validate");
const { notFound, forbidden, badRequest } = require("../lib/errors");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Comparators: each returns <0 when a should come first
const byNewest = (a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0);
const desc = (field) => (a, b) => (b[field] ?? -Infinity) - (a[field] ?? -Infinity) || byNewest(a, b);
const SORTS = {
    newest: byNewest,
    price_asc: (a, b) => a.price - b.price || byNewest(a, b),
    price_desc: desc("price"),
    rating: desc("rating"),
    popular: desc("views"),
    bedrooms: (a, b) => b.bedrooms - a.bedrooms || a.price - b.price,
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

const lower = (v) => String(v ?? "").toLowerCase();

// Turns validated search params into a predicate over listings
function buildFilter(q) {
    const tests = [(l) => l.status === "active"];
    if (q.purpose) tests.push((l) => l.purpose === q.purpose);
    if (q.type) tests.push((l) => l.propertyType === q.type);
    if (q.furnishing) tests.push((l) => l.furnishing === q.furnishing);
    if (q.facing) tests.push((l) => l.facing === q.facing);
    if (q.city) tests.push((l) => lower(l.address?.city) === lower(q.city));
    if (q.minRating != null) tests.push((l) => (l.rating ?? 0) >= q.minRating);
    if (q.parking) tests.push((l) => Boolean(l.parking) === (q.parking === "true"));
    if (q.minPrice != null) tests.push((l) => l.price >= q.minPrice);
    if (q.maxPrice != null) tests.push((l) => l.price <= q.maxPrice);
    if (q.amenities) {
        const wanted = q.amenities.split(",").map((a) => lower(a.trim())).filter(Boolean);
        if (wanted.length) tests.push((l) => {
            const have = new Set((l.amenities || []).map(lower));
            return wanted.every((a) => have.has(a));
        });
    }

    let exactBedrooms = null;
    if (q.q) {
        // "2 BHK" / "2bhk" in free text becomes an exact bedroom filter
        const text = q.q.replace(/\b(\d+)\s*bhk\b/i, (_m, n) => {
            exactBedrooms = Number(n);
            return " ";
        });
        const terms = text.split(/\s+/).filter(Boolean).slice(0, 6).map(lower);
        if (terms.length) tests.push((l) => {
            const haystack = lower([l.title, l.description, l.tag, l.propertyType, l.address?.city, l.address?.locality, ...(l.amenities || [])].join(" \u0000 "));
            return terms.every((t) => haystack.includes(t));
        });
    }
    if (exactBedrooms != null) tests.push((l) => l.bedrooms === exactBedrooms);
    else if (q.bedrooms != null) tests.push((l) => l.bedrooms >= q.bedrooms);

    return (l) => tests.every((t) => t(l));
}

const CARD_FIELDS = ["id", "title", "purpose", "price", "propertyType", "tag", "bedrooms", "bathrooms", "builtArea", "furnishing", "parking", "rating", "address", "images", "status", "views", "favouritesCount", "createdAt", "facing"];

const card = (l) => Object.fromEntries(CARD_FIELDS.filter((k) => l[k] !== undefined).map((k) => [k, l[k]]));
const favouriteSet = (user) => new Set(user?.favourites || []);
const withFavourite = (listings, user, shape = (l) => l) => {
    const favs = favouriteSet(user);
    return listings.map((l) => ({ ...shape(l), isFavourite: favs.has(l.id) }));
};

// GET /api/listings — search, filter, sort and paginate
router.get("/", (req, res) => {
    const q = parse(searchSchema, req.query);
    const matches = db.listings.find(buildFilter(q)).sort(SORTS[q.sort]);
    const items = matches.slice((q.page - 1) * q.limit, q.page * q.limit);

    res.json({
        items: withFavourite(items, req.user, card),
        total: matches.length,
        page: q.page,
        pages: Math.max(1, Math.ceil(matches.length / q.limit)),
        limit: q.limit,
    });
});

// GET /api/listings/meta — values for filter dropdowns and the home page
router.get("/meta", (_req, res) => {
    const active = db.listings.find((l) => l.status === "active");
    const cities = new Map();
    const purposes = {};
    const amenities = new Map();
    for (const l of active) {
        const city = l.address?.city;
        if (city) cities.set(city, (cities.get(city) || 0) + 1);
        const p = (purposes[l.purpose] ??= { min: l.price, max: l.price, count: 0 });
        p.min = Math.min(p.min, l.price);
        p.max = Math.max(p.max, l.price);
        p.count++;
        for (const a of l.amenities || []) amenities.set(a, (amenities.get(a) || 0) + 1);
    }

    res.json({
        total: active.length,
        cities: [...cities].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
        purposes,
        amenities: [...amenities].sort((a, b) => b[1] - a[1]).slice(0, 16).map(([name]) => name),
        propertyTypes: PROPERTY_TYPES,
        furnishing: FURNISHING,
        facing: FACING,
    });
});

// GET /api/listings/compare?ids=a,b,c
router.get("/compare", (req, res) => {
    const ids = String(req.query.ids || "").split(",").slice(0, 4);
    const listings = ids.map((id) => db.listings.get(id)).filter(Boolean);
    res.json({ items: withFavourite(listings, req.user) });
});

// GET /api/listings/:id
router.get("/:id", (req, res) => {
    let listing = db.listings.get(req.params.id);
    if (!listing) throw notFound("This listing doesn't exist or was removed");

    const isOwner = Boolean(req.user && listing.owner === req.user.id);
    if (listing.status === "inactive" && !isOwner) throw notFound("This listing is no longer available");

    if (!isOwner) listing = db.listings.update(listing.id, { views: (listing.views || 0) + 1 }, { touch: false });

    const owner = db.users.get(listing.owner);
    res.json({
        ...listing,
        owner: owner ? { ...userSummary(owner), city: owner.city, createdAt: owner.createdAt } : null,
        isFavourite: favouriteSet(req.user).has(listing.id),
        isOwner,
    });
});

// GET /api/listings/:id/similar
router.get("/:id/similar", (req, res) => {
    const listing = db.listings.get(req.params.id);
    if (!listing) throw notFound();

    const items = db.listings
        .find((l) => l.id !== listing.id && l.status === "active" && l.purpose === listing.purpose &&
            (l.address?.city === listing.address?.city || l.propertyType === listing.propertyType))
        .sort(SORTS.rating)
        .slice(0, 4);

    res.json({ items: withFavourite(items, req.user, card) });
});

// POST /api/listings
router.post("/", requireAuth, (req, res) => {
    const data = parse(listingSchema, req.body);
    if (!data.images?.length) throw badRequest("Add at least one photo", { images: "Add at least one photo" });

    const listing = db.listings.insert({
        description: "",
        amenities: [],
        nearby: [],
        parking: false,
        ...withoutNull(data),
        status: data.status || "active",
        contact: { name: data.contact?.name || req.user.name, phone: data.contact?.phone || req.user.phone, verified: false },
        owner: req.user.id,
        views: 0,
        favouritesCount: 0,
    });
    res.status(201).json(listing);
});

// Fields sent as null are removed (e.g. clearing the map pin)
const withoutNull = (data) => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v]));

function loadOwned(req) {
    const listing = db.listings.get(req.params.id);
    if (!listing) throw notFound();
    if (listing.owner !== req.user.id && req.user.role !== "admin") throw forbidden("You can only edit your own listings");
    return listing;
}

// PATCH /api/listings/:id — only the fields sent are changed
const updateSchema = listingSchema.partial();

router.patch("/:id", requireAuth, (req, res) => {
    const listing = loadOwned(req);
    const data = parse(updateSchema, req.body);
    if (data.images && !data.images.length) throw badRequest("Add at least one photo", { images: "Add at least one photo" });

    const patch = withoutNull(data);
    if (data.contact) patch.contact = { ...listing.contact, ...data.contact };
    res.json(db.listings.update(listing.id, patch));
});

// DELETE /api/listings/:id
router.delete("/:id", requireAuth, (req, res) => {
    const listing = loadOwned(req);
    db.listings.remove(listing.id);
    for (const u of db.users.find((u) => u.favourites?.includes(listing.id))) {
        db.users.update(u.id, { favourites: u.favourites.filter((id) => id !== listing.id) }, { touch: false });
    }
    res.json({ success: true });
});

module.exports = router;
