import { useEffect, useRef } from "react";
import { isTouch, prefersReducedMotion } from "../utils/motion";

const LIFE = 520; // umur jejak (ms)

/**
 * Jejak cahaya di belakang kursor: garis meruncing yang memudar + percikan kecil.
 * Hanya di desktop; berhenti menggambar saat kursor diam (hemat CPU).
 */
export default function CursorTrail() {
  const ref = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion() || isTouch()) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0;
    const mouse = { x: 0, y: 0, seen: false };
    const head = { x: 0, y: 0 };
    let points = [];
    let sparks = [];

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (now) => {
      raf = 0;
      ctx.clearRect(0, 0, w, h);
      const dark = document.body.getAttribute("data-theme") === "dark";
      const rgb = dark ? "147,197,253" : "59,130,246";

      // kepala jejak mengejar kursor dengan sedikit "ekor"
      const dx = mouse.x - head.x, dy = mouse.y - head.y;
      head.x += dx * 0.38; head.y += dy * 0.38;
      const speed = Math.hypot(dx, dy);
      const last = points[points.length - 1];
      if (mouse.seen && (!last || Math.hypot(head.x - last.x, head.y - last.y) > 1.2)) {
        points.push({ x: head.x, y: head.y, t: now });
        if (speed > 6 && Math.random() < 0.55) {
          sparks.push({
            x: head.x, y: head.y, t: now,
            vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2 + 0.25,
            r: Math.random() * 1.8 + 0.8,
          });
        }
      }
      points = points.filter((p) => now - p.t < LIFE);
      sparks = sparks.filter((s) => now - s.t < 750);

      // garis meruncing
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        const life = 1 - (now - b.t) / LIFE;
        if (life <= 0) continue;
        ctx.strokeStyle = `rgba(${rgb},${(life * 0.5).toFixed(3)})`;
        ctx.lineWidth = 1 + life * 6;
        ctx.shadowColor = `rgba(${rgb},${(life * 0.8).toFixed(3)})`;
        ctx.shadowBlur = 14 * life;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // percikan
      sparks.forEach((s) => {
        const life = 1 - (now - s.t) / 750;
        s.x += s.vx; s.y += s.vy; s.vy += 0.012;
        ctx.fillStyle = `rgba(${rgb},${(life * 0.7).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * life + 0.2, 0, Math.PI * 2); ctx.fill();
      });

      if (points.length || sparks.length || speed > 0.5) raf = requestAnimationFrame(frame);
    };

    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      if (!mouse.seen) { head.x = e.clientX; head.y = e.clientY; mouse.seen = true; }
      mouse.x = e.clientX; mouse.y = e.clientY;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onLeave = () => { mouse.seen = false; };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} className="fx-trail" aria-hidden="true" />;
}
