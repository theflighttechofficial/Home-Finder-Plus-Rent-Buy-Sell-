import { initPage, api, $, esc, icon, compare, formatPrice, priceSuffix, formatNumber, emptyState } from "../app.js";

await initPage();

const host = $("#compare");

const ROWS = [
    ["Price", (l) => `${formatPrice(l.price, l.purpose)}<span class="muted small">${priceSuffix(l.purpose)}</span>`, (l) => -l.price],
    ["Purpose", (l) => (l.purpose === "sale" ? "For sale" : "For rent")],
    ["Type", (l) => esc(l.propertyType)],
    ["Location", (l) => esc([l.address?.locality, l.address?.city].filter(Boolean).join(", "))],
    ["Bedrooms", (l) => `${l.bedrooms} BHK`, (l) => l.bedrooms],
    ["Bathrooms", (l) => l.bathrooms, (l) => l.bathrooms],
    ["Built-up area", (l) => (l.builtArea ? `${formatNumber(l.builtArea)} ft²` : "—"), (l) => l.builtArea || 0],
    ["Price / ft²", (l) => (l.builtArea ? `₹${formatNumber(Math.round(l.price / l.builtArea))}` : "—"), (l) => (l.builtArea ? -l.price / l.builtArea : -Infinity)],
    ["Furnishing", (l) => esc(l.furnishing || "—")],
    ["Facing", (l) => esc(l.facing || "—")],
    ["Floor", (l) => esc(l.floor ? `${l.floor}${l.totalFloors ? ` of ${l.totalFloors}` : ""}` : "—")],
    ["Parking", (l) => (l.parking ? `${icon("check")} Yes` : "No"), (l) => (l.parking ? 1 : 0)],
    ["Rating", (l) => (l.rating ? `${icon("star", "icon-fill")} ${Number(l.rating).toFixed(1)}` : "—"), (l) => l.rating || 0],
    ["Amenities", (l) => (l.amenities?.length ? `<div class="chips">${l.amenities.slice(0, 10).map((a) => `<span class="chip chip-static">${esc(a)}</span>`).join("")}</div>` : "—"), (l) => l.amenities?.length || 0],
];

async function render() {
    const picked = compare.list();
    $("#clear").hidden = !picked.length;
    if (!picked.length) {
        host.innerHTML = emptyState({
            icon: "columns",
            title: "Nothing to compare yet",
            text: "Use the compare button on any home card to add it here. You can compare up to four homes.",
            action: `<a class="btn btn-primary" href="/search.html">${icon("search")} Browse homes</a>`,
        });
        return;
    }

    host.innerHTML = `<div class="card-pad"><div class="skeleton" style="height:300px"></div></div>`;
    const { items } = await api(`/listings/compare?ids=${picked.map((p) => p.id).join(",")}`);
    // Drop homes that no longer exist
    const found = new Set(items.map((l) => l.id));
    picked.filter((p) => !found.has(p.id)).forEach((p) => compare.remove(p.id));
    if (!items.length) return render();

    const comparable = items.length > 1 && new Set(items.map((l) => l.purpose)).size === 1;

    host.innerHTML = `
        ${!comparable && items.length > 1 ? `<div class="alert alert-info" style="margin:16px">${icon("info")}<div>You're comparing rentals with homes for sale, so price highlights are turned off.</div></div>` : ""}
        <div class="table-scroll">
            <table class="compare-table">
                <thead><tr><th></th>${items
                    .map(
                        (l) => `<td>
                    <a href="/details.html?id=${l.id}"><img src="${esc(l.images?.[0] || "")}" alt=""></a>
                    <a href="/details.html?id=${l.id}"><strong>${esc(l.title)}</strong></a>
                    <div class="mt-1"><button class="btn btn-sm btn-ghost" data-remove="${l.id}">${icon("x")} Remove</button></div>
                </td>`
                    )
                    .join("")}</tr></thead>
                <tbody>
                    ${ROWS.map(([label, fmt, score]) => {
                        let best = null;
                        if (score && items.length > 1 && (comparable || label !== "Price" && label !== "Price / ft²")) {
                            const scores = items.map(score);
                            const max = Math.max(...scores);
                            if (scores.filter((s) => s === max).length < items.length && isFinite(max)) best = max;
                        }
                        return `<tr><th scope="row">${label}</th>${items.map((l) => `<td class="${best !== null && score(l) === best ? "best" : ""}">${fmt(l)}</td>`).join("")}</tr>`;
                    }).join("")}
                </tbody>
            </table>
        </div>`;
}

host.addEventListener("click", (e) => {
    const b = e.target.closest("[data-remove]");
    if (!b) return;
    compare.remove(b.dataset.remove);
    render();
});
$("#clear").addEventListener("click", () => {
    compare.clear();
    render();
});

render().catch((err) => (host.innerHTML = emptyState({ icon: "alert", title: "Couldn't load homes", text: err.message })));
