(() => {
  "use strict";

  const data = window.APP_DATA;
  const main = document.getElementById("main-content");
  if (!data || !Array.isArray(data.styles) || data.styles.length !== 5 || !Array.isArray(window.QUIZ_BANK) || !window.ArchitectureCharts) {
    main.innerHTML = '<div class="panel"><h1>No se pudo cargar el contenido</h1><p>Comprueba que todos los archivos JavaScript estén en la misma carpeta y vuelve a abrir la página.</p></div>';
    return;
  }

  const STORAGE_KEY = "atlas-arquitectura-v1";
  const palette = {
    layered: "#81a6ca",
    monolithic: "#d8ab73",
    microservices: "#ab95d0",
    microkernel: "#8dbbaa",
    "event-driven": "#da988b"
  };
  const sources = {
    layered: { label: "Microsoft Learn · N-tier architecture", url: "https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/n-tier" },
    monolithic: { label: "AWS · Monolithic applications and alternatives", url: "https://docs.aws.amazon.com/prescriptive-guidance/latest/micro-frontends-aws/micro-frontend-alternatives.html" },
    microservices: { label: "Microsoft Learn · Microservices architecture", url: "https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices" },
    microkernel: { label: "Eclipse · Runtime platform and plug-ins", url: "https://help.eclipse.org/latest/topic/org.eclipse.platform.doc.isv/guide/runtime_model.htm" },
    "event-driven": { label: "Microsoft Learn · Event-driven architecture", url: "https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven" }
  };

  const quizBank = window.QUIZ_BANK;
  const charts = window.ArchitectureCharts;
  const profileCriterionByStyle = Object.fromEntries(data.styles.map(style => [style.id, data.criteria[0].id]));
  let comparisonCriterion = "scalability";

  const styleById = Object.fromEntries(data.styles.map(style => [style.id, style]));
  const questionById = Object.fromEntries(quizBank.map(question => [question.id, question]));
  const $ = selector => document.querySelector(selector);
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const normalize = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let toastTimer;
  let revealObserver;

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
          exchanges: Array.isArray(entry.exchanges) ? entry.exchanges.filter(item => item && typeof item.question === "string" && typeof item.answer === "string").slice(0, 3) : []
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
  const allComplete = () => completeCount() === data.styles.length;
  const statusOf = id => isComplete(id) ? "complete" : (progressFor(id).reviewed || progressFor(id).exchanges.length ? "partial" : "pending");
  const statusLabel = id => ({ complete: "Completado", partial: "En curso", pending: "Pendiente" })[statusOf(id)];
  const nextStyle = () => data.styles.find(style => !isComplete(style.id)) || data.styles[0];

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3400);
  }

  function route() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (hash === "comparar") return { view: "compare" };
    if (hash === "evaluacion") return { view: "quiz" };
    if (hash.startsWith("estilo/")) {
      const id = hash.slice(7);
      if (styleById[id]) return { view: "style", id };
    }
    return { view: "home" };
  }

  function navigate(view, id) {
    const hash = view === "style" ? `estilo/${id}` : ({ home: "inicio", compare: "comparar", quiz: "evaluacion" })[view];
    if (location.hash === `#${hash}`) render({ focusHeading: true });
    else location.hash = hash;
  }

  function motionBehavior() {
    return reducedMotion.matches ? "auto" : "smooth";
  }

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
    }, { threshold: 0.08, rootMargin: "0px 0px -3% 0px" });
    document.documentElement.classList.add("motion-ready");
    const selectors = ".overview-stat, .style-card, .panel, .unlock-banner, .learning-step, .compare-table-wrap, .chart-comparison, .question-card, .review-question, .next-step";
    main.querySelectorAll(selectors).forEach((element, index) => {
      element.classList.add("reveal");
      element.style.setProperty("--reveal-delay", `${(index % 3) * 65}ms`);
      if (element.getBoundingClientRect().top < window.innerHeight * 0.92) element.classList.add("is-visible");
      else revealObserver.observe(element);
    });
  }

  function renderSidebar(active) {
    $("#style-nav").innerHTML = data.styles.map((style, index) => `
      <button type="button" class="style-nav-link ${active.view === "style" && active.id === style.id ? "active" : ""}" data-style="${style.id}" ${active.view === "style" && active.id === style.id ? 'aria-current="page"' : ""}>
        <span class="style-nav-number">0${index + 1}</span><span class="style-nav-name">${escapeHTML(style.name)}</span><span class="style-nav-status ${statusOf(style.id)}" aria-hidden="true"></span>
      </button>`).join("");
    document.querySelectorAll(".primary-nav .nav-link").forEach(link => {
      const selected = link.dataset.view === active.view;
      link.classList.toggle("active", selected);
      if (selected) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    $("#sidebar-progress-count").textContent = `${completeCount()} / 5`;
    $("#sidebar-progress-bar").style.width = `${completeCount() * 20}%`;
    $("#nav-quiz-lock").textContent = allComplete() ? "↗" : "⌁";
  }

  function svgDiagram(style, instance = "primary") {
    const id = style.id;
    const markerId = `arrow-${id}-${instance}`;
    const accent = palette[id];
    const outline = "#8fa2b7";
    const text = (x, y, label, size = 16, weight = 700, anchor = "middle") => `<text class="diagram-label" x="${x}" y="${y}" text-anchor="${anchor}" fill="#253b58" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}">${escapeHTML(label)}</text>`;
    const box = (x, y, width, height, fill = "#fff", stroke = outline, radius = 14) => `<rect class="diagram-box" x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
    const connector = (x1, y1, x2, y2, dashed = false) => `<path class="diagram-link ${dashed ? "is-dashed" : ""}" d="M ${x1} ${y1} L ${x2} ${y2}" stroke="#7288a1" stroke-width="3" stroke-linecap="round" ${dashed ? 'stroke-dasharray="6 7"' : ""} marker-end="url(#${markerId})"/>`;
    let shape = "";
    if (id === "layered") {
      [
        [30, "Interfaz"], [91, "Reglas de negocio"], [152, "Acceso a datos"], [213, "Base de datos"]
      ].forEach(([y, label], index) => {
        shape += box(135, y, 350, 44, index === 0 ? accent : "#ffffff", index === 0 ? accent : outline, 10) + text(310, y + 28, label, 16);
        if (index < 3) shape += connector(310, y + 45, 310, y + 58);
      });
    } else if (id === "monolithic") {
      shape += box(104, 26, 412, 248, "#fff", accent, 22);
      shape += box(178, 46, 264, 38, accent, accent, 9) + text(310, 71, "Una unidad de despliegue", 16);
      [[133, "Interfaz"], [256, "Negocio"], [379, "Datos"]].forEach(([x, label]) => {
        shape += box(x, 119, 107, 78, "#f6f8f9", outline, 10) + text(x + 53, 165, label, 14);
      });
      shape += connector(241, 159, 252, 159) + connector(364, 159, 375, 159);
      shape += text(310, 242, "Un proceso · una publicación principal", 14, 500);
    } else if (id === "microservices") {
      shape += box(218, 12, 184, 45, accent, accent, 12) + text(310, 41, "Cliente / API", 16);
      [[42, "Catálogo"], [221, "Matrículas"], [400, "Pagos"]].forEach(([x, label]) => {
        shape += connector(310, 58, x + 89, 100, true);
        shape += box(x, 105, 178, 76, "#fff", outline, 12) + text(x + 89, 149, label, 15);
        shape += connector(x + 89, 182, x + 89, 220);
        shape += `<ellipse class="diagram-box" cx="${x + 89}" cy="235" rx="59" ry="19" fill="${accent}" stroke="${accent}" stroke-width="2"/>`;
        shape += text(x + 89, 240, "Datos", 13);
      });
    } else if (id === "microkernel") {
      shape += box(224, 101, 172, 99, accent, accent, 18) + text(310, 143, "Núcleo", 20) + text(310, 168, "Contratos", 13, 500);
      [[46, 35, "Extensión A"], [404, 35, "Extensión B"], [46, 216, "Extensión C"], [404, 216, "Extensión D"]].forEach(([x, y, label]) => {
        shape += box(x, y, 170, 55, "#fff", outline, 12) + text(x + 85, y + 34, label, 14);
      });
      shape += connector(215, 87, 246, 111, true) + connector(405, 87, 374, 111, true) + connector(215, 216, 246, 192, true) + connector(405, 216, 374, 192, true);
    } else if (id === "event-driven") {
      shape += box(24, 99, 155, 90, "#fff", outline, 14) + text(101, 138, "Productor", 17) + text(101, 162, "Publica", 12, 500);
      shape += box(222, 99, 175, 90, accent, accent, 14) + text(309, 138, "Canal de", 17) + text(309, 161, "eventos", 17);
      shape += connector(181, 144, 218, 144);
      [[439, 29, "Consumidor A"], [439, 110, "Consumidor B"], [439, 191, "Consumidor C"]].forEach(([x, y, label]) => {
        shape += connector(398, 144, 433, y + 35, true);
        shape += box(x, y, 160, 69, "#fff", outline, 12) + text(x + 80, y + 41, label, 14);
      });
    }
    return `<svg class="architecture-diagram" viewBox="0 0 620 300" role="img" aria-label="Diagrama de ${escapeHTML(style.name)}: ${escapeHTML(style.diagram.caption)}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#7288a1"/></marker></defs>${shape}</svg>`;
  }

  function heroArt() {
    return `<svg class="hero-diagram" viewBox="0 0 360 300" role="img" aria-label="Cinco bloques conectados representan decisiones de arquitectura"><path class="hero-line" d="M180 57V102M180 159V205M62 132H117M243 132H301"/><rect class="hero-outer" x="115" y="99" width="130" height="68" rx="13"/><rect class="hero-inner" x="133" y="117" width="94" height="31" rx="7"/><text class="hero-center" x="180" y="137" text-anchor="middle" font-size="13" font-family="Segoe UI,Arial" font-weight="800">ARQUITECTURA</text><rect class="hero-outer" x="125" y="5" width="110" height="52" rx="11"/><text x="180" y="37" text-anchor="middle">DECISIÓN</text><rect class="hero-outer" x="125" y="208" width="110" height="52" rx="11"/><text x="180" y="240" text-anchor="middle">CONTEXTO</text><rect class="hero-outer" x="4" y="105" width="107" height="54" rx="11"/><text x="57" y="139" text-anchor="middle">CALIDAD</text><rect class="hero-outer" x="250" y="105" width="106" height="54" rx="11"/><text x="303" y="139" text-anchor="middle">EQUIPO</text><circle class="hero-inner-muted" cx="180" cy="283" r="7"/><circle class="hero-inner-muted" cx="59" cy="184" r="5"/><circle class="hero-inner-muted" cx="303" cy="184" r="5"/></svg>`;
  }

  function renderHome() {
    const done = completeCount();
    const next = nextStyle();
    main.innerHTML = `
      <section class="home-hero">
        <div class="hero-copy">
          <span class="eyebrow">APRENDE · COMPARA · DECIDE</span>
          <h1>La arquitectura se entiende <em>al elegir.</em></h1>
          <p>Conoce cinco estilos de software, descubre sus compromisos y practica cómo escoger el más adecuado para cada situación.</p>
          <button class="button-secondary" type="button" ${allComplete() ? 'data-view="quiz"' : `data-style="${next.id}"`}>${allComplete() ? "Ir a evaluación" : done ? "Continuar recorrido" : "Empezar recorrido"}<span class="button-arrow" aria-hidden="true">↗</span></button>
        </div>
        <div class="hero-art">${heroArt()}</div>
      </section>
      <div class="overview-strip" aria-label="Resumen del recorrido">
        <div class="overview-stat"><span class="overview-stat-icon" aria-hidden="true">◈</span><div><strong>05</strong><span>estilos por explorar</span></div></div>
        <div class="overview-stat"><span class="overview-stat-icon" aria-hidden="true">✦</span><div><strong>${String(done).padStart(2, "0")}/05</strong><span>fichas completadas</span></div></div>
        <div class="overview-stat"><span class="overview-stat-icon" aria-hidden="true">◇</span><div><strong>05</strong><span>retos al final</span></div></div>
      </div>
      <div class="section-heading"><div><span class="eyebrow">RUTA DE APRENDIZAJE</span><h2>Conoce a los estilos</h2></div><p>Abre una ficha, revisa su presentación y haz al menos una pregunta para completarla.</p></div>
      <section class="style-grid" aria-label="Cinco estilos arquitectónicos">
        ${data.styles.map((style, index) => `
          <article class="style-card" style="--accent:${palette[style.id]}">
            <div class="style-card-media">${svgDiagram(style, "card")}</div>
            <div class="style-card-body">
              <div class="style-card-top"><span class="style-number">ESTILO 0${index + 1}</span><span class="state-pill ${statusOf(style.id)}">${statusLabel(style.id)}</span></div>
              <h3>${escapeHTML(style.name)}</h3>
              <p>${escapeHTML(style.tagline)}</p>
              <button type="button" data-style="${style.id}" aria-label="Abrir ${escapeHTML(style.name)}">Explorar estilo <span aria-hidden="true">↗</span></button>
            </div>
          </article>`).join("")}
      </section>
      <div class="unlock-banner ${allComplete() ? "ready" : ""}">
        <div><h3>${allComplete() ? "¡Evaluación disponible!" : "Tu siguiente reto te espera"}</h3><p>${allComplete() ? "Ya conoces los cinco estilos. Pon a prueba tus decisiones." : `Completa las ${5 - done} fichas restantes para desbloquear la evaluación de cinco preguntas.`}</p></div>
        <button class="${allComplete() ? "button" : "button-ghost"}" type="button" data-view="quiz">${allComplete() ? "Ir a la evaluación" : "Ver progreso"}<span class="button-arrow" aria-hidden="true">↗</span></button>
      </div>`;
  }

  function list(items, className = "list-clean") {
    return `<ul class="${className}">${items.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`;
  }

  function renderStyle(id) {
    const style = styleById[id];
    const entry = progressFor(id);
    const source = sources[id];
    const index = data.styles.findIndex(item => item.id === id);
    const following = data.styles[(index + 1) % data.styles.length];
    const answered = entry.exchanges.length;
    main.innerHTML = `
      <div class="breadcrumb"><button type="button" data-view="home">Inicio</button><span aria-hidden="true">›</span><strong>${escapeHTML(style.name)}</strong></div>
      <nav class="mobile-style-switcher" aria-label="Cambiar estilo arquitectónico">${data.styles.map(item => `<button type="button" data-style="${item.id}" class="${item.id === id ? "active" : ""}" ${item.id === id ? 'aria-current="page"' : ""}>${escapeHTML(item.shortName)}</button>`).join("")}</nav>
      <section class="profile-hero" style="--accent:${palette[id]}">
        <div class="profile-copy"><span class="eyebrow">ESTILO 0${index + 1} · ${escapeHTML(style.eyebrow)}</span><h1>${escapeHTML(style.name)}</h1><p class="intro">“${escapeHTML(style.intro)}”</p><div class="profile-meta"><span class="meta-chip">Arquitectura de software</span><span class="meta-chip">${statusLabel(id)}</span><span class="meta-chip">Entrevista: ${answered}/3</span></div></div>
        <div class="profile-visual">${svgDiagram(style, "hero")}</div>
      </section>
      <div class="learning-path" aria-label="Pasos para completar este estilo">
        <div class="learning-step ${entry.reviewed ? "done" : ""}"><span class="learning-step-number">${entry.reviewed ? "✓" : "1"}</span><div><strong>Revisa la presentación</strong><small>${entry.reviewed ? "Presentación marcada como revisada" : "Lee la ficha y márcala al final"}</small></div></div>
        <div class="learning-step ${answered ? "done" : ""}"><span class="learning-step-number">${answered ? "✓" : "2"}</span><div><strong>Entrevista al estilo</strong><small>${answered ? `${answered} pregunta${answered === 1 ? "" : "s"} respondida${answered === 1 ? "" : "s"}` : "Haz al menos una pregunta"}</small></div></div>
      </div>
      <div class="content-layout" style="--accent:${palette[id]}">
        <div class="stack">
          <section class="panel" aria-labelledby="definition-title"><span class="panel-eyebrow">01 / EN POCAS PALABRAS</span><h2 id="definition-title">¿Quién soy y cómo funciono?</h2><div class="definition-callout"><p>${escapeHTML(style.definition)}</p></div><h3 style="margin-top:22px">Mi estructura</h3><p>${escapeHTML(style.structure)}</p></section>
          <section class="panel diagram-panel" aria-labelledby="diagram-title"><span class="panel-eyebrow">02 / MAPA VISUAL</span><h2 id="diagram-title">Así me organizo</h2>${svgDiagram(style, "detail")}<p class="diagram-caption">${escapeHTML(style.diagram.caption)}</p></section>
          <div class="pros-cons">
            <section class="panel" aria-labelledby="strengths-title"><span class="panel-eyebrow">03 / A FAVOR</span><h2 id="strengths-title">Mis fortalezas</h2>${list(style.strengths)}</section>
            <section class="panel" aria-labelledby="weaknesses-title"><span class="panel-eyebrow">04 / A CONSIDERAR</span><h2 id="weaknesses-title">Mis compromisos</h2>${list(style.weaknesses, "list-clean cons")}</section>
          </div>
          <section class="panel" aria-labelledby="cases-title"><span class="panel-eyebrow">05 / EN LA PRÁCTICA</span><h2 id="cases-title">¿Cuándo convengo?</h2>${list(style.recommended, "use-list")}<div class="scenario-box"><strong>Un caso cercano: ${escapeHTML(style.example.title)}</strong><p>${escapeHTML(style.example.scenario)} ${escapeHTML(style.example.why)}</p></div></section>
        </div>
        <div class="stack">
          <section class="panel" aria-labelledby="ratings-title"><span class="panel-eyebrow">RADAR INTERACTIVO</span><h2 id="ratings-title">Cómo rindo</h2><p class="ratings-hint">Explora mis seis atributos de calidad. Las valoraciones van de 1 a 5 y dependen del contexto. ${escapeHTML(style.ratingCaveat)}</p><div id="profile-chart">${charts.profile(style, data.criteria, profileCriterionByStyle[id])}</div></section>
          <section class="panel" aria-labelledby="remember-title"><span class="panel-eyebrow">IDEA PARA RECORDAR</span><h2 id="remember-title">La decisión depende del contexto</h2><p>${escapeHTML(style.tagline)} Mis estrellas son una guía: el diseño, el tamaño, el equipo y la operación pueden cambiar el resultado.</p><p><a href="${source.url}" target="_blank" rel="noopener noreferrer" class="inline-link">Ampliar en ${escapeHTML(source.label)} ↗</a></p></section>
        </div>
      </div>
      <section class="panel review-panel" style="--accent:${palette[id]}">
        <div><h2>${entry.reviewed ? "Presentación revisada" : "¿Terminaste de revisar la ficha?"}</h2><p>${entry.reviewed ? "Ahora haz una pregunta en la entrevista para completar este estilo." : "Marca este paso cuando hayas leído la estructura, los compromisos y las valoraciones."}</p></div>
        ${entry.reviewed ? `<button class="button-ghost" type="button" data-scroll="interview">Ir a la entrevista <span aria-hidden="true">↓</span></button>` : `<button class="button" type="button" data-review="${id}">Marcar como revisada <span aria-hidden="true">✓</span></button>`}
      </section>
      <section id="interview" class="panel interview-panel" aria-labelledby="interview-title">
        <div class="interview-head"><div><span class="panel-eyebrow">CONVERSACIÓN GUIADA</span><h2 id="interview-title">Entrevístame</h2><p>Pregúntame sobre mi estructura, ventajas, límites, casos de uso o atributos de calidad. Respondo con el contenido de esta ficha.</p></div><span class="question-counter">${answered} / 3 preguntas</span></div>
        ${answered < 3 ? `
          <div class="question-suggestions" aria-label="Preguntas sugeridas">
            <button class="suggestion" type="button" data-suggestion="¿En qué caso conviene usar ${escapeHTML(style.name)}?">¿Cuándo convienes?</button>
            <button class="suggestion" type="button" data-suggestion="¿Qué ventajas tienes para el mantenimiento?">¿Qué ventajas tienes?</button>
            <button class="suggestion" type="button" data-suggestion="¿Qué limitaciones debo considerar?">¿Qué limitaciones tienes?</button>
          </div>
          <form id="interview-form" class="interview-form"><label for="interview-question">Tu pregunta</label><div class="interview-controls"><textarea id="interview-question" name="question" maxlength="220" placeholder="Escribe aquí una pregunta sobre este estilo..." required></textarea><button type="submit" class="button">Preguntar <span aria-hidden="true">↗</span></button></div><p id="interview-message" class="form-message" role="status" aria-live="polite"></p></form>` : `<p class="interview-ended">Ya usaste tus tres preguntas para este estilo. Puedes volver a leer la ficha y revisar las respuestas cuando quieras.</p>`}
        <div class="conversation" aria-live="polite">${entry.exchanges.map(item => `<div class="exchange"><div class="bubble question">${escapeHTML(item.question)}</div><div class="bubble answer">${escapeHTML(item.answer)}</div></div>`).join("")}</div>
      </section>
      <div class="next-step"><div><strong>${isComplete(id) ? "Estilo completado" : "Sigue con tu recorrido"}</strong><p>${isComplete(id) ? "Ya revisaste esta ficha y conversaste con el estilo." : "Completa los dos pasos para acercarte a la evaluación final."}</p></div><button class="button-ghost" type="button" data-style="${following.id}">Siguiente: ${escapeHTML(following.shortName)} <span class="button-arrow" aria-hidden="true">↗</span></button></div>`;
  }

  function renderCompare() {
    main.innerHTML = `
      <div class="page-intro"><span class="eyebrow">UNA MIRADA EN CONJUNTO</span><h1>Comparar para decidir mejor.</h1><p>Cada estilo resuelve problemas distintos y varios pueden combinarse. Usa esta tabla como punto de partida y visita las fichas para revisar los compromisos.</p></div>
      <div id="comparison-chart">${charts.comparison(data.styles, data.criteria, comparisonCriterion)}</div>
      <div class="section-heading"><div><span class="eyebrow">MÁS ALLÁ DE LAS ESTRELLAS</span><h2>Qué cambia en la práctica</h2></div><p>La tabla resume estructura, ventajas, compromisos y contextos recomendados.</p></div>
      <div class="compare-table-wrap"><table class="compare-table"><caption class="sr-only">Comparación de cinco estilos arquitectónicos</caption><thead><tr><th>Estilo</th><th>Cómo se organiza</th><th>Fortaleza destacada</th><th>Compromiso principal</th><th>Situación apropiada</th></tr></thead><tbody>
        ${data.styles.map(style => `<tr><td class="style-name-cell">${escapeHTML(style.name)}<br><button type="button" data-style="${style.id}">Ver ficha ↗</button></td><td>${escapeHTML(style.structure)}</td><td>${escapeHTML(style.strengths[0])}</td><td>${escapeHTML(style.weaknesses[0])}</td><td>${escapeHTML(style.recommended[0])}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="compare-note">Una aplicación puede, por ejemplo, ser monolítica en su despliegue y estar organizada por capas. Las puntuaciones dependen de la implementación y del contexto.</p>
      <div class="unlock-banner"><div><h3>¿Qué elegirías para tu proyecto?</h3><p>Revisa el escenario de cada ficha y explica qué atributo priorizas.</p></div><button class="button" type="button" data-style="${nextStyle().id}">Continuar recorrido <span class="button-arrow" aria-hidden="true">↗</span></button></div>`;
  }

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

  function renderQuiz() {
    if (!allComplete()) {
      main.innerHTML = `<div class="locked-panel"><span class="locked-icon" aria-hidden="true">◇</span><span class="eyebrow">EVALUACIÓN FINAL</span><h1>Aún falta explorar</h1><p>La evaluación se desbloquea cuando revisas la presentación y haces al menos una pregunta a cada uno de los cinco estilos.</p><div class="unlock-checklist">${data.styles.map(style => `<button type="button" data-style="${style.id}"><span class="${isComplete(style.id) ? "done" : ""}" aria-hidden="true">${isComplete(style.id) ? "✓" : "○"}</span>${escapeHTML(style.name)} · ${statusLabel(style.id)}</button>`).join("")}</div><button class="button" type="button" data-style="${nextStyle().id}">Ir al siguiente estilo <span class="button-arrow" aria-hidden="true">↗</span></button></div>`;
      return;
    }
    ensureQuiz();
    if (state.quiz.submitted) { renderResults(); return; }
    const questions = state.quiz.questionIds.map(id => questionById[id]);
    const answerCount = Object.keys(state.quiz.answers).filter(id => state.quiz.questionIds.includes(id)).length;
    main.innerHTML = `<div class="page-intro"><span class="eyebrow">EVALUACIÓN FINAL DESBLOQUEADA</span><h1>Pon a prueba tus decisiones.</h1><p>Responde cinco situaciones: tres de dificultad media y dos de dificultad alta. Cada pregunta tiene una sola respuesta correcta. Al terminar verás tu nota sobre 5.0 y las explicaciones.</p></div><div class="quiz-topline"><span class="quiz-count" id="quiz-answer-count">${answerCount} de 5 respondidas</span><span class="state-pill complete">Tu recorrido está completo</span></div><form id="quiz-form" class="quiz-grid">
      ${questions.map((question, index) => `<fieldset class="question-card" style="margin:0"><legend class="sr-only">Pregunta ${index + 1}</legend><div class="question-top"><span class="question-index">PREGUNTA 0${index + 1}</span><span class="difficulty ${question.level === "alta" ? "high" : ""}">Dificultad ${question.level}</span></div><h2>${escapeHTML(question.prompt)}</h2><div class="options">${question.options.map((option, optionIndex) => `<label class="option"><input type="radio" name="${question.id}" value="${optionIndex}" ${Number(state.quiz.answers[question.id]) === optionIndex && Object.prototype.hasOwnProperty.call(state.quiz.answers, question.id) ? "checked" : ""}><span class="option-letter">${"ABCDE"[optionIndex]}</span><span>${escapeHTML(option)}</span></label>`).join("")}</div></fieldset>`).join("")}
      <div class="quiz-actions"><p id="quiz-error" role="status" aria-live="polite"></p><button class="button" type="submit">Calificar evaluación <span class="button-arrow" aria-hidden="true">↗</span></button></div></form>`;
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
    main.innerHTML = `<div class="breadcrumb"><button type="button" data-view="home">Inicio</button><span aria-hidden="true">›</span><strong>Resultado</strong></div><section class="results-hero"><div><span class="eyebrow">EVALUACIÓN COMPLETADA</span><h1>${score === 5 ? "¡Excelente criterio!" : score >= 3 ? "Buen trabajo." : "Sigue practicando."}</h1><p>${feedback(score)}</p></div><div class="results-score" role="img" aria-label="Calificación ${score.toFixed(1)} sobre 5.0"><strong>${score.toFixed(1)}</strong><span>sobre 5.0</span></div></section><div class="results-actions"><button class="button" type="button" data-retake="true">Intentar de nuevo <span class="button-arrow" aria-hidden="true">↗</span></button><button class="button-ghost" type="button" data-view="compare">Repasar comparación</button></div><div class="section-heading"><div><span class="eyebrow">RETROALIMENTACIÓN</span><h2>Revisa tus respuestas</h2></div><p>${score} de 5 respuestas correctas. La explicación conecta cada reto con lo aprendido en las fichas.</p></div><section class="answer-review" aria-label="Corrección de respuestas">${state.quiz.questionIds.map((id, index) => {
      const question = questionById[id];
      const selected = Number(state.quiz.answers[id]);
      const correct = selected === question.answer;
      return `<article class="review-question ${correct ? "correct" : ""}"><span class="state-pill ${correct ? "complete" : "partial"}">${correct ? "Correcta" : "Incorrecta"} · pregunta ${index + 1}</span><h3>${escapeHTML(question.prompt)}</h3><p><strong>Tu respuesta:</strong> ${escapeHTML(question.options[selected])}</p>${correct ? "" : `<p><strong>Respuesta correcta:</strong> ${escapeHTML(question.options[question.answer])}</p>`}<p class="explanation">${escapeHTML(question.explanation)}</p></article>`;
    }).join("")}</section>`;
  }

  function render({ focusHeading = false } = {}) {
    const current = route();
    renderSidebar(current);
    if (current.view === "home") renderHome();
    else if (current.view === "style") renderStyle(current.id);
    else if (current.view === "compare") renderCompare();
    else renderQuiz();
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = `${current.view === "style" ? styleById[current.id].name : current.view === "compare" ? "Comparar estilos" : current.view === "quiz" ? "Evaluación final" : "Inicio"} | Atlas de arquitectura`;
    setupMotion();
    if (focusHeading) {
      const heading = main.querySelector("h1");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
  }

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

  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.profileCriterion) {
      const current = route();
      const criterion = button.dataset.profileCriterion;
      if (current.view !== "style" || !data.criteria.some(item => item.id === criterion)) return;
      profileCriterionByStyle[current.id] = criterion;
      $("#profile-chart").innerHTML = charts.profile(styleById[current.id], data.criteria, criterion);
      $("#profile-chart").querySelector(`[data-profile-criterion="${criterion}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (button.dataset.compareCriterion) {
      const criterion = button.dataset.compareCriterion;
      if (route().view !== "compare" || !data.criteria.some(item => item.id === criterion)) return;
      comparisonCriterion = criterion;
      $("#comparison-chart").innerHTML = charts.comparison(data.styles, data.criteria, criterion);
      $("#comparison-chart").querySelector(`[data-compare-criterion="${criterion}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (button.dataset.style) { navigate("style", button.dataset.style); return; }
    if (button.dataset.view) { navigate(button.dataset.view); return; }
    if (button.dataset.scroll) { document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: motionBehavior(), block: "start" }); return; }
    if (button.dataset.review) {
      const id = button.dataset.review;
      state.progress[id].reviewed = true;
      persist(); renderSidebar(route()); renderStyle(id);
      toast(isComplete(id) ? "¡Estilo completado!" : "Presentación marcada como revisada. Ahora haz una pregunta.");
      document.getElementById("interview")?.scrollIntoView({ behavior: motionBehavior(), block: "start" });
      return;
    }
    if (button.dataset.suggestion) {
      const textarea = $("#interview-question");
      if (textarea) { textarea.value = button.dataset.suggestion; textarea.focus(); }
      return;
    }
    if (button.dataset.retake) {
      state.quiz = null;
      ensureQuiz(); render({ focusHeading: true });
      toast("Nuevo intento preparado.");
      return;
    }
    if (button.id === "reset-progress") {
      if (confirm("¿Reiniciar todo el avance, las entrevistas y la evaluación?")) {
        state = initialState(); persist(); navigate("home"); toast("Avance reiniciado.");
      }
    }
  });

  document.addEventListener("submit", event => {
    if (event.target.id === "interview-form") {
      event.preventDefault();
      const current = route();
      if (current.view !== "style") return;
      const entry = progressFor(current.id);
      if (entry.exchanges.length >= 3) return;
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
      persist(); renderSidebar(current); renderStyle(current.id);
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

  document.addEventListener("change", event => {
    if (!event.target.matches("#quiz-form input[type=radio]")) return;
    state.quiz.answers[event.target.name] = Number(event.target.value);
    persist();
    const count = Object.keys(state.quiz.answers).filter(id => state.quiz.questionIds.includes(id)).length;
    $("#quiz-answer-count").textContent = `${count} de 5 respondidas`;
    $("#quiz-error").textContent = "";
  });

  window.addEventListener("hashchange", () => render({ focusHeading: true }));
  render();
})();
