/* PRIORITY · Seguimiento de Requerimientos · Logística UPROG
   App 100% local: datos, configuración y pestañas se guardan en localStorage. */

(function () {
  "use strict";

  // ---------- Claves de almacenamiento ----------
  const STORAGE_KEY = "priority_requerimientos_v1";
  const CONFIG_KEY = "priority_config_v1";
  const TABS_KEY = "priority_tabs_v1";
  const ACTIVA_KEY = "priority_tab_activa";
  const ZOOM_KEY = "priority_zoom";

  // Campos para exportar / importar CSV
  const CAMPOS_CSV = [
    "nro", "pestana", "fechaIngreso", "expLogistica", "expDireccion", "docArea",
    "areaEstrategica", "areaUsuaria", "tipo", "denominacion", "item",
    "especialista", "fechaPase", "estado", "prioridad", "observaciones",
    "tengoExp", "aCargo",
  ];

  const ENCABEZADOS_CSV = {
    nro: "N°", pestana: "Pestaña", fechaIngreso: "Fecha ingreso a UPROG",
    expLogistica: "N° Exp. Logística", expDireccion: "N° Exp. Dirección",
    docArea: "N° de documento del área", areaEstrategica: "Área usuaria estratégica",
    areaUsuaria: "Área usuaria", tipo: "Tipo", denominacion: "Denominación del requerimiento",
    item: "Ítem", especialista: "Especialista a cargo", fechaPase: "Fecha de pase a especialista",
    estado: "Estado del requerimiento", prioridad: "Prioridad",
    observaciones: "Observaciones", tengoExp: "¿Tengo el expediente?", aCargo: "¿A mi cargo?",
  };

  // Tipo de editor en línea por campo (lo no listado es texto)
  const FIELD_EDITOR = {
    fechaIngreso: "date", fechaPase: "date",
    prioridad: "select", estado: "select", tipo: "select",
    aCargo: "select", tengoExp: "select", pestana: "select",
    observaciones: "textarea",
  };
  // Campos de texto que se editan en el cuadro amplio multilínea
  const MULTILINEA = new Set(["observaciones", "denominacion", "docArea", "areaEstrategica", "areaUsuaria", "item"]);

  // Campos con sugerencias de valores ya usados (autocompletado)
  const AUTOCOMP = new Set(["areaEstrategica", "areaUsuaria", "especialista", "docArea", "item"]);
  // Campos cuyo texto alimenta el diccionario de predicción de palabras
  const CAMPOS_TEXTO_VOCAB = ["docArea", "areaEstrategica", "areaUsuaria", "item", "denominacion", "observaciones", "especialista"];

  function normalizarTxt(str) {
    return String(str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function valoresFrecuentes(field) {
    const freq = {};
    items.forEach((it) => {
      const v = String(it[field] || "").trim();
      if (v) freq[v] = (freq[v] || 0) + 1;
    });
    return Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
  }
  function construirVocabulario() {
    const freq = {};
    items.forEach((it) => {
      CAMPOS_TEXTO_VOCAB.forEach((f) => {
        String(it[f] || "").split(/[^0-9A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1\u00dc\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00fc\u00b0\.\-\/]+/).forEach((w) => {
          if (w.length >= 3) freq[w] = (freq[w] || 0) + 1;
        });
      });
    });
    return freq;
  }
  function predecirPalabra(vocab, palabra) {
    if (!palabra || palabra.length < 2) return null;
    const p = normalizarTxt(palabra);
    let mejor = null, mejorF = 0;
    for (const w in vocab) {
      if (w.length <= palabra.length) continue;
      if (normalizarTxt(w).indexOf(p) === 0 && vocab[w] > mejorF) { mejor = w; mejorF = vocab[w]; }
    }
    return mejor;
  }
  // Frases frecuentes de Observaciones: segmentos entre "/" que se repiten en tus datos
  function frasesFrecuentes() {
    const freq = {};
    items.forEach((it) => {
      String(it.observaciones || "").split("/").forEach((s) => {
        s = s.trim();
        if (s.length >= 3 && s.length <= 40 && !/^\d/.test(s)) freq[s] = (freq[s] || 0) + 1;
      });
    });
    return Object.keys(freq).filter((f) => freq[f] >= 2)
      .sort((a, b) => freq[b] - freq[a]).slice(0, 8);
  }
  // ¿Los dos textos dicen prácticamente lo mismo? Se usa para no repetir la
  // denominación bajo el ítem cuando solo le agrega palabras de trámite
  // ("SOLICITO ADQUISICION DE… PARA EL SERVICIO DE…"). Compara por palabras, así
  // que tolera variantes como «3» vs «TRES» o erratas sueltas.
  const PALABRAS_VACIAS = new Set(["DE", "DEL", "LA", "EL", "LOS", "LAS", "PARA", "POR",
    "CON", "UN", "UNA", "Y", "EN", "AL", "SE", "SU", "SOLICITO", "SOLICITUD", "REQUERIMIENTO",
    "ADQUISICION", "SERVICIO", "REMITO", "SOLICITADO", "HNAL", "PERSISTENCIA", "NECESIDAD"]);
  function seParecen(a, b) {
    const palabras = (s) => String(s || "").toUpperCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^0-9A-Z ]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !PALABRAS_VACIAS.has(w));
    const x = palabras(a), y = palabras(b);
    if (!x.length || !y.length) return false;
    const corto = x.length <= y.length ? x : y;
    const largo = new Set(x.length <= y.length ? y : x);
    const comunes = corto.filter((w) => largo.has(w)).length;
    return comunes / corto.length >= 0.6;   // el corto ya está casi todo en el largo
  }
  function buscarDuplicado(val, exceptoId) {
    val = String(val == null ? "" : val).trim();
    if (!val) return null;
    return items.find((x) => x.id !== exceptoId && String(x.expLogistica || "").trim() === val) || null;
  }
  function poblarDatalist(idDl, field) {
    const dl = $("#" + idDl);
    if (dl) dl.innerHTML = valoresFrecuentes(field).slice(0, 20).map((v) => `<option value="${esc(v)}"></option>`).join("");
  }

  // Listas configurables por defecto (el usuario puede cambiarlas en ⚙ Configurar)
  const DEF_CONFIG = {
    // Cinco pasos: solo los momentos en que el expediente SE QUEDA esperando algo.
    // Certificar y entregar no son estados: se hacen de corrido y cierran el caso.
    // Color: gris = sin empezar · AZUL = me toca a mí · ÁMBAR = espero a otros ·
    // verde = cerrado · rojo = detenido (excepción, fuera del flujo).
    estados: [
      { nombre: "PENDIENTE", color: "#6b7280" },              // llegó; aún no lo empiezo
      { nombre: "INDAGACIÓN", color: "#3b56d6" },             // invito a postores y espero cotizaciones
      { nombre: "EN VALIDACIÓN", color: "#c77700" },          // con Grisel → área usuaria
      { nombre: "ESPERANDO PRESUPUESTO", color: "#a86400" },  // validado; en cola de presupuesto
      { nombre: "TERMINADO", color: "#0e8a6a" },              // certificado y entregado (se archiva)
      { nombre: "OBSERVADO", color: "#d63b4b" },              // detenido: hay que corregir algo
    ],
    tipos: [
      { nombre: "BIEN", color: "#4a7a2e" },
      { nombre: "INSUMO", color: "#b03a78" },
      { nombre: "SERVICIO", color: "#2f5fd0" },
      { nombre: "ACTIVO NO FINANCIERO", color: "#8a5a00" },
      { nombre: "PACIENTE", color: "#c0392b" },
    ],
    prioridades: [
      { nombre: "Alta", color: "#d63b4b" },
      { nombre: "Media", color: "#c77700" },
      { nombre: "Baja", color: "#1f9d57" },
    ],
  };

  const DEF_TABS = [
    { id: "t1", nombre: "Heredados" },
    { id: "t2", nombre: "Mi trabajo" },
    { id: "t3", nombre: "Terminados" },
  ];

  const PALETA = ["#3b56d6", "#1f9d57", "#c77700", "#d63b4b", "#7b3fd1", "#2f5fd0",
    "#b03a78", "#15824a", "#8a5a00", "#0f8a8a", "#6b7280", "#c0392b"];

  const SINO = ["", "SÍ", "NO"];

  // Datos reales de JUNIO (cargables con un botón). Inyectados desde el Excel original.
  const DATOS_JUNIO = /*__DATOS_JUNIO__*/[{"nro":"1","fechaIngreso":"2026-02-26","expLogistica":"2728","expDireccion":"4249","docArea":"NOTA INFORMATIVA N°040-2026-DP-HNAL","areaEstrategica":"UNIDAD FUNCIONAL DE MAMIS - DPTO DE PEDIATRIA","areaUsuaria":"UNIDAD FUNCIONAL DE MAMIS - DPTO DE PEDIATRIA","tipo":"BIEN","denominacion":"SOLICITO ADQUISICION DE UN (01) ESTANTE DE MELAMINA PARA LA U.F MAMIS DE DPTO DE PEDIATRIA","item":"ESTANTE DE MELAMINA","especialista":"","fechaPase":"2026-06-03","estado":"INVITACION","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"2","fechaIngreso":"2026-04-21","expLogistica":"5733","expDireccion":"8151","docArea":"NOTA INFORMATIVA N°072-2026-DP-HNAL","areaEstrategica":"SERVICIO PEDIATRIA","areaUsuaria":"SERVICIO PEDIATRIA","tipo":"BIEN","denominacion":"ADQUISICION DE TRES CHOCHES METALICOS PARA TRANSPORTE DE MEDICAMENTOS","item":"3 COCHES METALICOS PARA TRANSPORTE DE MEDICAMENTOS","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"3","fechaIngreso":"2026-02-17","expLogistica":"2132","expDireccion":"2173","docArea":"NOTA INFORMATIVA N°18-2026/DRX-J-HNAL","areaEstrategica":"DPTO DIAGNOSTICO POR IMÁGENES","areaUsuaria":"DPTO DIAGNOSTICO POR IMÁGENES","tipo":"BIEN","denominacion":"ADQUISICION DE ACCESORIOS DE FLAT PANEL INALAMBRICO PARA (03) EQUIPOS DE RAYOS X ESTACIONARIO DIGITAL DIRECTO","item":"3 ACCESORIOS DE FLAT PANEL INALAMBRICO PARA (03) EQUIPOS DE RAYOS X ESTACIONARIO DIGITAL DIRECTO","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"4","fechaIngreso":"2026-02-23","expLogistica":"2359","expDireccion":"2626","docArea":"NOTA INFORMATIVA N°423-2026-DEyCC-HNAL","areaEstrategica":"DPTO EMERGENCIA Y CUIDADOS CRITICOS","areaUsuaria":"DPTO EMERGENCIA Y CUIDADOS CRITICOS","tipo":"SERVICIO","denominacion":"SE SOLICITA SERVICIO DE MANTENIMIENTO CORRECTIVO DE MONITORES MULTIPARAMETROS DE SIGNOS VITALES / EDAN","item":"SERVICIO DE MANTENIMIENTO CORRECTIVO DE 6 MONITORES MULTIPARAMETROS DE SIGNOS VITALES / EDAN","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"5","fechaIngreso":"2026-02-27","expLogistica":"2821","expDireccion":"4319","docArea":"NOTA INFORMATIVA N°45-2026-SCIyCC-DEyCC-HNAL","areaEstrategica":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","areaUsuaria":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","tipo":"BIEN","denominacion":"SOLICITO ADQUISICION DE ACCESORIOS PARA EQUIPOS MONITOR MULTIPARAMETROS MARCA MINDRAY DEL SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","item":"ACCESORIOS PARA 4 EQUIPOS MONITOR MULTIPARAMETROS MARCA MINDRAY","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"6","fechaIngreso":"2026-05-05","expLogistica":"6387","expDireccion":"9145","docArea":"NOTA INFORMATIVA N°85-2026-SCIyCC-DEyCC-HNAL","areaEstrategica":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","areaUsuaria":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","tipo":"SERVICIO","denominacion":"SOLICITO SERVICIO DE MANTENIMIENTO CORRECTIVO DE VENTILADOR MECANICO DRAGUE DEL SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","item":"2 SERVICIO DE MANTENIMIENTO CORRECTIVO DE VENTILADOR MECANICO DRAGUE","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"7","fechaIngreso":"2026-04-10","expLogistica":"5147","expDireccion":"23147","docArea":"NOTA INFORMATIVA N°32-2026-SC/C.COR-HNAL","areaEstrategica":"SERVICIO DE CARDIOLOGIA Y CUIDADOS CORONARIOS","areaUsuaria":"SERVICIO DE CARDIOLOGIA Y CUIDADOS CORONARIOS","tipo":"BIEN","denominacion":"SOLICITO ADQUISICION DE 02 COCHES DE PARO PARA EL SERVICIO DE CARDIOLOGIA Y CUIDADOS CORONARIOS","item":"ADQUISICION DE 02 COCHES DE PARO","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"8","fechaIngreso":"2026-04-30","expLogistica":"6176","expDireccion":"8811","docArea":"NOTA INFORMATIVA N°905-DF-HNAL-2026","areaEstrategica":"SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR","areaUsuaria":"SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTECIMIENTO DE CANULAS Y PARCHE CARDIOVASCULAR, SOLICITADO POR EL SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR, PARA EL HOSPITAL NACIONAL ARZOBISPO LOAYZA","item":"ABASTECIMIENTO DE CANULAS Y PARCHE CARDIOVASCULAR","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"9","fechaIngreso":"2026-02-27","expLogistica":"2885","expDireccion":"4441","docArea":"NOTA INFORMATIVA N°46-2026-SCIyCC-DEyCC-HNAL","areaEstrategica":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","areaUsuaria":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","tipo":"BIEN","denominacion":"SOLICITO ADQUISICION DE REPUESTOS PARA EQUIPOS MONITOR MULTIPARAMETROS MARCA NIHON KOHDEN DEL SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","item":"REPUESTOS PARA EQUIPOS MONITOR MULTIPARAMETROS MARCA NIHON KOHDEN","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"10","fechaIngreso":"2026-02-16","expLogistica":"2085","expDireccion":"3370","docArea":"NOTA INFORMATIVA N°33-2026/DRX-J-HNAL","areaEstrategica":"DPTO DIAGNOSTICO POR IMÁGENES","areaUsuaria":"DPTO DIAGNOSTICO POR IMÁGENES","tipo":"BIEN","denominacion":"ADQUISICION DE DISPOSITIVOS MEDICOS","item":"ADQUISICION DE DISPOSITIVOS MEDICOS: 1 PERCHERO METALICOS PORTATIL CON RUEDAS Y 1 PECHERO METALICO","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"11","fechaIngreso":"2026-02-19","expLogistica":"2211","expDireccion":"3678","docArea":"NOTA INFORMATIVA N°49-DACQ-HNAL-2026","areaEstrategica":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS","areaUsuaria":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS","tipo":"SERVICIO","denominacion":"SOLICITUD DE SERVICIO DE CALIBRACION Y CERTIFICACION DE EQUIPOS TERMOHIGROMETROS UBICADOS EN LA SALA DE OPERACIONES DEL PAB 6, PERTENECIENTE AL DEPARTAMENTO DE ANESTESIOLOGIA Y CENTROS QUIRURGICOS","item":"SERVICIO DE CALIBRACION Y CERTIFICACION DE EQUIPOS TERMOHIGROMETRO","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"12","fechaIngreso":"2026-02-24","expLogistica":"2446","expDireccion":"25.007285.01","docArea":"NOTA INFORMATIVA N°18-2026-SC/C.COR-HNAL","areaEstrategica":"SERVICIO DE CARDIOLOGIA Y CUIDADOS CORONARIOS","areaUsuaria":"SERVICIO DE CARDIOLOGIA Y CUIDADOS CORONARIOS","tipo":"SERVICIO","denominacion":"REMITO ACTUALIZACION DE TERMINOS DE REFERENCIA PARA EL SERVICIO DE MANTENIMIENTO CORRECTIVO DE VENTILADOR MECANICO MARCA HAMILTON PARA SERVICIO DE CARDIOLOGIA Y CUIDADOS CORONARIOS","item":"SERVICIO DE MANTENIMIENTO CORRECTIVO DE VENTILADOR MECANICO MARCA HAMILTON","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"13","fechaIngreso":"2026-02-18","expLogistica":"2160","expDireccion":"18597","docArea":"NOTA INFORMATIVA N°0007-2026-SC/C.COR-HNAL","areaEstrategica":"SERVICIO DE CARDIOLOGIA Y CUIDADOS CORONARIOS","areaUsuaria":"SERVICIO DE CARDIOLOGIA Y CUIDADOS CORONARIOS","tipo":"BIEN","denominacion":"REMITO ACTUALIZACION DE ESPECIFICACIONES TECNICAS PARA LA ADQUISICION ACCESORIOS PARA ELECTROCARDIOGRAFO PARA EL SERVICIO DE CARDILOGIA Y CUIDADOS CORONARIOS","item":"ADQUISICION ACCESORIOS PARA ELECTROCARDIOGRAFO","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"14","fechaIngreso":"2026-02-27","expLogistica":"2860","expDireccion":"25.007026.02","docArea":"NOTA INFORMATIVA N°054-DN-HNAL-2026","areaEstrategica":"DEPARTAMENTO DE NUTRICION Y DIETETICA","areaUsuaria":"DEPARTAMENTO DE NUTRICION Y DIETETICA","tipo":"BIEN","denominacion":"SOLICITO ADQUISICION DE 02 REFIGERADORAS INDUSTRIALES INCLUIDA LA INSTALACION Y PUESTA EN FUNCIONAMIENTO PARA EL SERVICIO DE ALIMENTACION CENTRAL DEL DPTO NUTRICION Y DIETETICA","item":"ADQUISICION DE 02 REFIGERADORAS INDUSTRIALES INCLUIDA LA INSTALACION Y PUESTA EN FUNCIONAMIENTO","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"15","fechaIngreso":"2026-02-27","expLogistica":"2856","expDireccion":"4016","docArea":"NOTA INFORMATIVA N°39-2026-SCIyCC-DEyCC-HNAL","areaEstrategica":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","areaUsuaria":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","tipo":"BIEN","denominacion":"SOLICITO ADQUISICION DE RESPUESTOS PARA EQUIPOS DESFRIBILADORES DEL SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","item":"ADQUISICION DE RESPUESTOS PARA EQUIPOS DESFRIBILADORES","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"16","fechaIngreso":"2026-02-18","expLogistica":"2168","expDireccion":"2337","docArea":"NOTA INFORMATIVA N°0034-DACQ-HNAL-2026","areaEstrategica":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS","areaUsuaria":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS","tipo":"SERVICIO","denominacion":"REQUERIMIENTO PARA EL SERVICIO DE MANTENIMIENTO PREVENTIVO PARA UNA MAQUINA DE ANESTESIA DRAGER PERTENECIENTE AL DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS","item":"SERVICIO DE MANTENIMIENTO PREVENTIVO PARA UNA MAQUINA DE ANESTESIA DRAGER","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"17","fechaIngreso":"2026-05-08","expLogistica":"6536","expDireccion":"9418","docArea":"NOTA INFORMATIVA N°0143-DACQ-HNAL-2027","areaEstrategica":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS","areaUsuaria":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS","tipo":"BIEN","denominacion":"SOLICITUD DE ADQUISICION DE DOS (02) PISTOLAS PRESURIZADAS PARA LA LIMPIEZA Y ENJUAGUE CON DESTINO A CENTRAL DE ESTERALIAZACION DEL HOSPITAL NACIONAL ARZOBISPO LOAYZA","item":"ADQUISICION DE DOS (02) PISTOLAS PRESURIZADAS PARA LA LIMPIEZA Y ENJUAGUE","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"18","fechaIngreso":"2026-04-29","expLogistica":"3161 (3161)","expDireccion":"4537","docArea":"MEMORANDO N°2116-2026-OSGM-OEA-HNAL","areaEstrategica":"SERVICIO DE PEDIATRIA","areaUsuaria":"SERVICIO DE PEDIATRIA","tipo":"BIEN","denominacion":"SOLICITUD DE REVISION Y EVALUACION DE CUMPLIMIENTO DE LAS ESPECIFICACIONES TECNICAS","item":"ADQUISICION DE ESPIROMETRO","especialista":"","fechaPase":"2026-06-03","estado":"CUADRO COMPARATIVO","prioridad":"Media","observaciones":"CUADRO COMPARATIVO/ FRANK","tengoExp":"NO"},{"nro":"19","fechaIngreso":"2026-02-25","expLogistica":"2590","expDireccion":"19295","docArea":"NOTA INFORMATIVA 024-2026-JSO-HNAL","areaEstrategica":"SERVICIO DE OBSTETRICES","areaUsuaria":"SERVICIO DE OBSTETRICES","tipo":"BIEN","denominacion":"PERSISTENCIA DE LA NECESIDAD DE ADQUISICION CAMILLA METALICA PARA EXAMEN GINECOLOGICO","item":"ADQUISICION DE 4 CAMILLA METALICA PARA EXAMEN GINECOLOGICO","especialista":"","fechaPase":"2026-06-03","estado":"ENTREGADO A GRISEL","prioridad":"Media","observaciones":"VALIDADO/  ENTREGADO A GRISEL","tengoExp":"SÍ"},{"nro":"20","fechaIngreso":"2026-05-29","expLogistica":"2309","expDireccion":"3810","docArea":"MORANDO N°0479-DACQ-HNAL-2026","areaEstrategica":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS (CENTRAL ESTERILIZACION)","areaUsuaria":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS (CENTRAL ESTERILIZACION)","tipo":"BIEN","denominacion":"SE REMITE VALIDACION Y APROBACION DE CUMPLIMIENTO DE LAS ESPECIFICACIONES TECNICAS PARA LA ADQUISICION DE INDICADOR BIOLOGICO DE ESTERELIZIACION A GAS DE OXIDO DE ETILENO PARA EL ABASTECIMIENTO DE DOCE (12) MESES CON DESTINO A CENTRAL DE ESTERALIZACION","item":"INDICADOR BIOLOGICO DE ESTERELIZIACION A GAS DE OXIDO DE ETILENO","especialista":"","fechaPase":"2026-06-03","estado":"DISPONIBILIDAD PRESUPUESTAL","prioridad":"Media","observaciones":"CUADRO COMPARATIVO FRANK/ SE LO LLEVARA LA LIC JUDITH/PARA UNIDAD PRESUPUESTAL","tengoExp":"SÍ"},{"nro":"21","fechaIngreso":"2026-05-14","expLogistica":"6197","expDireccion":"8882","docArea":"MEMORANDUM N°2525-DF-HNAL-2026","areaEstrategica":"SERVICIO DE TORAX Y CARDIOVASCULAR","areaUsuaria":"SERVICIO DE TORAX Y CARDIOVASCULAR","tipo":"BIEN","denominacion":"VALIDACION Y APROBACION DE LAS ESPECIFICACIONES TECNICAS DE VALVULA CARDIACA AORTICA BIOLOGICA #23, SOLICITADO POR EL SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR, PARA EL HNAL","item":"VALVULA CARDIACA AORTICA BIOLOGICA #23","especialista":"","fechaPase":"2026-06-03","estado":"DISPONIBILIDAD PRESUPUESTAL","prioridad":"Media","observaciones":"CUADRO COMPARATIVO/ FRANK/ DISPONIBILIDAD PRESUPUESTAL","tengoExp":"SÍ"},{"nro":"22","fechaIngreso":"2026-04-30","expLogistica":"6200","expDireccion":"8880","docArea":"NOTA INFORMATIVA  N°913-DF-HNAL-2026","areaEstrategica":"SERVICIO DE TORAX Y CARDIOVASCULAR","areaUsuaria":"SERVICIO DE TORAX Y CARDIOVASCULAR","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTECIMIENTO DEVALVULA CARDIACA MITRAL MECANICA #31, SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR, PARA EL HNAL","item":"ABASTECIMIENTO DEVALVULA CARDIACA MITRAL MECANICA #31","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"23","fechaIngreso":"2026-04-04","expLogistica":"3160","expDireccion":"4516","docArea":"NOTA INFORMATIVA N°043-2026-DP-HNAL","areaEstrategica":"SERVICIO DE PEDIATRIA","areaUsuaria":"SERVICIO DE PEDIATRIA","tipo":"BIEN","denominacion":"ADQUISICION DE DOS TENSIOMETROS ANEORIDES PEDIATRICOS PARA EL SERVICIO DE PEDIATRIA","item":"ADQUISICION DE DOS TENSIOMETROS ANEORIDES PEDIATRICOS","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"24","fechaIngreso":"2026-02-04","expLogistica":"1518","expDireccion":"269","docArea":"NOTA INFORMATIVA N°155-DF-HNAL-2026","areaEstrategica":"DPTO DE ENFERMERIA","areaUsuaria":"DPTO DE ENFERMERIA","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTECIMIENTO DE APLICACIONES DE APOSITOS HIDROCELULARES DE POLIURETANO ADHESIVO ESTERIL Y APOSITO HIDRCOLOIDE PARA EL HNAL","item":"ABASTECIMIENTO DE APLICACIONES DE APOSITOS HIDROCELULARES DE POLIURETANO ADHESIVO ESTERIL Y APOSITO HIDRCOLOIDE","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"25","fechaIngreso":"2026-02-23","expLogistica":"2349","expDireccion":"25120.02","docArea":"NOTA INFORMATIVAS N°29-202-SCIyCC-DEyCC-HNAL","areaEstrategica":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","areaUsuaria":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","tipo":"BIEN","denominacion":"SOLICITO ADQUISICION DE RACK PARA MONIORES MULTIPARAMETROS DEL SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","item":"ADQUISICION DE RACK PARA MONIORES MULTIPARAMETROS","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"26","fechaIngreso":"2026-05-27","expLogistica":"7447 (6434)","expDireccion":"9122","docArea":"MEMORANDO N°2573-2026-OSGM-OEA-HNAL","areaEstrategica":"SERVICIO DE GASTOENTEROLOGIA","areaUsuaria":"SERVICIO DE GASTOENTEROLOGIA","tipo":"SERVICIO","denominacion":"SOLICITUD DE REVISION Y EVALUACION DE CUMPLIMIENTO DE LOS TERMINOS DE REFERENCIA","item":"SERVICIO DE MANTENIMIENTO CORRECTIVO DE EQUIPO BIOMEDICO","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"NO"},{"nro":"27","fechaIngreso":"2026-03-23","expLogistica":"4201","expDireccion":"6183","docArea":"NOTA INFORMATIVA N°623-DF-HNAL-2026","areaEstrategica":"SERVICIO DE CIRUGIA DE CABEZA Y CUELLO Y MAXILOFACIAL","areaUsuaria":"SERVICIO DE CIRUGIA DECABEZA Y CUELLO Y MAXILOFACIAL","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTECIMIENTO DE HOJA DE SIERRA, SOLICITADO POR EL SERVICIO DE CIRUGIA DE CABEZA Y CUELLO Y MAXILOFACIAL PARA EL HNAL","item":"ABASTECIMIENTO DE HOJA DE SIERRA","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"28","fechaIngreso":"2026-03-26","expLogistica":"4535","expDireccion":"6545","docArea":"NOTA INFORMATIVA N°627 -DF-HNAL-2026","areaEstrategica":"SERVICIO DE CIRUGIA DE CABEZA Y CUELLO Y MAXILOFACIAL","areaUsuaria":"SERVICIO DE CIRUGIA DECABEZA Y CUELLO Y MAXILOFACIAL","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTECIMIENTO DE BROCAS, SOLICITADO POR EL SERVICIO DE CIRUGIA DE CABEZA Y CABEZA Y  MAXILOFACIAL PARA EL HNAL","item":"ABASTECIMIENTO DE BROCAS","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"29","fechaIngreso":"2026-03-26","expLogistica":"4538","expDireccion":"6543","docArea":"NOTA INFORMATIVA N°618 -DF-HNAL-2026","areaEstrategica":"SERVICIO DE CIRUGIA DE CABEZA Y CUELLO Y MAXILOFACIAL","areaUsuaria":"SERVICIO DE CIRUGIA DECABEZA Y CUELLO Y MAXILOFACIAL","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTECIMIENTO DE CANULAS PARA TRAQUEOSTOMIA, SOLICITADO POR EL SERVICIO DE CIRUGIA DE CABEZA Y CABEZA Y  MAXILOFACIAL PARA EL HNAL","item":"ABASTECIMIENTO DE CANULAS PARA TRAQUEOSTOMIA","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"30","fechaIngreso":"2026-04-17","expLogistica":"5557","expDireccion":"7948","docArea":"NOTA INFORMATIVA N°824-DF-HNAL-2026","areaEstrategica":"DPTO DE EMERGENCIA Y CUIDADOS CRITICOS DEL HNAL","areaUsuaria":"DPTO DE EMERGENCIA Y CUIDADOS CRITICOS DEL HNAL","tipo":"BIEN","denominacion":"REQUERIMIENTO ANUAL DE JERINGA DESCARTABLE 3 ML PARA GASES ARTERIALES Y ELECTROLITOS CON HEPARINA DE LITIO PARA EL DPTO DE EMERGENCIA Y CUIDADOS CRITICOS DEL HNAL","item":"REQUERIMIENTO ANUAL DE JERINGA DESCARTABLE 3 ML PARA GASES ARTERIALES Y ELECTROLITOS CON HEPARINA DE LITIO","especialista":"","fechaPase":"2026-06-03","estado":"INVITACION","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"31","fechaIngreso":"2026-05-04","expLogistica":"6337","expDireccion":"9002","docArea":"NOTA INFORMATIVA N°926-DF-HNAL-2026","areaEstrategica":"SERVICIO DE PEDIATRIA","areaUsuaria":"SERVICIO DE PEDIATRIA","tipo":"BIEN","denominacion":"REQUERIMIENTO  DE MICROCUBETA DESCARTABLE PARA HEMOGLOBINOMETRO PORTATIL X 50 PARA EL SERVICIO DE PEDIATRIA DEL HNAL","item":"REQUERIMIENTO  DE MICROCUBETA DESCARTABLE PARA HEMOGLOBINOMETRO PORTATIL X 50","especialista":"","fechaPase":"2026-06-03","estado":"VALIDADO","prioridad":"Media","observaciones":"04-06-206: VINO LIC. ZOILA FLORIAN / CAMBIO DE FICHA TECNICA. MICROCUBETAS URGENTE/ INVITACION","tengoExp":"NO"},{"nro":"32","fechaIngreso":"2026-05-27","expLogistica":"6944 (6944)","expDireccion":"9891","docArea":"MEMORANDO N°1483 -OP-OEA-HNAL-2026","areaEstrategica":"OFICINA DE PERSONAL","areaUsuaria":"OFICINA DE PERSONAL","tipo":"SERVICIO","denominacion":"REVISION Y EVALUCION DE CUMPLIMIENTO DE LOS TERMINOS DE REFERENCIA - VALIDACION Y COTIZACION","item":"CAPACITACION  - OFIMATICA INTERMEDIO (EXCEL Y WORD)","especialista":"","fechaPase":"2026-06-03","estado":"PARA SALDO","prioridad":"Media","observaciones":"PARA SALDO","tengoExp":"SÍ"},{"nro":"33","fechaIngreso":"2026-01-06","expLogistica":"525","expDireccion":"4692","docArea":"NOTA INFORMATIVA N°002-DMI-HNAL-2026","areaEstrategica":"SERVICIO MEDICINA INTERNA 2-II","areaUsuaria":"SERVICIO MEDICINA INTERNA 2-II","tipo":"BIEN","denominacion":"PERSISTENCIA DE LA NECESIDAD DE BIENES","item":"4 BIOMBOS DE METAL DE CUERPOS","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"34","fechaIngreso":"2026-04-16","expLogistica":"5449","expDireccion":"7780","docArea":"NOTA INFORMATIVA N°75-2026-DEyCC-HNAL","areaEstrategica":"DPTO EMERGENCIA Y CUIDADOS CRITICOS","areaUsuaria":"DPTO EMERGENCIA Y CUIDADOS CRITICOS","tipo":"SERVICIO","denominacion":"SE SOLICITA EL SERVICIO DE MANTENIMIENTO CORRECTIVO DE VENTILADOR MECANICO MARCA DRAGUER","item":"SERVICIO DE MANTENIMIENTO CORRECTIVO DE VENTILADOR MECANICO MARCA DRAGUER","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"35","fechaIngreso":"2026-05-19","expLogistica":"7029","expDireccion":"10072","docArea":"NOTA INFORMATIVA N°0167-DACQ-HNAL-2026","areaEstrategica":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS (CENTRAL ESTERILIZACION)","areaUsuaria":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS (CENTRAL ESTERILIZACION)","tipo":"SERVICIO","denominacion":"REQUERIMIENTO PARA EL SERVICIO DE MANTENIMIENTO CORRECTIVO MOBILIARIO MEDICO UBICADO EN CENTRAL DE ESTERALIZACION DEL HNAL","item":"SERVICIO DE MANTENIMIENTO CORRECTIVO MOBILIARIO MEDICO","especialista":"","fechaPase":"2026-06-03","estado":"INVITACION","prioridad":"Media","observaciones":"INVITACION","tengoExp":"NO"},{"nro":"36","fechaIngreso":"2026-05-05","expLogistica":"6388","expDireccion":"9130","docArea":"NOTA INFORMATIVA N°948-DF-HNAL-2026","areaEstrategica":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS","areaUsuaria":"DPTO ANESTESIOLOGIA Y CENTROS QUIRURGICOS","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTECIMIENTO DE SENSOR BIS PARA EQUIPO DE ANESTESIA, SOLCITADO POR DPTO DE ANESTESIOLOGIA Y CENTROS QUIRURGICOS PARA EL HNAL","item":"ABASTECIMIENTO DE SENSOR BIS PARA EQUIPO DE ANESTESIA","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"37","fechaIngreso":"2026-04-16","expLogistica":"5450","expDireccion":"7778","docArea":"NOTA INFORMATIVA N°795-DF-HNAL-2027","areaEstrategica":"DEPARTAMENTO DE ANESTESIOLOGIA Y CENTROS QUIRURGICOS","areaUsuaria":"DEPARTAMENTO DE ANESTESIOLOGIA Y CENTROS QUIRURGICOS","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTESIMIENTO DE FIBRA OPTICA DESCARTABLE 3.2/1.2 MM X 60 CM PARA BRONCOSCOPIO CON EQUIPOS DE CESION EN USO, SOLICITADO POR EL DEPARTAMENTO DE ANESTESIOLOGIA Y CENTROS QUIRURGICOS PARA EL HNAL","item":"ABASTESIMIENTO DE FIBRA OPTICA DESCARTABLE 3.2/1.2 MM X 60 CM PARA BRONCOSCOPIO CON EQUIPOS DE CESION EN USO","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"38","fechaIngreso":"2026-04-20","expLogistica":"5626","expDireccion":"7431","docArea":"NOTA INFORMATIVA N°292-HNAL-OP-2026","areaEstrategica":"OFICINA DE PERSONAL","areaUsuaria":"OFICINA DE PERSONAL","tipo":"SERVICIO","denominacion":"REQUERIMIENTO DE CAPACITACION ESPECIFICA \"TALLER DE REANIMACION CARDIO PULMONAR NEONATAL AVANZADA\"","item":"REQUERIMIENTO DE CAPACITACION ESPECIFICA \"TALLER DE REANIMACION CARDIO PULMONAR NEONATAL AVANZADA\"","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"39","fechaIngreso":"2026-04-30","expLogistica":"6173","expDireccion":"8809","docArea":"NOTA INFORMATIVA N°907-DF-HNAL-2026","areaEstrategica":"SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR","areaUsuaria":"SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTECIMIENTO DE HEMOCONCENTRADOR Y SET DE TUBULADURA PARA CIRCULACION EXTRACORPOREA, SOLICITADO POR EL SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR, PARA EL HNAL","item":"ABASTECIMIENTO DE HEMOCONCENTRADOR Y SET DE TUBULADURA PARA CIRCULACION EXTRACORPOREA","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"40","fechaIngreso":"2026-03-30","expLogistica":"6172","expDireccion":"8808","docArea":"NOTA INFORMATIVA N°908-DF-HNAL-2026","areaEstrategica":"SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR","areaUsuaria":"SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTECIMIENTO DE CANULAS, FILTRO ARTERIAL PARA CIRCULACION EXTRACOPOREA Y SET DE TUBULADURA, SOLICITADO POR EL SERVICIO DE TORAX Y CARDIOVASCULAR, PARA EL HNAL","item":"ABASTECIMIENTO DE CANULAS, FILTRO ARTERIAL PARA CIRCULACION EXTRACOPOREA Y SET DE TUBULADURA","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"41","fechaIngreso":"2026-04-23","expLogistica":"4196","expDireccion":"6189","docArea":"NOTA INFORMATIVA N°629-DF-HNAL-2026","areaEstrategica":"SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR","areaUsuaria":"SERVICIO DE CIRUGIA DE TORAX Y CARDIOVASCULAR","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTECIMIENTO DE CANULA PARA TRAQUEOSTOMIA #7 EXTRA LARGA CON ANILLO DE SUJECCION MOVIL CON BALON, SOLICITADO POR EL SERVICIO DE TORAX Y CARDIOVASCULAR, PARA EL HNAL","item":"ABASTECIMIENTO DE CANULA PARA TRAQUEOSTOMIA #7 EXTRA LARGA CON ANILLO DE SUJECCION MOVIL CON BALON","especialista":"","fechaPase":"2026-06-03","estado":"ENTREGADO A GRISEL","prioridad":"Media","observaciones":"PARA VALIDAR/ ENTREGADO A GRISEL","tengoExp":"NO"},{"nro":"42","fechaIngreso":"2026-02-27","expLogistica":"2800","expDireccion":"4350","docArea":"NOTA INFORMATIVA N°371-DF-HNAL-2027","areaEstrategica":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","areaUsuaria":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","tipo":"BIEN","denominacion":"REQUERIMIENTO ANUAL DE DISPOSITIVOS MEDICOS PARA EL SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS DEL HNAL","item":"DISPOSITIVOS MEDICOS (SONDA NASOGASTRICA #14 Y #16)","especialista":"","fechaPase":"2026-06-03","estado":"ENTREGADO A GRISEL","prioridad":"Media","observaciones":"PARA VALIDAR/ ENTREGADO A GRISEL","tengoExp":"NO"},{"nro":"43","fechaIngreso":"2026-04-23","expLogistica":"4203","expDireccion":"6186","docArea":"NOTA INFORMATIVA N°625-DF-HNAL-2028","areaEstrategica":"SERVICIO DE CIRUGIA DE CABEZA Y CABEZA Y  MAXILOFACIAL","areaUsuaria":"SERVICIO DE CIRUGIA DE CABEZA Y CABEZA Y  MAXILOFACIAL","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABASTECIMIENTO DE TORNILLOS DE TITANIO SOLICITADO POR EL SERVICIO DE CIRUGIA DE CABEZA Y CABEZA Y  MAXILOFACIAL PARA EL HNAL","item":"ABASTECIMIENTO DE TORNILLOS DE TITANIO","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"44","fechaIngreso":"2026-02-17","expLogistica":"2133","expDireccion":"2104","docArea":"NOTA INFORMATIVA N°0033-DACQ-HNAL-2026","areaEstrategica":"DEPARTAMENTO DE ANESTESIOLOGIA Y CENTROS QUIRURGICOS","areaUsuaria":"DEPARTAMENTO DE ANESTESIOLOGIA Y CENTROS QUIRURGICOS","tipo":"SERVICIO","denominacion":"REQUERIMIENTO PARA EL SERVICIO DE MANTENIMIENTO CORRECTIVO POR CASA ESPECIALIZADA DE UNA (1) MAQUINA DE ANESTESIA DRAGER PERTENECIENTE AL DPTO DE ANESTESIA Y CENTROS QUIRURGICOS","item":"SERVICIO DE MANTENIMIENTO CORRECTIVO POR CASA ESPECIALIZADA DE UNA (1) MAQUINA DE ANESTESIA DRAGER","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"45","fechaIngreso":"2026-02-06","expLogistica":"1699","expDireccion":"12679","docArea":"NOTA INFORMATIVA N°154-OL-J-HNAL-2026","areaEstrategica":"DEPARTAMENTO DE ESTOMATOLOGIA","areaUsuaria":"DEPARTAMENTO DE ESTOMATOLOGIA","tipo":"BIEN","denominacion":"PERSISTENCIA DE LA NECESIDAD DE EQUIPOS MEDICOS","item":"ADQUISICION DE EQUIPOS BIOMEDICOS  (LAMPARA DE FOTOLIMERIZACION - LASER DIODO DE LUZ - SENSOR DE RX)","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"46","fechaIngreso":"2026-02-25","expLogistica":"2583","expDireccion":"1561","docArea":"NOTA INFORMATIVA N°080-2026-OSGM-OEA-HNAL","areaEstrategica":"UNIDAD DE LIMPIEZA Y JARDINES","areaUsuaria":"UNIDAD DE LIMPIEZA Y JARDINES","tipo":"BIEN","denominacion":"ACTUALIZACION DE ADQUISICION DE LUSTRADORAS ELECTRICAS INDUSTRIALES Y ESCOBILLAS DE REPUESTO","item":"ADQUISICION DE LUSTRADORAS ELECTRICAS INDUSTRIALES Y ESCOBILLAS DE REPUESTO","especialista":"","fechaPase":"2026-06-03","estado":"VALIDADO","prioridad":"Media","observaciones":"VALIDADO/","tengoExp":"SÍ"},{"nro":"47","fechaIngreso":"2026-03-10","expLogistica":"3411","expDireccion":"5031","docArea":"NOTA INFORMATIVA N°0297-2026-OSGM-OEA-HNAL","areaEstrategica":"UNIDAD DE LAVANDERIA","areaUsuaria":"UNIDAD DE LAVANDERIA","tipo":"BIEN","denominacion":"SE COMUNICAPRESISTENCIA DE NECESIDAD DE REQUERIMIENTO - ADQUISICION DE ESTANTES DE ACERO INOXIDABLE E INSTALACION PARA LA UNIDAD DE LAVANDERIA HNAL","item":"ADQUISICION DE ESTANTES DE ACERO INOXIDABLE E INSTALACION","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"},{"nro":"48","fechaIngreso":"2026-04-06","expLogistica":"3294","expDireccion":"4898","docArea":"NOTA INFORMATIVA N°461-DF-HNAL-2026","areaEstrategica":"SERVICIO DE CIRUGIA PLASTICA Y QUEMADOS","areaUsuaria":"SERVICIO DE CIRUGIA PLASTICA Y QUEMADOS","tipo":"BIEN","denominacion":"REQUERIMIENTO DE ABATSECIMIENTO DE LAPIZ ELECTROCAUTERIO MONOPOLAR CON PUNTA DESCARABLE Y POLIHEXANIDA UNDECILEMIDOPROPIL BETANIA, SOLICITADO POR EL SERVICIO DE CIRUGIA PLASTICA Y QUEMADOS PARA EL HNAL","item":"ABATSECIMIENTO DE LAPIZ ELECTROCAUTERIO MONOPOLAR CON PUNTA DESCARABLE Y POLIHEXANIDA UNDECILEMIDOPROPIL BETANIA","especialista":"","fechaPase":"2026-06-03","estado":"ENTREGADO A GRISEL","prioridad":"Media","observaciones":"VALIDADO/  ENTREGADO A GRISEL","tengoExp":"SÍ"},{"nro":"49","fechaIngreso":"2026-02-18","expLogistica":"2174","expDireccion":"3557","docArea":"NOTA INFORMATIVA N°37-2026-SCIyCC-DEyCC-HNAL","areaEstrategica":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","areaUsuaria":"SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","tipo":"SERVICIO","denominacion":"SOLICITO SERVICIO DE MANTENIMIENTO CORRECTIVO DE VENTILADOR MECANICO MIDRAY DEL SERVICIO DE CUIDADOS INTENSIVOS Y CUIDADOS INTERMEDIOS","item":"SERVICIO DE MANTENIMIENTO CORRECTIVO DE VENTILADOR MECANICO MIDRAY","especialista":"","fechaPase":"2026-06-04","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"NO"},{"nro":"50","fechaIngreso":"2026-06-02","expLogistica":"7712","expDireccion":"10164","docArea":"NOTA INFORMATIVA N°431-2026-OP-OEA-HNAL","areaEstrategica":"OFICINA DE PERSONAL","areaUsuaria":"OFICINA DE PERSONAL","tipo":"SERVICIO","denominacion":"REQUERIMIENTO DE CURSO \"CAPACITACION INTERINSTITUCIONAL EN ARCHIVO Y TRAMITE DOCUMENTARIO\"","item":"REQUERIMIENTO DE CURSO \"CAPACITACION INTERINSTITUCIONAL EN ARCHIVO Y TRAMITE DOCUMENTARIO\"","especialista":"","fechaPase":"2026-06-03","estado":"PENDIENTE","prioridad":"Media","observaciones":"","tengoExp":"SÍ"}]/*__FIN__*/;

  // ---------- Estado de la app ----------
  let items = [];
  let config = clone(DEF_CONFIG);
  let configDraft = null;
  let tabs = clone(DEF_TABS);
  let pestanaActiva = "t1";
  let zoom = 1;
  let fileHandle = null;  // archivo CSV vinculado (File System Access API)
  let seleccion = new Set();      // ids seleccionados para acciones en lote
  let papelera = [];              // requerimientos eliminados (restaurables)
  const PAPELERA_KEY = "priority_papelera_v1";
  let undoStack = [];             // instantáneas para Deshacer (Ctrl+Z)
  const UNDO_MAX = 50;
  const filtro = { q: "", cargo: "", estado: "", prioridad: "", tipo: "", tengo: "" };
  const orden = { key: "nro", dir: "asc" };

  // Mapas derivados de la configuración
  const COL = { estado: {}, tipo: {}, prioridad: {} };
  let ordenPrioridad = {};

  // ---------- Utilidades ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  const GUION = '<span class="muted-cell">—</span>';

  function hoyISO() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 10);
  }

  function fmtFecha(iso) {
    if (!iso) return "—";
    const p = String(iso).split("-");
    if (p.length !== 3) return iso;
    return `${p[2]}/${p[1]}/${p[0]}`;
  }

  function diasDesde(iso) {
    if (!iso) return null;
    const a = new Date(iso + "T00:00:00");
    const h = new Date(hoyISO() + "T00:00:00");
    return Math.round((h - a) / 86400000);
  }

  function hexToRgb(hex) {
    hex = String(hex || "#6b7280").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    const n = parseInt(hex, 16);
    if (isNaN(n)) return { r: 107, g: 114, b: 128 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function badgeStyle(hex) {
    const { r, g, b } = hexToRgb(hex);
    if (document.documentElement.getAttribute("data-theme") === "dark") {
      // En oscuro: texto aclarado (hacia blanco) sobre un tinte más presente,
      // para que la etiqueta resalte en vez de quedar oscuro sobre oscuro.
      const l = (x) => Math.round(x + (255 - x) * 0.55);
      return `background:rgba(${r},${g},${b},0.20);color:rgb(${l(r)},${l(g)},${l(b)});border-color:rgba(${r},${g},${b},0.38)`;
    }
    const t = (x) => Math.round(x * 0.58);
    return `background:rgba(${r},${g},${b},0.15);color:rgb(${t(r)},${t(g)},${t(b)})`;
  }

  // ---------- Pestañas ----------
  function cargarTabs() {
    try {
      const raw = localStorage.getItem(TABS_KEY);
      const t = raw ? JSON.parse(raw) : null;
      tabs = (Array.isArray(t) && t.length >= 2) ? t : clone(DEF_TABS);
    } catch (e) { tabs = clone(DEF_TABS); }
    try { pestanaActiva = localStorage.getItem(ACTIVA_KEY) || tabs[0].id; }
    catch (e) { pestanaActiva = tabs[0].id; }
    if (!tabs.some((t) => t.id === pestanaActiva)) pestanaActiva = tabs[0].id;
    // Migración única: asegurar la pestaña "Terminados"
    try {
      if (!localStorage.getItem("priority_migr_tab_terminados")) {
        if (!tabs.some((t) => t.id === "t3")) { tabs.push({ id: "t3", nombre: "Terminados" }); guardarTabs(); }
        localStorage.setItem("priority_migr_tab_terminados", "1");
      }
    } catch (e) {}
  }
  function guardarTabs() {
    try { localStorage.setItem(TABS_KEY, JSON.stringify(tabs)); } catch (e) {}
  }
  function tabNombre(id) {
    const t = tabs.find((x) => x.id === id);
    return t ? t.nombre : "—";
  }
  function idTabPorNombre(nombre) {
    if (!nombre) return tabs[0].id;
    const t = tabs.find((x) => x.nombre.toLowerCase() === nombre.trim().toLowerCase());
    return t ? t.id : tabs[0].id;
  }
  function setPestana(id) {
    pestanaActiva = id;
    // La selección es de la vista actual: al cambiar de pestaña se limpia para
    // no aplicar acciones en lote a filas que ya no se ven.
    if (seleccion.size) seleccion.clear();
    try { localStorage.setItem(ACTIVA_KEY, id); } catch (e) {}
    render();
  }
  function renombrarTab(id) {
    const t = tabs.find((x) => x.id === id);
    if (!t) return;
    const nuevo = prompt("Nombre de la pestaña:", t.nombre);
    if (nuevo === null) return;
    const v = nuevo.trim();
    if (!v) return;
    t.nombre = v;
    guardarTabs(); render();
    toast("Pestaña renombrada.");
  }
  function jalarACargo() {
    const destino = tabs[1] ? tabs[1].id : "t2";
    snapshot();
    let n = 0;
    items.forEach((it) => {
      if ((it.aCargo || "") === "SÍ" && it.pestana !== destino) { it.pestana = destino; n++; }
    });
    if (n) guardar(); else descartarSnapshot();
    setPestana(destino);
    toast(n
      ? `Se trajeron ${n} requerimientos a «${tabNombre(destino)}».`
      : "No hay requerimientos marcados «a mi cargo» para traer. Márcalos primero en la columna «A cargo».");
  }
  function destinoTerminados() {
    return tabs.find((t) => t.id === "t3") ? "t3" : (tabs[tabs.length - 1] && tabs[tabs.length - 1].id);
  }
  // ¿El estado es "TERMINADO"? Tolerante a mayúsculas/minúsculas, espacios y tildes,
  // para que el archivado automático no falle con datos importados o renombrados.
  function esTerminado(estado) {
    return normalizarTxt(estado).trim() === "terminado";
  }
  // Si el estado quedó en TERMINADO, mueve el expediente a la pestaña «Terminados».
  // Devuelve true si lo movió. (No hace snapshot/guardar; lo maneja quien lo llama.)
  function autoArchivarTerminado(it) {
    if (!it || !esTerminado(it.estado)) return false;
    const destino = destinoTerminados();
    if (destino && it.pestana !== destino) { it.pestana = destino; return true; }
    return false;
  }
  // Bitácora: anota cada cambio de estado dentro del propio requerimiento.
  function logEstado(it, de, a) {
    de = de == null ? "" : String(de); a = a == null ? "" : String(a);
    if (de === a) return;
    if (!Array.isArray(it.historial)) it.historial = [];
    it.historial.push({ f: Date.now(), de, a });
    if (it.historial.length > 30) it.historial.shift();
  }
  function abrirHistorial(id, btn) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const rect = btn.getBoundingClientRect();
    const back = document.createElement("div"); back.className = "popover-backdrop";
    const pop = document.createElement("div"); pop.className = "cell-popover";
    const lab = document.createElement("div"); lab.className = "cp-label";
    lab.textContent = `Historial de estados · N° ${it.nro || "—"} · Exp. ${it.expLogistica || "—"}`;
    const lista = document.createElement("div"); lista.className = "hist-lista";
    const h = Array.isArray(it.historial) ? it.historial.slice().reverse() : [];
    lista.innerHTML = h.length
      ? h.map((x) => {
          const f = new Date(x.f).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
          return `<div class="hist-item"><span class="hist-fecha">${f}</span><span>${x.de ? esc(x.de) + " → " : ""}<strong>${esc(x.a) || "—"}</strong></span></div>`;
        }).join("")
      : '<div class="hist-vacio">Aún no hay cambios de estado anotados para este requerimiento. Desde ahora se registran solos cada vez que cambies su estado.</div>';
    pop.appendChild(lab); pop.appendChild(lista);
    document.body.appendChild(back); document.body.appendChild(pop);
    const w = Math.min(420, window.innerWidth - 16);
    pop.style.width = w + "px";
    pop.style.left = Math.max(8, Math.min(rect.left - w + 30, window.innerWidth - w - 8)) + "px";
    let top = rect.bottom + 4;
    if (top + pop.offsetHeight + 12 > window.innerHeight) top = Math.max(8, window.innerHeight - pop.offsetHeight - 12);
    pop.style.top = top + "px";
    const cerrar = () => { back.remove(); pop.remove(); document.removeEventListener("keydown", escHandler, true); };
    const escHandler = (e) => { if (e.key === "Escape") { e.stopPropagation(); cerrar(); } };
    back.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", escHandler, true);
  }

  function archivarTerminados() {
    const destino = destinoTerminados();
    if (!destino) return;
    snapshot();
    let n = 0;
    items.forEach((it) => {
      if (esTerminado(it.estado) && it.pestana !== destino) { it.pestana = destino; n++; }
    });
    if (n) { guardar(); render(); } else descartarSnapshot();
    toast(n
      ? `Se archivaron ${n} requerimiento${n === 1 ? "" : "s"} TERMINADO en «${tabNombre(destino)}».`
      : "No hay requerimientos en estado TERMINADO para archivar (cambia el estado a TERMINADO primero).");
  }

  // ---------- Persistencia ----------
  function cargar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(items)) items = [];
    } catch (e) { items = []; }
    // Migración: requerimientos sin pestaña van a la primera
    let changed = false;
    items.forEach((it) => { if (!it.pestana) { it.pestana = tabs[0].id; changed = true; } });
    if (changed) guardar();
  }
  function guardar() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    catch (e) { toast("No se pudo guardar (almacenamiento lleno o bloqueado)."); }
    if (fileHandle) escribirVinculado(false);
  }

  function cargarConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      const c = raw ? JSON.parse(raw) : null;
      config = (c && c.estados && c.tipos && c.prioridades) ? c : clone(DEF_CONFIG);
    } catch (e) { config = clone(DEF_CONFIG); }
    // Migración única: asegurar el estado "TERMINADO"
    try {
      if (!localStorage.getItem("priority_migr_terminado")) {
        if (config.estados && !config.estados.some((e) => String(e.nombre).toUpperCase() === "TERMINADO")) {
          config.estados.push({ nombre: "TERMINADO", color: "#0e8a6a" });
          try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch (e2) {}
        }
        try { localStorage.setItem("priority_migr_terminado", "1"); } catch (e3) {}
      }
    } catch (e) {}
    derivarConfig();
  }

  // Estados antiguos (los heredados del Excel anterior y los de la versión
  // detallada) → los seis pasos actuales. «PARA SALDO» no se toca a propósito:
  // no está claro qué significa, así que se conserva tal cual.
  const MAPA_ESTADOS_2 = {
    // formato heredado
    "INVITACION": "INDAGACIÓN",
    "INVITACIÓN": "INDAGACIÓN",
    "DISPONIBILIDAD PRESUPUESTAL": "ESPERANDO PRESUPUESTO",
    "ENTREGADO A GRISEL": "EN VALIDACIÓN",
    "VALIDADO": "ESPERANDO PRESUPUESTO",
    // Los que estaban certificando siguen abiertos: se dejan en el último paso
    // en espera (no en TERMINADO, para no archivar algo que aún no entregaste).
    "CUADRO COMPARATIVO": "ESPERANDO PRESUPUESTO",
    "CERTIFICANDO": "ESPERANDO PRESUPUESTO",
    // versión detallada intermedia
    "INDAGACIÓN DE MERCADO": "INDAGACIÓN",
    "ESPERANDO COTIZACIONES": "INDAGACIÓN",
    "PREPARANDO VALIDACIÓN": "EN VALIDACIÓN",
    "EN VALIDACIÓN (ÁREA USUARIA)": "EN VALIDACIÓN",
    "PARA CERTIFICAR (SIGA)": "ESPERANDO PRESUPUESTO",
    "ENTREGADO A PLANEAMIENTO": "TERMINADO",
    "OBSERVADO / DEVUELTO": "OBSERVADO",
    "ANULADO": "OBSERVADO",
  };
  // Migración única: cambia la lista de estados a la del proceso real y renombra
  // los valores en requerimientos, papelera e historial. No borra nada.
  function migrarEstadosProceso() {
    try {
      if (localStorage.getItem("priority_migr_estados_v4")) return;
      // Solo si aún se tiene una lista anterior (no pisar personalizaciones propias)
      const nombres = (config.estados || []).map((e) => String(e.nombre).toUpperCase());
      const esHeredada = nombres.indexOf("ENTREGADO A GRISEL") >= 0 || nombres.indexOf("INVITACION") >= 0
        || nombres.indexOf("INDAGACIÓN DE MERCADO") >= 0 || nombres.indexOf("PARA CERTIFICAR (SIGA)") >= 0
        || nombres.indexOf("CERTIFICANDO") >= 0;
      if (esHeredada) {
        config.estados = clone(DEF_CONFIG.estados);
        try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch (e) {}
        derivarConfig();
        const renombrar = (v) => MAPA_ESTADOS_2[String(v || "").trim().toUpperCase()] || v;
        [items, papelera].forEach((lista) => {
          lista.forEach((it) => {
            if (it.estado) it.estado = renombrar(it.estado);
            if (Array.isArray(it.historial)) {
              it.historial.forEach((h) => { h.de = renombrar(h.de); h.a = renombrar(h.a); });
            }
          });
        });
        guardar(); guardarPapelera();
      }
      localStorage.setItem("priority_migr_estados_v4", "1");
    } catch (e) {}
  }
  function guardarConfig() {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch (e) {}
    derivarConfig();
  }
  function derivarConfig() {
    COL.estado = {}; COL.tipo = {}; COL.prioridad = {};
    config.estados.forEach((o) => (COL.estado[o.nombre] = o.color));
    config.tipos.forEach((o) => (COL.tipo[o.nombre] = o.color));
    config.prioridades.forEach((o) => (COL.prioridad[o.nombre] = o.color));
    ordenPrioridad = {};
    config.prioridades.forEach((o, i) => (ordenPrioridad[o.nombre] = i));
  }

  function defEstado() { return config.estados[0] ? config.estados[0].nombre : ""; }
  function defTipo() { return config.tipos[0] ? config.tipos[0].nombre : ""; }
  function defPrioridad() {
    const p = config.prioridades;
    return p.length ? p[Math.min(1, p.length - 1)].nombre : "";
  }
  function prioridadTop() { return config.prioridades[0] ? config.prioridades[0].nombre : ""; }

  function nextNro() {
    let max = 0;
    items.forEach((it) => { const n = parseInt(it.nro, 10); if (!isNaN(n) && n > max) max = n; });
    return String(max + 1);
  }

  function opcionesDe(field) {
    if (field === "prioridad") return config.prioridades.map((o) => o.nombre);
    if (field === "estado") return config.estados.map((o) => o.nombre);
    if (field === "tipo") return config.tipos.map((o) => o.nombre);
    if (field === "aCargo" || field === "tengoExp") return SINO.slice();
    return [];
  }

  // ---------- Filtro + orden ----------
  function visibles() {
    const q = filtro.q.trim().toLowerCase();
    let lista = items.filter((it) => {
      if (it.pestana !== pestanaActiva) return false;
      if (filtro.cargo) {
        const v = it.aCargo || "";
        if (filtro.cargo === "__sin") { if (v !== "") return false; }
        else if (v !== filtro.cargo) return false;
      }
      if (filtro.estado && it.estado !== filtro.estado) return false;
      if (filtro.prioridad && it.prioridad !== filtro.prioridad) return false;
      if (filtro.tipo && it.tipo !== filtro.tipo) return false;
      if (filtro.tengo && (it.tengoExp || "") !== filtro.tengo) return false;
      if (q) {
        const blob = [it.nro, it.expLogistica, it.expDireccion, it.docArea,
          it.areaEstrategica, it.areaUsuaria, it.denominacion, it.item,
          it.especialista, it.observaciones].join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    lista.sort(comparador);
    return lista;
  }

  // ---------- Render ----------
  function render() { renderTabs(); renderKpis(); renderThead(); renderTabla(); renderCabeceraOrden(); sincronizarSeleccion(); aplicarNav(); }

  function renderTabs() {
    const cont = $("#tabs");
    cont.innerHTML = tabs.map((t) => {
      const count = items.filter((it) => it.pestana === t.id).length;
      return `<button class="tab ${t.id === pestanaActiva ? "active" : ""}" data-tab="${t.id}" title="Doble clic para renombrar">
        <span class="tab-name">${esc(t.nombre)}</span><span class="tab-count">${count}</span>
      </button>`;
    }).join("");
  }

  function renderKpis() {
    const top = prioridadTop();
    const tabItems = items.filter((it) => it.pestana === pestanaActiva);
    $("#kpi-total").textContent = tabItems.length;
    $("#kpi-cargo").textContent = tabItems.filter((it) => (it.aCargo || "") === "SÍ").length;
    $("#kpi-alta").textContent = tabItems.filter((it) => it.prioridad === top).length;
    $("#kpi-alta-label").textContent = "🔥 Prioridad " + (top || "—").toLowerCase();
    $("#kpi-sinexp").textContent = tabItems.filter((it) => (it.tengoExp || "") === "NO").length;
    $("#kpi-pend").textContent = tabItems.filter((it) => !it.estado || it.estado === defEstado()).length;
  }

  function renderTabla() {
    const lista = visibles();
    const tbody = $("#tbody");
    const vacio = $("#vacio");
    const tabTotal = items.filter((it) => it.pestana === pestanaActiva).length;

    if (!lista.length) {
      if (items.length === 0) {
        tbody.innerHTML = ""; vacio.classList.remove("hidden");
      } else {
        vacio.classList.add("hidden");
        const msg = tabTotal === 0
          ? `La pestaña «${esc(tabNombre(pestanaActiva))}» aún no tiene requerimientos. Usa «⇄ Traer a mi trabajo» o «+ Nuevo requerimiento».`
          : "Ningún requerimiento coincide con los filtros.";
        tbody.innerHTML = `<tr><td colspan="${colsVisibles().length + 2}" class="empty" style="padding:34px">${msg}</td></tr>`;
      }
      $("#footer-count").textContent = `${tabTotal} en «${tabNombre(pestanaActiva)}»`;
      return;
    }
    vacio.classList.add("hidden");
    tbody.innerHTML = lista.map(filaHTML).join("");

    const mostrados = lista.length;
    $("#footer-count").textContent = mostrados === tabTotal
      ? `${tabTotal} en «${tabNombre(pestanaActiva)}»`
      : `${mostrados} de ${tabTotal} en «${tabNombre(pestanaActiva)}»`;
    marcarKpis();
  }

  // ---------- Columnas de la tabla ----------
  // Orden de trabajo: identificar (N°, Exp.) → qué es (Ítem, Tipo) → decidir (Estado,
  // fecha) → contexto (área, documentos). Las columnas heredadas del Excel anterior
  // que hoy no aportan van ocultas por defecto; se reactivan con «👁 Columnas».
  // IMPORTANTE: esto es solo la VISTA — el Excel exportable (COLS_EXPORT) no cambia.
  const COLS_KEY = "priority_columnas_v1";
  const COLS_TABLA = [
    { f: "nro",          h: "N°",              def: true,  cls: "num col-nro" },
    { f: "expLogistica", h: "Exp. Logística",  def: true },
    { f: "item",         h: "Ítem",            def: true },
    { f: "tipo",         h: "Tipo",            def: true },
    { f: "estado",       h: "Estado",          def: true },
    { f: "prioridad",    h: "Prioridad",       def: false },
    { f: "fechaIngreso", h: "Ingreso a UPROG", def: true },
    { f: "areaUsuaria",  h: "Área usuaria",    def: true },
    { f: "docArea",      h: "Doc. del área",   def: true },
    { f: "expDireccion", h: "Exp. Dirección",  def: true },
    { f: "tengoExp",     h: "¿Tengo exp.?",    def: true },
    { f: "aCargo",       h: "A cargo",         def: "auto" }, // solo en «Heredados»
    { f: "pestana",      h: "Pestaña",         def: false },
    { f: "areaEstrategica", h: "Área estratégica", def: false },
    { f: "denominacion", h: "Denominación",    def: false },
    { f: "especialista", h: "Especialista",    def: false },
    { f: "fechaPase",    h: "F. pase",         def: false },
    { f: "observaciones", h: "Observaciones",  def: true },
  ];
  let colOverrides = {};
  function cargarColumnas() {
    try { colOverrides = JSON.parse(localStorage.getItem(COLS_KEY)) || {}; }
    catch (e) { colOverrides = {}; }
    if (typeof colOverrides !== "object" || !colOverrides) colOverrides = {};
  }
  function guardarColumnas() {
    try { localStorage.setItem(COLS_KEY, JSON.stringify(colOverrides)); } catch (e) {}
  }
  function colVisible(c) {
    if (colOverrides[c.f] === true) return true;
    if (colOverrides[c.f] === false) return false;
    if (c.def === "auto") return pestanaActiva === tabs[0].id;
    return !!c.def;
  }
  function colsVisibles() { return COLS_TABLA.filter(colVisible); }

  function renderThead() {
    const tr = $("#thead-row");
    if (!tr) return;
    tr.innerHTML =
      '<th class="sel-col"><input type="checkbox" id="sel-all" title="Seleccionar todo lo visible" /></th>' +
      colsVisibles().map((c) => `<th data-sort="${c.f}" class="${c.cls || ""}">${esc(c.h)}</th>`).join("") +
      '<th class="acciones-col">Acciones</th>';
  }

  function abrirSelectorColumnas(btn) {
    const rect = btn.getBoundingClientRect();
    const back = document.createElement("div"); back.className = "popover-backdrop";
    const pop = document.createElement("div"); pop.className = "cell-popover";
    const pinta = () => {
      pop.innerHTML = '<div class="cp-label">Columnas visibles · lo oculto NO se pierde: sigue en el formulario, la búsqueda y el Excel exportado</div>' +
        '<div class="cols-lista">' +
        COLS_TABLA.filter((c) => c.f !== "nro").map((c) => {
          const nota = c.def === "auto" ? ' <span class="cols-nota">(auto: solo en «Heredados»)</span>' : "";
          return `<label class="cols-item"><input type="checkbox" data-col="${c.f}"${colVisible(c) ? " checked" : ""} /> ${esc(c.h)}${nota}</label>`;
        }).join("") +
        '</div><div class="cols-foot"><button type="button" class="btn btn-ghost btn-sm" id="cols-reset">Vista recomendada</button></div>';
    };
    pinta();
    document.body.appendChild(back); document.body.appendChild(pop);
    const w = Math.min(300, window.innerWidth - 16);
    pop.style.width = w + "px";
    pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8)) + "px";
    let top = rect.bottom + 4;
    if (top + pop.offsetHeight + 12 > window.innerHeight) top = Math.max(8, window.innerHeight - pop.offsetHeight - 12);
    pop.style.top = top + "px";
    pop.addEventListener("change", (e) => {
      const f = e.target.getAttribute("data-col");
      if (!f) return;
      colOverrides[f] = e.target.checked;
      guardarColumnas(); render();
    });
    pop.addEventListener("click", (e) => {
      if (e.target.id === "cols-reset") { colOverrides = {}; guardarColumnas(); render(); pinta(); }
    });
    const cerrar = () => { back.remove(); pop.remove(); document.removeEventListener("keydown", escHandler, true); };
    const escHandler = (e) => { if (e.key === "Escape") { e.stopPropagation(); cerrar(); } };
    back.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", escHandler, true);
  }

  function filaHTML(it) {
    const dias = diasDesde(it.fechaIngreso);
    // Cerrado: ya no depende de mí, no cuenta como "viejo" ni "sin movimiento"
    const cerrado = esTerminado(it.estado) || it.estado === "PARA SALDO";
    const vieja = dias !== null && dias > 30 && !cerrado;
    const antig = dias !== null ? `<span class="antig-tag ${vieja ? "alerta" : ""}">${dias} d</span>` : "";
    // Días sin movimiento: desde la última edición (o su registro si nunca se editó)
    const ts = it.actualizado || it.creado;
    const sinMov = ts ? Math.floor((Date.now() - ts) / 86400000) : null;
    const movTag = (!cerrado && sinMov !== null && sinMov >= 7)
      ? `<span class="sinmov-tag" title="Días desde la última vez que editaste este requerimiento">⏸ ${sinMov} d sin movimiento</span>` : "";
    const cargo = it.aCargo || "";
    const cargoBadge = cargo
      ? `<span class="badge ${cargo === "SÍ" ? "cargo-si" : "cargo-no"}">${esc(cargo)}</span>` : GUION;
    const tengo = it.tengoExp || "";
    const tengoBadge = tengo
      ? `<span class="badge ${tengo === "SÍ" ? "tengo-si" : "tengo-no"}">${esc(tengo)}</span>` : GUION;
    const ed = (f, inner, cls) => `<td class="ed ${cls || ""}" data-id="${it.id}" data-field="${f}">${inner}</td>`;
    const txt = (f, cls) => ed(f, esc(it[f]) || GUION, cls);
    const esAlta = !!it.prioridad && it.prioridad === prioridadTop();

    // Ítem con la denominación debajo, PERO solo si aporta algo distinto: en la
    // mayoría de expedientes la denominación es el mismo ítem con relleno
    // ("SOLICITO ADQUISICION DE… PARA EL SERVICIO DE…") y se veía repetido.
    const denAporta = it.denominacion && !seParecen(it.item, it.denominacion);
    const denSub = denAporta
      ? `<span class="sub-linea sub-edit" data-sub="denominacion" data-id="${it.id}" title="Denominación completa · clic para editarla">${esc(it.denominacion)}</span>` : "";
    // Si no se muestra, la denominación sigue accesible al pasar el mouse por el ítem
    const tituloItem = (it.denominacion && !denAporta) ? ` title="${esc(it.denominacion)}"` : "";
    const celdaItem = `<div class="item-main"${tituloItem}>${esc(it.item) || GUION}</div>` + denSub;
    // Área usuaria con la estratégica debajo SOLO si difiere (94% son iguales)
    const difEstr = it.areaEstrategica && String(it.areaEstrategica).trim().toUpperCase() !== String(it.areaUsuaria || "").trim().toUpperCase();
    const celdaArea = (esc(it.areaUsuaria) || GUION) +
      (difEstr ? `<span class="sub-linea sub-edit" data-sub="areaEstrategica" data-id="${it.id}" title="Área estratégica (difiere de la usuaria) · clic para editarla">Estr.: ${esc(it.areaEstrategica)}</span>` : "");

    const CELDA = {
      nro: () => ed("nro", esc(it.nro) || GUION, "num cell-strong col-nro"),
      expLogistica: () => txt("expLogistica", "cell-strong cell-exp"),
      item: () => ed("item", celdaItem, "cell-item2"),
      tipo: () => ed("tipo", badge(it.tipo, COL.tipo)),
      estado: () => {
        // ⏭ avanza al siguiente paso con un clic (el flujo es lineal y acaba en TERMINADO;
        // lo que va después de TERMINADO son excepciones, se eligen a mano)
        const sig = siguienteEstado(it.estado);
        const btnSig = sig
          ? `<button class="paso-sig" data-sig="${it.id}" title="Avanzar a: ${esc(sig)}">⏭</button>` : "";
        return ed("estado", `<div class="estado-linea">${badge(it.estado, COL.estado)}${btnSig}</div>` + movTag);
      },
      prioridad: () => ed("prioridad", badge(it.prioridad, COL.prioridad)),
      fechaIngreso: () => ed("fechaIngreso", fmtFecha(it.fechaIngreso) + antig),
      areaUsuaria: () => ed("areaUsuaria", celdaArea, "cell-area"),
      docArea: () => txt("docArea", "cell-doc"),
      expDireccion: () => txt("expDireccion"),
      tengoExp: () => ed("tengoExp", tengoBadge),
      aCargo: () => ed("aCargo", cargoBadge),
      pestana: () => ed("pestana", `<span class="badge pest-badge">${esc(tabNombre(it.pestana))}</span>`),
      areaEstrategica: () => txt("areaEstrategica", "cell-area"),
      denominacion: () => txt("denominacion", "cell-den"),
      especialista: () => txt("especialista"),
      fechaPase: () => ed("fechaPase", fmtFecha(it.fechaPase)),
      observaciones: () => txt("observaciones", "cell-obs"),
    };

    return `
      <tr class="${vieja ? "row-vieja" : ""} ${cargo === "SÍ" ? "row-cargo" : ""} ${esAlta ? "row-alta" : ""}">
        <td class="sel-col"><input type="checkbox" class="sel-check" data-sel="${it.id}"${seleccion.has(it.id) ? " checked" : ""} /></td>
        ${colsVisibles().map((c) => CELDA[c.f]()).join("")}
        <td><div class="row-actions">
          <button class="icon-btn" data-hist="${it.id}" title="Historial de estados (se anota solo)">🕘</button>
          <button class="icon-btn danger" data-del="${it.id}" title="Eliminar">🗑</button>
        </div></td>
      </tr>`;
  }

  function badge(valor, mapa) {
    if (!valor) return GUION;
    return `<span class="badge" style="${badgeStyle(mapa[valor])}">${esc(valor)}</span>`;
  }

  function renderCabeceraOrden() {
    $$("#tabla thead th").forEach((th) => {
      th.classList.remove("sorted-asc", "sorted-desc");
      if (th.getAttribute("data-sort") === orden.key)
        th.classList.add(orden.dir === "asc" ? "sorted-asc" : "sorted-desc");
    });
  }

  // ---------- Edición en línea (tipo Excel) ----------
  function editarTextareaPopover(td, it, field) {
    const multilinea = MULTILINEA.has(field);
    const conPrediccion = CAMPOS_TEXTO_VOCAB.indexOf(field) >= 0;
    const etiqueta = ENCABEZADOS_CSV[field] || "Editar";
    const rect = td.getBoundingClientRect();
    const back = document.createElement("div");
    back.className = "popover-backdrop";
    const pop = document.createElement("div");
    pop.className = "cell-popover";
    const lab = document.createElement("div");
    lab.className = "cp-label";
    lab.textContent = etiqueta + " · Esc cancela · " + (multilinea ? "clic fuera o Ctrl+Enter guarda" : "Enter o clic fuera guarda");

    // Contenedor con capa fantasma (predicción tipo teclado de celular) detrás del textarea
    const wrap = document.createElement("div");
    wrap.className = "cp-ta-wrap";
    const ghost = document.createElement("div");
    ghost.className = "cp-ghost" + (multilinea ? "" : " cp-corta");
    ghost.setAttribute("aria-hidden", "true");
    const ta = document.createElement("textarea");
    ta.className = "cp-textarea" + (multilinea ? "" : " cp-corta");
    ta.value = it[field] == null ? "" : String(it[field]);
    if (conPrediccion) { ta.spellcheck = true; ta.setAttribute("lang", "es"); }
    wrap.appendChild(ghost);
    wrap.appendChild(ta);

    pop.appendChild(lab);
    pop.appendChild(wrap);

    // Aviso de duplicado (Exp. Logística)
    let warn = null;
    if (field === "expLogistica") {
      warn = document.createElement("div");
      warn.className = "cp-warn hidden";
      pop.appendChild(warn);
    }

    const vocab = conPrediccion ? construirVocabulario() : null;
    let predRemainder = "";

    // Frases rápidas en Observaciones: un toque y se insertan (aprendidas de tus datos)
    if (field === "observaciones") {
      const insertarFrase = (f) => {
        const pos = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
        const antes = ta.value.slice(0, pos), despues = ta.value.slice(pos);
        let sep = "";
        if (antes.trim() && !/[\/\s:]$/.test(antes)) sep = "/ ";
        ta.value = antes + sep + f + despues;
        const np = (antes + sep + f).length;
        ta.setSelectionRange(np, np);
        ta.focus();
        ajustar(); setGhost();
      };
      const chips = document.createElement("div");
      chips.className = "cp-sugerencias";
      const frases = frasesFrecuentes();
      chips.innerHTML = '<span class="cp-sug-tit">Frases:</span>' +
        '<button type="button" class="cp-sug" data-frase="__fecha">📅 fecha de hoy</button>' +
        frases.map((f) => `<button type="button" class="cp-sug" data-frase="${esc(f)}">${esc(f)}</button>`).join("");
      chips.addEventListener("mousedown", (e) => e.preventDefault()); // no perder el cursor del textarea
      chips.addEventListener("click", (e) => {
        const b = e.target.closest(".cp-sug");
        if (!b) return;
        let f = b.getAttribute("data-frase");
        if (f === "__fecha") { const p = hoyISO().split("-"); f = `${p[2]}/${p[1]}/${p[0]}: `; }
        insertarFrase(f);
      });
      pop.appendChild(chips);
    }

    document.body.appendChild(back);
    document.body.appendChild(pop);

    const minH = multilinea ? 150 : 46;
    const w = Math.max(rect.width, multilinea ? 440 : 300);
    pop.style.width = w + "px";
    pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8)) + "px";
    const ajustar = () => {
      const tope = window.innerHeight - 24;
      ta.style.height = "auto";
      const h = Math.max(minH, Math.min(320, ta.scrollHeight + 4));
      ta.style.height = h + "px";
      ghost.style.height = h + "px";
      let top = rect.bottom + 4;
      const total = pop.offsetHeight || (h + 44);
      if (top + total + 12 > tope) top = Math.max(8, tope - total - 4);
      pop.style.top = top + "px";
    };

    const refreshWarn = () => {
      if (!warn) return;
      const dup = buscarDuplicado(ta.value, it.id);
      warn.classList.toggle("hidden", !dup);
      if (dup) warn.textContent = `⚠ Ya existe este Exp.: N° ${dup.nro || "—"} en «${tabNombre(dup.pestana)}»`;
    };
    const setGhost = () => {
      predRemainder = "";
      if (!conPrediccion) return;
      const val = ta.value;
      const pos = ta.selectionStart == null ? val.length : ta.selectionStart;
      // Solo predecir si el cursor está al final de todo el texto (como en el celular)
      if (pos !== val.length) { ghost.innerHTML = ""; return; }
      const m = val.match(/[0-9A-Za-zÁÉÍÓÚÑÜáéíóúñü°\.\-\/]+$/);
      let sufijo = "";
      if (m) {
        const sug = predecirPalabra(vocab, m[0]);
        if (sug && sug.length > m[0].length) sufijo = sug.slice(m[0].length);
      }
      predRemainder = sufijo;
      ghost.innerHTML = esc(val) + (sufijo ? '<span class="g">' + esc(sufijo) + "</span>" : "") + "​";
      ghost.scrollTop = ta.scrollTop;
    };
    const aceptarGhost = () => {
      if (!predRemainder) return false;
      const pos = ta.selectionStart;
      ta.value = ta.value.slice(0, pos) + predRemainder + ta.value.slice(pos);
      const np = pos + predRemainder.length;
      ta.setSelectionRange(np, np);
      ajustar(); refreshWarn(); setGhost();
      return true;
    };

    refreshWarn();
    ajustar();
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    setGhost();

    let done = false;
    const cerrar = () => { back.remove(); pop.remove(); };
    const commit = () => {
      if (done) return; done = true;
      const val = ta.value.trim();
      if ((it[field] == null ? "" : String(it[field])) !== val) {
        snapshot();
        it[field] = val; it.actualizado = Date.now(); guardar();
      }
      cerrar(); render();
      if (field === "expLogistica") {
        const dup = buscarDuplicado(val, it.id);
        if (dup) toast(`⚠ Ojo: el Exp. ${val} ya existía (N° ${dup.nro || "—"} en «${tabNombre(dup.pestana)}»).`);
      }
    };
    const cancel = () => { if (done) return; done = true; cerrar(); };

    ta.addEventListener("input", () => { ajustar(); refreshWarn(); setGhost(); });
    ta.addEventListener("scroll", () => { ghost.scrollTop = ta.scrollTop; ghost.scrollLeft = ta.scrollLeft; });
    ta.addEventListener("click", setGhost);
    ta.addEventListener("keyup", (e) => {
      if (e.key.indexOf("Arrow") === 0 || e.key === "Home" || e.key === "End") setGhost();
    });
    ta.addEventListener("keydown", (e) => {
      // Aceptar la sugerencia fantasma con Tab, o con → cuando el cursor está al final
      if (predRemainder && (e.key === "Tab" || (e.key === "ArrowRight" && ta.selectionStart === ta.value.length))) {
        e.preventDefault(); aceptarGhost(); return;
      }
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
      else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit(); }
      else if (e.key === "Enter" && !multilinea && !e.shiftKey) { e.preventDefault(); commit(); }
    });
    back.addEventListener("mousedown", commit);
  }

  // Siguiente paso del flujo (null si ya está al final o fuera del flujo).
  // El flujo va del primer estado hasta TERMINADO; lo posterior son excepciones.
  function siguienteEstado(actual) {
    const lista = config.estados.map((o) => o.nombre);
    const i = lista.indexOf(actual);
    if (i < 0) return null;
    let fin = lista.findIndex(esTerminado);
    if (fin < 0) fin = lista.length - 1;
    return i < fin ? lista[i + 1] : null;
  }
  // Avanza un requerimiento al siguiente estado del proceso (botón ⏭)
  function avanzarEstado(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const nuevo = siguienteEstado(it.estado);
    if (!nuevo) return;
    snapshot();
    logEstado(it, it.estado, nuevo);
    it.estado = nuevo;
    it.actualizado = Date.now();
    const movido = autoArchivarTerminado(it);
    guardar(); render();
    toast(`N° ${it.nro || "—"} → ${nuevo}` + (movido ? ` · se movió a «${tabNombre(it.pestana)}»` : "") + " · Ctrl+Z para deshacer");
  }

  // Prioridad con clic rápido: cada clic rota Alta → Media → Baja (triaje de un segundo)
  function ciclarPrioridad(it) {
    const lista = config.prioridades.map((o) => o.nombre);
    if (!lista.length) return;
    const nueva = lista[(lista.indexOf(it.prioridad) + 1) % lista.length];
    snapshot();
    it.prioridad = nueva; it.actualizado = Date.now();
    guardar(); render();
    toast(`Prioridad: ${nueva} · clic de nuevo para rotar`);
  }

  function startEdit(td) {
    if (td.querySelector(".cell-editor")) return;
    const id = td.getAttribute("data-id"), field = td.getAttribute("data-field");
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (field === "prioridad") { ciclarPrioridad(it); return; }
    const tipo = FIELD_EDITOR[field] || "text";
    if (tipo === "textarea" || tipo === "text") { editarTextareaPopover(td, it, field); return; }
    const actual = it[field] == null ? "" : String(it[field]);
    let editor;

    if (tipo === "select") {
      editor = document.createElement("select");
      let pares;
      if (field === "pestana") pares = tabs.map((t) => [t.id, t.nombre]);
      else {
        let ops = opcionesDe(field);
        if (actual && ops.indexOf(actual) === -1) ops = [actual].concat(ops);
        pares = ops.map((o) => [o, o || "—"]);
      }
      pares.forEach(([val, lab]) => {
        const op = document.createElement("option");
        op.value = val; op.textContent = lab;
        if (actual === val) op.selected = true;
        editor.appendChild(op);
      });
    } else if (tipo === "textarea") {
      editor = document.createElement("textarea");
      editor.value = actual;
      editor.rows = 3;
    } else {
      editor = document.createElement("input");
      editor.type = tipo === "date" ? "date" : "text";
      editor.value = actual;
    }
    editor.className = "cell-editor";
    td.classList.add("editing");
    td.innerHTML = "";
    td.appendChild(editor);
    editor.focus();
    if (editor.tagName === "INPUT" && editor.type === "text") editor.select();
    if (editor.tagName === "SELECT" && editor.showPicker) { try { editor.showPicker(); } catch (e) {} }

    let done = false;
    const commit = () => {
      if (done) return; done = true;
      let val = editor.value;
      if ((editor.tagName === "INPUT" && editor.type === "text") || editor.tagName === "TEXTAREA") val = val.trim();
      if ((it[field] == null ? "" : String(it[field])) !== val) {
        snapshot();
        if (field === "estado") logEstado(it, it.estado, val);
        it[field] = val;
        it.actualizado = Date.now();
        const movido = field === "estado" && autoArchivarTerminado(it);
        guardar();
        if (movido) toast(`Estado TERMINADO: se movió a la pestaña «${tabNombre(it.pestana)}».`);
      }
      render();
    };
    const cancel = () => { if (done) return; done = true; render(); };

    if (editor.tagName === "SELECT") {
      editor.addEventListener("change", commit);
      editor.addEventListener("blur", cancel);
    } else if (editor.tagName === "TEXTAREA") {
      const autosize = () => { editor.style.height = "auto"; editor.style.height = Math.min(240, editor.scrollHeight + 2) + "px"; };
      editor.addEventListener("input", autosize);
      autosize();
      editor.addEventListener("blur", commit);
      editor.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { e.preventDefault(); cancel(); }
        else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit(); }
      });
    } else {
      editor.addEventListener("blur", commit);
      editor.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        else if (e.key === "Escape") { e.preventDefault(); cancel(); }
      });
    }
  }

  // ---------- Modal requerimiento ----------
  function abrirModal(id) {
    const it = id ? items.find((x) => x.id === id) : null;
    $("#modal-titulo").textContent = it ? "Editar requerimiento" : "Nuevo requerimiento";
    const set = (sel, val) => { $(sel).value = val == null ? "" : val; };
    $("#f-id").value = it ? it.id : "";
    set("#f-pestana", it ? it.pestana : pestanaActiva);
    set("#f-nro", it ? it.nro : nextNro());
    set("#f-fechaIngreso", it ? it.fechaIngreso : hoyISO());
    set("#f-expLogistica", it ? it.expLogistica : "");
    set("#f-expDireccion", it ? it.expDireccion : "");
    set("#f-docArea", it ? it.docArea : "");
    set("#f-areaEstrategica", it ? it.areaEstrategica : "");
    set("#f-areaUsuaria", it ? it.areaUsuaria : "");
    set("#f-tipo", it ? it.tipo : defTipo());
    set("#f-item", it ? it.item : "");
    set("#f-denominacion", it ? it.denominacion : "");
    set("#f-prioridad", it ? it.prioridad : defPrioridad());
    set("#f-estado", it ? it.estado : defEstado());
    set("#f-especialista", it ? it.especialista : "");
    set("#f-fechaPase", it ? it.fechaPase : "");
    set("#f-tengoExp", it ? it.tengoExp : "");
    set("#f-aCargo", it ? it.aCargo : "");
    set("#f-observaciones", it ? it.observaciones : "");
    poblarDatalist("dl-areaEstrategica", "areaEstrategica");
    poblarDatalist("dl-areaUsuaria", "areaUsuaria");
    poblarDatalist("dl-especialista", "especialista");
    $("#modal").classList.remove("hidden");
    setTimeout(() => $("#f-expLogistica").focus(), 50);
  }
  function cerrarModal() { $("#modal").classList.add("hidden"); }

  function guardarDesdeForm(ev) {
    ev.preventDefault();
    const expLogistica = $("#f-expLogistica").value.trim();
    if (!expLogistica) { toast("El N° de Exp. Logística es obligatorio."); return; }
    const idActual = $("#f-id").value || null;
    const dup = buscarDuplicado(expLogistica, idActual);
    if (dup && !confirm(`Ya existe un requerimiento con Exp. Logística ${expLogistica} (N° ${dup.nro || "—"} en «${tabNombre(dup.pestana)}»).\n¿Registrar de todos modos?`)) return;
    snapshot();
    const datos = {
      pestana: $("#f-pestana").value,
      nro: $("#f-nro").value.trim(),
      fechaIngreso: $("#f-fechaIngreso").value,
      expLogistica,
      expDireccion: $("#f-expDireccion").value.trim(),
      docArea: $("#f-docArea").value.trim(),
      areaEstrategica: $("#f-areaEstrategica").value.trim(),
      areaUsuaria: $("#f-areaUsuaria").value.trim(),
      tipo: $("#f-tipo").value,
      item: $("#f-item").value.trim(),
      denominacion: $("#f-denominacion").value.trim(),
      prioridad: $("#f-prioridad").value,
      estado: $("#f-estado").value,
      especialista: $("#f-especialista").value.trim(),
      fechaPase: $("#f-fechaPase").value,
      tengoExp: $("#f-tengoExp").value,
      aCargo: $("#f-aCargo").value,
      observaciones: $("#f-observaciones").value.trim(),
    };
    // Si el estado es TERMINADO, el expediente va directo a la pestaña «Terminados».
    if (esTerminado(datos.estado)) {
      const destino = destinoTerminados();
      if (destino) datos.pestana = destino;
    }
    const id = $("#f-id").value;
    if (id) {
      const idx = items.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const estadoAntes = items[idx].estado;
        items[idx] = Object.assign({}, items[idx], datos, { actualizado: Date.now() });
        logEstado(items[idx], estadoAntes, items[idx].estado);
      }
      toast("Requerimiento actualizado.");
    } else {
      const nuevo = Object.assign({ id: uid(), creado: Date.now() }, datos);
      logEstado(nuevo, "", nuevo.estado);
      items.push(nuevo);
      toast("Requerimiento agregado.");
    }
    guardar(); cerrarModal(); render();
  }

  function eliminar(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    snapshot();
    items = items.filter((x) => x.id !== id);
    enviarAPapelera([it]);
    seleccion.delete(id);
    guardar(); render();
    toast(`N° ${it.nro || "—"} (Exp. ${it.expLogistica || "—"}) se movió a la 🗑 Papelera; puedes restaurarlo.`);
  }

  // ---------- Deshacer (Ctrl+Z) ----------
  function actualizarBotonDeshacer() {
    const btn = $("#btn-deshacer");
    if (btn) btn.disabled = undoStack.length === 0;
  }
  function snapshot() {
    undoStack.push(JSON.stringify(items));
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    actualizarBotonDeshacer();
  }
  function descartarSnapshot() { undoStack.pop(); actualizarBotonDeshacer(); }
  function deshacer() {
    if (!undoStack.length) { toast("No hay cambios para deshacer."); return; }
    try { items = JSON.parse(undoStack.pop()); } catch (e) { return; }
    guardar();
    seleccion.clear();
    render();
    toast("Último cambio deshecho.");
  }

  // ---------- Papelera ----------
  function cargarPapelera() {
    try {
      papelera = JSON.parse(localStorage.getItem(PAPELERA_KEY)) || [];
      if (!Array.isArray(papelera)) papelera = [];
    } catch (e) { papelera = []; }
  }
  function guardarPapelera() {
    try { localStorage.setItem(PAPELERA_KEY, JSON.stringify(papelera)); } catch (e) {}
  }
  function enviarAPapelera(arr) {
    const ahora = Date.now();
    arr.forEach((it) => papelera.unshift(Object.assign({}, it, { eliminadoEn: ahora })));
    if (papelera.length > 200) papelera.length = 200;
    guardarPapelera();
  }
  function abrirPapelera() { renderPapelera(); $("#modal-papelera").classList.remove("hidden"); }
  function cerrarPapelera() { $("#modal-papelera").classList.add("hidden"); }
  function renderPapelera() {
    const cont = $("#papelera-lista");
    if (!cont) return;
    if (!papelera.length) {
      cont.innerHTML = '<p class="empty" style="padding:24px">La papelera está vacía.</p>';
      return;
    }
    cont.innerHTML = papelera.map((it) => `
      <div class="pap-row">
        <div class="pap-info">
          <span class="pap-title">N° ${esc(it.nro) || "—"} · Exp. ${esc(it.expLogistica) || "—"} · ${esc(tabNombre(it.pestana))}</span>
          <span class="pap-sub">${esc(it.item || it.denominacion || "")}</span>
          <span class="pap-fecha">Eliminado: ${new Date(it.eliminadoEn).toLocaleString("es-PE")}</span>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-restaurar="${it.id}">↩ Restaurar</button>
      </div>`).join("");
  }
  function restaurarDePapelera(id) {
    const idx = papelera.findIndex((x) => x.id === id);
    if (idx < 0) return;
    if (items.some((x) => x.id === id)) {
      papelera.splice(idx, 1);
      guardarPapelera(); renderPapelera(); sincronizarSeleccion();
      toast("Ese requerimiento ya estaba de vuelta en la lista (quizá lo recuperaste con Deshacer).");
      return;
    }
    snapshot();
    const it = Object.assign({}, papelera[idx]);
    delete it.eliminadoEn;
    items.push(it);
    papelera.splice(idx, 1);
    guardarPapelera(); guardar(); render(); renderPapelera();
    toast(`N° ${it.nro || "—"} (Exp. ${it.expLogistica || "—"}) restaurado.`);
  }

  // ---------- Selección múltiple y acciones en lote ----------
  function toggleSel(id, on) {
    if (on) seleccion.add(id); else seleccion.delete(id);
    sincronizarSeleccion();
  }
  function sincronizarSeleccion() {
    const existentes = new Set(items.map((it) => it.id));
    [...seleccion].forEach((id) => { if (!existentes.has(id)) seleccion.delete(id); });
    const bar = $("#batch-bar");
    if (bar) {
      bar.classList.toggle("hidden", seleccion.size === 0);
      $("#batch-count").textContent = seleccion.size + " seleccionado" + (seleccion.size === 1 ? "" : "s");
    }
    const selAll = $("#sel-all");
    if (selAll) {
      const lista = visibles();
      selAll.checked = lista.length > 0 && lista.every((it) => seleccion.has(it.id));
    }
    const pc = $("#papelera-count");
    if (pc) pc.textContent = papelera.length;
    actualizarBotonDeshacer();
  }
  function aplicarLote(campo, valor, etiqueta) {
    if (!seleccion.size) return;
    snapshot();
    let n = 0, movidos = 0;
    items.forEach((it) => {
      if (seleccion.has(it.id)) {
        if (campo === "estado") logEstado(it, it.estado, valor);
        it[campo] = valor; it.actualizado = Date.now(); n++;
        if (campo === "estado" && autoArchivarTerminado(it)) movidos++;
      }
    });
    guardar();
    seleccion.clear();
    render();
    toast(`${etiqueta} aplicado a ${n} requerimiento${n === 1 ? "" : "s"}.` +
      (movidos ? ` ${movidos} pasó a «Terminados».` : ""));
  }
  function eliminarLote() {
    if (!seleccion.size) return;
    if (!confirm(`¿Enviar ${seleccion.size} requerimiento(s) a la papelera?`)) return;
    snapshot();
    const ids = new Set(seleccion);
    const borrados = items.filter((it) => ids.has(it.id));
    items = items.filter((it) => !ids.has(it.id));
    enviarAPapelera(borrados);
    seleccion.clear();
    guardar(); render();
    toast(`${borrados.length} requerimiento${borrados.length === 1 ? "" : "s"} enviados a la 🗑 Papelera.`);
  }

  // ---------- Configuración (estados / tipos / prioridades) ----------
  // ---------- Glosario ----------
  function abrirGlosario() { $("#modal-glosario").classList.remove("hidden"); }
  function cerrarGlosario() { $("#modal-glosario").classList.add("hidden"); }

  const GRUPOS = [
    { g: "estados", field: "estado", titulo: "Estados" },
    { g: "tipos", field: "tipo", titulo: "Tipos" },
    { g: "prioridades", field: "prioridad", titulo: "Prioridades" },
  ];

  function abrirConfig() {
    configDraft = {
      estados: config.estados.map((o) => ({ orig: o.nombre, nombre: o.nombre, color: o.color })),
      tipos: config.tipos.map((o) => ({ orig: o.nombre, nombre: o.nombre, color: o.color })),
      prioridades: config.prioridades.map((o) => ({ orig: o.nombre, nombre: o.nombre, color: o.color })),
    };
    renderConfigEditor();
    $("#modal-config").classList.remove("hidden");
  }
  function cerrarConfig() { $("#modal-config").classList.add("hidden"); configDraft = null; }

  function renderConfigEditor() {
    GRUPOS.forEach(({ g }) => {
      const cont = $("#cfg-" + g);
      const arr = configDraft[g];
      cont.innerHTML = arr.map((o, i) => filaConfigHTML(o, i, arr.length)).join("");
      cont.querySelectorAll(".cfg-row").forEach((row) => {
        const i = +row.getAttribute("data-i");
        row.querySelector(".cfg-nombre").addEventListener("input", (e) => { configDraft[g][i].nombre = e.target.value; });
        row.querySelector(".cfg-color").addEventListener("input", (e) => { configDraft[g][i].color = e.target.value; actualizarSwatch(row, e.target.value); });
        row.querySelector("[data-up]").addEventListener("click", () => moverConfig(g, i, -1));
        row.querySelector("[data-down]").addEventListener("click", () => moverConfig(g, i, 1));
        row.querySelector("[data-del]").addEventListener("click", () => { configDraft[g].splice(i, 1); renderConfigEditor(); });
      });
    });
  }
  function filaConfigHTML(o, i, n) {
    return `<div class="cfg-row" data-i="${i}">
      <span class="cfg-swatch" style="${badgeStyle(o.color)}">${esc(o.nombre || "?")}</span>
      <input type="color" class="cfg-color" value="${o.color || "#6b7280"}" title="Color" />
      <input type="text" class="cfg-nombre" value="${esc(o.nombre)}" placeholder="Nombre" />
      <button type="button" class="icon-btn" data-up ${i === 0 ? "disabled" : ""} title="Subir">↑</button>
      <button type="button" class="icon-btn" data-down ${i === n - 1 ? "disabled" : ""} title="Bajar">↓</button>
      <button type="button" class="icon-btn danger" data-del title="Eliminar">🗑</button>
    </div>`;
  }
  function actualizarSwatch(row, color) {
    const sw = row.querySelector(".cfg-swatch");
    if (sw) sw.setAttribute("style", badgeStyle(color));
  }
  function moverConfig(g, i, d) {
    const a = configDraft[g], j = i + d;
    if (j < 0 || j >= a.length) return;
    const t = a[i]; a[i] = a[j]; a[j] = t;
    renderConfigEditor();
  }
  function agregarConfig(g) {
    const color = PALETA[configDraft[g].length % PALETA.length];
    configDraft[g].push({ orig: null, nombre: "", color });
    renderConfigEditor();
    const inputs = $("#cfg-" + g).querySelectorAll(".cfg-nombre");
    if (inputs.length) inputs[inputs.length - 1].focus();
  }
  function restaurarConfig() {
    if (!confirm("¿Restaurar las listas a los valores por defecto?\nLos requerimientos que usen valores personalizados quedarán con ese campo en blanco.")) return;
    const d = clone(DEF_CONFIG);
    configDraft = {
      estados: d.estados.map((o) => ({ orig: null, nombre: o.nombre, color: o.color })),
      tipos: d.tipos.map((o) => ({ orig: null, nombre: o.nombre, color: o.color })),
      prioridades: d.prioridades.map((o) => ({ orig: null, nombre: o.nombre, color: o.color })),
    };
    renderConfigEditor();
  }
  function guardarConfigDesdeEditor() {
    for (const { g, titulo } of GRUPOS) {
      const arr = configDraft[g];
      if (!arr.length) { toast(`"${titulo}" debe tener al menos un valor.`); return; }
      const nombres = arr.map((o) => o.nombre.trim());
      if (nombres.some((n) => !n)) { toast(`Hay nombres vacíos en "${titulo}".`); return; }
      const lower = nombres.map((n) => n.toLowerCase());
      if (new Set(lower).size !== lower.length) { toast(`Hay nombres repetidos en "${titulo}".`); return; }
    }
    GRUPOS.forEach(({ g, field }) => {
      const arr = configDraft[g];
      const renameMap = {}, vivos = new Set();
      arr.forEach((o) => {
        const nuevo = o.nombre.trim();
        vivos.add(nuevo);
        if (o.orig && o.orig !== nuevo) renameMap[o.orig] = nuevo;
      });
      // Aplicar renombres/eliminaciones también a la papelera, para que al
      // restaurar un requerimiento no vuelva con un valor que ya no existe.
      [items, papelera].forEach((lista) => {
        lista.forEach((it) => { if (it[field] && renameMap[it[field]]) it[field] = renameMap[it[field]]; });
        lista.forEach((it) => {
          const v = it[field];
          if (v && !vivos.has(v)) {
            it[field] = g === "prioridades" ? (arr[Math.min(1, arr.length - 1)].nombre.trim()) : "";
          }
        });
      });
    });
    guardarPapelera();
    config = {
      estados: configDraft.estados.map((o) => ({ nombre: o.nombre.trim(), color: o.color })),
      tipos: configDraft.tipos.map((o) => ({ nombre: o.nombre.trim(), color: o.color })),
      prioridades: configDraft.prioridades.map((o) => ({ nombre: o.nombre.trim(), color: o.color })),
    };
    guardarConfig(); guardar();
    poblarSelects(); resetFiltros();
    cerrarConfig(); render();
    toast("Configuración guardada.");
  }

  // ---------- CSV ----------
  function csvCampo(v) {
    const s = String(v == null ? "" : v);
    if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function valorCSV(it, c) { return c === "pestana" ? tabNombre(it.pestana) : it[c]; }
  function csvTexto() {
    const cabecera = CAMPOS_CSV.map((c) => csvCampo(ENCABEZADOS_CSV[c])).join(",");
    const filas = items.map((it) => CAMPOS_CSV.map((c) => csvCampo(valorCSV(it, c))).join(","));
    return "﻿" + [cabecera].concat(filas).join("\r\n");
  }
  function exportarCSV() {
    if (!items.length) { toast("No hay requerimientos para exportar."); return; }
    const blob = new Blob([csvTexto()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `requerimientos_${hoyISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exportados ${items.length} requerimientos.`);
  }

  // ---------- Comparador (orden actual de la tabla) ----------
  function comparador(a, b) {
    const { key, dir } = orden;
    const signo = dir === "asc" ? 1 : -1;
    let va = a[key], vb = b[key];
    if (key === "prioridad") {
      va = ordenPrioridad[va] ?? 99; vb = ordenPrioridad[vb] ?? 99;
    } else if (key === "nro" || key === "expLogistica" || key === "expDireccion") {
      const na = parseInt(va, 10), nb = parseInt(vb, 10);
      va = isNaN(na) ? Infinity : na; vb = isNaN(nb) ? Infinity : nb;
    } else {
      va = String(va == null ? "" : va).toLowerCase();
      vb = String(vb == null ? "" : vb).toLowerCase();
    }
    if (va < vb) return -1 * signo;
    if (va > vb) return 1 * signo;
    return 0;
  }

  // ---------- Exportar a Excel (SpreadsheetML 2003: multi-hoja, colores y desplegables) ----------
  const COLS_EXPORT = [
    { f: "nro", h: "N°", w: 44 },
    { f: "pestana", h: "Pestaña", w: 96 },
    { f: "aCargo", h: "A cargo", w: 70 },
    { f: "prioridad", h: "Prioridad", w: 84 },
    { f: "estado", h: "Estado", w: 170 },
    { f: "fechaIngreso", h: "Ingreso a UPROG", w: 110 },
    { f: "expLogistica", h: "Exp. Logística", w: 96 },
    { f: "expDireccion", h: "Exp. Dirección", w: 96 },
    { f: "docArea", h: "Doc. del área", w: 200 },
    { f: "areaEstrategica", h: "Área estratégica", w: 220 },
    { f: "areaUsuaria", h: "Área usuaria", w: 220 },
    { f: "tipo", h: "Tipo", w: 110 },
    { f: "item", h: "Ítem", w: 220 },
    { f: "denominacion", h: "Denominación", w: 320 },
    { f: "especialista", h: "Especialista", w: 130 },
    { f: "fechaPase", h: "F. pase", w: 96 },
    { f: "tengoExp", h: "¿Tengo exp.?", w: 84 },
    { f: "observaciones", h: "Observaciones", w: 260 },
  ];
  const LONG_COLS = new Set(["docArea", "areaEstrategica", "areaUsuaria", "item", "denominacion", "observaciones"]);
  const LISTAS_EXPORT = ["pestana", "aCargo", "prioridad", "estado", "tipo", "tengoExp"];

  function rgbToHex(r, g, b) {
    const h = (x) => ("0" + Math.max(0, Math.min(255, x)).toString(16)).slice(-2);
    return "#" + h(r) + h(g) + h(b);
  }
  function mezclar(hex, conHex, t) {
    const a = hexToRgb(hex), b = hexToRgb(conHex);
    const m = (x, y) => Math.round(x * (1 - t) + y * t);
    return rgbToHex(m(a.r, b.r), m(a.g, b.g), m(a.b, b.b));
  }
  function parColor(hex) {
    if (!hex) return null;
    return [mezclar(hex, "#ffffff", 0.84), mezclar(hex, "#000000", 0.40)];
  }
  function colorCelda(field, v) {
    if (!v) return null;
    if (field === "prioridad") return parColor(COL.prioridad[v]);
    if (field === "estado") return parColor(COL.estado[v]);
    if (field === "tipo") return parColor(COL.tipo[v]);
    if (field === "aCargo") return v === "SÍ" ? ["#e8ecfb", "#2c43b8"] : ["#eef1f6", "#5a6678"];
    if (field === "tengoExp") return v === "SÍ" ? ["#e7f6ee", "#15824a"] : ["#fdecee", "#b3303f"];
    if (field === "pestana") return ["#eef1f6", "#5a6678"];
    return null;
  }
  function valorExport(it, f) {
    if (f === "pestana") return tabNombre(it.pestana);
    if (f === "fechaIngreso" || f === "fechaPase") return fmtFecha(it[f]);
    return it[f] == null ? "" : String(it[f]);
  }
  function sheetName(n) {
    return String(n || "Hoja").replace(/[\[\]:*?\/\\]/g, "-").slice(0, 31) || "Hoja";
  }
  function bordesXML() {
    return "<Borders>" + ["Top", "Bottom", "Left", "Right"].map((s) =>
      `<Border ss:Position="${s}" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#d8deea"/>`).join("") + "</Borders>";
  }
  function styleXML(id, o) {
    o = o || {};
    const font = `<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="${o.fg || "#232a38"}"${o.bold ? ' ss:Bold="1"' : ""}/>`;
    const interior = o.bg ? `<Interior ss:Color="${o.bg}" ss:Pattern="Solid"/>` : "";
    const align = `<Alignment ss:Vertical="Top"${o.align ? ` ss:Horizontal="${o.align}"` : ""}${o.wrap ? ' ss:WrapText="1"' : ""}/>`;
    return `<Style ss:ID="${id}">${align}${bordesXML()}${font}${interior}</Style>`;
  }

  function exportarExcel() {
    if (!items.length) { toast("No hay requerimientos para exportar."); return; }
    let hojas = tabs.filter((t) => items.some((it) => it.pestana === t.id));
    if (!hojas.length) hojas = [tabs[0]];

    const styleMap = {}, stylesArr = [];
    function styleParaColor(bg, fg) {
      const key = bg + "|" + fg;
      if (styleMap[key]) return styleMap[key];
      const id = "c" + stylesArr.length;
      styleMap[key] = id;
      stylesArr.push(styleXML(id, { bg, fg, bold: true, align: "Center" }));
      return id;
    }
    function celdaXML(it, c) {
      const v = valorExport(it, c.f);
      const col = colorCelda(c.f, v);
      let sid = "";
      if (col) sid = styleParaColor(col[0], col[1]);
      else if (c.f === "nro" || c.f === "expLogistica" || c.f === "expDireccion") sid = "sNum";
      else if (LONG_COLS.has(c.f)) sid = "sWrap";
      const styleAttr = sid ? ` ss:StyleID="${sid}"` : "";
      return `<Cell${styleAttr}><Data ss:Type="String">${esc(v)}</Data></Cell>`;
    }
    const colsXML = COLS_EXPORT.map((c) => `<Column ss:Width="${Math.round(c.w * 0.75)}"/>`).join("");
    const headerRow = `<Row ss:Height="22">${COLS_EXPORT.map((c) => `<Cell ss:StyleID="sHead"><Data ss:Type="String">${esc(c.h)}</Data></Cell>`).join("")}</Row>`;

    const NOMBRE_LISTA = { pestana: "LST_PESTANA", aCargo: "LST_SINO", prioridad: "LST_PRIORIDAD", estado: "LST_ESTADO", tipo: "LST_TIPO", tengoExp: "LST_SINO" };
    function validacionesXML(nFilas) {
      const ultima = nFilas + 1 + 300;
      return LISTAS_EXPORT.map((f) => {
        const col = COLS_EXPORT.findIndex((c) => c.f === f) + 1;
        if (col < 1) return "";
        return `<DataValidation xmlns="urn:schemas-microsoft-com:office:excel"><Range>R2C${col}:R${ultima}C${col}</Range><Type>List</Type><Value>${NOMBRE_LISTA[f]}</Value></DataValidation>`;
      }).join("");
    }

    // Listas para los desplegables (rango con nombre en hoja oculta -> independiente del idioma)
    const SINO = ["SÍ", "NO"];
    const colLista = { 1: tabs.map((t) => t.nombre), 2: SINO, 3: config.prioridades.map((o) => o.nombre), 4: config.estados.map((o) => o.nombre), 5: config.tipos.map((o) => o.nombre) };
    const maxL = Math.max(1, colLista[1].length, colLista[2].length, colLista[3].length, colLista[4].length, colLista[5].length);
    let listasRows = "";
    for (let r = 0; r < maxL; r++) {
      let celdas = "";
      for (let c = 1; c <= 5; c++) { const v = colLista[c][r]; celdas += (v != null) ? `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>` : "<Cell/>"; }
      listasRows += `<Row>${celdas}</Row>`;
    }
    const listasSheet = `<Worksheet ss:Name="Listas"><Table>${listasRows}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><Visible>SheetHidden</Visible></WorksheetOptions></Worksheet>`;
    const L = (n) => Math.max(1, n);
    const namesXML = "<Names>" +
      `<NamedRange ss:Name="LST_PESTANA" ss:RefersTo="=Listas!R1C1:R${L(colLista[1].length)}C1"/>` +
      `<NamedRange ss:Name="LST_SINO" ss:RefersTo="=Listas!R1C2:R2C2"/>` +
      `<NamedRange ss:Name="LST_PRIORIDAD" ss:RefersTo="=Listas!R1C3:R${L(colLista[3].length)}C3"/>` +
      `<NamedRange ss:Name="LST_ESTADO" ss:RefersTo="=Listas!R1C4:R${L(colLista[4].length)}C4"/>` +
      `<NamedRange ss:Name="LST_TIPO" ss:RefersTo="=Listas!R1C5:R${L(colLista[5].length)}C5"/>` +
      "</Names>";

    const wsXML = hojas.map((tab) => {
      const lista = items.filter((it) => it.pestana === tab.id).sort(comparador);
      const filas = lista.map((it) => `<Row>${COLS_EXPORT.map((c) => celdaXML(it, c)).join("")}</Row>`).join("");
      const table = `<Table ss:DefaultColumnWidth="80">${colsXML}${headerRow}${filas}</Table>`;
      const opts = '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane><Panes><Pane><Number>3</Number></Pane><Pane><Number>2</Number></Pane></Panes></WorksheetOptions>';
      return `<Worksheet ss:Name="${esc(sheetName(tab.nombre))}">${table}${opts}${validacionesXML(lista.length)}</Worksheet>`;
    }).join("");

    const baseStyles =
      '<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top"/>' + bordesXML() + '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#232a38"/></Style>' +
      `<Style ss:ID="sHead"><Alignment ss:Vertical="Center" ss:Horizontal="Left"/><Borders><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2c43b8"/><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2c43b8"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2c43b8"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2c43b8"/></Borders><Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/><Interior ss:Color="#3b56d6" ss:Pattern="Solid"/></Style>` +
      styleXML("sNum", { align: "Right" }) +
      styleXML("sWrap", { wrap: true });
    const stylesXML = `<Styles>${baseStyles}${stylesArr.join("")}</Styles>`;

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\r\n<?mso-application progid="Excel.Sheet"?>\r\n' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">' +
      stylesXML + namesXML + wsXML + listasSheet + '</Workbook>';

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `PRIORITY_${hoyISO()}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exportados ${items.length} requerimientos en ${hojas.length} hoja${hojas.length === 1 ? "" : "s"} (con desplegables).`);
  }

  // ---------- Importar (CSV, Excel SpreadsheetML, Excel HTML/MHTML) ----------
  // Devuelve el id de pestaña SOLO si el nombre existe (para no mover filas por error).
  function idTabPorNombreEstricto(nombre) {
    if (!nombre) return null;
    const t = tabs.find((x) => x.nombre.toLowerCase() === nombre.trim().toLowerCase());
    return t ? t.id : null;
  }
  // Importa filas SIN duplicar: si el N° Exp. Logística ya existe, actualiza ese
  // requerimiento (las celdas vacías del archivo no borran datos); si no, lo agrega.
  function agregarDesdeFilas(filas, res) {
    if (filas.length < 2) return;
    const idx = indiceColumnas(filas[0]);
    if (idx.expLogistica == null && idx.item == null && idx.denominacion == null) return;
    const porExp = {};
    items.forEach((it) => {
      const k = String(it.expLogistica || "").trim();
      if (k && !porExp[k]) porExp[k] = it;
    });
    for (let i = 1; i < filas.length; i++) {
      const f = filas[i];
      const get = (k) => (idx[k] != null ? (f[idx[k]] || "").trim() : "");
      const item = get("item"), den = get("denominacion"), exp = get("expLogistica");
      if (!exp && !item && !den) continue;
      const existente = exp ? porExp[exp] : null;
      if (existente) {
        const estadoAntes = existente.estado;
        const pon = (campo, val) => { if (val !== "") existente[campo] = val; };
        pon("nro", get("nro"));
        pon("fechaIngreso", normalizarFecha(get("fechaIngreso")));
        pon("expDireccion", get("expDireccion")); pon("docArea", get("docArea"));
        pon("areaEstrategica", get("areaEstrategica")); pon("areaUsuaria", get("areaUsuaria"));
        pon("tipo", get("tipo")); pon("denominacion", den); pon("item", item);
        pon("especialista", get("especialista")); pon("fechaPase", normalizarFecha(get("fechaPase")));
        pon("estado", get("estado")); pon("prioridad", get("prioridad"));
        pon("observaciones", get("observaciones"));
        pon("tengoExp", siNo(get("tengoExp"))); pon("aCargo", siNo(get("aCargo")));
        const tabId = idTabPorNombreEstricto(get("pestana"));
        if (tabId) existente.pestana = tabId;
        existente.actualizado = Date.now();
        logEstado(existente, estadoAntes, existente.estado);
        autoArchivarTerminado(existente);
        res.actualizados++;
      } else {
        const nuevo = {
          id: uid(),
          pestana: idTabPorNombre(get("pestana")),
          nro: get("nro") || nextNro(),
          fechaIngreso: normalizarFecha(get("fechaIngreso")),
          expLogistica: exp, expDireccion: get("expDireccion"), docArea: get("docArea"),
          areaEstrategica: get("areaEstrategica"), areaUsuaria: get("areaUsuaria"),
          tipo: get("tipo") || defTipo(), denominacion: den, item,
          especialista: get("especialista"), fechaPase: normalizarFecha(get("fechaPase")),
          estado: get("estado") || defEstado(),
          prioridad: get("prioridad") || defPrioridad(),
          observaciones: get("observaciones"),
          tengoExp: siNo(get("tengoExp")), aCargo: siNo(get("aCargo")),
          creado: Date.now(),
        };
        logEstado(nuevo, "", nuevo.estado);
        autoArchivarTerminado(nuevo);
        items.push(nuevo);
        if (exp) porExp[exp] = nuevo;
        res.nuevos++;
      }
    }
  }
  function finalizarImport(res) {
    const total = res.nuevos + res.actualizados;
    if (total > 0) { guardar(); render(); } else descartarSnapshot();
    if (!total) { toast("No reconocí datos para importar. Usa el formato de Exportar."); return; }
    const partes = [];
    if (res.nuevos) partes.push(`${res.nuevos} nuevo${res.nuevos === 1 ? "" : "s"}`);
    if (res.actualizados) partes.push(`${res.actualizados} actualizado${res.actualizados === 1 ? "" : "s"} (ya existían, no se duplicaron)`);
    toast("Importación: " + partes.join(" y ") + ".");
  }
  function filasDeTabla(tableEl) {
    return [...tableEl.querySelectorAll("tr")]
      .map((tr) => [...tr.querySelectorAll("th,td")].map((c) => c.textContent.replace(/ /g, " ").trim()))
      .filter((r) => r.some((x) => x !== ""));
  }
  function tablasDeHTML(html) {
    const d = new DOMParser().parseFromString(html, "text/html");
    return [...d.querySelectorAll("table")];
  }
  function partesMHTML(t) {
    const m = t.match(/boundary="?([^"\r\n]+)"?/i);
    if (!m) return [];
    const sep = "--" + m[1];
    const out = [];
    t.split(sep).forEach((p) => {
      let i = p.indexOf("\r\n\r\n"), off = 4;
      if (i < 0) { i = p.indexOf("\n\n"); off = 2; }
      if (i < 0) return;
      const headers = p.slice(0, i).toLowerCase();
      let body = p.slice(i + off);
      if (/content-transfer-encoding:\s*base64/.test(headers)) {
        const b64 = body.replace(/\s+/g, "");
        try { body = decodeURIComponent(escape(atob(b64))); }
        catch (e) { try { body = atob(b64); } catch (e2) { body = ""; } }
      }
      if (/<table/i.test(body)) out.push(body);
    });
    return out;
  }
  function filasDeSpreadsheetML(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    const tablas = [];
    const worksheets = doc.getElementsByTagName("Worksheet");
    for (let w = 0; w < worksheets.length; w++) {
      const rows = worksheets[w].getElementsByTagName("Row");
      const filas = [];
      for (let r = 0; r < rows.length; r++) {
        const hijos = rows[r].children;
        const arr = []; let ci = 0;
        for (let k = 0; k < hijos.length; k++) {
          const c = hijos[k];
          if ((c.localName || c.tagName) !== "Cell") continue;
          const idxAttr = c.getAttribute("ss:Index") || c.getAttribute("Index");
          if (idxAttr) ci = parseInt(idxAttr, 10) - 1;
          const datas = c.getElementsByTagName("Data");
          arr[ci] = datas.length ? (datas[0].textContent || "").trim() : "";
          ci++;
        }
        for (let z = 0; z < arr.length; z++) if (arr[z] == null) arr[z] = "";
        filas.push(arr);
      }
      const limpio = filas.filter((f) => f.some((x) => String(x).trim() !== ""));
      if (limpio.length) tablas.push(limpio);
    }
    return tablas;
  }
  function importarArchivo(texto) {
    snapshot();
    const t = texto.replace(/^﻿/, "");
    const res = { nuevos: 0, actualizados: 0 };
    if (/<\?mso-application/i.test(t) || /<Workbook[\s>]/i.test(t)) {
      filasDeSpreadsheetML(texto).forEach((filas) => { agregarDesdeFilas(filas, res); });
      finalizarImport(res); return;
    }
    if (/multipart\/related/i.test(t) || /^MIME-Version/i.test(t)) {
      partesMHTML(t).forEach((h) => tablasDeHTML(h).forEach((tb) => { agregarDesdeFilas(filasDeTabla(tb), res); }));
      finalizarImport(res); return;
    }
    if (/<table/i.test(t)) {
      tablasDeHTML(t).forEach((tb) => { agregarDesdeFilas(filasDeTabla(tb), res); });
      finalizarImport(res); return;
    }
    agregarDesdeFilas(parseCSV(texto), res);
    finalizarImport(res);
  }

  // ---------- Vincular a un archivo (Excel/CSV) que se actualiza solo ----------
  async function vincularArchivo() {
    if (!window.showSaveFilePicker) {
      toast("Para vincular un archivo usa Chrome o Edge. Mientras tanto usa «Exportar».");
      return;
    }
    if (fileHandle) { await escribirVinculado(true); return; }
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: "requerimientos.csv",
        types: [{ description: "CSV (Excel)", accept: { "text/csv": [".csv"] } }],
      });
      await escribirVinculado(true);
      actualizarBotonVinculo();
    } catch (e) {
      if (e && e.name === "AbortError") return;
      fileHandle = null;
      toast("No se pudo vincular aquí. Suele requerir abrir la app desde un servidor; usa «Exportar» mientras tanto.");
    }
  }
  async function escribirVinculado(avisar) {
    if (!fileHandle) return;
    try {
      const w = await fileHandle.createWritable();
      await w.write(csvTexto());
      await w.close();
      if (avisar) toast(`Archivo vinculado y actualizado (${items.length}). Pulsa «Actualizar» en Excel para verlo.`);
    } catch (e) {
      fileHandle = null;
      actualizarBotonVinculo();
      toast("Se perdió el vínculo con el archivo. Vincúlalo de nuevo.");
    }
  }
  function actualizarBotonVinculo() {
    const b = $("#btn-vincular");
    if (!b) return;
    if (fileHandle) { b.textContent = "🔗 Vinculado ✓"; b.classList.add("vinculado"); b.title = "Archivo vinculado: se actualiza al editar. Clic para reescribir ahora."; }
    else { b.textContent = "🔗 Vincular Excel"; b.classList.remove("vinculado"); b.title = "Vincular a un archivo CSV que se actualiza solo (Chrome/Edge)"; }
  }
  function parseCSV(texto) {
    texto = texto.replace(/^﻿/, "");
    const filas = []; let campo = "", fila = [], dentro = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i], sig = texto[i + 1];
      if (dentro) {
        if (c === '"' && sig === '"') { campo += '"'; i++; }
        else if (c === '"') { dentro = false; }
        else { campo += c; }
      } else {
        if (c === '"') { dentro = true; }
        else if (c === ",") { fila.push(campo); campo = ""; }
        else if (c === "\r") {}
        else if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; }
        else { campo += c; }
      }
    }
    if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter((f) => f.some((x) => String(x).trim() !== ""));
  }
  function indiceColumnas(cabecera) {
    const norm = (s) => String(s).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const legible = {};
    Object.entries(ENCABEZADOS_CSV).forEach(([k, v]) => { legible[norm(v)] = k; });
    COLS_EXPORT.forEach((c) => { legible[norm(c.h)] = c.f; });
    const idx = {};
    cabecera.forEach((h, i) => {
      const n = norm(h);
      if (CAMPOS_CSV.includes(h.trim())) idx[h.trim()] = i;
      else if (legible[n]) idx[legible[n]] = i;
    });
    return idx;
  }
  function normalizarFecha(s) {
    if (!s) return "";
    s = s.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) { let [, d, mo, a] = m; if (a.length === 2) a = "20" + a; return `${a}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`; }
    return "";
  }
  function siNo(v) {
    v = (v || "").trim().toUpperCase();
    return v.startsWith("S") ? "SÍ" : (v.startsWith("N") ? "NO" : "");
  }
  // ---------- Copia de seguridad completa (para pasar a otra PC) ----------
  // Los datos viven en el navegador, no dentro del archivo HTML: esto empaqueta
  // TODO (requerimientos, historial, papelera, listas, columnas, tema y zoom).
  function guardarRespaldo() {
    const datos = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("priority_") === 0) datos[k] = localStorage.getItem(k);
      }
    } catch (e) { toast("No se pudo leer el almacenamiento del navegador."); return; }
    if (!Object.keys(datos).length) { toast("Todavía no hay nada que respaldar."); return; }
    const paquete = {
      app: "PRIORITY",
      formato: 1,
      fecha: new Date().toISOString(),
      requerimientos: items.length,
      datos,
    };
    const blob = new Blob([JSON.stringify(paquete, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `PRIORITY_copia_${hoyISO()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Copia guardada (${items.length} requerimientos, con historial y papelera). Llévala a la otra PC.`);
  }
  function restaurarRespaldo(texto) {
    let paquete;
    try { paquete = JSON.parse(texto); } catch (e) { toast("Ese archivo no es una copia de PRIORITY."); return; }
    if (!paquete || paquete.app !== "PRIORITY" || !paquete.datos || typeof paquete.datos !== "object") {
      toast("Ese archivo no es una copia de PRIORITY (usa el .json de «Guardar copia de todo»)."); return;
    }
    const n = paquete.requerimientos != null ? paquete.requerimientos : "?";
    const cuando = paquete.fecha ? new Date(paquete.fecha).toLocaleString("es-PE") : "fecha desconocida";
    if (!confirm(`Restaurar la copia del ${cuando} (${n} requerimientos).\n\n` +
      `ATENCIÓN: reemplaza TODO lo que haya ahora en esta PC (${items.length} requerimientos).\n¿Continuar?`)) return;
    try {
      // Limpiar solo las claves de la app y escribir las de la copia
      const viejas = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("priority_") === 0) viejas.push(k);
      }
      viejas.forEach((k) => localStorage.removeItem(k));
      Object.keys(paquete.datos).forEach((k) => {
        if (k.indexOf("priority_") === 0) localStorage.setItem(k, String(paquete.datos[k]));
      });
    } catch (e) { toast("No se pudo escribir la copia (¿almacenamiento lleno?)."); return; }
    toast("Copia restaurada. Recargando…");
    setTimeout(() => location.reload(), 700);
  }

  // ---------- Cargar datos de JUNIO ----------
  function cargarJunio() {
    if (!DATOS_JUNIO.length) { toast("No hay datos de junio embebidos."); return; }
    snapshot();
    const existentes = new Set(items.map((it) => String(it.expLogistica)));
    let n = 0;
    DATOS_JUNIO.forEach((d) => {
      if (existentes.has(String(d.expLogistica))) return;
      const obj = Object.assign({ id: uid(), creado: Date.now(), aCargo: "", pestana: tabs[0].id }, d);
      // Los datos vienen con los estados del formato anterior: se traducen al proceso actual
      obj.estado = MAPA_ESTADOS_2[String(obj.estado || "").trim().toUpperCase()] || obj.estado;
      logEstado(obj, "", obj.estado);
      items.push(obj);
      n++;
    });
    if (!n) descartarSnapshot();
    guardar(); render();
    toast(n ? `Cargados ${n} requerimientos de junio en «${tabNombre(tabs[0].id)}».` : "Tus datos de junio ya estaban cargados.");
  }
  function borrarTodo() {
    if (!items.length) { toast("No hay datos para borrar."); return; }
    if (!confirm(`¿Borrar TODOS los ${items.length} requerimientos?\n(Podrás recuperarlos con ↶ Deshacer mientras no cierres la app.)`)) return;
    snapshot();
    items = []; seleccion.clear(); guardar(); render(); toast("Se borraron todos los datos. Usa ↶ Deshacer si fue un error.");
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("hidden"), 2600);
  }

  // ---------- Zoom de la tabla ----------
  function cargarZoom() {
    try { const z = parseFloat(localStorage.getItem(ZOOM_KEY)); if (!isNaN(z)) zoom = z; } catch (e) {}
    aplicarZoom();
  }
  function aplicarZoom() {
    zoom = Math.min(1.3, Math.max(0.5, Math.round(zoom * 100) / 100));
    const tabla = $("#tabla");
    if (tabla) tabla.style.zoom = String(zoom);
    const lbl = $("#zoom-nivel");
    if (lbl) lbl.textContent = Math.round(zoom * 100) + "%";
    try { localStorage.setItem(ZOOM_KEY, String(zoom)); } catch (e) {}
  }
  function cambiarZoom(delta) { zoom += delta; aplicarZoom(); }

  // ---------- KPIs clickeables (tocar una tarjeta filtra la tabla) ----------
  function clickKpi(tipo) {
    if (tipo === "total") { resetFiltros(); renderTabla(); marcarKpis(); return; }
    const mapa = {
      cargo: ["cargo", "SÍ", "#filtro-cargo"],
      alta: ["prioridad", prioridadTop(), "#filtro-prioridad"],
      sinexp: ["tengo", "NO", "#filtro-tengo"],
      pend: ["estado", defEstado(), "#filtro-estado"],
    };
    const par = mapa[tipo];
    if (!par || !par[1]) return;
    const [campo, valor, sel] = par;
    const ya = filtro[campo] === valor;   // segundo clic en la misma tarjeta = quitar el filtro
    resetFiltros();
    if (!ya) { filtro[campo] = valor; $(sel).value = valor; }
    renderTabla(); marcarKpis();
  }
  function marcarKpis() {
    const activos = {
      cargo: filtro.cargo === "SÍ",
      alta: !!prioridadTop() && filtro.prioridad === prioridadTop(),
      sinexp: filtro.tengo === "NO",
      pend: !!filtro.estado && filtro.estado === defEstado(),
    };
    $$(".kpi-btn").forEach((k) => {
      const t = k.getAttribute("data-kpi");
      k.classList.toggle("kpi-activo", !!activos[t]);
    });
  }

  // ---------- Registro exprés ----------
  function toggleExpress(abrir) {
    const bar = $("#express-bar");
    const mostrar = abrir != null ? abrir : bar.classList.contains("hidden");
    bar.classList.toggle("hidden", !mostrar);
    if (mostrar) {
      $("#ex-tipo").innerHTML = config.tipos.map((o) => `<option value="${esc(o.nombre)}">${esc(o.nombre)}</option>`).join("");
      poblarDatalist("dl-ex-doc", "docArea");
      poblarDatalist("dl-ex-area", "areaUsuaria");
      $("#ex-exp").focus();
    }
  }
  function guardarExpress() {
    const exp = $("#ex-exp").value.trim();
    if (!exp) { toast("Escribe el N° Exp. Logística (es lo único obligatorio)."); $("#ex-exp").focus(); return; }
    const dup = buscarDuplicado(exp, null);
    if (dup && !confirm(`Ya existe el Exp. ${exp} (N° ${dup.nro || "—"} en «${tabNombre(dup.pestana)}»).\n¿Registrar de todos modos?`)) return;
    snapshot();
    const area = $("#ex-area").value.trim();
    const nuevo = {
      id: uid(), creado: Date.now(),
      pestana: pestanaActiva,
      nro: nextNro(),
      fechaIngreso: hoyISO(),
      expLogistica: exp, expDireccion: "",
      docArea: $("#ex-doc").value.trim(),
      // El área estratégica casi siempre coincide con el área usuaria; se copia y se corrige luego si difiere
      areaEstrategica: area, areaUsuaria: area,
      tipo: $("#ex-tipo").value || defTipo(),
      item: "", denominacion: $("#ex-den").value.trim(),
      prioridad: defPrioridad(), estado: defEstado(),
      especialista: "", fechaPase: "", tengoExp: "", aCargo: "SÍ",
      observaciones: "",
    };
    logEstado(nuevo, "", nuevo.estado);
    items.push(nuevo);
    guardar(); render();
    ["#ex-exp", "#ex-doc", "#ex-area", "#ex-den"].forEach((s) => { $(s).value = ""; });
    poblarDatalist("dl-ex-doc", "docArea");
    poblarDatalist("dl-ex-area", "areaUsuaria");
    $("#ex-exp").focus();
    toast(`N° ${nuevo.nro} · Exp. ${exp} registrado en «${tabNombre(pestanaActiva)}». Sigue con el siguiente.`);
  }

  // ---------- Navegación con teclado en la tabla (tipo Excel) ----------
  const nav = { fila: -1, col: -1 };
  function filasNavegables() { return $$("#tbody tr").filter((tr) => tr.querySelector("td.ed")); }
  function aplicarNav() {
    $$("#tbody td.celda-activa").forEach((td) => td.classList.remove("celda-activa"));
    if (nav.fila < 0 || nav.col < 0) return;
    const filas = filasNavegables();
    if (!filas.length) { nav.fila = -1; return; }
    nav.fila = Math.min(nav.fila, filas.length - 1);
    const celdas = filas[nav.fila].querySelectorAll("td.ed");
    nav.col = Math.min(nav.col, celdas.length - 1);
    const td = celdas[nav.col];
    if (td) {
      td.classList.add("celda-activa");
      if (td.scrollIntoView) td.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }
  function moverNav(df, dc) {
    const filas = filasNavegables();
    if (!filas.length) return;
    if (nav.fila < 0) { nav.fila = 0; nav.col = 0; }
    else {
      nav.fila = Math.max(0, Math.min(filas.length - 1, nav.fila + df));
      const nCols = filas[nav.fila].querySelectorAll("td.ed").length;
      nav.col = Math.max(0, Math.min(nCols - 1, nav.col + dc));
    }
    aplicarNav();
  }
  function tecladoTabla(e) {
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
    if (document.querySelector(".cell-popover")) return;  // hay un editor abierto
    const modalAbierto = ["modal", "modal-glosario", "modal-config", "modal-papelera"]
      .some((id) => { const m = document.getElementById(id); return m && !m.classList.contains("hidden"); });
    if (modalAbierto) return;
    const dir = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (dir) { e.preventDefault(); moverNav(dir[0], dir[1]); return; }
    if ((e.key === "Enter" || e.key === "F2") && nav.fila >= 0) {
      const filas = filasNavegables();
      const td = filas[nav.fila] && filas[nav.fila].querySelectorAll("td.ed")[nav.col];
      if (td) { e.preventDefault(); startEdit(td); }
      return;
    }
    if (e.key === "Escape" && nav.fila >= 0) { nav.fila = -1; nav.col = -1; aplicarNav(); }
  }

  // ---------- Modo enfoque: la tabla ocupa casi toda la página al navegar ----------
  function conectarModoFoco() {
    const wrap = document.querySelector(".table-wrap");
    if (!wrap) return;
    let foco = false;
    let bloqueadoHasta = 0;
    wrap.addEventListener("scroll", () => {
      const ahora = Date.now();
      // Tras cada cambio se ignoran los eventos del reacomodo (el navegador recorta
      // el scroll al crecer/encoger la tabla y eso volvía a disparar el modo).
      if (ahora < bloqueadoHasta) return;
      const y = wrap.scrollTop;
      const rango = wrap.scrollHeight - wrap.clientHeight;
      if (!foco) {
        // Compactar solo si hay bastante que desplazar: con una lista corta (p. ej.
        // filtrada por el buscador) la tabla crecería, todo cabría y el modo se
        // apagaría solo, quedando en un bucle de parpadeo que "traba" la página.
        if (y > 60 && rango > 340) {
          foco = true; document.body.classList.add("modo-foco");
          bloqueadoHasta = ahora + 350;
        }
      } else if (y < 10) {
        foco = false; document.body.classList.remove("modo-foco");
        bloqueadoHasta = ahora + 350;
      }
    });
  }

  // ---------- Tema (claro / oscuro) ----------
  const TEMA_KEY = "priority_tema";
  function aplicarTema(tema) {
    const oscuro = tema === "oscuro";
    document.documentElement.setAttribute("data-theme", oscuro ? "dark" : "light");
    const btn = $("#btn-tema");
    if (btn) {
      btn.textContent = oscuro ? "☀" : "🌙";
      btn.title = oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro";
    }
    try { localStorage.setItem(TEMA_KEY, tema); } catch (e) {}
  }
  function cargarTema() {
    let tema = "claro";
    try {
      const g = localStorage.getItem(TEMA_KEY);
      if (g === "oscuro" || g === "claro") tema = g;
      else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) tema = "oscuro";
    } catch (e) {}
    aplicarTema(tema);
  }
  function alternarTema() {
    const actual = document.documentElement.getAttribute("data-theme") === "dark" ? "oscuro" : "claro";
    aplicarTema(actual === "oscuro" ? "claro" : "oscuro");
    if (typeof render === "function") render(); // recalcular colores de etiquetas según el tema
  }

  // ---------- Init ----------
  function poblarSelects() {
    const optList = (arr) => arr.map((o) => `<option value="${esc(o.nombre)}">${esc(o.nombre)}</option>`).join("");
    $("#f-tipo").innerHTML = optList(config.tipos);
    $("#f-estado").innerHTML = optList(config.estados);
    $("#f-prioridad").innerHTML = optList(config.prioridades);
    $("#f-pestana").innerHTML = tabs.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join("");
    $("#filtro-estado").innerHTML = '<option value="">Todo estado</option>' + optList(config.estados);
    $("#filtro-prioridad").innerHTML = '<option value="">Toda prioridad</option>' + optList(config.prioridades);
    $("#filtro-tipo").innerHTML = '<option value="">Todo tipo</option>' + optList(config.tipos);
    $("#batch-estado").innerHTML = '<option value="">Cambiar estado…</option>' + optList(config.estados);
    $("#batch-prioridad").innerHTML = '<option value="">Cambiar prioridad…</option>' + optList(config.prioridades);
    $("#batch-pestana").innerHTML = '<option value="">Mover a pestaña…</option>' + tabs.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join("");
  }
  function resetFiltros() {
    filtro.q = ""; filtro.cargo = ""; filtro.estado = ""; filtro.prioridad = ""; filtro.tipo = ""; filtro.tengo = "";
    $("#buscar").value = ""; $("#filtro-cargo").value = ""; $("#filtro-estado").value = "";
    $("#filtro-prioridad").value = ""; $("#filtro-tipo").value = ""; $("#filtro-tengo").value = "";
  }

  // ---------- Íconos de ayuda (ℹ) con tooltip ----------
  function conectarAyudas() {
    $$(".help-icon").forEach((btn) => {
      const id = btn.id.replace(/^ayuda-/, "");
      const tip = $("#tooltip-" + id);
      if (!tip) return;
      const mostrar = () => { $$(".help-tooltip").forEach((t) => { if (t !== tip) t.classList.add("hidden"); }); tip.classList.remove("hidden"); };
      const ocultar = () => tip.classList.add("hidden");
      btn.addEventListener("mouseenter", mostrar);
      btn.addEventListener("mouseleave", () => { if (!tip.matches(":hover")) ocultar(); });
      tip.addEventListener("mouseleave", ocultar);
      btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); mostrar(); });
      btn.addEventListener("focus", mostrar);
      btn.addEventListener("blur", () => setTimeout(ocultar, 120));
      const cerrar = $("#tooltip-" + id + "-close");
      if (cerrar) cerrar.addEventListener("click", (e) => { e.stopPropagation(); ocultar(); });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const abiertos = $$(".help-tooltip").filter((t) => !t.classList.contains("hidden"));
      if (!abiertos.length) return;
      abiertos.forEach((t) => t.classList.add("hidden"));
      e.stopImmediatePropagation();
    });
    document.addEventListener("click", (e) => {
      if (e.target.closest(".help-icon") || e.target.closest(".help-tooltip")) return;
      $$(".help-tooltip").forEach((t) => t.classList.add("hidden"));
    });
  }

  function conectarEventos() {
    $("#btn-nuevo").addEventListener("click", () => abrirModal(null));
    $("#btn-nuevo-2").addEventListener("click", () => abrirModal(null));

    // Registro exprés
    $("#btn-express").addEventListener("click", () => toggleExpress());
    $("#ex-guardar").addEventListener("click", guardarExpress);
    $("#ex-cerrar").addEventListener("click", () => toggleExpress(false));
    $("#express-bar").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); guardarExpress(); }
      else if (e.key === "Escape") { e.preventDefault(); toggleExpress(false); }
    });

    // KPIs clickeables
    $("#kpis").addEventListener("click", (e) => {
      const k = e.target.closest(".kpi-btn");
      if (k) clickKpi(k.getAttribute("data-kpi"));
    });

    // Navegación con teclado en la tabla
    document.addEventListener("keydown", tecladoTabla);
    $("#btn-junio").addEventListener("click", cargarJunio);
    $("#btn-junio-2").addEventListener("click", cargarJunio);
    $("#btn-jalar").addEventListener("click", jalarACargo);
    $("#btn-archivar").addEventListener("click", archivarTerminados);
    $("#zoom-menos").addEventListener("click", () => cambiarZoom(-0.1));
    $("#zoom-mas").addEventListener("click", () => cambiarZoom(0.1));
    $("#zoom-nivel").addEventListener("click", () => { zoom = 1; aplicarZoom(); });
    $("#btn-tema").addEventListener("click", alternarTema);
    $("#modal-close").addEventListener("click", cerrarModal);
    $("#btn-cancelar").addEventListener("click", cerrarModal);
    $("#form").addEventListener("submit", guardarDesdeForm);
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") cerrarModal(); });

    conectarAyudas();

    // Pestañas
    $("#tabs").addEventListener("click", (e) => {
      const b = e.target.closest(".tab"); if (b) setPestana(b.getAttribute("data-tab"));
    });
    $("#tabs").addEventListener("dblclick", (e) => {
      const b = e.target.closest(".tab"); if (b) renombrarTab(b.getAttribute("data-tab"));
    });

    // Edición en línea y eliminación (delegación en el tbody)
    $("#tbody").addEventListener("click", (e) => {
      const chk = e.target.closest(".sel-check");
      if (chk) { toggleSel(chk.getAttribute("data-sel"), chk.checked); return; }
      const selTd = e.target.closest("td.sel-col");
      if (selTd) {
        const c = selTd.querySelector(".sel-check");
        if (c) { c.checked = !c.checked; toggleSel(c.getAttribute("data-sel"), c.checked); }
        return;
      }
      const his = e.target.closest("[data-hist]");
      if (his) { abrirHistorial(his.getAttribute("data-hist"), his); return; }
      // ⏭ Avanzar al siguiente estado del proceso
      const sig = e.target.closest("[data-sig]");
      if (sig) {
        e.stopPropagation();
        avanzarEstado(sig.getAttribute("data-sig"));
        return;
      }
      // Sublíneas editables (denominación bajo el ítem, estratégica bajo el área)
      const sub = e.target.closest(".sub-edit");
      if (sub) {
        const it = items.find((x) => x.id === sub.getAttribute("data-id"));
        const td = sub.closest("td");
        if (it && td) editarTextareaPopover(td, it, sub.getAttribute("data-sub"));
        return;
      }
      const del = e.target.closest("[data-del]");
      if (del) { eliminar(del.getAttribute("data-del")); return; }
      const td = e.target.closest("td.ed");
      if (td) {
        // El clic también fija la celda activa para seguir con el teclado
        const tr = td.parentElement;
        nav.fila = filasNavegables().indexOf(tr);
        nav.col = Array.prototype.indexOf.call(tr.querySelectorAll("td.ed"), td);
        aplicarNav();
        startEdit(td);
      }
    });

    // Glosario
    $("#btn-glosario").addEventListener("click", abrirGlosario);
    $("#glosario-close").addEventListener("click", cerrarGlosario);
    $("#glosario-cerrar").addEventListener("click", cerrarGlosario);
    $("#modal-glosario").addEventListener("click", (e) => { if (e.target.id === "modal-glosario") cerrarGlosario(); });

    // Selección múltiple / acciones en lote (delegado: el thead se reconstruye)
    $("#tabla").querySelector("thead").addEventListener("change", (e) => {
      if (e.target.id !== "sel-all") return;
      const lista = visibles();
      if (e.target.checked) lista.forEach((it) => seleccion.add(it.id));
      else lista.forEach((it) => seleccion.delete(it.id));
      renderTabla(); sincronizarSeleccion();
    });
    $("#batch-estado").addEventListener("change", (e) => { const v = e.target.value; e.target.value = ""; if (v) aplicarLote("estado", v, "Estado"); });
    $("#batch-prioridad").addEventListener("change", (e) => { const v = e.target.value; e.target.value = ""; if (v) aplicarLote("prioridad", v, "Prioridad"); });
    $("#batch-pestana").addEventListener("change", (e) => { const v = e.target.value; e.target.value = ""; if (v) aplicarLote("pestana", v, "Pestaña"); });
    $("#batch-cargo").addEventListener("change", (e) => { const v = e.target.value; e.target.value = ""; if (v) aplicarLote("aCargo", v, "A cargo"); });
    $("#batch-especialista").addEventListener("click", () => {
      const nombre = prompt("Especialista a asignar a los seleccionados:", "");
      if (nombre === null) return;
      aplicarLote("especialista", nombre.trim(), "Especialista");
    });
    $("#batch-eliminar").addEventListener("click", eliminarLote);
    $("#batch-cancelar").addEventListener("click", () => { seleccion.clear(); renderTabla(); sincronizarSeleccion(); });

    // Papelera
    $("#btn-papelera").addEventListener("click", abrirPapelera);
    $("#papelera-close").addEventListener("click", cerrarPapelera);
    $("#papelera-cerrar").addEventListener("click", cerrarPapelera);
    $("#modal-papelera").addEventListener("click", (e) => { if (e.target.id === "modal-papelera") cerrarPapelera(); });
    $("#papelera-lista").addEventListener("click", (e) => {
      const b = e.target.closest("[data-restaurar]");
      if (b) restaurarDePapelera(b.getAttribute("data-restaurar"));
    });
    $("#papelera-vaciar").addEventListener("click", () => {
      if (!papelera.length) { toast("La papelera ya está vacía."); return; }
      if (!confirm(`¿Vaciar la papelera (${papelera.length})? Esto no se puede deshacer.`)) return;
      papelera = []; guardarPapelera(); renderPapelera(); sincronizarSeleccion();
      toast("Papelera vaciada.");
    });

    // Deshacer
    $("#btn-deshacer").addEventListener("click", deshacer);
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        const el = document.activeElement;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
        e.preventDefault();
        deshacer();
      }
    });

    // Configuración
    $("#btn-config").addEventListener("click", abrirConfig);
    $("#config-close").addEventListener("click", cerrarConfig);
    $("#config-cancelar").addEventListener("click", cerrarConfig);
    $("#config-guardar").addEventListener("click", guardarConfigDesdeEditor);
    $("#config-restaurar").addEventListener("click", restaurarConfig);
    $("#modal-config").addEventListener("click", (e) => { if (e.target.id === "modal-config") cerrarConfig(); });
    $$("[data-add]").forEach((b) => b.addEventListener("click", () => agregarConfig(b.getAttribute("data-add"))));

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      // El glosario puede abrirse sobre otro modal (ej. mientras se llena "Nuevo
      // requerimiento"); Escape debe cerrar primero el glosario sin perder el formulario.
      if (!$("#modal-glosario").classList.contains("hidden")) cerrarGlosario();
      else if (!$("#modal-papelera").classList.contains("hidden")) cerrarPapelera();
      else if (!$("#modal").classList.contains("hidden")) cerrarModal();
      else if (!$("#modal-config").classList.contains("hidden")) cerrarConfig();
    });

    $("#buscar").addEventListener("input", (e) => { filtro.q = e.target.value; renderTabla(); });
    $("#filtro-cargo").addEventListener("change", (e) => { filtro.cargo = e.target.value; renderTabla(); });
    $("#filtro-estado").addEventListener("change", (e) => { filtro.estado = e.target.value; renderTabla(); });
    $("#filtro-prioridad").addEventListener("change", (e) => { filtro.prioridad = e.target.value; renderTabla(); });
    $("#filtro-tipo").addEventListener("change", (e) => { filtro.tipo = e.target.value; renderTabla(); });
    $("#filtro-tengo").addEventListener("change", (e) => { filtro.tengo = e.target.value; renderTabla(); });
    $("#btn-limpiar").addEventListener("click", () => { resetFiltros(); renderTabla(); });

    // Ordenar por columna (delegado: el thead se reconstruye al cambiar columnas)
    $("#tabla").querySelector("thead").addEventListener("click", (e) => {
      if (e.target.id === "sel-all" || e.target.closest(".sel-col")) return;
      const th = e.target.closest("th[data-sort]");
      if (!th) return;
      const key = th.getAttribute("data-sort");
      if (orden.key === key) orden.dir = orden.dir === "asc" ? "desc" : "asc";
      else { orden.key = key; orden.dir = "asc"; }
      render();
    });

    // Selector de columnas visibles
    $("#btn-columnas").addEventListener("click", (e) => abrirSelectorColumnas(e.currentTarget));

    // Menú «⋯» (glosario, configurar, vincular, importar)
    $("#btn-mas").addEventListener("click", (e) => {
      e.stopPropagation();
      $("#menu-mas").classList.toggle("hidden");
    });
    $("#menu-mas").addEventListener("click", () => $("#menu-mas").classList.add("hidden"));
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".menu-wrap")) $("#menu-mas").classList.add("hidden");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") $("#menu-mas").classList.add("hidden");
    });

    $("#btn-exportar").addEventListener("click", exportarExcel);
    $("#btn-vincular").addEventListener("click", vincularArchivo);
    $("#btn-importar").addEventListener("click", () => $("#file-import").click());
    $("#file-import").addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => importarArchivo(ev.target.result);
      reader.readAsText(file, "UTF-8");
      e.target.value = "";
    });
    $("#btn-borrar-todo").addEventListener("click", borrarTodo);

    // Copia de seguridad completa
    $("#btn-respaldo").addEventListener("click", guardarRespaldo);
    $("#btn-restaurar").addEventListener("click", () => $("#file-respaldo").click());
    $("#file-respaldo").addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => restaurarRespaldo(ev.target.result);
      reader.readAsText(file, "UTF-8");
      e.target.value = "";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    cargarTema();
    cargarColumnas();
    cargarTabs();
    cargarConfig();
    cargarPapelera();
    poblarSelects();
    conectarEventos();
    cargar();
    migrarEstadosProceso();
    render();
    cargarZoom();
    conectarModoFoco();
  });
})();
