import {
    initPage, api, session, $, esc, icon, avatar, params, formatPrice, priceSuffix, formatNumber, timeAgo,
    listingCard, emptyState, toast, compare, loginUrl, setLoading, confirmDialog,
} from "../app.js";

await initPage();

const id = params().get("id");
const root = $("#details");
let listing;
let photoIndex = 0;

const AMENITY_ICON = (a) => {
    const s = a.toLowerCase();
    if (s.includes("park")) return "car";
    if (s.includes("wifi") || s.includes("internet")) return "globe";
    if (s.includes("security") || s.includes("cctv")) return "shield";
    if (s.includes("power") || s.includes("solar")) return "zap";
    return "check";
};

function notFound(message) {
    root.innerHTML = emptyState({
        icon: "home",
        title: "Home not found",
        text: message || "This listing may have been removed or the link is incorrect.",
        action: `<a class="btn btn-primary" href="/search.html">${icon("search")} Browse homes</a>`,
    });
}

function gallery(images) {
    const shown = images.slice(0, 5);
    const extra = images.length - shown.length;
    return `
        <div class="gallery count-${Math.min(shown.length, 5)}">
            ${shown
                .map(
                    (src, i) => `<button data-photo="${i}" aria-label="Open photo ${i + 1}">
                        <img src="${esc(src)}" alt="${esc(listing.title)} photo ${i + 1}" ${i ? 'loading="lazy"' : ""}>
                        ${i === shown.length - 1 && extra > 0 ? `<span class="more">+${extra} photos</span>` : ""}
                    </button>`
                )
                .join("")}
        </div>`;
}

function spec(ic, label, value) {
    if (value == null || value === "") return "";
    return `<div class="spec">${icon(ic)}<div><span>${label}</span><strong>${esc(value)}</strong></div></div>`;
}

