// ==========================================
// 1. CONFIGURACIÓN DE ESTILOS (Colores Corporativos Muted - Estilo ROBIN)
// ==========================================
const COLORES_MARCAS = {
  "DIAGEO":   { fondo: "#F1F1EF", texto: "#37352F" }, // Gris Claro sutil
  "GAMA":     { fondo: "#FDEBEC", texto: "#601E21" }, // Rojo Pastel sutil
  "LASANTE":  { fondo: "#EDF6EC", texto: "#1C3D27" }, // Verde Pastel sutil
  "LASANTE ": { fondo: "#EDF6EC", texto: "#1C3D27" },
  "SANTE":    { fondo: "#EDF6EC", texto: "#1C3D27" },
  "ROBIN":    { fondo: "#F4EEEE", texto: "#44322E" }, // Marrón Claro elegante
  "TMK":      { fondo: "#FAEBDD", texto: "#5C2B14" }  // Naranja Pastel sutil
};

const COLORES_ESTADOS = {
  "pendiente":   { fondo: "#F1F1EF", texto: "#5F5E5B" },
  "en progreso": { fondo: "#E8F4FC", texto: "#1D4ED8" },
  "seguimiento": { fondo: "#F3E8FF", texto: "#6B21A8" },
  "en revision": { fondo: "#FEF3C7", texto: "#B45309" },
  "en pausa":    { fondo: "#FEE2E2", texto: "#991B1B" },
  "suspendido":  { fondo: "#F4F4F5", texto: "#52525B" },
  "completada":  { fondo: "#DCFCE7", texto: "#166534" }
};

const PRIORIDAD_ESTADOS = {
  "pendiente": 1,
  "en progreso": 2,
  "seguimiento": 3,
  "en revision": 4,
  "en pausa": 5,
  "suspendido": 6,
  "completada": 99
};

const LISTA_ESTADOS_VALIDOS = [
  "⚪ Pendiente",
  "🔵 En progreso",
  "🟡 Seguimiento",
  "🟠 En revisión",
  "🔴 En pausa",
  "⚫ Suspendido",
  "🟢 Completada"
];

// ==========================================
// 2. EVENTO DE ARRANQUE Y FORMATO GENERAL
// ==========================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🐦 Acciones de Marcas')
    .addItem('Distribuir a hojas y limpiar', 'distribuirDatos')
    .addItem('Corregir estructura manualmente', 'corregirEstructuraHojas')
    .addItem('Aplicar diseño Robin a todo', 'actualizarHojasRobin')
    .addToUi();

  corregirEstructuraHojas();
  actualizarHojaHoy();
  actualizarHojasRobin();
}

// ==========================================
// 3. EVENTO DE EDICIÓN EN VIVO DESDE GOOGLE SHEETS
// ==========================================
function onEdit(e) {
  if (!e || !e.range) return;

  var sheet = e.source.getActiveSheet();
  var sheetName = sheet.getName().trim();
  var col = e.range.getColumn();
  var row = e.range.getRow();

  var inicioFila = (sheetName === "Hoy") ? 5 : 3;
  if (row < inicioFila) return;

  // Sincronizaciones desde la hoja consolidada de hoy
  if (sheetName === "Hoy" && (col === 8 || col === 9 || col === 11)) {
    sincronizarDesdeHoy(e);
    return;
  }

  var pestañasMarcas = ["DIAGEO", "GAMA", "La Santé", "ROBIN", "TMK"];

  // Sincronizaciones desde las hojas de marcas independientes
  if (pestañasMarcas.indexOf(sheetName) !== -1 && (col === 7 || col === 8 || col === 10)) {
    sincronizarDesdeMarca(e);
    return;
  }
}

// ==========================================
// 4. LIMPIADORES Y NORMALIZADORES DE ESTADO
// ==========================================
function cleanEstado(val) {
  if (!val) return "";
  return String(val)
    .replace(/[\u2600-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obtenerEstadoConEmoji(texto) {
  var clean = cleanEstado(texto);
  if (clean === "pendiente") return "⚪ Pendiente";
  if (clean === "en progreso") return "🔵 En progreso";
  if (clean === "seguimiento") return "🟡 Seguimiento";
  if (clean === "en revision") return "🟠 En revisión";
  if (clean === "en pausa") return "🔴 En pausa";
  if (clean === "suspendido") return "⚫ Suspendido";
  if (clean === "completada" || clean === "completado") return "🟢 Completada";
  return "⚪ Pendiente";
}

// ==========================================
// 5. ESCRIBIR Y LEER FECHAS EN SAFE FORMAT
// ==========================================
function setFechaSafe(sheet, row, col, valStr) {
  if (!valStr) {
    sheet.getRange(row, col).clearContent();
    return;
  }
  var str = String(valStr).trim();
  if (str === "") {
    sheet.getRange(row, col).clearContent();
    return;
  }
  
  var partes = str.split(/[-/]/);
  if (partes.length === 3) {
    var dia, mes, anio;
    if (partes[0].length === 4) {
      anio = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10) - 1;
      dia = parseInt(partes[2], 10);
    } else {
      dia = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10) - 1;
      anio = parseInt(partes[2], 10);
      if (anio < 100) anio += 2000;
    }
    
    var d = new Date(anio, mes, dia);
    if (!isNaN(d.getTime())) {
      var formatted = Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM/yyyy");
      sheet.getRange(row, col).setValue(formatted);
      return;
    }
  }
  sheet.getRange(row, col).setValue(valStr);
}

function formatearFechaSafe(val, ss) {
  if (!val) return "";
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    var yyyy = val.getFullYear();
    var mm = String(val.getMonth() + 1).padStart(2, '0');
    var dd = String(val.getDate()).padStart(2, '0');
    return yyyy + "-" + mm + "-" + dd;
  }
  
  var str = String(val).trim();
  if (str === "") return "";

  if (str.includes("GMT") || str.includes("Venezuela") || str.includes("Wed") || str.includes("Thu")) {
    var d = new Date(str);
    if (!isNaN(d.getTime())) {
      var yyyy = d.getFullYear();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      return yyyy + "-" + mm + "-" + dd;
    }
  }

  var partes = str.split(/[-/]/);
  if (partes.length === 3) {
    var dia, mes, anio;
    if (partes[0].length === 4) {
      anio = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10) - 1;
      dia = parseInt(partes[2], 10);
    } else {
      dia = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10) - 1;
      anio = parseInt(partes[2], 10);
      if (anio < 100) anio += 2000;
    }
    var d = new Date(anio, mes, dia);
    if (!isNaN(d.getTime())) {
      var yyyy = d.getFullYear();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      return yyyy + "-" + mm + "-" + dd;
    }
  }
  return "";
}

function obtenerTiempoFecha(val) {
  if (!val) return Infinity;
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate()).getTime();
  }
  var str = String(val).trim();
  if (str === "") return Infinity;

  var partes = str.split(/[-/]/);
  if (partes.length === 3) {
    var dia, mes, anio;
    if (partes[0].length === 4) {
      anio = parseInt(partes[0], 10); mes = parseInt(partes[1], 10) - 1; dia = parseInt(partes[2], 10);
    } else {
      dia = parseInt(partes[0], 10); mes = parseInt(partes[1], 10) - 1; anio = parseInt(partes[2], 10);
      if (anio < 100) anio += 2000;
    }
    var d = new Date(anio, mes, dia);
    return isNaN(d.getTime()) ? Infinity : d.getTime();
  }
  return Infinity;
}

