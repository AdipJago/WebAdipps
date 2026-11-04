import { useEffect, useRef } from "react";
import { isTouch, prefersReducedMotion } from "../utils/motion";

const hexToRgb = (hex) => {
  const h = hex.trim().replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return Number.isNaN(n) ? "59,130,246" : `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

/**
 * Partikel halus berwarna aksen di belakang seluruh halaman.
 * Partikel saling terhubung dan menjauh pelan dari kursor / sentuhan jari.
 * Otomatis berhenti saat tab tidak aktif dan mengikuti mode gelap/terang.
 */
export default function InteractiveBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const touch = isTouch();

    let w = 0, h = 0, raf = 0, particles = [], rgb = "59,130,246";
    const mouse = { x: -9999, y: -9999 };
    const LINK = touch ? 100 : 130;

    const readTheme = () => {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--c-accent");
      rgb = hexToRgb(accent || "#3B82F6");
    };

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(touch ? 38 : 80, Math.round((w * h) / (touch ? 22000 : 17000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.4 + 0.8,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const dark = document.body.getAttribute("data-theme") === "dark";
      const dotA = dark ? 0.55 : 0.4;
      const lineA = dark ? 0.2 : 0.14;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) {
          const d = Math.sqrt(d2) || 1, f = (140 - d) / 140;
          p.vx += (dx / d) * f * 0.06; p.vy += (dy / d) * f * 0.06;
        }
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx + (Math.random() - 0.5) * 0.02; p.y += p.vy + (Math.random() - 0.5) * 0.02;
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${dotA})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const ex = p.x - q.x, ey = p.y - q.y;
          const dist = ex * ex + ey * ey;
          if (dist < LINK * LINK) {
            ctx.strokeStyle = `rgba(${rgb},${lineA * (1 - Math.sqrt(dist) / LINK)})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = mouse.y = -9999; };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };

    readTheme(); resize(); raf = requestAnimationFrame(draw);
    const themeObserver = new MutationObserver(readTheme);
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    if (touch) window.addEventListener("pointerup", onLeave);
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onLeave);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="fx-bg" aria-hidden="true" />;
}