function render() {
    const l = listing;
    const where = [l.address?.line, l.address?.locality, l.address?.city, l.address?.state].filter(Boolean).join(", ");
    const fav = session.favourites.has(l.id);
    const inCompare = compare.has(l.id);
    document.title = `${l.title} — HomeFinder+`;

    const contactBox = l.isOwner
        ? `<div class="card card-pad">
                <h3>This is your listing</h3>
                <p class="muted small">${formatNumber(l.views)} views · ${l.favouritesCount || 0} saves</p>
                <div class="row row-wrap">
                    <a class="btn btn-primary" href="/add.html?id=${l.id}">${icon("edit")} Edit listing</a>
                    <a class="btn" href="/mylistings.html">Manage</a>
                </div>
           </div>`
        : `<div class="card card-pad owner-card">
                <div class="row mb-2">
                    ${avatar(l.owner || { name: l.contact?.name })}
                    <div>
                        <strong>${esc(l.contact?.name || l.owner?.name || "Owner")}</strong>
                        <div class="small muted">${l.contact?.verified ? `<span class="badge badge-success">${icon("shield")} Verified owner</span>` : "Property owner"}</div>
                    </div>
                </div>
                <form id="contact-form" class="stack">
                    <div class="field">
                        <label for="msg">Message the owner</label>
                        <textarea class="textarea" id="msg" name="text" rows="4" maxlength="2000" required>Hi, I'm interested in "${esc(l.title)}". Is it still available? I'd like to schedule a visit.</textarea>
                    </div>
                    <button class="btn btn-gradient btn-block" type="submit">${icon("send")} Send message</button>
                </form>
                ${l.contact?.phone ? `<button class="btn btn-block mt-1" id="reveal-phone">${icon("phone")} Show phone number</button>` : ""}
           </div>`;

    root.innerHTML = `
        <nav class="small muted mb-2" aria-label="Breadcrumb">
            <a href="/">Home</a> / <a href="/search.html?purpose=${l.purpose}">${l.purpose === "sale" ? "Buy" : "Rent"}</a> /
            <a href="/search.html?purpose=${l.purpose}&city=${encodeURIComponent(l.address?.city || "")}">${esc(l.address?.city)}</a>
        </nav>
        ${l.images?.length ? gallery(l.images) : ""}
        <div class="details-layout">
            <div class="stack">
                <div class="title-row">
                    <div>
                        <div class="row row-wrap mb-1">
                            <span class="badge ${l.purpose === "sale" ? "badge-brand" : "badge-success"}">${l.purpose === "sale" ? "For sale" : "For rent"}</span>
                            ${l.tag ? `<span class="badge">${esc(l.tag)}</span>` : ""}
                            ${l.status !== "active" ? `<span class="badge badge-warning">${esc(l.status)}</span>` : ""}
                            ${l.rating ? `<span class="badge">${icon("star", "icon-fill")} ${Number(l.rating).toFixed(1)}</span>` : ""}
                        </div>
                        <h1>${esc(l.title)}</h1>
                        <div class="muted row">${icon("pin")} ${esc(where)}</div>
                    </div>
                    <div class="row">
                        <button class="btn btn-icon fav-btn-plain ${fav ? "active" : ""}" data-fav="${l.id}" aria-pressed="${fav}" aria-label="Save to favourites" title="Save">${icon("heart")}</button>
                        <button class="btn btn-icon ${inCompare ? "active" : ""}" data-compare="${l.id}" data-title="${esc(l.title)}" data-image="${esc(l.images?.[0] || "")}" aria-label="Add to compare" title="Compare">${icon("columns")}</button>
                        <button class="btn btn-icon" id="share" aria-label="Share" title="Share">${icon("share")}</button>
                    </div>
                </div>

                <div class="price-big">${formatPrice(l.price, l.purpose)} <small>${priceSuffix(l.purpose)}${l.purpose === "sale" && l.builtArea ? ` · ₹${formatNumber(Math.round(l.price / l.builtArea))}/ft²` : ""}</small></div>

                <div class="spec-grid">
                    ${spec("bed", "Bedrooms", `${l.bedrooms} BHK`)}
                    ${spec("bath", "Bathrooms", l.bathrooms)}
                    ${spec("area", "Built-up area", l.builtArea ? `${formatNumber(l.builtArea)} ft²` : null)}
                    ${spec("area", "Carpet area", l.carpetArea ? `${formatNumber(l.carpetArea)} ft²` : null)}
                    ${spec("building", "Type", l.propertyType)}
                    ${spec("sofa", "Furnishing", l.furnishing)}
                    ${spec("layers", "Floor", l.floor ? `${l.floor}${l.totalFloors ? ` of ${l.totalFloors}` : ""}` : null)}
                    ${spec("compass", "Facing", l.facing)}
                    ${spec("car", "Parking", l.parking ? "Available" : "Not available")}
                    ${spec("calendar", "Listed", timeAgo(l.createdAt))}
                </div>

                ${l.description ? `<div class="card card-pad"><h2>About this home</h2><p class="description mb-0">${esc(l.description)}</p></div>` : ""}

                ${l.amenities?.length ? `<div class="card card-pad"><h2>Amenities</h2><ul class="clean amenity-list">${l.amenities.map((a) => `<li>${icon(AMENITY_ICON(a))} ${esc(a)}</li>`).join("")}</ul></div>` : ""}

                ${l.nearby?.length ? `<div class="card card-pad"><h2>What's nearby</h2><ul class="clean amenity-list">${l.nearby.map((a) => `<li>${icon("pin")} ${esc(a)}</li>`).join("")}</ul></div>` : ""}

                ${l.coordinates ? `<div class="card card-pad"><div class="card-head"><h2>Location</h2><a class="btn btn-sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${l.coordinates.lat},${l.coordinates.lng}">${icon("pin")} Open in Maps</a></div><div class="map" id="map"></div></div>` : ""}
            </div>
            <aside>
                ${contactBox}
                <div class="card card-pad small muted">
                    <div class="row">${icon("eye")} ${formatNumber(l.views)} views</div>
                    <div class="row mt-1">${icon("heart")} Saved by ${l.favouritesCount || 0} ${l.favouritesCount === 1 ? "person" : "people"}</div>
                    <div class="row mt-1">${icon("shield")} Never pay before visiting a property.</div>
                </div>
            </aside>
        </div>`;

    if (l.coordinates && window.L) {
        const map = L.map("map", { scrollWheelZoom: false }).setView([l.coordinates.lat, l.coordinates.lng], 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
        L.circle([l.coordinates.lat, l.coordinates.lng], { radius: 250, color: "#5b4cf0", fillOpacity: 0.15 }).addTo(map);
        L.marker([l.coordinates.lat, l.coordinates.lng], {
            icon: L.divIcon({ className: "", html: `<div class="logo-mark" style="width:34px;height:34px">${icon("home")}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] }),
        }).addTo(map);
    }
}

