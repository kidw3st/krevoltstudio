/* KreoVolt Studio. Поведение сайта: меню, контакты, схема, рельс процесса, форма.
   Настройки контактов и формы задаются в объекте SITE ниже. */
(function () {
  "use strict";

  /* ---------- НАСТРОЙКИ (заполните) ---------- */
  var SITE = {
    formEndpoint: "",          // адрес приёма формы, например https://formspree.io/f/xxxxxxxx (пусто = форма шлёт письмо на email)
    telegram: "",              // @username или https://t.me/username
    max: "",                   // ссылка на профиль или чат в MAX
    email: "",                 // hello@example.ru
    phone: ""                  // +7 900 000-00-00
  };

  var doc = document;
  var root = doc.documentElement;
  root.classList.add("js");

  /* ?static=1 в адресе показывает конечные состояния без анимации (для проверки вёрстки) */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || /[?&]static=1/.test(window.location.search);
  var hasGsap = typeof window.gsap !== "undefined";
  var hasST = hasGsap && typeof window.ScrollTrigger !== "undefined";
  if (hasST) { window.gsap.registerPlugin(window.ScrollTrigger); }

  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  /* ---------- Контакты из конфига ---------- */
  var contactRules = {
    telegram: {
      href: function (v) { return /^https?:/.test(v) ? v : "https://t.me/" + v.replace(/^@/, ""); },
      text: function (v) { return "@" + v.replace(/^https?:\/\/t\.me\//, "").replace(/^@/, "").replace(/\/$/, ""); }
    },
    max: {
      href: function (v) { return v; },
      text: function (v) { return v.replace(/^https?:\/\//, "").replace(/\/$/, ""); }
    },
    email: {
      href: function (v) { return "mailto:" + v; },
      text: function (v) { return v; }
    },
    phone: {
      href: function (v) { return "tel:" + v.replace(/[^\d+]/g, ""); },
      text: function (v) { return v; }
    }
  };
  each(doc.querySelectorAll("[data-contact]"), function (el) {
    var key = el.getAttribute("data-contact");
    var value = (SITE[key] || "").trim();
    var row = el.closest("[data-contact-row]") || el;
    if (!value || !contactRules[key]) { row.hidden = true; return; }
    el.setAttribute("href", contactRules[key].href(value));
    el.textContent = contactRules[key].text(value);
    if (key === "telegram" || key === "max") { el.setAttribute("rel", "noopener"); el.setAttribute("target", "_blank"); }
  });
  each(doc.querySelectorAll("[data-contacts]"), function (list) {
    var visible = Array.prototype.some.call(list.querySelectorAll("[data-contact-row]"), function (r) { return !r.hidden; });
    if (!visible) {
      list.hidden = true;
      var empty = doc.querySelector("[data-contacts-empty]");
      if (empty) { empty.hidden = false; }
    }
  });

  /* ---------- Меню на узких экранах ---------- */
  var top = doc.querySelector(".top");
  var menuBtn = doc.querySelector(".menu-btn");
  if (top && menuBtn) {
    function setMenu(open) {
      top.classList.toggle("is-open", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.textContent = open ? "Закрыть" : "Меню";
    }
    menuBtn.addEventListener("click", function () { setMenu(!top.classList.contains("is-open")); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") { setMenu(false); } });
    each(top.querySelectorAll(".nav a"), function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  }

  /* ---------- Появление заголовка по словам ---------- */
  function splitWords(el) {
    if (el.getAttribute("data-word-reveal-ready") === "true") { return; }
    var index = 0;
    var label = el.textContent.replace(/\s+/g, " ").trim();
    function walk(node) {
      each(Array.prototype.slice.call(node.childNodes), function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = doc.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) { return; }
            if (!part.trim()) { frag.appendChild(doc.createTextNode(part)); return; }
            var w = doc.createElement("span");
            w.className = "word-reveal__word";
            w.setAttribute("aria-hidden", "true");
            w.style.setProperty("--word-index", index++);
            w.textContent = part;
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    }
    walk(el);
    el.setAttribute("aria-label", label);
    el.setAttribute("data-word-reveal-ready", "true");
    el.classList.add("is-ready");
  }
  var reveals = doc.querySelectorAll("[data-word-reveal]");
  if (reveals.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      each(reveals, function (el) { el.classList.add("is-ready", "is-visible"); });
    } else {
      var fontsReady = (doc.fonts && doc.fonts.ready) ? doc.fonts.ready : Promise.resolve();
      var timeout = new Promise(function (res) { setTimeout(res, 900); });
      Promise.race([fontsReady, timeout]).then(function () {
        var io = new IntersectionObserver(function (entries, obs) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) { return; }
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          });
        }, { threshold: 0.2, rootMargin: "0px 0px -10% 0px" });
        each(reveals, function (el) {
          splitWords(el);
          var r = el.getBoundingClientRect();
          var viewH = window.innerHeight || root.clientHeight || 900;
          if (r.top < viewH && r.bottom > 0) {
            /* Уже на экране (hero): запускаем сразу, без наблюдателя */
            void el.offsetWidth;
            window.requestAnimationFrame(function () { el.classList.add("is-visible"); });
          } else {
            io.observe(el);
          }
        });
      });
    }
  }

  /* ---------- Заглушки и загрузка изображений ---------- */
  each(doc.querySelectorAll(".ph__img"), function (img) {
    var ph = img.closest(".ph");
    if (!ph) { return; }
    function done() { ph.classList.add("is-loaded"); }
    if (img.complete && img.naturalWidth > 0) { done(); return; }
    img.addEventListener("load", done);
    img.addEventListener("error", function () { ph.classList.add("is-failed"); });
  });

  /* ---------- Схема Э3: цепь замыкается при загрузке ---------- */
  var scheme = doc.querySelector(".scheme");
  if (scheme) {
    if (!hasGsap || reduceMotion) {
      scheme.classList.add("is-live");
    } else {
      var gsap = window.gsap;
      var sheet = cssVar("--sheet");
      var volt = cssVar("--volt");
      each(scheme.querySelectorAll(".live"), function (line) {
        var len = line.getTotalLength();
        line.style.strokeDasharray = String(len);
        line.style.strokeDashoffset = String(len);
      });
      gsap.set(scheme.querySelectorAll(".node, .lamp-fill"), { fill: sheet });
      var tl = gsap.timeline({ delay: 0.45, onComplete: function () { scheme.classList.add("is-live"); } });
      each(scheme.querySelectorAll("[data-stage]"), function (g) {
        var seg = g.querySelector(".live-seg");
        var sw = g.querySelector(".sw");
        var liveSw = g.querySelector(".live-sw");
        var node = g.querySelector(".node");
        var px = parseFloat(sw.getAttribute("data-px"));
        var py = parseFloat(sw.getAttribute("data-py"));
        gsap.set(sw, { rotation: -42, svgOrigin: px + " " + py });
        tl.to(seg, { strokeDashoffset: 0, duration: 0.3, ease: "none" })
          .to(sw, { rotation: 0, duration: 0.2, ease: "power3.in" })
          .to(liveSw, { strokeDashoffset: 0, duration: 0.12, ease: "none" })
          .to(node, { fill: volt, duration: 0.1 }, "<");
      });
      var last = scheme.querySelector(".live-last");
      var lamp = scheme.querySelector(".lamp-fill");
      if (last) { tl.to(last, { strokeDashoffset: 0, duration: 0.3, ease: "none" }); }
      if (lamp) { tl.to(lamp, { fill: volt, duration: 0.2 }); }
      scheme.classList.add("is-anim");
    }
  }

  /* ---------- Порядок работ: заполнение рельса по скроллу ---------- */
  var proc = doc.querySelector(".proc__steps");
  if (proc) {
    var fill = proc.querySelector(".proc__fill");
    var steps = proc.querySelectorAll(".proc__step");
    if (!hasST || reduceMotion || !fill) {
      proc.classList.add("is-static");
      each(steps, function (s) { s.classList.add("is-live"); });
    } else {
      var mm = window.gsap.matchMedia();
      mm.add({ isDesktop: "(min-width: 900px)", isMobile: "(max-width: 899px)" }, function (ctx) {
        var prop = ctx.conditions.isDesktop ? "scaleX" : "scaleY";
        var from = {}; from[prop] = 0;
        var other = ctx.conditions.isDesktop ? "scaleY" : "scaleX";
        from[other] = 1;
        var to = {}; to[prop] = 1; to[other] = 1;
        to.ease = "none";
        to.scrollTrigger = {
          trigger: proc,
          start: "top 72%",
          end: "bottom 62%",
          scrub: 0.4,
          onUpdate: function (st) {
            var p = st.progress;
            each(steps, function (s, i) {
              s.classList.toggle("is-live", p >= (i / (steps.length - 1)) - 0.03);
            });
          }
        };
        window.gsap.fromTo(fill, from, to);
      });
    }
  }

  /* ---------- Однократное появление позиций ---------- */
  if (hasST && !reduceMotion) {
    var items = window.gsap.utils.toArray("[data-reveal]");
    if (items.length) {
      window.gsap.set(items, { opacity: 0, y: 18 });
      window.ScrollTrigger.batch(items, {
        start: "top 92%",
        once: true,
        onEnter: function (batch) {
          window.gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: "expo.out", overwrite: true });
        }
      });
    }
    if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(function () { window.ScrollTrigger.refresh(); }); }
  }

  /* ---------- Форма заявки ---------- */
  var form = doc.querySelector("[data-form]");
  if (form) {
    var note = form.querySelector(".form__note");
    var submit = form.querySelector("[type=submit]");
    var submitLabel = submit ? submit.textContent : "";
    function setNote(text, kind) {
      note.textContent = text;
      note.className = "form__note" + (kind ? " is-" + kind : "");
    }
    function setBusy(busy) {
      if (!submit) { return; }
      submit.disabled = busy;
      submit.classList.toggle("is-busy", busy);
      submit.textContent = busy ? "Отправляем" : submitLabel;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) { return; }
      var data = new FormData(form);
      if (data.get("_gotcha")) { return; }
      setNote("", "");
      if (SITE.formEndpoint) {
        setBusy(true);
        fetch(SITE.formEndpoint, { method: "POST", headers: { Accept: "application/json" }, body: data })
          .then(function (r) {
            if (!r.ok) { throw new Error(String(r.status)); }
            form.reset();
            setNote("Заявка отправлена. Ответим в рабочее время.", "ok");
          })
          .catch(function () {
            setNote("Не удалось отправить заявку. Попробуйте ещё раз или напишите нам напрямую.", "error");
          })
          .then(function () { setBusy(false); });
      } else if (SITE.email) {
        var subject = encodeURIComponent("Заявка с сайта KreoVolt");
        var body = encodeURIComponent(
          "Имя: " + data.get("name") + "\nКонтакт: " + data.get("contact") + "\n\nЗадача:\n" + data.get("message")
        );
        window.location.href = "mailto:" + SITE.email + "?subject=" + subject + "&body=" + body;
        setNote("Откроется ваша почтовая программа с готовым письмом.", "ok");
      } else {
        setNote("Форма пока не подключена. Напишите нам через контакты рядом с формой.", "error");
      }
    });
  }
})();