// ==========================================
// 6. DISEÑADOR DE CABECERAS
// ==========================================
function configurarHeadersNotion(sheet) {
  var sheetName = sheet.getName().trim();
  if (sheetName === "Resumen Marcas" || sheetName === "Config_Marcas") return;

  var isHoy = (sheetName === "Hoy");
  var rowHeader = isHoy ? 4 : 2;
  var startCol = isHoy ? 2 : 1;

  // Cabecera extendida a 10 columnas incluyendo la prioridad
  var headers = [
    "Marca",
    "Categoría",
    "Inicio",
    "Info / Detalles",
    "Personas",
    "Detalles",
    "Estado",
    "Deadline",
    "ID Tarea",
    "Prioridad"
  ];

  sheet.getRange(rowHeader, startCol, 1, 10).clearDataValidations().setValues([headers]);
}

// ==========================================
// 7. APLICAR FORMATO MINIMALISTA ROBIN A TODO EL DOCUMENTO
// ==========================================
function actualizarHojasRobin() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pestañasMarcas = ["DIAGEO", "GAMA", "La Santé", "ROBIN", "TMK"];

  var sheetHoy = ss.getSheetByName("Hoy");
  if (sheetHoy) {
    configurarHeadersNotion(sheetHoy);
    aplicarEstilosFila(sheetHoy);
  }

  for (var i = 0; i < pestañasMarcas.length; i++) {
    var sheet = ss.getSheetByName(pestañasMarcas[i]);
    if (sheet) {
      configurarHeadersNotion(sheet);
      aplicarEstilosFila(sheet);
    }
  }
}

// ==========================================
// 8. CONTROLADOR HOJA "HOY" (CONSTRUCCIÓN COMPLETA)
// ==========================================
function actualizarHojaHoy() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetHoy = ss.getSheetByName("Hoy");
  if (!sheetHoy) return;

  var lastRowHoy = sheetHoy.getLastRow();
  if (lastRowHoy >= 5) {
    // Limpia 10 columnas del cuerpo (Columna B a K)
    sheetHoy.getRange(5, 2, lastRowHoy - 4, 10).clearContent().clearDataValidations();
  }

  var pestañasMarcas = ["DIAGEO", "GAMA", "La Santé", "ROBIN", "TMK"];
  var todasLasTareas = [];

  var hoy = new Date();
  var hoyString = Utilities.formatDate(hoy, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy");
  var tHoy = obtenerTiempoFecha(hoyString);

  for (var i = 0; i < pestañasMarcas.length; i++) {
    var sheetMarca = ss.getSheetByName(pestañasMarcas[i]);
    if (sheetMarca) {
      var lastRowMarca = sheetMarca.getLastRow();
      if (lastRowMarca >= 3) {
        // Leer 10 columnas por registro de marca
        var valores = sheetMarca.getRange(3, 1, lastRowMarca - 2, 10).getValues();
        for (var j = 0; j < valores.length; j++) {
          var txtMarca = String(valores[j][0]).trim();
          var txtEstado = valores[j][6] ? cleanEstado(valores[j][6]) : "";
          var fechaDeadline = valores[j][7];

          var tDeadline = obtenerTiempoFecha(fechaDeadline);
          if (txtMarca !== "" && txtEstado !== "completada" && txtEstado !== "suspendido" && tDeadline === tHoy && tDeadline !== Infinity) {
            todasLasTareas.push(valores[j]);
          }
        }
      }
    }
  }

  todasLasTareas.sort(function(a, b) {
    var estA = a[6] ? cleanEstado(a[6]) : "";
    var estB = b[6] ? cleanEstado(b[6]) : "";
    return (PRIORIDAD_ESTADOS[estA] || 50) - (PRIORIDAD_ESTADOS[estB] || 50);
  });

  if (todasLasTareas.length > 0) {
    sheetHoy.getRange(5, 2, todasLasTareas.length, 10).setValues(todasLasTareas);

    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(LISTA_ESTADOS_VALIDOS, true)
      .build();
    sheetHoy.getRange(5, 8, todasLasTareas.length, 1).setDataValidation(rule);
  }

  aplicarEstilosFila(sheetHoy);
}

// ==========================================
// 9. DISTRIBUIDOR DE DATOS DESDE RESUMEN MARCAS
// ==========================================
function distribuirDatos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetOrigen = ss.getSheetByName("Resumen Marcas");
  if (!sheetOrigen) return;

  var directorio = {
    "miguel": "mbonilla@robin-agency.com",
    "pedro": "pedro@ejemplo.com",
    "maria": "maria@ejemplo.com"
  };

  // Se añade 1 columna al rango para jalar también prioridad (C a K)
  var secciones = [
    { rango: "C6:K10", marca: "DIAGEO" },
    { rango: "C14:K18", marca: "GAMA" },
    { rango: "C22:K26", marca: "La Santé" },
    { rango: "C30:K34", marca: "ROBIN" },
    { rango: "C38:K42", marca: "TMK" }
  ];

  var datosMovidos = 0;
  var hojasModificadas = [];

  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(LISTA_ESTADOS_VALIDOS, true)
    .build();

  for (var r = 0; r < secciones.length; r++) {
    var rango = sheetOrigen.getRange(secciones[r].rango);
    var valores = rango.getValues();
    var nombreMarca = secciones[r].marca;

    for (var i = 0; i < valores.length; i++) {
      var filaResumen = valores[i];
      var datosFila = filaResumen.slice(0).join("").trim();

      if (datosFila !== "") {
        var sheetDestino = ss.getSheetByName(nombreMarca);
        if (sheetDestino) {
          var categoria = filaResumen[0] !== undefined && filaResumen[0] !== "" ? filaResumen[0] : "";
          var fecha = filaResumen[1] !== undefined && filaResumen[1] !== "" ? filaResumen[1] : "";
          var info = filaResumen[2] !== undefined && filaResumen[2] !== "" ? filaResumen[2] : "";
          var persona = filaResumen[3] !== undefined && filaResumen[3] !== "" ? String(filaResumen[3]).trim() : "";
          var detalles = filaResumen[4] !== undefined && filaResumen[4] !== "" ? filaResumen[4] : "";
          var estadoRaw = filaResumen[5] !== undefined && filaResumen[5] !== "" ? String(filaResumen[5]).trim() : "⚪ Pendiente";
          var deadline = filaResumen[6] !== undefined && filaResumen[6] !== "" ? filaResumen[6] : "";
          var idTarea = filaResumen[7] !== undefined && filaResumen[7] !== "" ? filaResumen[7] : "";
          var prioridad = filaResumen[8] !== undefined && filaResumen[8] !== "" ? String(filaResumen[8]).trim() : "🟡 Media";

          var estado = obtenerEstadoConEmoji(estadoRaw);

          var personaMin = persona.toLowerCase();
          if (directorio[personaMin]) {
            persona = directorio[personaMin];
          }

          var nextRow = sheetDestino.getLastRow() + 1;
          if (nextRow < 3) nextRow = 3;

          sheetDestino.getRange(nextRow, 1).setValue(nombreMarca);
          sheetDestino.getRange(nextRow, 2).setValue(categoria);
          setFechaSafe(sheetDestino, nextRow, 3, fecha || new Date());
          sheetDestino.getRange(nextRow, 4).setValue(info);
          sheetDestino.getRange(nextRow, 5).setValue(persona);
          sheetDestino.getRange(nextRow, 6).setValue(detalles);
          sheetDestino.getRange(nextRow, 7).setValue(estado);
          setFechaSafe(sheetDestino, nextRow, 8, deadline);
          sheetDestino.getRange(nextRow, 9).setValue(idTarea);
          sheetDestino.getRange(nextRow, 10).setValue(prioridad);

          sheetDestino.getRange(nextRow, 7).setDataValidation(rule);

          var filaReal = rango.getRow() + i;
          sheetOrigen.getRange(filaReal, rango.getColumn(), 1, rango.getNumColumns()).clearContent();
          datosMovidos++;

          if (hojasModificadas.indexOf(sheetDestino.getName()) === -1) {
            hojasModificadas.push(sheetDestino.getName());
          }
        }
      }
    }
  }

  for (var h = 0; h < hojasModificadas.length; h++) {
    var sheetOrden = ss.getSheetByName(hojasModificadas[h]);
    ordenarHojaPorEstado(sheetOrden);
    aplicarEstilosFila(sheetOrden);
  }

  actualizarHojaHoy();

  if (datosMovidos > 0) {
    SpreadsheetApp.getUi().alert("🎉 Éxito: registros distribuidos y alineados correctamente.");
  }
}

