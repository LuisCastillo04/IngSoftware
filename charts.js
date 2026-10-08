(() => {
  "use strict";

  // Visualizaciones del Atlas. Usan exclusivamente las valoraciones didácticas de
  // content.js y devuelven HTML; app.js conserva el estado y los eventos.
  //
  // Reglas de color (definidas como variables CSS en styles.css):
  //  · Gráficas de UN estilo (perfil, radar): color de identidad del estilo (--s-<id>).
  //  · Gráficas ENTRE estilos (ranking, mapa): color por nivel de valoración
  //    (verde = alto, neutro = medio, rojo = bajo). Nunca se usa solo el color:
  //    cada nivel añade icono y etiqueta, y cada marca muestra su número.
  const { icon } = window.Icons;

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  const seriesVar = style => `var(--s-${escapeHTML(style?.id)}, var(--s-layered))`;
  const ratingFor = (style, criterionId) => {
    const rating = style?.ratings?.[criterionId];
    const value = Number(rating?.score);
    return {
      score: rating && Number.isFinite(value) && value >= 1 && value <= 5 ? value : null,
      reason: rating?.reason || "No hay explicación disponible para esta valoración."
    };
  };
  const scoreText = score => score === null ? "Sin valoración" : `${score} de 5`;
  const visibleScore = score => score === null ? "—" : score;
  const validCriteria = criteria => Array.isArray(criteria)
    ? criteria.filter(criterion => criterion && typeof criterion.id === "string")
    : [];
  const selectedCriterion = (criteria, id) => criteria.find(criterion => criterion.id === id) || criteria[0];

  const TIERS = {
    high: { key: "high", label: "Alto", range: "4–5", icon: "check" },
    mid: { key: "mid", label: "Medio", range: "3", icon: "minus" },
    low: { key: "low", label: "Bajo", range: "1–2", icon: "arrow-down" },
    none: { key: "none", label: "Sin valoración", range: "", icon: "info" }
  };
  const tierOf = score => score === null ? TIERS.none : score >= 4 ? TIERS.high : score === 3 ? TIERS.mid : TIERS.low;
  const tierChip = tier => `<span class="tier-chip tier-${tier.key}">${icon(tier.icon, 14)}${tier.label}</span>`;

  const average = (style, criteria) => {
    const scores = validCriteria(criteria).map(criterion => ratingFor(style, criterion.id).score).filter(score => score !== null);
    return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
  };
  const extremes = (style, criteria) => {
    const rated = validCriteria(criteria).map(criterion => ({ criterion, ...ratingFor(style, criterion.id) })).filter(item => item.score !== null);
    if (!rated.length) return { best: null, worst: null };
    return {
      best: rated.reduce((top, item) => item.score > top.score ? item : top),
      worst: rated.reduce((low, item) => item.score < low.score ? item : low)
    };
  };

  /* ---------- Piezas pequeñas reutilizables ---------- */

  // Minigráfica de columnas (una por atributo) para tarjetas y KPI.
  function spark(style, criteria) {
    const axes = validCriteria(criteria);
    return `<span class="spark" style="--series:${seriesVar(style)}" aria-hidden="true">${axes.map(criterion => {
      const { score } = ratingFor(style, criterion.id);
      return `<i style="--h:${score === null ? 0 : score * 20}%"></i>`;
    }).join("")}</span>`;
  }

  // Anillo de progreso. pathLength=100 permite expresar el avance como porcentaje.
  function ring(value, max, { size = 64, label = "", sub = "" } = {}) {
    const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return `<span class="ring" style="--ring-size:${size}px" aria-hidden="true">
      <svg viewBox="0 0 36 36"><circle class="ring-track" cx="18" cy="18" r="15.5" pathLength="100"/><circle class="ring-value" cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray="${percent.toFixed(1)} 100" transform="rotate(-90 18 18)"/></svg>
      <span class="ring-label"><strong>${escapeHTML(label)}</strong>${sub ? `<small>${escapeHTML(sub)}</small>` : ""}</span>
    </span>`;
  }

  /* ---------- Perfil de un estilo (barras o radar) ---------- */

  function radarSvg(mode, axes, series, selected) {
    const compact = mode === "compact";
    const W = compact ? 360 : 540;
    const H = compact ? 340 : 372;
    const cx = W / 2;
    const cy = H / 2;
    const R = compact ? 118 : 118;
    const labelR = R + (compact ? 26 : 20);
    const angleFor = index => -Math.PI / 2 + (index * 2 * Math.PI / axes.length);
    const point = (index, factor, radius = R) => {
      const angle = angleFor(index);
      return [cx + Math.cos(angle) * radius * factor, cy + Math.sin(angle) * radius * factor];
    };
    const fmt = value => value.toFixed(1);
    const polygon = factor => axes.map((_, index) => point(index, factor).map(fmt).join(",")).join(" ");

    const rings = [1, 2, 3, 4, 5].map(level => `<polygon class="radar-ring" points="${polygon(level / 5)}"/>`).join("");
    const ticks = compact ? "" : [1, 2, 3, 4, 5].map(level => `<text class="radar-tick" x="${fmt(cx + 5)}" y="${fmt(cy - (R * level) / 5 - 3)}">${level}</text>`).join("");
    const spokes = axes.map((criterion, index) => {
      const [x, y] = point(index, 1);
      return `<line class="radar-axis ${criterion.id === selected.id ? "is-active" : ""}" x1="${cx}" y1="${cy}" x2="${fmt(x)}" y2="${fmt(y)}"/>`;
    }).join("");
    const labels = axes.map((criterion, index) => {
      const [x, y] = point(index, 1, labelR);
      const active = criterion.id === selected.id;
      if (compact) {
        return `<g class="radar-badge ${active ? "is-active" : ""}"><circle cx="${fmt(x)}" cy="${fmt(y)}" r="14"/><text x="${fmt(x)}" y="${fmt(y)}">${index + 1}</text></g>`;
      }
      const cos = Math.cos(angleFor(index));
      const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
      const dx = anchor === "start" ? 4 : anchor === "end" ? -4 : 0;
      return `<text class="radar-label ${active ? "is-active" : ""}" x="${fmt(x + dx)}" y="${fmt(y)}" text-anchor="${anchor}" dominant-baseline="central">${escapeHTML(criterion.label)}</text>`;
    }).join("");

    const shapes = series.map((item, seriesIndex) => {
      const points = axes.map((criterion, index) => point(index, (item.values[index].score ?? 0) / 5).map(fmt).join(",")).join(" ");
      return `<polygon class="radar-shape ${seriesIndex ? "is-compare" : ""}" style="--series:${seriesVar(item.style)}" points="${points}"/>`;
    }).join("");

    const dots = series.map((item, seriesIndex) => axes.map((criterion, index) => {
      const rating = item.values[index];
      const [x, y] = point(index, (rating.score ?? 0) / 5);
      const active = criterion.id === selected.id;
      const tip = `data-tip="${escapeHTML(criterion.label)} · ${escapeHTML(item.style.shortName)}" data-tip-value="${escapeHTML(scoreText(rating.score))} · ${escapeHTML(tierOf(rating.score).label)}" data-tip-body="${escapeHTML(rating.reason)}"`;
      return `<g class="radar-point ${seriesIndex ? "is-compare" : ""} ${active ? "is-active" : ""}" style="--series:${seriesVar(item.style)}" data-profile-criterion="${escapeHTML(criterion.id)}" ${tip}>
        <circle class="radar-hit" cx="${fmt(x)}" cy="${fmt(y)}" r="16"/>
        ${seriesIndex
          ? `<rect class="radar-mark" x="${fmt(x - (active ? 6 : 4.5))}" y="${fmt(y - (active ? 6 : 4.5))}" width="${active ? 12 : 9}" height="${active ? 12 : 9}" rx="2"/>`
          : `<circle class="radar-mark" cx="${fmt(x)}" cy="${fmt(y)}" r="${active ? 7 : 5}"/>`}
      </g>`;
    }).join("")).join("");

    return `<svg class="radar radar-${mode}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${rings}${spokes}${ticks}${shapes}${labels}${dots}</svg>`;
  }

  function profile(style, criteria, options = {}) {
    const axes = validCriteria(criteria);
    if (!style || !axes.length) return '<p class="chart-empty">No hay valoraciones para mostrar.</p>';

    const selected = selectedCriterion(axes, options.criterion);
    const view = options.view === "radar" ? "radar" : "bars";
    const others = (Array.isArray(options.styles) ? options.styles : []).filter(item => item.id !== style.id);
    const compare = others.find(item => item.id === options.compareId) || null;
    const series = [style, compare].filter(Boolean).map(item => ({
      style: item,
      values: axes.map(criterion => ratingFor(item, criterion.id))
    }));
    const selectedRatings = series.map(item => ratingFor(item.style, selected.id));
    const summary = series.map(item => `${item.style.name}. ${axes.map((criterion, index) => `${criterion.label}: ${scoreText(item.values[index].score)}`).join("; ")}.`).join(" ");

    const toolbar = `
      <div class="chart-toolbar">
        <div class="segmented" role="group" aria-label="Tipo de gráfica">
          <button type="button" data-profile-view="bars" aria-pressed="${view === "bars"}">${icon("bars", 16)}Barras</button>
          <button type="button" data-profile-view="radar" aria-pressed="${view === "radar"}">${icon("radar", 16)}Radar</button>
        </div>
        <label class="select-field"><span>Comparar con</span>
          <select data-profile-compare>
            <option value="">Ningún estilo</option>
            ${others.map(item => `<option value="${escapeHTML(item.id)}" ${compare && compare.id === item.id ? "selected" : ""}>${escapeHTML(item.shortName)}</option>`).join("")}
          </select>
        </label>
      </div>`;

    const legend = compare ? `
      <ul class="chart-legend" aria-label="Leyenda">
        <li><span class="key key-line" style="--series:${seriesVar(style)}"></span>${escapeHTML(style.shortName)}</li>
        <li><span class="key key-dash" style="--series:${seriesVar(compare)}"></span>${escapeHTML(compare.shortName)} <small>(línea discontinua)</small></li>
      </ul>` : "";

    let body;
    if (view === "radar") {
      body = `
        <figure class="radar-figure" role="img" aria-label="${escapeHTML(summary)}">
          ${radarSvg("wide", axes, series, selected)}
          ${radarSvg("compact", axes, series, selected)}
        </figure>
        <div class="criterion-list" role="group" aria-label="Explorar atributos de ${escapeHTML(style.name)}">
          ${axes.map((criterion, index) => {
            const label = series.map(item => `${item.style.shortName}: ${scoreText(item.values[index].score)}`).join("; ");
            const active = criterion.id === selected.id;
            return `<button class="criterion-button" type="button" data-profile-criterion="${escapeHTML(criterion.id)}" aria-pressed="${active}" aria-label="Explorar ${escapeHTML(criterion.label)}. ${escapeHTML(label)}">
              <span class="criterion-number" aria-hidden="true">${index + 1}</span>
              <span class="criterion-name">${escapeHTML(criterion.label)}</span>
              <span class="criterion-score" aria-hidden="true">${series.map((item, seriesIndex) => `<b ${seriesIndex ? 'class="is-compare"' : ""}>${visibleScore(item.values[index].score)}</b>`).join("")}<small>/5</small></span>
            </button>`;
          }).join("")}
        </div>`;
    } else {
      body = `
        <ul class="pbars" aria-label="Valoración de ${escapeHTML(style.name)} por atributo">
          ${axes.map(criterion => {
            const active = criterion.id === selected.id;
            const label = series.map(item => `${item.style.shortName}: ${scoreText(ratingFor(item.style, criterion.id).score)}`).join("; ");
            return `<li><button class="pbar ${active ? "is-active" : ""}" type="button" data-profile-criterion="${escapeHTML(criterion.id)}" aria-pressed="${active}" aria-label="Explorar ${escapeHTML(criterion.label)}. ${escapeHTML(label)}">
              <span class="pbar-name">${escapeHTML(criterion.label)}</span>
              <span class="pbar-track">${series.map((item, seriesIndex) => {
                const rating = ratingFor(item.style, criterion.id);
                const tip = `data-tip="${escapeHTML(criterion.label)} · ${escapeHTML(item.style.shortName)}" data-tip-value="${escapeHTML(scoreText(rating.score))} · ${escapeHTML(tierOf(rating.score).label)}" data-tip-body="${escapeHTML(rating.reason)}"`;
                return `<span class="pbar-fill ${seriesIndex ? "is-compare" : ""}" style="--pct:${rating.score === null ? 0 : rating.score * 20}%;--series:${seriesVar(item.style)}" ${tip}></span>`;
              }).join("")}</span>
              <span class="pbar-values" aria-hidden="true">${series.map((item, seriesIndex) => `<span class="pbar-value ${seriesIndex ? "is-compare" : ""}" style="--series:${seriesVar(item.style)}">${series.length > 1 ? '<i class="key-dot"></i>' : ""}<b>${visibleScore(ratingFor(item.style, criterion.id).score)}</b></span>`).join("")}<small>/5</small></span>
            </button></li>`;
          }).join("")}
        </ul>
        <div class="scale-note" aria-hidden="true"><span>Escala 1 – 5</span><span>más alto = mejor valorado</span></div>`;
    }

    const insight = `
      <div class="chart-insight" aria-live="polite">
        <span class="chart-insight-kicker">Atributo seleccionado</span>
        <h3>${escapeHTML(selected.label)}</h3>
        <p class="chart-insight-description">${escapeHTML(selected.description)}</p>
        ${series.map((item, index) => {
          const rating = selectedRatings[index];
          return `<div class="insight-row" style="--series:${seriesVar(item.style)}">
            <div class="insight-score"><span class="key-dot ${index ? "is-compare" : ""}"></span><strong>${escapeHTML(item.style.shortName)}</strong><span class="insight-value">${visibleScore(rating.score)}/5</span>${tierChip(tierOf(rating.score))}</div>
            <p>${escapeHTML(rating.reason)}</p>
          </div>`;
        }).join("")}
      </div>`;

    return `<div class="profile-chart" data-chart-selected-criterion="${escapeHTML(selected.id)}" style="--series:${seriesVar(style)}">${toolbar}${legend}<div class="profile-body view-${view}">${body}</div>${insight}</div>`;
  }

  /* ---------- Ranking de los cinco estilos por atributo ---------- */

  function comparison(styles, criteria, selectedCriterionId, options = {}) {
    const axes = validCriteria(criteria);
    if (!Array.isArray(styles) || !styles.length || !axes.length) {
      return '<p class="chart-empty">No hay estilos para comparar.</p>';
    }

    const selected = selectedCriterion(axes, selectedCriterionId);
    const ranked = styles.map((style, index) => ({ style, index, rating: ratingFor(style, selected.id) }))
      .sort((first, second) => (second.rating.score ?? -1) - (first.rating.score ?? -1) || first.index - second.index);
    const scored = ranked.filter(item => item.rating.score !== null);
    const mean = scored.length ? scored.reduce((sum, item) => sum + item.rating.score, 0) / scored.length : null;
    const showReasons = options.showReasons === true;

    return `
      <section class="chart-card comparison ${showReasons ? "show-reasons" : ""}" data-chart-selected-criterion="${escapeHTML(selected.id)}" aria-label="Comparar estilos por atributo de calidad">
        <header class="chart-head">
          <div><h2>Ranking por atributo</h2><p>Elige un atributo y compara cómo se valoran los cinco estilos.</p></div>
          <button type="button" class="switch" data-toggle-reasons aria-pressed="${showReasons}"><span class="switch-box" aria-hidden="true"></span>Mostrar explicaciones</button>
        </header>
        <div class="chip-row" role="group" aria-label="Seleccionar atributo de calidad">
          ${axes.map(criterion => `<button class="chip" type="button" data-compare-criterion="${escapeHTML(criterion.id)}" aria-pressed="${criterion.id === selected.id}">${escapeHTML(criterion.label)}</button>`).join("")}
        </div>
        <p class="chart-context" aria-live="polite"><strong>${escapeHTML(selected.label)}</strong><span>${escapeHTML(selected.description)}</span></p>
        <div class="rank" style="--avg:${mean === null ? 0 : mean * 20}%">
          <div class="rank-axis" aria-hidden="true"><span></span><div class="rank-ticks">${[1, 2, 3, 4, 5].map(tick => `<span style="--x:${tick * 20}%">${tick}</span>`).join("")}</div><span></span></div>
          <ol class="rank-list" aria-label="Valoraciones de ${escapeHTML(selected.label)} ordenadas de mayor a menor">
            ${ranked.map(({ style, rating }) => {
              const tier = tierOf(rating.score);
              return `<li class="rank-row tier-${tier.key}" style="--pct:${rating.score === null ? 0 : rating.score * 20}%">
                <div class="rank-name"><span class="key-dot" style="--series:${seriesVar(style)}" aria-hidden="true"></span><button type="button" class="link-button" data-style="${escapeHTML(style.id)}" aria-label="Abrir ficha de ${escapeHTML(style.name)}">${escapeHTML(style.shortName)}</button></div>
                <div class="rank-track" role="img" aria-label="${escapeHTML(style.name)}: ${escapeHTML(scoreText(rating.score))}, nivel ${escapeHTML(tier.label.toLowerCase())}" tabindex="0" data-tip="${escapeHTML(style.name)}" data-tip-value="${escapeHTML(selected.label)}: ${escapeHTML(scoreText(rating.score))} · ${escapeHTML(tier.label)}" data-tip-body="${escapeHTML(rating.reason)}"><span class="rank-fill"></span></div>
                <div class="rank-value"><strong>${visibleScore(rating.score)}<small>/5</small></strong>${tierChip(tier)}</div>
                <p class="rank-reason">${escapeHTML(rating.reason)}</p>
              </li>`;
            }).join("")}
          </ol>
        </div>
        <footer class="chart-foot">
          <ul class="chart-legend" aria-label="Niveles de valoración">
            ${[TIERS.high, TIERS.mid, TIERS.low].map(tier => `<li><span class="key key-box tier-${tier.key}"></span>${tier.label} <small>(${tier.range})</small></li>`).join("")}
            ${mean === null ? "" : `<li><span class="key key-avg"></span>Promedio de los estilos <small>(${mean.toFixed(1)})</small></li>`}
          </ul>
          <p>Las puntuaciones orientan la conversación: el resultado real depende de la implementación y del contexto.</p>
        </footer>
      </section>`;
  }

  /* ---------- Mapa de calor 5 × 6 ---------- */

  function heatmap(styles, criteria, selectedCriterionId) {
    const axes = validCriteria(criteria);
    if (!Array.isArray(styles) || !styles.length || !axes.length) return "";
    const selected = selectedCriterion(axes, selectedCriterionId);

    return `
      <section class="chart-card heatmap" aria-labelledby="heatmap-title">
        <header class="chart-head">
          <div><h2 id="heatmap-title">Mapa completo de atributos</h2><p>Cada celda es una valoración de 1 a 5. Pulsa una celda o un encabezado para destacar ese atributo en el ranking.</p></div>
          <ul class="chart-legend" aria-label="Niveles de valoración">${[TIERS.high, TIERS.mid, TIERS.low].map(tier => `<li><span class="key key-box tier-${tier.key}"></span>${tier.label}</li>`).join("")}</ul>
        </header>
        <table class="heat-table">
          <caption class="sr-only">Valoración de cada estilo en cada atributo de calidad, de 1 a 5, con el promedio de cada estilo.</caption>
          <thead><tr>
            <th scope="col" class="heat-corner">Estilo</th>
            ${axes.map(criterion => `<th scope="col" class="${criterion.id === selected.id ? "is-selected" : ""}"><button type="button" data-compare-criterion="${escapeHTML(criterion.id)}" aria-pressed="${criterion.id === selected.id}"><span>${escapeHTML(criterion.label)}</span></button></th>`).join("")}
            <th scope="col" class="heat-avg-head">Promedio</th>
          </tr></thead>
          <tbody>
            ${styles.map(style => {
              const avg = average(style, axes);
              return `<tr>
                <th scope="row" class="heat-style"><span class="key-dot" style="--series:${seriesVar(style)}" aria-hidden="true"></span><button type="button" class="link-button" data-style="${escapeHTML(style.id)}" aria-label="Abrir ficha de ${escapeHTML(style.name)}">${escapeHTML(style.shortName)}</button></th>
                ${axes.map(criterion => {
                  const rating = ratingFor(style, criterion.id);
                  const tier = tierOf(rating.score);
                  return `<td class="heat-cell lv-${rating.score ?? 0} ${criterion.id === selected.id ? "is-selected" : ""}" data-label="${escapeHTML(criterion.label)}"><button type="button" data-compare-criterion="${escapeHTML(criterion.id)}" aria-label="${escapeHTML(style.shortName)}, ${escapeHTML(criterion.label)}: ${escapeHTML(scoreText(rating.score))}, nivel ${escapeHTML(tier.label.toLowerCase())}" data-tip="${escapeHTML(style.shortName)} · ${escapeHTML(criterion.label)}" data-tip-value="${escapeHTML(scoreText(rating.score))} · ${escapeHTML(tier.label)}" data-tip-body="${escapeHTML(rating.reason)}"><b>${visibleScore(rating.score)}</b>${icon(tier.icon, 14)}</button></td>`;
                }).join("")}
                <td class="heat-avg" data-label="Promedio"><strong>${avg === null ? "—" : avg.toFixed(1)}</strong></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </section>`;
  }

  // Datos para las tarjetas KPI de la vista Comparar (no alteran las valoraciones).
  function summary(styles, criteria) {
    const axes = validCriteria(criteria);
    if (!Array.isArray(styles) || !styles.length || !axes.length) return null;
    const byStyle = styles.map(style => ({ style, avg: average(style, axes) })).filter(item => item.avg !== null);
    const byCriterion = axes.map(criterion => {
      const scores = styles.map(style => ratingFor(style, criterion.id).score).filter(score => score !== null);
      return {
        criterion,
        avg: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
        min: scores.length ? Math.min(...scores) : null,
        max: scores.length ? Math.max(...scores) : null
      };
    }).filter(item => item.avg !== null);
    if (!byStyle.length || !byCriterion.length) return null;
    const pick = (items, better) => items.reduce((top, item) => better(item, top) ? item : top);
    return {
      topStyle: pick(byStyle, (item, top) => item.avg > top.avg),
      bestCriterion: pick(byCriterion, (item, top) => item.avg > top.avg),
      hardestCriterion: pick(byCriterion, (item, top) => item.avg < top.avg),
      widestCriterion: pick(byCriterion, (item, top) => (item.max - item.min) > (top.max - top.min))
    };
  }

  /* ---------- Tooltip compartido (hover, foco y toque) ---------- */

  function initTooltip() {
    const tip = document.createElement("div");
    tip.className = "chart-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.hidden = true;
    document.body.appendChild(tip);
    let current = null;

    const hide = () => { tip.hidden = true; current = null; };
    const fill = el => {
      tip.replaceChildren();
      const parts = [["tip-value", el.dataset.tipValue], ["tip-title", el.dataset.tip], ["tip-body", el.dataset.tipBody]];
      for (const [className, text] of parts) {
        if (!text) continue;
        const node = document.createElement("span");
        node.className = className;
        node.textContent = text; // textContent: el contenido nunca se interpreta como HTML.
        tip.appendChild(node);
      }
    };
    const place = (x, y) => {
      const margin = 10;
      const { width, height } = tip.getBoundingClientRect();
      let left = x + 14;
      let top = y + 18;
      if (left + width > window.innerWidth - margin) left = x - width - 14;
      if (top + height > window.innerHeight - margin) top = y - height - 14;
      tip.style.left = `${Math.max(margin, left)}px`;
      tip.style.top = `${Math.max(margin, top)}px`;
    };
    const show = (el, x, y) => {
      if (current !== el) { fill(el); current = el; }
      tip.hidden = false;
      place(x, y);
    };
    const track = event => {
      const el = event.target.closest?.("[data-tip]");
      if (!el) { if (current) hide(); return; }
      show(el, event.clientX, event.clientY);
    };

    document.addEventListener("pointerover", track);
    document.addEventListener("pointermove", track);
    document.addEventListener("pointerdown", event => { if (event.pointerType !== "mouse" && !event.target.closest?.("[data-tip]")) hide(); });
    document.addEventListener("focusin", event => {
      const el = event.target.closest?.("[data-tip]");
      if (!el) { hide(); return; }
      const box = el.getBoundingClientRect();
      show(el, box.left + box.width / 2 - 14, box.bottom - 18);
    });
    document.addEventListener("focusout", hide);
    document.addEventListener("keydown", event => { if (event.key === "Escape") hide(); });
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    window.addEventListener("hashchange", hide);
    return { hide };
  }

  window.ArchitectureCharts = Object.freeze({
    profile, comparison, heatmap, summary, spark, ring, average, extremes, tierOf, tierChip, initTooltip
  });
})();
