const SALAS_MIN_DIA = 24 * 60;

function salasUsaDemo() {
  return typeof SALAS_FUENTE !== "undefined" && SALAS_FUENTE === "demo";
}

function salasPad2(n) {
  return String(n).padStart(2, "0");
}

function salasFechaCaracas(date) {
  const local = new Date(date.getTime() + SALAS_OFFSET_MIN * 60000);
  return `${local.getUTCFullYear()}-${salasPad2(local.getUTCMonth() + 1)}-${salasPad2(local.getUTCDate())}`;
}

function salasHoyStr() {
  return salasFechaCaracas(new Date());
}

function salasInicioDia(diaStr) {
  return new Date(`${diaStr}T00:00:00${SALAS_OFFSET_ISO}`);
}

function salasSumarDias(diaStr, dias) {
  const base = salasInicioDia(diaStr);
  base.setUTCDate(base.getUTCDate() + dias);
  return salasFechaCaracas(new Date(base.getTime() + 12 * 3600000));
}

function salasMinutosDelDia(date, diaStr) {
  return Math.round((date.getTime() - salasInicioDia(diaStr).getTime()) / 60000);
}

function salasMinutosAhora(diaStr) {
  if (diaStr !== salasHoyStr()) return null;
  return salasMinutosDelDia(new Date(), diaStr);
}

