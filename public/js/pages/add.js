import {
    initPage, api, $, $$, esc, icon, params, store, debounce, toast, setLoading, showFieldErrors, formatPrice, confirmDialog,
} from "../app.js";

const PRESET_AMENITIES = [
    "WiFi", "Lift", "Power Backup", "CCTV Security", "Gated Community", "Gym", "Swimming Pool", "Club House", "Garden",
    "Children's Play Area", "Gas Pipeline", "24x7 Water", "Air Conditioning", "Modular Kitchen", "Balcony", "Pet Friendly",
    "Wardrobes", "Intercom", "Parking",
];
const DRAFT_KEY = "hf-listing-draft";

const user = await initPage({ active: "add", auth: true });

const form = $("#listing-form");
const editId = params().get("id");
const state = { images: [], amenities: new Set(), coordinates: null };
let map;
let marker;

/* ---------- Selects ---------- */
const meta = await api("/listings/meta").catch(() => null);
const fill = (sel, list) => $(sel).insertAdjacentHTML("beforeend", list.map((v) => `<option>${esc(v)}</option>`).join(""));
fill("#propertyType", meta?.propertyTypes || ["Apartment", "Independent House", "Villa", "Penthouse", "Duplex", "Studio", "Loft", "Plot"]);
fill("#furnishing", meta?.furnishing || ["Fully furnished", "Semi-furnished", "Unfurnished"]);
fill("#facing", meta?.facing || ["North", "South", "East", "West"]);
$("#city-list").innerHTML = (meta?.cities || []).map((c) => `<option value="${esc(c.name)}">`).join("");

/* ---------- Amenities ---------- */
const allAmenities = new Set([...PRESET_AMENITIES, ...(meta?.amenities || [])]);
function renderAmenities() {
    for (const a of state.amenities) allAmenities.add(a);
    $("#amenities").innerHTML = [...allAmenities]
        .map((a) => `<button type="button" class="chip ${state.amenities.has(a) ? "active" : ""}" data-amenity="${esc(a)}" aria-pressed="${state.amenities.has(a)}">${state.amenities.has(a) ? icon("check") : ""}${esc(a)}</button>`)
        .join("");
}
$("#amenities").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-amenity]");
    if (!chip) return;
    const a = chip.dataset.amenity;
    state.amenities.has(a) ? state.amenities.delete(a) : state.amenities.add(a);
    renderAmenities();
    saveDraft();
});
function addCustomAmenity() {
    const input = $("#custom-amenity");
    const v = input.value.trim();
    if (!v) return;
    state.amenities.add(v);
    input.value = "";
    renderAmenities();
    saveDraft();
}
$("#add-amenity").addEventListener("click", addCustomAmenity);
$("#custom-amenity").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        addCustomAmenity();
    }
});

/* ---------- Price label ---------- */
function updatePurposeUi() {
    const sale = form.purpose.value === "sale";
    $("#price-label").textContent = sale ? "Asking price (₹)" : "Monthly rent (₹)";
    const p = Number(form.price.value);
    $("#price-hint").textContent = p > 0 ? `${formatPrice(p, form.purpose.value)}${sale ? "" : " per month"}` : sale ? "Total price, e.g. 8500000 for ₹85 L" : "";
}
form.addEventListener("input", (e) => {
    if (["purpose", "price"].includes(e.target.name)) updatePurposeUi();
    if (e.target.name === "description") $("#desc-count").textContent = e.target.value.length;
});

/* ---------- Map ---------- */
function setPin(lat, lng, { pan = true } = {}) {
    state.coordinates = lat == null ? null : { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    if (!map) return;
    if (!state.coordinates) {
        marker?.remove();
        marker = null;
        $("#coords").textContent = "Click the map to drop a pin.";
        return;
    }
    if (!marker) marker = L.marker([lat, lng], { draggable: true }).addTo(map).on("dragend", (ev) => {
        const p = ev.target.getLatLng();
        setPin(p.lat, p.lng, { pan: false });
        saveDraft();
    });
    else marker.setLatLng([lat, lng]);
    if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 14));
    $("#coords").textContent = `Pinned at ${state.coordinates.lat}, ${state.coordinates.lng} — drag the pin to adjust.`;
}
if (window.L) {
    map = L.map("map").setView([22.5, 79], 4.5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    map.on("click", (e) => {
        setPin(e.latlng.lat, e.latlng.lng, { pan: false });
        saveDraft();
    });
}
$("#use-location").addEventListener("click", () => {
    if (!navigator.geolocation) return toast("Location isn't available in this browser", "error");
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            setPin(pos.coords.latitude, pos.coords.longitude);
            saveDraft();
        },
        () => toast("Couldn't get your location. Click the map instead.", "error"),
        { timeout: 10000 }
    );
});
$("#clear-pin").addEventListener("click", () => {
    setPin(null);
    saveDraft();
});

