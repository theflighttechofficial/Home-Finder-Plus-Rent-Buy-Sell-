import { initPage, $$, formatNumber } from "../app.js";

await initPage({ active: "about" });

const reduce = document.documentElement.dataset.motion === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches;
const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        const el = entry.target;
        const target = Number(el.dataset.count);
        if (reduce) {
            el.textContent = `${formatNumber(target)}+`;
            continue;
        }
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min((now - start) / 1400, 1);
            el.textContent = `${formatNumber(Math.round(target * (1 - Math.pow(1 - t, 3))))}+`;
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
});
$$("[data-count]").forEach((el) => io.observe(el));
