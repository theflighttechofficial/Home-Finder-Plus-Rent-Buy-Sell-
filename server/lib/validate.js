const { badRequest } = require("./errors");

// Parse `data` with a zod schema, throwing a 400 with per-field messages on failure.
function parse(schema, data) {
    const result = schema.safeParse(data);
    if (result.success) return result.data;

    const fields = {};
    for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_";
        if (!fields[key]) fields[key] = issue.message;
    }
    const first = Object.values(fields)[0] || "Invalid input";
    throw badRequest(first, fields);
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { parse, escapeRegex };
