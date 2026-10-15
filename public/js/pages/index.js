import { initPage, api, $, esc, icon, listingCard, skeletonCards, formatNumber } from "../app.js";

const CITY_COLORS = [
    ["#5b4cf0", "#8b3ff2"], ["#ff7a59", "#f0436b"], ["#0ea5a4", "#2563eb"], ["#f59e0b", "#ef4444"],
    ["#10b981", "#0ea5e9"], ["#8b5cf6", "#ec4899"], ["#3b82f6", "#06b6d4"], ["#e11d48", "#9333ea"],
];

await initPage({ active: "home" });

const form = $("#hero-search");
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const qs = new URLSearchParams();
    for (const [k, v] of data) if (v) qs.set(k, v);
    location.href = `/search.html?${qs}`;
});

$("#featured-rent").innerHTML = skeletonCards(4);
$("#featured-sale").innerHTML = skeletonCards(4);

api("/listings/meta").then((meta) => {
    $('[data-stat="total"]').textContent = formatNumber(meta.total);
    $('[data-stat="cities"]').textContent = meta.cities.length;

    form.city.insertAdjacentHTML("beforeend", meta.cities.map((c) => `<option>${esc(c.name)}</option>`).join(""));
    form.type.insertAdjacentHTML("beforeend", meta.propertyTypes.map((t) => `<option>${esc(t)}</option>`).join(""));

    $("#cities").innerHTML = meta.cities
        .slice(0, 10)
        .map((c, i) => {
            const [c1, c2] = CITY_COLORS[i % CITY_COLORS.length];
            return `<a class="city-tile" style="--c1:${c1};--c2:${c2}" href="/search.html?city=${encodeURIComponent(c.name)}">${icon("building")}<strong>${esc(c.name)}</strong><span>${c.count} ${c.count === 1 ? "home" : "homes"}</span></a>`;
        })
        .join("");
});

const load = async (sel, query) => {
    try {
        const { items } = await api(`/listings?${query}`);
        $(sel).innerHTML = items.map((l, i) => listingCard(l, { index: i })).join("");
    } catch (err) {
        $(sel).innerHTML = `<p class="muted">${esc(err.message)}</p>`;
    }
};
load("#featured-rent", "purpose=rent&sort=rating&limit=8");
load("#featured-sale", "purpose=sale&sort=newest&limit=4");
