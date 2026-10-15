import { initPage, api, $, $$, esc, icon, timeAgo, emptyState, toast, confirmDialog, refreshBadges } from "../app.js";

await initPage({ auth: true });

const ICONS = { message: "chat", favourite: "heart", listing: "building", system: "sparkles" };
let items = [];
let filter = "all";

function render() {
    const unread = items.filter((n) => !n.read).length;
    $("#sub").textContent = unread ? `You have ${unread} unread ${unread === 1 ? "notification" : "notifications"}.` : "You're all caught up.";
    $("#read-all").disabled = !unread;
    $("#clear-all").disabled = !items.length;

    const shown = items.filter((n) => (filter === "all" ? true : filter === "unread" ? !n.read : n.type === filter));
    $("#list").innerHTML = shown.length
        ? shown
              .map(
                  (n) => `
        <div class="notif ${n.read ? "" : "unread"}" data-id="${n.id}">
            <div class="ico ${n.type}">${icon(ICONS[n.type] || "bell")}</div>
            <div class="content">
                <strong>${esc(n.title)}</strong>
                ${n.body ? `<p>${esc(n.body)}</p>` : ""}
                <time datetime="${n.createdAt}">${timeAgo(n.createdAt)}</time>
            </div>
            ${n.link ? `<a class="cover" href="${esc(n.link)}" data-open="${n.id}" aria-label="Open"></a>` : ""}
            <div class="actions">
                ${n.read ? "" : `<button class="btn btn-ghost btn-icon btn-sm" data-read="${n.id}" title="Mark as read" aria-label="Mark as read">${icon("check")}</button>`}
                <button class="btn btn-ghost btn-icon btn-sm" data-delete="${n.id}" title="Delete" aria-label="Delete">${icon("trash")}</button>
            </div>
        </div>`
              )
              .join("")
        : emptyState({ icon: "bell", title: filter === "all" ? "No notifications" : "Nothing here", text: "We'll let you know when someone messages you or saves your listing." });
}

$("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (!b) return;
    filter = b.dataset.filter;
    $$("#tabs button").forEach((t) => t.setAttribute("aria-selected", String(t === b)));
    render();
});

$("#list").addEventListener("click", async (e) => {
    const read = e.target.closest("[data-read]");
    const del = e.target.closest("[data-delete]");
    const open = e.target.closest("[data-open]");
    if (read) {
        e.preventDefault();
        await api(`/notifications/${read.dataset.read}`, { method: "PATCH", body: { read: true } });
        items.find((n) => n.id === read.dataset.read).read = true;
        render();
        refreshBadges();
    } else if (del) {
        e.preventDefault();
        await api(`/notifications/${del.dataset.delete}`, { method: "DELETE" });
        items = items.filter((n) => n.id !== del.dataset.delete);
        render();
        refreshBadges();
    } else if (open) {
        const n = items.find((x) => x.id === open.dataset.open);
        if (n && !n.read) {
            e.preventDefault();
            await api(`/notifications/${n.id}`, { method: "PATCH", body: { read: true } }).catch(() => {});
            location.href = n.link;
        }
    }
});

$("#read-all").addEventListener("click", async () => {
    await api("/notifications/read-all", { method: "POST" });
    items.forEach((n) => (n.read = true));
    render();
    refreshBadges();
    toast("All caught up");
});

$("#clear-all").addEventListener("click", async () => {
    if (!(await confirmDialog({ title: "Clear all notifications?", confirmText: "Clear all", danger: true }))) return;
    await api("/notifications", { method: "DELETE" });
    items = [];
    render();
    refreshBadges();
});

try {
    ({ items } = await api("/notifications"));
    render();
} catch (err) {
    $("#list").innerHTML = emptyState({ icon: "alert", title: "Couldn't load notifications", text: err.message });
}
