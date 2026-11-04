import { useEffect } from "react";
import { prefersReducedMotion } from "../utils/motion";

const RIPPLE_HOSTS =
  ".btn, .project-card__detail, .gallery__filter, .certificate-card, .footer__totop, .contact__channels a";

/**
 * Umpan balik sentuh/klik:
 * - Ripple di tombol & kartu yang bisa ditekan.
 * - Cincin kecil di titik sentuh pada layar sentuh.
 */
export default function TouchEffects() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const onDown = (e) => {
      if (e.pointerType === "touch") {
        const ring = document.createElement("span");
        ring.className = "fx-touch-ring";
        ring.style.left = e.clientX + "px";
        ring.style.top = e.clientY + "px";
        ring.addEventListener("animationend", () => ring.remove());
        document.body.appendChild(ring);
      }

      const host = e.target instanceof Element ? e.target.closest(RIPPLE_HOSTS) : null;
      if (!host) return;
      const r = host.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2;
      if (getComputedStyle(host).position === "static") host.classList.add("fx-ripple-host");
      host.classList.add("fx-ripple-clip");

      const ripple = document.createElement("span");
      ripple.className = "fx-ripple";
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = e.clientX - r.left - size / 2 + "px";
      ripple.style.top = e.clientY - r.top - size / 2 + "px";
      ripple.addEventListener("animationend", () => ripple.remove());
      host.appendChild(ripple);
    };

    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  return null;
}
