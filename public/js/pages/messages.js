import { initPage, api, $, esc, icon, avatar, params, timeAgo, formatPrice, emptyState, toast, refreshBadges } from "../app.js";

await initPage({ auth: true });

const chat = $("#chat");
let convos = [];
let activeId = params().get("c");
let lastAt = null;

const dayLabel = (d) => {
    const date = new Date(d);
    const today = new Date();
    const yest = new Date(Date.now() - 864e5);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yest.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const clock = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function renderList() {
    const q = $("#search").value.trim().toLowerCase();
    const shown = convos.filter((c) => !q || `${c.other?.name} ${c.listing?.title} ${c.lastMessage?.text}`.toLowerCase().includes(q));
    $("#convos").innerHTML = shown.length
        ? shown
              .map(
                  (c) => `
        <button class="convo ${c.id === activeId ? "active" : ""}" data-id="${c.id}">
            ${avatar(c.other)}
            <div class="meta">
                <strong><span>${esc(c.other?.name || "Unknown user")}</span><time>${c.lastMessage ? timeAgo(c.lastMessage.at) : ""}</time></strong>
                ${c.listing ? `<div class="about">${esc(c.listing.title)}</div>` : ""}
                <p>${c.lastMessage ? `${c.lastMessage.mine ? "You: " : ""}${esc(c.lastMessage.text)}` : "No messages yet"}</p>
            </div>
            ${c.unread && c.id !== activeId ? `<span class="unread">${c.unread}</span>` : ""}
        </button>`
              )
              .join("")
        : `<div class="card-pad muted small center">${convos.length ? "No conversations match." : "No conversations yet."}</div>`;
}

function renderEmptyMain() {
    $("#main").innerHTML = emptyState({
        icon: "chat",
        title: convos.length ? "Select a conversation" : "No messages yet",
        text: convos.length ? "Pick a conversation on the left to continue chatting." : "When you message an owner from a listing, the conversation appears here.",
        action: convos.length ? "" : `<a class="btn btn-primary" href="/search.html">${icon("search")} Find a home</a>`,
    });
}

function bubbles(items, prevDate) {
    let html = "";
    let last = prevDate;
    for (const m of items) {
        const day = new Date(m.createdAt).toDateString();
        if (day !== last) {
            html += `<div class="day-sep">${dayLabel(m.createdAt)}</div>`;
            last = day;
        }
        html += `<div class="bubble ${m.mine ? "mine" : ""}" data-mid="${m.id}">${esc(m.text)}<time>${clock(m.createdAt)}</time></div>`;
    }
    return { html, last };
}

let lastDay = null;
async function openConversation(id) {
    activeId = id;
    history.replaceState(null, "", `?c=${id}`);
    chat.classList.add("has-active");
    renderList();
    $("#main").innerHTML = `<div class="card-pad center"><span class="spinner"></span></div>`;

    try {
        const { conversation: c, items } = await api(`/conversations/${id}/messages`);
        const { html, last } = bubbles(items, null);
        lastDay = last;
        lastAt = items.at(-1)?.createdAt || null;

        $("#main").innerHTML = `
            <div class="chat-head">
                <button class="icon-btn back-btn" id="back" aria-label="Back to conversations">${icon("arrowLeft")}</button>
                ${avatar(c.other)}
                <div><strong>${esc(c.other?.name || "Unknown user")}</strong><div class="tiny muted">${c.listing ? (c.listing.purpose === "sale" ? "Buying enquiry" : "Rental enquiry") : ""}</div></div>
                ${c.listing ? `<a class="listing-pill" href="/details.html?id=${c.listing.id}"><img src="${esc(c.listing.image || "")}" alt=""><span>${esc(c.listing.title)} · ${formatPrice(c.listing.price, c.listing.purpose)}</span></a>` : ""}
            </div>
            <div class="chat-body" id="body" aria-live="polite">${html || `<div class="muted small center">Say hello 👋</div>`}</div>
            <form class="chat-input" id="send-form">
                <textarea class="textarea" name="text" placeholder="Write a message…" aria-label="Message" maxlength="2000" required></textarea>
                <button class="btn btn-primary btn-icon" type="submit" aria-label="Send">${icon("send")}</button>
            </form>`;
        scrollDown();
        $("#send-form textarea").focus();

        const conv = convos.find((x) => x.id === id);
        if (conv) conv.unread = 0;
        renderList();
        refreshBadges();
    } catch (err) {
        $("#main").innerHTML = emptyState({ icon: "alert", title: "Couldn't open conversation", text: err.message });
    }
}

const scrollDown = () => {
    const body = $("#body");
    if (body) body.scrollTop = body.scrollHeight;
};

async function poll() {
    try {
        if (activeId && $("#body")) {
            const { items } = await api(`/conversations/${activeId}/messages${lastAt ? `?after=${encodeURIComponent(lastAt)}` : ""}`);
            const fresh = items.filter((m) => !document.querySelector(`[data-mid="${m.id}"]`));
            if (fresh.length) {
                const body = $("#body");
                const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
                const { html, last } = bubbles(fresh, lastDay);
                lastDay = last;
                body.insertAdjacentHTML("beforeend", html);
                lastAt = fresh.at(-1).createdAt;
                if (atBottom) scrollDown();
            }
        }
        ({ items: convos } = await api("/conversations"));
        renderList();
    } catch {
        /* keep polling */
    }
}

chat.addEventListener("click", (e) => {
    const c = e.target.closest(".convo");
    if (c) openConversation(c.dataset.id);
    if (e.target.closest("#back")) {
        chat.classList.remove("has-active");
        activeId = null;
        history.replaceState(null, "", location.pathname);
        renderList();
        renderEmptyMain();
    }
});

chat.addEventListener("submit", async (e) => {
    if (e.target.id !== "send-form") return;
    e.preventDefault();
    const ta = e.target.text;
    const text = ta.value.trim();
    if (!text) return;
    ta.value = "";
    try {
        const m = await api(`/conversations/${activeId}/messages`, { method: "POST", body: { text } });
        const { html, last } = bubbles([m], lastDay);
        lastDay = last;
        $("#body").insertAdjacentHTML("beforeend", html);
        lastAt = m.createdAt;
        scrollDown();
        const conv = convos.find((x) => x.id === activeId);
        if (conv) conv.lastMessage = { text, at: m.createdAt, mine: true };
        convos.sort((a, b) => new Date(b.lastMessage?.at || 0) - new Date(a.lastMessage?.at || 0));
        renderList();
    } catch (err) {
        ta.value = text;
        toast(err.message, "error");
    }
});

chat.addEventListener("keydown", (e) => {
    if (e.target.name === "text" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.target.form.requestSubmit();
    }
});

$("#search").addEventListener("input", renderList);

try {
    ({ items: convos } = await api("/conversations"));
} catch (err) {
    toast(err.message, "error");
}
renderList();
if (activeId && convos.some((c) => c.id === activeId)) openConversation(activeId);
else renderEmptyMain();

const pollTimer = setInterval(() => !document.hidden && poll(), 5000);
window.addEventListener("pagehide", () => clearInterval(pollTimer));
