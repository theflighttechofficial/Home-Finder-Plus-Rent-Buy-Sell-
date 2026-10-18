const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const config = require("../config");
const { db } = require("../db");
const { hashPassword, checkPassword, findByEmail, publicUser } = require("../models/User");
const { notify } = require("../models/Notification");
const { parse } = require("../lib/validate");
const { unauthorized, conflict } = require("../lib/errors");
const { signIn, signOut } = require("../middleware/auth");

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.isTest ? 1000 : 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts. Please wait a few minutes and try again." },
});

const email = z.email("Please enter a valid email address").trim().toLowerCase();

const registerSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email,
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const loginSchema = z.object({
    email,
    password: z.string().min(1, "Please enter your password"),
});

router.post("/register", authLimiter, async (req, res) => {
    const data = parse(registerSchema, req.body);

    if (findByEmail(data.email)) throw conflict("An account with this email already exists");

    const user = db.users.insert({ name: data.name, email: data.email, password: await hashPassword(data.password), favourites: [], role: "user" });

    notify(user.id, {
        type: "system",
        title: `Welcome to HomeFinder+, ${user.name.split(" ")[0]}!`,
        body: "Save homes you love, message owners and list your own property in minutes.",
        link: "/",
    });

    signIn(res, user);
    res.status(201).json({ success: true, message: "Account created", user: publicUser(user) });
});

router.post("/login", authLimiter, async (req, res) => {
    const data = parse(loginSchema, req.body);

    const user = findByEmail(data.email);
    if (!user || !(await checkPassword(user, data.password))) {
        throw unauthorized("Incorrect email or password");
    }

    signIn(res, user);
    res.json({ success: true, message: "Welcome back!", user: publicUser(user) });
});

router.post("/logout", (_req, res) => {
    signOut(res);
    res.json({ success: true });
});

module.exports = router;
