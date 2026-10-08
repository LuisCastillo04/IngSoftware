(() => {
  "use strict";

  const data = window.APP_DATA;
  const main = document.getElementById("main-content");
  if (!window.Icons) {
    main.innerHTML = "<p>No se pudo cargar la aplicación. Comprueba que todos los archivos estén en la misma carpeta.</p>";
    return;
  }
  const { icon } = window.Icons;
  if (!data || !Array.isArray(data.styles) || data.styles.length !== 5 || !Array.isArray(window.QUIZ_BANK) || !window.ArchitectureCharts) {
    main.setAttribute("aria-busy", "false");
    main.innerHTML = `<div class="locked-panel" role="alert"><span class="locked-icon">${icon("alert", 30)}</span><h1>No se pudo cargar el contenido</h1><p>Comprueba que todos los archivos JavaScript estén en la misma carpeta que index.html y vuelve a abrir la página.</p><button class="button" type="button" onclick="location.reload()">${icon("reset", 18)}Reintentar</button></div>`;
    return;
  }

  const STORAGE_KEY = "atlas-arquitectura-v1";
  const THEME_KEY = "atlas-theme";
  const sources = {
    layered: { label: "Microsoft Learn · N-tier architecture", url: "https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier" },
    monolithic: { label: "AWS · Monolithic applications and alternatives", url: "https://docs.aws.amazon.com/prescriptive-guidance/latest/micro-frontends-aws/micro-frontend-alternatives.html" },
    microservices: { label: "Microsoft Learn · Microservices architecture", url: "https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices" },
    microkernel: { label: "Eclipse · Runtime platform and plug-ins", url: "https://help.eclipse.org/latest/topic/org.eclipse.platform.doc.isv/guide/runtime_model.htm" },
    "event-driven": { label: "Microsoft Learn · Event-driven architecture", url: "https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven" }
  };

  const quizBank = window.QUIZ_BANK;
  const charts = window.ArchitectureCharts;
  const styleById = Object.fromEntries(data.styles.map(style => [style.id, style]));
  const questionById = Object.fromEntries(quizBank.map(question => [question.id, question]));
  const $ = selector => document.querySelector(selector);
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const normalize = value => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileNav = window.matchMedia("(max-width: 960px)");
  const seriesStyle = id => `--series:var(--s-${id})`;
  const MAX_QUESTIONS = 3;
  let toastTimer;
  let revealObserver;

  // Estado de interfaz (no se guarda): sobrevive a los re-renders de una misma sesión.
  let comparisonCriterion = "scalability";
  let showReasons = false;
  let stylesMenuOpen = true;
  const profileUI = Object.fromEntries(data.styles.map(style => [style.id, { criterion: data.criteria[0].id, view: "bars", compare: "" }]));
  const tabByStyle = {};

  /* ---------- Estado persistente ---------- */

  function initialState() {
    return {
      progress: Object.fromEntries(data.styles.map(style => [style.id, { reviewed: false, exchanges: [] }])),
      quiz: null
    };
  }

  function loadState() {
    const fresh = initialState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !saved.progress) return fresh;
      for (const style of data.styles) {
        const entry = saved.progress[style.id];
        if (!entry) continue;
        fresh.progress[style.id] = {
          reviewed: entry.reviewed === true,
          exchanges: Array.isArray(entry.exchanges) ? entry.exchanges.filter(item => item && typeof item.question === "string" && typeof item.answer === "string").slice(0, MAX_QUESTIONS) : []
        };
      }
      if (saved.quiz && Array.isArray(saved.quiz.questionIds) && saved.quiz.questionIds.length === 5 && saved.quiz.questionIds.every(id => questionById[id])) {
        fresh.quiz = {
          questionIds: saved.quiz.questionIds,
          answers: saved.quiz.answers && typeof saved.quiz.answers === "object" ? saved.quiz.answers : {},
          submitted: saved.quiz.submitted === true
        };
      }
    } catch (_) { /* Si el navegador restringe almacenamiento, la app sigue funcionando. */ }
    return fresh;
  }

  let state = loadState();
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* Avance temporal en esta sesión. */ }
  }
  const progressFor = id => state.progress[id];
  const isComplete = id => progressFor(id).reviewed && progressFor(id).exchanges.length > 0;
  const completeCount = () => data.styles.filter(style => isComplete(style.id)).length;
  const reviewedCount = () => data.styles.filter(style => progressFor(style.id).reviewed).length;
  const askedCount = () => data.styles.reduce((total, style) => total + progressFor(style.id).exchanges.length, 0);
  const allComplete = () => completeCount() === data.styles.length;
  const statusOf = id => isComplete(id) ? "complete" : (progressFor(id).reviewed || progressFor(id).exchanges.length ? "partial" : "pending");
  const statusLabel = id => ({ complete: "Completado", partial: "En curso", pending: "Pendiente" })[statusOf(id)];
  const statusIcon = id => ({ complete: "check-circle", partial: "half-circle", pending: "circle" })[statusOf(id)];
  const statePill = id => `<span class="state-pill ${statusOf(id)}">${icon(statusIcon(id), 14)}${statusLabel(id)}</span>`;
  const nextStyle = () => data.styles.find(style => !isComplete(style.id)) || data.styles[0];

  /* ---------- Utilidades de interfaz ---------- */

  function toast(message) {
    const el = $("#toast");
    el.innerHTML = `${icon("check-circle", 18)}<span>${escapeHTML(message)}</span>`;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3400);
  }

  function confirmDialog({ title, text, confirmLabel }) {
    const dialog = $("#confirm-dialog");
    if (typeof dialog.showModal !== "function") return Promise.resolve(window.confirm(text));
    $("#dialog-title").textContent = title;
    $("#dialog-text").textContent = text;
    $("#dialog-confirm").textContent = confirmLabel;
    return new Promise(resolve => {
      dialog.returnValue = "cancel";
      dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true });
      dialog.showModal();
    });
  }

  const kpi = ({ iconName, lead = "", label, value, note = "", tone = "", aside = "" }) => `
    <div class="kpi ${tone}">
      ${lead || `<span class="kpi-icon">${icon(iconName, 22)}</span>`}
      <div class="kpi-body"><span class="kpi-label">${escapeHTML(label)}</span><strong class="kpi-value">${value}</strong>${note ? `<span class="kpi-note">${note}</span>` : ""}${aside}</div>
    </div>`;
  const segments = (on, total, dense = false) => `<span class="segments ${dense ? "dense" : ""}" aria-hidden="true">${Array.from({ length: total }, (_, index) => `<i class="${index < on ? "on" : ""}"></i>`).join("")}</span>`;
  const list = (items, className = "list-clean", iconName = "check") => `<ul class="${className}">${items.map(item => `<li>${iconName ? icon(iconName, 18) : ""}<span>${escapeHTML(item)}</span></li>`).join("")}</ul>`;

  /* ---------- Rutas ---------- */

  function route() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (hash === "comparar") return { view: "compare" };
    if (hash === "evaluacion") return { view: "quiz" };
    if (hash === "estilos") return { view: "home", section: "styles-section" };
    if (hash.startsWith("estilo/")) {
      const id = hash.slice(7);
      if (styleById[id]) return { view: "style", id };
    }
    return { view: "home" };
  }
  const hrefFor = (view, id) => `#${view === "style" ? `estilo/${id}` : ({ home: "inicio", compare: "comparar", quiz: "evaluacion" })[view]}`;

  function navigate(view, id) {
    const href = hrefFor(view, id);
    if (location.hash === href) render({ focusHeading: true });
    else location.hash = href;
  }

  const motionBehavior = () => reducedMotion.matches ? "auto" : "smooth";

  function setupMotion() {
    main.classList.remove("view-enter");
    void main.offsetWidth;
    main.classList.add("view-enter");
    revealObserver?.disconnect();
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
    revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: 0.06, rootMargin: "0px 0px -3% 0px" });
    document.documentElement.classList.add("motion-ready");
    const selectors = ".kpi, .style-card, .banner, .question-card, .review-question, .compare-table-wrap, .locked-panel, .chart-card, .tabpanel > .panel";
    main.querySelectorAll(selectors).forEach((element, index) => {
      element.classList.add("reveal");
      element.style.setProperty("--reveal-delay", `${(index % 4) * 60}ms`);
      if (element.getBoundingClientRect().top < window.innerHeight * 0.95) element.classList.add("is-visible");
      else revealObserver.observe(element);
    });
  }

  /* ---------- Navegación: sidebar, breadcrumb, tema y menú móvil ---------- */

  function renderSidebar(active) {
    const link = (href, name, label, extra = "", current = false) => `<a class="nav-link ${current ? "active" : ""}" href="${href}" ${current ? 'aria-current="page"' : ""}>${icon(name, 20)}<span>${label}</span>${extra}</a>`;
    const quizOpen = allComplete();
    const done = completeCount();
    $("#sidebar-body").innerHTML = `
      <nav class="nav-group" aria-label="Secciones">
        <p class="nav-label">Explora</p>
        <div class="nav-list">
          ${link(hrefFor("home"), "home", "Inicio", "", active.view === "home")}
          ${link(hrefFor("compare"), "compare", "Comparar estilos", "", active.view === "compare")}
          ${link(hrefFor("quiz"), "quiz", "Evaluación final", `<span class="nav-trailing">${icon(quizOpen ? "unlock" : "lock", 16)}<span class="sr-only">${quizOpen ? "Disponible" : "Bloqueada hasta completar los cinco estilos"}</span></span>`, active.view === "quiz")}
        </div>
      </nav>
      <nav class="nav-group" aria-label="Estilos arquitectónicos">
        <button type="button" class="nav-label" data-toggle-styles aria-expanded="${stylesMenuOpen}" aria-controls="style-list">Los 5 estilos ${icon("chevron-down", 16)}</button>
        <div id="style-list" class="nav-list" ${stylesMenuOpen ? "" : "hidden"}>
          ${data.styles.map((style, index) => {
            const current = active.view === "style" && active.id === style.id;
            return `<a class="nav-link style-link ${current ? "active" : ""}" href="${hrefFor("style", style.id)}" ${current ? 'aria-current="page"' : ""}>
              <span class="style-num">0${index + 1}</span><span class="style-name">${escapeHTML(style.name)}</span>
              <span class="status-icon ${statusOf(style.id)}">${icon(statusIcon(style.id), 18)}</span><span class="sr-only">${statusLabel(style.id)}</span>
            </a>`;
          }).join("")}
        </div>
      </nav>
      <div class="sidebar-progress">
        <div class="sidebar-progress-top"><span>Tu recorrido</span><strong>${done} / 5</strong></div>
        <div class="progress-track" role="progressbar" aria-label="Estilos completados" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${done}"><span style="--value:${done * 20}%"></span></div>
        <p>${allComplete() ? "¡Listo! Ya puedes hacer la evaluación final." : "Aprende a elegir una arquitectura según el problema, no por moda."}</p>
      </div>`;
  }

  function renderBreadcrumb(active) {
    const crumbs = [{ label: "Inicio", href: hrefFor("home") }];
    if (active.view === "compare") crumbs.push({ label: "Comparar estilos" });
    else if (active.view === "quiz") crumbs.push({ label: state.quiz?.submitted && allComplete() ? "Evaluación final · Resultado" : "Evaluación final" });
    else if (active.view === "style") crumbs.push({ label: "Estilos", href: "#estilos" }, { label: styleById[active.id].name });
    else crumbs[0] = { label: "Inicio" };
    $("#breadcrumb").innerHTML = `<ol>${crumbs.map((crumb, index) => {
      const last = index === crumbs.length - 1;
      const content = last ? `<span aria-current="page">${escapeHTML(crumb.label)}</span>` : crumb.href ? `<a href="${crumb.href}">${escapeHTML(crumb.label)}</a>` : `<span>${escapeHTML(crumb.label)}</span>`;
      return `<li>${content}${last ? "" : icon("chevron-right", 14)}</li>`;
    }).join("")}</ol>`;
  }

  const effectiveTheme = () => document.documentElement.dataset.theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  function syncThemeButton() {
    const dark = effectiveTheme() === "dark";
    const button = $("#theme-toggle");
    button.innerHTML = icon(dark ? "sun" : "moon", 20);
    button.setAttribute("aria-label", dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    button.title = button.getAttribute("aria-label");
  }
  function toggleTheme() {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* El tema solo durará esta sesión. */ }
    syncThemeButton();
  }

  const sidebar = $("#sidebar");
  const scrim = $("#scrim");
  const menuButton = $("#menu-button");
  const sidebarToggle = $("#sidebar-toggle");
  // En pantallas grandes el botón oculta/muestra la barra lateral (el contenido ocupa todo el ancho);
  // en tablet y móvil abre y cierra el cajón.
  const SIDEBAR_KEY = "atlas-sidebar-collapsed";
  const appShell = document.querySelector(".app-shell");
  let sidebarCollapsed = false;
  try { sidebarCollapsed = localStorage.getItem(SIDEBAR_KEY) === "1"; } catch (_) { /* Sin almacenamiento: se muestra expandida. */ }

  function setDrawer(open, { restoreFocus = false } = {}) {
    const mobile = mobileNav.matches;
    const isOpen = mobile && open;
    const visible = mobile ? isOpen : !sidebarCollapsed;
    sidebar.classList.toggle("open", isOpen);
    appShell.classList.toggle("is-collapsed", !mobile && sidebarCollapsed);
    scrim.hidden = !isOpen;
    menuButton.setAttribute("aria-expanded", String(visible));
    menuButton.setAttribute("aria-label", visible ? (mobile ? "Cerrar menú de navegación" : "Ocultar menú lateral") : (mobile ? "Abrir menú de navegación" : "Mostrar menú lateral"));
    menuButton.title = menuButton.getAttribute("aria-label");
    menuButton.innerHTML = icon("menu", 22);
    sidebarToggle.setAttribute("aria-expanded", String(visible));
    sidebarToggle.setAttribute("aria-label", mobile ? "Cerrar menú de navegación" : "Ocultar menú lateral");
    sidebarToggle.title = sidebarToggle.getAttribute("aria-label");
    sidebarToggle.innerHTML = icon(mobile ? "close" : "menu", 22);
    sidebar.inert = !visible; // oculta: no recibe foco ni lectores de pantalla
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (isOpen) sidebar.querySelector(".nav-link")?.focus();
    else if (restoreFocus) setTimeout(() => (visible ? sidebarToggle : menuButton).focus(), mobile ? 0 : 320); // espera a la transición
  }

  function toggleSidebar() {
    if (mobileNav.matches) { setDrawer(!sidebar.classList.contains("open"), { restoreFocus: true }); return; }
    sidebarCollapsed = !sidebarCollapsed;
    try { localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? "1" : "0"); } catch (_) { /* Solo esta sesión. */ }
    setDrawer(false, { restoreFocus: true });
  }

  /* ---------- Diagramas ---------- */

  function svgDiagram(style, instance = "primary") {
    const id = style.id;
    const markerId = `arrow-${id}-${instance}`;
    const text = (x, y, label, size = 16, muted = false) => `<text class="dg-text ${muted ? "is-muted" : ""}" x="${x}" y="${y}" text-anchor="middle" font-size="${size}">${escapeHTML(label)}</text>`;
    const box = (x, y, width, height, kind = "", radius = 14) => `<rect class="dg-box ${kind ? `is-${kind}` : ""}" x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/>`;
    const connector = (x1, y1, x2, y2, dashed = false) => `<path class="dg-link diagram-link ${dashed ? "is-dashed" : ""}" d="M ${x1} ${y1} L ${x2} ${y2}" marker-end="url(#${markerId})"/>`;
    let shape = "";
    if (id === "layered") {
      [[30, "Interfaz"], [91, "Reglas de negocio"], [152, "Acceso a datos"], [213, "Base de datos"]].forEach(([y, label], index) => {
        shape += box(135, y, 350, 44, index === 0 ? "accent" : "", 10) + text(310, y + 28, label, 16);
        if (index < 3) shape += connector(310, y + 45, 310, y + 58);
      });
    } else if (id === "monolithic") {
      shape += box(104, 26, 412, 248, "frame", 22);
      shape += box(178, 46, 264, 38, "accent", 9) + text(310, 71, "Una unidad de despliegue", 16);
      [[133, "Interfaz"], [256, "Negocio"], [379, "Datos"]].forEach(([x, label]) => {
        shape += box(x, 119, 107, 78, "soft", 10) + text(x + 53, 165, label, 14);
      });
      shape += connector(241, 159, 252, 159) + connector(364, 159, 375, 159);
      shape += text(310, 242, "Un proceso · una publicación principal", 14, true);
    } else if (id === "microservices") {
      shape += box(218, 12, 184, 45, "accent", 12) + text(310, 41, "Cliente / API", 16);
      [[42, "Catálogo"], [221, "Matrículas"], [400, "Pagos"]].forEach(([x, label]) => {
        shape += connector(310, 58, x + 89, 100, true);
        shape += box(x, 105, 178, 76, "", 12) + text(x + 89, 149, label, 15);
        shape += connector(x + 89, 182, x + 89, 220);
        shape += `<ellipse class="dg-box is-accent" cx="${x + 89}" cy="235" rx="59" ry="19"/>`;
        shape += text(x + 89, 240, "Datos", 13);
      });
    } else if (id === "microkernel") {
      shape += box(224, 101, 172, 99, "accent", 18) + text(310, 143, "Núcleo", 20) + text(310, 168, "Contratos", 13, true);
      [[46, 35, "Extensión A"], [404, 35, "Extensión B"], [46, 216, "Extensión C"], [404, 216, "Extensión D"]].forEach(([x, y, label]) => {
        shape += box(x, y, 170, 55, "", 12) + text(x + 85, y + 34, label, 14);
      });
      shape += connector(215, 87, 246, 111, true) + connector(405, 87, 374, 111, true) + connector(215, 216, 246, 192, true) + connector(405, 216, 374, 192, true);
    } else if (id === "event-driven") {
      shape += box(24, 99, 155, 90, "", 14) + text(101, 138, "Productor", 17) + text(101, 162, "Publica", 12, true);
      shape += box(222, 99, 175, 90, "accent", 14) + text(309, 138, "Canal de", 17) + text(309, 161, "eventos", 17);
      shape += connector(181, 144, 218, 144);
      [[439, 29, "Consumidor A"], [439, 110, "Consumidor B"], [439, 191, "Consumidor C"]].forEach(([x, y, label]) => {
        shape += connector(398, 144, 433, y + 35, true);
        shape += box(x, y, 160, 69, "", 12) + text(x + 80, y + 41, label, 14);
      });
    }
    return `<svg class="architecture-diagram" viewBox="0 0 620 300" role="img" aria-label="Diagrama de ${escapeHTML(style.name)}: ${escapeHTML(style.diagram.caption)}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path class="dg-arrow" d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>${shape}</svg>`;
  }

  function heroArt() {
    return `<svg class="hero-diagram" viewBox="0 0 360 300" role="img" aria-label="Cinco bloques conectados representan decisiones de arquitectura"><path class="hero-line" d="M180 57V102M180 159V205M62 132H117M243 132H301"/><rect class="hero-outer" x="115" y="99" width="130" height="68" rx="13"/><rect class="hero-inner" x="122" y="117" width="116" height="31" rx="7"/><text class="hero-center" x="180" y="137" text-anchor="middle" font-size="12" font-weight="800">ARQUITECTURA</text><rect class="hero-outer" x="125" y="5" width="110" height="52" rx="11"/><text x="180" y="37" text-anchor="middle">DECISIÓN</text><rect class="hero-outer" x="125" y="208" width="110" height="52" rx="11"/><text x="180" y="240" text-anchor="middle">CONTEXTO</text><rect class="hero-outer" x="4" y="105" width="107" height="54" rx="11"/><text x="57" y="139" text-anchor="middle">CALIDAD</text><rect class="hero-outer" x="250" y="105" width="106" height="54" rx="11"/><text x="303" y="139" text-anchor="middle">EQUIPO</text><circle class="hero-inner-muted" cx="180" cy="283" r="7"/><circle class="hero-inner-muted" cx="59" cy="184" r="5"/><circle class="hero-inner-muted" cx="303" cy="184" r="5"/></svg>`;
  }

  /* ---------- Vista: Inicio ---------- */

  function renderHome() {
    const done = completeCount();
    const next = nextStyle();
    const quizDone = state.quiz?.submitted === true && allComplete();
    const score = quizDone ? scoreQuiz() : null;
    const quizKpi = quizDone
      ? kpi({ iconName: "trophy", label: "Evaluación final", value: `${score.toFixed(1)}<small> / 5.0</small>`, note: score >= 3 ? "Última nota registrada" : "Repasa y vuelve a intentarlo", tone: score >= 3 ? "good" : "bad" })
      : allComplete()
        ? kpi({ iconName: "unlock", label: "Evaluación final", value: "Disponible", note: "5 preguntas de decisión", tone: "good" })
        : kpi({ iconName: "lock", label: "Evaluación final", value: "Bloqueada", note: `Faltan ${5 - done} estilo${5 - done === 1 ? "" : "s"} por completar`, tone: "warn" });

    main.innerHTML = `
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Aprende · Compara · Decide</span>
          <h1>La arquitectura se entiende <em>al elegir.</em></h1>
          <p>Conoce cinco estilos de software, descubre sus compromisos y practica cómo escoger el más adecuado para cada situación.</p>
          <div class="hero-actions">
            <button class="button button-lime" type="button" ${allComplete() ? 'data-view="quiz"' : `data-style="${next.id}"`}>${allComplete() ? "Ir a la evaluación" : done ? "Continuar recorrido" : "Empezar recorrido"}${icon("arrow-right", 18, "icon-arrow")}</button>
            <button class="button button-outline-light" type="button" data-view="compare">${icon("compare", 18)}Comparar estilos</button>
          </div>
        </div>
        <div class="hero-art">${heroArt()}</div>
      </section>

      <section class="kpi-grid" style="margin-top:var(--sp-4)" aria-label="Resumen de tu recorrido">
        ${kpi({ lead: charts.ring(done, 5, { size: 52, label: `${done * 20}%` }), label: "Progreso", value: `${done}<small> / 5 estilos</small>`, note: done === 5 ? "Recorrido completo" : `Siguiente: ${escapeHTML(next.shortName)}` })}
        ${kpi({ iconName: "book", label: "Fichas revisadas", value: `${reviewedCount()}<small> / 5</small>`, aside: segments(reviewedCount(), 5) })}
        ${kpi({ iconName: "message", label: "Preguntas hechas", value: `${askedCount()}<small> / ${5 * MAX_QUESTIONS}</small>`, note: `Hasta ${MAX_QUESTIONS} por estilo`, aside: segments(askedCount(), 5 * MAX_QUESTIONS, true) })}
        ${quizKpi}
      </section>

      <div class="section-head" id="styles-section"><div><span class="eyebrow">Ruta de aprendizaje</span><h2 tabindex="-1">Conoce los cinco estilos</h2></div><p>Abre una ficha, revisa su presentación y haz al menos una pregunta para completarla.</p></div>
      <section class="style-grid" aria-label="Cinco estilos arquitectónicos">
        ${data.styles.map((style, index) => {
          const average = charts.average(style, data.criteria);
          return `<article class="style-card" style="${seriesStyle(style.id)}">
            <div class="style-card-media">${svgDiagram(style, "card")}</div>
            <div class="style-card-body">
              <div class="style-card-top"><span class="style-number">${icon(style.id, 16)}Estilo 0${index + 1}</span>${statePill(style.id)}</div>
              <h3>${escapeHTML(style.name)}</h3>
              <p>${escapeHTML(style.tagline)}</p>
              <div class="style-card-meta">
                <span class="style-card-score">Promedio de atributos<strong>${average === null ? "—" : average.toFixed(1)} / 5</strong></span>
                ${charts.spark(style, data.criteria)}
              </div>
              <button type="button" class="card-link" data-style="${style.id}" aria-label="Abrir ${escapeHTML(style.name)}">Explorar estilo ${icon("arrow-right", 16)}</button>
            </div>
          </article>`;
        }).join("")}
      </section>
      <div class="banner ${allComplete() ? "ready" : ""}">
        <div><h3>${allComplete() ? "¡Evaluación disponible!" : "Tu siguiente reto te espera"}</h3><p>${allComplete() ? "Ya conoces los cinco estilos. Pon a prueba tus decisiones." : `Completa las ${5 - done} fichas restantes para desbloquear la evaluación de cinco preguntas.`}</p></div>
        <button class="button ${allComplete() ? "" : "button-ghost"}" type="button" data-view="quiz">${allComplete() ? "Ir a la evaluación" : "Ver requisitos"}${icon("arrow-right", 18, "icon-arrow")}</button>
      </div>`;
  }

  /* ---------- Vista: Ficha de un estilo ---------- */

  const TABS = [
    { id: "overview", icon: "book", label: "Visión general" },
    { id: "tradeoffs", icon: "compare", label: "Fortalezas y límites" },
    { id: "usecases", icon: "briefcase", label: "Cuándo usarlo" },
    { id: "quality", icon: "activity", label: "Calidad" },
    { id: "interview", icon: "message", label: "Entrevista" }
  ];

  function renderStyle(id) {
    const style = styleById[id];
    const entry = progressFor(id);
    const source = sources[id];
    const index = data.styles.findIndex(item => item.id === id);
    const following = data.styles[(index + 1) % data.styles.length];
    const previous = data.styles[(index + data.styles.length - 1) % data.styles.length];
    const answered = entry.exchanges.length;
    const activeTab = tabByStyle[id] || "overview";
    const average = charts.average(style, data.criteria);
    const { best, worst } = charts.extremes(style, data.criteria);
    const aboutRatings = [
      kpi({ iconName: "star", label: "Promedio global", value: `${average === null ? "—" : average.toFixed(1)}<small> / 5</small>`, note: "Media de los seis atributos" }),
      best ? kpi({ iconName: "trending-up", label: "Mejor atributo", value: escapeHTML(best.criterion.label), note: `${best.score} de 5 · ${charts.tierOf(best.score).label}`, tone: best.score >= 4 ? "good" : "" }) : "",
      worst ? kpi({ iconName: "alert", label: "Atributo a vigilar", value: escapeHTML(worst.criterion.label), note: `${worst.score} de 5 · ${charts.tierOf(worst.score).label}`, tone: worst.score <= 2 ? "bad" : "warn" }) : "",
      kpi({ iconName: "message", label: "Entrevista", value: `${answered}<small> / ${MAX_QUESTIONS}</small>`, note: "Preguntas respondidas", aside: segments(answered, MAX_QUESTIONS) })
    ].join("");

    const panel = (name, content) => `<div class="tabpanel" role="tabpanel" id="panel-${name}" data-panel="${name}" aria-labelledby="tab-${name}" tabindex="0" ${name === activeTab ? "" : "hidden"}>${content}</div>`;

    const nextAction = !entry.reviewed
      ? `<button class="button" type="button" data-review="${id}">Marcar como revisada ${icon("check", 18)}</button>`
      : !answered
        ? `<button class="button" type="button" data-tab="interview">Ir a la entrevista ${icon("arrow-right", 18, "icon-arrow")}</button>`
        : `<button class="button" type="button" data-style="${following.id}">Siguiente: ${escapeHTML(following.shortName)} ${icon("arrow-right", 18, "icon-arrow")}</button>`;

    main.innerHTML = `
      <div class="style-page" style="${seriesStyle(id)}">
      <section class="profile-hero">
        <div class="profile-copy">
          <span class="eyebrow">Estilo 0${index + 1} · ${escapeHTML(style.eyebrow)}</span>
          <h1>${escapeHTML(style.name)}</h1>
          <p class="intro">“${escapeHTML(style.intro)}”</p>
          <div class="profile-meta">${statePill(id)}<span class="meta-chip">${icon("message", 14)}Entrevista ${answered}/${MAX_QUESTIONS}</span></div>
        </div>
        <div class="profile-visual">${svgDiagram(style, "hero")}</div>
      </section>
      <section class="kpi-grid profile-kpis" aria-label="Indicadores de ${escapeHTML(style.name)}">${aboutRatings}</section>

      <div class="layout">
        <div class="tabs">
          <div class="tablist" role="tablist" aria-label="Secciones de la ficha">
            ${TABS.map(tab => `<button class="tab" type="button" role="tab" id="tab-${tab.id}" data-tab="${tab.id}" aria-controls="panel-${tab.id}" aria-selected="${tab.id === activeTab}" tabindex="${tab.id === activeTab ? 0 : -1}">${icon(tab.icon, 18)}${tab.label}${tab.id === "interview" ? `<span class="tab-count">${answered}/${MAX_QUESTIONS}</span>` : ""}</button>`).join("")}
          </div>
          ${panel("overview", `
            <section class="panel" aria-labelledby="definition-title"><span class="panel-eyebrow">En pocas palabras</span><h2 id="definition-title">¿Quién soy y cómo funciono?</h2><div class="definition-callout"><p>${escapeHTML(style.definition)}</p></div><h3>Mi estructura</h3><p>${escapeHTML(style.structure)}</p></section>
            <section class="panel diagram-panel" aria-labelledby="diagram-title"><span class="panel-eyebrow">Mapa visual</span><h2 id="diagram-title">Así me organizo</h2>${svgDiagram(style, "detail")}<p class="diagram-caption">${escapeHTML(style.diagram.caption)}</p></section>`)}
          ${panel("tradeoffs", `
            <div class="pros-cons">
              <section class="panel" aria-labelledby="strengths-title"><span class="panel-eyebrow">A favor</span><h2 id="strengths-title">Mis fortalezas</h2>${list(style.strengths, "list-clean", "plus")}</section>
              <section class="panel cons-panel" aria-labelledby="weaknesses-title"><span class="panel-eyebrow">A considerar</span><h2 id="weaknesses-title">Mis compromisos</h2>${list(style.weaknesses, "list-clean cons", "minus")}</section>
            </div>`)}
          ${panel("usecases", `
            <section class="panel" aria-labelledby="cases-title"><span class="panel-eyebrow">En la práctica</span><h2 id="cases-title">¿Cuándo convengo?</h2>${list(style.recommended, "use-list", "")}<div class="scenario-box"><strong>Un caso cercano: ${escapeHTML(style.example.title)}</strong><p>${escapeHTML(style.example.scenario)} ${escapeHTML(style.example.why)}</p></div></section>`)}
          ${panel("quality", `
            <section class="panel" aria-labelledby="ratings-title"><span class="panel-eyebrow">Perfil interactivo</span><h2 id="ratings-title">Cómo rindo</h2><p class="ratings-hint">Explora mis seis atributos de calidad en una escala de 1 a 5. ${escapeHTML(style.ratingCaveat)}</p><div id="profile-chart">${drawProfile(id)}</div></section>
            <section class="panel" aria-labelledby="remember-title"><span class="panel-eyebrow">Idea para recordar</span><h2 id="remember-title">La decisión depende del contexto</h2><p>${escapeHTML(style.tagline)} Mis valoraciones son una guía: el diseño, el tamaño, el equipo y la operación pueden cambiar el resultado.</p></section>`)}
          ${panel("interview", `
            <section class="panel interview-panel" aria-labelledby="interview-title">
              <div class="interview-head"><div><span class="panel-eyebrow">Conversación guiada</span><h2 id="interview-title">Entrevístame</h2><p>Pregúntame sobre mi estructura, ventajas, límites, casos de uso o atributos de calidad. Respondo con el contenido de esta ficha.</p></div><span class="question-counter">${segments(answered, MAX_QUESTIONS)}${answered} / ${MAX_QUESTIONS}<span class="sr-only"> preguntas usadas</span></span></div>
              ${answered < MAX_QUESTIONS ? `
                <div class="question-suggestions" role="group" aria-label="Preguntas sugeridas">
                  <button class="suggestion" type="button" data-suggestion="¿En qué caso conviene usar ${escapeHTML(style.name)}?">¿Cuándo convienes?</button>
                  <button class="suggestion" type="button" data-suggestion="¿Qué ventajas tienes para el mantenimiento?">¿Qué ventajas tienes?</button>
                  <button class="suggestion" type="button" data-suggestion="¿Qué limitaciones debo considerar?">¿Qué limitaciones tienes?</button>
                </div>
                <form id="interview-form" class="interview-form" novalidate>
                  <label for="interview-question">Tu pregunta</label>
                  <div class="interview-controls"><textarea id="interview-question" name="question" maxlength="220" placeholder="Escribe aquí una pregunta sobre este estilo…" required aria-describedby="interview-message char-count"></textarea><button type="submit" class="button">Preguntar ${icon("send", 18)}</button></div>
                  <div class="form-foot"><p id="interview-message" class="form-message" role="status" aria-live="polite"></p><span id="char-count">0 / 220 · Ctrl+Enter para enviar</span></div>
                </form>` : `<p class="interview-ended">Ya usaste tus tres preguntas para este estilo. Puedes volver a leer la ficha y revisar las respuestas cuando quieras.</p>`}
              <div class="conversation" aria-live="polite">${answered ? entry.exchanges.map(item => `<div class="exchange"><div class="bubble question">${escapeHTML(item.question)}</div><div class="bubble answer"><span class="avatar">${icon(id, 16)}</span><span>${escapeHTML(item.answer)}</span></div></div>`).join("") : `<div class="empty-state"><span>${icon("message", 28)}</span><strong>Aún no has hecho preguntas</strong><span>Prueba una sugerencia o escribe la tuya. Las preguntas ajenas al contenido no consumen un intento.</span></div>`}</div>
            </section>`)}
          <nav class="pager" aria-label="Cambiar de estilo">
            <button class="button button-ghost" type="button" data-style="${previous.id}">${icon("arrow-left", 18)}${escapeHTML(previous.shortName)}</button>
            <button class="button button-ghost" type="button" data-style="${following.id}">${escapeHTML(following.shortName)}${icon("arrow-right", 18, "icon-arrow")}</button>
          </nav>
        </div>

        <aside class="aside" aria-label="Tu avance en este estilo">
          <section class="aside-card">
            <h2>Tu avance en este estilo</h2>
            <div class="steps">
              <div class="step ${entry.reviewed ? "done" : ""}"><span class="step-mark">${entry.reviewed ? icon("check", 14) : "1"}</span><div><strong>Revisa la presentación</strong><small>${entry.reviewed ? "Marcada como revisada" : "Lee la ficha y márcala al final"}</small></div></div>
              <div class="step ${answered ? "done" : ""}"><span class="step-mark">${answered ? icon("check", 14) : "2"}</span><div><strong>Entrevista al estilo</strong><small>${answered ? `${answered} pregunta${answered === 1 ? "" : "s"} respondida${answered === 1 ? "" : "s"}` : "Haz al menos una pregunta"}</small></div></div>
            </div>
            ${isComplete(id) ? `<p style="margin-bottom:var(--sp-3)"><strong>¡Estilo completado!</strong> Ya revisaste esta ficha y conversaste con el estilo.</p>` : ""}
            ${nextAction}
          </section>
          <section class="aside-card">
            <h2>Para profundizar</h2>
            <p>Consulta una fuente externa para ampliar lo aprendido.</p>
            <div class="aside-links"><a href="${source.url}" target="_blank" rel="noopener noreferrer" class="link-button">${escapeHTML(source.label)} ${icon("external", 14)}<span class="sr-only"> (se abre en una pestaña nueva)</span></a></div>
          </section>
        </aside>
      </div>
      </div>`;
  }

  function drawProfile(id) {
    const ui = profileUI[id];
    return charts.profile(styleById[id], data.criteria, { criterion: ui.criterion, view: ui.view, compareId: ui.compare, styles: data.styles });
  }

  function selectTab(name, { focus = false } = {}) {
    const current = route();
    if (current.view !== "style" || !TABS.some(tab => tab.id === name)) return;
    tabByStyle[current.id] = name;
    document.querySelectorAll(".tab").forEach(tab => {
      const selected = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll(".tabpanel").forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
    if (focus) $(`.tab[data-tab="${name}"]`)?.focus();
  }

  /* ---------- Vista: Comparar ---------- */

  function drawComparison() {
    $("#comparison-chart").innerHTML = charts.comparison(data.styles, data.criteria, comparisonCriterion, { showReasons });
    $("#heatmap-chart").innerHTML = charts.heatmap(data.styles, data.criteria, comparisonCriterion);
  }

  function renderCompare() {
    const summary = charts.summary(data.styles, data.criteria);
    const kpis = summary ? [
      kpi({ iconName: "trophy", label: "Mayor promedio global", value: escapeHTML(summary.topStyle.style.shortName), note: `${summary.topStyle.avg.toFixed(1)} de 5 en los seis atributos`, tone: "good" }),
      kpi({ iconName: "trending-up", label: "Atributo mejor valorado", value: escapeHTML(summary.bestCriterion.criterion.label), note: `Promedio ${summary.bestCriterion.avg.toFixed(1)} entre los cinco estilos`, tone: "good" }),
      kpi({ iconName: "alert", label: "Atributo más exigente", value: escapeHTML(summary.hardestCriterion.criterion.label), note: `Promedio ${summary.hardestCriterion.avg.toFixed(1)} entre los cinco estilos`, tone: "bad" }),
      kpi({ iconName: "compare", label: "Mayor contraste", value: escapeHTML(summary.widestCriterion.criterion.label), note: `Va de ${summary.widestCriterion.min} a ${summary.widestCriterion.max}: aquí la elección más importa` })
    ].join("") : "";

    main.innerHTML = `
      <div class="page-head"><span class="eyebrow">Una mirada en conjunto</span><h1>Comparar para decidir mejor.</h1><p>Cada estilo resuelve problemas distintos y varios pueden combinarse. Empieza por el resumen, filtra por atributo y visita las fichas para revisar los compromisos.</p></div>
      <section class="kpi-grid" aria-label="Resumen de la comparación">${kpis}</section>
      <div id="comparison-chart" style="margin-top:var(--sp-5)"></div>
      <div id="heatmap-chart" style="margin-top:var(--sp-4)"></div>
      <div class="section-head"><div><span class="eyebrow">Más allá de los números</span><h2>Qué cambia en la práctica</h2></div><p>Resume estructura, ventajas, compromisos y contextos recomendados.</p></div>
      <div class="compare-table-wrap"><table class="compare-table"><caption class="sr-only">Comparación de cinco estilos arquitectónicos</caption><thead><tr><th scope="col">Estilo</th><th scope="col">Cómo se organiza</th><th scope="col">Fortaleza destacada</th><th scope="col">Compromiso principal</th><th scope="col">Situación apropiada</th></tr></thead><tbody>
        ${data.styles.map(style => `<tr><th scope="row" class="style-name-cell"><span><span class="key-dot" style="${seriesStyle(style.id)}" aria-hidden="true"></span>${escapeHTML(style.name)}</span><button type="button" class="link-button" data-style="${style.id}">Ver ficha ${icon("external", 13)}</button></th><td data-label="Cómo se organiza">${escapeHTML(style.structure)}</td><td data-label="Fortaleza destacada">${escapeHTML(style.strengths[0])}</td><td data-label="Compromiso principal">${escapeHTML(style.weaknesses[0])}</td><td data-label="Situación apropiada">${escapeHTML(style.recommended[0])}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="compare-note">Una aplicación puede, por ejemplo, ser monolítica en su despliegue y estar organizada por capas. Las puntuaciones dependen de la implementación y del contexto.</p>
      <div class="banner"><div><h3>¿Qué elegirías para tu proyecto?</h3><p>Revisa el escenario de cada ficha y explica qué atributo priorizas.</p></div><button class="button" type="button" data-style="${nextStyle().id}">Continuar recorrido ${icon("arrow-right", 18, "icon-arrow")}</button></div>`;
    drawComparison();
  }

  /* ---------- Vista: Evaluación ---------- */

  function shuffled(items) {
    const output = [...items];
    for (let i = output.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [output[i], output[j]] = [output[j], output[i]];
    }
    return output;
  }

  function ensureQuiz() {
    if (state.quiz) return;
    const medium = shuffled(quizBank.filter(item => item.level === "media")).slice(0, 3);
    const high = shuffled(quizBank.filter(item => item.level === "alta")).slice(0, 2);
    state.quiz = { questionIds: [...medium, ...high].map(item => item.id), answers: {}, submitted: false };
    persist();
  }

  const answeredIn = () => state.quiz.questionIds.filter(id => Object.prototype.hasOwnProperty.call(state.quiz.answers, id));

  function renderQuiz() {
    if (!allComplete()) {
      main.innerHTML = `<div class="locked-panel"><span class="locked-icon">${icon("lock", 30)}</span><span class="eyebrow">Evaluación final</span><h1>Aún falta explorar</h1><p>La evaluación se desbloquea cuando revisas la presentación y haces al menos una pregunta a cada uno de los cinco estilos.</p><div class="unlock-checklist">${data.styles.map(style => `<button type="button" data-style="${style.id}"><span class="${isComplete(style.id) ? "done" : ""}">${icon(statusIcon(style.id), 20)}</span><span>${escapeHTML(style.name)} · ${statusLabel(style.id)}</span></button>`).join("")}</div><button class="button" type="button" data-style="${nextStyle().id}">Ir al siguiente estilo ${icon("arrow-right", 18, "icon-arrow")}</button></div>`;
      return;
    }
    ensureQuiz();
    if (state.quiz.submitted) { renderResults(); return; }
    const questions = state.quiz.questionIds.map(id => questionById[id]);
    const count = answeredIn().length;
    main.innerHTML = `
      <div class="page-head"><span class="eyebrow">Evaluación final desbloqueada</span><h1>Pon a prueba tus decisiones.</h1><p>Responde cinco situaciones: tres de dificultad media y dos de dificultad alta. Cada pregunta tiene una sola respuesta correcta. Al terminar verás tu nota sobre 5.0 y las explicaciones.</p></div>
      <div class="quiz-bar">
        <div class="quiz-bar-top"><span id="quiz-answer-count">${count} de 5 respondidas</span><div class="quiz-dots" role="group" aria-label="Ir a una pregunta">${state.quiz.questionIds.map((id, index) => `<button type="button" data-goto="q-${index}" class="${state.quiz.answers.hasOwnProperty(id) ? "done" : ""}" aria-label="Ir a la pregunta ${index + 1}">${index + 1}</button>`).join("")}</div></div>
        <div class="progress-track" role="progressbar" aria-label="Preguntas respondidas" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${count}"><span id="quiz-progress" style="--value:${count * 20}%"></span></div>
      </div>
      <form id="quiz-form" class="quiz-grid" novalidate>
        ${questions.map((question, index) => `<fieldset class="question-card" id="q-${index}"><legend class="sr-only">Pregunta ${index + 1}</legend><div class="question-top"><span class="question-index">PREGUNTA 0${index + 1}</span><span class="difficulty ${question.level === "alta" ? "high" : ""}">Dificultad ${question.level}</span></div><h2>${escapeHTML(question.prompt)}</h2><div class="options">${question.options.map((option, optionIndex) => `<label class="option"><input type="radio" name="${question.id}" value="${optionIndex}" ${Number(state.quiz.answers[question.id]) === optionIndex && Object.prototype.hasOwnProperty.call(state.quiz.answers, question.id) ? "checked" : ""}><span class="option-letter">${"ABCDE"[optionIndex]}</span><span>${escapeHTML(option)}</span></label>`).join("")}</div></fieldset>`).join("")}
        <div class="quiz-actions"><p id="quiz-error" role="status" aria-live="polite"></p><button class="button" type="submit">Calificar evaluación ${icon("arrow-right", 18, "icon-arrow")}</button></div>
      </form>`;
  }

  function scoreQuiz() {
    return state.quiz.questionIds.reduce((total, id) => total + (Number(state.quiz.answers[id]) === questionById[id].answer ? 1 : 0), 0);
  }

  function feedback(score) {
    if (score === 5) return "Dominaste las cinco decisiones. Sigue justificando cada elección según contexto, atributos de calidad y costo operativo.";
    if (score >= 3) return "Tienes una buena base. Revisa los compromisos de las respuestas incorrectas y compara los estilos antes de repetir.";
    return "Repasa las fichas y sus casos de uso. Fíjate en qué problema resuelve cada estilo y qué complejidad introduce.";
  }

  function renderResults() {
    const score = scoreQuiz();
    main.innerHTML = `
      <section class="results-hero">
        <div><span class="eyebrow">Evaluación completada</span><h1>${score === 5 ? "¡Excelente criterio!" : score >= 3 ? "Buen trabajo." : "Sigue practicando."}</h1><p>${feedback(score)}</p></div>
        <div role="img" aria-label="Calificación ${score.toFixed(1)} sobre 5.0">${charts.ring(score, 5, { size: 140, label: score.toFixed(1), sub: "sobre 5.0" })}</div>
      </section>
      <div class="results-actions"><button class="button" type="button" data-retake="true">${icon("reset", 18)}Intentar de nuevo</button><button class="button button-ghost" type="button" data-view="compare">${icon("compare", 18)}Repasar comparación</button></div>
      <div class="section-head"><div><span class="eyebrow">Retroalimentación</span><h2>Revisa tus respuestas</h2></div><p>${score} de 5 respuestas correctas. La explicación conecta cada reto con lo aprendido en las fichas.</p></div>
      <section class="answer-review" aria-label="Corrección de respuestas">${state.quiz.questionIds.map((id, index) => {
        const question = questionById[id];
        const selected = Number(state.quiz.answers[id]);
        const correct = selected === question.answer;
        return `<article class="review-question ${correct ? "correct" : ""}"><span class="state-pill ${correct ? "complete" : "bad"}">${icon(correct ? "check-circle" : "alert", 14)}${correct ? "Correcta" : "Incorrecta"} · pregunta ${index + 1}</span><h3>${escapeHTML(question.prompt)}</h3><p><strong>Tu respuesta:</strong> ${escapeHTML(question.options[selected])}</p>${correct ? "" : `<p><strong>Respuesta correcta:</strong> ${escapeHTML(question.options[question.answer])}</p>`}<p class="explanation">${escapeHTML(question.explanation)}</p></article>`;
      }).join("")}</section>`;
  }

  /* ---------- Render principal ---------- */

  function render({ focusHeading = false } = {}) {
    const current = route();
    setDrawer(false);
    renderSidebar(current);
    renderBreadcrumb(current);
    if (current.view === "home") renderHome();
    else if (current.view === "style") renderStyle(current.id);
    else if (current.view === "compare") renderCompare();
    else renderQuiz();
    main.setAttribute("aria-busy", "false");
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = `${current.view === "style" ? styleById[current.id].name : current.view === "compare" ? "Comparar estilos" : current.view === "quiz" ? "Evaluación final" : "Inicio"} | Atlas de arquitectura`;
    setupMotion();
    if (current.section) {
      const target = document.getElementById(current.section);
      target?.scrollIntoView({ block: "start" }); // el scroll-padding del html deja libre la barra superior
      target?.querySelector("h2")?.focus({ preventScroll: true });
    } else if (focusHeading) {
      const heading = main.querySelector("h1");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
  }

  /* ---------- Entrevista ---------- */

  function getInterviewAnswer(style, question) {
    const text = normalize(question);
    const criterionTerms = {
      simplicity: /simple|simplic|facil|complej|iniciar|empezar/,
      modularity: /modular|modulo|separa|acopl/,
      maintainability: /manten|manteni|cambiar|modific|evoluc/,
      deployability: /desplieg|deploy|public|version|entrega/,
      testability: /prueb|test|verific|comprob/,
      scalability: /escal|carga|crec|rendimiento|volumen/
    };
    for (const criterion of data.criteria) {
      if (criterionTerms[criterion.id].test(text) || text.includes(normalize(criterion.label))) {
        const rating = style.ratings[criterion.id];
        return `${criterion.label}: me valoran con ${rating.score} de 5 estrellas en esta situación. ${rating.reason} Es una guía, no una medida universal.`;
      }
    }
    if (/compar|diferenc|versus|\bvs\b/.test(text) && data.styles.some(other => other.id !== style.id && text.includes(normalize(other.shortName)))) {
      return null;
    }
    if (/estructura|organiza|component|parte|capa|nucleo|plugin|complement|evento|servicio|funciona|flujo|proceso/.test(text)) return style.interviewAnswers.structure;
    if (/debil|desventaj|limit|riesg|problema|fall|dificult|contra|cost|compromiso/.test(text)) return style.interviewAnswers.weaknesses;
    if (/fortalez|ventaj|benefici|gana|mejora|aport|favorece/.test(text)) return style.interviewAnswers.strengths;
    if (/cuando|donde|convien|recomiend|usar|util|caso|ejemplo|proyecto|escenario|situacion|elegir/.test(text)) return style.interviewAnswers.useCases;
    if (/seguridad|disponib|fiabilidad|privacidad/.test(text)) return null;
    if (/calidad|atribut/.test(text)) return style.interviewAnswers.quality;
    if (/que es|quien eres|defin|explic|resum|present|arquitectura|software/.test(text)) return style.interviewAnswers.overview;
    return null;
  }

  /* ---------- Eventos ---------- */

  // Devuelve el foco al control que el usuario acaba de usar tras redibujar una gráfica.
  function redrawKeepingFocus(host, selector, index, draw) {
    draw();
    host.querySelectorAll(selector)[index]?.focus({ preventScroll: true });
  }

  document.addEventListener("click", event => {
    const anchor = event.target.closest("a[href^='#']");
    if (anchor) {
      if (anchor.getAttribute("href") === location.hash) { event.preventDefault(); render({ focusHeading: true }); }
      else if (mobileNav.matches) setDrawer(false);
      return;
    }
    const target = event.target.closest("button, [data-profile-criterion]");
    if (!target) return;

    if (target.dataset.profileCriterion) {
      const current = route();
      const criterion = target.dataset.profileCriterion;
      if (current.view !== "style" || !data.criteria.some(item => item.id === criterion)) return;
      profileUI[current.id].criterion = criterion;
      const host = $("#profile-chart");
      host.innerHTML = drawProfile(current.id);
      host.querySelector(`button[data-profile-criterion="${criterion}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (target.dataset.profileView) {
      const current = route();
      if (current.view !== "style") return;
      profileUI[current.id].view = target.dataset.profileView === "radar" ? "radar" : "bars";
      const host = $("#profile-chart");
      host.innerHTML = drawProfile(current.id);
      host.querySelector(`[data-profile-view="${profileUI[current.id].view}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (target.dataset.compareCriterion) {
      const criterion = target.dataset.compareCriterion;
      if (route().view !== "compare" || !data.criteria.some(item => item.id === criterion)) return;
      const host = target.closest("#comparison-chart, #heatmap-chart");
      const index = [...host.querySelectorAll(`[data-compare-criterion="${criterion}"]`)].indexOf(target);
      comparisonCriterion = criterion;
      redrawKeepingFocus(host, `[data-compare-criterion="${criterion}"]`, index, drawComparison);
      return;
    }
    if (target.hasAttribute("data-toggle-reasons")) {
      showReasons = !showReasons;
      target.setAttribute("aria-pressed", String(showReasons));
      target.closest(".comparison")?.classList.toggle("show-reasons", showReasons);
      return;
    }
    if (target.hasAttribute("data-toggle-styles")) {
      stylesMenuOpen = !stylesMenuOpen;
      target.setAttribute("aria-expanded", String(stylesMenuOpen));
      $("#style-list").hidden = !stylesMenuOpen;
      return;
    }
    if (target.dataset.tab) {
      selectTab(target.dataset.tab);
      $(".tabs")?.scrollIntoView({ behavior: motionBehavior(), block: "start" });
      return;
    }
    if (target.dataset.goto) { document.getElementById(target.dataset.goto)?.scrollIntoView({ behavior: motionBehavior(), block: "center" }); return; }
    if (target.dataset.style) { navigate("style", target.dataset.style); return; }
    if (target.dataset.view) { navigate(target.dataset.view); return; }
    if (target.dataset.review) {
      const id = target.dataset.review;
      state.progress[id].reviewed = true;
      persist(); renderSidebar(route()); tabByStyle[id] = "interview"; renderStyle(id); setupMotion();
      toast(isComplete(id) ? "¡Estilo completado!" : "Presentación revisada. Ahora haz una pregunta en la entrevista.");
      $(".tabs")?.scrollIntoView({ behavior: motionBehavior(), block: "start" });
      return;
    }
    if (target.dataset.suggestion) {
      const textarea = $("#interview-question");
      if (textarea) { textarea.value = target.dataset.suggestion; textarea.dispatchEvent(new Event("input", { bubbles: true })); textarea.focus(); }
      return;
    }
    if (target.dataset.retake) {
      state.quiz = null;
      ensureQuiz(); render({ focusHeading: true });
      toast("Nuevo intento preparado.");
      return;
    }
    if (target.id === "reset-progress") {
      confirmDialog({ title: "¿Reiniciar todo el avance?", text: "Se borrarán las fichas revisadas, las entrevistas y la evaluación guardadas en este navegador. Esta acción no se puede deshacer.", confirmLabel: "Reiniciar avance" }).then(confirmed => {
        if (!confirmed) return;
        state = initialState(); persist(); navigate("home"); render(); toast("Avance reiniciado.");
      });
      return;
    }
    if (target.id === "theme-toggle") { toggleTheme(); return; }
    if (target.id === "menu-button" || target.id === "sidebar-toggle") { toggleSidebar(); return; }
  });

  document.addEventListener("change", event => {
    if (event.target.matches("select[data-profile-compare]")) {
      const current = route();
      if (current.view !== "style") return;
      profileUI[current.id].compare = event.target.value;
      const host = $("#profile-chart");
      host.innerHTML = drawProfile(current.id);
      host.querySelector("select[data-profile-compare]")?.focus({ preventScroll: true });
      return;
    }
    if (!event.target.matches("#quiz-form input[type=radio]")) return;
    state.quiz.answers[event.target.name] = Number(event.target.value);
    persist();
    const count = answeredIn().length;
    $("#quiz-answer-count").textContent = `${count} de 5 respondidas`;
    $("#quiz-progress").style.setProperty("--value", `${count * 20}%`);
    $("#quiz-progress").parentElement.setAttribute("aria-valuenow", String(count));
    document.querySelectorAll(".quiz-dots button").forEach((dot, index) => dot.classList.toggle("done", state.quiz.answers.hasOwnProperty(state.quiz.questionIds[index])));
    $("#quiz-error").textContent = "";
  });

  document.addEventListener("input", event => {
    if (event.target.id !== "interview-question") return;
    $("#char-count").textContent = `${event.target.value.length} / 220 · Ctrl+Enter para enviar`;
    $("#interview-message").textContent = "";
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) { setDrawer(false, { restoreFocus: true }); return; }
    if (event.target.id === "interview-question" && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.target.form?.requestSubmit();
      return;
    }
    const tab = event.target.closest?.("[role=tab]");
    if (!tab) return;
    const tabs = [...document.querySelectorAll("[role=tab]")];
    const index = tabs.indexOf(tab);
    const target = { ArrowRight: tabs[(index + 1) % tabs.length], ArrowLeft: tabs[(index + tabs.length - 1) % tabs.length], Home: tabs[0], End: tabs[tabs.length - 1] }[event.key];
    if (!target) return;
    event.preventDefault();
    selectTab(target.dataset.tab, { focus: true });
  });

  document.addEventListener("submit", event => {
    if (event.target.id === "interview-form") {
      event.preventDefault();
      const current = route();
      if (current.view !== "style") return;
      const entry = progressFor(current.id);
      if (entry.exchanges.length >= MAX_QUESTIONS) return;
      const input = $("#interview-question");
      const message = $("#interview-message");
      const question = input.value.trim().replace(/\s+/g, " ");
      if (question.length < 5) { message.textContent = "Escribe una pregunta un poco más concreta."; input.focus(); return; }
      const answer = getInterviewAnswer(styleById[current.id], question);
      if (!answer) {
        message.textContent = "Puedo responder sobre mi estructura, ventajas, límites, usos y calidad. Para contrastar estilos, visita Comparar estilos. Esta pregunta no consume un intento.";
        return;
      }
      entry.exchanges.push({ question, answer });
      persist(); renderSidebar(current); renderStyle(current.id); setupMotion();
      toast(isComplete(current.id) ? "¡Estilo completado!" : "Pregunta respondida. Revisa la presentación para completar el estilo.");
      const exchanges = document.querySelectorAll(".exchange");
      exchanges[exchanges.length - 1]?.scrollIntoView({ behavior: motionBehavior(), block: "nearest" });
    }
    if (event.target.id === "quiz-form") {
      event.preventDefault();
      const missing = state.quiz.questionIds.filter(id => !Object.prototype.hasOwnProperty.call(state.quiz.answers, id));
      if (missing.length) {
        $("#quiz-error").textContent = `Responde las ${missing.length} pregunta${missing.length === 1 ? "" : "s"} pendiente${missing.length === 1 ? "" : "s"} antes de calificar.`;
        document.querySelector(`input[name="${missing[0]}"]`)?.closest(".question-card")?.scrollIntoView({ behavior: motionBehavior(), block: "center" });
        return;
      }
      state.quiz.submitted = true; persist(); render({ focusHeading: true });
    }
  });

  $("#confirm-dialog").addEventListener("click", event => { if (event.target === event.currentTarget) event.currentTarget.close("cancel"); });
  scrim.addEventListener("click", () => setDrawer(false, { restoreFocus: true }));
  mobileNav.addEventListener("change", () => setDrawer(false));
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncThemeButton);
  window.addEventListener("hashchange", () => render({ focusHeading: true }));

  $("#reset-progress").innerHTML = `${icon("reset", 16)}<span>Reiniciar</span>`;
  $("#reset-progress").setAttribute("aria-label", "Reiniciar avance");
  syncThemeButton();
  charts.initTooltip();
  setDrawer(false);
  render();
})();
