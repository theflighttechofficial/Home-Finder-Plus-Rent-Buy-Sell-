const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const app = express();

// Parse JSON + Form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/userDB")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// User Schema
const User = mongoose.model("User", new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
}));

// Serve Login First
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Serve Public Folder
app.use(express.static(path.join(__dirname, "public")));

// REGISTER API
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const user = new User({ name, email, password });
        await user.save();

        res.json({ success: true, message: "Account created successfully!" });

    } catch (err) {
        res.json({ success: false, message: "Email already exists!" });
    }
});

// LOGIN API
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user)
            return res.json({ success: false, message: "Email not found!" });

        if (user.password !== password)
            return res.json({ success: false, message: "Incorrect password!" });

        res.json({ success: true, message: "Login success!" });

    } catch (err) {
        res.json({ success: false, message: "Server error" });
    }
});

// Start Server
app.listen(3000, () =>
    console.log("Server running at http://localhost:3000")
);
