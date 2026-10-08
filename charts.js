(() => {
  "use strict";

  // Las visualizaciones usan exclusivamente las valoraciones didácticas de content.js.
  // Este módulo devuelve HTML; app.js conserva el estado de selección y los eventos.
  const colors = {
    layered: "#81a6ca",
    monolithic: "#d8ab73",
    microservices: "#ab95d0",
    microkernel: "#8dbbaa",
    "event-driven": "#da988b"
  };

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  const colorFor = style => colors[style?.id] || "#81a6ca";
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

  function profile(style, criteria, selectedCriterionId) {
    const axes = validCriteria(criteria);
    if (!style || !axes.length) return '<p class="chart-empty">No hay valoraciones para mostrar.</p>';

    const selected = selectedCriterion(axes, selectedCriterionId);
    const center = 190;
    const radius = 120;
    const angleFor = index => -Math.PI / 2 + (index * 2 * Math.PI / axes.length);
    const point = (index, factor) => {
      const angle = angleFor(index);
      return [center + Math.cos(angle) * radius * factor, center + Math.sin(angle) * radius * factor];
    };
    const polygon = factor => axes.map((_, index) => point(index, factor).map(value => value.toFixed(1)).join(",")).join(" ");
    const values = axes.map(criterion => ratingFor(style, criterion.id));
    const dataPolygon = axes.map((_, index) => point(index, (values[index].score ?? 0) / 5).map(value => value.toFixed(1)).join(",")).join(" ");
    const selectedRating = ratingFor(style, selected.id);
    const accessibleSummary = `${style.name}. ${axes.map((criterion, index) => `${criterion.label}: ${scoreText(values[index].score)}`).join("; ")}.`;

    return `
      <div class="chart-profile" data-chart-selected-criterion="${escapeHTML(selected.id)}" style="--chart-accent:${colorFor(style)}">
        <figure class="chart-radar-figure">
          <svg class="chart-radar" viewBox="0 0 380 380" role="img" aria-label="${escapeHTML(accessibleSummary)}">
            <circle class="chart-radar-center" cx="190" cy="190" r="3" fill="#8092a7" aria-hidden="true"/>
            ${[1, 2, 3, 4, 5].map(level => `<polygon class="chart-radar-ring" points="${polygon(level / 5)}" fill="none" stroke="#d8e3eb" stroke-width="1" aria-hidden="true"/>`).join("")}
            ${axes.map((criterion, index) => {
              const [x, y] = point(index, 1);
              const [labelX, labelY] = point(index, 1.31);
              const active = criterion.id === selected.id;
              return `<line class="chart-radar-axis ${active ? "chart-radar-axis-active" : ""}" x1="190" y1="190" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${active ? "#8098ac" : "#d8e3eb"}" stroke-width="${active ? 2 : 1}" aria-hidden="true"/>
                <text class="chart-radar-axis-label ${active ? "chart-radar-axis-label-active" : ""}" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="#53667b" font-size="12" font-weight="700" aria-hidden="true">${String(index + 1).padStart(2, "0")}</text>`;
            }).join("")}
            <polygon class="chart-radar-shape" points="${dataPolygon}" fill="var(--chart-accent)" fill-opacity="0.22" stroke="var(--chart-accent)" stroke-width="3" stroke-linejoin="round" pathLength="100" aria-hidden="true"/>
            ${axes.map((criterion, index) => {
              const [x, y] = point(index, (values[index].score ?? 0) / 5);
              const active = criterion.id === selected.id;
              return `<circle class="chart-radar-point ${active ? "chart-radar-point-active" : ""}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${active ? 7 : 4}" fill="${active ? "var(--chart-accent)" : "#fff"}" stroke="var(--chart-accent)" stroke-width="2.5" aria-hidden="true"/>`;
            }).join("")}
          </svg>
          <figcaption class="chart-radar-caption">Los números del diagrama corresponden a los atributos. Escala didáctica de 1 a 5.</figcaption>
        </figure>
        <div class="chart-profile-details">
          <div class="chart-criterion-controls" role="group" aria-label="Explorar atributos de ${escapeHTML(style.name)}">
            ${axes.map((criterion, index) => {
              const rating = values[index];
              const active = criterion.id === selected.id;
              return `<button class="chart-criterion-button ${active ? "chart-criterion-button-active" : ""}" type="button" data-profile-criterion="${escapeHTML(criterion.id)}" aria-pressed="${active}" aria-label="Explorar ${escapeHTML(criterion.label)}: ${escapeHTML(scoreText(rating.score))}">
                <span class="chart-criterion-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
                <span class="chart-criterion-name">${escapeHTML(criterion.label)}</span>
                <strong class="chart-criterion-score">${visibleScore(rating.score)}<small>/5</small></strong>
              </button>`;
            }).join("")}
          </div>
          <div class="chart-insight" aria-live="polite">
            <span class="chart-insight-kicker">Atributo seleccionado</span>
            <h3>${escapeHTML(selected.label)} <span>${visibleScore(selectedRating.score)}/5</span></h3>
            <p class="chart-insight-description">${escapeHTML(selected.description)}</p>
            <p class="chart-insight-reason">${escapeHTML(selectedRating.reason)}</p>
          </div>
        </div>
      </div>`;
  }

  function comparison(styles, criteria, selectedCriterionId) {
    const axes = validCriteria(criteria);
    if (!Array.isArray(styles) || !styles.length || !axes.length) {
      return '<p class="chart-empty">No hay estilos para comparar.</p>';
    }

    const selected = selectedCriterion(axes, selectedCriterionId);
    const ranked = styles.map((style, index) => ({ style, index, rating: ratingFor(style, selected.id) }))
      .sort((first, second) => (second.rating.score ?? -1) - (first.rating.score ?? -1) || first.index - second.index);

    return `
      <section class="chart-comparison" data-chart-selected-criterion="${escapeHTML(selected.id)}" aria-label="Comparar estilos por atributo de calidad">
        <div class="chart-comparison-head">
          <div><span class="chart-eyebrow">COMPARACIÓN INTERACTIVA</span><h2>Un atributo a la vez</h2><p>Selecciona un atributo para ver cómo se valoran los cinco estilos.</p></div>
          <span class="chart-scale">Escala 1–5</span>
        </div>
        <div class="chart-filters" role="group" aria-label="Seleccionar atributo de calidad">
          ${axes.map(criterion => `<button class="chart-filter ${criterion.id === selected.id ? "chart-filter-active" : ""}" type="button" data-compare-criterion="${escapeHTML(criterion.id)}" aria-pressed="${criterion.id === selected.id}">${escapeHTML(criterion.label)}</button>`).join("")}
        </div>
        <div class="chart-comparison-context" aria-live="polite"><strong>${escapeHTML(selected.label)}</strong><span>${escapeHTML(selected.description)}</span></div>
        <ol class="chart-bars" aria-label="Valoraciones de ${escapeHTML(selected.label)} ordenadas de mayor a menor">
          ${ranked.map(({ style, rating }, index) => {
            const percent = rating.score === null ? 0 : (rating.score / 5) * 100;
            return `<li class="chart-bar-item" style="--chart-accent:${colorFor(style)};--chart-fill:${percent}%">
              <div class="chart-bar-heading">
                <span class="chart-bar-rank" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
                <strong class="chart-bar-name">${escapeHTML(style.name)}</strong>
                <span class="chart-bar-score" aria-label="${escapeHTML(scoreText(rating.score))}">${visibleScore(rating.score)}<small>/5</small></span>
              </div>
              <div class="chart-bar-track" role="img" aria-label="${escapeHTML(style.name)}: ${escapeHTML(scoreText(rating.score))}"><span class="chart-bar-fill" aria-hidden="true"></span></div>
              <div class="chart-bar-footer"><p class="chart-bar-reason">${escapeHTML(rating.reason)}</p><button type="button" class="chart-bar-link" data-style="${escapeHTML(style.id)}" aria-label="Abrir ficha de ${escapeHTML(style.name)}">Ver ficha <span aria-hidden="true">↗</span></button></div>
            </li>`;
          }).join("")}
        </ol>
        <p class="chart-comparison-note">Estas puntuaciones orientan la conversación: el resultado real depende de la implementación y del contexto.</p>
      </section>`;
  }

  window.ArchitectureCharts = Object.freeze({ profile, comparison });
})();
