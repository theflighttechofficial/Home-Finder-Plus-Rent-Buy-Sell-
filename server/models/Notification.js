const mongoose = require("mongoose");
const { NOTIFICATION_TYPES } = require("../lib/constants");

const notificationSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: NOTIFICATION_TYPES, default: "system" },
        title: { type: String, required: true, maxlength: 140 },
        body: { type: String, maxlength: 400 },
        link: { type: String, maxlength: 300 },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

notificationSchema.set("toJSON", {
    transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});

notificationSchema.statics.notify = function (user, data) {
    return this.create({ user, ...data });
};

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
