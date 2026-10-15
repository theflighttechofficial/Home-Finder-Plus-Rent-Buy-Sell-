import { initPage, $, $$, store, applyTheme, getThemePref, compare, toast } from "../app.js";

await initPage();

const root = document.documentElement;
const read = (k, d) => {
    try {
        return localStorage.getItem(k) || d;
    } catch {
        return d;
    }
};
const write = (k, v) => {
    try {
        localStorage.setItem(k, v);
    } catch {
        /* ignore */
    }
};

$$('input[name="theme"]').forEach((r) => (r.checked = r.value === getThemePref()));
$("#theme-options").addEventListener("change", (e) => applyTheme(e.target.value));

const density = $("#density");
density.value = read("hf-density", "normal");
density.addEventListener("change", () => {
    write("hf-density", density.value);
    root.setAttribute("data-density", density.value);
    toast("Card size updated");
});

const motion = $("#motion");
motion.checked = read("hf-motion", "") === "reduce";
motion.addEventListener("change", () => {
    write("hf-motion", motion.checked ? "reduce" : "");
    if (motion.checked) root.setAttribute("data-motion", "reduce");
    else root.removeAttribute("data-motion");
});

$("#clear-compare").addEventListener("click", () => {
    compare.clear();
    toast("Compare list cleared");
});
$("#clear-draft").addEventListener("click", () => {
    store.remove("hf-listing-draft");
    toast("Draft cleared");
});
