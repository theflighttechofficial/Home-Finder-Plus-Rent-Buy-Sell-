require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), quiet: true });

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/userDB";

const app = express();

// Parse JSON + Form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// User Schema
const User = mongoose.model("User", new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }
}));

// Serve Login First
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Serve Public Folder
app.use(express.static(path.join(__dirname, "public")));

// REGISTER API
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password)
        return res.status(400).json({ success: false, message: "Please fill in all fields" });

    if (String(password).length < 6)
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

    try {
        const hashed = await bcrypt.hash(String(password), 10);
        const user = new User({ name, email, password: hashed });
        await user.save();

        res.status(201).json({ success: true, message: "Account created successfully!" });

    } catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ success: false, message: "Email already exists!" });

        console.error("Register error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// LOGIN API
app.post("/login", async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password)
        return res.status(400).json({ success: false, message: "Please enter email and password" });

    try {
        const user = await User.findOne({ email: String(email).toLowerCase().trim() });

        if (!user)
            return res.status(401).json({ success: false, message: "Email not found!" });

        let valid;
        if (user.password.startsWith("$2")) {
            valid = await bcrypt.compare(String(password), user.password);
        } else {
            // Account created before password hashing: check plain text, then upgrade
            valid = user.password === password;
            if (valid) {
                user.password = await bcrypt.hash(String(password), 10);
                await user.save();
            }
        }

        if (!valid)
            return res.status(401).json({ success: false, message: "Incorrect password!" });

        res.json({ success: true, message: "Login success!" });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Connect to MongoDB, then start server
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log("MongoDB Connected");
        app.listen(PORT, () =>
            console.log(`Server running at http://localhost:${PORT}`)
        );
    })
    .catch(err => {
        console.error(`Could not connect to MongoDB at ${MONGODB_URI}. Is MongoDB running?`);
        console.error(err.message);
        process.exit(1);
    });
