import { useEffect, useRef, useState } from "react";

/** Teks huruf-per-huruf (animasi diatur lewat CSS: delay = urutan huruf).
 *  Huruf dikelompokkan per kata (tidak boleh patah di tengah kata saat layar sempit). */
function Chars({ text, step = 45, type = false }) {
  let n = 0;
  const words = text.split(" ");
  return (
    <span aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi}>
          <span className="fx-nw" aria-hidden="true">
            {Array.from(word).map((ch, i) => (
              <span
                key={i}
                className={"di-char" + (type ? " di-char--type" : "")}
                style={{ "--i": n++, "--step": step + "ms" }}
              >
                {ch}
              </span>
            ))}
          </span>
          {wi < words.length - 1 && (n++, " ")}
        </span>
      ))}
    </span>
  );
}

const SCRIPT = [400, 1300, 2700, 3700]; // waktu tiap baris muncul (ms)
const END_AT = 6300;                    // mulai "membuka" layar (ms)

/**
 * Intro bergaya film dokumenter:
 * layar hitam + grain film, goresan & kedip, vignette, letterbox, HUD kamera (REC + timecode),
 * judul muncul huruf demi huruf, lalu layar terbelah ke atas/bawah menampilkan website.
 * Bisa dilewati: klik, tombol "Lewati", Enter, Spasi, atau Esc.
 */
export default function DocumentaryIntro() {
  const [phase, setPhase] = useState("play"); // play | open | gone
  const [step, setStep] = useState(0);
  const phaseRef = useRef("play");
  const timers = useRef([]);
  const tcRef = useRef(null);
  const grainRef = useRef(null);

  useEffect(() => {
    const after = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    document.body.style.overflow = "hidden";

    const finish = () => {
      if (phaseRef.current !== "play") return;
      phaseRef.current = "open";
      setPhase("open");
      after(() => {
        document.documentElement.dataset.intro = "done";
        window.dispatchEvent(new Event("fx:intro-done"));
      }, 250);
      after(() => {
        phaseRef.current = "gone";
        setPhase("gone");
        document.body.style.overflow = "";
      }, 1700);
    };
    window.__fxSkipIntro = finish;

    SCRIPT.forEach((ms, i) => after(() => setStep(i + 1), ms));
    after(finish, END_AT);

    // Timecode 24 fps
    const t0 = performance.now();
    const tc = setInterval(() => {
      if (!tcRef.current) return;
      const ms = performance.now() - t0;
      const f = Math.floor((ms / 1000) * 24) % 24;
      const s = Math.floor(ms / 1000) % 60;
      const m = Math.floor(ms / 60000);
      const p = (n) => String(n).padStart(2, "0");
      tcRef.current.textContent = `TC 00:${p(m)}:${p(s)}:${p(f)}`;
    }, 41);

    // Grain film: noise acak ~15 fps
    const canvas = grainRef.current;
    const g = canvas.getContext("2d");
    const size = 180;
    canvas.width = canvas.height = size;
    const img = g.createImageData(size, size);
    const grain = setInterval(() => {
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = (Math.random() * 46) | 0;
      }
      g.putImageData(img, 0, 0);
    }, 66);

    const onKey = (e) => {
      if (["Escape", "Enter", " "].includes(e.key)) { e.preventDefault(); finish(); }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      timers.current.forEach(clearTimeout);
      clearInterval(tc);
      clearInterval(grain);
      window.removeEventListener("keydown", onKey);
      delete window.__fxSkipIntro;
      document.body.style.overflow = "";
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      className={"doc-intro" + (phase === "open" ? " is-opening" : "")}
      onClick={() => window.__fxSkipIntro && window.__fxSkipIntro()}
      role="presentation"
    >
      <div className="doc-intro__half doc-intro__half--top" />
      <div className="doc-intro__half doc-intro__half--bottom" />

      <div className="doc-intro__fx" aria-hidden="true">
        <div className="doc-intro__frame" />
        <canvas className="doc-intro__grain" ref={grainRef} />
        <div className="doc-intro__flicker" />
        <div className="doc-intro__scratch" />
        <div className="doc-intro__scratch doc-intro__scratch--b" />
        <div className="doc-intro__vignette" />
      </div>

      <div className="doc-intro__stage">
        {step >= 1 && <p className="di-caption"><Chars text="Sebuah Perjalanan Dokumenter" step={55} /></p>}
        {step >= 2 && (
          <>
            <h1 className="di-title"><Chars text="Ahnaf Adib Yunan" step={70} /></h1>
            <span className="di-rule" />
          </>
        )}
        {step >= 3 && (
          <p className="di-sub">
            <Chars text="Mahasiswa Sistem Informasi · ITS Surabaya" step={30} type />
            <span className="di-caret">▍</span>
          </p>
        )}
        {step >= 4 && <p className="di-tag"><Chars text="Building Technology. Designing Experiences. Creating Impact." step={18} /></p>}
      </div>

      <div className="doc-intro__hud" aria-hidden="true">
        <span className="di-rec"><i /> REC <span ref={tcRef}>TC 00:00:00:00</span></span>
        <span className="di-cam">CAM 01 · Surabaya</span>
        <span className="di-iso">24 FPS · ISO 400</span>
        <button type="button" className="di-skip" aria-hidden="false" tabIndex={0}
          onClick={(e) => { e.stopPropagation(); window.__fxSkipIntro && window.__fxSkipIntro(); }}>
          Lewati ›
        </button>
      </div>
    </div>
  );
}
