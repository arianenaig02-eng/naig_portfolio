/* Interaction layer: navigation, reveals, lightbox, flip card, copy buttons. */
(() => {
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- header state ---------- */
  const header = document.querySelector(".site-header");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile navigation ---------- */
  const toggle = document.querySelector(".nav__toggle");
  const menu = document.getElementById("nav-menu");

  const closeMenu = () => {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
  };

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("is-open", !open);
    });

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    document.addEventListener("click", (event) => {
      if (!menu.classList.contains("is-open")) return;
      if (event.target.closest(".nav")) return;
      closeMenu();
    });
  }

  /* ---------- scroll reveals ---------- */
  const revealItems = document.querySelectorAll(".reveal");
  if (revealItems.length) {
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-in"));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
      );
      revealItems.forEach((item) => observer.observe(item));
    }
  }

  /* ---------- hero parallax ---------- */
  const portrait = document.querySelector(".hero__portrait");
  if (portrait && !reduceMotion.matches) {
    let ticking = false;
    const update = () => {
      const offset = Math.min(window.scrollY, 700) / 700;
      portrait.style.setProperty("--parallax", (-offset).toFixed(3));
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
  }

  /* ---------- toast ---------- */
  let toastEl = document.querySelector(".toast");
  let toastTimer = 0;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span></span>';
      body.appendChild(toastEl);
    }
    toastEl.querySelector("span").textContent = message;
    toastEl.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove("is-visible"), 2200);
  }

  /* ---------- copy to clipboard ---------- */
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.getAttribute("data-copy");
      const label = button.getAttribute("data-copy-label") || "Copied";
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
        } else {
          const field = document.createElement("textarea");
          field.value = value;
          field.setAttribute("readonly", "");
          field.style.position = "fixed";
          field.style.opacity = "0";
          body.appendChild(field);
          field.select();
          document.execCommand("copy");
          field.remove();
        }
        toast(label);
      } catch (error) {
        toast("Copy failed — select it manually");
      }
    });
  });

  /* ---------- flip card ---------- */
  const flip = document.querySelector(".flip");
  if (flip) {
    const inner = flip.querySelector(".flip__inner");
    const toggleFlip = (event) => {
      if (event && event.target && event.target.closest("a")) return;
      const flipped = flip.classList.toggle("is-flipped");
      if (inner) inner.setAttribute("aria-pressed", String(flipped));
    };
    if (inner) {
      inner.setAttribute("role", "button");
      inner.setAttribute("tabindex", "0");
      inner.setAttribute("aria-pressed", "false");
      inner.setAttribute("aria-label", "Business card — activate to flip");
      inner.addEventListener("click", toggleFlip);
      inner.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleFlip();
        }
      });
    }
    flip.addEventListener("click", (event) => {
      if (event.target === flip) toggleFlip(event);
    });
    document.querySelectorAll("[data-flip]").forEach((button) => {
      button.addEventListener("click", toggleFlip);
    });
  }

  /* ---------- lightbox ---------- */
  const lightbox = document.querySelector(".lightbox");
  if (lightbox) {
    const image = lightbox.querySelector(".lightbox__img");
    const caption = lightbox.querySelector(".lightbox__caption");
    const closeBtn = lightbox.querySelector(".lightbox__close");
    const prevBtn = lightbox.querySelector(".lightbox__nav--prev");
    const nextBtn = lightbox.querySelector(".lightbox__nav--next");
    const triggers = Array.from(document.querySelectorAll("[data-lightbox]"));
    let index = 0;
    let lastFocus = null;

    const items = triggers.map((trigger) => ({
      src: trigger.getAttribute("data-src") || trigger.querySelector("img")?.src,
      caption: trigger.getAttribute("data-caption") || trigger.querySelector("img")?.alt || "",
    }));

    function show(nextIndex) {
      index = (nextIndex + items.length) % items.length;
      const item = items[index];
      image.src = item.src;
      image.alt = item.caption;
      caption.textContent = item.caption;
      const multiple = items.length > 1;
      if (prevBtn) prevBtn.hidden = !multiple;
      if (nextBtn) nextBtn.hidden = !multiple;
    }

    function open(trigger) {
      lastFocus = trigger;
      show(triggers.indexOf(trigger));
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      body.style.overflow = "hidden";
      closeBtn?.focus();
    }

    function close() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      body.style.overflow = "";
      lastFocus?.focus();
    }

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => open(trigger));
      trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(trigger);
        }
      });
    });

    closeBtn?.addEventListener("click", close);
    prevBtn?.addEventListener("click", () => show(index - 1));
    nextBtn?.addEventListener("click", () => show(index + 1));

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) close();
    });

    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") show(index + 1);
      if (event.key === "ArrowLeft") show(index - 1);
    });
  }

  /* ---------- footer year ---------- */
  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
})();