// ==========================================
// 10. ORDENAMIENTO DE LAS MARCAS (COMPLETADAS AL FONDO)
// ==========================================
function ordenarHojaPorEstado(sheet) {
  var sheetName = sheet.getName().trim();
  if (sheetName === "Config_Marcas") return;
  var inicioFila = (sheetName === "Hoy") ? 5 : 3;
  var inicioCol = (sheetName === "Hoy") ? 2 : 1;

  var lastRow = sheet.getLastRow();
  if (lastRow < inicioFila) return;

  var range = sheet.getRange(inicioFila, inicioCol, lastRow - (inicioFila - 1), 10);
  var data = range.getValues();

  data.sort(function(a, b) {
    var estA = a[6] ? cleanEstado(a[6]) : "";
    var estB = b[6] ? cleanEstado(b[6]) : "";

    var esCompA = (estA === "completada");
    var esCompB = (estB === "completada");

    if (esCompA !== esCompB) {
      return esCompA ? 1 : -1;
    }

    var timeA = obtenerTiempoFecha(a[7]);
    var timeB = obtenerTiempoFecha(b[7]);
    if (timeA !== timeB) return timeA - timeB;

    return (PRIORIDAD_ESTADOS[estA] || 50) - (PRIORIDAD_ESTADOS[estB] || 50);
  });

  range.setValues(data);
}

// ==========================================
// 11. MOTOR DE ESTILOS DE DISEÑO ROBIN (MINIMALISTA)
// ==========================================
function aplicarEstilosFila(sheet) {
  var sheetName = sheet.getName().trim();
  if (sheetName === "Resumen Marcas" || sheetName === "Config_Marcas") return;

  var inicioFila = (sheetName === "Hoy") ? 5 : 3;
  var inicioCol = (sheetName === "Hoy") ? 2 : 1;
  var colMarca = (sheetName === "Hoy") ? 2 : 1;
  var colEstado = (sheetName === "Hoy") ? 8 : 7;

  var lastRow = sheet.getLastRow();
  if (lastRow < inicioFila) return;

  var totalFilasLimpieza = lastRow - (inicioFila - 1);

  var rangeTodo = sheet.getRange(inicioFila, inicioCol, totalFilasLimpieza, 10);
  rangeTodo
    .setBackground(null)
    .setFontColor("#18181B")
    .setFontFamily("Arial")
    .setFontSize(10)
    .setFontWeight(null)
    .setVerticalAlignment("middle")
    .setHorizontalAlignment("left")
    .setBorder(true, null, true, null, null, null, "#F4F4F5", SpreadsheetApp.BorderStyle.SOLID);

  sheet.setRowHeights(inicioFila, totalFilasLimpieza, 28);

  var rowHeader = (sheetName === "Hoy") ? 4 : 2;
  var headerRange = sheet.getRange(rowHeader, inicioCol, 1, 10);
  headerRange
    .setBackground("#FAFAFA")
    .setFontColor("#71717A")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true, "#E4E4E7", SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(rowHeader, 32);

  var rangeMarcas = sheet.getRange(inicioFila, colMarca, totalFilasLimpieza, 1);
  var rangeEstados = sheet.getRange(inicioFila, colEstado, totalFilasLimpieza, 1);

  var valoresMarcas = rangeMarcas.getValues();
  var valoresEstados = rangeEstados.getValues();

  var fondosMarcas = [], textosMarcas = [];
  var fondosEstados = [], textosEstados = [];

  for (var i = 0; i < totalFilasLimpieza; i++) {
    var txtMarca = String(valoresMarcas[i][0]).trim();
    var marcaClean = txtMarca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");

    if (txtMarca !== "" && txtMarca !== "#REF!" && COLORES_MARCAS[marcaClean]) {
      fondosMarcas.push([COLORES_MARCAS[marcaClean].fondo]);
      textosMarcas.push([COLORES_MARCAS[marcaClean].texto]);
    } else {
      fondosMarcas.push([null]); textosMarcas.push(["#18181B"]);
    }

    var txtEstado = String(valoresEstados[i][0]).trim();
    var estadoClean = cleanEstado(txtEstado);

    if (estadoClean !== "" && COLORES_ESTADOS[estadoClean]) {
      fondosEstados.push([COLORES_ESTADOS[estadoClean].fondo]);
      textosEstados.push([COLORES_ESTADOS[estadoClean].texto]);
    } else {
      fondosEstados.push([null]); textosEstados.push(["#18181B"]);
    }
  }

  rangeMarcas.setBackgrounds(fondosMarcas).setFontColors(textosMarcas).setFontWeight("bold").setHorizontalAlignment("center");
  rangeEstados.setBackgrounds(fondosEstados).setFontColors(textosEstados).setFontWeight("bold").setHorizontalAlignment("center");
}

