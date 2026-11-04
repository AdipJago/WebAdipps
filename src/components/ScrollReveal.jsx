import { useEffect } from "react";
import { easeOutExpo, prefersReducedMotion, whenLoaded } from "../utils/motion";

const STEP = 85;      // jeda antar elemen yang muncul bersamaan (ms)
const MAX_STEPS = 6;  // batas stagger supaya tidak terasa lambat

const revealAll = () =>
  document
    .querySelectorAll("[data-reveal], [data-reveal-text], .fx-split")
    .forEach((el) => el.classList.add("is-visible", "is-in"));

/** Pecah judul section menjadi kata-kata yang naik dari balik "mask". */
function splitTitles() {
  document.querySelectorAll(".section-title").forEach((el) => {
    if (el.classList.contains("fx-split")) return;
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split(/\s+/).forEach((word, i, arr) => {
      const outer = document.createElement("span");
      outer.className = "fx-word";
      outer.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.className = "fx-word__inner";
      inner.style.setProperty("--i", i);
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
    el.classList.add("fx-split");
  });
}

/** Pecah judul hero menjadi huruf yang muncul berurutan (blur -> tajam). */
function splitHero() {
  let n = 0;
  document.querySelectorAll(".hero__title-line").forEach((el) => {
    if (el.dataset.fxChars) return;
    const text = el.textContent.replace(/\u00A0/g, " ").trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    const words = text.split(/\s+/);
    words.forEach((word, wi) => {
      // Satu kata = satu pembungkus nowrap, supaya tidak patah di tengah kata.
      const wrap = document.createElement("span");
      wrap.className = "fx-nw";
      wrap.setAttribute("aria-hidden", "true");
      Array.from(word).forEach((ch) => {
        const span = document.createElement("span");
        span.className = "fx-char";
        span.style.setProperty("--i", n++);
        span.textContent = ch;
        wrap.appendChild(span);
      });
      el.appendChild(wrap);
      if (wi < words.length - 1) { el.appendChild(document.createTextNode(" ")); n++; }
    });
    el.dataset.fxChars = "1";
  });
}

/** Hitung naik angka skill (0% -> 85%) bersamaan dengan bar yang terisi. */
function setupCounters(cleanups) {
  const els = Array.from(document.querySelectorAll(".skill-bar__value"));
  const targets = els.map((el) => parseInt(el.textContent, 10) || 0);
  els.forEach((el) => (el.textContent = "0%"));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target.querySelector(".skill-bar__value");
        const to = targets[els.indexOf(el)] ?? 0;
        const t0 = performance.now(), dur = 1300;
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / dur);
          el.textContent = Math.round(easeOutExpo(p) * to) + "%";
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.4 }
  );
  els.forEach((el) => { const bar = el.closest(".skill-bar"); bar && io.observe(bar); });
  cleanups.push(() => io.disconnect());
}

/**
 * Reveal saat scroll dengan stagger otomatis.
 * Elemen yang masuk layar bersamaan muncul berurutan (kiri->kanan, atas->bawah).
 * Menggantikan reveal bawaan script.js (yang otomatis non-aktif saat bundel ini jalan).
 */
export default function ScrollReveal() {
  useEffect(() => {
    window.__fxRevealReady = true;
    const cleanups = [];

    try {
      if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
        revealAll();
        return;
      }

      splitTitles();
      splitHero();
      setupCounters(cleanups);

      const titleIO = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-in"); titleIO.unobserve(e.target); }
        }),
        { threshold: 0.4 }
      );
      document.querySelectorAll(".fx-split").forEach((el) => titleIO.observe(el));
      cleanups.push(() => titleIO.disconnect());

      const io = new IntersectionObserver(
        (entries) => {
          entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top ||
              a.boundingClientRect.left - b.boundingClientRect.left)
            .forEach((entry, i) => {
              const el = entry.target;
              const delay = Math.min(i, MAX_STEPS) * STEP;
              el.style.transitionDelay = delay + "ms";
              el.classList.add("is-visible");
              io.unobserve(el);
              // Bersihkan delay supaya efek hover tidak ikut tertunda.
              setTimeout(() => { el.style.transitionDelay = ""; }, delay + 1100);
            });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      cleanups.push(() => io.disconnect());

      // Mulai mengamati setelah loader selesai agar animasi hero terlihat.
      cleanups.push(
        whenLoaded(() => {
          document.querySelectorAll("[data-reveal], [data-reveal-text]").forEach((el) => io.observe(el));
        }, 12000)
      );
    } catch (err) {
      console.warn("[ScrollReveal] fallback:", err);
      revealAll();
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
