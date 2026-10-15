import { initPage, api, $, $$, esc, icon, listingCard, skeletonCards, emptyState, debounce, formatPrice } from "../app.js";

await initPage({ active: new URLSearchParams(location.search).get("purpose") === "sale" ? "sale" : new URLSearchParams(location.search).get("purpose") === "rent" ? "rent" : "home" });

const form = $("#filter-form");
const FILTER_KEYS = ["purpose", "q", "city", "type", "minPrice", "maxPrice", "bedrooms", "furnishing", "facing", "minRating", "parking", "amenities", "sort", "page"];
const LABELS = { city: "City", type: "Type", minPrice: "Min ₹", maxPrice: "Max ₹", bedrooms: "Beds", furnishing: "", facing: "Facing", minRating: "Rating", parking: "", amenities: "" };

let state = Object.fromEntries(FILTER_KEYS.map((k) => [k, new URLSearchParams(location.search).get(k) || ""]));
let meta;
let request = 0;

function syncControls() {
    for (const el of form.elements) {
        if (!el.name) continue;
        if (el.type === "checkbox") el.checked = state[el.name] === "true";
        else el.value = state[el.name] || "";
    }
    $("#q").value = state.q;
    $("#sort").value = state.sort || "newest";
    $$("#purpose-toggle button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.purpose === state.purpose)));
    $$('[data-chip-group="bedrooms"] .chip').forEach((c) => c.classList.toggle("active", c.dataset.value === state.bedrooms));
    const selected = new Set(state.amenities.split(",").filter(Boolean));
    $$("#amenity-chips .chip").forEach((c) => c.classList.toggle("active", selected.has(c.dataset.value)));

    const title = state.purpose === "rent" ? "Homes for rent" : state.purpose === "sale" ? "Homes for sale" : "Explore homes";
    $("#page-title").textContent = state.city ? `${title} in ${state.city}` : title;
    document.title = `${$("#page-title").textContent} — HomeFinder+`;

    const p = meta?.purposes?.[state.purpose];
    $("#budget-hint").textContent = p ? `Listings range ${formatPrice(p.min, state.purpose)} – ${formatPrice(p.max, state.purpose)}` : "";
}

function renderActiveFilters() {
    const chips = [];
    for (const key of Object.keys(LABELS)) {
        if (!state[key]) continue;
        if (key === "amenities") {
            state.amenities.split(",").filter(Boolean).forEach((a) => chips.push({ key, value: a, text: a }));
            continue;
        }
        let text = state[key];
        if (key === "parking") text = "Parking";
        if (key === "bedrooms") text = `${state[key]}+ BHK`;
        if (key === "minRating") text = `${state[key]}+ ★`;
        if (key === "minPrice" || key === "maxPrice") text = `${LABELS[key]} ${Number(state[key]).toLocaleString("en-IN")}`;
        else if (LABELS[key] && key !== "bedrooms" && key !== "minRating") text = `${LABELS[key]}: ${text}`;
        chips.push({ key, value: state[key], text });
    }
    $("#active-filters").innerHTML = chips
        .map((c) => `<button class="chip active" data-remove="${c.key}" data-value="${esc(c.value)}">${esc(c.text)} <span class="x">${icon("x")}</span></button>`)
        .join("");
}

function pushUrl() {
    const qs = new URLSearchParams();
    for (const k of FILTER_KEYS) if (state[k] && !(k === "sort" && state[k] === "newest") && !(k === "page" && state[k] === "1")) qs.set(k, state[k]);
    history.replaceState(null, "", `${location.pathname}${qs.toString() ? "?" + qs : ""}`);
    return qs;
}

async function load() {
    const id = ++request;
    const qs = pushUrl();
    qs.set("limit", "12");
    syncControls();
    renderActiveFilters();
    $("#results").innerHTML = skeletonCards(6);
    $("#count").textContent = "Searching…";

    try {
        const data = await api(`/listings?${qs}`);
        if (id !== request) return;

        $("#count").innerHTML = `<strong>${data.total}</strong> ${data.total === 1 ? "home" : "homes"} found`;
        $("#results").innerHTML = data.items.length
            ? data.items.map((l, i) => listingCard(l, { index: i })).join("")
            : `<div style="grid-column:1/-1">${emptyState({
                  title: "No homes match your filters",
                  text: "Try widening your budget, removing a filter or searching a different city.",
                  action: `<button class="btn btn-primary" data-reset>${icon("refresh")} Clear all filters</button>`,
              })}</div>`;
        renderPagination(data.page, data.pages);
    } catch (err) {
        if (id !== request) return;
        $("#count").textContent = "";
        $("#results").innerHTML = `<div style="grid-column:1/-1">${emptyState({ icon: "alert", title: "Couldn't load homes", text: err.message })}</div>`;
        $("#pagination").innerHTML = "";
    }
}

function renderPagination(page, pages) {
    const nav = $("#pagination");
    if (pages <= 1) {
        nav.innerHTML = "";
        return;
    }
    const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
    const sorted = [...nums].sort((a, b) => a - b);
    let html = `<button data-page="${page - 1}" ${page === 1 ? "disabled" : ""} aria-label="Previous page">${icon("chevronLeft")}</button>`;
    sorted.forEach((n, i) => {
        if (i && n - sorted[i - 1] > 1) html += `<button disabled>…</button>`;
        html += `<button data-page="${n}" ${n === page ? 'aria-current="page"' : ""}>${n}</button>`;
    });
    html += `<button data-page="${page + 1}" ${page === pages ? "disabled" : ""} aria-label="Next page">${icon("chevronRight")}</button>`;
    nav.innerHTML = html;
}

function update(changes, { resetPage = true } = {}) {
    Object.assign(state, changes);
    if (resetPage) state.page = "";
    load();
}

const debouncedUpdate = debounce(update, 350);

// Controls
form.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.name) return;
    const value = el.type === "checkbox" ? (el.checked ? "true" : "") : el.value;
    (el.type === "number" ? debouncedUpdate : update)({ [el.name]: value });
});
$("#q").addEventListener("input", (e) => debouncedUpdate({ q: e.target.value.trim() }));
$("#sort").addEventListener("change", (e) => update({ sort: e.target.value }));
$("#purpose-toggle").addEventListener("click", (e) => {
    const b = e.target.closest("[data-purpose]");
    if (b) update({ purpose: b.dataset.purpose, minPrice: "", maxPrice: "" });
});
$('[data-chip-group="bedrooms"]').addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (c) update({ bedrooms: c.dataset.value });
});
$("#amenity-chips").addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (!c) return;
    const set = new Set(state.amenities.split(",").filter(Boolean));
    set.has(c.dataset.value) ? set.delete(c.dataset.value) : set.add(c.dataset.value);
    update({ amenities: [...set].join(",") });
});
$("#active-filters").addEventListener("click", (e) => {
    const c = e.target.closest("[data-remove]");
    if (!c) return;
    const key = c.dataset.remove;
    if (key === "amenities") update({ amenities: state.amenities.split(",").filter((a) => a && a !== c.dataset.value).join(",") });
    else update({ [key]: "" });
});
$("#pagination").addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (!b || b.disabled) return;
    update({ page: b.dataset.page }, { resetPage: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
});
const reset = () => {
    state = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""]));
    load();
};
$("#reset").addEventListener("click", reset);
document.addEventListener("click", (e) => e.target.closest("[data-reset]") && reset());
$("#open-filters").addEventListener("click", () => {
    if (!$(".drawer-backdrop")) document.body.insertAdjacentHTML("beforeend", '<div class="drawer-backdrop" data-action="close-overlays"></div>');
    document.body.classList.add("filters-open");
});

// Populate dropdowns from the server, then load results
try {
    meta = await api("/listings/meta");
    $("#f-city").insertAdjacentHTML("beforeend", meta.cities.map((c) => `<option value="${esc(c.name)}">${esc(c.name)} (${c.count})</option>`).join(""));
    $("#f-type").insertAdjacentHTML("beforeend", meta.propertyTypes.map((t) => `<option>${esc(t)}</option>`).join(""));
    $("#f-furnishing").insertAdjacentHTML("beforeend", meta.furnishing.map((t) => `<option>${esc(t)}</option>`).join(""));
    $("#f-facing").insertAdjacentHTML("beforeend", meta.facing.map((t) => `<option>${esc(t)}</option>`).join(""));
    $("#amenity-chips").innerHTML = meta.amenities.map((a) => `<button type="button" class="chip" data-value="${esc(a)}">${esc(a)}</button>`).join("");
} catch {
    /* filters still work with free text */
}
load();
