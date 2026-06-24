/* PRIORITY · Seguimiento de Contrataciones Directas (Logística)
   App 100% local: los datos se guardan en localStorage del navegador. */

(function () {
  "use strict";

  // ---------- Configuración ----------
  const STORAGE_KEY = "priority_expedientes_v1";
  const PRIORIDADES = ["Alta", "Media", "Baja"];
  const ESTADOS = [
    "Pendiente",
    "En evaluación",
    "En proceso",
    "Observado",
    "Adjudicado",
    "Contratado",
    "Finalizado",
    "Anulado",
  ];
  const ESTADOS_CERRADOS = ["Finalizado", "Anulado"];
  const MONEDAS = ["PEN", "USD", "EUR"];
  const ORDEN_PRIORIDAD = { Alta: 0, Media: 1, Baja: 2 };

  const CAMPOS_CSV = [
    "codigo", "objeto", "proveedor", "area", "responsable",
    "monto", "moneda", "prioridad", "estado",
    "fechaIngreso", "fechaLimite", "observaciones",
  ];

  // ---------- Estado de la app ----------
  let items = [];
  const filtro = { q: "", prioridad: "", estado: "" };
  const orden = { key: "fechaLimite", dir: "asc" };
  let editId = null;

  // ---------- Utilidades ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function hoyISO() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  function fmtFecha(iso) {
    if (!iso) return "—";
    const partes = String(iso).split("-");
    if (partes.length !== 3) return iso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function fmtMonto(monto, moneda) {
    const n = Number(monto);
    if (!monto || isNaN(n)) return "—";
    const fmt = n.toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${moneda || ""} ${fmt}`.trim();
  }

  function estaCerrado(estado) {
    return ESTADOS_CERRADOS.includes(estado);
  }

  function estaVencido(item) {
    if (!item.fechaLimite || estaCerrado(item.estado)) return false;
    return item.fechaLimite < hoyISO();
  }

  function diasRestantes(item) {
    if (!item.fechaLimite) return null;
    const lim = new Date(item.fechaLimite + "T00:00:00");
    const hoy = new Date(hoyISO() + "T00:00:00");
    return Math.round((lim - hoy) / 86400000);
  }

  // ---------- Persistencia ----------
  function cargar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(items)) items = [];
    } catch (e) {
      items = [];
    }
  }

  function guardar() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      toast("No se pudo guardar (almacenamiento lleno o bloqueado).");
    }
  }

  // ---------- Filtro + orden ----------
  function visibles() {
    const q = filtro.q.trim().toLowerCase();
    let lista = items.filter((it) => {
      if (filtro.prioridad && it.prioridad !== filtro.prioridad) return false;
      if (filtro.estado && it.estado !== filtro.estado) return false;
      if (q) {
        const blob = [
          it.codigo, it.objeto, it.proveedor, it.area,
          it.responsable, it.observaciones,
        ].join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    const { key, dir } = orden;
    const signo = dir === "asc" ? 1 : -1;
    lista.sort((a, b) => {
      let va = a[key], vb = b[key];
      if (key === "prioridad") {
        va = ORDEN_PRIORIDAD[va] ?? 9;
        vb = ORDEN_PRIORIDAD[vb] ?? 9;
      } else if (key === "monto") {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      } else {
        va = String(va == null ? "" : va).toLowerCase();
        vb = String(vb == null ? "" : vb).toLowerCase();
      }
      if (va < vb) return -1 * signo;
      if (va > vb) return 1 * signo;
      return 0;
    });
    return lista;
  }

  // ---------- Render ----------
  function render() {
    renderKpis();
    renderTabla();
    renderCabeceraOrden();
  }

  function renderKpis() {
    const activos = items.filter((it) => !estaCerrado(it.estado));
    const vencidos = items.filter(
      (it) => estaVencido(it) || (diasRestantes(it) !== null && diasRestantes(it) >= 0 && diasRestantes(it) <= 3 && !estaCerrado(it.estado))
    );
    const montoPorMoneda = {};
    activos.forEach((it) => {
      const n = Number(it.monto);
      if (!isNaN(n) && n) {
        const m = it.moneda || "—";
        montoPorMoneda[m] = (montoPorMoneda[m] || 0) + n;
      }
    });
    const montoTxt = Object.keys(montoPorMoneda).length
      ? Object.entries(montoPorMoneda)
          .map(([m, v]) => fmtMonto(v, m))
          .join("  ·  ")
      : "—";

    $("#kpi-total").textContent = items.length;
    $("#kpi-activos").textContent = activos.length;
    $("#kpi-vencidos").textContent = vencidos.length;
    $("#kpi-monto").textContent = montoTxt;
    $("#kpi-monto").style.fontSize = montoTxt.length > 16 ? "18px" : "26px";
  }

  function renderTabla() {
    const lista = visibles();
    const tbody = $("#tbody");
    const vacio = $("#vacio");

    if (!lista.length) {
      tbody.innerHTML = "";
      vacio.classList.remove("hidden");
      $("#footer-count").textContent = `${items.length} expediente${items.length === 1 ? "" : "s"}`;
      return;
    }
    vacio.classList.add("hidden");

    tbody.innerHTML = lista.map(filaHTML).join("");

    // listeners de acciones
    $$("#tbody [data-edit]").forEach((b) =>
      b.addEventListener("click", () => abrirModal(b.getAttribute("data-edit")))
    );
    $$("#tbody [data-del]").forEach((b) =>
      b.addEventListener("click", () => eliminar(b.getAttribute("data-del")))
    );

    const total = items.length;
    const mostrados = lista.length;
    $("#footer-count").textContent =
      mostrados === total
        ? `${total} expediente${total === 1 ? "" : "s"}`
        : `${mostrados} de ${total} expedientes`;
  }

  function filaHTML(it) {
    const vencido = estaVencido(it);
    const dias = diasRestantes(it);
    let vencTag = "";
    if (vencido) {
      vencTag = `<span class="venc-tag">Vencido hace ${Math.abs(dias)} d</span>`;
    } else if (dias !== null && dias >= 0 && dias <= 3 && !estaCerrado(it.estado)) {
      vencTag = `<span class="venc-tag" style="color:var(--warn)">Vence en ${dias} d</span>`;
    }

    const prioClase = "prio-" + (it.prioridad || "").toLowerCase();

    return `
      <tr class="${vencido ? "row-vencido" : ""}">
        <td class="cell-codigo">${esc(it.codigo)}</td>
        <td class="cell-objeto">${esc(it.objeto)}</td>
        <td class="${it.proveedor ? "" : "muted-cell"}">${esc(it.proveedor) || "—"}</td>
        <td class="${it.area ? "" : "muted-cell"}">${esc(it.area) || "—"}</td>
        <td class="${it.responsable ? "" : "muted-cell"}">${esc(it.responsable) || "—"}</td>
        <td class="num">${esc(fmtMonto(it.monto, it.moneda))}</td>
        <td><span class="badge ${prioClase}">${esc(it.prioridad)}</span></td>
        <td><span class="badge estado" data-e="${esc(it.estado)}">${esc(it.estado)}</span></td>
        <td>${fmtFecha(it.fechaLimite)}${vencTag}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-edit="${it.id}" title="Editar">✎</button>
            <button class="icon-btn danger" data-del="${it.id}" title="Eliminar">🗑</button>
          </div>
        </td>
      </tr>`;
  }

  function renderCabeceraOrden() {
    $$("#tabla thead th").forEach((th) => {
      th.classList.remove("sorted-asc", "sorted-desc");
      if (th.getAttribute("data-sort") === orden.key) {
        th.classList.add(orden.dir === "asc" ? "sorted-asc" : "sorted-desc");
      }
    });
  }

  // ---------- Modal / formulario ----------
  function abrirModal(id) {
    editId = id || null;
    const it = id ? items.find((x) => x.id === id) : null;
    $("#modal-titulo").textContent = it ? "Editar expediente" : "Nuevo expediente";

    $("#f-id").value = it ? it.id : "";
    $("#f-codigo").value = it ? it.codigo : "";
    $("#f-objeto").value = it ? it.objeto : "";
    $("#f-proveedor").value = it ? it.proveedor || "" : "";
    $("#f-area").value = it ? it.area || "" : "";
    $("#f-responsable").value = it ? it.responsable || "" : "";
    $("#f-monto").value = it ? it.monto ?? "" : "";
    $("#f-moneda").value = it ? it.moneda || "PEN" : "PEN";
    $("#f-prioridad").value = it ? it.prioridad : "Media";
    $("#f-estado").value = it ? it.estado : "Pendiente";
    $("#f-fechaIngreso").value = it ? it.fechaIngreso || "" : hoyISO();
    $("#f-fechaLimite").value = it ? it.fechaLimite || "" : "";
    $("#f-observaciones").value = it ? it.observaciones || "" : "";

    $("#modal").classList.remove("hidden");
    setTimeout(() => $("#f-codigo").focus(), 50);
  }

  function cerrarModal() {
    $("#modal").classList.add("hidden");
    editId = null;
  }

  function guardarDesdeForm(ev) {
    ev.preventDefault();
    const codigo = $("#f-codigo").value.trim();
    const objeto = $("#f-objeto").value.trim();
    if (!codigo || !objeto) {
      toast("Código y objeto son obligatorios.");
      return;
    }

    const datos = {
      codigo,
      objeto,
      proveedor: $("#f-proveedor").value.trim(),
      area: $("#f-area").value.trim(),
      responsable: $("#f-responsable").value.trim(),
      monto: $("#f-monto").value ? Number($("#f-monto").value) : "",
      moneda: $("#f-moneda").value,
      prioridad: $("#f-prioridad").value,
      estado: $("#f-estado").value,
      fechaIngreso: $("#f-fechaIngreso").value,
      fechaLimite: $("#f-fechaLimite").value,
      observaciones: $("#f-observaciones").value.trim(),
    };

    const id = $("#f-id").value;
    if (id) {
      const idx = items.findIndex((x) => x.id === id);
      if (idx >= 0) items[idx] = Object.assign({}, items[idx], datos, { actualizado: Date.now() });
      toast("Expediente actualizado.");
    } else {
      items.push(Object.assign({ id: uid(), creado: Date.now() }, datos));
      toast("Expediente agregado.");
    }
    guardar();
    cerrarModal();
    render();
  }

  function eliminar(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (!confirm(`¿Eliminar el expediente "${it.codigo}"?\nEsta acción no se puede deshacer.`)) return;
    items = items.filter((x) => x.id !== id);
    guardar();
    render();
    toast("Expediente eliminado.");
  }

  // ---------- CSV (exportar / importar) ----------
  function csvCampo(v) {
    const s = String(v == null ? "" : v);
    if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function exportarCSV() {
    if (!items.length) {
      toast("No hay expedientes para exportar.");
      return;
    }
    const cabecera = CAMPOS_CSV.join(",");
    const filas = items.map((it) =>
      CAMPOS_CSV.map((c) => csvCampo(it[c])).join(",")
    );
    const contenido = "\uFEFF" + [cabecera].concat(filas).join("\r\n");
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contrataciones_${hoyISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exportados ${items.length} expedientes.`);
  }

  function parseCSV(texto) {
    texto = texto.replace(/^﻿/, "");
    const filas = [];
    let campo = "", fila = [], dentro = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i], sig = texto[i + 1];
      if (dentro) {
        if (c === '"' && sig === '"') { campo += '"'; i++; }
        else if (c === '"') { dentro = false; }
        else { campo += c; }
      } else {
        if (c === '"') { dentro = true; }
        else if (c === "," ) { fila.push(campo); campo = ""; }
        else if (c === "\r") { /* ignora */ }
        else if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; }
        else { campo += c; }
      }
    }
    if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter((f) => f.some((x) => String(x).trim() !== ""));
  }

  function importarCSV(texto) {
    const filas = parseCSV(texto);
    if (filas.length < 2) {
      toast("El archivo no tiene datos para importar.");
      return;
    }
    const cabecera = filas[0].map((h) => h.trim().toLowerCase());
    const idx = {};
    CAMPOS_CSV.forEach((c) => { idx[c] = cabecera.indexOf(c.toLowerCase()); });

    if (idx.codigo < 0 || idx.objeto < 0) {
      toast('El CSV debe incluir al menos las columnas "codigo" y "objeto".');
      return;
    }

    let nuevos = 0;
    for (let i = 1; i < filas.length; i++) {
      const f = filas[i];
      const get = (k) => (idx[k] >= 0 ? (f[idx[k]] || "").trim() : "");
      const codigo = get("codigo");
      if (!codigo) continue;

      let prioridad = get("prioridad");
      if (!PRIORIDADES.includes(prioridad)) prioridad = "Media";
      let estado = get("estado");
      if (!ESTADOS.includes(estado)) estado = "Pendiente";
      let moneda = get("moneda") || "PEN";
      const montoRaw = get("monto").replace(/[^\d.,-]/g, "").replace(",", ".");
      const monto = montoRaw ? Number(montoRaw) : "";

      items.push({
        id: uid(),
        codigo,
        objeto: get("objeto"),
        proveedor: get("proveedor"),
        area: get("area"),
        responsable: get("responsable"),
        monto: isNaN(monto) ? "" : monto,
        moneda,
        prioridad,
        estado,
        fechaIngreso: normalizarFecha(get("fechaIngreso")),
        fechaLimite: normalizarFecha(get("fechaLimite")),
        observaciones: get("observaciones"),
        creado: Date.now(),
      });
      nuevos++;
    }
    guardar();
    render();
    toast(`Importados ${nuevos} expedientes.`);
  }

  function normalizarFecha(s) {
    if (!s) return "";
    s = s.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
      let [, d, mo, a] = m;
      if (a.length === 2) a = "20" + a;
      return `${a}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    return "";
  }

  // ---------- Datos de ejemplo ----------
  function cargarEjemplos() {
    const hoy = new Date();
    const dPlus = (n) => {
      const d = new Date(hoy);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const ejemplos = [
      { codigo: "CD-2026-0148", objeto: "Servicio de transporte de carga refrigerada", proveedor: "Transportes Andinos SAC", area: "Distribución", responsable: "M. Rojas", monto: 84500, moneda: "PEN", prioridad: "Alta", estado: "En proceso", fechaIngreso: dPlus(-12), fechaLimite: dPlus(2), observaciones: "Ruta Lima–Arequipa, requiere cadena de frío." },
      { codigo: "CD-2026-0151", objeto: "Alquiler de montacargas eléctricos (4 und.)", proveedor: "Logística Total EIRL", area: "Almacenes", responsable: "J. Paredes", monto: 32000, moneda: "PEN", prioridad: "Media", estado: "Adjudicado", fechaIngreso: dPlus(-20), fechaLimite: dPlus(10), observaciones: "" },
      { codigo: "CD-2026-0153", objeto: "Suministro de pallets de madera tratada", proveedor: "Maderas del Sur", area: "Almacenes", responsable: "M. Rojas", monto: 15800, moneda: "PEN", prioridad: "Baja", estado: "Contratado", fechaIngreso: dPlus(-30), fechaLimite: dPlus(20), observaciones: "Entrega parcial programada." },
      { codigo: "CD-2026-0160", objeto: "Servicio de agenciamiento de aduanas", proveedor: "—", area: "Comercio Exterior", responsable: "L. Quispe", monto: 12000, moneda: "USD", prioridad: "Alta", estado: "Observado", fechaIngreso: dPlus(-6), fechaLimite: dPlus(-1), observaciones: "Pendiente subsanar documentación del proveedor." },
      { codigo: "CD-2026-0162", objeto: "Mantenimiento preventivo de flota (10 unidades)", proveedor: "Servicentro Norte", area: "Flota", responsable: "J. Paredes", monto: 27500, moneda: "PEN", prioridad: "Media", estado: "Pendiente", fechaIngreso: dPlus(-2), fechaLimite: dPlus(7), observaciones: "" },
    ];
    ejemplos.forEach((e) => items.push(Object.assign({ id: uid(), creado: Date.now() }, e)));
    guardar();
    render();
    toast("Se cargaron 5 expedientes de ejemplo.");
  }

  function borrarTodo() {
    if (!items.length) { toast("No hay datos para borrar."); return; }
    if (!confirm(`¿Borrar TODOS los ${items.length} expedientes?\nEsta acción no se puede deshacer.`)) return;
    items = [];
    guardar();
    render();
    toast("Se borraron todos los datos.");
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
  }

  // ---------- Inicialización ----------
  function poblarSelects() {
    const opt = (v) => `<option value="${v}">${v}</option>`;
    $("#f-prioridad").innerHTML = PRIORIDADES.map(opt).join("");
    $("#f-estado").innerHTML = ESTADOS.map(opt).join("");
    $("#f-moneda").innerHTML = MONEDAS.map(opt).join("");
    $("#filtro-prioridad").innerHTML =
      '<option value="">Toda prioridad</option>' + PRIORIDADES.map(opt).join("");
    $("#filtro-estado").innerHTML =
      '<option value="">Todo estado</option>' + ESTADOS.map(opt).join("");
  }

  function conectarEventos() {
    $("#btn-nuevo").addEventListener("click", () => abrirModal(null));
    $("#btn-nuevo-2").addEventListener("click", () => abrirModal(null));
    $("#btn-ejemplos").addEventListener("click", cargarEjemplos);
    $("#modal-close").addEventListener("click", cerrarModal);
    $("#btn-cancelar").addEventListener("click", cerrarModal);
    $("#form").addEventListener("submit", guardarDesdeForm);
    $("#modal").addEventListener("click", (e) => {
      if (e.target.id === "modal") cerrarModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#modal").classList.contains("hidden")) cerrarModal();
    });

    $("#buscar").addEventListener("input", (e) => {
      filtro.q = e.target.value;
      renderTabla();
    });
    $("#filtro-prioridad").addEventListener("change", (e) => {
      filtro.prioridad = e.target.value;
      renderTabla();
    });
    $("#filtro-estado").addEventListener("change", (e) => {
      filtro.estado = e.target.value;
      renderTabla();
    });
    $("#btn-limpiar").addEventListener("click", () => {
      filtro.q = ""; filtro.prioridad = ""; filtro.estado = "";
      $("#buscar").value = "";
      $("#filtro-prioridad").value = "";
      $("#filtro-estado").value = "";
      renderTabla();
    });

    $$("#tabla thead th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.getAttribute("data-sort");
        if (orden.key === key) {
          orden.dir = orden.dir === "asc" ? "desc" : "asc";
        } else {
          orden.key = key;
          orden.dir = "asc";
        }
        render();
      });
    });

    $("#btn-exportar").addEventListener("click", exportarCSV);
    $("#btn-importar").addEventListener("click", () => $("#file-import").click());
    $("#file-import").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => importarCSV(ev.target.result);
      reader.readAsText(file, "UTF-8");
      e.target.value = "";
    });

    $("#btn-borrar-todo").addEventListener("click", borrarTodo);
  }

  document.addEventListener("DOMContentLoaded", () => {
    poblarSelects();
    conectarEventos();
    cargar();
    render();
  });
})();
