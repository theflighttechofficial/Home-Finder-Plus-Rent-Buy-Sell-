const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 80 },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        // Stored as a bcrypt hash. Field keeps the original name so existing accounts still work.
        password: { type: String, required: true, select: false },
        phone: { type: String, trim: true, maxlength: 20 },
        city: { type: String, trim: true, maxlength: 60 },
        bio: { type: String, trim: true, maxlength: 400 },
        avatar: { type: String, trim: true },
        favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],
        role: { type: String, enum: ["user", "admin"], default: "user" },
    },
    { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
    this.password = await bcrypt.hash(String(plain), 10);
};

// Returns true when `plain` matches. Accounts created before hashing are upgraded in place.
userSchema.methods.checkPassword = async function (plain) {
    if (!this.password) return false;
    if (this.password.startsWith("$2")) return bcrypt.compare(String(plain), this.password);

    if (this.password !== plain) return false;
    await this.setPassword(plain);
    await this.save();
    return true;
};

userSchema.set("toJSON", {
    transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.favourites;
        return ret;
    },
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
