import { initPage, api, session, $, avatar, toast, setLoading, showFieldErrors, confirmDialog } from "../app.js";

let user = await initPage({ auth: true });

function renderCard() {
    $("#avatar").outerHTML = `<span id="avatar">${avatar(user, "avatar-lg")}</span>`;
    $("#p-name").textContent = user.name;
    $("#p-email").textContent = user.email;
    $("#p-since").textContent = `Member since ${new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;
}

const form = $("#profile-form");
form.elements.name.value = user.name || "";
form.querySelector("#email").value = user.email;
form.phone.value = user.phone || "";
form.city.value = user.city || "";
form.bio.value = user.bio || "";
renderCard();

Promise.all([api("/me/listings"), api("/me/favourites"), api("/conversations")]).then(([l, f, c]) => {
    $("#p-stats").innerHTML = [
        [l.items.length, "Listings"],
        [f.items.length, "Saved"],
        [c.items.length, "Chats"],
    ]
        .map(([n, label]) => `<div><strong>${n}</strong><span>${label}</span></div>`)
        .join("");
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("button[type=submit]", form);
    setLoading(btn, true, "Saving…");
    try {
        ({ user } = await api("/me", {
            method: "PATCH",
            body: { name: form.elements.name.value, phone: form.phone.value, city: form.city.value, bio: form.bio.value },
        }));
        session.user = user;
        showFieldErrors(form, {});
        renderCard();
        toast("Profile updated");
    } catch (err) {
        showFieldErrors(form, err.errors);
        toast(err.message, "error");
    } finally {
        setLoading(btn, false);
    }
});

$("#avatar-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast("Photo must be under 5 MB", "error");
    const fd = new FormData();
    fd.append("avatar", file);
    try {
        ({ user } = await api("/me/avatar", { method: "POST", form: fd }));
        session.user = user;
        renderCard();
        toast("Profile photo updated");
    } catch (err) {
        toast(err.message, "error");
    }
});

const pw = $("#password-form");
pw.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (pw.newPassword.value.length < 8) return showFieldErrors(pw, { newPassword: "New password must be at least 8 characters" });
    const btn = $("button[type=submit]", pw);
    setLoading(btn, true, "Updating…");
    try {
        await api("/me/password", { method: "POST", body: { currentPassword: pw.currentPassword.value, newPassword: pw.newPassword.value } });
        pw.reset();
        showFieldErrors(pw, {});
        toast("Password updated");
    } catch (err) {
        showFieldErrors(pw, err.errors);
        toast(err.message, "error");
    } finally {
        setLoading(btn, false);
    }
});

$("#delete-account").addEventListener("click", async () => {
    const password = await confirmDialog({
        title: "Delete your account?",
        message: "This permanently deletes your profile, all your listings and notifications. This can't be undone.",
        confirmText: "Delete forever",
        danger: true,
        input: { label: "Enter your password to confirm", type: "password", autocomplete: "current-password" },
    });
    if (!password) return;
    try {
        await api("/me", { method: "DELETE", body: { password } });
        location.href = "/?deleted=1";
    } catch (err) {
        toast(err.message, "error");
    }
});
