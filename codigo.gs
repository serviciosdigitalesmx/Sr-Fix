/**
 * SRFIX CLOUD - Backend con Contraseñas
 * Google Apps Script + Google Sheets
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================
const CONFIG = {
  SHEET_NAME: 'SRFIX_DATABASE',
  API_VERSION: '2.3.1',
  SCRIPT_PROP_KEYS: {
    TECNICO: 'SRFIX_PASSWORD_TECNICO',
    OPERATIVO: 'SRFIX_PASSWORD_OPERATIVO'
  },
  ESTADOS: ['Recibido', 'En Diagnóstico', 'En Reparación', 'Esperando Refacción', 'Listo', 'Entregado']
};

// ==========================================
// AUTO-CONFIGURACIÓN
// ==========================================

function inicializarSistema() {
  try {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      ss = SpreadsheetApp.create(CONFIG.SHEET_NAME);
      Logger.log('✅ Nuevo Spreadsheet creado: ' + ss.getUrl());
    }

    crearHojaSiNoExiste(ss, 'Equipos', [
      'ID', 'FOLIO', 'FECHA_INGRESO', 'CLIENTE_NOMBRE', 'CLIENTE_TELEFONO',
      'DISPOSITIVO', 'MODELO', 'FALLA_REPORTADA', 'ESTADO', 'TECNICO_ASIGNADO',
      'FECHA_PROMESA', 'FECHA_ENTREGA', 'COSTO_ESTIMADO', 'NOTAS_INTERNAS',
      'YOUTUBE_ID', 'CHECK_CARGADOR', 'CHECK_PANTALLA', 'CHECK_PRENDE', 'CHECK_RESPALDO', 'FOTO_RECEPCION', 'SEGUIMIENTO_CLIENTE', 'SEGUIMIENTO_FOTOS'
    ]);

    crearHojaSiNoExiste(ss, 'Clientes', [
      'ID', 'NOMBRE', 'TELEFONO', 'EMAIL', 'FECHA_REGISTRO'
    ]);

    crearHojaSiNoExiste(ss, 'Solicitudes', [
      'ID', 'FOLIO_COTIZACION', 'FECHA_SOLICITUD', 'NOMBRE', 'TELEFONO',
      'EMAIL', 'DISPOSITIVO', 'MODELO', 'PROBLEMAS', 'DESCRIPCION',
      'URGENCIA', 'ESTADO'
    ]);

    // Deja contraseñas de ejemplo si aún no existen.
    inicializarPasswordsPorDefecto();

    Logger.log('✅ Sistema listo. URL Web App: ' + ScriptApp.getService().getUrl());
    return { success: true, url: ScriptApp.getService().getUrl() };

  } catch (error) {
    Logger.log('❌ Error: ' + error);
    return { success: false, error: error.toString() };
  }
}

function crearHojaSiNoExiste(ss, nombre, headers) {
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.getRange(1, 1, 1, headers.length).setValues([headers]);
    hoja.setFrozenRows(1);
  } else {
    const lastCol = Math.max(hoja.getLastColumn(), 1);
    const actuales = hoja.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
    const faltantes = headers.filter(h => !actuales.includes(h));
    if (faltantes.length > 0) {
      hoja.getRange(1, lastCol + 1, 1, faltantes.length).setValues([faltantes]);
    }
  }
  hoja.getRange(1, 1, 1, hoja.getLastColumn())
    .setFontWeight('bold').setBackground('#FFC107').setFontColor('#000');
  return hoja;
}

function inicializarPasswordsPorDefecto() {
  const props = PropertiesService.getScriptProperties();
  const actual = props.getProperties();

  const updates = {};
  if (!actual[CONFIG.SCRIPT_PROP_KEYS.TECNICO]) updates[CONFIG.SCRIPT_PROP_KEYS.TECNICO] = 'Admin1';
  if (!actual[CONFIG.SCRIPT_PROP_KEYS.OPERATIVO]) updates[CONFIG.SCRIPT_PROP_KEYS.OPERATIVO] = 'Admin1';

  if (Object.keys(updates).length > 0) {
    props.setProperties(updates, false);
  }
}

function obtenerPasswords() {
  const props = PropertiesService.getScriptProperties();
  const tecnico = props.getProperty(CONFIG.SCRIPT_PROP_KEYS.TECNICO);
  const operativo = props.getProperty(CONFIG.SCRIPT_PROP_KEYS.OPERATIVO);

  if (!tecnico || !operativo) {
    throw new Error('Configura SRFIX_PASSWORD_TECNICO y SRFIX_PASSWORD_OPERATIVO en Script Properties');
  }

  return { tecnico: tecnico, operativo: operativo };
}

function configurarPasswords(tecnico, operativo) {
  if (!tecnico || !operativo) {
    throw new Error('Debes enviar ambas contraseñas');
  }

  PropertiesService.getScriptProperties().setProperties({
    [CONFIG.SCRIPT_PROP_KEYS.TECNICO]: String(tecnico),
    [CONFIG.SCRIPT_PROP_KEYS.OPERATIVO]: String(operativo)
  }, false);

  return { success: true };
}

// ==========================================
// API REST
// ==========================================

function doGet(e) {
  const action = e.parameter.action || 'status';

  try {
    switch(action) {
      case 'status':
        return jsonResponse({ status: 'online', version: CONFIG.API_VERSION });
      case 'equipo':
        if (!e.parameter.folio) return jsonResponse({ error: 'Folio requerido' });
        return getEquipoByFolio(e.parameter.folio);
      default:
        return jsonResponse({ error: 'Acción no válida' });
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

function doPost(e) {
  try {
    const data = parsePostData(e);
    const action = data.action;

    switch(action) {
      case 'crear_equipo':
        return crearEquipo(data);
      case 'actualizar_equipo':
        return actualizarEquipo(data);
      case 'semaforo':
        return getSemaforoData();
      case 'crear_solicitud':
        return crearSolicitud(data);
      case 'listar_solicitudes':
        return listarSolicitudes();
      case 'archivar_solicitud':
        return archivarSolicitud(data);
      default:
        return jsonResponse({ error: 'Acción no válida' });
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

function parsePostData(e) {
  if (!e) return {};
  const raw = e.postData && typeof e.postData.contents === 'string' ? e.postData.contents : '';

  // JSON directo (actual)
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      // Fallback: formulario tipo action=...&payload={...}
      const form = parseQueryString(raw);
      if (form.payload) {
        try {
          const payload = JSON.parse(form.payload);
          return { ...form, ...payload };
        } catch (err2) {
          return form;
        }
      }
      return form;
    }
  }

  return (e.parameter || {});
}

function parseQueryString(qs) {
  const out = {};
  if (!qs) return out;
  qs.split('&').forEach(part => {
    const kv = part.split('=');
    const k = decodeURIComponent((kv[0] || '').replace(/\+/g, ' '));
    const v = decodeURIComponent((kv.slice(1).join('=') || '').replace(/\+/g, ' '));
    if (!k) return;
    out[k] = v;
  });
  return out;
}

// ==========================================
// LÓGICA DE NEGOCIO
// ==========================================

function getSemaforoData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');
  const datos = hoja.getDataRange().getValues();
  const headers = datos[0];

  const equipos = datos.slice(1)
    .filter(row => row[8] !== 'Entregado') // No entregados
    .map(row => {
      const eq = mapearFilaEquipo(headers, row);

      const hoy = new Date();
      hoy.setHours(0,0,0,0);

      const promesa = parseFechaFlexible(eq['FECHA_PROMESA']);
      eq['FECHA_PROMESA'] = promesa ? formatearFechaYMD(promesa) : '';

      let dias = 9999;
      if (promesa && !isNaN(promesa.getTime())) {
        promesa.setHours(0,0,0,0);
        dias = Math.ceil((promesa - hoy) / (1000 * 60 * 60 * 24));
      }

      let color = 'verde';
      if (dias <= 2) color = 'rojo';
      else if (dias <= 4) color = 'amarillo';

      // El semáforo no necesita cargar blobs de imágenes en la lista.
      delete eq.FOTO_RECEPCION;
      delete eq.SEGUIMIENTO_FOTOS;

      return { ...eq, diasRestantes: dias, color: color };
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  return jsonResponse({
    total: equipos.length,
    urgentes: equipos.filter(e => e.color === 'rojo').length,
    atencion: equipos.filter(e => e.color === 'amarillo').length,
    aTiempo: equipos.filter(e => e.color === 'verde').length,
    equipos: equipos
  });
}

function getEquipoByFolio(folio) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');
  const datos = hoja.getDataRange().getValues();
  const headers = datos[0];

  const fila = datos.find(row => row[1] === folio);
  if (!fila) return jsonResponse({ error: 'No encontrado' });

  const equipo = mapearFilaEquipo(headers, fila);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaPromesa = parseFechaFlexible(equipo.FECHA_PROMESA);
  if (fechaPromesa) {
    fechaPromesa.setHours(0, 0, 0, 0);
    equipo.FECHA_PROMESA = formatearFechaYMD(fechaPromesa);
    equipo.diasRestantes = Math.ceil((fechaPromesa - hoy) / (1000 * 60 * 60 * 24));
  } else {
    equipo.diasRestantes = 9999;
  }

  delete equipo.NOTAS_INTERNAS;
  delete equipo.COSTO_ESTIMADO;

  return jsonResponse({ equipo: equipo });
}

function parseFechaFlexible(valor) {
  if (!valor) return null;

  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return isNaN(valor.getTime()) ? null : new Date(valor.getTime());
  }

  const str = String(valor).trim();
  if (!str) return null;

  // Formato simple yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO u otros formatos parseables por JS
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  return null;
}

function formatearFechaYMD(fecha) {
  return Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function mapearFilaEquipo(headers, row) {
  const eq = {};
  headers.forEach((h, i) => {
    if (h) eq[h] = row[i];
  });

  // Fallbacks por índice para hojas viejas sin encabezados nuevos.
  if (!eq.FOTO_RECEPCION && row[19]) eq.FOTO_RECEPCION = row[19];
  if (!eq.SEGUIMIENTO_CLIENTE && row[20]) eq.SEGUIMIENTO_CLIENTE = row[20];
  if (!eq.SEGUIMIENTO_FOTOS && row[21]) eq.SEGUIMIENTO_FOTOS = row[21];

  return eq;
}

function crearEquipo(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');

  let folio;
  let existe;
  do {
    folio = 'SRF-' + Math.floor(1000 + Math.random() * 9000);
    const datos = hoja.getDataRange().getValues();
    existe = datos.some(row => row[1] === folio);
  } while (existe);

  const ahora = new Date().toISOString();

  hoja.appendRow([
    Utilities.getUuid(), folio, ahora, data.clienteNombre, data.clienteTelefono,
    data.dispositivo, data.modelo, data.falla, 'Recibido', 'Por asignar',
    data.fechaPromesa, '', data.costo || 0, '', '',
    data.checks?.cargador ? 'SÍ' : 'NO',
    data.checks?.pantalla ? 'SÍ' : 'NO',
    data.checks?.prende ? 'SÍ' : 'NO',
    data.checks?.respaldo ? 'SÍ' : 'NO',
    data.fotoRecepcion || '',
    data.seguimientoCliente || '',
    data.seguimientoFotos || '[]'
  ]);

  if (data.clienteTelefono) {
    const hojaClientes = ss.getSheetByName('Clientes');
    const datosClientes = hojaClientes.getDataRange().getValues();
    const existeCliente = datosClientes.some(row => row[2] === data.clienteTelefono);
    if (!existeCliente) {
      hojaClientes.appendRow([
        Utilities.getUuid(),
        data.clienteNombre,
        data.clienteTelefono,
        data.clienteEmail || '',
        ahora
      ]);
    }
  }

  return jsonResponse({ success: true, folio: folio });
}

function actualizarEquipo(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');
  const datos = hoja.getDataRange().getValues();
  const headers = datos[0];

  const filaIdx = datos.findIndex(row => row[1] === data.folio);
  if (filaIdx === -1) return jsonResponse({ error: 'No encontrado' });

  const fila = filaIdx + 1;
  const colIndex = {};
  headers.forEach((h, i) => colIndex[String(h).trim()] = i + 1);

  const campos = data.campos || {};
  const faltantes = Object.keys(campos).filter(k => k && !colIndex[k]);
  if (faltantes.length > 0) {
    const start = hoja.getLastColumn() + 1;
    hoja.getRange(1, start, 1, faltantes.length).setValues([faltantes]);
    faltantes.forEach((k, idx) => {
      colIndex[k] = start + idx;
    });
  }

  Object.keys(campos).forEach(k => {
    if (colIndex[k]) hoja.getRange(fila, colIndex[k]).setValue(campos[k]);
  });

  if (campos.ESTADO === 'Entregado' && colIndex.FECHA_ENTREGA) {
    hoja.getRange(fila, colIndex.FECHA_ENTREGA).setValue(new Date().toISOString());
  }

  return jsonResponse({ success: true });
}

function crearSolicitud(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Solicitudes');
  if (!hoja) return jsonResponse({ error: 'Hoja Solicitudes no encontrada' });

  const folioCotizacion = 'COT-' + Math.floor(1000 + Math.random() * 9000);
  const ahora = new Date().toISOString();
  const problemas = Array.isArray(data.problemas) ? data.problemas.join(', ') : (data.problemas || '');

  hoja.appendRow([
    Utilities.getUuid(),
    folioCotizacion,
    ahora,
    data.nombre || '',
    data.telefono || '',
    data.email || '',
    data.dispositivo || '',
    data.modelo || '',
    problemas,
    data.descripcion || '',
    data.urgencia || '',
    'pendiente'
  ]);

  return jsonResponse({ success: true, folio: folioCotizacion });
}

function listarSolicitudes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Solicitudes');
  if (!hoja) return jsonResponse({ solicitudes: [] });

  const datos = hoja.getDataRange().getValues();
  if (!datos || datos.length < 2) return jsonResponse({ solicitudes: [] });
  const headers = datos[0];

  const solicitudes = datos.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }).filter(s => String(s.ESTADO || '').toLowerCase() === 'pendiente');

  return jsonResponse({ solicitudes: solicitudes });
}

function archivarSolicitud(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Solicitudes');
  if (!hoja) return jsonResponse({ error: 'Hoja Solicitudes no encontrada' });

  const datos = hoja.getDataRange().getValues();
  if (!datos || datos.length < 2) return jsonResponse({ error: 'Sin solicitudes' });
  const headers = datos[0];
  const idxEstado = headers.indexOf('ESTADO');
  const idxFolio = headers.indexOf('FOLIO_COTIZACION');

  if (idxEstado === -1 || idxFolio === -1) {
    return jsonResponse({ error: 'Estructura de hoja incorrecta' });
  }

  const filaIdx = datos.findIndex((row, i) => i > 0 && row[idxFolio] === data.folio);
  if (filaIdx === -1) return jsonResponse({ error: 'No encontrada' });

  hoja.getRange(filaIdx + 1, idxEstado + 1).setValue('archivado');
  return jsonResponse({ success: true });
}

// ==========================================
// FUNCIÓN CORREGIDA (SIN CABECERAS MANUALES)
// ==========================================
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
