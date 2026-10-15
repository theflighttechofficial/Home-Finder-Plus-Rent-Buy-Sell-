const mongoose = require("mongoose");

async function connect(uri) {
    mongoose.set("strictQuery", true);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    return mongoose.connection;
}

async function disconnect() {
    await mongoose.disconnect();
}

module.exports = { connect, disconnect };
