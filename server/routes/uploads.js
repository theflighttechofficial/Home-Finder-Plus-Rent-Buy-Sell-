const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { imageUpload, verifyImages, publicUrl } = require("../middleware/upload");
const { badRequest } = require("../lib/errors");

const router = express.Router();

// POST /api/uploads — multipart "images" field, returns public URLs
router.post("/", requireAuth, imageUpload.array("images", 12), verifyImages, (req, res) => {
    if (!req.files?.length) throw badRequest("Choose at least one image");
    res.status(201).json({ urls: req.files.map(publicUrl) });
});

module.exports = router;
