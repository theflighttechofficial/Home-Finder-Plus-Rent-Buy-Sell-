const mongoose = require("mongoose");
const { PURPOSES, PROPERTY_TYPES, FURNISHING, FACING, LISTING_STATUS } = require("../lib/constants");

const listingSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, trim: true, maxlength: 5000 },
        purpose: { type: String, enum: PURPOSES, required: true, default: "rent" },
        price: { type: Number, required: true, min: 0 },
        propertyType: { type: String, enum: PROPERTY_TYPES, required: true },
        tag: { type: String, trim: true, maxlength: 40 },
        bedrooms: { type: Number, min: 0, max: 20, default: 1 },
        bathrooms: { type: Number, min: 0, max: 20, default: 1 },
        builtArea: { type: Number, min: 0 },
        carpetArea: { type: Number, min: 0 },
        floor: { type: String, trim: true, maxlength: 20 },
        totalFloors: { type: Number, min: 0 },
        facing: { type: String, enum: FACING },
        furnishing: { type: String, enum: FURNISHING },
        parking: { type: Boolean, default: false },
        rating: { type: Number, min: 0, max: 5 },
        address: {
            line: { type: String, trim: true, maxlength: 200 },
            locality: { type: String, trim: true, maxlength: 120 },
            city: { type: String, trim: true, required: true, maxlength: 60 },
            state: { type: String, trim: true, maxlength: 60 },
            pincode: { type: String, trim: true, maxlength: 10 },
        },
        location: {
            type: { type: String, enum: ["Point"] },
            coordinates: { type: [Number], default: undefined }, // [lng, lat]
        },
        amenities: [{ type: String, trim: true, maxlength: 40 }],
        nearby: [{ type: String, trim: true, maxlength: 80 }],
        images: [{ type: String, trim: true }],
        contact: {
            name: { type: String, trim: true, maxlength: 80 },
            phone: { type: String, trim: true, maxlength: 20 },
            verified: { type: Boolean, default: false },
        },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        status: { type: String, enum: LISTING_STATUS, default: "active", index: true },
        views: { type: Number, default: 0 },
        favouritesCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

listingSchema.index({ location: "2dsphere" }, { sparse: true });
listingSchema.index({ status: 1, purpose: 1, price: 1 });
listingSchema.index({ "address.city": 1 });
listingSchema.index({ createdAt: -1 });

listingSchema.set("toJSON", {
    transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        if (ret.location && ret.location.coordinates) {
            const [lng, lat] = ret.location.coordinates;
            ret.coordinates = { lat, lng };
        }
        delete ret.location;
        return ret;
    },
});

module.exports = mongoose.models.Listing || mongoose.model("Listing", listingSchema);
