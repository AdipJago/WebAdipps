/* ================================================================
   PERSONAL DIGITAL PORTFOLIO — AHNAF ADIB YUNAN
   File: script.js | Tahap 3 dari 4
   ================================================================
   INDEX
   00. Utilities
   01. Loader
   02. Scroll Progress
   03. Custom Cursor
   04. Navbar (scroll state + scrollspy) & Mobile Menu
   05. Theme Toggle (Dark Mode)
   06. Reveal on Scroll (Intersection Observer)
   07. Hero Typing Effect
   08. Skills Progress Bar Animation
   09. Project Modal
   10. Proposal PDF Preview Modal
   11. Certificate Lightbox
   12. Gallery Filter
   13. Contact Form Validation + Submit
   14. Back To Top & Footer Year
   15. Init
   ================================================================ */

(function () {
  "use strict";

  /* --------------------------------------------------------------
     00. UTILITIES
  -------------------------------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------------------------------------------
     01. LOADER
  -------------------------------------------------------------- */
  function initLoader() {
    const loader = $("#loader");
    if (!loader) return;
    const digit = $("[data-loader-count]", loader);
    const barFill = $(".loader__bar-fill", loader);

    let progress = 0;
    const finish = () => {
      digit.textContent = "100";
      barFill.style.width = "100%";
      setTimeout(() => {
        loader.classList.add("is-hidden");
        document.body.classList.add("is-loaded");
        loader.setAttribute("aria-hidden", "true");
      }, 350);
    };

    if (prefersReducedMotion) { finish(); return; }

    const tick = () => {
      progress += Math.random() * 18 + 6;
      if (progress >= 100) { finish(); return; }
      digit.textContent = Math.floor(progress);
      barFill.style.width = progress + "%";
      setTimeout(tick, 180 + Math.random() * 160);
    };
    setTimeout(tick, 300);

    // Safety net: never let the loader block the site for more than 4s
    setTimeout(() => { if (!document.body.classList.contains("is-loaded")) finish(); }, 4000);
  }

  /* --------------------------------------------------------------
     02. SCROLL PROGRESS
  -------------------------------------------------------------- */
  function initScrollProgress() {
    const fill = $("#scrollProgressFill");
    if (!fill) return;
    const update = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      fill.style.width = (max > 0 ? (scrolled / max) * 100 : 0) + "%";
    };
    on(document, "scroll", update, { passive: true });
    update();
  }

  /* --------------------------------------------------------------
     03. CUSTOM CURSOR
  -------------------------------------------------------------- */
  function initCursor() {
    const dot = $("#cursorDot");
    const ring = $("#cursorRing");
    if (!dot || !ring || window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

    let ringX = 0, ringY = 0, targetX = 0, targetY = 0;

    on(window, "mousemove", (e) => {
      dot.style.left = e.clientX + "px";
      dot.style.top = e.clientY + "px";
      targetX = e.clientX; targetY = e.clientY;
    });

    (function animateRing() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";
      requestAnimationFrame(animateRing);
    })();

    $$("a, button, [data-cert-preview], [data-preview-pdf]").forEach((el) => {
      on(el, "mouseenter", () => ring.classList.add("is-active"));
      on(el, "mouseleave", () => ring.classList.remove("is-active"));
    });
  }

  /* --------------------------------------------------------------
     04. NAVBAR + MOBILE MENU
  -------------------------------------------------------------- */
  function initNavbar() {
    const navbar = $("#navbar");
    const burger = $("#burgerBtn");
    const mobileMenu = $("#mobileMenu");
    const navLinks = $$("[data-nav]");

    on(document, "scroll", () => {
      navbar.classList.toggle("is-scrolled", document.documentElement.scrollTop > 40);
    }, { passive: true });

    const closeMobileMenu = () => {
      mobileMenu.classList.remove("is-open");
      mobileMenu.setAttribute("aria-hidden", "true");
      burger.setAttribute("aria-expanded", "false");
      burger.classList.remove("is-open");
    };

    on(burger, "click", () => {
      const isOpen = mobileMenu.classList.toggle("is-open");
      mobileMenu.setAttribute("aria-hidden", String(!isOpen));
      burger.setAttribute("aria-expanded", String(isOpen));
      burger.classList.toggle("is-open", isOpen);
    });

    navLinks.forEach((link) => on(link, "click", closeMobileMenu));

    // Scrollspy: highlight active nav link based on section in view
    const sections = $$("main > section[id]");
    if ("IntersectionObserver" in window && sections.length) {
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((l) => {
              l.classList.toggle("is-active", l.getAttribute("href") === "#" + entry.target.id);
            });
          });
        },
        { rootMargin: "-45% 0px -45% 0px" }
      );
      sections.forEach((s) => spy.observe(s));
    }
  }

  /* --------------------------------------------------------------
     05. THEME TOGGLE (DARK MODE)
  -------------------------------------------------------------- */
  function initThemeToggle() {
    const toggle = $("#themeToggle");
    if (!toggle) return;

    const stored = window.localStorage ? localStorage.getItem("portfolio-theme") : null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored || (prefersDark ? "dark" : "light");
    document.body.setAttribute("data-theme", initial);

    on(toggle, "click", () => {
      const next = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.body.setAttribute("data-theme", next);
      try { localStorage.setItem("portfolio-theme", next); } catch (e) { /* storage unavailable, ignore */ }
    });
  }

  /* --------------------------------------------------------------
     06. REVEAL ON SCROLL
  -------------------------------------------------------------- */
  function initReveal() {
    const targets = $$("[data-reveal], [data-reveal-text]");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      targets.forEach((t) => t.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((t) => io.observe(t));
  }

  /* --------------------------------------------------------------
     07. HERO TYPING EFFECT
  -------------------------------------------------------------- */
  function initTyping() {
    const el = $("[data-typing]");
    if (!el) return;
    const textEl = $(".hero__tagline-text", el);
    const words = (el.dataset.words || "").split("|").filter(Boolean);
    if (!words.length || !textEl) return;

    if (prefersReducedMotion) { textEl.textContent = words[0]; return; }

    let wordIndex = 0, charIndex = 0, deleting = false;

    const step = () => {
      const current = words[wordIndex];
      if (!deleting) {
        charIndex++;
        textEl.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) { deleting = true; setTimeout(step, 1400); return; }
      } else {
        charIndex--;
        textEl.textContent = current.slice(0, charIndex);
        if (charIndex === 0) { deleting = false; wordIndex = (wordIndex + 1) % words.length; }
      }
      setTimeout(step, deleting ? 35 : 65);
    };
    step();
  }

  /* --------------------------------------------------------------
     08. SKILLS PROGRESS BAR ANIMATION
  -------------------------------------------------------------- */
  function initSkillBars() {
    const bars = $$(".skill-bar__fill");
    if (!bars.length) return;

    const animate = (bar) => { bar.style.width = (bar.dataset.skillValue || 0) + "%"; };

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      bars.forEach(animate);
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animate(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    bars.forEach((b) => io.observe(b));
  }

  /* --------------------------------------------------------------
     Shared modal helpers
  -------------------------------------------------------------- */
  function openModal(modal) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeModal(modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function bindModalDismiss(modal, onCloseExtra) {
    $$("[data-modal-close]", modal).forEach((el) => on(el, "click", () => { closeModal(modal); onCloseExtra && onCloseExtra(); }));
    on(document, "keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) { closeModal(modal); onCloseExtra && onCloseExtra(); } });
  }

  /* --------------------------------------------------------------
     09. PROJECT MODAL
  -------------------------------------------------------------- */
  function initProjectModal() {
    const modal = $("#projectModal");
    const content = $("#projectModalContent");
    if (!modal) return;

    $$("[data-project-open]").forEach((btn) => {
      on(btn, "click", () => {
        const card = btn.closest(".project-card");
        if (!card) return;
        content.innerHTML = `
          <h3>${card.querySelector("h3")?.innerHTML || ""}</h3>
          <p>${card.querySelector("p")?.innerHTML || ""}</p>
          <ul class="project-card__stack">${card.querySelector(".project-card__stack")?.innerHTML || ""}</ul>
        `;
        openModal(modal);
      });
    });

    bindModalDismiss(modal);
  }

  /* --------------------------------------------------------------
     10. PROPOSAL PDF PREVIEW MODAL
  -------------------------------------------------------------- */
  function initPdfModal() {
    const modal = $("#pdfModal");
    const frame = $("#pdfModalFrame");
    if (!modal) return;

    $$("[data-preview-pdf]").forEach((btn) => {
      on(btn, "click", () => {
        frame.src = btn.dataset.previewPdf;
        openModal(modal);
      });
    });

    bindModalDismiss(modal, () => { frame.src = ""; });
  }

  /* --------------------------------------------------------------
     11. CERTIFICATE LIGHTBOX
  -------------------------------------------------------------- */
  function initLightbox() {
    const modal = $("#certLightbox");
    const img = $("#certLightboxImg");
    if (!modal) return;

    $$("[data-cert-preview]").forEach((card) => {
      on(card, "click", () => {
        img.src = card.dataset.certPreview;
        img.alt = card.querySelector(".certificate-card__title")?.textContent || "";
        openModal(modal);
      });
    });

    bindModalDismiss(modal, () => { img.src = ""; });
  }

  /* --------------------------------------------------------------
     12. GALLERY FILTER
  -------------------------------------------------------------- */
  function initGalleryFilter() {
    const filters = $$(".gallery__filter");
    const items = $$(".gallery__item");
    if (!filters.length) return;

    filters.forEach((btn) => {
      on(btn, "click", () => {
        filters.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const target = btn.dataset.filter;
        items.forEach((item) => {
          const match = target === "all" || item.dataset.category === target;
          item.classList.toggle("is-hidden", !match);
        });
      });
    });
  }

  /* --------------------------------------------------------------
     13. CONTACT FORM VALIDATION + SUBMIT
  -------------------------------------------------------------- */
  function initContactForm() {
    const form = $("#contactForm");
    if (!form) return;
    const status = $("#contactFormStatus");

    const rules = {
      name: (v) => v.trim().length >= 2 || "Nama minimal 2 karakter.",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Format email tidak valid.",
      message: (v) => v.trim().length >= 10 || "Pesan minimal 10 karakter.",
    };

    const validateField = (field) => {
      const wrapper = field.closest(".form-field");
      const errorEl = $(`[data-error-for="${field.id}"]`, form);
      const rule = rules[field.name];
      const result = rule ? rule(field.value) : true;
      wrapper.classList.toggle("has-error", result !== true);
      if (errorEl) errorEl.textContent = result === true ? "" : result;
      return result === true;
    };

    $$("input, textarea", form).forEach((field) => on(field, "blur", () => validateField(field)));

    on(form, "submit", async (e) => {
      e.preventDefault();
      const fields = $$("input, textarea", form);
      const allValid = fields.map(validateField).every(Boolean);
      if (!allValid) { status.textContent = "Periksa kembali data yang diisi."; return; }

      const submitBtn = $('button[type="submit"]', form);
      submitBtn.disabled = true;
      status.textContent = "Mengirim pesan...";

      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Request failed");
        status.textContent = "Pesan terkirim. Terima kasih sudah menghubungi!";
        form.reset();
      } catch (err) {
        status.textContent = "Gagal mengirim pesan. Coba lagi atau hubungi via WhatsApp/Email.";
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  /* --------------------------------------------------------------
     14. BACK TO TOP & FOOTER YEAR
  -------------------------------------------------------------- */
  function initFooterUtils() {
    const yearEl = $("#footerYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const topBtn = $("#backToTop");
    on(topBtn, "click", () => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" }));
  }

  /* --------------------------------------------------------------
     15. INIT
  -------------------------------------------------------------- */
  function init() {
    initLoader();
    initScrollProgress();
    initCursor();
    initNavbar();
    initThemeToggle();
    initReveal();
    initTyping();
    initSkillBars();
    initProjectModal();
    initPdfModal();
    initLightbox();
    initGalleryFilter();
    initContactForm();
    initFooterUtils();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