/* ---------- Photos ---------- */
function renderThumbs() {
    $("#thumbs").innerHTML = state.images
        .map(
            (img, i) => `
        <div class="thumb ${i === 0 ? "cover" : ""} ${img.uploading ? "uploading" : ""}">
            <img src="${esc(img.preview || img.url)}" alt="Photo ${i + 1}">
            ${img.uploading ? '<span class="spinner"></span>' : ""}
            ${i === 0 ? '<span class="badge badge-brand cover-label">Cover</span>' : ""}
            ${
                img.uploading
                    ? ""
                    : `<div class="tools">
                ${i > 0 ? `<button type="button" data-cover="${i}" title="Make cover" aria-label="Make cover photo">${icon("star")}</button>` : ""}
                <button type="button" data-remove="${i}" title="Remove" aria-label="Remove photo">${icon("trash")}</button>
            </div>`
            }
        </div>`
        )
        .join("");
}
$("#thumbs").addEventListener("click", (e) => {
    const cover = e.target.closest("[data-cover]");
    const remove = e.target.closest("[data-remove]");
    if (cover) {
        const [img] = state.images.splice(Number(cover.dataset.cover), 1);
        state.images.unshift(img);
    } else if (remove) {
        state.images.splice(Number(remove.dataset.remove), 1);
    } else return;
    renderThumbs();
    saveDraft();
});

async function uploadFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith("image/"));
    const room = 12 - state.images.length;
    if (!files.length) return;
    if (room <= 0) return toast("You can add up to 12 photos", "error");
    const batch = files.slice(0, room);
    if (files.length > room) toast(`Only the first ${room} photos were added (12 max)`, "info");

    const tooBig = batch.filter((f) => f.size > 5 * 1024 * 1024);
    if (tooBig.length) return toast("Each photo must be under 5 MB", "error");

    const placeholders = batch.map((f) => ({ preview: URL.createObjectURL(f), uploading: true }));
    state.images.push(...placeholders);
    renderThumbs();

    const fd = new FormData();
    batch.forEach((f) => fd.append("images", f));
    try {
        const { urls } = await api("/uploads", { method: "POST", form: fd });
        placeholders.forEach((p, i) => {
            URL.revokeObjectURL(p.preview);
            delete p.preview;
            delete p.uploading;
            p.url = urls[i];
        });
        $('[data-field="images"]').classList.remove("has-error");
        saveDraft();
    } catch (err) {
        state.images = state.images.filter((img) => !placeholders.includes(img));
        toast(err.message, "error");
    }
    renderThumbs();
}
$("#photo-input").addEventListener("change", (e) => {
    uploadFiles(e.target.files);
    e.target.value = "";
});
const dz = $("#dropzone");
["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => (e.preventDefault(), dz.classList.add("drag"))));
["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove("drag")));
dz.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadFiles(e.dataTransfer.files);
});

/* ---------- Serialize / fill ---------- */
function collect() {
    const v = (name) => form.elements[name]?.value.trim() ?? "";
    const num = (name) => (v(name) === "" ? undefined : Number(v(name)));
    const opt = (name) => v(name) || undefined;
    return {
        purpose: form.purpose.value,
        title: v("title"),
        propertyType: v("propertyType") || undefined,
        price: num("price"),
        tag: opt("tag"),
        description: v("description"),
        bedrooms: num("bedrooms") ?? 0,
        bathrooms: num("bathrooms") ?? 0,
        builtArea: num("builtArea"),
        carpetArea: num("carpetArea"),
        floor: opt("floor"),
        totalFloors: num("totalFloors"),
        furnishing: opt("furnishing"),
        facing: opt("facing"),
        parking: form.parking.checked,
        address: {
            line: opt("address.line"),
            locality: opt("address.locality"),
            city: v("address.city"),
            state: opt("address.state"),
            pincode: opt("address.pincode"),
        },
        coordinates: state.coordinates,
        amenities: [...state.amenities],
        nearby: v("nearby").split("\n").map((s) => s.trim()).filter(Boolean),
        images: state.images.filter((i) => i.url).map((i) => i.url),
        contact: { name: opt("contact.name"), phone: opt("contact.phone") },
        ...(editId ? { status: v("status") } : {}),
    };
}