/* Lightbox */
const lb = $("#lightbox");
function openPhoto(i) {
    photoIndex = (i + listing.images.length) % listing.images.length;
    $("img", lb).src = listing.images[photoIndex];
    $(".counter", lb).textContent = `${photoIndex + 1} / ${listing.images.length}`;
    lb.classList.add("open");
}
lb.addEventListener("click", (e) => {
    const act = e.target.closest("[data-lb]")?.dataset.lb;
    if (act === "close" || e.target === lb) lb.classList.remove("open");
    if (act === "prev") openPhoto(photoIndex - 1);
    if (act === "next") openPhoto(photoIndex + 1);
});
document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") lb.classList.remove("open");
    if (e.key === "ArrowLeft") openPhoto(photoIndex - 1);
    if (e.key === "ArrowRight") openPhoto(photoIndex + 1);
});

root.addEventListener("click", async (e) => {
    const photo = e.target.closest("[data-photo]");
    if (photo) return openPhoto(Number(photo.dataset.photo));

    if (e.target.closest("#share")) {
        const url = location.href;
        if (navigator.share) {
            navigator.share({ title: listing.title, url }).catch(() => {});
        } else {
            await navigator.clipboard?.writeText(url);
            toast("Link copied to clipboard");
        }
    }

    const reveal = e.target.closest("#reveal-phone");
    if (reveal) {
        if (!session.user) return toast("Log in to see the owner's number", "info", { action: "Log in", href: loginUrl() });
        reveal.outerHTML = `<a class="btn btn-block mt-1" href="tel:${esc(listing.contact.phone.replace(/\s/g, ""))}">${icon("phone")} ${esc(listing.contact.phone)}</a>`;
    }
});

root.addEventListener("submit", async (e) => {
    if (e.target.id !== "contact-form") return;
    e.preventDefault();
    if (!session.user) {
        const ok = await confirmDialog({ title: "Log in to message the owner", message: "Create a free account or log in to start a conversation.", confirmText: "Log in" });
        if (ok) location.href = loginUrl();
        return;
    }
    const btn = $("button[type=submit]", e.target);
    setLoading(btn, true, "Sending…");
    try {
        const conv = await api("/conversations", { method: "POST", body: { listingId: listing.id, text: e.target.text.value } });
        toast("Message sent", "success", { action: "Open chat", href: `/messages.html?c=${conv.id}` });
        e.target.innerHTML = `<div class="alert alert-success">${icon("checkCircle")}<div>Message sent! The owner will reply in <a href="/messages.html?c=${conv.id}">Messages</a>.</div></div>`;
    } catch (err) {
        toast(err.message, "error");
        setLoading(btn, false);
    }
});

if (!id) notFound();
else {
    try {
        listing = await api(`/listings/${encodeURIComponent(id)}`);
        if (listing.isFavourite) session.favourites.add(listing.id);
        render();

        const { items } = await api(`/listings/${listing.id}/similar`);
        if (items.length) {
            $("#similar").innerHTML = items.map((l, i) => listingCard(l, { index: i })).join("");
            $("#similar-section").hidden = false;
        }
    } catch (err) {
        notFound(err.status === 404 ? err.message : `Couldn't load this home: ${err.message}`);
    }
}
