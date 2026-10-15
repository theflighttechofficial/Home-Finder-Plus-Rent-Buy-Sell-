const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
    {
        listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
        participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
        lastMessage: {
            text: String,
            sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            at: Date,
        },
        // userId -> number of unread messages for that participant
        unread: { type: Map, of: Number, default: {} },
    },
    { timestamps: true }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ listing: 1, participants: 1 });

module.exports = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
