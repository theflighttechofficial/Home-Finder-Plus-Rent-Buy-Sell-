<div align="center">

<img src="public/img/favicon.svg" width="72" alt="HomeFinder+ logo">

# HomeFinder+

**Rent, buy and sell homes across India, and talk to owners directly. No brokers.**

[![CI](https://github.com/theflighttechofficial/Home-Finder-Plus-Rent-Buy-Sell-/actions/workflows/ci.yml/badge.svg)](https://github.com/theflighttechofficial/Home-Finder-Plus-Rent-Buy-Sell-/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![No build step](https://img.shields.io/badge/frontend-no%20build%20step-5b4cf0)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

[Features](#-features) · [Screenshots](#-screenshots) · [Quick start](#-quick-start) · [Architecture](#-architecture) · [API](#-api-reference) · [Testing](#-testing)

<br>

<img src="docs/screenshots/banner.png" alt="HomeFinder+ on desktop and mobile, in light and dark mode" width="100%">

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🔍 For home seekers
- **Search with live filters**: rent or buy, city, property type, budget, bedrooms, furnishing, facing, rating, parking and amenities
- **Shareable searches**: every filter is kept in the URL
- **Smart text search**: type `2 BHK pool Bangalore` and it works
- **Listing pages** with a photo gallery and full-screen viewer, specs, price per ft², amenities, nearby places, a map and similar homes
- **Favourites** saved to your account
- **Compare** up to 4 homes side by side, with the best values highlighted

</td>
<td width="50%" valign="top">

### 🏠 For owners
- **List a property** for rent or sale in minutes
- **Drag-and-drop photos**: pick the cover, reorder, remove
- **Map pin** by clicking the map or using your location
- **Auto-saved drafts**, so you never lose your progress
- **Manage listings**: edit, mark as rented or sold, hide, delete
- **Track interest** with view and save counts per listing

</td>
</tr>
<tr>
<td valign="top">

### 💬 Conversations
- **In-app messaging** between buyers and owners
- Each thread is linked to its listing
- Unread badges and live updates
- **Notifications** for new messages and saves

</td>
<td valign="top">

### 🎨 Experience
- **Light, dark and system** themes
- Fully **responsive**, from phones to wide screens
- Adjustable card size and **reduced-motion** mode
- Keyboard accessible, with skeleton loading and toasts
- **Secure by default**: hashed passwords, httpOnly sessions, strict CSP

</td>
</tr>
</table>

---

## 📸 Screenshots

> The sandbox these screenshots were taken in blocks external image CDNs. Listing photos and map tiles are drawn stand-ins; everything else is the real running app. When you run it yourself, listings show the real photos.

### Home
A search-first landing page with city shortcuts, top-rated rentals and new homes for sale.

<img src="docs/screenshots/home.png" alt="Home page" width="100%">

### Search & filters
Filters update the results as you go and stay in the URL. Active filters show as chips you can remove with one click.

<img src="docs/screenshots/search.png" alt="Search page with filters" width="100%">

### Listing details
Photo gallery, key specs, amenities, nearby places, map, a box to message the owner, and similar homes.

<img src="docs/screenshots/details.png" alt="Listing details page" width="100%">

<details>
<summary><b>See the full details page</b></summary>
<br>
<img src="docs/screenshots/details-full.png" alt="Full listing details page" width="100%">
</details>

### Compare
Up to four homes side by side. The best value in each row is highlighted in green.

<img src="docs/screenshots/compare.png" alt="Compare homes" width="100%">

### List a property
A guided form in sections. Photos upload by drag-and-drop, any photo can become the cover, and the draft saves itself.

<table>
<tr>
<td width="50%"><img src="docs/screenshots/add-listing.png" alt="Add listing: basics"></td>
<td width="50%"><img src="docs/screenshots/add-listing-photos.png" alt="Add listing: photos and amenities"></td>
</tr>
</table>

### My listings & saved homes

<table>
<tr>
<td width="50%"><img src="docs/screenshots/my-listings.png" alt="My listings dashboard"><p align="center"><sub>Stats, status tabs and quick actions</sub></p></td>
<td width="50%"><img src="docs/screenshots/saved-homes.png" alt="Saved homes"><p align="center"><sub>Every home you've hearted</sub></p></td>
</tr>
</table>

### Messages & notifications

<table>
<tr>
<td width="50%"><img src="docs/screenshots/messages.png" alt="Messages"><p align="center"><sub>Chat with owners; each thread links to its listing</sub></p></td>
<td width="50%"><img src="docs/screenshots/notifications.png" alt="Notifications"><p align="center"><sub>Messages and saves, filterable</sub></p></td>
</tr>
</table>

### Account

<table>
<tr>
<td width="50%"><img src="docs/screenshots/profile.png" alt="Profile"><p align="center"><sub>Profile, photo, password and account deletion</sub></p></td>
<td width="50%"><img src="docs/screenshots/settings.png" alt="Settings"><p align="center"><sub>Theme, card size and motion settings</sub></p></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/login.png" alt="Login"><p align="center"><sub>Login, with a one-click demo account</sub></p></td>
<td width="50%"><img src="docs/screenshots/register.png" alt="Register"><p align="center"><sub>Sign up, with a password strength meter</sub></p></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/user-menu.png" alt="User menu"><p align="center"><sub>User menu and header badges</sub></p></td>
<td width="50%"><img src="docs/screenshots/about.png" alt="About page"><p align="center"><sub>About page</sub></p></td>
</tr>
</table>

### 🌙 Dark mode
Every page has a hand-tuned dark theme. It follows your system setting unless you choose one.

<img src="docs/screenshots/themes.png" alt="Light and dark mode side by side" width="100%">

<table>
<tr>
<td width="50%"><img src="docs/screenshots/home-dark.png" alt="Home in dark mode"></td>
<td width="50%"><img src="docs/screenshots/details-dark.png" alt="Details in dark mode"></td>
</tr>
</table>

### 📱 Mobile
Designed for phones first: a bottom-sheet filter panel, a slide-out menu and a full-screen chat.

<img src="docs/screenshots/mobile.png" alt="Mobile screens" width="100%">

---

## 🚀 Quick start

### Option A: Docker (one command)

```bash
docker compose up --build
```

Then open **http://localhost:3000**. MongoDB, the app and the demo data all start together.

### Option B: Run locally

**Prerequisites:** Node.js 20+ and MongoDB 6+.

```bash
git clone https://github.com/theflighttechofficial/Home-Finder-Plus-Rent-Buy-Sell-.git
cd Home-Finder-Plus-Rent-Buy-Sell-
npm install

# No MongoDB installed? Start one with Docker:
docker run -d --name homefinder-mongo -p 27017:27017 mongo:7

cp .env.example .env   # optional; the defaults work for local development
npm run dev            # restarts on file changes; use `npm start` for production
```

Then open **http://localhost:3000**.

### 🔑 Demo accounts

On first start, the app seeds **28 listings across 10 cities** and two accounts. Both use the password `Demo@1234`.

| Account | Role |
|---|---|
| `buyer@homefinder.plus` | Browse, save and message owners. The login page has a one-click **Use demo login** button. |
| `owner@homefinder.plus` | Owns the demo listings. Log in here to answer the buyer's messages. |

> **Tip:** open the app in two browsers, one as each account, to try messaging live.

### Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the server |
| `npm run dev` | Start with auto-restart on file changes |
| `npm run seed` | Seed demo data if the database is empty (`npm run seed -- --reset` starts over) |
| `npm test` | Run the API test suite (needs MongoDB; uses a separate database) |
| `npm run lint` | Lint the server and browser code |

### Configuration

Set these in a `.env` file (see [`.env.example`](.env.example)):

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/userDB` | |
| `JWT_SECRET` | dev-only fallback | **Required in production.** The server won't start without it. |
| `NODE_ENV` | `development` | `production` turns on secure cookies and static caching |
| `SEED_ON_START` | `true` | Seed demo data when there are no listings |
| `UPLOAD_DIR` | `./uploads` | Where uploaded photos are stored |
| `TEST_MONGODB_URI` | `mongodb://127.0.0.1:27017/homefinder_test` | Used by `npm test`; dropped after each run |

---

## 🧱 Architecture

```mermaid
flowchart LR
    subgraph Browser
        P[HTML pages] --> J[ES modules<br/>public/js]
        J -->|fetch /api, httpOnly cookie| API
    end
    subgraph Server [Node.js · Express 5]
        API[Routes<br/>auth · me · listings · uploads<br/>conversations · notifications]
        MW[Middleware<br/>Helmet CSP · rate limit · same-origin<br/>session loader · Zod validation]
        MW --> API
    end
    API --> DB[(MongoDB<br/>users · listings · conversations<br/>messages · notifications)]
    API --> FS[[Uploaded photos]]
```

The frontend has **no build step**. Each page is plain HTML plus one small ES module in `public/js/pages/`. They share one module (`public/js/app.js`) for the header, the API client, toasts, listing cards, favourites and compare. Styling is one design-system stylesheet with light and dark tokens.

<details>
<summary><b>Project structure</b></summary>

```text
├── server/
│   ├── index.js              # Entry point: connect DB, seed, listen
│   ├── app.js                # Express app: security, routes, static files
│   ├── config.js             # Environment config
│   ├── seed.js               # Demo data (also: npm run seed)
│   ├── seed/listings.json
│   ├── models/               # User, Listing, Conversation, Message, Notification
│   ├── routes/               # auth, me, listings, uploads, conversations, notifications
│   ├── middleware/           # auth, uploads, security, error handling
│   └── lib/                  # validation, errors, constants
├── public/
│   ├── css/app.css           # Design system (light + dark)
│   ├── js/app.js             # Shared UI + API client
│   ├── js/pages/*.js         # One module per page
│   └── *.html                # Pages
├── test/                     # API test suite
├── docs/screenshots/         # README images
├── Dockerfile · docker-compose.yml
└── .github/workflows/ci.yml
```

</details>

### 🔒 Security

- Passwords are hashed with **bcrypt**. Old plain-text passwords are upgraded the next time that user logs in.
- Sessions use a **JWT in an `httpOnly`, `SameSite=Lax` cookie**, marked `Secure` in production.
- **Helmet** sets a strict Content Security Policy. Pages have no inline scripts or event handlers, and a test enforces this.
- State-changing API calls from other origins are rejected.
- Login and registration are **rate-limited**.
- All input is validated with **Zod**. Search text is regex-escaped.
- Uploads must be JPEG, PNG, WebP or GIF, at most 5 MB, and the server checks each file's **magic bytes**.
- Owners can edit only their own listings, and conversations are visible only to their participants.

---

## 🔌 API reference

All endpoints live under `/api` and return JSON. Errors look like `{ success: false, message, errors? }`, where `errors` maps field names to messages.

<details>
<summary><b>Auth & account</b></summary>

| Method & path | Description |
|---|---|
| `POST /auth/register` | Create an account and sign in |
| `POST /auth/login` | Sign in |
| `POST /auth/logout` | Sign out |
| `GET /me` | Current user (or `{ user: null }` for guests) and favourite IDs |
| `PATCH /me` | Update name, phone, city, bio |
| `DELETE /me` | Delete the account and its listings (requires `password`) |
| `POST /me/avatar` | Upload a profile photo (multipart `avatar`) |
| `POST /me/password` | Change password |
| `GET /me/favourites` | Saved listings |
| `PUT /me/favourites/:id` · `DELETE /me/favourites/:id` | Save or unsave a listing |
| `GET /me/listings` | Your listings (all statuses) |

</details>

<details>
<summary><b>Listings & uploads</b></summary>

| Method & path | Description |
|---|---|
| `GET /listings` | Search. Query: `q, purpose, city, type, minPrice, maxPrice, bedrooms, furnishing, facing, minRating, parking, amenities, sort, page, limit` |
| `GET /listings/meta` | Cities, types, amenities and price ranges for filters |
| `GET /listings/compare?ids=a,b,c` | Listings for the compare page, in the order given |
| `GET /listings/:id` | Listing details (adds a view for visitors) |
| `GET /listings/:id/similar` | Up to 4 similar homes |
| `POST /listings` | Create a listing |
| `PATCH /listings/:id` | Update the fields you send (owner only) |
| `DELETE /listings/:id` | Delete (owner only) |
| `POST /uploads` | Upload listing photos (multipart `images`, up to 12) |

Sort options: `newest`, `price_asc`, `price_desc`, `rating`, `popular`, `bedrooms`.

</details>

<details>
<summary><b>Messages & notifications</b></summary>

| Method & path | Description |
|---|---|
| `GET /conversations` | Your inbox with unread counts |
| `POST /conversations` | Message a listing's owner (`listingId`, `text`); reuses an existing thread |
| `GET /conversations/:id/messages?after=<iso>` | Messages; marks them read. `after` supports polling |
| `POST /conversations/:id/messages` | Send a message |
| `GET /notifications` | Latest 100 notifications |
| `GET /notifications/counts` | Unread counts for header badges |
| `POST /notifications/read-all` | Mark all as read |
| `PATCH /notifications/:id` · `DELETE /notifications/:id` | Mark one as read, or delete it |
| `DELETE /notifications` | Clear all |

</details>

---

## 🧪 Testing

```bash
npm test        # 49 API tests: auth, listings, uploads, favourites, messaging, notifications, pages
npm run lint
```

Tests run against a real MongoDB using a separate `homefinder_test` database that is dropped afterwards. They cover:

- **Auth:** hashing, cookies, legacy password upgrades, cross-site blocking
- **Listings:** search, filters, pagination, ownership rules, partial updates
- **Uploads:** non-image files are rejected
- **Messaging and notifications:** conversation privacy, unread counts
- **Pages:** every page loads all of its assets, and no page has inline scripts (CSP)

GitHub Actions runs lint and tests on every push and pull request.

---

## 🗺️ Roadmap

- [ ] Real-time chat over WebSockets instead of polling
- [ ] Map view of search results
- [ ] Email verification and password reset
- [ ] Visit scheduling and reviews
- [ ] Admin moderation dashboard
- [ ] Cloud image storage (S3 or Cloudinary) with thumbnails

## 👥 Team

| | |
|---|---|
| **Varun Vaibhav S** | Founder & CEO |
| **Pradeep Kumar M** | Head of Product |
| **Syed Mushahid Ali S** | Lead Developer |
| **Aadil Ahmed A** | Customer Success |

## 📄 License

This project is intended for educational and portfolio purposes.

<div align="center"><sub>Built with care in India 🇮🇳</sub></div>
