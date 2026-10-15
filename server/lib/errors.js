class HttpError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

const badRequest = (msg, details) => new HttpError(400, msg, details);
const unauthorized = (msg = "Please log in to continue") => new HttpError(401, msg);
const forbidden = (msg = "You don't have permission to do that") => new HttpError(403, msg);
const notFound = (msg = "Not found") => new HttpError(404, msg);
const conflict = (msg) => new HttpError(409, msg);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict };
