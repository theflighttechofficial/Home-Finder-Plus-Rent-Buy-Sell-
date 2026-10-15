# 🏠 HomeFinder+

HomeFinder+ is a full-stack real estate platform for **renting, buying and selling** homes across India. Browse and filter listings, save favourites, compare homes side by side, message owners directly, and list your own property with photos and a map pin.

Built with Node.js, Express and MongoDB, with a fast, dependency-free frontend (vanilla JS modules, no build step).

## ✨ Features

**For home seekers**
- 🔍 Search with live filters: rent / buy, city, type, budget, bedrooms, furnishing, facing, rating, parking, amenities — all synced to the URL so searches can be shared
- 🏡 Detail pages with photo gallery + lightbox, specs, amenities, nearby places, map and similar homes
- ❤️ Favourites saved to your account
- ⚖️ Compare up to 4 homes side by side, with the best values highlighted
- 💬 In-app messaging with owners (no phone number needed)

**For owners**
- ➕ List a property for rent or sale: photo upload (drag & drop, choose cover), map pin, amenities, auto-saved drafts
- 📋 Manage listings: edit, mark rented/sold, hide, delete, see views and saves
- 🔔 Notifications when someone messages you or saves your listing

**Everywhere**
- 👤 Accounts with secure sessions, profile photo, password change, account deletion
- 🌙 Light, dark and system themes; adjustable card size; reduced-motion mode
- 📱 Fully responsive, keyboard accessible

## 🛠️ Tech stack

| Layer | Tools |
|---|---|
| Frontend | HTML, CSS (custom design system), vanilla JavaScript ES modules, Leaflet + OpenStreetMap |
| Backend | Node.js 20+, Express 5, Zod validation, Multer uploads |
| Database | MongoDB + Mongoose |
| Security | bcrypt password hashing, JWT in `httpOnly` cookies, Helmet (strict CSP), rate-limited auth, same-origin checks, image type sniffing |
| Quality | `node:test` + Supertest API tests, ESLint, GitHub Actions CI |

## 🚀 Getting started

### Option A — Docker (easiest)

```bash
docker compose up --build
```

Open http://localhost:3000. MongoDB, the app and demo data all start together.

### Option B — Run locally

Prerequisites: **Node.js 20+** and **MongoDB** running locally.

```bash
npm install
cp .env.example .env          # optional — sensible defaults are built in

# If you don't have MongoDB installed:
docker run -d --name homefinder-mongo -p 27017:27017 mongo:7

npm run dev                    # or: npm start
```

Open http://localhost:3000.

On first start the database is seeded with 28 listings and two demo accounts (password `Demo@1234`):

| Account | Use it to |
|---|---|
| `buyer@homefinder.plus` | Browse, save and message owners (the login page has a one-click demo button) |
| `owner@homefinder.plus` | Owns the demo listings — log in here to reply to messages |

### Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the server |
| `npm run dev` | Start with auto-restart on file changes |
| `npm run seed` | Seed demo data if the database is empty (`npm run seed -- --reset` to start over) |
| `npm test` | Run the API test suite (needs MongoDB; uses a separate `homefinder_test` database) |
| `npm run lint` | Lint server and browser code |

### Configuration (`.env`)

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/userDB` | |
| `JWT_SECRET` | dev-only fallback | **Required in production** |
| `NODE_ENV` | `development` | `production` enables secure cookies and caching |
| `SEED_ON_START` | `true` | Seed demo data when there are no listings |
| `UPLOAD_DIR` | `./uploads` | Where uploaded photos are stored |
| `TEST_MONGODB_URI` | `mongodb://127.0.0.1:27017/homefinder_test` | Database used by `npm test` (dropped after each run) |

## 📁 Project structure

```text
├── server/
│   ├── index.js            # Entry point: connect DB, seed, listen
│   ├── app.js              # Express app (security, routes, static files)
│   ├── config.js           # Environment config
│   ├── seed.js             # Demo data (also runnable: npm run seed)
│   ├── seed/listings.json
│   ├── models/             # User, Listing, Conversation, Message, Notification
│   ├── routes/             # auth, me, listings, uploads, conversations, notifications
│   ├── middleware/         # auth, uploads, security, error handling
│   └── lib/                # validation, errors, constants
├── public/
│   ├── css/app.css         # Design system (light + dark)
│   ├── js/app.js           # Shared UI: header, API client, toasts, cards, favourites, compare
│   ├── js/pages/*.js       # One module per page
│   └── *.html              # Pages
├── test/                   # API tests
├── Dockerfile, docker-compose.yml
└── .github/workflows/ci.yml
```

## 🔌 API overview

All endpoints are under `/api` and return JSON.

| Method & path | Description |
|---|---|
| `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` | Sessions |
| `GET /me`, `PATCH /me`, `DELETE /me` | Current user |
| `POST /me/avatar`, `POST /me/password` | Profile photo, password |
| `GET /me/favourites`, `PUT/DELETE /me/favourites/:id` | Favourites |
| `GET /me/listings` | Your listings (all statuses) |
| `GET /listings` | Search — `q, purpose, city, type, minPrice, maxPrice, bedrooms, furnishing, facing, minRating, parking, amenities, sort, page, limit` |
| `GET /listings/meta` | Cities, types, amenities and price ranges for filters |
| `GET /listings/compare?ids=a,b` | Listings for the compare page |
| `GET /listings/:id`, `GET /listings/:id/similar` | Details |
| `POST /listings`, `PATCH /listings/:id`, `DELETE /listings/:id` | Manage your listings |
| `POST /uploads` | Upload listing photos (multipart field `images`) |
| `GET /conversations`, `POST /conversations` | Inbox, contact an owner |
| `GET/POST /conversations/:id/messages` | Read / send messages (`?after=` for polling) |
| `GET /notifications`, `GET /notifications/counts`, `POST /notifications/read-all`, `PATCH/DELETE /notifications/:id` | Notifications |

## 🗺️ Ideas for later

- Real-time chat over WebSockets instead of polling
- Map view of search results
- Email verification and password reset
- Scheduled visits and reviews
- Admin moderation dashboard
- Cloud image storage (S3 / Cloudinary) with thumbnails

## 📄 License

This project is intended for educational and portfolio purposes.
