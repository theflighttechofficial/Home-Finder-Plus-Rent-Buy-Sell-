const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const config = require("../config");
const { badRequest } = require("../lib/errors");

const EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + EXTENSIONS[file.mimetype]),
});

const imageUpload = multer({
    storage,
    limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 12 },
    fileFilter: (_req, file, cb) => {
        if (EXTENSIONS[file.mimetype]) return cb(null, true);
        cb(badRequest("Only JPEG, PNG, WebP or GIF images are allowed"));
    },
});

// Checks the file's magic bytes so a renamed non-image can't be served from /uploads.
function verifyImages(req, _res, next) {
    const files = req.files || (req.file ? [req.file] : []);
    for (const file of files) {
        const head = Buffer.alloc(12);
        const fd = fs.openSync(file.path, "r");
        fs.readSync(fd, head, 0, 12, 0);
        fs.closeSync(fd);

        const ok =
            (head[0] === 0xff && head[1] === 0xd8) ||
            head.subarray(0, 4).toString("hex") === "89504e47" ||
            (head.subarray(0, 4).toString() === "RIFF" && head.subarray(8, 12).toString() === "WEBP") ||
            head.subarray(0, 3).toString() === "GIF";

        if (!ok) {
            files.forEach((f) => fs.rm(f.path, { force: true }, () => {}));
            return next(badRequest("One of the files is not a valid image"));
        }
    }
    next();
}

const publicUrl = (file) => "/uploads/" + path.basename(file.path);

module.exports = { imageUpload, verifyImages, publicUrl };
