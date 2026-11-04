import { useEffect } from "react";
import { prefersReducedMotion } from "../utils/motion";

const EASE = "cubic-bezier(.16,1,.3,1)";

/**
 * Animasi FLIP untuk filter galeri: foto yang tersisa meluncur ke posisi barunya,
 * foto yang muncul kembali ter-fade/scale in. Logika filter tetap di script.js.
 */
export default function GalleryFlip() {
  useEffect(() => {
    if (prefersReducedMotion() || !Element.prototype.animate) return;

    const onClick = (e) => {
      const btn = e.target instanceof Element ? e.target.closest(".gallery__filter") : null;
      if (!btn) return;

      const items = Array.from(document.querySelectorAll(".gallery__item"));
      const first = new Map();
      items.forEach((it) => {
        if (!it.classList.contains("is-hidden")) first.set(it, it.getBoundingClientRect());
      });

      // Berjalan setelah handler filter di script.js selesai mengubah class.
      requestAnimationFrame(() => {
        items.forEach((it) => {
          if (it.classList.contains("is-hidden")) return;
          const from = first.get(it);
          const to = it.getBoundingClientRect();
          if (from) {
            const dx = from.left - to.left, dy = from.top - to.top;
            if (dx || dy) it.animate(
              [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
              { duration: 650, easing: EASE }
            );
          } else if (it.classList.contains("is-visible")) {
            it.animate(
              [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }],
              { duration: 550, easing: EASE }
            );
          }
        });
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
