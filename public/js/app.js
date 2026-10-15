import { icon, hydrateIcons } from "./icons.js";

export { icon };

/* ==========================================================================
   Small helpers
   ========================================================================== */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

export const store = {
    get(key, fallback = null) {
        try {
            const v = localStorage.getItem(key);
            return v == null ? fallback : JSON.parse(v);
        } catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            /* storage unavailable */
        }
    },
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch {
            /* storage unavailable */
        }
    },
};

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatPrice(price, purpose) {
    if (price == null) return "—";
    if (purpose === "sale") {
        if (price >= 1e7) return `₹${+(price / 1e7).toFixed(2)} Cr`;
        if (price >= 1e5) return `₹${+(price / 1e5).toFixed(1)} L`;
    }
    return `₹${inr.format(price)}`;
}

export const priceSuffix = (purpose) => (purpose === "rent" ? "/month" : "");
export const formatNumber = (n) => inr.format(n || 0);

export function timeAgo(date) {
    const d = new Date(date);
    const s = Math.round((Date.now() - d) / 1000);
    if (s < 45) return "just now";
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.round(h / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export function initials(name = "") {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join("") || "?";
}

export function avatar(user, cls = "") {
    if (user?.avatar) return `<span class="avatar ${cls}"><img src="${esc(user.avatar)}" alt=""></span>`;
    return `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(user?.name))}</span>`;
}

export function debounce(fn, ms = 300) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

export function params() {
    return new URLSearchParams(location.search);
}

/* ==========================================================================
   API client
   ========================================================================== */

export class ApiError extends Error {
    constructor(message, status, errors) {
        super(message);
        this.status = status;
        this.errors = errors || {};
    }
}

export async function api(path, { method = "GET", body, form } = {}) {
    const opts = { method, headers: { Accept: "application/json" }, credentials: "same-origin" };
    if (form) opts.body = form;
    else if (body !== undefined) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
    }

    let res;
    try {
        res = await fetch(`/api${path}`, opts);
    } catch {
        throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        if (res.status === 401 && session.user) {
            session.user = null;
        }
        throw new ApiError(data.message || `Request failed (${res.status})`, res.status, data.errors);
    }
    return data;
}

/* ==========================================================================
   Session
   ========================================================================== */

export const session = {
    user: null,
    favourites: new Set(),
};

let readyPromise;
export function ready() {
    if (!readyPromise) {
        readyPromise = api("/me")
            .then((data) => {
                session.user = data.user;
                session.favourites = new Set(data.favourites || []);
            })
            .catch(() => {});
    }
    return readyPromise;
}

export function loginUrl() {
    return `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
}

// Resolves with the user, or sends guests to the login page.
export async function requireUser() {
    await ready();
    if (!session.user) {
        location.replace(loginUrl());
        return new Promise(() => {});
    }
    return session.user;
}

export async function logout() {
    try {
        await api("/auth/logout", { method: "POST" });
    } finally {
        location.href = "/login.html?loggedOut=1";
    }
}

/* ==========================================================================
   Theme
   ========================================================================== */

const media = window.matchMedia("(prefers-color-scheme: dark)");

export function getThemePref() {
    try {
        return localStorage.getItem("hf-theme") || "auto";
    } catch {
        return "auto";
    }
}

export function applyTheme(pref = getThemePref()) {
    try {
        localStorage.setItem("hf-theme", pref);
    } catch {
        /* ignore */
    }
    const dark = pref === "dark" || (pref === "auto" && media.matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    $$("[data-theme-icon]").forEach((el) => (el.innerHTML = icon(dark ? "sun" : "moon")));
}

media.addEventListener?.("change", () => getThemePref() === "auto" && applyTheme("auto"));

export function toggleTheme() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    applyTheme(dark ? "light" : "dark");
}

/* ==========================================================================
   Toasts & dialogs
   ========================================================================== */

export function toast(message, type = "success", { action, href, duration = 3800 } = {}) {
    let host = $(".toasts");
    if (!host) {
        host = document.createElement("div");
        host.className = "toasts";
        host.setAttribute("role", "status");
        host.setAttribute("aria-live", "polite");
        document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    const ico = type === "error" ? "alert" : type === "info" ? "info" : "checkCircle";
    el.innerHTML = `${icon(ico)}<span>${esc(message)}</span>${action && href ? `<a href="${esc(href)}">${esc(action)}</a>` : ""}`;
    host.appendChild(el);
    setTimeout(() => {
        el.classList.add("out");
        el.addEventListener("animationend", () => el.remove(), { once: true });
    }, duration);
}

export function confirmDialog({ title, message, confirmText = "Confirm", danger = false, input } = {}) {
    return new Promise((resolve) => {
        const modal = document.createElement("div");
        modal.className = "modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.innerHTML = `
            <div class="modal-box">
                <h3>${esc(title)}</h3>
                ${message ? `<p class="text-2">${esc(message)}</p>` : ""}
                ${input ? `<div class="field mt-2"><label for="dlg-input">${esc(input.label)}</label><input id="dlg-input" class="input" type="${esc(input.type || "text")}" autocomplete="${esc(input.autocomplete || "off")}"></div>` : ""}
                <div class="modal-actions">
                    <button class="btn btn-ghost" data-act="cancel">Cancel</button>
                    <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-act="ok">${esc(confirmText)}</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add("open"));
        const field = $("#dlg-input", modal);
        (field || $('[data-act="ok"]', modal)).focus();

        const close = (value) => {
            modal.classList.remove("open");
            setTimeout(() => modal.remove(), 200);
            document.removeEventListener("keydown", onKey);
            resolve(value);
        };
        const onKey = (e) => {
            if (e.key === "Escape") close(false);
            if (e.key === "Enter" && field && document.activeElement === field) close(field.value || false);
        };
        document.addEventListener("keydown", onKey);
        modal.addEventListener("click", (e) => {
            if (e.target === modal) close(false);
            const act = e.target.closest("[data-act]")?.dataset.act;
            if (act === "cancel") close(false);
            if (act === "ok") close(field ? field.value || false : true);
        });
    });
}

