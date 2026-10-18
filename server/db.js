// A small embedded document store: all data lives in memory and is saved to one JSON file.
// No database server to install. Fine for a single app instance and thousands of records.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const COLLECTIONS = ["users", "listings", "conversations", "messages", "notifications"];

const newId = () => crypto.randomBytes(12).toString("hex");
const isId = (v) => typeof v === "string" && /^[a-f0-9]{24}$/.test(v);
const clone = (v) => (v === undefined ? v : structuredClone(v));

class Collection {
    constructor(db, name) {
        this.db = db;
        this.name = name;
        this.docs = new Map();
    }

    get(id) {
        return isId(id) ? clone(this.docs.get(id)) ?? null : null;
    }

    find(pred = () => true) {
        const out = [];
        for (const doc of this.docs.values()) if (pred(doc)) out.push(clone(doc));
        return out;
    }

    findOne(pred) {
        for (const doc of this.docs.values()) if (pred(doc)) return clone(doc);
        return null;
    }

    count(pred = () => true) {
        let n = 0;
        for (const doc of this.docs.values()) if (pred(doc)) n++;
        return n;
    }

    insert(data) {
        const now = new Date().toISOString();
        const doc = { createdAt: now, ...clone(data), id: data.id || newId(), updatedAt: data.updatedAt || now };
        this.docs.set(doc.id, doc);
        this.db.changed();
        return clone(doc);
    }

    // Shallow-merges `patch` into the document. Returns the updated document or null.
    update(id, patch, { touch = true } = {}) {
        const doc = this.docs.get(id);
        if (!doc) return null;
        for (const [k, v] of Object.entries(clone(patch))) {
            if (v === undefined) delete doc[k];
            else doc[k] = v;
        }
        if (touch) doc.updatedAt = new Date().toISOString();
        this.db.changed();
        return clone(doc);
    }

    // Calls fn(doc) on the stored document so it can be changed in place.
    mutate(id, fn, { touch = true } = {}) {
        const doc = this.docs.get(id);
        if (!doc) return null;
        const changed = fn(doc) !== false;
        if (changed) {
            if (touch) doc.updatedAt = new Date().toISOString();
            this.db.changed();
        }
        return clone(doc);
    }

    remove(id) {
        const ok = this.docs.delete(id);
        if (ok) this.db.changed();
        return ok;
    }

    removeWhere(pred) {
        let n = 0;
        for (const [id, doc] of this.docs) if (pred(doc)) this.docs.delete(id) && n++;
        if (n) this.db.changed();
        return n;
    }

    clear() {
        this.docs.clear();
        this.db.changed();
    }
}

class Database {
    constructor() {
        for (const name of COLLECTIONS) this[name] = new Collection(this, name);
        this.file = null;
        this.timer = null;
    }

    // file: path to the JSON file, or ":memory:" to keep everything in memory (tests).
    open(file) {
        this.file = file === ":memory:" ? null : path.resolve(file);
        for (const name of COLLECTIONS) this[name].docs.clear();
        if (!this.file) return this;

        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        if (fs.existsSync(this.file)) {
            const data = JSON.parse(fs.readFileSync(this.file, "utf8"));
            for (const name of COLLECTIONS) for (const doc of data[name] || []) this[name].docs.set(doc.id, doc);
        }
        return this;
    }

    changed() {
        if (!this.file || this.timer) return;
        this.timer = setTimeout(() => this.flush(), 200);
    }

    // Writes to a temp file and renames it, so a crash never leaves a half-written database.
    flush() {
        clearTimeout(this.timer);
        this.timer = null;
        if (!this.file) return;
        const data = Object.fromEntries(COLLECTIONS.map((name) => [name, [...this[name].docs.values()]]));
        const tmp = `${this.file}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(data));
        fs.renameSync(tmp, this.file);
    }

    close() {
        this.flush();
    }
}

const db = new Database();

module.exports = { db, isId, newId };
