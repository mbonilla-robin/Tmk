function formatearFecha(fechaStr) {
  if (!fechaStr) return "";
  const partes = fechaStr.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}`;
  }
  return fechaStr.split("T")[0];
}

function obtenerTiempoFecha(val) {
  if (!val) return Infinity;
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate()).getTime();
  }
  var str = String(val).trim();
  if (str.includes("GMT") || str.includes("Venezuela") || str.includes(":") || (isNaN(str[0]) && isNaN(parseInt(str, 10)))) {
    var parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
      return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()).getTime();
    }
  }
  str = str.split(/[ T]/)[0].trim();
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
    return isNaN(d.getTime()) ? Infinity : d.getTime();
  }
  return Infinity;
}

function sonMismasFechas(d1, d2) {
  if (!d1 || !d2) return false;
  const t1 = obtenerTiempoFecha(d1);
  const t2 = obtenerTiempoFecha(d2);
  return t1 !== Infinity && t2 !== Infinity && t1 === t2;
}

function convertirFechaAInput(fechaStr) {
  if (!fechaStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return fechaStr;
  const partes = fechaStr.split(/[-/]/);
  if (partes.length === 3) {
    if (partes[0].length === 4) {
      return `${partes[0]}-${String(partes[1]).padStart(2, "0")}-${String(partes[2]).padStart(2, "0")}`;
    }
    const dia = String(partes[0]).padStart(2, "0");
    const mes = String(partes[1]).padStart(2, "0");
    let anio = partes[2];
    if (anio.length === 2) anio = "20" + anio;
    return `${anio}-${mes}-${dia}`;
  }
  const d = new Date(fechaStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return "";
}
