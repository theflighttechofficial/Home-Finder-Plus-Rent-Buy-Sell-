import { $, api, ready, session, params, esc, icon, applyTheme, setLoading, showFieldErrors } from "../app.js";
import { hydrateIcons } from "../icons.js";

hydrateIcons();
applyTheme();

// Only allow redirects back into this site
const nextParam = params().get("next") || "/";
const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

await ready();
if (session.user) location.replace(next);

["#register-link", "#login-link"].forEach((sel) => {
    const a = $(sel);
    if (a && next !== "/") a.href += `?next=${encodeURIComponent(next)}`;
});

function alertBox(type, message) {
    $("#alert").innerHTML = message ? `<div class="alert alert-${type}" role="alert">${icon(type === "error" ? "alert" : "checkCircle")}<div>${esc(message)}</div></div>` : "";
}

if (params().get("loggedOut")) alertBox("success", "You've been logged out. See you soon!");

document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-toggle-password]");
    if (!t) return;
    const input = t.parentElement.querySelector("input");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    t.innerHTML = icon(show ? "eyeOff" : "eye");
    t.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

async function submit(form, path, body, loadingText) {
    const btn = $("button[type=submit]", form);
    alertBox();
    setLoading(btn, true, loadingText);
    try {
        await api(path, { method: "POST", body });
        location.href = next;
    } catch (err) {
        setLoading(btn, false);
        showFieldErrors(form, err.errors);
        alertBox("error", err.message);
    }
}

/* Login */
const login = $("#login-form");
if (login) {
    login.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = login.email.value.trim();
        const password = login.password.value;
        const errors = {};
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
        if (!password) errors.password = "Enter your password";
        showFieldErrors(login, errors);
        if (Object.keys(errors).length) return;
        submit(login, "/auth/login", { email, password }, "Logging in…");
    });
    $("#demo").addEventListener("click", () => {
        login.email.value = "buyer@homefinder.plus";
        login.password.value = "Demo@1234";
        login.requestSubmit();
    });
    login.email.focus();
}

/* Register */
const reg = $("#register-form");
if (reg) {
    const bar = $("#strength-bar");
    const text = $("#strength-text");
    const LEVELS = [
        ["Too short", "var(--danger)"],
        ["Weak", "var(--danger)"],
        ["Fair", "var(--warning)"],
        ["Good", "var(--success)"],
        ["Strong", "var(--success)"],
    ];
    reg.password.addEventListener("input", () => {
        const p = reg.password.value;
        let score = 0;
        if (p.length >= 8) score++;
        if (p.length >= 12) score++;
        if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
        if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
        if (p.length < 8) score = 0;
        const [label, color] = LEVELS[score];
        bar.style.width = p ? `${Math.max(score, 1) * 25}%` : "0";
        bar.style.background = color;
        text.textContent = p ? `Password strength: ${label}` : "Use 8+ characters with a mix of letters, numbers & symbols.";
    });

    reg.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = reg.elements.name.value.trim();
        const email = reg.email.value.trim();
        const password = reg.password.value;
        const errors = {};
        if (name.length < 2) errors.name = "Enter your name";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
        if (password.length < 8) errors.password = "Password must be at least 8 characters";
        if (!reg.terms.checked) errors.terms = "Please accept to continue";
        showFieldErrors(reg, errors);
        if (errors.terms && Object.keys(errors).length === 1) alertBox("error", errors.terms);
        if (Object.keys(errors).length) return;
        submit(reg, "/auth/register", { name, email, password }, "Creating account…");
    });
    reg.elements.name.focus();
}
