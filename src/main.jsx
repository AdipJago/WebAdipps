import { Component } from "react";
import { createRoot } from "react-dom/client";

import SmoothScroll from "./components/SmoothScroll";
import InteractiveBackground from "./components/InteractiveBackground";
import ScrollBlurShield from "./components/ScrollBlurShield";
import ScrollReveal from "./components/ScrollReveal";
import Parallax from "./components/Parallax";
import TiltCard from "./components/TiltCard";
import TouchEffects from "./components/TouchEffects";
import GalleryFlip from "./components/GalleryFlip";
import CursorTrail from "./components/CursorTrail";
import DocumentaryIntro from "./components/DocumentaryIntro";

const root = document.documentElement;

// Memberi tahu script.js bahwa reveal diambil alih oleh lapisan React ini.
root.dataset.fx = "on";
// Intro dokumenter aktif kecuali pengunjung memilih "reduce motion".
root.dataset.intro = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "off" : "playing";

// Jaring pengaman: apa pun yang gagal, website harus tetap terbuka & terlihat.
function endIntroFallback() {
  if (root.dataset.intro !== "playing") return;
  root.dataset.intro = "done";
  document.querySelectorAll(".doc-intro").forEach((el) => (el.style.display = "none"));
  document.body.style.overflow = "";
  window.dispatchEvent(new Event("fx:intro-done"));
}
const revealAllFallback = () =>
  document.querySelectorAll("[data-reveal], [data-reveal-text]").forEach((el) => el.classList.add("is-visible"));

class Safe extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) {
    console.warn("[fx] animasi dinonaktifkan:", err);
    endIntroFallback();
    revealAllFallback();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

function App() {
  return (
    <Safe>
      {root.dataset.intro === "playing" && <DocumentaryIntro />}
      <InteractiveBackground />
      <ScrollBlurShield />
      <SmoothScroll />
      <ScrollReveal />
      <Parallax />
      <TiltCard />
      <TouchEffects />
      <GalleryFlip />
      <CursorTrail />
    </Safe>
  );
}

function mount() {
  const host = document.createElement("div");
  host.id = "fx-root";
  document.body.appendChild(host);
  createRoot(host).render(<App />);

  setTimeout(() => { if (!window.__fxRevealReady) revealAllFallback(); }, 3500);
  setTimeout(endIntroFallback, 9000);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
else mount();
