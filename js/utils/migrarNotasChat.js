/**
 * Script de migración para convertir notas en formato de lista numerada
 * al formato de chat con timestamps.
 * 
 * Uso: Llamar a migrarTodasLasNotasChat() desde la consola del navegador
 */

async function migrarNotasDeTexto(texto, fechaBase) {
  if (!texto || typeof texto !== 'string') return texto;
  
  const textoTrim = texto.trim();
  
  // Detectar si tiene formato de lista numerada o bullets con @usuario
  const tieneListaNumerada = /^\s*\d+\.\s*@\w+\s*:/m.test(textoTrim);
  const tieneListaBullets = /^\s*[•\-\*]\s*@\w+\s*:/m.test(textoTrim);
  
  if (!tieneListaNumerada && !tieneListaBullets) return texto;
  
  // Ya tiene timestamps, no migrar
  if (/\[\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s+\d{1,2}:\d{2}\]/.test(textoTrim)) {
    return texto;
  }
  
  console.log('🔄 Migrando nota con formato de lista...');
  
  // Separar por líneas y agrupar entradas
  const lineas = textoTrim.split('\n');
  const entradas = [];
  let entradaActual = null;
  
  lineas.forEach((linea) => {
    const lineaTrim = linea.trim();
    if (!lineaTrim) {
      // Línea vacía: agregar a la entrada actual si existe
      if (entradaActual) entradaActual.lineas.push('');
      return;
    }
    
    // Detectar inicio de nueva entrada (número o bullet seguido de @usuario:)
    const matchNum = lineaTrim.match(/^(\d+)\.\s*(@\w+)\s*:\s*(.*)$/);
    const matchBullet = lineaTrim.match(/^[•\-\*]\s*(@\w+)\s*:\s*(.*)$/);
    const match = matchNum || matchBullet;
    
    if (match) {
      // Guardar entrada anterior si existe
      if (entradaActual) entradas.push(entradaActual);
      
      // Iniciar nueva entrada
      const numero = matchNum ? parseInt(matchNum[1], 10) : entradas.length + 1;
      const usuario = match[2];
      const contenido = match[3];
      
      entradaActual = {
        numero,
        usuario,
        lineas: contenido ? [contenido] : []
      };
    } else if (entradaActual) {
      // Continuar la entrada actual (texto multi-línea)
      entradaActual.lineas.push(linea);
    }
  });
  
  // Agregar última entrada
  if (entradaActual) entradas.push(entradaActual);
  
  if (!entradas.length) return texto;
  
  // Generar timestamps espaciados (un minuto entre cada entrada)
  const base = fechaBase instanceof Date ? fechaBase : new Date();
  const resultado = entradas.map((entrada, idx) => {
    const fecha = new Date(base.getTime() - (entradas.length - 1 - idx) * 60000);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    const hh = String(fecha.getHours()).padStart(2, '0');
    const mm = String(fecha.getMinutes()).padStart(2, '0');
    const stamp = `${dia}/${mes}/${anio} ${hh}:${mm}`;
    
    const textoEntrada = entrada.lineas.join('\n').trim();
    return `[${stamp}] ${entrada.usuario}: ${textoEntrada}`;
  });
  
  const textoMigrado = resultado.join('\n\n');
  console.log(`✅ Migrada ${entradas.length} entrada(s)`);
  return textoMigrado;
}

