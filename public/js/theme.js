// Runs in <head> before first paint so the page never flashes the wrong theme.
(function () {
    var root = document.documentElement;
    function read(key, fallback) {
        try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
    }
    var pref = read("hf-theme", "auto");
    var dark = pref === "dark" || (pref === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.setAttribute("data-density", read("hf-density", "normal"));
    if (read("hf-motion", "") === "reduce") root.setAttribute("data-motion", "reduce");
})();
