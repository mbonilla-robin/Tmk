function validarPartesFecha(dia, mes, anio) {
  if (!dia || !mes || !anio) return null;
  const d = new Date(anio, mes - 1, dia);
  if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return { dia, mes, anio };
}

function parsearFechaLibre(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [anio, mes, dia] = s.split("-").map(Number);
    return validarPartesFecha(dia, mes, anio);
  }

  const partes = s.split(/[\s/.-]+/).filter(Boolean);
  if (partes.length === 3) {
    let dia, mes, anio;
    if (partes[0].length === 4) {
      anio = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10);
      dia = parseInt(partes[2], 10);
    } else {
      dia = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10);
      anio = parseInt(partes[2], 10);
      if (anio < 100) anio += 2000;
    }
    return validarPartesFecha(dia, mes, anio);
  }

  if (s.includes("GMT") || s.includes("Venezuela") || s.includes(":") || (isNaN(s[0]) && isNaN(parseInt(s, 10)))) {
    const parsedDate = new Date(s);
    if (!isNaN(parsedDate.getTime())) {
      return validarPartesFecha(
        parsedDate.getDate(),
        parsedDate.getMonth() + 1,
        parsedDate.getFullYear()
      );
    }
  }

  return null;
}

function formatearFechaDisplay(val) {
  const parsed = parsearFechaLibre(val);
  if (!parsed) return val ? String(val).trim() : "";
  const { dia, mes, anio } = parsed;
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;
}

function esFechaValida(val) {
  return !!parsearFechaLibre(val);
}

function formatearFecha(fechaStr) {
  return formatearFechaDisplay(fechaStr);
}

function obtenerTiempoFecha(val) {
  if (!val) return Infinity;
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate()).getTime();
  }
  const parsed = parsearFechaLibre(val);
  if (parsed) {
    const d = new Date(parsed.anio, parsed.mes - 1, parsed.dia);
    return d.getTime();
  }
  return Infinity;
}

function sonMismasFechas(d1, d2) {
  if (!d1 || !d2) return false;
  const t1 = obtenerTiempoFecha(d1);
  const t2 = obtenerTiempoFecha(d2);
  return t1 !== Infinity && t2 !== Infinity && t1 === t2;
}

function normalizarDeadline(val) {
  const parsed = parsearFechaLibre(val);
  if (!parsed) return "";
  const { dia, mes, anio } = parsed;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function convertirFechaAInput(fechaStr) {
  return formatearFechaDisplay(fechaStr);
}

function deadlineParaEdicion(val) {
  return formatearFechaDisplay(val);
}
