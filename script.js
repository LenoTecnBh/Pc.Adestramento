/* =========================================================
   PC ADESTRAMENTO — script.js
   Sem dependências. Tudo dirigido pelo scroll.
========================================================= */
(() => {
  "use strict";

  const WHATSAPP_NUMBER = "553184315357";

  const root = document.documentElement;
  const body = document.body;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- 1. Quebra de títulos em palavras ---------- */
  function splitInto(el, cls, withInner) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const w = document.createElement("span");
            w.className = cls;
            if (withInner) {
              const inner = document.createElement("span");
              inner.className = "wi";
              inner.textContent = part;
              inner.style.setProperty("--i", i);
              w.appendChild(inner);
            } else {
              w.textContent = part;
            }
            i++;
            frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== "BR") {
          walk(ch);
        }
      });
    };
    walk(el);
  }

  document.querySelectorAll("[data-split]").forEach((el) => splitInto(el, "w", true));

  const scrubs = [...document.querySelectorAll("[data-scrub]")].map((el) => {
    splitInto(el, "sw", false);
    return { el, words: [...el.querySelectorAll(".sw")] };
  });

  /* ---------- 2. Cortina / transição entre páginas ---------- */
  const curtain = document.querySelector(".curtain");
  let revealed = false;

  function revealPage() {
    if (revealed) return;
    revealed = true;
    if (curtain) {
      curtain.classList.remove("cover", "enter");
      curtain.classList.add("out");
    }
    body.classList.add("loaded");
    startObserver();
    update();
  }

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(() =>
    setTimeout(() => requestAnimationFrame(revealPage), 250)
  );
  setTimeout(revealPage, 3000);

  window.addEventListener("pageshow", (e) => {
    if (e.persisted && curtain) {
      curtain.classList.remove("cover", "enter");
      curtain.classList.add("out");
    }
  });

  function leaveTo(href) {
    if (!curtain || reduce) {
      window.location.href = href;
      return;
    }
    curtain.classList.remove("out", "cover");
    curtain.classList.add("enter");
    void curtain.offsetWidth;
    curtain.classList.remove("enter");
    curtain.classList.add("cover");
    setTimeout(() => (window.location.href = href), 720);
  }

  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || a.target === "_blank" || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) return;
    a.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const here = window.location.pathname.split("/").pop() || "index.html";
      const [page, hash] = href.split("#");
      if (page === here && hash) return; // âncora na mesma página
      e.preventDefault();
      closeMenu();
      leaveTo(href);
    });
  });

  /* ---------- 3. Menu mobile ---------- */
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  function closeMenu() {
    if (!menuToggle || !mainNav) return;
    mainNav.classList.remove("open");
    menuToggle.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
    body.classList.remove("nav-open");
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const open = mainNav.classList.toggle("open");
      menuToggle.classList.toggle("open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      body.classList.toggle("nav-open", open);
      header && header.classList.remove("hide");
    });
    document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());
  }

  /* ---------- 4. Revelar ao entrar na tela ---------- */
  let io;
  function startObserver() {
    const targets = document.querySelectorAll("[data-reveal], [data-split]");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("in"));
      return;
    }
    // clip-path esconde o elemento do IntersectionObserver,
    // então elementos "clip" são observados pelo elemento pai.
    const proxies = new Map();
    io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const list = proxies.get(en.target) || [en.target];
          list.forEach((el) => el.classList.add("in"));
          io.unobserve(en.target);
        }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    targets.forEach((t) => {
      if (t.dataset.reveal === "clip" && t.parentElement) {
        const parent = t.parentElement;
        if (!proxies.has(parent)) proxies.set(parent, []);
        proxies.get(parent).push(t);
        io.observe(parent);
      } else {
        io.observe(t);
      }
    });
  }

  /* ---------- 5. Loop de scroll ---------- */
  const header = document.querySelector(".header");
  const leash = document.querySelector(".leash");
  const leashPct = document.querySelector(".leash-pct");
  const heroes = [...document.querySelectorAll("[data-xhero]")];
  const cards = [...document.querySelectorAll(".scard")];
  const parallax = [...document.querySelectorAll("[data-parallax]")].map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax) || 0.12,
  }));
  const tracks = [...document.querySelectorAll("[data-track]")].map((sec) => ({
    sec,
    steps: [...sec.querySelectorAll(".step")],
  }));
  const footerWord = document.querySelector(".footer-word");

  let lastY = window.scrollY;
  let ticking = false;
  let idle;

  function update() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    const sp = clamp(y / max);

    // cachorro-guia
    root.style.setProperty("--sp", sp.toFixed(4));
    if (leash) leash.classList.toggle("on", y > 40);
    if (leashPct) leashPct.textContent = String(Math.round(sp * 100)).padStart(2, "0") + "%";
    if (y !== lastY) body.classList.toggle("dir-up", y < lastY);

    // header
    if (header) {
      header.classList.toggle("solid", y > 30);
      const hide = y > lastY && y > 420 && !body.classList.contains("nav-open");
      if (Math.abs(y - lastY) > 4) header.classList.toggle("hide", hide);
    }
    lastY = y;

    // hero que expande
    heroes.forEach((h) => {
      const r = h.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh));
      const e = reduce ? 1 : easeInOut(clamp(p / 0.82));
      h.style.setProperty("--e", e.toFixed(4));
      h.classList.toggle("cap-on", e > 0.85);
    });

    // manifesto acendendo palavra por palavra
    scrubs.forEach((s) => {
      const r = s.el.getBoundingClientRect();
      const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.35));
      const lit = Math.round(p * s.words.length);
      s.words.forEach((w, i) => w.classList.toggle("on", i < lit));
    });

    // cards empilhados
    cards.forEach((c, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const r = c.getBoundingClientRect();
      const nr = next.getBoundingClientRect();
      const overlap = clamp(1 - (nr.top - r.top) / r.height);
      c.style.setProperty("--s", (1 - overlap * 0.06).toFixed(4));
      c.style.setProperty("--dim", (overlap * 0.45).toFixed(3));
    });

    // parallax nas fotos
    if (!reduce) {
      parallax.forEach(({ el, speed }) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const c = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0, ${(-c * speed * 100).toFixed(2)}px, 0)`;
      });
    }

    // trilha do processo
    tracks.forEach(({ sec, steps }) => {
      const r = sec.getBoundingClientRect();
      const p = clamp((vh * 0.8 - r.top) / (r.height * 0.85));
      sec.style.setProperty("--tp", p.toFixed(4));
      steps.forEach((s, i) => s.classList.toggle("on", p >= i / steps.length + 0.02));
    });

    // palavra gigante do rodapé
    if (footerWord) {
      const r = footerWord.getBoundingClientRect();
      footerWord.style.setProperty("--fp", clamp((vh - r.top) / (r.height + 120)).toFixed(3));
    }
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
    body.classList.add("is-scrolling");
    clearTimeout(idle);
    idle = setTimeout(() => body.classList.remove("is-scrolling"), 140);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => requestAnimationFrame(update));
  update();

  /* ---------- 6. Botões magnéticos ---------- */
  if (finePointer && !reduce) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const k = parseFloat(el.dataset.magnetic) || 0.3;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * k}px, ${y * k}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }

  /* ---------- 7. FAQ com abertura suave ---------- */
  document.querySelectorAll(".faq details").forEach((d) => {
    const s = d.querySelector("summary");
    const a = d.querySelector(".ans");
    if (!s || !a || !a.animate || reduce) return;
    s.addEventListener("click", (e) => {
      e.preventDefault();
      const opts = { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" };
      if (d.open) {
        const anim = a.animate(
          [{ height: a.scrollHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
          { ...opts, fill: "forwards" }
        );
        anim.onfinish = () => {
          d.open = false;
          anim.cancel();
        };
      } else {
        d.open = true;
        a.animate([{ height: "0px", opacity: 0 }, { height: a.scrollHeight + "px", opacity: 1 }], opts);
      }
    });
  });

  /* ---------- 8. Formulário -> WhatsApp ---------- */
  const contactForm = document.getElementById("contactForm");
  const phone = document.getElementById("phone");

  if (phone) {
    phone.addEventListener("input", () => {
      let v = phone.value.replace(/\D/g, "").slice(0, 11);
      if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, v.length - 4)}-${v.slice(-4)}`;
      else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      else if (v.length) v = `(${v}`;
      phone.value = v;
    });
  }

  if (contactForm) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const data = new FormData(contactForm);
      const get = (k) => (data.get(k) || "").toString().trim();
      const name = get("name");
      const dog = get("dog");
      const tel = get("phone");
      const service = get("service");
      const message = get("message");

      const text = [
        `Olá! Meu nome é ${name}.`,
        dog ? `Nome do cão: ${dog}` : null,
        tel ? `Meu WhatsApp: ${tel}` : null,
        service ? `Serviço de interesse: ${service}` : null,
        message ? `Mensagem: ${message}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const btnLabel = contactForm.querySelector("[type=submit] .lbl");
      if (btnLabel) {
        const old = btnLabel.textContent;
        btnLabel.textContent = "Abrindo WhatsApp…";
        setTimeout(() => (btnLabel.textContent = old), 2500);
      }

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    });
  }
})();
