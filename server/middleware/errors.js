const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const config = require("../config");
const { HttpError } = require("../lib/errors");

function notFoundHandler(req, res) {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ success: false, message: "Not found" });
    }
    res.status(404).sendFile(path.join(config.publicDir, "404.html"));
}

function errorHandler(err, req, res, _next) {
    let status = 500;
    let message = "Something went wrong. Please try again.";
    let details;

    if (err instanceof HttpError) {
        ({ status, message, details } = err);
    } else if (err instanceof mongoose.Error.CastError) {
        status = 404;
        message = "Not found";
    } else if (err instanceof mongoose.Error.ValidationError) {
        status = 400;
        details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
        message = Object.values(details)[0];
    } else if (err instanceof multer.MulterError) {
        status = 400;
        message = err.code === "LIMIT_FILE_SIZE" ? `Each image must be under ${config.maxUploadMb} MB` : err.message;
    } else if (err?.type === "entity.parse.failed") {
        status = 400;
        message = "Invalid JSON body";
    } else if (err?.type === "entity.too.large") {
        status = 413;
        message = "Request body too large";
    } else if (err?.code === 11000) {
        status = 409;
        message = "That already exists";
    }

    if (status >= 500 && !config.isTest) console.error(err);

    res.status(status).json({ success: false, message, ...(details ? { errors: details } : {}) });
}

module.exports = { notFoundHandler, errorHandler };
