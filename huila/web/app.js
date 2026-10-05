/* Huila · tablero territorial — app estática sin dependencias.
   Lee window.TABLERO (generado por scripts/05_construir_web.py). */
(function () {
  "use strict";
  const T = window.TABLERO;
  const MUNIS = T.municipios;
  const NOMBRE = Object.fromEntries(MUNIS.map((m) => [m.cod, titulo(m.nombre)]));
  const SUBREG = Object.fromEntries(MUNIS.map((m) => [m.cod, m.subregion]));
  const SUBREGIONES = ["Norte", "Centro", "Occidente", "Sur"].filter((s) => MUNIS.some((m) => m.subregion === s));
  const CORP = { GOBERNADOR: "Gobernación", ASAMBLEA: "Asamblea", ALCALDE: "Alcaldía", CONCEJO: "Concejo" };
  const $ = (id) => document.getElementById(id);
  const tooltip = $("tooltip");
  const fmtN = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  const fmt1 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt2 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ---------- utilidades ----------
  function titulo(s) {
    const minus = new Set(["de", "la", "del", "el", "y", "los", "las"]);
    return s.toLowerCase().split(" ").map((w, i) => (i && minus.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  const hay = (v) => v !== null && v !== undefined && !Number.isNaN(v);
  function fmtV(v, unidad) {
    if (!hay(v)) return "s. d.";
    if (unidad === "pesos corrientes") return "$" + fmtN.format(v);
    if (unidad === "personas") return fmtN.format(v);
    const a = Math.abs(v);
    const txt = a >= 1000 ? fmtN.format(v) : a >= 10 ? fmt1.format(v) : fmt2.format(v);
    return unidad === "%" || unidad.startsWith("% ") ? txt + " %" : txt;
  }
  function css(nombre) { return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim(); }
  function mediana(vals) {
    const s = vals.filter(hay).sort((a, b) => a - b);
    if (!s.length) return null;
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  const ns = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, txt) {
    const e = document.createElementNS(ns, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (txt !== undefined) e.textContent = txt;
    return e;
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
  function conTip(el, html) {
    el.addEventListener("mousemove", (ev) => mostrarTip(ev, html));
    el.addEventListener("mouseleave", ocultarTip);
  }

  // =====================================================================
  // TERRITORIO (filtro global de la banda)
  // =====================================================================
  const terr = { tipo: "todo", valor: null }; // todo | sub | mun
  const ordenNombre = (a, b) => NOMBRE[a].localeCompare(NOMBRE[b], "es");

  function codsTerritorio() {
    if (terr.tipo === "sub") return MUNIS.filter((m) => m.subregion === terr.valor).map((m) => m.cod);
    if (terr.tipo === "mun") return [terr.valor];
    return MUNIS.map((m) => m.cod);
  }
  function nombreTerritorio() {
    if (terr.tipo === "sub") return `Subregión ${terr.valor}`;
    if (terr.tipo === "mun") return NOMBRE[terr.valor];
    return "Huila";
  }
  function chipTerritorio() {
    if (terr.tipo === "sub") return `Subregión ${terr.valor} · ${codsTerritorio().length} municipios`;
    if (terr.tipo === "mun") return `${NOMBRE[terr.valor]} · subregión ${SUBREG[terr.valor]}`;
    return "Todo Huila · 37 municipios";
  }
  function enTerritorio(cod) {
    return terr.tipo === "todo" || (terr.tipo === "sub" ? SUBREG[cod] === terr.valor : cod === terr.valor);
  }

  function iniciarTerritorio() {
    const fs = $("f-subregion"), fm = $("f-municipio");
    fs.innerHTML = `<option value="">Todas las subregiones</option>` +
      SUBREGIONES.map((s) => `<option value="${s}">${s} (${MUNIS.filter((m) => m.subregion === s).length})</option>`).join("");
    fs.addEventListener("change", () => fijarTerritorio(fs.value ? { tipo: "sub", valor: fs.value } : { tipo: "todo" }));
    fm.addEventListener("change", () => {
      if (fm.value) fijarTerritorio({ tipo: "mun", valor: fm.value });
      else fijarTerritorio(fs.value ? { tipo: "sub", valor: fs.value } : { tipo: "todo" });
    });
    $("f-todo").addEventListener("click", () => fijarTerritorio({ tipo: "todo" }));
    sincronizarFiltros();
  }
  function sincronizarFiltros() {
    const fs = $("f-subregion"), fm = $("f-municipio");
    const sub = terr.tipo === "sub" ? terr.valor : terr.tipo === "mun" ? SUBREG[terr.valor] : "";
    fs.value = sub;
    const cods = MUNIS.filter((m) => !sub || m.subregion === sub).map((m) => m.cod).sort(ordenNombre);
    fm.innerHTML = `<option value="">${sub ? "Todos los de " + sub : "Todos los municipios"}</option>` +
      cods.map((c) => `<option value="${c}">${esc(NOMBRE[c])}</option>`).join("");
    fm.value = terr.tipo === "mun" ? terr.valor : "";
    $("f-todo").setAttribute("aria-pressed", String(terr.tipo === "todo"));
  }
  function fijarTerritorio(t) {
    terr.tipo = t.tipo;
    terr.valor = t.valor || null;
    sincronizarFiltros();
    pintar();
  }
  // Clic en el mapa o en la tabla: abre el municipio; un segundo clic vuelve a su subregión.
  function clicMunicipio(cod) {
    if (terr.tipo === "mun" && terr.valor === cod) fijarTerritorio({ tipo: "sub", valor: SUBREG[cod] });
    else fijarTerritorio({ tipo: "mun", valor: cod });
  }

  // ---------- mapa base ----------
  function dibujarMapa(cont, colorDe, tipDe) {
    const { ancho, alto } = T.mapa;
    const svg = svgEl("svg", { viewBox: `-4 -4 ${ancho + 8} ${alto + 8}`, role: "img", "aria-label": "Mapa de los municipios del Huila" });
    const delante = [];
    for (const m of MUNIS) {
      const p = svgEl("path", { d: m.d, fill: colorDe(m.cod) });
      if (terr.tipo === "mun" && m.cod === terr.valor) { p.classList.add("sel"); delante.push(p); }
      else if (terr.tipo === "sub" && !enTerritorio(m.cod)) p.classList.add("fuera");
      else if (terr.tipo === "sub") delante.push(p);
      p.addEventListener("mousemove", (ev) => mostrarTip(ev, tipDe(m.cod)));
      p.addEventListener("mouseleave", ocultarTip);
      p.addEventListener("click", () => clicMunicipio(m.cod));
      svg.appendChild(p);
    }
    delante.forEach((p) => svg.appendChild(p));
    cont.replaceChildren(svg);
  }

  // =====================================================================
  // INDICADORES (Problemas y Caracterización)
  // =====================================================================
  const IND = T.indicadores;
  const VISTAS_IND = {
    problemas: {
      titulo: "Problemas del territorio",
      temas: ["Salud", "Seguridad", "Economía", "Educación y servicios"],
      intro: "Cada indicador ubica al territorio frente a Colombia, a los 32 departamentos y a los municipios del país. El mapa y el histograma comparan a cada municipio del Huila con los cerca de 1.100 municipios de Colombia.",
    },
    caracterizacion: {
      titulo: "Caracterización",
      temas: ["Caracterización"],
      intro: "Quién vive en el territorio. Estos indicadores no son buenos ni malos: describen tamaño, edad, ruralidad y pertenencia étnica de la población, para leer los demás datos con contexto.",
    },
  };
  const estadoVista = {
    problemas: { tema: "Salud", id: null, buscar: "" },
    caracterizacion: { tema: "Caracterización", id: null, buscar: "" },
  };

  // Conteos absolutos (población): se suman, no se comparan con Colombia.
  const esAditivo = (ind) => ind.unidad === "personas";
  // valor de un municipio para el último año (con relleno de ceros si aplica)
  function valorMun(ind, cod) { return hay(ind.municipios[cod]) ? ind.municipios[cod] : null; }

  // Posición en la distribución nacional: proporción de municipios por debajo (rango medio en empates).
  function percentil(ind, v) {
    const a = ind.nacional;
    let menos = 0, iguales = 0;
    for (const x of a) { if (x < v) menos++; else if (x === v) iguales++; }
    return (menos + iguales / 2) / a.length;
  }
  // 0 = peor situación ... 4 = mejor (o, para contexto, 0 = más bajo ... 4 = más alto)
  function quintil(ind, v) {
    if (!hay(v)) return null;
    const p = percentil(ind, v);
    const s = ind.sentido === "peor" ? 1 - p : p;
    return Math.min(4, Math.floor(s * 5));
  }
  const ETQ_SIT = ["Entre el 20% con peor situación", "Peor que la mayoría", "En la mitad del país", "Mejor que la mayoría", "Entre el 20% con mejor situación"];
  const ETQ_CTX = ["Entre el 20% más bajo", "Bajo", "En la mitad del país", "Alto", "Entre el 20% más alto"];
  function colorQ(ind, q) {
    if (q === null) return css("--sin-dato");
    return css(ind.sentido === "contexto" ? `--c${q + 1}` : `--q${q + 1}`);
  }
  function etqQ(ind, q) { return q === null ? "Sin dato" : (ind.sentido === "contexto" ? ETQ_CTX : ETQ_SIT)[q]; }

  // Puesto entre los municipios del país: 1 = peor situación.
  function puestoNacional(ind, v) {
    let n = 0;
    for (const x of ind.nacional) if (ind.sentido === "peor" ? x > v : x < v) n++;
    return n + 1;
  }

  // Valor del territorio seleccionado, con la forma en que se obtuvo.
  function valorTerritorio(ind) {
    if (terr.tipo === "mun") return { v: valorMun(ind, terr.valor), como: "valor del municipio" };
    if (terr.tipo === "sub") {
      const cods = codsTerritorio();
      if (esAditivo(ind)) return { v: cods.reduce((a, c) => a + (valorMun(ind, c) || 0), 0), como: `suma de sus ${cods.length} municipios` };
      return { v: mediana(cods.map((c) => valorMun(ind, c))), como: `mediana de sus ${cods.length} municipios` };
    }
    if (hay(ind.huila)) return { v: ind.huila, como: "dato departamental" };
    return { v: mediana(MUNIS.map((m) => valorMun(ind, m.cod))), como: "mediana de los 37 municipios (sin dato departamental)", aprox: true };
  }
  function valorColombia(ind) {
    if (hay(ind.colombia)) return { v: ind.colombia, como: "dato nacional" };
    return { v: mediana(ind.nacional), como: `mediana de los ${fmtN.format(ind.nacional.length)} municipios`, aprox: true };
  }
  function comparacion(ind, t, c) {
    if (!hay(t) || !hay(c) || c === 0) return null;
    return (100 * (t - c)) / Math.abs(c);
  }
  function tagDe(ind) {
    if (ind.sentido === "contexto") return { cls: "contexto", txt: "Contexto" };
    const t = valorTerritorio(ind).v, c = valorColombia(ind).v;
    const d = comparacion(ind, t, c);
    if (d === null) return t === c && hay(t) ? { cls: "similar", txt: "Similar" } : { cls: "similar", txt: "Sin dato" };
    if (Math.abs(d) < 5) return { cls: "similar", txt: "Similar" };
    const peor = ind.sentido === "peor" ? d > 0 : d < 0;
    return peor ? { cls: "peor", txt: "Peor" } : { cls: "mejor", txt: "Mejor" };
  }
  function notaInd(ind) {
    const partes = [];
    if (ind.nota) partes.push(ind.nota);
    if (ind.ceros) partes.push("TerriData no publica un municipio el año en que no hubo casos; esos municipios se cuentan como 0 si tienen dato en otros años.");
    if (!hay(ind.huila) && ind.sentido !== "contexto") partes.push("No hay dato departamental del Huila para este año: se usa la mediana de sus municipios.");
    return partes.join(" ");
  }

  // ---- series para el gráfico de evolución ----
  function serieMun(ind, cod) {
    const s = { ...(ind.serie_municipios[cod] || {}) };
    if (ind.ceros && Object.keys(s).length) {
      const anios = new Set(Object.keys(ind.serie_colombia));
      Object.values(ind.serie_municipios).forEach((x) => Object.keys(x).forEach((a) => anios.add(a)));
      anios.forEach((a) => { if (!(a in s)) s[a] = 0; });
    }
    return s;
  }
  function serieMediana(ind, cods) {
    const anios = new Set();
    const series = cods.map((c) => serieMun(ind, c));
    series.forEach((s) => Object.keys(s).forEach((a) => anios.add(a)));
    const out = {};
    [...anios].sort().forEach((a) => {
      const vals = series.map((s) => s[a]).filter(hay);
      if (vals.length >= Math.ceil(cods.length / 2)) out[a] = mediana(vals);
    });
    return out;
  }
  function serieTerritorio(ind) {
    if (terr.tipo === "mun") return serieMun(ind, terr.valor);
    if (terr.tipo === "sub" && esAditivo(ind)) {
      const out = {};
      codsTerritorio().forEach((c) => Object.entries(serieMun(ind, c)).forEach(([a, v]) => (out[a] = (out[a] || 0) + v)));
      return out;
    }
    if (terr.tipo === "sub") return serieMediana(ind, codsTerritorio());
    if (Object.keys(ind.serie_huila).length) return ind.serie_huila;
    return serieMediana(ind, MUNIS.map((m) => m.cod));
  }

  function iniciarVistaInd(clave) {
    const cfg = VISTAS_IND[clave];
    const sec = $("v-" + clave);
    sec.appendChild($("tpl-indicadores").content.cloneNode(true));
    const q = (n) => sec.querySelector(`[data-${n}]`);
    sec.q = q;
    q("titulo").textContent = cfg.titulo;
    q("intro").textContent = cfg.intro;
    const est = estadoVista[clave];
    if (cfg.temas.length < 2) { q("temas").hidden = true; q("lbl-tema").hidden = true; }
    q("temas").innerHTML = cfg.temas.map((t) =>
      `<button type="button" data-t="${esc(t)}">${esc(t)} <small>(${IND.filter((i) => i.tema === t).length})</small></button>`).join("");
    q("temas").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      est.tema = b.dataset.t;
      est.id = null;
      est.buscar = "";
      q("buscar").value = "";
      pintarVistaInd(clave);
    });
    q("buscar").addEventListener("input", () => { est.buscar = q("buscar").value; pintarLista(clave); });
    q("lista").addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      est.id = b.dataset.id;
      pintarVistaInd(clave);
    });
  }

  function indicadoresDe(clave) {
    const est = estadoVista[clave];
    const txt = est.buscar.trim().toLowerCase();
    const base = txt
      ? IND.filter((i) => VISTAS_IND[clave].temas.includes(i.tema))
      : IND.filter((i) => i.tema === est.tema);
    return base.filter((i) => !txt || i.etiqueta.toLowerCase().includes(txt) || i.tema.toLowerCase().includes(txt));
  }

  function pintarLista(clave) {
    const sec = $("v-" + clave), q = sec.q, est = estadoVista[clave];
    const lista = indicadoresDe(clave);
    q("ayuda-lista").textContent = est.buscar.trim()
      ? `${lista.length} resultado${lista.length === 1 ? "" : "s"} en todos los temas`
      : `${nombreTerritorio()} frente a Colombia`;
    q("lista").innerHTML = lista.length ? lista.map((i) => {
      const tg = tagDe(i);
      return `<button type="button" class="item" data-id="${i.id}" aria-current="${i.id === est.id}">
        <span><b>${esc(i.etiqueta)}</b><small>${i.anio}${VISTAS_IND[clave].temas.length > 1 ? " · " + esc(i.tema) : ""}</small></span>
        <span class="tag tag-${tg.cls}">${tg.txt}</span></button>`;
    }).join("") : `<p class="vacio">Ningún indicador coincide.</p>`;
  }

  function pintarVistaInd(clave) {
    const sec = $("v-" + clave), q = sec.q, est = estadoVista[clave];
    sec.querySelectorAll("[data-territorio]").forEach((e) => (e.textContent = chipTerritorio()));
    q("temas").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === est.tema)));
    const delTema = IND.filter((i) => i.tema === est.tema);
    if (!est.id || !IND.some((i) => i.id === est.id)) est.id = delTema[0].id;
    pintarLista(clave);
    const ind = IND.find((i) => i.id === est.id);

    q("ind-titulo").textContent = ind.etiqueta;
    q("ind-meta").innerHTML = `${esc(ind.unidad)} · año ${ind.anio} · Fuente: ${esc(ind.fuente)}` +
      (ind.sentido === "contexto" ? "" : ` · ${ind.sentido === "peor" ? "un valor más alto es peor" : "un valor más alto es mejor"}`);
    q("ind-nota").textContent = notaInd(ind);
    q("ind-nota").hidden = !notaInd(ind);

    pintarCifras(q("cifras"), ind);
    pintarMapaInd(q, ind);
    pintarSerie(q, ind);
    pintarHistograma(q, ind);
    pintarTablaInd(q, ind);
  }

  function cifra(k, v, d, principal) {
    return `<div class="cifra${principal ? " principal" : ""}"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
  }

  function pintarCifras(cont, ind) {
    const t = valorTerritorio(ind), c = valorColombia(ind);
    const u = ind.unidad;
    const html = [];
    html.push(cifra(esc(nombreTerritorio()), fmtV(t.v, u), esc(t.como), true));
    if (esAditivo(ind)) {
      const pctDe = (base) => (hay(t.v) && base ? fmt1.format((100 * t.v) / base) + " %" : "—");
      html.push(cifra("Colombia", fmtV(ind.colombia, u), "dato nacional"));
      html.push(terr.tipo === "todo"
        ? cifra("Parte del país", pctDe(ind.colombia), "de la población de Colombia")
        : cifra("Parte del Huila", pctDe(ind.huila), `del Huila (${fmtV(ind.huila, u)})`));
      if (terr.tipo === "mun" && hay(t.v)) {
        const p = Math.round(100 * percentil(ind, t.v));
        html.push(cifra("Lugar en el país", `${p} %`, "de los municipios tiene menos habitantes"));
      } else html.push(cifra("Municipios", fmtN.format(codsTerritorio().length), "en el territorio"));
      html.push(cifra("Mediana región Andina", fmtV(ind.mediana_andina, u), "habitantes por municipio"));
      cont.innerHTML = html.join("");
      return;
    }
    html.push(cifra("Colombia", fmtV(c.v, u), esc(c.como)));
    const d = comparacion(ind, t.v, c.v);
    if (d === null) {
      html.push(cifra("Frente al país", "—", "sin base de comparación"));
    } else {
      const signo = d > 0 ? "+" : d < 0 ? "−" : "";
      const lectura = Math.abs(d) < 5 ? "similar a Colombia"
        : ind.sentido === "contexto" ? (d > 0 ? "más alto que Colombia" : "más bajo que Colombia")
        : (ind.sentido === "peor" ? d > 0 : d < 0) ? "peor que Colombia" : "mejor que Colombia";
      html.push(cifra("Frente al país", `${signo}${fmt1.format(Math.abs(d))} %`, lectura));
    }
    // Puesto
    if (ind.sentido === "contexto") {
      if (hay(t.v)) {
        const p = Math.round(100 * percentil(ind, t.v));
        html.push(cifra("Lugar en el país", `${p} %`, `de los municipios tiene un valor menor`));
      } else html.push(cifra("Lugar en el país", "—", "sin dato"));
    } else if (terr.tipo === "todo") {
      html.push(hay(ind.puesto_dep)
        ? cifra("Puesto entre departamentos", `${ind.puesto_dep} <small>de ${ind.n_dep}</small>`, "1 = peor situación")
        : cifra("Puesto entre departamentos", "—", "no hay dato departamental"));
    } else if (terr.tipo === "mun") {
      html.push(hay(t.v)
        ? cifra("Puesto entre municipios", `${fmtN.format(puestoNacional(ind, t.v))} <small>de ${fmtN.format(ind.nacional.length)}</small>`, "1 = peor situación del país")
        : cifra("Puesto entre municipios", "—", "sin dato"));
    } else {
      const cods = codsTerritorio().filter((cd) => hay(valorMun(ind, cd)));
      const malos = cods.filter((cd) => quintil(ind, valorMun(ind, cd)) === 0).length;
      html.push(cifra("En el 20% peor del país", `${malos} <small>de ${cods.length}</small>`, "municipios de la subregión"));
    }
    html.push(hay(ind.mediana_andina)
      ? cifra("Mediana región Andina", fmtV(ind.mediana_andina, u), `${fmtN.format(ind.n_andina)} municipios andinos`)
      : cifra("Mediana región Andina", "—", "sin dato"));
    cont.innerHTML = html.join("");
  }

  function pintarMapaInd(q, ind) {
    const n = fmtN.format(ind.nacional.length);
    q("sub-mapa").textContent = ind.sentido === "contexto"
      ? `Color según el lugar de cada municipio entre los ${n} del país (quintiles).`
      : `Color según la situación de cada municipio frente a los ${n} del país (quintiles, ${ind.anio}).`;
    dibujarMapa(q("mapa"), (cod) => colorQ(ind, quintil(ind, valorMun(ind, cod))), (cod) => {
      const v = valorMun(ind, cod);
      const qq = quintil(ind, v);
      let h = `<div class="t">${esc(NOMBRE[cod])}</div><div class="s">Subregión ${esc(SUBREG[cod])}</div>`;
      h += `<div>${esc(ind.etiqueta)}: <b>${fmtV(v, ind.unidad)}</b></div><div class="s">${etqQ(ind, qq)}</div>`;
      if (hay(v) && ind.sentido !== "contexto") h += `<div class="s">Puesto ${fmtN.format(puestoNacional(ind, v))} de ${n} (1 = peor)</div>`;
      return h;
    });
    const orden = [0, 1, 2, 3, 4];
    q("leyenda").innerHTML = `<span class="tit">${ind.sentido === "contexto" ? "Frente a los municipios del país" : "Situación frente a los municipios del país"}</span>` +
      orden.map((i) => `<span><span class="chip" style="background:${colorQ(ind, i)}"></span>${etqQ(ind, i)}</span>`).join("") +
      (MUNIS.some((m) => !hay(valorMun(ind, m.cod))) ? `<span><span class="chip" style="background:${css("--sin-dato")};border:1px solid var(--borde)"></span>Sin dato</span>` : "");
  }

  // Marcas de eje con números redondos (1, 2, 2,5 o 5 × 10^n).
  function ticks(lo, hi) {
    if (hi <= lo) hi = lo + 1;
    const bruto = (hi - lo) / 4, p10 = Math.pow(10, Math.floor(Math.log10(bruto)));
    const paso = [1, 2, 2.5, 5, 10].map((k) => k * p10).find((k) => k >= bruto);
    const out = [];
    for (let v = Math.floor(lo / paso) * paso; v < hi + paso * 0.999; v += paso) out.push(+v.toPrecision(12));
    return out;
  }
  const anchoTxt = (t) => t.length * 6.9;

  // ---------- gráfico de líneas ----------
  function pintarSerie(q, ind) {
    const cont = q("serie");
    const lineas = [];
    const st = serieTerritorio(ind);
    lineas.push({ nombre: nombreTerritorio(), s: st, color: css("--serie-1"), ancho: 2.6 });
    if (terr.tipo !== "todo") {
      const sh = Object.keys(ind.serie_huila).length ? ind.serie_huila : serieMediana(ind, MUNIS.map((m) => m.cod));
      lineas.push({ nombre: Object.keys(ind.serie_huila).length ? "Huila" : "Huila (mediana)", s: sh, color: css("--serie-1"), ancho: 1.6, guion: "5 4" });
    }
    if (esAditivo(ind)) lineas.splice(1);
    else if (Object.keys(ind.serie_colombia).length) lineas.push({ nombre: "Colombia", s: ind.serie_colombia, color: css("--serie-2"), ancho: 2 });
    const anios = [...new Set(lineas.flatMap((l) => Object.keys(l.s)))].map(Number).sort((a, b) => a - b);
    if (anios.length < 2) {
      q("sub-serie").textContent = "";
      cont.innerHTML = `<p class="vacio">Solo hay un año publicado (${ind.anio}); no hay serie para comparar.</p>`;
      return;
    }
    q("sub-serie").textContent = `${anios[0]}–${anios[anios.length - 1]} · ${ind.unidad}`;
    const vals = lineas.flatMap((l) => Object.values(l.s)).filter(hay);
    const tk = ticks(Math.min(0, ...vals), Math.max(...vals));
    const lo = tk[0], hi = tk[tk.length - 1];
    const uEje = ind.unidad === "%" ? "" : ind.unidad;
    const W = 520, H = 210, m = { l: 12 + 7 * Math.max(...tk.map((v) => fmtV(v, uEje).length)), r: 14, t: 10, b: 24 };
    const x = (a) => m.l + ((a - anios[0]) / (anios[anios.length - 1] - anios[0])) * (W - m.l - m.r);
    const y = (v) => H - m.b - ((v - lo) / (hi - lo)) * (H - m.t - m.b);
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `Evolución de ${ind.etiqueta}` });
    for (const v of tk) {
      svg.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: "eje" }));
      svg.appendChild(svgEl("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, fmtV(v, uEje)));
    }
    const paso = Math.ceil(anios.length / 7);
    const ultimo = anios.length - 1;
    anios.forEach((a, i) => {
      const toca = i === ultimo || (i % paso === 0 && ultimo - i >= paso);
      if (toca) svg.appendChild(svgEl("text", { x: x(a), y: H - 6, "text-anchor": i === ultimo ? "end" : "middle" }, String(a)));
    });
    for (const l of lineas.slice().reverse()) {
      const pts = anios.filter((a) => hay(l.s[a])).map((a) => [x(a), y(l.s[a])]);
      if (!pts.length) continue;
      const attrs = { d: "M" + pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join("L"), fill: "none", stroke: l.color, "stroke-width": l.ancho, "stroke-linejoin": "round" };
      if (l.guion) attrs["stroke-dasharray"] = l.guion;
      svg.appendChild(svgEl("path", attrs));
      const [ux, uy] = pts[pts.length - 1];
      if (!l.guion) svg.appendChild(svgEl("circle", { cx: ux, cy: uy, r: 3, fill: l.color }));
    }
    // capa de lectura por año
    const guia = svgEl("line", { y1: m.t, y2: H - m.b, stroke: css("--muted"), "stroke-width": 1, visibility: "hidden" });
    svg.appendChild(guia);
    const zona = svgEl("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" });
    zona.addEventListener("mousemove", (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      const a = anios.reduce((b, c) => (Math.abs(x(c) - px) < Math.abs(x(b) - px) ? c : b));
      guia.setAttribute("x1", x(a)); guia.setAttribute("x2", x(a)); guia.setAttribute("visibility", "visible");
      mostrarTip(ev, `<div class="t">${a}</div>` + lineas.map((l) => `<div>${esc(l.nombre)}: <b>${fmtV(l.s[a], ind.unidad)}</b></div>`).join(""));
    });
    zona.addEventListener("mouseleave", () => { guia.setAttribute("visibility", "hidden"); ocultarTip(); });
    svg.appendChild(zona);
    const ley = `<div class="leyenda-serie">` + lineas.map((l) =>
      `<span><i style="background:${l.color};${l.guion ? "opacity:.55" : ""}"></i>${esc(l.nombre)}</span>`).join("") + `</div>`;
    cont.innerHTML = ley;
    cont.appendChild(svg);
  }

  // ---------- histograma de municipios del país ----------
  function pintarHistograma(q, ind) {
    const cont = q("hist");
    const a = ind.nacional, n = a.length;
    const t = valorTerritorio(ind).v, c = valorColombia(ind).v, r = ind.mediana_andina;
    // Dominio: del mínimo al percentil 95, para que unos pocos extremos no aplasten el gráfico.
    // El territorio se incluye si está por debajo del percentil 99.
    const lo = a[0];
    let hi = a[Math.min(n - 1, Math.floor(n * 0.95))];
    const p99 = a[Math.min(n - 1, Math.floor(n * 0.99))];
    if (hay(t) && t > hi && t <= p99) hi = t;
    if (hi <= lo) hi = lo + 1;
    const nb = 24, ancho = (hi - lo) / nb;
    const bins = new Array(nb).fill(0);
    let resto = 0;
    for (const v of a) {
      if (v > hi) { resto++; bins[nb - 1]++; continue; }
      bins[Math.min(nb - 1, Math.floor((v - lo) / ancho))]++;
    }
    const W = 520, H = 200, m = { l: 14 + 7 * String(Math.max(1, ...bins)).length, r: 12, t: 52, b: 24 };
    const x = (v) => m.l + ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * (W - m.l - m.r);
    const max = Math.max(...bins);
    const y = (k) => H - m.b - (k / max) * (H - m.t - m.b);
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Distribución de los municipios del país" });
    [0, Math.round(max / 2), max].forEach((k) => {
      svg.appendChild(svgEl("line", { x1: m.l, x2: W - m.r, y1: y(k), y2: y(k), class: "eje" }));
      svg.appendChild(svgEl("text", { x: m.l - 6, y: y(k) + 4, "text-anchor": "end" }, String(k)));
    });
    bins.forEach((k, i) => {
      const v0 = lo + i * ancho, v1 = v0 + ancho;
      const qq = quintil(ind, (v0 + v1) / 2);
      const bx = x(v0) + 0.5, bw = Math.max(1, x(v1) - x(v0) - 1);
      const rect = svgEl("rect", { x: bx, y: y(k), width: bw, height: H - m.b - y(k), fill: colorQ(ind, qq) });
      const ult = i === nb - 1 && resto;
      conTip(rect, `<div class="t">${fmtV(v0, ind.unidad)} a ${ult ? "más" : fmtV(v1, ind.unidad)}</div><div>${fmtN.format(k)} municipios</div>`);
      svg.appendChild(rect);
    });
    svg.appendChild(svgEl("text", { x: m.l, y: H - 6, "text-anchor": "start" }, fmtV(lo, ind.unidad)));
    svg.appendChild(svgEl("text", { x: W - m.r, y: H - 6, "text-anchor": "end" }, (resto ? "≥ " : "") + fmtV(hi, ind.unidad)));
    // marcadores
    const marcas = [
      { v: esAditivo(ind) ? null : c, nombre: hay(ind.colombia) ? "Colombia" : "Colombia (mediana)", color: css("--serie-2"), guion: "" },
      { v: r, nombre: "Mediana Andina", color: css("--naranja"), guion: "4 3" },
      { v: t, nombre: nombreTerritorio(), color: css("--tinta"), guion: "" },
    ].filter((mk) => hay(mk.v));
    const usados = [];
    marcas.forEach((mk) => {
      const mx = x(mk.v);
      const txt = `${mk.v > hi ? "▸ " : ""}${mk.nombre} ${fmtV(mk.v, ind.unidad)}`;
      const w = anchoTxt(txt);
      const anchor = mx - w / 2 < 2 ? "start" : mx + w / 2 > W - 2 ? "end" : "middle";
      const x0 = anchor === "start" ? mx : anchor === "end" ? mx - w : mx - w / 2;
      let fila = 0;
      while (usados.some((u) => u.fila === fila && x0 < u.x1 + 8 && x0 + w > u.x0 - 8)) fila++;
      usados.push({ x0, x1: x0 + w, fila });
      const ty = 12 + fila * 15;
      svg.appendChild(svgEl("line", { x1: mx, x2: mx, y1: ty + 4, y2: H - m.b, stroke: mk.color, "stroke-width": mk.nombre === nombreTerritorio() ? 2.2 : 1.6, "stroke-dasharray": mk.guion }));
      svg.appendChild(svgEl("text", { x: mx, y: ty, "text-anchor": anchor, style: `fill:${mk.color};font-weight:600` }, txt));
    });
    cont.replaceChildren(svg);
    q("sub-hist").textContent = `${fmtN.format(n)} municipios con dato en ${ind.anio}. Cada barra cuenta municipios en un rango de valores.`;
    q("pie-hist").textContent = (resto ? `${fmtN.format(resto)} municipios con valores mayores a ${fmtV(hi, ind.unidad)} se suman en la última barra.` : "") +
      (marcas.some((mk) => mk.v > hi) ? " ▸ = valor fuera del rango dibujado." : "");
  }

  // ---------- tabla ----------
  function pintarTablaInd(q, ind) {
    const cods = (terr.tipo === "sub" ? codsTerritorio() : MUNIS.map((m) => m.cod));
    const filas = cods.map((cod) => ({ cod, v: valorMun(ind, cod) }));
    const asc = ind.sentido === "mejor";
    filas.sort((a, b) => (hay(b.v) - hay(a.v)) || (asc ? a.v - b.v : b.v - a.v));
    q("sub-tabla").textContent = (terr.tipo === "sub" ? `Subregión ${terr.valor}. ` : "") +
      (ind.sentido === "contexto" ? "Ordenados de mayor a menor." : "Ordenados de peor a mejor situación. Puesto entre los municipios del país, 1 = peor.");
    const n = fmtN.format(ind.nacional.length);
    let h = `<table><thead><tr><th>Municipio</th><th>Subregión</th><th class="n">${esc(ind.unidad.length > 18 ? "Valor" : ind.unidad)}</th><th>Frente al país</th>` +
      (ind.sentido === "contexto" ? "" : `<th class="n">Puesto de ${n}</th>`) + `</tr></thead><tbody>`;
    for (const f of filas) {
      const qq = quintil(ind, f.v);
      h += `<tr data-cod="${f.cod}"${terr.tipo === "mun" && terr.valor === f.cod ? ' class="sel"' : ""}><td>${esc(NOMBRE[f.cod])}</td><td>${esc(SUBREG[f.cod])}</td>` +
        `<td class="n">${fmtV(f.v, ind.unidad)}</td><td><span class="sit"><span class="chip" style="background:${colorQ(ind, qq)}"></span>${etqQ(ind, qq)}</span></td>` +
        (ind.sentido === "contexto" ? "" : `<td class="n">${hay(f.v) ? fmtN.format(puestoNacional(ind, f.v)) : "—"}</td>`) + `</tr>`;
    }
    h += "</tbody></table>";
    const cont = q("tabla");
    cont.innerHTML = h;
    cont.querySelectorAll("tbody tr").forEach((tr) => tr.addEventListener("click", () => clicMunicipio(tr.dataset.cod)));
    const sel = cont.querySelector("tr.sel");
    cont.scrollTop = sel ? Math.max(0, sel.offsetTop - cont.clientHeight / 2) : 0;
  }

  // =====================================================================
  // ELECCIONES
  // =====================================================================
  const E = T.electoral;
  const ANIOS = Object.keys(E).sort();
  const estEl = { anio: ANIOS[ANIOS.length - 1], corp: "GOBERNADOR", modo: "ganador", opcion: "", comp: "anio" };
  const MODOS = { ganador: "Más votado", pct: "% de una opción" };

  function opcionesDe(m, corp) { return corp === "GOBERNADOR" ? m.candidatos : m.partidos; }
  function etiquetaOp(k, corp) {
    if (corp !== "GOBERNADOR") return titulo(k);
    const [cand, part] = k.split("|");
    return `${titulo(cand)} (${titulo(part)})`;
  }
  const ordenadas = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
  function sumar(anio, corp, cods) {
    const tot = { validos: 0, blanco: 0, nulos: 0, no_marcados: 0, total: 0, op: {} };
    for (const c of cods) {
      const m = E[anio][corp][c];
      if (!m) continue;
      ["validos", "blanco", "nulos", "no_marcados", "total"].forEach((k) => (tot[k] += m[k]));
      for (const [k, v] of Object.entries(opcionesDe(m, corp))) tot.op[k] = (tot.op[k] || 0) + v;
    }
    return tot;
  }

  function iniciarElecciones() {
    const seg = (id, opciones, k) => {
      const el = $(id);
      el.innerHTML = Object.entries(opciones).map(([v, t]) => `<button type="button" data-v="${v}">${esc(t)}</button>`).join("");
      el.addEventListener("click", (ev) => {
        const b = ev.target.closest("button");
        if (!b) return;
        estEl[k] = b.dataset.v;
        if (k !== "modo") estEl.opcion = "";
        pintarElecciones();
      });
    };
    seg("el-corp", CORP, "corp");
    seg("el-anio", Object.fromEntries(ANIOS.map((a) => [a, a])), "anio");
    seg("el-modo", MODOS, "modo");
    $("el-sub-barras").addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-comp]");
      if (b) { estEl.comp = b.dataset.comp; pintarElecciones(); }
    });
    $("el-opcion").addEventListener("change", () => { estEl.opcion = $("el-opcion").value; pintarElecciones(); });
  }

  function pintarElecciones() {
    const { anio, corp, modo } = estEl;
    const otro = ANIOS.find((a) => a !== anio);
    document.querySelectorAll("#v-elecciones [data-territorio]").forEach((e) => (e.textContent = chipTerritorio()));
    [["el-corp", corp], ["el-anio", anio], ["el-modo", modo]].forEach(([id, v]) =>
      $(id).querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v))));
    const datos = E[anio][corp];
    const cods = codsTerritorio();
    const tot = sumar(anio, corp, cods), totOtro = sumar(otro, corp, cods);
    const orden = ordenadas(tot.op);
    const quien = corp === "GOBERNADOR" ? "candidato" : corp === "ALCALDE" ? "partido o coalición del alcalde" : "partido o coalición";

    // opción para el modo %
    const wrap = $("el-opcion-wrap"), sel = $("el-opcion");
    wrap.hidden = modo !== "pct";
    if (!estEl.opcion || !(estEl.opcion in tot.op)) estEl.opcion = orden[0][0];
    sel.innerHTML = orden.slice(0, 40).map(([k]) => `<option value="${esc(k)}">${esc(etiquetaOp(k, corp))}</option>`).join("");
    sel.value = estEl.opcion;

    // Cifras
    const pct = (v, base) => (base ? (100 * v) / base : null);
    const [k1, v1] = orden[0], v2 = orden[1] ? orden[1][1] : 0;
    const dTot = totOtro.total ? pct(tot.total - totOtro.total, totOtro.total) : null;
    const pctBl = pct(tot.blanco, tot.validos), pctBlO = pct(totOtro.blanco, totOtro.validos);
    $("el-cifras").innerHTML = [
      cifra(`Votos totales ${anio}`, fmtN.format(tot.total), hay(dTot) ? `${dTot >= 0 ? "+" : "−"}${fmt1.format(Math.abs(dTot))} % frente a ${otro}` : ""),
      cifra(`Más votado en ${esc(nombreTerritorio())}`, `${fmt1.format(pct(v1, tot.validos))} %`, esc(etiquetaOp(k1, corp)), true),
      cifra("Margen sobre el segundo", `${fmt1.format(pct(v1 - v2, tot.validos))} <small>pp</small>`, orden[1] ? esc(etiquetaOp(orden[1][0], corp)) : ""),
      cifra("Voto en blanco", `${fmt1.format(pctBl)} %`, hay(pctBlO) ? `${fmt1.format(pctBlO)} % en ${otro}` : ""),
      cifra("Nulos y no marcados", `${fmt1.format(pct(tot.nulos + tot.no_marcados, tot.total))} %`, "de los votos totales"),
    ].join("");

    // Ganador por municipio
    const gan = {};
    for (const [cod, m] of Object.entries(datos)) {
      const o = ordenadas(opcionesDe(m, corp));
      gan[cod] = { k: o[0][0], pct: pct(o[0][1], m.validos), margen: pct(o[0][1] - (o[1] ? o[1][1] : 0), m.validos) };
    }

    // Mapa
    let colorDe, leyenda;
    if (modo === "ganador") {
      const cuenta = {};
      Object.values(gan).forEach((g) => (cuenta[g.k] = (cuenta[g.k] || 0) + 1));
      const top = ordenadas(cuenta).slice(0, 3).map(([k]) => k);
      const colores = [css("--serie-1"), css("--serie-3"), css("--c2")];
      colorDe = (c) => { const i = top.indexOf(gan[c].k); return i >= 0 ? colores[i] : css("--otro"); };
      leyenda = `<span class="tit">Más votado en cada municipio</span>` +
        top.map((k, i) => `<span><span class="chip" style="background:${colores[i]}"></span>${esc(etiquetaOp(k, corp))} · ${cuenta[k]} mun.</span>`).join("");
      const resto = Object.keys(gan).length - top.reduce((s, k) => s + cuenta[k], 0);
      if (resto) leyenda += `<span><span class="chip" style="background:${css("--otro")}"></span>Otros · ${resto} mun.</span>`;
      $("el-tit-mapa").textContent = `${CORP[corp]} ${anio}: ${quien} más votado`;
      $("el-sub-mapa").textContent = "Los tres que ganan más municipios llevan color propio.";
    } else {
      const val = (c) => pct(opcionesDe(datos[c], corp)[estEl.opcion] || 0, datos[c].validos);
      const vs = Object.keys(datos).map(val);
      const maxV = Math.max(...vs, 0.0001);
      const cortes = [0, 1, 2, 3, 4].map((i) => (maxV * i) / 5);
      const idx = (v) => Math.min(4, Math.floor((v / maxV) * 5));
      colorDe = (c) => (val(c) === 0 ? css("--sin-dato") : css(`--c${idx(val(c)) + 1}`));
      leyenda = `<span class="tit">% del voto válido</span>` + cortes.map((c0, i) =>
        `<span><span class="chip" style="background:${css(`--c${i + 1}`)}"></span>${fmt1.format(c0)}–${fmt1.format(c0 + maxV / 5)}</span>`).join("") +
        `<span><span class="chip" style="background:${css("--sin-dato")};border:1px solid var(--borde)"></span>Sin votos</span>`;
      $("el-tit-mapa").textContent = `${CORP[corp]} ${anio}: ${etiquetaOp(estEl.opcion, corp)}`;
      $("el-sub-mapa").textContent = "Porcentaje del voto válido en cada municipio.";
    }
    dibujarMapa($("el-mapa"), colorDe, (c) => {
      const m = datos[c], g = gan[c];
      let h = `<div class="t">${esc(NOMBRE[c])}</div><div class="s">Subregión ${esc(SUBREG[c])} · ${fmtN.format(m.validos)} válidos</div>`;
      h += `<div>Más votado: <b>${esc(etiquetaOp(g.k, corp))}</b> ${fmt1.format(g.pct)} %</div><div class="s">Margen ${fmt1.format(g.margen)} pp</div>`;
      if (modo === "pct") h += `<div>${esc(etiquetaOp(estEl.opcion, corp))}: <b>${fmt1.format(pct(opcionesDe(m, corp)[estEl.opcion] || 0, m.validos))} %</b></div>`;
      return h;
    });
    $("el-leyenda").innerHTML = leyenda;

    // Barras: el territorio frente a la otra elección o frente a todo el Huila
    const comp = terr.tipo === "todo" ? "anio" : estEl.comp;
    const totComp = comp === "anio" ? totOtro : sumar(anio, corp, MUNIS.map((m) => m.cod));
    const nomComp = comp === "anio" ? otro : "Huila";
    $("el-tit-barras").textContent = `${CORP[corp]} ${anio} en ${nombreTerritorio()}`;
    $("el-sub-barras").innerHTML = (terr.tipo === "todo" ? "" :
      `<span class="seg seg-mini">${[["anio", "vs " + otro], ["huila", "vs todo el Huila"]].map(([k, t]) =>
        `<button type="button" data-comp="${k}" aria-pressed="${k === comp}">${t}</button>`).join("")}</span> `) +
      `% del voto válido. <span class="leyenda-serie" style="display:inline-flex"><span><i class="b-actual"></i>${esc(nombreTerritorio())} ${anio}</span><span><i class="b-otro"></i>${esc(comp === "anio" ? nombreTerritorio() + " " + otro : "Huila " + anio)}</span></span>`;
    const top = orden.slice(0, 10);
    const pctComp = (k) => (k in totComp.op ? pct(totComp.op[k], totComp.validos) : null);
    const pctBlC = pct(totComp.blanco, totComp.validos);
    const maxP = Math.max(...top.map(([k, v]) => Math.max(pct(v, tot.validos), pctComp(k) || 0)), pctBl || 0, pctBlC || 0, 1);
    const fila = (nom, pa, po, resaltar) => `<div class="barra-fila"${resaltar ? ' style="font-weight:600"' : ""}><span class="nom" title="${esc(nom)}">${esc(nom)}</span>` +
      `<span class="barras2"><span class="b-actual" style="width:${(100 * pa) / maxP}%"></span><span class="b-otro" style="width:${hay(po) ? (100 * po) / maxP : 0}%"></span></span>` +
      `<span class="val">${fmt1.format(pa)}<small> / ${hay(po) ? fmt1.format(po) : "—"}</small></span></div>`;
    let hb = top.map(([k, v]) => fila(etiquetaOp(k, corp), pct(v, tot.validos), pctComp(k), k === estEl.opcion && modo === "pct")).join("");
    hb += fila("Voto en blanco", pctBl, pctBlC);
    if (orden.length > 10) hb += `<p class="pie">${orden.length - 10} opciones más con menos votos no se muestran.</p>`;
    if (comp === "anio" && top.some(([k]) => !(k in totComp.op)))
      hb += `<p class="pie">— : esa opción no se presentó con el mismo nombre en ${otro}${corp === "GOBERNADOR" ? " (los candidatos cambian entre elecciones; use «vs todo el Huila» en una subregión o municipio)" : ""}.</p>`;
    $("el-barras").innerHTML = hb;

    // Tabla
    const filas = Object.keys(datos).filter((c) => terr.tipo !== "sub" || enTerritorio(c));
    filas.sort((a, b) => datos[b].validos - datos[a].validos);
    let h = `<table><thead><tr><th>Municipio</th><th>Subregión</th><th>Más votado</th><th class="n">%</th><th class="n">Margen</th>` +
      (modo === "pct" ? `<th class="n">${esc(etiquetaOp(estEl.opcion, corp).slice(0, 28))}</th>` : "") +
      `<th class="n">Válidos</th><th class="n">vs ${otro}</th></tr></thead><tbody>`;
    for (const c of filas) {
      const m = datos[c], g = gan[c], mo = E[otro][corp][c];
      const dv = mo ? pct(m.total - mo.total, mo.total) : null;
      h += `<tr data-cod="${c}"${terr.tipo === "mun" && terr.valor === c ? ' class="sel"' : ""}><td>${esc(NOMBRE[c])}</td><td>${esc(SUBREG[c])}</td>` +
        `<td>${esc(etiquetaOp(g.k, corp))}</td><td class="n">${fmt1.format(g.pct)}</td><td class="n">${fmt1.format(g.margen)}</td>` +
        (modo === "pct" ? `<td class="n">${fmt1.format(pct(opcionesDe(m, corp)[estEl.opcion] || 0, m.validos))}</td>` : "") +
        `<td class="n">${fmtN.format(m.validos)}</td><td class="n">${hay(dv) ? (dv >= 0 ? "+" : "−") + fmt1.format(Math.abs(dv)) + " %" : "—"}</td></tr>`;
    }
    h += "</tbody></table>";
    $("el-tabla").innerHTML = h;
    $("el-tabla").querySelectorAll("tbody tr").forEach((tr) => tr.addEventListener("click", () => clicMunicipio(tr.dataset.cod)));
    const s = $("el-tabla").querySelector("tr.sel");
    $("el-tabla").scrollTop = s ? Math.max(0, s.offsetTop - $("el-tabla").clientHeight / 2) : 0;
    $("el-tit-tabla").textContent = terr.tipo === "sub" ? `Municipios de la subregión ${terr.valor}` : "Municipios del Huila";
    $("el-nota").textContent = "Porcentajes sobre votos válidos (opciones + en blanco). Margen: diferencia en puntos porcentuales entre el primero y el segundo. \"vs " + otro +
      "\": cambio en el total de votos. Las cifras de Huila o de una subregión suman los municipios" + (corp === "ALCALDE" || corp === "CONCEJO" ? " (cada municipio elige su propia alcaldía y concejo, así que el total es una suma, no una elección)" : "") +
      ". Fuente: Registraduría Nacional, archivos mesa a mesa (MMV) " + ANIOS.join(" y ") + ".";
  }

  // =====================================================================
  // NAVEGACIÓN
  // =====================================================================
  let vista = "problemas";
  function pintar() {
    ocultarTip();
    if (vista === "elecciones") pintarElecciones();
    else if (vista in VISTAS_IND) pintarVistaInd(vista);
  }
  function irA(v) {
    vista = v;
    document.querySelectorAll(".pasos button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.vista === v)));
    document.querySelectorAll(".vista").forEach((s) => (s.hidden = s.id !== "v-" + v));
    try { history.replaceState(null, "", "#" + v); } catch (e) { /* vista previa sin historial */ }
    pintar();
  }

  iniciarTerritorio();
  Object.keys(VISTAS_IND).forEach(iniciarVistaInd);
  iniciarElecciones();
  document.querySelectorAll(".pasos button").forEach((b) => b.addEventListener("click", () => irA(b.dataset.vista)));
  const inicial = (location.hash || "").slice(1);
  irA(["elecciones", "problemas", "caracterizacion", "transferencia"].includes(inicial) ? inicial : "problemas");
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", pintar);
})();
