function validarPartesFecha(dia, mes, anio) {
  if (!dia || !mes || !anio) return null;
  const d = new Date(anio, mes - 1, dia);
  if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return { dia, mes, anio };
}

const DEADLINE_TBD = "TBD";

function esTokenTbd(val) {
  const s = String(val || "").trim().toLowerCase();
  return s === "tbd"
    || s === "por definir"
    || s === "por decidir"
    || s === "sin fecha"
    || s === "pendiente"
    || s === "a definir";
}

/** Vacío o token TBD: fecha de entrega por decidir. */
function esDeadlineTbd(val) {
  const s = String(val || "").trim();
  return !s || esTokenTbd(s);
}

function parsearFechaLibre(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!s || esTokenTbd(s)) return null;

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
  if (esDeadlineTbd(val)) return DEADLINE_TBD;
  const parsed = parsearFechaLibre(val);
  if (!parsed) return val ? String(val).trim() : DEADLINE_TBD;
  const { dia, mes, anio } = parsed;
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;
}

function esFechaValida(val) {
  if (esDeadlineTbd(val)) return true;
  return !!parsearFechaLibre(val);
}

function formatearFecha(fechaStr) {
  return formatearFechaDisplay(fechaStr);
}

function obtenerTiempoFecha(val) {
  if (!val || esDeadlineTbd(val)) return Infinity;
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
  if (esDeadlineTbd(d1) && esDeadlineTbd(d2)) return true;
  if (!d1 || !d2) return false;
  const t1 = obtenerTiempoFecha(d1);
  const t2 = obtenerTiempoFecha(d2);
  return t1 !== Infinity && t2 !== Infinity && t1 === t2;
}

function normalizarDeadline(val) {
  if (esDeadlineTbd(val)) return DEADLINE_TBD;
  const parsed = parsearFechaLibre(val);
  if (!parsed) return "";
  const { dia, mes, anio } = parsed;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Inicio de trabajo: vacío/TBD no se guardan como TBD. */
function normalizarFechaInicio(val) {
  const s = String(val || "").trim();
  if (!s || esTokenTbd(s)) return "";
  const parsed = parsearFechaLibre(s);
  if (!parsed) return "";
  const { dia, mes, anio } = parsed;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function convertirFechaAInput(fechaStr) {
  return formatearFechaDisplay(fechaStr);
}

function deadlineParaEdicion(val) {
  if (esDeadlineTbd(val)) return DEADLINE_TBD;
  return formatearFechaDisplay(val);
}

function fechaInicioParaEdicion(val) {
  const s = String(val || "").trim();
  if (!s || esTokenTbd(s)) return "";
  return formatearFechaDisplay(s);
}

function fechaHoyDisplay(fechaRef) {
  const hoy = fechaRef || new Date();
  return formatearFechaDisplay(`${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`);
}

function esDiaHabil(fecha) {
  const dia = fecha.getDay();
  return dia !== 0 && dia !== 6;
}

function esMismoDiaLocal(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function obtenerLunesSemana(fechaRef) {
  const ref = fechaRef || new Date();
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function obtenerRangoSemanaLaboral(fechaRef) {
  const lunes = obtenerLunesSemana(fechaRef);
  const viernes = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 4, 23, 59, 59, 999);
  return { inicio: lunes.getTime(), fin: viernes.getTime() };
}

function diaTieneEntregableEnFecha(fecha, tareas) {
  const ts = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
  return (tareas || []).some((t) => {
    const td = obtenerTiempoFecha(t.deadline);
    return td !== Infinity && td === ts;
  });
}

function obtenerDiasSemanaVisibles(fechaRef, tareas, fechaHoy) {
  const lunes = obtenerLunesSemana(fechaRef);
  const hoy = fechaHoy || new Date();
  const dias = [];

  for (let i = 0; i < 5; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    dias.push(d);
  }

  for (let i = 5; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    if (diaTieneEntregableEnFecha(d, tareas) || esMismoDiaLocal(d, hoy)) {
      dias.push(d);
    }
  }

  return dias;
}

function restarDiasHabiles(timestamp, dias) {
  if (!dias || dias <= 0) {
    const ref = new Date(timestamp);
    return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  }

  const cursor = new Date(timestamp);
  let restantes = dias;

  while (restantes > 0) {
    cursor.setDate(cursor.getDate() - 1);
    if (esDiaHabil(cursor)) restantes -= 1;
  }

  return new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime();
}
