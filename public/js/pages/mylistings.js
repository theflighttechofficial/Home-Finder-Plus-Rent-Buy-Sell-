import { initPage, api, $, esc, icon, formatPrice, priceSuffix, formatNumber, timeAgo, emptyState, toast, confirmDialog } from "../app.js";

await initPage({ auth: true });

const STATUS = {
    active: { label: "Active", cls: "badge-success" },
    rented: { label: "Rented", cls: "badge-brand" },
    sold: { label: "Sold", cls: "badge-brand" },
    inactive: { label: "Hidden", cls: "badge-warning" },
};
let items = [];
let tab = "all";

function render() {
    const counts = { all: items.length };
    for (const l of items) counts[l.status] = (counts[l.status] || 0) + 1;

    const totalViews = items.reduce((n, l) => n + (l.views || 0), 0);
    const totalSaves = items.reduce((n, l) => n + (l.favouritesCount || 0), 0);
    $("#stats").innerHTML = [
        ["Listings", items.length],
        ["Active", counts.active || 0],
        ["Total views", formatNumber(totalViews)],
        ["Saves", formatNumber(totalSaves)],
    ]
        .map(([k, v]) => `<div class="card"><strong>${v}</strong><span class="muted small">${k}</span></div>`)
        .join("");

    $("#tabs").innerHTML = [["all", "All"], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])]
        .map(([k, label]) => `<button role="tab" data-tab="${k}" aria-selected="${tab === k}">${label}<span class="count">${counts[k] || 0}</span></button>`)
        .join("");

    const shown = tab === "all" ? items : items.filter((l) => l.status === tab);
    if (!items.length) {
        $("#list").innerHTML = `<div class="card">${emptyState({
            icon: "building",
            title: "You haven't listed anything yet",
            text: "List a property for rent or sale — it's free and only takes a few minutes.",
            action: `<a class="btn btn-gradient" href="/add.html">${icon("plus")} List a property</a>`,
        })}</div>`;
        return;
    }
    if (!shown.length) {
        $("#list").innerHTML = `<div class="card">${emptyState({ icon: "search", title: "Nothing here", text: "No listings with this status." })}</div>`;
        return;
    }

    $("#list").innerHTML = shown
        .map((l) => {
            const s = STATUS[l.status] || STATUS.active;
            const done = l.purpose === "sale" ? "sold" : "rented";
            return `
        <article class="card mine-card">
            <a href="/details.html?id=${l.id}"><img src="${esc(l.images?.[0] || "")}" alt=""></a>
            <div>
                <div class="row row-wrap mb-1">
                    <span class="badge ${s.cls}">${s.label}</span>
                    <span class="badge">${l.purpose === "sale" ? "For sale" : "For rent"}</span>
                </div>
                <h3><a href="/details.html?id=${l.id}" class="text-2" style="color:var(--text)">${esc(l.title)}</a></h3>
                <div class="muted small">${icon("pin")} ${esc([l.address?.locality, l.address?.city].filter(Boolean).join(", "))}</div>
                <strong>${formatPrice(l.price, l.purpose)}</strong><span class="muted small">${priceSuffix(l.purpose)}</span>
                <div class="stats">
                    <span>${icon("eye")} ${formatNumber(l.views)} views</span>
                    <span>${icon("heart")} ${l.favouritesCount || 0} saves</span>
                    <span>${icon("calendar")} Listed ${timeAgo(l.createdAt)}</span>
                </div>
            </div>
            <div class="actions">
                <a class="btn btn-sm" href="/add.html?id=${l.id}">${icon("edit")} Edit</a>
                ${
                    l.status === "active"
                        ? `<button class="btn btn-sm" data-status="${done}" data-id="${l.id}">${icon("check")} Mark ${done}</button>
                           <button class="btn btn-sm btn-ghost" data-status="inactive" data-id="${l.id}">${icon("eyeOff")} Hide</button>`
                        : `<button class="btn btn-sm btn-soft" data-status="active" data-id="${l.id}">${icon("refresh")} Re-activate</button>`
                }
                <button class="btn btn-sm btn-danger-soft" data-delete="${l.id}">${icon("trash")} Delete</button>
            </div>
        </article>`;
        })
        .join("");
}

$("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    tab = b.dataset.tab;
    render();
});

$("#list").addEventListener("click", async (e) => {
    const st = e.target.closest("[data-status]");
    const del = e.target.closest("[data-delete]");
    if (st) {
        st.disabled = true;
        try {
            const updated = await api(`/listings/${st.dataset.id}`, { method: "PATCH", body: { status: st.dataset.status } });
            items = items.map((l) => (l.id === updated.id ? updated : l));
            toast(st.dataset.status === "active" ? "Listing is live again" : `Listing marked ${STATUS[st.dataset.status].label.toLowerCase()}`);
            render();
        } catch (err) {
            st.disabled = false;
            toast(err.message, "error");
        }
    }
    if (del) {
        const l = items.find((x) => x.id === del.dataset.delete);
        const ok = await confirmDialog({ title: "Delete this listing?", message: `"${l.title}" will be permanently removed. This can't be undone.`, confirmText: "Delete", danger: true });
        if (!ok) return;
        try {
            await api(`/listings/${l.id}`, { method: "DELETE" });
            items = items.filter((x) => x.id !== l.id);
            toast("Listing deleted");
            render();
        } catch (err) {
            toast(err.message, "error");
        }
    }
});

try {
    ({ items } = await api("/me/listings"));
    render();
} catch (err) {
    $("#list").innerHTML = emptyState({ icon: "alert", title: "Couldn't load your listings", text: err.message });
}