// ==========================================
// 12. REPARA FILAS ROTAS, ELIMINA FILAS FANTASMAS
// ==========================================
function corregirEstructuraHojas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pestañasMarcas = ["DIAGEO", "GAMA", "La Santé", "ROBIN", "TMK"];
  var estadosValidos = ["pendiente", "en progreso", "seguimiento", "en revision", "en pausa", "suspendido", "completada"];

  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(LISTA_ESTADOS_VALIDOS, true)
    .build();

  var prefijosMarcas = {
    "DIAGEO": "DIA",
    "GAMA": "GAM",
    "La Santé": "SAN",
    "ROBIN": "ROB",
    "TMK": "TMK"
  };

  for (var i = 0; i < pestañasMarcas.length; i++) {
    var sheet = ss.getSheetByName(pestañasMarcas[i]);
    if (!sheet) continue;
    var lastRow = sheet.getLastRow();
    if (lastRow < 3) continue;

    var prefijo = prefijosMarcas[pestañasMarcas[i]] || "ID";
    var regexId = new RegExp("^" + prefijo + "-\\d+", "i");

    // Leer hasta 12 columnas por seguridad de desalineación
    var values = sheet.getRange(3, 1, lastRow - 2, 12).getValues();

    for (var r = 0; r < values.length; r++) {
      var rowData = values[r];
      var filaNum = r + 3;

      var valA = String(rowData[0]).trim();
      var valInfo = String(rowData[3]).trim();
      var valId = String(rowData[8]).trim();

      if (valInfo === "" && valId === "") {
        sheet.getRange(filaNum, 1, 1, 12)
          .clearDataValidations()
          .clearContent()
          .setBackground(null)
          .setFontColor("#18181B")
          .setFontWeight(null);
        continue;
      }

      var valF = cleanEstado(rowData[5]);
      var valG = cleanEstado(rowData[6]);
      var valH = cleanEstado(rowData[7]);
      var valI = cleanEstado(rowData[8]);
      var valJ = cleanEstado(rowData[9]);

      var filaCorregida = null;

      if (estadosValidos.indexOf(valF) !== -1 || regexId.test(valH)) {
        filaCorregida = [
          pestañasMarcas[i], "", rowData[1], rowData[2], rowData[3], rowData[4], obtenerEstadoConEmoji(rowData[5]), rowData[6], rowData[7], String(rowData[9] || "🟡 Media").trim()
        ];
      } else if (estadosValidos.indexOf(valH) !== -1 || regexId.test(valJ)) {
        filaCorregida = [
          pestañasMarcas[i], rowData[2], rowData[3], rowData[4], rowData[5], rowData[6], obtenerEstadoConEmoji(rowData[7]), rowData[8], rowData[9], String(rowData[10] || "🟡 Media").trim()
        ];
      } else if (regexId.test(valI) || estadosValidos.indexOf(valG) !== -1 || valA !== "") {
        filaCorregida = [
          pestañasMarcas[i], rowData[1], rowData[2], rowData[3], rowData[4], rowData[5], obtenerEstadoConEmoji(rowData[6]), rowData[7], rowData[8], String(rowData[9] || "🟡 Media").trim()
        ];
      }

      if (filaCorregida) {
        var cleanFilaMarca = String(filaCorregida[0]).toLowerCase();
        if (cleanFilaMarca === "" || cleanFilaMarca.indexOf("pendiente") !== -1 || cleanFilaMarca.indexOf("progreso") !== -1) {
          sheet.getRange(filaNum, 1, 1, 12).clearDataValidations().clearContent();
        } else {
          sheet.getRange(filaNum, 1, 1, 12).clearDataValidations().clearContent();
          sheet.getRange(filaNum, 1, 1, 10).setValues([filaCorregida]);
          sheet.getRange(filaNum, 7).setDataValidation(rule);
        }
      }
    }

    ordenarHojaPorEstado(sheet);
    aplicarEstilosFila(sheet);
  }
}

