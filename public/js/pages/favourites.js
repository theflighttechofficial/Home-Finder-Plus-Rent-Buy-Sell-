import { initPage, api, $, $$, icon, listingCard, skeletonCards, emptyState } from "../app.js";

await initPage({ auth: true });

const list = $("#list");
const empty = () =>
    `<div style="grid-column:1/-1" class="card">${emptyState({
        icon: "heart",
        title: "No saved homes yet",
        text: "Tap the heart on any home to save it here for later.",
        action: `<a class="btn btn-primary" href="/search.html">${icon("search")} Start exploring</a>`,
    })}</div>`;

function updateCount() {
    const n = $$(".listing-card", list).length;
    $("#sub").textContent = n ? `${n} ${n === 1 ? "home" : "homes"} saved` : "Homes you've hearted, all in one place.";
    if (!n) list.innerHTML = empty();
}

list.innerHTML = skeletonCards(4);
try {
    const { items } = await api("/me/favourites");
    list.innerHTML = items.map((l, i) => listingCard(l, { index: i })).join("");
    updateCount();
} catch (err) {
    list.innerHTML = emptyState({ icon: "alert", title: "Couldn't load saved homes", text: err.message });
}

// Removing a heart here removes the card
document.addEventListener("favourite-change", ({ detail }) => {
    if (detail.saved) return;
    const card = $(`[data-fav="${detail.id}"]`, list)?.closest(".listing-card");
    if (!card) return;
    card.style.transition = "opacity .25s, transform .25s";
    card.style.opacity = "0";
    card.style.transform = "scale(.96)";
    setTimeout(() => {
        card.remove();
        updateCount();
    }, 250);
});
