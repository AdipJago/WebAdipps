import { useEffect, useRef } from "react";

/**
 * Lapisan blur halus di tepi atas & bawah layar, sehingga konten
 * "memudar" saat di-scroll. Tepi bawah disembunyikan saat sudah di footer.
 */
export default function ScrollBlurShield() {
  const bottomRef = useRef(null);

  useEffect(() => {
    const update = () => {
      const el = bottomRef.current;
      if (!el) return;
      const doc = document.documentElement;
      const nearEnd = doc.scrollHeight - window.innerHeight - window.scrollY < 140;
      el.classList.toggle("is-off", nearEnd);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <>
      <div className="fx-shield fx-shield--top" aria-hidden="true" />
      <div className="fx-shield fx-shield--bottom" ref={bottomRef} aria-hidden="true" />
    </>
  );
}