async function migrarNotasTarea(tarea) {
  if (!tarea || !tarea.detalles) return null;
  
  // Parsear detalles
  const parsed = typeof parseDetalles === 'function' 
    ? parseDetalles(tarea.detalles)
    : { notas: tarea.detalles };
  
  // Separar notas y comentarios
  const partes = typeof notasYComentarioEstatus === 'function'
    ? notasYComentarioEstatus(parsed.notas)
    : { notas: parsed.notas || '', comentario: '' };
  
  // Migrar la sección de comentarios si existe
  let comentarioMigrado = partes.comentario;
  let notasMigradas = partes.notas;
  
  if (partes.comentario) {
    comentarioMigrado = await migrarNotasDeTexto(partes.comentario, new Date(tarea.fechaInicio || Date.now()));
  } else if (partes.notas) {
    // Si no hay sección de comentario separada, migrar las notas directamente
    notasMigradas = await migrarNotasDeTexto(partes.notas, new Date(tarea.fechaInicio || Date.now()));
  }
  
  // Verificar si hubo cambios
  const huboCambios = comentarioMigrado !== partes.comentario || notasMigradas !== partes.notas;
  
  if (!huboCambios) {
    return null; // No necesita migración
  }
  
  // Reconstruir las notas
  let notasFinales;
  if (partes.comentario) {
    // Había sección de comentario separada
    notasFinales = notasMigradas
      ? `${notasMigradas}\n\nComentario: ${comentarioMigrado}`
      : `Comentario: ${comentarioMigrado}`;
  } else {
    notasFinales = notasMigradas;
  }
  
  // Reconstruir detalles completos
  const detallesNuevos = typeof serializeDetalles === 'function'
    ? serializeDetalles(
        notasFinales,
        parsed.subtareas || [],
        parsed.historial || [],
        parsed.link || tarea.link,
        parsed.subcliente || tarea.subcliente,
        {
          flujo: parsed.flujo || tarea.flujo,
          importKey: parsed.importKey || tarea.importKey,
          envioTipo: parsed.envioTipo || tarea.envioTipo,
          pendienteCor: parsed.pendienteCor || tarea.pendienteCor,
          medidas: parsed.medidas || null
        }
      )
    : notasFinales;
  
  return {
    ...tarea,
    detalles: detallesNuevos
  };
}

async function migrarTodasLasNotasChat(tareas) {
  if (!Array.isArray(tareas) || !tareas.length) {
    console.error('❌ No se proporcionaron tareas para migrar');
    return { migradas: [], errores: [] };
  }
  
  console.log(`🚀 Iniciando migración de ${tareas.length} tareas...`);
  
  const migradas = [];
  const errores = [];
  let contador = 0;
  
  for (const tarea of tareas) {
    try {
      const tareaMigrada = await migrarNotasTarea(tarea);
      
      if (tareaMigrada) {
        migradas.push(tareaMigrada);
        contador++;
        console.log(`✅ [${contador}/${tareas.length}] Migrada: ${tarea.info || tarea.idTarea}`);
      }
    } catch (error) {
      console.error(`❌ Error migrando tarea ${tarea.idTarea}:`, error);
      errores.push({ tarea, error: error.message });
    }
  }
  
  console.log(`\n📊 Resumen de migración:`);
  console.log(`   ✅ Migradas: ${migradas.length}`);
  console.log(`   ⏭️  Sin cambios: ${tareas.length - migradas.length - errores.length}`);
  console.log(`   ❌ Errores: ${errores.length}`);
  
  return { migradas, errores };
}

// Función auxiliar para migrar una sola tarea por ID
async function migrarTareaPorId(idTarea) {
  if (typeof obtenerTareaPorId !== 'function') {
    console.error('❌ La función obtenerTareaPorId no está disponible');
    return null;
  }
  
  const tarea = await obtenerTareaPorId(idTarea);
  if (!tarea) {
    console.error(`❌ No se encontró la tarea con ID: ${idTarea}`);
    return null;
  }
  
  const tareaMigrada = await migrarNotasTarea(tarea);
  
  if (!tareaMigrada) {
    console.log('ℹ️ La tarea no necesita migración');
    return null;
  }
  
  // Guardar la tarea migrada
  if (typeof guardarTarea === 'function') {
    await guardarTarea(tareaMigrada);
    console.log('✅ Tarea migrada y guardada correctamente');
  } else {
    console.log('⚠️ Tarea migrada pero no se pudo guardar automáticamente');
    console.log('Usa esta función para guardarla:', tareaMigrada);
  }
  
  return tareaMigrada;
}

// Exportar funciones
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    migrarNotasDeTexto,
    migrarNotasTarea,
    migrarTodasLasNotasChat,
    migrarTareaPorId
  };
}

// También hacer disponibles globalmente en el navegador
if (typeof window !== 'undefined') {
  window.migrarNotasDeTexto = migrarNotasDeTexto;
  window.migrarNotasTarea = migrarNotasTarea;
  window.migrarTodasLasNotasChat = migrarTodasLasNotasChat;
  window.migrarTareaPorId = migrarTareaPorId;
  
  console.log('✅ Script de migración cargado. Funciones disponibles:');
  console.log('   - migrarTareaPorId(idTarea)');
  console.log('   - migrarTodasLasNotasChat(tareas)');
  console.log('   - migrarNotasTarea(tarea)');
}
