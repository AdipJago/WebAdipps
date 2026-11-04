import { useEffect } from "react";
import { isTouch, prefersReducedMotion } from "../utils/motion";

const DEFAULT_TARGETS = [
  { selector: ".project-card", max: 5 },
  { selector: ".certificate-card", max: 6 },
  { selector: ".proposal-card", max: 3 },
  { selector: ".about__photo", max: 3 },
];

/**
 * Efek tilt 3D + kilau cahaya yang mengikuti kursor pada kartu.
 * Tidak mengubah HTML: cukup menambahkan class & style inline lewat JS.
 */
export default function TiltCard({ targets = DEFAULT_TARGETS }) {
  useEffect(() => {
    if (prefersReducedMotion() || isTouch()) return;
    const cleanups = [];

    targets.forEach(({ selector, max }) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.add("fx-tilt");
        let raf = 0, last = null, tilting = false;

        const apply = () => {
          raf = 0;
          const r = el.getBoundingClientRect();
          const px = (last.clientX - r.left) / r.width;
          const py = (last.clientY - r.top) / r.height;
          el.style.transform =
            `perspective(1400px) rotateX(${((0.5 - py) * 2 * max).toFixed(2)}deg) ` +
            `rotateY(${((px - 0.5) * 2 * max).toFixed(2)}deg) translateY(-4px)`;
          el.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
          el.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
        };

        const onMove = (e) => {
          if (e.pointerType === "touch") return;
          if (el.hasAttribute("data-reveal") && !el.classList.contains("is-visible")) return;
          if (!tilting) { tilting = true; el.classList.add("fx-tilting"); }
          last = e;
          if (!raf) raf = requestAnimationFrame(apply);
        };
        const onLeave = () => {
          cancelAnimationFrame(raf); raf = 0; tilting = false;
          el.classList.remove("fx-tilting");
          el.style.transform = "";
        };

        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          cancelAnimationFrame(raf);
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
          el.classList.remove("fx-tilt", "fx-tilting");
          el.style.transform = "";
        });
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [targets]);

  return null;
}
