// Utilitas kecil yang dipakai bersama oleh semua komponen animasi.
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isTouch = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: none), (pointer: coarse)").matches;

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

// Jalankan callback setelah loader selesai (body.is-loaded), dengan batas waktu aman.
export function whenLoaded(cb, timeout = 5000) {
  const body = document.body;
  if (body.classList.contains("is-loaded")) { cb(); return () => {}; }
  let done = false;
  const run = () => { if (done) return; done = true; mo.disconnect(); clearTimeout(t); cb(); };
  const mo = new MutationObserver(() => body.classList.contains("is-loaded") && run());
  mo.observe(body, { attributes: true, attributeFilter: ["class"] });
  const t = setTimeout(run, timeout);
  return () => { done = true; mo.disconnect(); clearTimeout(t); };
}
