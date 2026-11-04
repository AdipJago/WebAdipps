import { useEffect } from "react";
import { clamp, isTouch, lerp, prefersReducedMotion } from "../utils/motion";

/**
 * Efek berbasis scroll & mouse dalam satu loop rAF yang ringan:
 * - Hero: blob/grid bergeser mengikuti mouse + scroll, teks hero naik pelan.
 * - Education: garis timeline "tergambar" mengikuti scroll.
 */
export default function Parallax() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const touch = isTouch();
    const q = (s) => document.querySelector(s);
    const blob = q(".hero__blob");
    const grid = q(".hero__grid");
    const heroText = Array.from(document.querySelectorAll(".hero__title, .hero__tagline, .hero__cta"));
    const timeline = q(".timeline");
    const dots = timeline ? Array.from(timeline.querySelectorAll(".timeline__item")) : [];

    const m = { x: 0, y: 0, sx: 0, sy: 0 };
    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(frame); };

    function frame() {
      raf = 0;
      m.sx = lerp(m.sx, m.x, 0.08);
      m.sy = lerp(m.sy, m.y, 0.08);
      const y = window.scrollY, vh = window.innerHeight;

      if (y < vh * 1.3) {
        if (blob) blob.style.translate = `${(m.sx * -34).toFixed(1)}px ${(y * 0.22 + m.sy * -34).toFixed(1)}px`;
        if (grid) grid.style.translate = `${(m.sx * 10).toFixed(1)}px ${(y * 0.05 + m.sy * 10).toFixed(1)}px`;
        heroText.forEach((el, i) => { el.style.translate = `0 ${(y * (0.05 + i * 0.03)).toFixed(1)}px`; });
      }

      if (timeline) {
        const r = timeline.getBoundingClientRect();
        const line = vh * 0.65;
        timeline.style.setProperty("--fx-timeline", clamp((line - r.top) / r.height, 0, 1).toFixed(3));
        dots.forEach((it) => it.classList.toggle("fx-passed", it.getBoundingClientRect().top < line));
      }

      if (Math.abs(m.x - m.sx) > 0.001 || Math.abs(m.y - m.sy) > 0.001) request();
    }

    const onMove = (e) => {
      m.x = (e.clientX / window.innerWidth - 0.5) * 2;
      m.y = (e.clientY / window.innerHeight - 0.5) * 2;
      request();
    };

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    if (!touch) window.addEventListener("pointermove", onMove, { passive: true });
    request();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return null;
}
