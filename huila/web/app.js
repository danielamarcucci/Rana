/* Tablero electoral del Huila — app estática sin dependencias.
   Lee window.TABLERO (generado por scripts/05_construir_web.py). */
(function () {
  "use strict";
  const T = window.TABLERO;
  const MUNIS = T.municipios;
  const NOMBRE = Object.fromEntries(MUNIS.map((m) => [m.cod, titulo(m.nombre)]));
  const CORP = { GOBERNADOR: "Gobernación", ASAMBLEA: "Asamblea", ALCALDE: "Alcaldía", CONCEJO: "Concejo" };
  const $ = (id) => document.getElementById(id);
  const tooltip = $("tooltip");
  const fmtN = new Intl.NumberFormat("es-CO");
  const fmt1 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function titulo(s) {
    const minus = new Set(["de", "la", "del", "el", "y"]);
    return s.toLowerCase().split(" ").map((w, i) => (i && minus.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function fmtValor(v, unidad) {
    if (v === null || v === undefined) return "s. d.";
    if (unidad === "personas") return fmtN.format(Math.round(v));
    return fmt1.format(v);
  }
  function css(nombre) {
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  }
  function hexRgb(h) {
    const n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function escalaSeq(min, max) {
    const a = hexRgb(css("--seq-0")), b = hexRgb(css("--seq-1"));
    return (v) => {
      if (v === null || v === undefined || isNaN(v)) return css("--sin-dato");
      const t = max === min ? 0.5 : Math.max(0, Math.min(1, (v - min) / (max - min)));
      const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
      return `rgb(${c.join(",")})`;
    };
  }
  function mediana(vals) {
    const s = vals.filter((v) => v !== null).sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // ---------- tooltip ----------
  function mostrarTip(ev, html) {
    tooltip.innerHTML = html;
    tooltip.hidden = false;
    const x = Math.min(ev.clientX + 14, window.innerWidth - tooltip.offsetWidth - 8);
    const y = Math.min(ev.clientY + 14, window.innerHeight - tooltip.offsetHeight - 8);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }
  function ocultarTip() { tooltip.hidden = true; }

  // ---------- mapa ----------
  function dibujarMapa(cont, colorDe, tipDe, alClic, seleccionado) {
    const { ancho, alto } = T.mapa;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `-4 -4 ${ancho + 8} ${alto + 8}`);
    svg.setAttribute("role", "img");
    for (const m of MUNIS) {
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", m.d);
      p.setAttribute("fill", colorDe(m.cod));
      if (m.cod === seleccionado) p.classList.add("sel");
      p.addEventListener("mousemove", (ev) => mostrarTip(ev, tipDe(m.cod)));
      p.addEventListener("mouseleave", ocultarTip);
      p.addEventListener("click", () => alClic && alClic(m.cod));
      svg.appendChild(p);
    }
    // el seleccionado al frente para que se vea su borde completo
    const sel = svg.querySelector(".sel");
    if (sel) svg.appendChild(sel);
    cont.replaceChildren(svg);
  }

  // =====================================================================
  // INDICADORES
  // =====================================================================
  const IND = T.indicadores;
  const TEMAS = [...new Set(IND.map((i) => i.tema))];
  const estadoInd = { id: IND[0].id, sel: "41001", comparar: "" };

  function porId(id) { return IND.find((i) => i.id === id); }
  function ranking(ind) {
    return MUNIS.map((m) => ({ cod: m.cod, v: ind.valores[m.cod] }))
      .sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity));
  }
  function puesto(ind, cod) { return ranking(ind).findIndex((r) => r.cod === cod) + 1; }
  function lecturaTexto(l) {
    return l === "peor" ? "Un valor más alto es una situación más desfavorable."
      : l === "mejor" ? "Un valor más alto es una situación más favorable." : "Indicador descriptivo: más alto no es mejor ni peor.";
  }

  function iniciarIndicadores() {
    const selTema = $("ind-tema"), selInd = $("ind-indicador");
    selTema.innerHTML = TEMAS.map((t) => `<option>${esc(t)}</option>`).join("");
    const llenarInd = () => {
      const lista = IND.filter((i) => i.tema === selTema.value);
      selInd.innerHTML = lista.map((i) => `<option value="${i.id}">${esc(i.indicador)}</option>`).join("");
      if (!lista.some((i) => i.id === estadoInd.id)) estadoInd.id = lista[0].id;
      selInd.value = estadoInd.id;
    };
    selTema.addEventListener("change", () => { llenarInd(); estadoInd.id = selInd.value; pintarIndicador(); });
    selInd.addEventListener("change", () => { estadoInd.id = selInd.value; pintarIndicador(); });
    llenarInd();

    const opciones = MUNIS.slice().sort((a, b) => NOMBRE[a.cod].localeCompare(NOMBRE[b.cod], "es"))
      .map((m) => `<option value="${m.cod}">${esc(NOMBRE[m.cod])}</option>`).join("");
    $("ficha-a").innerHTML = opciones;
    $("ficha-b").innerHTML = `<option value="">— ninguno —</option>` + opciones;
    $("ficha-a").value = estadoInd.sel;
    $("ficha-a").addEventListener("change", (e) => { estadoInd.sel = e.target.value; pintarIndicador(); });
    $("ficha-b").addEventListener("change", (e) => { estadoInd.comparar = e.target.value; pintarFicha(); });
    $("ind-csv").addEventListener("click", descargarCSV);
    pintarIndicador();
  }

  function seleccionarMunicipio(cod) {
    estadoInd.sel = cod;
    $("ficha-a").value = cod;
    pintarIndicador();
  }

  function pintarIndicador() {
    const ind = porId(estadoInd.id);
    const vals = MUNIS.map((m) => ind.valores[m.cod]).filter((v) => v !== null);
    const min = Math.min(...vals), max = Math.max(...vals), med = mediana(vals);
    const color = escalaSeq(min, max);
    $("ind-meta").innerHTML = `${esc(ind.unidad)} · ${ind.anio} · ${esc(lecturaTexto(ind.lectura))}<br><span class="muted">Fuente: ${esc(ind.fuente)}${ind.nota ? ". " + esc(ind.nota) : ""}</span>`;
    $("ind-titulo-mapa").textContent = ind.indicador;
    $("ind-mediana").textContent = `· línea punteada = mediana (${fmtValor(med, ind.unidad)})`;
    dibujarMapa($("ind-mapa"), (c) => color(ind.valores[c]),
      (c) => `<div class="t">${esc(NOMBRE[c])}</div><div>${fmtValor(ind.valores[c], ind.unidad)} ${esc(ind.unidad)}</div><div class="s">Puesto ${puesto(ind, c)} de 37</div>`,
      seleccionarMunicipio, estadoInd.sel);
    $("ind-leyenda").innerHTML = `<span>${fmtValor(min, ind.unidad)}</span><span class="rampa"></span><span>${fmtValor(max, ind.unidad)}</span><span class="muted">Clic en un municipio para ver su ficha</span>`;

    const top = Math.max(max, 0) || 1;
    $("ind-ranking").innerHTML = ranking(ind).map((r, i) => `
      <div class="fila-rank${r.cod === estadoInd.sel ? " sel" : ""}" data-cod="${r.cod}">
        <span class="pos">${i + 1}</span><span class="nom">${esc(NOMBRE[r.cod])}</span>
        <span class="barra"><i style="width:${(100 * Math.max(r.v ?? 0, 0)) / top}%"></i><b style="left:${(100 * med) / top}%"></b></span>
        <span class="val">${fmtValor(r.v, ind.unidad)}</span>
      </div>`).join("");
    $("ind-ranking").querySelectorAll(".fila-rank").forEach((el) =>
      el.addEventListener("click", () => seleccionarMunicipio(el.dataset.cod)));
    pintarFicha();
  }

  function pintarFicha() {
    const a = estadoInd.sel, b = estadoInd.comparar;
    let html = `<table><thead><tr><th>Indicador</th><th class="n">${esc(NOMBRE[a])}</th><th class="n">Puesto</th>`;
    if (b) html += `<th class="n">${esc(NOMBRE[b])}</th><th class="n">Puesto</th>`;
    html += `<th class="n">Mediana Huila</th><th>Unidad · año</th></tr></thead><tbody>`;
    for (const tema of TEMAS) {
      html += `<tr class="tema"><td colspan="${b ? 6 : 4}">${esc(tema)}</td></tr>`;
      for (const ind of IND.filter((i) => i.tema === tema)) {
        const med = mediana(MUNIS.map((m) => ind.valores[m.cod]));
        html += `<tr><td>${esc(ind.indicador)}</td><td class="n">${fmtValor(ind.valores[a], ind.unidad)}</td><td class="n">${puesto(ind, a)}</td>`;
        if (b) html += `<td class="n">${fmtValor(ind.valores[b], ind.unidad)}</td><td class="n">${puesto(ind, b)}</td>`;
        html += `<td class="n">${fmtValor(med, ind.unidad)}</td><td class="muted">${esc(ind.unidad)} · ${ind.anio}</td></tr>`;
      }
    }
    $("ficha").innerHTML = html + "</tbody></table>";
  }

  function descargarCSV() {
    const ind = porId(estadoInd.id);
    const filas = [["cod_divipola", "municipio", "indicador", "unidad", "anio", "valor", "puesto", "fuente"]];
    ranking(ind).forEach((r, i) => filas.push([r.cod, NOMBRE[r.cod], ind.indicador, ind.unidad, ind.anio, r.v ?? "", i + 1, ind.fuente]));
    const csv = filas.map((f) => f.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `huila_${ind.id}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // =====================================================================
  // PANORAMA ELECTORAL
  // =====================================================================
  const estadoEl = { anio: "2023", corp: "GOBERNADOR", modo: "ganador", opcion: "" };
  const usaCandidatos = (corp) => corp === "GOBERNADOR" || corp === "ALCALDE";

  function opcionesDe(m, corp) {
    // Gobernación: candidatos. Alcaldía: partido/coalición del candidato. Asamblea/Concejo: partidos.
    return corp === "GOBERNADOR" ? m.candidatos : m.partidos;
  }
  function etiqueta(k, corp) {
    if (corp !== "GOBERNADOR") return titulo(k);
    const [cand, part] = k.split("|");
    return `${titulo(cand)} (${titulo(part)})`;
  }
  function ordenadas(obj) { return Object.entries(obj).sort((a, b) => b[1] - a[1]); }

  function iniciarElectoral() {
    ["el-anio", "el-corp", "el-modo", "el-opcion"].forEach((id) =>
      $(id).addEventListener("change", (e) => {
        const k = { "el-anio": "anio", "el-corp": "corp", "el-modo": "modo", "el-opcion": "opcion" }[id];
        estadoEl[k] = e.target.value;
        if (k !== "opcion" && k !== "modo") estadoEl.opcion = "";
        pintarElectoral();
      }));
    pintarElectoral();
  }

  function pintarElectoral() {
    const { anio, corp, modo } = estadoEl;
    const datos = T.electoral[anio][corp];

    // Totales del departamento (suma de los 37 municipios)
    const tot = { validos: 0, blanco: 0, nulos: 0, no_marcados: 0, total: 0 };
    const opcTot = {};
    for (const m of Object.values(datos)) {
      for (const k in tot) tot[k] += m[k];
      for (const [k, v] of Object.entries(opcionesDe(m, corp))) opcTot[k] = (opcTot[k] || 0) + v;
    }
    const opcOrden = ordenadas(opcTot);
    $("el-tiles").innerHTML = [
      ["Votos válidos", fmtN.format(tot.validos)],
      ["Votos en blanco", fmt1.format((100 * tot.blanco) / tot.validos) + " %"],
      ["Votos nulos", fmt1.format((100 * tot.nulos) / tot.total) + " %"],
      ["Tarjetones no marcados", fmt1.format((100 * tot.no_marcados) / tot.total) + " %"],
    ].map(([k, v]) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");

    // Opciones del selector
    const wrap = $("el-opcion-wrap"), sel = $("el-opcion");
    wrap.hidden = modo !== "pct";
    if (!estadoEl.opcion || !(estadoEl.opcion in opcTot)) estadoEl.opcion = opcOrden[0][0];
    sel.innerHTML = opcOrden.map(([k]) => `<option value="${esc(k)}">${esc(etiqueta(k, corp))}</option>`).join("");
    sel.value = estadoEl.opcion;

    // Ganador por municipio
    const gan = {};
    for (const [cod, m] of Object.entries(datos)) {
      const o = ordenadas(opcionesDe(m, corp));
      const [k1, v1] = o[0], v2 = o[1] ? o[1][1] : 0;
      gan[cod] = { k: k1, pct: (100 * v1) / m.validos, margen: (100 * (v1 - v2)) / m.validos, segundo: o[1] ? o[1][0] : "" };
      if (corp === "ALCALDE" && m.candidatos) {
        gan[cod].persona = ordenadas(m.candidatos)[0][0].split("|")[0];
      }
    }

    // Mapa
    let colorDe, leyenda;
    if (modo === "ganador") {
      // las 3 opciones que más municipios ganan llevan color; el resto es "Otra"
      const cuenta = {};
      Object.values(gan).forEach((g) => (cuenta[g.k] = (cuenta[g.k] || 0) + 1));
      const top = ordenadas(cuenta).slice(0, 3).map(([k]) => k);
      const colores = [css("--serie-1"), css("--serie-2"), css("--serie-3")];
      colorDe = (c) => { const i = top.indexOf(gan[c].k); return i >= 0 ? colores[i] : css("--otro"); };
      leyenda = top.map((k, i) => `<span><span class="chip" style="background:${colores[i]}"></span>${esc(etiqueta(k, corp))} · ${cuenta[k]} mun.</span>`).join("");
      const resto = 37 - top.reduce((s, k) => s + cuenta[k], 0);
      if (resto) leyenda += `<span><span class="chip" style="background:${css("--otro")}"></span>Otras · ${resto} mun.</span>`;
      $("el-titulo-mapa").textContent = `${CORP[corp]} ${anio}: ${corp === "GOBERNADOR" ? "candidato" : "partido o coalición"} más votado en cada municipio`;
    } else {
      const pct = (c) => (100 * (opcionesDe(datos[c], corp)[estadoEl.opcion] || 0)) / datos[c].validos;
      const vals = Object.keys(datos).map(pct);
      const color = escalaSeq(0, Math.max(...vals));
      colorDe = (c) => color(pct(c));
      leyenda = `<span>0 %</span><span class="rampa"></span><span>${fmt1.format(Math.max(...vals))} %</span>`;
      $("el-titulo-mapa").textContent = `${CORP[corp]} ${anio}: % del voto válido de ${etiqueta(estadoEl.opcion, corp)}`;
    }
    dibujarMapa($("el-mapa"), colorDe, (c) => {
      const m = datos[c], g = gan[c];
      const o = opcionesDe(m, corp);
      let h = `<div class="t">${esc(NOMBRE[c])}</div>`;
      if (modo === "pct") h += `<div>${esc(etiqueta(estadoEl.opcion, corp))}: ${fmt1.format((100 * (o[estadoEl.opcion] || 0)) / m.validos)} %</div>`;
      h += `<div class="s">Ganó: ${esc(g.persona ? titulo(g.persona) + " · " : "")}${esc(etiqueta(g.k, corp))} (${fmt1.format(g.pct)} %)</div>`;
      return h + `<div class="s">${fmtN.format(m.validos)} votos válidos</div>`;
    }, null, null);
    $("el-leyenda").innerHTML = leyenda;

    // Totales departamentales (top 10 + otras)
    $("el-titulo-total").textContent = corp === "GOBERNADOR" || corp === "ASAMBLEA"
      ? `${CORP[corp]} ${anio}: total del departamento`
      : `${CORP[corp]} ${anio}: suma de los 37 municipios (no es una elección departamental)`;
    const top10 = opcOrden.slice(0, 10);
    const otras = opcOrden.slice(10).reduce((s, [, v]) => s + v, 0);
    const filas = top10.map(([k, v]) => [etiqueta(k, corp), v]);
    if (otras) filas.push([`Otras (${opcOrden.length - 10})`, otras]);
    filas.push(["Voto en blanco", tot.blanco]);
    const maxV = Math.max(...filas.map((f) => f[1]));
    $("el-total").innerHTML = filas.map(([k, v], i) => `
      <div class="fila-rank" style="grid-template-columns:22px minmax(0,1.4fr) minmax(0,1fr) 64px" title="${esc(k)}: ${fmtN.format(v)} votos">
        <span class="pos">${i < top10.length ? i + 1 : ""}</span><span class="nom">${esc(k)}</span>
        <span class="barra"><i style="width:${(100 * v) / maxV}%"></i></span>
        <span class="val">${fmt1.format((100 * v) / tot.validos)} %</span>
      </div>`).join("");

    // Tabla por municipio, con comparación 2019↔2023 si la opción existe en ambos años
    const otroAnio = anio === "2023" ? "2019" : "2023";
    const datosOtro = T.electoral[otroAnio][corp];
    const enModoPct = modo === "pct";
    let html = `<table><thead><tr><th>Municipio</th><th>Más votado</th><th class="n">% válido</th><th class="n">Margen (pp)</th>`;
    if (enModoPct) html += `<th class="n">% ${esc(anio)}</th><th class="n">% ${esc(otroAnio)}</th>`;
    html += `<th class="n">Votos válidos</th><th class="n">% blanco</th></tr></thead><tbody>`;
    let existeEnOtro = false;
    for (const m of MUNIS.slice().sort((a, b) => NOMBRE[a.cod].localeCompare(NOMBRE[b.cod], "es"))) {
      const c = m.cod, d = datos[c], g = gan[c];
      html += `<tr><td>${esc(NOMBRE[c])}</td><td>${esc(g.persona ? titulo(g.persona) + " · " : "")}${esc(etiqueta(g.k, corp))}</td>`;
      html += `<td class="n">${fmt1.format(g.pct)}</td><td class="n">${fmt1.format(g.margen)}</td>`;
      if (enModoPct) {
        const v = opcionesDe(d, corp)[estadoEl.opcion];
        const vo = opcionesDe(datosOtro[c], corp)[estadoEl.opcion];
        if (vo !== undefined) existeEnOtro = true;
        html += `<td class="n">${v === undefined ? "—" : fmt1.format((100 * v) / d.validos)}</td>`;
        html += `<td class="n">${vo === undefined ? "—" : fmt1.format((100 * vo) / datosOtro[c].validos)}</td>`;
      }
      html += `<td class="n">${fmtN.format(d.validos)}</td><td class="n">${fmt1.format((100 * d.blanco) / d.validos)}</td></tr>`;
    }
    $("el-tabla").innerHTML = html + "</tbody></table>";
    let nota = "Margen: diferencia en puntos porcentuales entre el primero y el segundo. Porcentajes sobre votos válidos (por opciones + en blanco). Fuente: Registraduría Nacional, archivos mesa a mesa (MMV) 2019 y 2023, sumados por municipio.";
    if (corp === "ALCALDE") nota += " En Alcaldía el color y la opción corresponden al partido o coalición que avaló al candidato; el nombre del alcalde electo aparece en la tabla.";
    if (enModoPct && !existeEnOtro) nota += ` "${etiqueta(estadoEl.opcion, corp)}" no aparece con ese mismo nombre en ${otroAnio}, por eso no hay comparación.`;
    $("el-nota").textContent = nota;
  }

  // =====================================================================
  // FUENTES Y NAVEGACIÓN
  // =====================================================================
  function iniciarFuentes() {
    const fuentes = [...new Set(IND.map((i) => i.fuente))];
    fuentes.push("Registraduría Nacional del Estado Civil, resultados mesa a mesa (MMV) de elecciones territoriales 2019 y 2023 — Huila, integridad verificada con SHA-256.");
    fuentes.push("DANE, Marco Geoestadístico Nacional 2025 (límites municipales, geometría simplificada para el mapa).");
    $("fuentes-lista").innerHTML = fuentes.map((f) => `<li>${esc(f)}</li>`).join("");
  }

  document.querySelectorAll(".pestanas button").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".pestanas button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      document.querySelectorAll(".vista").forEach((v) => (v.hidden = v.id !== "vista-" + b.dataset.vista));
      ocultarTip();
    }));

  iniciarIndicadores();
  iniciarElectoral();
  iniciarFuentes();
})();
