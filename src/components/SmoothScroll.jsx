import { useEffect } from "react";
import { clamp, isTouch, prefersReducedMotion } from "../utils/motion";

/**
 * Scroll halus ber-inersia (mirip Lenis) untuk mouse/trackpad desktop.
 * - Tidak aktif di layar sentuh atau saat "reduce motion".
 * - Tidak mengganggu modal, iframe PDF, textarea, dan zoom (Ctrl + scroll).
 * - Link anchor (#about, #projects, ...) ikut meluncur dengan easing yang sama.
 */
export default function SmoothScroll({ ease = 0.085 }) {
  useEffect(() => {
    if (prefersReducedMotion() || isTouch()) return;

    let current = window.scrollY;
    let target = current;
    let raf = 0;
    let running = false;
    let lastT = 0;

    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

    const blocked = (el) =>
      document.body.style.overflow === "hidden" ||
      (el instanceof Element && el.closest(".project-modal__panel, .pdf-modal, .lightbox, textarea, iframe"));

    const frame = (now = performance.now()) => {
      // Easing berbasis waktu supaya terasa sama di layar 60Hz maupun 120Hz.
      const dt = Math.min(64, now - (lastT || now - 16.7));
      lastT = now;
      current += (target - current) * (1 - Math.pow(1 - ease, dt / 16.7));
      if (Math.abs(target - current) < 0.4) {
        current = target;
        running = false;
        lastT = 0;
        window.scrollTo({ top: current, behavior: "instant" });
        return;
      }
      window.scrollTo({ top: current, behavior: "instant" });
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    const onWheel = (e) => {
      if (e.ctrlKey || e.defaultPrevented || blocked(e.target)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
      target = clamp(target + e.deltaY * unit, 0, maxScroll());
      start();
    };

    // Scroll yang bukan dari kita (keyboard, drag scrollbar, tombol back-to-top) -> sinkronkan.
    const onScroll = () => {
      if (running) return;
      current = target = window.scrollY;
    };

    const onClick = (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const dest = document.querySelector(id);
      if (!dest) return;
      e.preventDefault();
      target = clamp(dest.getBoundingClientRect().top + window.scrollY, 0, maxScroll());
      history.pushState(null, "", id);
      start();
    };

    const onResize = () => { target = clamp(target, 0, maxScroll()); };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
    };
  }, [ease]);

  return null;
}