// ==========================================
// 13. SINCRONIZACIÓN DESDE HOJA "HOY"
// ==========================================
function sincronizarDesdeHoy(e) {
  var range = e.range;
  var sheetHoy = range.getSheet();
  var row = range.getRow();
  var col = range.getColumn();
  var newValue = e.value;

  if (newValue === undefined) {
    newValue = range.getValue();
  }

  var marca = String(sheetHoy.getRange(row, 2).getValue()).trim();
  var idTarea = String(sheetHoy.getRange(row, 10).getValue()).trim();

  if (!marca) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = ss.getSheetByName(marca);

  if (targetSheet) {
    var lastRowMarca = targetSheet.getLastRow();
    if (lastRowMarca >= 3) {
      var targetRow = -1;

      if (idTarea !== "") {
        var ids = targetSheet.getRange(3, 9, lastRowMarca - 2, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          if (String(ids[i][0]).trim() === idTarea) {
            targetRow = i + 3;
            break;
          }
        }
      }

      if (targetRow === -1) {
        var brandData = targetSheet.getRange(3, 1, lastRowMarca - 2, 9).getValues();
        var valCat = String(sheetHoy.getRange(row, 3).getValue()).trim().toLowerCase();
        var valInfo = String(sheetHoy.getRange(row, 5).getValue()).trim().toLowerCase();

        for (var j = 0; j < brandData.length; j++) {
          if (String(brandData[j][1]).trim().toLowerCase() === valCat &&
              String(brandData[j][3]).trim().toLowerCase() === valInfo) {
            targetRow = j + 3;
            break;
          }
        }
      }

      if (targetRow !== -1) {
        if (col === 8) { // Columna Estado en Hoy
          targetSheet.getRange(targetRow, 7).setValue(newValue);
        } else if (col === 9) { // Columna Deadline en Hoy
          setFechaSafe(targetSheet, targetRow, 8, newValue);
        } else if (col === 11) { // Columna Prioridad en Hoy
          targetSheet.getRange(targetRow, 10).setValue(newValue);
        }
        ordenarHojaPorEstado(targetSheet);
        aplicarEstilosFila(targetSheet);
      }
    }
  }

  var debaEliminarse = false;
  var estadoActual = sheetHoy.getRange(row, 8).getValue();
  var deadlineActual = sheetHoy.getRange(row, 9).getValue();

  var hoy = new Date();
  var hoyString = Utilities.formatDate(hoy, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy");
  var tHoy = obtenerTiempoFecha(hoyString);
  var tDeadline = obtenerTiempoFecha(deadlineActual);

  if (cleanEstado(estadoActual) === "completada" || cleanEstado(estadoActual) === "suspendido" || tDeadline !== tHoy) {
    debaEliminarse = true;
  }

  if (debaEliminarse) {
    sheetHoy.deleteRow(row);
  } else {
    ordenarHojaPorEstado(sheetHoy);
    aplicarEstilosFila(sheetHoy);
  }
}

// ==========================================
// 14. SINCRONIZACIÓN DESDE HOJAS DE MARCAS
// ==========================================
function sincronizarDesdeMarca(e) {
  var range = e.range;
  var sheetMarca = range.getSheet();
  var row = range.getRow();
  var col = range.getColumn();
  var newValue = e.value;

  if (newValue === undefined) {
    newValue = range.getValue();
  }

  var idTarea = String(sheetMarca.getRange(row, 9).getValue()).trim();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetHoy = ss.getSheetByName("Hoy");
  if (!sheetHoy) return;

  var lastRowHoy = sheetHoy.getLastRow();
  var targetRowHoy = -1;

  var valMarca = sheetMarca.getName().trim();
  var valCat = String(sheetMarca.getRange(row, 2).getValue()).trim().toLowerCase();
  var valInfo = String(sheetMarca.getRange(row, 4).getValue()).trim().toLowerCase();

  if (lastRowHoy >= 5) {
    var valuesHoy = sheetHoy.getRange(5, 2, lastRowHoy - 4, 10).getValues();
    for (var i = 0; i < valuesHoy.length; i++) {
      var hId = String(valuesHoy[i][8]).trim();
      var hMarca = String(valuesHoy[i][0]).trim();
      var hCat = String(valuesHoy[i][1]).trim().toLowerCase();
      var hInfo = String(valuesHoy[i][3]).trim().toLowerCase();

      if (idTarea !== "" && hId === idTarea) {
        targetRowHoy = i + 5;
        break;
      }
      if (hMarca === valMarca && hCat === valCat && hInfo === valInfo) {
        targetRowHoy = i + 5;
        break;
      }
    }
  }

  var estadoActual = sheetMarca.getRange(row, 7).getValue();
  var deadlineActual = sheetMarca.getRange(row, 8).getValue();

  var hoy = new Date();
  var hoyString = Utilities.formatDate(hoy, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy");
  var tHoy = obtenerTiempoFecha(hoyString);
  var tDeadline = obtenerTiempoFecha(deadlineActual);

  var esHoy = (tDeadline === tHoy && tDeadline !== Infinity);
  var activaParaHoy = (cleanEstado(estadoActual) !== "completada" && cleanEstado(estadoActual) !== "suspendido");

  if (targetRowHoy !== -1) {
    if (activaParaHoy && esHoy) {
      if (col === 7) { // Estado
        sheetHoy.getRange(targetRowHoy, 8).setValue(newValue);
      } else if (col === 8) { // Deadline
        setFechaSafe(sheetHoy, targetRowHoy, 9, newValue);
      } else if (col === 10) { // Prioridad
        sheetHoy.getRange(targetRowHoy, 11).setValue(newValue);
      }
      ordenarHojaPorEstado(sheetHoy);
      aplicarEstilosFila(sheetHoy);
    } else {
      sheetHoy.deleteRow(targetRowHoy);
    }
  } else {
    if (activaParaHoy && esHoy) {
      var rowData = sheetMarca.getRange(row, 1, 1, 10).getValues()[0];
      var nextRowHoy = sheetHoy.getLastRow() + 1;
      if (nextRowHoy < 5) nextRowHoy = 5;

      sheetHoy.getRange(nextRowHoy, 2).setValue(rowData[0]);
      sheetHoy.getRange(nextRowHoy, 3).setValue(rowData[1]);
      setFechaSafe(sheetHoy, nextRowHoy, 4, rowData[2]);
      sheetHoy.getRange(nextRowHoy, 5).setValue(rowData[3]);
      sheetHoy.getRange(nextRowHoy, 6).setValue(rowData[4]);
      sheetHoy.getRange(nextRowHoy, 7).setValue(rowData[5]);
      sheetHoy.getRange(nextRowHoy, 8).setValue(rowData[6]);
      setFechaSafe(sheetHoy, nextRowHoy, 9, rowData[7]);
      sheetHoy.getRange(nextRowHoy, 10).setValue(rowData[8]);
      sheetHoy.getRange(nextRowHoy, 11).setValue(rowData[9]); // Escribe Prioridad

      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(LISTA_ESTADOS_VALIDOS, true)
        .build();
      sheetHoy.getRange(nextRowHoy, 8).setDataValidation(rule);

      ordenarHojaPorEstado(sheetHoy);
      aplicarEstilosFila(sheetHoy);
    }
  }

  ordenarHojaPorEstado(sheetMarca);
  aplicarEstilosFila(sheetMarca);
}

// ==========================================
// 15. ENDPOINTS DE API PARA APLICACIÓN WEB EXTERNA (CONSOLIDADO + SEGURIDAD)
// ==========================================
// Requiere ApiAuth.gs en el mismo proyecto (ver google-apps-script/ApiAuth.gs)

function obtenerOcrearHojaConfigMarcas_(ss) {
  var configSheet = ss.getSheetByName("Config_Marcas");
  if (!configSheet) {
    configSheet = ss.insertSheet("Config_Marcas");
    configSheet.appendRow([
      "Marca", "LogoURL", "Ejecutivo", "Disenador", "Content",
      "Detalles", "Estado", "Deadline", "ID Tarea", "Prioridad"
    ]);
  }
  return configSheet;
}

function esIdWidget_(idTarea) {
  return String(idTarea || "").trim().indexOf("WID-") === 0;
}

function normalizarMarcaWidgetDesdePayload_(payload) {
  var raw = String(
    (payload && (payload.widgetMarca || payload.prioridad)) || ""
  ).trim();
  if (!raw) return "";
  if (raw.indexOf("🟡") !== -1 || raw.indexOf("🔴") !== -1 || raw.indexOf("🟢") !== -1) {
    return "";
  }
  return raw;
}

function esMarcaCanonicaConocida_(marca) {
  var key = String(marca || "").trim();
  if (!key) return false;
  key = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  var conocidas = {
    "LA SANTE": true,
    "DIAGEO": true,
    "GAMA": true,
    "ROBIN": true,
    "TMK": true,
    "TRADE & SHOPPER MARKETING": true
  };
  return !!conocidas[key];
}

function inferirMarcaWidgetDesdeTitulo_(titulo) {
  var t = String(titulo || "").trim();
  if (!t) return "";
  t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  var marcas = [
    { key: "TRADE & SHOPPER MARKETING", label: "Trade & Shopper Marketing" },
    { key: "LA SANTE", label: "La Santé" },
    { key: "DIAGEO", label: "Diageo" },
    { key: "GAMA", label: "Gama" },
    { key: "ROBIN", label: "Robin" },
    { key: "TMK", label: "Trade & Shopper Marketing" }
  ];

  var mejor = "";
  var mejorLen = 0;
  for (var i = 0; i < marcas.length; i++) {
    var variante = marcas[i].key;
    if (t.indexOf(variante) !== -1 && variante.length > mejorLen) {
      mejor = marcas[i].label;
      mejorLen = variante.length;
    }
  }
  return mejor;
}

function leerMarcaWidgetDesdeFila_(row) {
  var colA = String(row[0] || "").trim();
  if (colA && colA !== "Config_Marcas" && esMarcaCanonicaConocida_(colA)) {
    return colA;
  }

  var colJ = String(row[9] || "").trim();
  if (colJ && esMarcaCanonicaConocida_(colJ)) {
    return colJ;
  }
  if (colJ && colJ.indexOf("🟡") === -1 && colJ.indexOf("🔴") === -1 && colJ.indexOf("🟢") === -1) {
    return "";
  }

  return inferirMarcaWidgetDesdeTitulo_(String(row[3] || "").trim());
}

function guardarWidgetEnConfig_(sheet, row, payload, idTarea) {
  var widgetMarca = normalizarMarcaWidgetDesdePayload_(payload);
  var fila = [
    widgetMarca,
    String(payload.categoria || "").trim(),
    "",
    String(payload.info || "").trim(),
    String(payload.personas || "").trim(),
    String(payload.detalles || "").trim(),
    "",
    "",
    String(idTarea || "").trim(),
    ""
  ];
  sheet.getRange(row, 1, 1, 10).setValues([fila]);
}

function buscarFilaWidgetPorId_(sheet, idTarea) {
  var id = String(idTarea || "").trim();
  if (!id) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 9, lastRow, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) {
      return i + 2;
    }
  }
  return -1;
}