function salasFormatHora(min) {
  const total = ((Math.round(min) % SALAS_MIN_DIA) + SALAS_MIN_DIA) % SALAS_MIN_DIA;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const sufijo = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${salasPad2(m)} ${sufijo}`;
}

function salasFormatDuracion(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function salasParseHoraInput(valor) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(valor || ""));
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

function salasHoraInputDesdeMin(min) {
  return `${salasPad2(Math.floor(min / 60))}:${salasPad2(min % 60)}`;
}

function salasFormatDiaLargo(diaStr) {
  const fecha = new Date(`${diaStr}T12:00:00${SALAS_OFFSET_ISO}`);
  const texto = new Intl.DateTimeFormat("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Caracas"
  }).format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function salasEventosDelDia(sala, diaStr) {
  const lista = Array.isArray(sala && sala.eventos) ? sala.eventos : [];
  return lista
    .map((ev) => {
      const ini = new Date(ev.inicio);
      const fin = new Date(ev.fin);
      if (isNaN(ini.getTime()) || isNaN(fin.getTime())) return null;
      const inicioMin = Math.max(0, salasMinutosDelDia(ini, diaStr));
      const finMin = Math.min(SALAS_MIN_DIA, salasMinutosDelDia(fin, diaStr));
      if (finMin <= inicioMin) return null;
      return {
        id: ev.id || `${ev.inicio}-${ev.fin}`,
        titulo: String(ev.titulo || "").trim(),
        creador: ev.creador || "",
        todoElDia: Boolean(ev.todoElDia),
        inicioMin,
        finMin
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.inicioMin - b.inicioMin || a.finMin - b.finMin);
}

function salasConflictos(eventos, inicioMin, finMin) {
  return eventos.filter((ev) => ev.inicioMin < finMin && ev.finMin > inicioMin);
}

function salasBloquesOcupados(eventos) {
  const bloques = [];
  eventos.forEach((ev) => {
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ev.inicioMin <= ultimo.finMin) {
      ultimo.finMin = Math.max(ultimo.finMin, ev.finMin);
    } else {
      bloques.push({ inicioMin: ev.inicioMin, finMin: ev.finMin });
    }
  });
  return bloques;
}

function salasEstadoAhora(eventos, ahoraMin) {
  if (ahoraMin === null || ahoraMin === undefined) return null;
  const bloques = salasBloquesOcupados(eventos);
  const actual = bloques.find((b) => b.inicioMin <= ahoraMin && b.finMin > ahoraMin);
  if (actual) return { libre: false, hastaMin: actual.finMin };
  const siguiente = bloques.find((b) => b.inicioMin > ahoraMin);
  return { libre: true, hastaMin: siguiente ? siguiente.inicioMin : null };
}

function salasHuecosLibres(eventos, rangoInicioMin, rangoFinMin, duracionMinima) {
  const huecos = [];
  let cursor = rangoInicioMin;
  salasBloquesOcupados(eventos).forEach((b) => {
    if (b.finMin <= cursor) return;
    if (b.inicioMin >= rangoFinMin) return;
    if (b.inicioMin - cursor >= duracionMinima) {
      huecos.push({ inicioMin: cursor, finMin: b.inicioMin });
    }
    cursor = Math.max(cursor, b.finMin);
  });
  if (rangoFinMin - cursor >= duracionMinima) {
    huecos.push({ inicioMin: cursor, finMin: rangoFinMin });
  }
  return huecos;
}

function salasSiguienteHuecoDesde(eventos, desdeMin, duracion, limiteMin) {
  const huecos = salasHuecosLibres(eventos, desdeMin, limiteMin, duracion);
  return huecos.length ? huecos[0] : null;
}

function salasSemilla(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function salasDemoEventos(salaId, diaStr) {
  const dow = new Date(`${diaStr}T12:00:00${SALAS_OFFSET_ISO}`).getUTCDay();
  if (dow === 0 || dow === 6) return [];

  let estado = salasSemilla(`${salaId}|${diaStr}`) || 1;
  const rand = () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado / 4294967296;
  };

  const titulos = [
    "Daily TMK",
    "Revisión de campaña",
    "Status con cliente",
    "Brainstorm activación",
    "Entrega de piezas",
    "Planificación semanal",
    "Cierre de mes",
    "Sync agencia"
  ];

  const eventos = [];
  let cursor = 8 * 60 + Math.floor(rand() * 4) * 30;
  while (cursor < 18 * 60 && eventos.length < 6) {
    const duracion = [30, 60, 60, 90, 120][Math.floor(rand() * 5)];
    if (rand() < 0.62 && cursor + duracion <= 19 * 60) {
      const hora = (min) => `${salasPad2(Math.floor(min / 60))}:${salasPad2(min % 60)}:00`;
      eventos.push({
        id: `demo-${salaId}-${diaStr}-${cursor}`,
        titulo: titulos[Math.floor(rand() * titulos.length)],
        inicio: `${diaStr}T${hora(cursor)}${SALAS_OFFSET_ISO}`,
        fin: `${diaStr}T${hora(cursor + duracion)}${SALAS_OFFSET_ISO}`,
        todoElDia: false,
        creador: ""
      });
      cursor += duracion;
    }
    cursor += [0, 30, 30, 60][Math.floor(rand() * 4)] || 30;
  }
  return eventos;
}

function salasDatosDemo(diaStr) {
  return SALAS_DEMO.map((sala) => ({
    id: sala.id,
    nombre: sala.nombre,
    eventos: salasDemoEventos(sala.id, diaStr)
  }));
}

async function salasFetchDisponibilidad(diaStr) {
  if (salasUsaDemo()) {
    return { demo: true, generado: new Date().toISOString(), salas: salasDatosDemo(diaStr) };
  }
  if (typeof entregablesSupabaseListos !== "function" || !entregablesSupabaseListos()) {
    throw new Error("Supabase no está configurado.");
  }

  const url = `${getEntregablesSupabaseUrl()}/rest/v1/robin_salas?select=sala_id,nombre,eventos,error,actualizado&order=nombre.asc`;
  const res = await fetch(url, { method: "GET", headers: getEntregablesSupabaseHeaders(), cache: "no-store" });

  if (res.status === 404) {
    throw new Error("Falta crear la tabla robin_salas en Supabase (supabase/migrations/20260901120000_robin_salas.sql).");
  }
  if (!res.ok) throw new Error(`Supabase respondió ${res.status}`);

  const filas = await res.json();
  const salas = (Array.isArray(filas) ? filas : []).map((f) => ({
    id: f.sala_id,
    nombre: f.nombre,
    error: f.error || "",
    eventos: Array.isArray(f.eventos) ? f.eventos : []
  }));
  const ultima = (Array.isArray(filas) ? filas : [])
    .map((f) => new Date(f.actualizado).getTime())
    .filter((t) => !isNaN(t))
    .reduce((max, t) => Math.max(max, t), 0);

  return { demo: false, generado: ultima ? new Date(ultima).toISOString() : null, salas };
}
