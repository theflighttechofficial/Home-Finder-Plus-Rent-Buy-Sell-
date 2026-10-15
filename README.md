# 🏠 HomeFinder+

HomeFinder+ is a full-stack real estate web application designed to provide a seamless property browsing experience. Users can explore listings, search and filter properties, save favourites, and interact with a modern, responsive interface. The application is powered by a Node.js backend with MongoDB for data storage.

## ✨ Features

* 🔍 Advanced property search and filtering
* 🏡 Detailed property listings
* ❤️ Favourite properties
* 👤 User authentication
* 📱 Fully responsive UI
* 🌙 Light & Dark mode
* ⚡ Fast Node.js & Express backend
* 🗄️ MongoDB database integration
* 🔒 Secure API communication
* 🎨 Modern and intuitive interface

## 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap 5

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

## 📦 Installation

Prerequisites: Node.js 20+ and a running MongoDB server.

Clone the repository:

```bash
git clone https://github.com/theflighttechofficial/Home-Finder-Plus-Rent-Buy-Sell-.git
cd Home-Finder-Plus-Rent-Buy-Sell-
```

Install dependencies:

```bash
npm install
```

Start MongoDB. If you don't have it installed locally, Docker works:

```bash
docker run -d --name homefinder-mongo -p 27017:27017 mongo:7
```

Optionally copy `.env.example` to `.env` and adjust `PORT` / `MONGODB_URI`
(defaults: `3000` and `mongodb://127.0.0.1:27017/userDB`).

Start the server:

```bash
npm start        # or: npm run dev (restarts on file changes)
```

The application will be available at:

```text
http://localhost:3000
```

## 📁 Project Structure

```text
Home-Finder-Plus-Rent-Buy-Sell-
│── package.json
│── .env.example
│── home_finder/
│   │── server.js          # Express server + register/login API
│   └── public/            # Static frontend pages
│       │── login.html     # Landing page (served at /)
│       │── index.html     # Property listings
│       │── assets/homes.js  # Shared listing data
│       └── ...
└── README.md
```

## 🚀 Future Enhancements

* Property image uploads
* Interactive maps
* AI-powered property recommendations
* Appointment scheduling
* Online payments
* Admin dashboard
* Real-time chat

## 👨‍💻 Developed By

Developed as a full-stack real estate platform using Node.js, Express.js, and MongoDB.

## 📄 License

This project is intended for educational and portfolio purposes.