function doGet(e) {
  try {
    var session = robinValidarSesionRobin_(e, null);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    
    var configSheet = ss.getSheetByName("Config_Marcas");
    var marcasMetadata = {};
    var widgets = [];
    
    if (configSheet) {
      var metaRows = configSheet.getDataRange().getValues();
      for (var rIdx = 1; rIdx < metaRows.length; rIdx++) {
        var row = metaRows[rIdx];
        var idTarea = row[8] ? String(row[8]).trim() : "";
        
        if (esIdWidget_(idTarea)) {
          widgets.push({
            id: idTarea,
            titulo: String(row[3] || "").trim(),
            link: String(row[5] || "").trim(),
            icon: String(row[1] || "").trim(),
            color: String(row[4] || "").trim(),
            marca: leerMarcaWidgetDesdeFila_(row)
          });
        } else {
          var mName = String(row[0]).trim();
          if (mName && mName !== "Config_Marcas") {
            marcasMetadata[mName] = {
              logoUrl: row[1] || "",
              ejecutivo: row[2] || "",
              disenador: row[3] || "",
              content: row[4] || ""
            };
          }
        }
      }
    }

    var todasLasTareas = [];
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var name = sheet.getName().trim();
      
      if (name !== "Hoy" && name !== "Resumen Marcas" && name !== "Config_Marcas") {
        var lastRow = sheet.getLastRow();
        if (lastRow >= 3) {
          // Cambiar lectura a 10 columnas
          var valores = sheet.getRange(3, 1, lastRow - 2, 10).getValues();
          for (var j = 0; j < valores.length; j++) {
            var fila = valores[j];
            var txtMarca = String(fila[0]).trim();
            var txtInfo = String(fila[3]).trim();
            
            if (txtInfo === "" && String(fila[8]).trim() === "") continue;

            var cleanM = txtMarca.toLowerCase();
            if (cleanM === "" || cleanM.indexOf("pendiente") !== -1 || cleanM.indexOf("progreso") !== -1 || cleanM.indexOf("seguimiento") !== -1 || cleanM.indexOf("revision") !== -1 || cleanM.indexOf("pausa") !== -1 || cleanM.indexOf("suspendido") !== -1 || cleanM.indexOf("completada") !== -1) {
              continue;
            }

            todasLasTareas.push({
              marca: txtMarca,
              categoria: String(fila[1]).trim(),
              fecha: formatearFechaSafe(fila[2], ss),
              fechaInicio: formatearFechaSafe(fila[2], ss),
              info: txtInfo,
              personas: String(fila[4]).trim(),
              detalles: String(fila[5]).trim(),
              estado: obtenerEstadoConEmoji(fila[6]),
              deadline: formatearFechaSafe(fila[7], ss),
              idTarea: String(fila[8]).trim(),
              prioridad: String(fila[9] || "🟡 Media").trim(), // Nueva propiedad
              filaOriginal: j + 3
            });
          }
        }
      }
    }

    // Listas de autorización por rol (para sembrar en el cliente).
    var allowed = robinListaDesdePropiedad_(
      "ROBIN_ALLOWED_USERS",
      "fcolmenares,ralvarez,dsalavarria,mbonilla,gnebrus,sgiucastro,dsanchez,admin"
    );
    var designers = robinListaDesdePropiedad_(
      "ROBIN_DESIGNER_USERS",
      "jalfiero,arusso,arodriguez,agraterol,dmatheus"
    );
    var contentUsers = robinListaDesdePropiedad_(
      "ROBIN_CONTENT_USERS",
      "dsalavarria,sgiucastro,dsanchez"
    );
    var executives = allowed.filter(function (u) {
      return designers.indexOf(u) === -1 && contentUsers.indexOf(u) === -1;
    });
    if (executives.indexOf("admin") === -1) executives.push("admin");
    contentUsers = contentUsers.filter(function (u) {
      return designers.indexOf(u) === -1 && u !== "admin";
    });

    var filasPresencia = todasLasTareas.filter(function (t) {
      var id = String(t.idTarea || "").trim().toUpperCase();
      return id.indexOf("PRESENCE-") === 0;
    });

    var response = {
      success: true,
      data: todasLasTareas,
      presencia: filasPresencia,
      marcasMetadata: marcasMetadata,
      widgets: widgets,
      marcasConfig: COLORES_MARCAS,
      estadosConfig: COLORES_ESTADOS,
      auth: {
        username: session.username,
        isDesigner: session.isDesigner,
        isAdmin: session.isAdmin,
        executives: executives,
        content: contentUsers,
        designers: designers
      }
    };

    if (session.isDesigner) {
      // Mantener filas PRESENCE-* para que la lista "En línea" vea a todos.
      response.data = todasLasTareas.filter(function (t) {
        var id = String(t.idTarea || "").trim().toUpperCase();
        if (id.indexOf("PRESENCE-") === 0) return true;
        return robinTareaAsignadaADisenador_(t.personas, session.username);
      });
      var marcasPermitidas = {};
      response.data.forEach(function (t) {
        var id = String(t.idTarea || "").trim().toUpperCase();
        if (id.indexOf("PRESENCE-") === 0) return;
        var mName = String(t.marca || "").trim();
        if (mName && marcasMetadata[mName]) {
          marcasPermitidas[mName] = marcasMetadata[mName];
        }
      });
      response.marcasMetadata = marcasPermitidas;
    }

    return robinJsonResponse_(response);

  } catch (err) {
    return robinErrorResponse_(err.message || err.toString());
  }
}