export function setLoading(btn, loading, label) {
    if (loading) {
        btn.dataset.label = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span>${label ? `<span>${esc(label)}</span>` : ""}`;
    } else {
        btn.disabled = false;
        if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
}

// Shows field-level errors from an ApiError on a form (fields matched by name).
export function showFieldErrors(form, errors = {}) {
    $$(".field.has-error", form).forEach((f) => {
        f.classList.remove("has-error");
        const e = $(".error", f);
        if (e) e.textContent = "";
    });
    for (const [name, message] of Object.entries(errors)) {
        const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
        const field = input?.closest(".field");
        if (!field) continue;
        field.classList.add("has-error");
        let e = $(".error", field);
        if (!e) {
            e = document.createElement("div");
            e.className = "error";
            field.appendChild(e);
        }
        e.textContent = message;
    }
}

/* ==========================================================================
   Header, footer, drawer
   ========================================================================== */

const NAV = [
    { href: "/", label: "Explore", icon: "compass", key: "home" },
    { href: "/search.html?purpose=rent", label: "Rent", icon: "key", key: "rent" },
    { href: "/search.html?purpose=sale", label: "Buy", icon: "home", key: "sale" },
    { href: "/add.html", label: "Sell / List", icon: "plus", key: "add" },
    { href: "/about.html", label: "About", icon: "info", key: "about" },
];

function logoHtml() {
    return `<a href="/" class="logo" aria-label="HomeFinder+ home"><span class="logo-mark">${icon("home")}</span><span>HomeFinder<b>+</b></span></a>`;
}

function renderHeader(active) {
    const host = $("#site-header");
    if (!host) return;
    const u = session.user;
    const dark = document.documentElement.getAttribute("data-theme") === "dark";

    host.className = "site-header";
    host.innerHTML = `
        <div class="container">
            <button class="icon-btn menu-toggle" data-action="drawer" aria-label="Open menu">${icon("menu")}</button>
            ${logoHtml()}
            <nav class="nav" aria-label="Main">
                ${NAV.map((n) => `<a href="${n.href}" class="${n.key === active ? "active" : ""}">${n.label}</a>`).join("")}
            </nav>
            <div class="header-actions">
                <button class="icon-btn" data-action="theme" aria-label="Toggle dark mode" data-theme-icon>${icon(dark ? "sun" : "moon")}</button>
                ${
                    u
                        ? `
                <a class="icon-btn hide-sm" href="/favourites.html" aria-label="Saved homes">${icon("heart")}</a>
                <a class="icon-btn" href="/messages.html" aria-label="Messages">${icon("message")}<span class="dot" data-badge="messages" hidden></span></a>
                <a class="icon-btn" href="/notifications.html" aria-label="Notifications">${icon("bell")}<span class="dot" data-badge="notifications" hidden></span></a>
                <div class="dropdown" id="user-menu">
                    <button class="user-btn" data-action="user-menu" aria-haspopup="true" aria-expanded="false">${avatar(u, "avatar-sm")}<span class="name">${esc(u.name.split(" ")[0])}</span>${icon("chevronDown")}</button>
                    <div class="dropdown-menu" role="menu">
                        <div class="dropdown-head"><strong>${esc(u.name)}</strong><span>${esc(u.email)}</span></div>
                        <hr>
                        <a href="/profile.html" role="menuitem">${icon("user")} My profile</a>
                        <a href="/mylistings.html" role="menuitem">${icon("building")} My listings</a>
                        <a href="/favourites.html" role="menuitem">${icon("heart")} Saved homes</a>
                        <a href="/compare.html" role="menuitem">${icon("columns")} Compare</a>
                        <a href="/settings.html" role="menuitem">${icon("settings")} Settings</a>
                        <hr>
                        <button class="danger" data-action="logout" role="menuitem">${icon("logout")} Log out</button>
                    </div>
                </div>`
                        : `
                <a class="btn btn-ghost hide-sm" href="/login.html">Log in</a>
                <a class="btn btn-primary" href="/register.html">Sign up</a>`
                }
            </div>
        </div>`;

    let drawer = $(".drawer");
    if (!drawer) {
        document.body.insertAdjacentHTML("beforeend", `<div class="drawer-backdrop" data-action="close-overlays"></div><nav class="drawer" aria-label="Mobile"></nav>`);
        drawer = $(".drawer");
    }
    drawer.innerHTML = `
        <div class="mb-2">${logoHtml()}</div>
        ${NAV.map((n) => `<a href="${n.href}" class="${n.key === active ? "active" : ""}">${icon(n.icon)} ${n.label}</a>`).join("")}
        <hr>
        ${
            u
                ? `<a href="/favourites.html">${icon("heart")} Saved homes</a>
                   <a href="/mylistings.html">${icon("building")} My listings</a>
                   <a href="/compare.html">${icon("columns")} Compare</a>
                   <a href="/settings.html">${icon("settings")} Settings</a>`
                : `<a href="/login.html">${icon("login")} Log in</a><a href="/register.html">${icon("user")} Create account</a>`
        }`;
}

function renderFooter() {
    const host = $("#site-footer");
    if (!host) return;
    host.className = "site-footer";
    host.innerHTML = `
        <div class="container">
            <div class="footer-grid">
                <div>
                    ${logoHtml()}
                    <p class="mt-2" style="max-width:320px">Find a place to rent, a home to buy, or list your own property — all in one beautifully simple place.</p>
                </div>
                <div><h4>Explore</h4><a href="/search.html?purpose=rent">Homes for rent</a><a href="/search.html?purpose=sale">Homes for sale</a><a href="/compare.html">Compare homes</a></div>
                <div><h4>Owners</h4><a href="/add.html">List a property</a><a href="/mylistings.html">Manage listings</a><a href="/messages.html">Messages</a></div>
                <div><h4>Company</h4><a href="/about.html">About us</a><a href="/settings.html">Settings</a></div>
            </div>
            <div class="footer-bottom"><span>© ${new Date().getFullYear()} HomeFinder+ · Built with care in India</span><span>Rent · Buy · Sell</span></div>
        </div>`;
}

async function refreshBadges() {
    if (!session.user || document.hidden) return;
    try {
        const counts = await api("/notifications/counts");
        for (const [key, n] of Object.entries(counts)) {
            $$(`[data-badge="${key}"]`).forEach((el) => {
                el.hidden = !n;
                el.textContent = n > 9 ? "9+" : n;
            });
        }
    } catch {
        /* ignore */
    }
}

function closeOverlays() {
    document.body.classList.remove("drawer-open", "filters-open");
    $$(".dropdown.open").forEach((d) => {
        d.classList.remove("open");
        $("[aria-expanded]", d)?.setAttribute("aria-expanded", "false");
    });
}

document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    const action = target?.dataset.action;

    if (!e.target.closest(".dropdown")) {
        $$(".dropdown.open").forEach((d) => d.classList.remove("open"));
    }

    switch (action) {
        case "theme":
            toggleTheme();
            break;
        case "drawer":
            document.body.classList.add("drawer-open");
            break;
        case "close-overlays":
            closeOverlays();
            break;
        case "user-menu": {
            const dd = target.closest(".dropdown");
            const open = !dd.classList.contains("open");
            dd.classList.toggle("open", open);
            target.setAttribute("aria-expanded", String(open));
            break;
        }
        case "logout":
            logout();
            break;
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOverlays();
});

// Clear a field's error as soon as the user edits it
["input", "change"].forEach((type) =>
    document.addEventListener(type, (e) => {
        const field = e.target.closest?.(".field.has-error");
        if (!field) return;
        field.classList.remove("has-error");
        const err = field.querySelector(".error");
        if (err) err.textContent = "";
    })
);

/* ==========================================================================
   Favourites
   ========================================================================== */

export async function toggleFavourite(id, btn) {
    if (!session.user) {
        toast("Log in to save homes you love", "info", { action: "Log in", href: loginUrl() });
        return null;
    }
    const was = session.favourites.has(id);
    const next = !was;
    setFavUi(id, next);
    if (btn) {
        btn.classList.remove("pop");
        void btn.offsetWidth;
        btn.classList.add("pop");
    }
    try {
        await api(`/me/favourites/${id}`, { method: next ? "PUT" : "DELETE" });
        if (next) session.favourites.add(id);
        else session.favourites.delete(id);
        toast(next ? "Saved to your favourites" : "Removed from favourites", "success", next ? { action: "View", href: "/favourites.html" } : {});
        document.dispatchEvent(new CustomEvent("favourite-change", { detail: { id, saved: next } }));
        return next;
    } catch (err) {
        setFavUi(id, was);
        toast(err.message, "error");
        return was;
    }
}

function setFavUi(id, on) {
    $$(`[data-fav="${id}"]`).forEach((b) => {
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", String(on));
        b.setAttribute("aria-label", on ? "Remove from favourites" : "Save to favourites");
    });
}

/* ==========================================================================
   Compare (kept per-browser)
   ========================================================================== */

const COMPARE_KEY = "hf-compare";
export const MAX_COMPARE = 4;

export const compare = {
    list() {
        return store.get(COMPARE_KEY, []);
    },
    has(id) {
        return this.list().some((x) => x.id === id);
    },
    toggle(item) {
        let list = this.list();
        if (list.some((x) => x.id === item.id)) list = list.filter((x) => x.id !== item.id);
        else {
            if (list.length >= MAX_COMPARE) {
                toast(`You can compare up to ${MAX_COMPARE} homes`, "info", { action: "Compare now", href: "/compare.html" });
                return false;
            }
            list.push(item);
        }
        store.set(COMPARE_KEY, list);
        renderCompareTray();
        return true;
    },
    remove(id) {
        store.set(COMPARE_KEY, this.list().filter((x) => x.id !== id));
        renderCompareTray();
    },
    clear() {
        store.set(COMPARE_KEY, []);
        renderCompareTray();
    },
};

export function renderCompareTray() {
    $$("[data-compare]").forEach((b) => {
        const on = compare.has(b.dataset.compare);
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", String(on));
    });
    const list = compare.list();
    // The tray would cover the chat composer, and is redundant on the compare page itself
    if (/^\/(compare|messages)/.test(location.pathname)) return;
    document.body.classList.toggle("has-compare-tray", list.length > 0);

    let tray = $(".compare-tray");
    if (!tray) {
        tray = document.createElement("div");
        tray.className = "compare-tray";
        document.body.appendChild(tray);
        tray.addEventListener("click", (e) => {
            if (e.target.closest("[data-clear-compare]")) compare.clear();
        });
    }
    tray.classList.toggle("show", list.length > 0);
    tray.innerHTML = `
        <div class="thumbs">${list.map((x) => `<img src="${esc(x.image)}" alt="${esc(x.title)}" title="${esc(x.title)}">`).join("")}</div>
        <strong class="small">${list.length} selected</strong>
        <button class="btn btn-ghost btn-sm" data-clear-compare>Clear</button>
        <a class="btn btn-primary btn-sm" href="/compare.html">${icon("columns")} Compare</a>`;
}

/* ==========================================================================
   Listing card
   ========================================================================== */

export function listingCard(l, { index = 0, showStatus = false } = {}) {
    const fav = session.favourites.has(l.id) || l.isFavourite;
    const inCompare = compare.has(l.id);
    const img = l.images?.[0] || "";
    const where = [l.address?.locality, l.address?.city].filter(Boolean).join(", ");
    const status = showStatus && l.status !== "active" ? `<span class="badge badge-warning">${esc(l.status)}</span>` : "";

    return `
    <article class="listing-card ${l.status !== "active" ? "is-inactive" : ""}" style="animation-delay:${Math.min(index, 12) * 40}ms">
        <div class="media">
            <img src="${esc(img)}" alt="" loading="lazy" decoding="async">
            <div class="badges">
                <span class="badge ${l.purpose === "sale" ? "badge-white" : "badge-glass"}">${l.purpose === "sale" ? "For sale" : "For rent"}</span>
                ${l.tag ? `<span class="badge badge-glass">${esc(l.tag)}</span>` : ""}
                ${status}
            </div>
            <button class="fav-btn fav ${fav ? "active" : ""}" data-fav="${l.id}" aria-pressed="${fav}" aria-label="${fav ? "Remove from favourites" : "Save to favourites"}">${icon("heart")}</button>
            <div class="price-tag">${formatPrice(l.price, l.purpose)}<small>${priceSuffix(l.purpose)}</small></div>
        </div>
        <div class="body">
            <h3><a href="/details.html?id=${l.id}">${esc(l.title)}</a></h3>
            <div class="loc">${icon("pin")} ${esc(where)}</div>
            <div class="card-foot small">
                <span class="muted">${esc(l.propertyType)}${l.furnishing ? ` · ${esc(l.furnishing)}` : ""}</span>
                ${l.rating ? `<span class="rating">${icon("star", "icon-fill")} ${Number(l.rating).toFixed(1)}</span>` : ""}
            </div>
            <div class="specs">
                <span title="Bedrooms">${icon("bed")} ${l.bedrooms} BHK</span>
                <span title="Bathrooms">${icon("bath")} ${l.bathrooms}</span>
                ${l.builtArea ? `<span title="Built-up area">${icon("area")} ${formatNumber(l.builtArea)} ft²</span>` : l.parking ? `<span>${icon("car")} Parking</span>` : ""}
                <span class="spacer"></span>
                <button class="btn btn-ghost btn-icon btn-sm compare-toggle ${inCompare ? "active" : ""}" data-compare="${l.id}" data-title="${esc(l.title)}" data-image="${esc(img)}" aria-pressed="${inCompare}" aria-label="Add to compare" title="Compare">${icon("columns")}</button>
            </div>
        </div>
    </article>`;
}

export function skeletonCards(n = 6) {
    return Array.from({ length: n }, () => `<div class="skeleton-card"><div class="skeleton"></div><div class="lines"><div class="skeleton" style="width:70%"></div><div class="skeleton" style="width:45%"></div><div class="skeleton" style="width:90%"></div></div></div>`).join("");
}

export function emptyState({ icon: ico = "search", title, text, action = "" }) {
    return `<div class="empty"><div class="ico">${icon(ico)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
}

// Card-level interactions (favourite + compare) via event delegation
document.addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    if (fav) {
        e.preventDefault();
        toggleFavourite(fav.dataset.fav, fav);
        return;
    }
    const cmp = e.target.closest("[data-compare]");
    if (cmp) {
        e.preventDefault();
        compare.toggle({ id: cmp.dataset.compare, title: cmp.dataset.title, image: cmp.dataset.image });
    }
});

/* ==========================================================================
   Page bootstrap
   ========================================================================== */

export async function initPage({ active, auth = false } = {}) {
    hydrateIcons();
    if (auth) await requireUser();
    else await ready();

    renderHeader(active);
    renderFooter();
    renderCompareTray();
    applyTheme();

    if (session.user) {
        refreshBadges();
        setInterval(refreshBadges, 30000);
        document.addEventListener("visibilitychange", refreshBadges);
    }
    return session.user;
}

export { refreshBadges };
