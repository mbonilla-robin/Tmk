/**
 * Añade este bloque en doPost() de tu Apps Script (junto a crearMarca):
 *
 *   if (data.campo === "eliminarMarca") {
 *     return jsonOutput_(eliminarMarca_(data));
 *   }
 *
 * Despliega una nueva versión del Web App después de guardar.
 */

var HOJAS_PROTEGIDAS_ELIMINAR_ = [
  "Config_Marcas",
  "Presencia",
  "Pendiente",
  "En Progreso",
  "En Seguimiento",
  "En Revisión",
  "En Pausa",
  "Completada"
];

function eliminarMarca_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var marca = String(data.nuevaMarca || data.marca || "").trim();
  if (!marca) {
    return { success: false, error: "Marca requerida" };
  }

  if (esHojaProtegidaEliminar_(marca)) {
    return { success: false, error: "No se puede eliminar una hoja del sistema" };
  }

  var hojaEliminada = eliminarHojaMarca_(ss, marca);
  eliminarMetadataMarca_(ss, marca);

  return {
    success: true,
    deletedSheet: hojaEliminada
  };
}

function esHojaProtegidaEliminar_(nombre) {
  var limpio = normalizarMarcaKeyAppsScript_(nombre);
  for (var i = 0; i < HOJAS_PROTEGIDAS_ELIMINAR_.length; i++) {
    if (normalizarMarcaKeyAppsScript_(HOJAS_PROTEGIDAS_ELIMINAR_[i]) === limpio) {
      return true;
    }
  }
  return false;
}

function eliminarHojaMarca_(ss, marca) {
  var sheets = ss.getSheets();
  if (sheets.length <= 1) {
    throw new Error("No se puede eliminar la última hoja del libro");
  }

  var marcaNorm = normalizarMarcaKeyAppsScript_(marca);
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var nombre = sheet.getName();
    if (nombre === marca || normalizarMarcaKeyAppsScript_(nombre) === marcaNorm) {
      if (esHojaProtegidaEliminar_(nombre)) {
        return false;
      }
      ss.deleteSheet(sheet);
      return true;
    }
  }
  return false;
}

function eliminarMetadataMarca_(ss, marca) {
  var config = ss.getSheetByName("Config_Marcas");
  if (!config) return;

  var lastRow = config.getLastRow();
  if (lastRow < 2) return;

  var marcaNorm = normalizarMarcaKeyAppsScript_(marca);
  var numCols = Math.max(config.getLastColumn(), 6);
  var values = config.getRange(2, 1, lastRow - 1, numCols).getValues();

  for (var r = values.length - 1; r >= 0; r--) {
    var row = values[r];
    var info = String(row[1] || "").trim();
    var detalles = String(row[3] || "").trim();
    var esWidget = /^https?:\/\//i.test(detalles);
    if (esWidget) continue;

    var coincide =
      info === marca ||
      normalizarMarcaKeyAppsScript_(info) === marcaNorm ||
      (detalles.indexOf("clienteDirecto") !== -1 && normalizarMarcaKeyAppsScript_(info) === marcaNorm);

    if (coincide) {
      config.deleteRow(r + 2);
    }
  }
}

function normalizarMarcaKeyAppsScript_(marca) {
  return String(marca || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}