function normalizarTextoBusqueda_(val) {
  return String(val || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function extraerTituloDeInfo_(info) {
  var txt = String(info || "").trim();
  var match = txt.match(/^([^|]+)\s*\|\s*(.+)$/);
  if (match) return match[2].trim();
  return txt;
}

function categoriaParaSheetApps_(categoria) {
  var raw = String(categoria || "").trim();
  var permitidas = { "Reunión": true, "Solicitud": true, "Visita PDV": true, "Ideas": true, "Otro": true, "Robin": true };
  if (permitidas[raw]) return raw;
  var clave = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
  if (clave === "reunion") return "Reunión";
  if (clave === "solicitud") return "Solicitud";
  if (clave === "visitapdv" || clave === "pdv" || clave === "visita") return "Visita PDV";
  if (clave === "ideas") return "Ideas";
  if (clave === "robin") return "Robin";
  if (clave === "otro") return "Otro";
  return "Solicitud";
}

function extraerMarcadorDetalles_(detalles, nombre) {
  var re = new RegExp("robin-" + nombre + ":([^>]+)");
  var m = String(detalles || "").match(re);
  return m ? String(m[1] || "").trim() : "";
}

function buscarFilaTareaEnHoja_(sheet, payload) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return -1;

  var numFilas = lastRow - 2;
  var brandData = sheet.getRange(3, 1, numFilas, 9).getValues();
  var idTarea = String(payload.idTarea || "").trim();
  if (idTarea.indexOf("STB-") === 0) idTarea = "";

  var i, j;
  if (idTarea) {
    for (i = 0; i < brandData.length; i++) {
      if (String(brandData[i][8] || "").trim() === idTarea) return i + 3;
    }
  }

  var importKey = extraerMarcadorDetalles_(payload.detalles, "import-key");
  if (importKey) {
    for (i = 0; i < brandData.length; i++) {
      if (extraerMarcadorDetalles_(brandData[i][5], "import-key") === importKey) return i + 3;
    }
  }

  if (payload.esNuevo) return -1;

  var valInfo = normalizarTextoBusqueda_(payload.info);
  var valInfoOriginal = normalizarTextoBusqueda_(payload.originalInfo);
  var valCat = normalizarTextoBusqueda_(payload.originalCategoria || payload.categoria);
  var valTitulo = normalizarTextoBusqueda_(extraerTituloDeInfo_(payload.info));
  var valTituloOriginal = normalizarTextoBusqueda_(extraerTituloDeInfo_(payload.originalInfo));
  var subPayload = extraerMarcadorDetalles_(payload.detalles, "subcliente");

  if (valInfoOriginal) {
    for (i = 0; i < brandData.length; i++) {
      if (normalizarTextoBusqueda_(brandData[i][3]) !== valInfoOriginal) continue;
      if (subPayload) {
        var subFila = extraerMarcadorDetalles_(brandData[i][5], "subcliente");
        if (subFila && subFila !== subPayload) continue;
      }
      return i + 3;
    }
  }

  if (valInfo) {
    for (i = 0; i < brandData.length; i++) {
      if (normalizarTextoBusqueda_(brandData[i][3]) !== valInfo) continue;
      if (subPayload) {
        var subFila2 = extraerMarcadorDetalles_(brandData[i][5], "subcliente");
        if (subFila2 && subFila2 !== subPayload) continue;
      }
      return i + 3;
    }
  }

  var candidatos = [];
  for (j = 0; j < brandData.length; j++) {
    var filaCat = normalizarTextoBusqueda_(brandData[j][1]);
    var filaTitulo = normalizarTextoBusqueda_(extraerTituloDeInfo_(brandData[j][3]));
    var filaInfoNorm = normalizarTextoBusqueda_(brandData[j][3]);
    var catOk = !valCat || !filaCat || filaCat === valCat;

    if (catOk && filaTitulo && (filaTitulo === valTitulo || filaTitulo === valTituloOriginal)) {
      candidatos.push(j + 3);
    } else if (filaTitulo === valTitulo || filaTitulo === valTituloOriginal) {
      candidatos.push(j + 3);
    } else if (filaInfoNorm === valTitulo || filaInfoNorm === valTituloOriginal) {
      candidatos.push(j + 3);
    }
  }

  var unicos = [];
  var visto = {};
  for (i = 0; i < candidatos.length; i++) {
    if (!visto[candidatos[i]]) {
      visto[candidatos[i]] = true;
      unicos.push(candidatos[i]);
    }
  }
  if (unicos.length === 1) return unicos[0];

  return -1;
}

function resolverMarcaSheetTab_(marca) {
  var raw = String(marca || "").trim();
  if (!raw) return "";
  var key = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  var map = {
    "LA SANTE": "La Santé",
    "DIAGEO": "DIAGEO",
    "GAMA": "GAMA",
    "ROBIN": "ROBIN",
    "TMK": "TMK",
    "TRADE & SHOPPER MARKETING": "TMK"
  };
  return map[key] || raw;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No se recibieron datos de postDataContents.");
    }

    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var session = robinValidarSesionRobin_(e, payload);
    payload = robinLimpiarPayload_(payload);
    robinExigirOperacionAdmin_(session, payload);
    robinExigirOperacionDisenador_(session, payload);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var campo = payload.campo ? String(payload.campo).trim() : null;

    if (campo === "actualizarUsuarios") {
      return robinActualizarUsuarios_(payload);
    }

    if (campo === "crearMarca") {
      var nuevaMarcaName = String(payload.nuevaMarca || "").trim();
      if (!nuevaMarcaName) throw new Error("Nombre de marca vacío.");

      var targetSheet = ss.getSheetByName(nuevaMarcaName);
      if (!targetSheet) {
        targetSheet = ss.insertSheet(nuevaMarcaName);
        configurarHeadersNotion(targetSheet);
        aplicarEstilosFila(targetSheet);
      }

      var configSheet = ss.getSheetByName("Config_Marcas");
      if (!configSheet) {
        configSheet = ss.insertSheet("Config_Marcas");
        configSheet.appendRow(["Marca", "LogoURL", "Ejecutivo", "Disenador", "Content", "Detalles", "Estado", "Deadline", "ID Tarea", "Prioridad"]);
      }
      
      var rows = configSheet.getDataRange().getValues();
      var foundRow = -1;
      for (var idx = 1; idx < rows.length; idx++) {
        var idTareaTmp = rows[idx][8] ? String(rows[idx][8]).trim() : "";
        if (rows[idx][0].trim().toLowerCase() === nuevaMarcaName.toLowerCase() && idTareaTmp.indexOf("WID-") !== 0) {
          foundRow = idx + 1;
          break;
        }
      }

      var metaData = [
        nuevaMarcaName,
        payload.logoUrl || "",
        payload.ejecutivo || "",
        payload.disenador || "",
        payload.content || "",
        "", "", "", "", ""
      ];

      if (foundRow !== -1) {
        configSheet.getRange(foundRow, 1, 1, 10).setValues([metaData]);
      } else {
        configSheet.appendRow(metaData);
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Marca creada/editada con éxito" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (campo === "eliminarMarca") {
      var marcaAEliminar = String(payload.nuevaMarca || "").trim();
      if (!marcaAEliminar) throw new Error("Nombre de marca vacío.");

      var hojasProtegidas = ["Config_Marcas", "Resumen Marcas", "Hoy", "Presencia"];
      if (hojasProtegidas.indexOf(marcaAEliminar) !== -1) {
        throw new Error("No se puede eliminar una hoja del sistema.");
      }

      var hojaMarca = ss.getSheetByName(marcaAEliminar);
      if (hojaMarca) {
        if (ss.getSheets().length <= 1) {
          throw new Error("No se puede eliminar la última hoja del libro.");
        }
        ss.deleteSheet(hojaMarca);
      }

      var configSheetDel = ss.getSheetByName("Config_Marcas");
      if (configSheetDel) {
        var filasConfig = configSheetDel.getDataRange().getValues();
        for (var k = filasConfig.length - 1; k >= 1; k--) {
          var nombreMarca = filasConfig[k][0] ? String(filasConfig[k][0]).trim() : "";
          var idTmp = filasConfig[k][8] ? String(filasConfig[k][8]).trim() : "";
          if (nombreMarca.toLowerCase() === marcaAEliminar.toLowerCase() && idTmp.indexOf("WID-") !== 0) {
            configSheetDel.deleteRow(k + 1);
          }
        }
      }

      actualizarHojaHoy();

      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Marca eliminada con éxito" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var marca = resolverMarcaSheetTab_(payload.marca);
    if (!marca) {
      throw new Error("La marca es requerida para identificar la hoja de destino.");
    }

    if (marca === "Config_Marcas" && (campo === "todo" || campo === "eliminar")) {
      if (!session || !session.isAdmin) {
        throw new Error("No autorizado: solo administradores pueden gestionar enlaces.");
      }
    }

    var targetSheet = ss.getSheetByName(marca);
    if (!targetSheet && marca === "Config_Marcas") {
      targetSheet = obtenerOcrearHojaConfigMarcas_(ss);
    }
    if (!targetSheet) {
      throw new Error("No se encontró la pestaña de la marca: " + marca);
    }

    if (marca === "Config_Marcas" && campo === "todo") {
      var widgetId = String(payload.idTarea || "").trim();
      var widgetRow = buscarFilaWidgetPorId_(targetSheet, widgetId);
      if (widgetRow === -1) {
        var nextWidgetRow = Math.max(targetSheet.getLastRow() + 1, 2);
        if (!esIdWidget_(widgetId)) {
          widgetId = "WID-" + Date.now();
        }
        guardarWidgetEnConfig_(targetSheet, nextWidgetRow, payload, widgetId);
      } else {
        if (!esIdWidget_(widgetId)) {
          widgetId = String(targetSheet.getRange(widgetRow, 9).getValue() || "").trim();
        }
        guardarWidgetEnConfig_(targetSheet, widgetRow, payload, widgetId);
      }

      return robinJsonResponse_({
        success: true,
        message: "Enlace guardado correctamente.",
        idTarea: widgetId
      });
    }

    var lastRow = targetSheet.getLastRow();
    var targetRow = -1;
    var idTarea = String(payload.idTarea || "").trim();
    if (idTarea.indexOf("STB-") === 0) idTarea = "";

    if (marca !== "Config_Marcas") {
      targetRow = buscarFilaTareaEnHoja_(targetSheet, payload);
      if (targetRow !== -1 && !idTarea) {
        var idEnHoja = String(targetSheet.getRange(targetRow, 9).getValue() || "").trim();
        if (idEnHoja && idEnHoja.indexOf("STB-") !== 0) idTarea = idEnHoja;
      }
    }

    if (campo === "eliminar") {
      if (targetRow !== -1) {
        targetSheet.deleteRow(targetRow);
        if (marca !== "Config_Marcas") {
          actualizarHojaHoy();
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Tarea eliminada correctamente de Google Sheets." }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        throw new Error("No se encontró el registro para eliminar.");
      }
    }

    if (campo) {
      if (targetRow === -1) {
        var idEntranteNuevo = String(payload.idTarea || "").trim();
        var esHeartbeatPresencia = idEntranteNuevo.toUpperCase().indexOf("PRESENCE-") === 0;
        payload.esActualizacion = false;
        // No marcar presencia como entregable nuevo (bloquearía a diseñadores).
        if (!esHeartbeatPresencia) {
          payload.esNuevo = true;
        }
        targetRow = lastRow + 1;
        var limitRowNuevo = (marca === "Config_Marcas") ? 2 : 3;
        if (targetRow < limitRowNuevo) targetRow = limitRowNuevo;

        // Preservar IDs de presencia; no reemplazarlos por ROB-xxx.
        if (esHeartbeatPresencia) {
          idTarea = idEntranteNuevo;
        } else if (idEntranteNuevo.indexOf("IMP-") === 0) {
          idTarea = idEntranteNuevo;
        } else {
          var prefijoNuevo = (marca === "Config_Marcas") ? "WID" : marca.substring(0, 3).toUpperCase();
          idTarea = prefijoNuevo + "-" + Math.floor(100 + Math.random() * 900);
        }
      }

      if (campo === "estado") {
        targetSheet.getRange(targetRow, 7).setValue(obtenerEstadoConEmoji(payload.valor));
      } else if (campo === "deadline") {
        setFechaSafe(targetSheet, targetRow, 8, payload.valor);
      } else if (campo === "prioridad") {
        targetSheet.getRange(targetRow, 10).setValue(payload.valor);
      } else if (campo === "detalles") {
        targetSheet.getRange(targetRow, 6).setValue(payload.detalles || "");
      } else if (campo === "todo") {
        targetSheet.getRange(targetRow, 1).setValue(marca);
        targetSheet.getRange(targetRow, 2).setValue(categoriaParaSheetApps_(payload.categoria));

        if (payload.fechaInicio !== undefined) {
          if (payload.fechaInicio) {
            setFechaSafe(targetSheet, targetRow, 3, payload.fechaInicio);
          } else {
            targetSheet.getRange(targetRow, 3).clearContent();
          }
        }
        
        targetSheet.getRange(targetRow, 4).setValue(payload.info || "");
        targetSheet.getRange(targetRow, 5).setValue(payload.personas || "");
        targetSheet.getRange(targetRow, 6).setValue(payload.detalles || "");
        targetSheet.getRange(targetRow, 7).setValue(obtenerEstadoConEmoji(payload.estado || "⚪ Pendiente"));
        
        setFechaSafe(targetSheet, targetRow, 8, payload.deadline);
        targetSheet.getRange(targetRow, 9).setValue(idTarea);
        targetSheet.getRange(targetRow, 10).setValue(payload.prioridad || "🟡 Media");
      }

    } else {
      targetRow = lastRow + 1;
      var limitRow = (marca === "Config_Marcas") ? 2 : 3;
      if (targetRow < limitRow) targetRow = limitRow;

      var prefijo = (marca === "Config_Marcas") ? "WID" : marca.substring(0, 3).toUpperCase();
      var idGenerado = idTarea || (prefijo + "-" + Math.floor(100 + Math.random() * 900));

      targetSheet.getRange(targetRow, 1).setValue(marca);
      targetSheet.getRange(targetRow, 2).setValue(categoriaParaSheetApps_(payload.categoria));
      if (payload.fechaInicio) {
        setFechaSafe(targetSheet, targetRow, 3, payload.fechaInicio);
      } else {
        targetSheet.getRange(targetRow, 3).clearContent();
      }
      targetSheet.getRange(targetRow, 4).setValue(payload.info || "");
      targetSheet.getRange(targetRow, 5).setValue(payload.personas || "");
      targetSheet.getRange(targetRow, 6).setValue(payload.detalles || "");
      targetSheet.getRange(targetRow, 7).setValue(obtenerEstadoConEmoji(payload.estado || "⚪ Pendiente"));
      setFechaSafe(targetSheet, targetRow, 8, payload.deadline);
      targetSheet.getRange(targetRow, 9).setValue(idGenerado);
      targetSheet.getRange(targetRow, 10).setValue(payload.prioridad || "🟡 Media");
    }

    var esPresencia = String(idTarea || payload.idTarea || "").trim().toUpperCase().indexOf("PRESENCE-") === 0;

    if (marca !== "Config_Marcas" && !esPresencia) {
      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(LISTA_ESTADOS_VALIDOS, true)
        .build();
      targetSheet.getRange(targetRow, 7).setDataValidation(rule);
      if (!payload.esNuevo) {
        ordenarHojaPorEstado(targetSheet);
        aplicarEstilosFila(targetSheet);
      }
    }

    if (!esPresencia) {
      actualizarHojaHoy();
    }

    var idFinal = String(idTarea || "").trim();
    if (!idFinal && targetRow !== -1) {
      idFinal = String(targetSheet.getRange(targetRow, 9).getValue() || "").trim();
    }

    return robinJsonResponse_({
      success: true,
      message: esPresencia ? "Presencia actualizada." : "Sincronización completada con éxito.",
      idTarea: idFinal,
      marca: marca,
      info: String(payload.info || "").trim()
    });

  } catch (err) {
    return robinErrorResponse_(err.message || err.toString());
  }
}