function fillForm(d) {
    const set = (name, value) => {
        const el = form.elements[name];
        if (el && value != null) el.value = value;
    };
    form.purpose.value = d.purpose || "rent";
    ["title", "propertyType", "price", "tag", "description", "bedrooms", "bathrooms", "builtArea", "carpetArea", "floor", "totalFloors", "furnishing", "facing", "status"].forEach((k) => set(k, d[k]));
    form.parking.checked = Boolean(d.parking);
    for (const k of ["line", "locality", "city", "state", "pincode"]) set(`address.${k}`, d.address?.[k]);
    set("contact.name", d.contact?.name);
    set("contact.phone", d.contact?.phone);
    set("nearby", (d.nearby || []).join("\n"));
    state.images = (d.images || []).map((url) => ({ url }));
    state.amenities = new Set(d.amenities || []);
    if (d.coordinates) setPin(d.coordinates.lat, d.coordinates.lng);
    $("#desc-count").textContent = (d.description || "").length;
    renderThumbs();
    renderAmenities();
    updatePurposeUi();
}

/* ---------- Drafts (new listings only) ---------- */
const saveDraft = debounce(() => {
    if (editId) return;
    store.set(DRAFT_KEY, collect());
    $("#draft-status").textContent = `Draft saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}, 600);
form.addEventListener("input", saveDraft);
form.addEventListener("change", saveDraft);

$("#discard").addEventListener("click", async () => {
    if (editId) return (location.href = `/details.html?id=${editId}`);
    if (!(await confirmDialog({ title: "Discard this draft?", message: "Everything you've entered will be cleared.", confirmText: "Discard", danger: true }))) return;
    store.remove(DRAFT_KEY);
    location.reload();
});

/* ---------- Init ---------- */
if (editId) {
    document.title = "Edit listing — HomeFinder+";
    $("#form-title").textContent = "Edit listing";
    $("#form-sub").textContent = "Update details, photos or mark it as rented / sold.";
    $("#submit").innerHTML = `${icon("check")} Save changes`;
    $("#discard").textContent = "Cancel";
    $("#status-field").hidden = false;
    try {
        const listing = await api(`/listings/${encodeURIComponent(editId)}`);
        if (!listing.isOwner) {
            toast("You can only edit your own listings", "error");
            location.replace(`/details.html?id=${editId}`);
        }
        fillForm(listing);
    } catch (err) {
        toast(err.message, "error");
    }
} else {
    const draft = store.get(DRAFT_KEY);
    if (draft) {
        fillForm(draft);
        $("#draft-status").textContent = "Restored your saved draft";
    } else {
        fillForm({ contact: { name: user.name, phone: user.phone }, address: { city: user.city } });
    }
}

/* ---------- Submit ---------- */
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (state.images.some((i) => i.uploading)) return toast("Please wait for photos to finish uploading", "info");

    const body = collect();
    const errors = {};
    if (body.title.length < 5) errors.title = "Title must be at least 5 characters";
    if (!body.propertyType) errors.propertyType = "Choose a property type";
    if (!(body.price > 0)) errors.price = "Enter a price";
    if (!body.address.city) errors["address.city"] = "Enter a city";
    if (!body.images.length) errors.images = "Add at least one photo";
    showFieldErrors(form, errors);
    if (Object.keys(errors).length) {
        form.querySelector(".has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return toast(Object.values(errors)[0], "error");
    }

    const btn = $("#submit");
    setLoading(btn, true, editId ? "Saving…" : "Publishing…");
    try {
        const saved = await api(editId ? `/listings/${editId}` : "/listings", { method: editId ? "PATCH" : "POST", body });
        if (!editId) store.remove(DRAFT_KEY);
        toast(editId ? "Listing updated" : "Your listing is live!");
        location.href = `/details.html?id=${saved.id}`;
    } catch (err) {
        setLoading(btn, false);
        showFieldErrors(form, err.errors);
        form.querySelector(".has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
        toast(err.message, "error");
    }
});

/* Highlight the section in view */
const links = $$(".form-steps a");
const io = new IntersectionObserver(
    (entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            links.forEach((a) => a.classList.toggle("current", a.getAttribute("href") === `#${entry.target.id}`));
        }
    },
    { rootMargin: "-40% 0px -55% 0px" }
);
$$(".form-section").forEach((s) => io.observe(s));

