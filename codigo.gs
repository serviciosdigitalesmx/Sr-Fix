/**
 * SRFIX CLOUD - Backend con Contraseñas
 * Google Apps Script + Google Sheets
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================
const CONFIG = {
  SHEET_NAME: 'SRFIX_DATABASE',
  API_VERSION: '2.5.0',
  SCRIPT_PROP_KEYS: {
    TECNICO: 'SRFIX_PASSWORD_TECNICO',
    OPERATIVO: 'SRFIX_PASSWORD_OPERATIVO',
    FOLIO_EQUIPO_SEQ: 'SRFIX_FOLIO_EQUIPO_SEQ',
    FOLIO_COTIZACION_SEQ: 'SRFIX_FOLIO_COTIZACION_SEQ',
    FOLIO_COTIZACION_MANUAL_SEQ: 'SRFIX_FOLIO_COTIZACION_MANUAL_SEQ',
    DRIVE_FOLDER_ID: 'SRFIX_DRIVE_FOLDER_ID'
  },
  LIMITS: {
    MAX_PAGE_SIZE: 2000,
    DEFAULT_PAGE_SIZE: 1000,
    MAX_FOTO_SIZE_BYTES: 3 * 1024 * 1024,
    MAX_SEGUIMIENTO_FOTOS: 8
  },
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_SLEEP_MS: 120
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
      'YOUTUBE_ID', 'CHECK_CARGADOR', 'CHECK_PANTALLA', 'CHECK_PRENDE', 'CHECK_RESPALDO', 'FOTO_RECEPCION', 'SEGUIMIENTO_CLIENTE', 'SEGUIMIENTO_FOTOS', 'FOLIO_COTIZACION_ORIGEN'
    ]);

    crearHojaSiNoExiste(ss, 'Clientes', [
      'ID', 'NOMBRE', 'TELEFONO', 'EMAIL', 'FECHA_REGISTRO'
    ]);

    crearHojaSiNoExiste(ss, 'Solicitudes', [
      'ID', 'FOLIO_COTIZACION', 'FECHA_SOLICITUD', 'NOMBRE', 'TELEFONO',
      'EMAIL', 'DISPOSITIVO', 'MODELO', 'PROBLEMAS', 'DESCRIPCION',
      'URGENCIA', 'ESTADO', 'FECHA_COTIZACION', 'COTIZACION_JSON', 'COTIZACION_TOTAL', 'FOLIO_COTIZACION_MANUAL'
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
    const pag = parsePaginacion(e.parameter || {});
    switch(action) {
      case 'status':
        return jsonResponse({ status: 'online', version: CONFIG.API_VERSION, storage: 'google_sheets' });
      case 'equipo':
        if (!e.parameter.folio) return jsonResponse({ error: 'Folio requerido' });
        return getEquipoByFolio(e.parameter.folio);
      case 'semaforo':
        return getSemaforoData(pag);
      case 'listar_solicitudes':
        return listarSolicitudes({ page: pag.page, pageSize: pag.pageSize });
      case 'solicitud':
        if (!e.parameter.folio) return jsonResponse({ error: 'Folio requerido' });
        return getSolicitudByFolio(e.parameter.folio);
      case 'archivar_solicitud':
        if (!e.parameter.folio) return jsonResponse({ error: 'Folio requerido' });
        return archivarSolicitud({ folio: e.parameter.folio });
      case 'archivar_cotizacion':
        if (!e.parameter.folio) return jsonResponse({ error: 'Folio requerido' });
        return archivarCotizacion({ folio: e.parameter.folio, cotizacion: {} });
      case 'listar_archivo':
        return listarArchivo({
          from: e.parameter.from || '',
          to: e.parameter.to || '',
          tipo: e.parameter.tipo || 'todos',
          page: pag.page,
          pageSize: pag.pageSize
        });
      case 'crear_solicitud':
        return crearSolicitud({
          nombre: e.parameter.nombre || '',
          telefono: e.parameter.telefono || '',
          email: e.parameter.email || '',
          dispositivo: e.parameter.dispositivo || '',
          modelo: e.parameter.modelo || '',
          problemas: (e.parameter.problemas || '').split(',').map(s => String(s).trim()).filter(Boolean),
          descripcion: e.parameter.descripcion || '',
          urgencia: e.parameter.urgencia || ''
        });
      default:
        return jsonResponse({ error: 'Acción no válida' });
    }
  } catch (error) {
    logError('doGet', error, { action: action, params: e && e.parameter ? e.parameter : {} });
    return jsonResponse({ error: error.toString() });
  }
}

function doPost(e) {
  try {
    const data = parsePostData(e);
    const action = data.action;
    const pag = parsePaginacion(data || {});

    switch(action) {
      case 'crear_equipo':
        return crearEquipo(data);
      case 'actualizar_equipo':
        return actualizarEquipo(data);
      case 'semaforo':
        return getSemaforoData(pag);
      case 'crear_solicitud':
        return crearSolicitud(data);
      case 'listar_solicitudes':
        return listarSolicitudes({ page: pag.page, pageSize: pag.pageSize });
      case 'solicitud':
        if (!data.folio) return jsonResponse({ error: 'Folio requerido' });
        return getSolicitudByFolio(data.folio);
      case 'archivar_solicitud':
        return archivarSolicitud(data);
      case 'archivar_cotizacion':
        return archivarCotizacion(data);
      case 'listar_archivo':
        return listarArchivo({ ...data, page: pag.page, pageSize: pag.pageSize });
      default:
        return jsonResponse({ error: 'Acción no válida' });
    }
  } catch (error) {
    logError('doPost', error);
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

function logError(contexto, error, extra) {
  const detalle = {
    contexto: contexto || 'sin_contexto',
    mensaje: error && error.message ? error.message : String(error || ''),
    stack: error && error.stack ? String(error.stack) : '',
    extra: extra || null
  };
  console.error(JSON.stringify(detalle));
}

function normalizarNumero(valor, fallback, min, max) {
  const num = Number(valor);
  if (!isFinite(num)) return fallback;
  let out = num;
  if (min !== undefined) out = Math.max(min, out);
  if (max !== undefined) out = Math.min(max, out);
  return out;
}

function parsePaginacion(input) {
  const page = Math.floor(normalizarNumero(input && input.page, 1, 1));
  const requested = Math.floor(normalizarNumero(input && input.pageSize, CONFIG.LIMITS.DEFAULT_PAGE_SIZE, 1));
  const pageSize = Math.min(requested, CONFIG.LIMITS.MAX_PAGE_SIZE);
  return { page: page, pageSize: pageSize };
}

function paginarArreglo(items, page, pageSize) {
  const total = items.length;
  const offset = (page - 1) * pageSize;
  const data = items.slice(offset, offset + pageSize);
  return {
    total: total,
    page: page,
    pageSize: pageSize,
    hasMore: (offset + data.length) < total,
    data: data
  };
}

function withRetry(fn, contexto) {
  let ultimoError = null;
  for (let intento = 1; intento <= CONFIG.RETRY.MAX_ATTEMPTS; intento++) {
    try {
      return fn();
    } catch (error) {
      ultimoError = error;
      logError(contexto || 'withRetry', error, { intento: intento });
      if (intento < CONFIG.RETRY.MAX_ATTEMPTS) {
        Utilities.sleep(CONFIG.RETRY.BASE_SLEEP_MS * intento);
      }
    }
  }
  throw ultimoError;
}

function withDocumentLock(fn, timeoutMs) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(timeoutMs || 10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function normalizarTelefono(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function boolFromCheck(valor) {
  if (valor === true) return true;
  const s = String(valor || '').trim().toUpperCase();
  return s === 'SI' || s === 'SÍ' || s === 'TRUE' || s === '1';
}

function checkToText(valor) {
  return boolFromCheck(valor) ? 'SÍ' : 'NO';
}

function validarEmailSimple(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function obtenerSiguienteFolio(key, prefix) {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const actual = Number(props.getProperty(key) || 0);
    const siguiente = actual + 1;
    props.setProperty(key, String(siguiente));
    return `${prefix}${String(siguiente).padStart(5, '0')}`;
  } finally {
    lock.releaseLock();
  }
}

function maybePersistImage(dataUrl, nombreBase) {
  const raw = String(dataUrl || '').trim();
  if (!raw) return '';
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(raw)) return normalizarUrlImagen(raw);

  const bytes = Utilities.base64Decode(raw.split(',')[1] || '');
  if (bytes.length > CONFIG.LIMITS.MAX_FOTO_SIZE_BYTES) {
    throw new Error('Imagen demasiado grande. Máximo 3MB por imagen.');
  }

  const folderId = PropertiesService.getScriptProperties().getProperty(CONFIG.SCRIPT_PROP_KEYS.DRIVE_FOLDER_ID);
  let folder = DriveApp.getRootFolder();
  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (error) {
      logError('maybePersistImage.folder', error, { folderId: folderId });
      folder = DriveApp.getRootFolder();
    }
  }
  const ext = (raw.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/) || [])[1] || 'jpeg';
  const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const nombre = `${nombreBase}_${new Date().getTime()}.${ext}`;
  const blob = Utilities.newBlob(bytes, contentType, nombre);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return urlDriveImagen(file.getId());
}

function urlDriveImagen(fileId) {
  const id = String(fileId || '').trim();
  if (!id) return '';
  return `https://drive.google.com/uc?export=view&id=${id}`;
}

function extraerDriveFileId(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  let m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  return '';
}

function normalizarUrlImagen(valor) {
  const s = String(valor || '').trim();
  if (!s) return '';
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(s)) return s;
  const id = extraerDriveFileId(s);
  if (id) return urlDriveImagen(id);
  return s;
}

function normalizarSeguimientoFotos(raw) {
  if (!raw) return '[]';
  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else {
    try {
      const parsed = JSON.parse(String(raw));
      arr = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      const single = normalizarUrlImagen(raw);
      arr = single ? [single] : [];
    }
  }
  const clean = arr
    .map(normalizarUrlImagen)
    .filter(Boolean);
  return JSON.stringify(clean);
}

// ==========================================
// LÓGICA DE NEGOCIO
// ==========================================

function getSemaforoData(pag) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');
  if (!hoja) return jsonResponse({ total: 0, urgentes: 0, atencion: 0, aTiempo: 0, equipos: [] });

  const datos = withRetry(() => hoja.getDataRange().getValues(), 'getSemaforoData.getValues');
  if (!datos || datos.length < 2) return jsonResponse({ total: 0, urgentes: 0, atencion: 0, aTiempo: 0, equipos: [] });

  const headers = datos[0];
  const p = parsePaginacion(pag || {});
  const equipos = datos.slice(1)
    .filter(row => String(row[8] || '') !== 'Entregado')
    .map(row => {
      const eq = normalizarEquipoForApi(mapearFilaEquipo(headers, row));
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const promesa = parseFechaFlexible(eq['FECHA_PROMESA']);
      eq['FECHA_PROMESA'] = promesa ? formatearFechaYMD(promesa) : '';
      let dias = 9999;
      if (promesa && !isNaN(promesa.getTime())) {
        promesa.setHours(0, 0, 0, 0);
        dias = Math.ceil((promesa - hoy) / (1000 * 60 * 60 * 24));
      }

      let color = 'verde';
      if (dias <= 2) color = 'rojo';
      else if (dias <= 4) color = 'amarillo';

      delete eq.FOTO_RECEPCION;
      delete eq.SEGUIMIENTO_FOTOS;
      return { ...eq, diasRestantes: dias, color: color };
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const totales = {
    total: equipos.length,
    urgentes: equipos.filter(e => e.color === 'rojo').length,
    atencion: equipos.filter(e => e.color === 'amarillo').length,
    aTiempo: equipos.filter(e => e.color === 'verde').length
  };
  const paginada = paginarArreglo(equipos, p.page, p.pageSize);
  return jsonResponse({
    ...totales,
    equipos: paginada.data,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function getEquipoByFolio(folio) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');
  if (!hoja) return jsonResponse({ error: 'No encontrado' });
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'getEquipoByFolio.getValues');
  const headers = datos[0];

  const fila = datos.find(row => String(row[1] || '') === String(folio || ''));
  if (!fila) return jsonResponse({ error: 'No encontrado' });

  const equipo = normalizarEquipoForApi(mapearFilaEquipo(headers, fila));

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

function formatearFechaYMDOrEmpty(valor) {
  const d = parseFechaFlexible(valor);
  return d ? formatearFechaYMD(d) : '';
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

function normalizarEquipoForApi(eqRaw) {
  const eq = { ...eqRaw };
  eq.CLIENTE_TELEFONO = normalizarTelefono(eq.CLIENTE_TELEFONO);

  ['FECHA_INGRESO', 'FECHA_PROMESA', 'FECHA_ENTREGA'].forEach(k => {
    const d = parseFechaFlexible(eq[k]);
    eq[k] = d ? formatearFechaYMD(d) : '';
  });

  eq.CHECK_CARGADOR = checkToText(eq.CHECK_CARGADOR);
  eq.CHECK_PANTALLA = checkToText(eq.CHECK_PANTALLA);
  eq.CHECK_PRENDE = checkToText(eq.CHECK_PRENDE);
  eq.CHECK_RESPALDO = checkToText(eq.CHECK_RESPALDO);
  eq.CHECK_CARGADOR_BOOL = boolFromCheck(eq.CHECK_CARGADOR);
  eq.CHECK_PANTALLA_BOOL = boolFromCheck(eq.CHECK_PANTALLA);
  eq.CHECK_PRENDE_BOOL = boolFromCheck(eq.CHECK_PRENDE);
  eq.CHECK_RESPALDO_BOOL = boolFromCheck(eq.CHECK_RESPALDO);
  eq.CHECKLIST = {
    cargador: eq.CHECK_CARGADOR_BOOL,
    pantalla: eq.CHECK_PANTALLA_BOOL,
    prende: eq.CHECK_PRENDE_BOOL,
    respaldo: eq.CHECK_RESPALDO_BOOL
  };
  eq.FOTO_RECEPCION = normalizarUrlImagen(eq.FOTO_RECEPCION);
  eq.SEGUIMIENTO_FOTOS = normalizarSeguimientoFotos(eq.SEGUIMIENTO_FOTOS);

  return eq;
}

function crearEquipo(data) {
  return withDocumentLock(function() {
    const payload = validarPayloadCrearEquipo(data || {});
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName('Equipos');
    if (!hoja) throw new Error('Hoja Equipos no encontrada');

    const folio = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_EQUIPO_SEQ, 'SRF-');
    const ahora = new Date().toISOString();

    const fotoRecepcion = payload.fotoRecepcion
      ? maybePersistImage(payload.fotoRecepcion, `${folio}_recepcion`)
      : '';
    const seguimientoFotos = (payload.seguimientoFotos || [])
      .slice(0, CONFIG.LIMITS.MAX_SEGUIMIENTO_FOTOS)
      .map((img, idx) => maybePersistImage(img, `${folio}_seg_${idx + 1}`))
      .filter(Boolean);

    withRetry(() => hoja.appendRow([
      Utilities.getUuid(), folio, ahora, payload.clienteNombre, payload.clienteTelefono,
      payload.dispositivo, payload.modelo, payload.falla, 'Recibido', 'Por asignar',
      payload.fechaPromesa, '', payload.costo, '', '',
      payload.checks.cargador ? 'SÍ' : 'NO',
      payload.checks.pantalla ? 'SÍ' : 'NO',
      payload.checks.prende ? 'SÍ' : 'NO',
      payload.checks.respaldo ? 'SÍ' : 'NO',
      fotoRecepcion,
      payload.seguimientoCliente,
      JSON.stringify(seguimientoFotos),
      payload.folioSolicitudOrigen || ''
    ]), 'crearEquipo.appendRow');

    if (payload.clienteTelefono) {
      const hojaClientes = ss.getSheetByName('Clientes');
      if (hojaClientes) {
        const datosClientes = withRetry(() => hojaClientes.getDataRange().getValues(), 'crearEquipo.getClientes');
        const existeCliente = datosClientes.some(row => String(row[2] || '') === payload.clienteTelefono);
        if (!existeCliente) {
          withRetry(() => hojaClientes.appendRow([
            Utilities.getUuid(),
            payload.clienteNombre,
            payload.clienteTelefono,
            payload.clienteEmail || '',
            ahora
          ]), 'crearEquipo.appendCliente');
        }
      }
    }

    return jsonResponse({ success: true, folio: folio });
  }, 12000);
}

function actualizarEquipo(data) {
  return withDocumentLock(function() {
    const folio = String((data && data.folio) || '').trim();
    if (!folio) return jsonResponse({ error: 'Folio requerido' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName('Equipos');
    if (!hoja) return jsonResponse({ error: 'No encontrado' });
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'actualizarEquipo.getValues');
    const headers = datos[0] || [];

    const filaIdx = datos.findIndex(row => String(row[1] || '') === folio);
    if (filaIdx === -1) return jsonResponse({ error: 'No encontrado' });
    const fila = filaIdx + 1;

    const colIndex = {};
    headers.forEach((h, i) => colIndex[String(h).trim()] = i + 1);
    const camposRaw = data.campos || {};
    const campos = validarCamposActualizacion(camposRaw);
    const faltantes = Object.keys(campos).filter(k => k && !colIndex[k]);
    if (faltantes.length > 0) {
      const start = hoja.getLastColumn() + 1;
      withRetry(() => hoja.getRange(1, start, 1, faltantes.length).setValues([faltantes]), 'actualizarEquipo.crearColumnas');
      faltantes.forEach((k, idx) => {
        colIndex[k] = start + idx;
      });
    }

    Object.keys(campos).forEach(k => {
      if (k === 'FOTO_RECEPCION' && /^data:image\//.test(String(campos[k] || ''))) {
        campos[k] = maybePersistImage(campos[k], `${folio}_recepcion_upd`);
      }
      if (k === 'FOTO_RECEPCION') {
        campos[k] = normalizarUrlImagen(campos[k]);
      }
      if (k === 'SEGUIMIENTO_FOTOS' && Array.isArray(campos[k])) {
        const fotos = campos[k].slice(0, CONFIG.LIMITS.MAX_SEGUIMIENTO_FOTOS)
          .map((img, idx) => maybePersistImage(img, `${folio}_segupd_${idx + 1}`))
          .filter(Boolean);
        campos[k] = normalizarSeguimientoFotos(fotos);
      }
      if (colIndex[k]) {
        withRetry(() => hoja.getRange(fila, colIndex[k]).setValue(campos[k]), `actualizarEquipo.set.${k}`);
      }
    });

    if (campos.ESTADO === 'Entregado' && colIndex.FECHA_ENTREGA) {
      withRetry(() => hoja.getRange(fila, colIndex.FECHA_ENTREGA).setValue(new Date().toISOString()), 'actualizarEquipo.fechaEntrega');
    }

    return jsonResponse({ success: true });
  }, 12000);
}

function crearSolicitud(data) {
  return withDocumentLock(function() {
    const payload = validarPayloadCrearSolicitud(data || {});
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaSolicitudes(ss);

    const folioCotizacion = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_COTIZACION_SEQ, 'COT-');
    const ahora = new Date().toISOString();
    const problemas = Array.isArray(payload.problemas) ? payload.problemas.join(', ') : payload.problemas;

    withRetry(() => hoja.appendRow([
      Utilities.getUuid(),
      folioCotizacion,
      ahora,
      payload.nombre,
      payload.telefono,
      payload.email,
      payload.dispositivo,
      payload.modelo,
      problemas,
      payload.descripcion,
      payload.urgencia,
      'pendiente',
      '',
      '',
      0
    ]), 'crearSolicitud.appendRow');

    return jsonResponse({ success: true, folio: folioCotizacion });
  }, 12000);
}

function listarSolicitudes(pag) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = obtenerHojaSolicitudes(ss);

  const datos = withRetry(() => hoja.getDataRange().getValues(), 'listarSolicitudes.getValues');
  if (!datos || datos.length < 2) return jsonResponse({ solicitudes: [] });
  const headers = datos[0];
  const p = parsePaginacion(pag || {});

  const solicitudes = datos.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    obj.TELEFONO = normalizarTelefono(obj.TELEFONO);
    const fechaSol = parseFechaFlexible(obj.FECHA_SOLICITUD);
    obj.FECHA_SOLICITUD = fechaSol ? formatearFechaYMD(fechaSol) : '';
    const fechaCot = parseFechaFlexible(obj.FECHA_COTIZACION);
    obj.FECHA_COTIZACION = fechaCot ? formatearFechaYMD(fechaCot) : '';
    return obj;
  }).filter(s => String(s.ESTADO || '').toLowerCase() === 'pendiente');

  const paginada = paginarArreglo(solicitudes, p.page, p.pageSize);
  return jsonResponse({
    solicitudes: paginada.data,
    total: paginada.total,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function getSolicitudByFolio(folio) {
  const target = String(folio || '').trim().toUpperCase();
  if (!target) return jsonResponse({ error: 'Folio requerido' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = obtenerHojaSolicitudes(ss);
  const datos = withRetry(() => hoja.getDataRange().getValues(), 'getSolicitudByFolio.getValues');
  if (!datos || datos.length < 2) return jsonResponse({ error: 'No encontrada' });

  const headers = datos[0];
  const idxFolio = headers.indexOf('FOLIO_COTIZACION');
  if (idxFolio === -1) return jsonResponse({ error: 'Estructura de hoja incorrecta' });

  const fila = datos.find((row, i) => i > 0 && String(row[idxFolio] || '').trim().toUpperCase() === target);
  if (!fila) return jsonResponse({ error: 'No encontrada' });

  const solicitud = {};
  headers.forEach((h, i) => solicitud[h] = fila[i]);
  solicitud.FOLIO_COTIZACION = String(solicitud.FOLIO_COTIZACION || '').trim().toUpperCase();
  solicitud.TELEFONO = normalizarTelefono(solicitud.TELEFONO || '');
  solicitud.FECHA_SOLICITUD = formatearFechaYMDOrEmpty(solicitud.FECHA_SOLICITUD || '');
  solicitud.FECHA_COTIZACION = formatearFechaYMDOrEmpty(solicitud.FECHA_COTIZACION || '');
  return jsonResponse({ solicitud: solicitud });
}

function archivarSolicitud(data) {
  return withDocumentLock(function() {
    const folio = String((data && data.folio) || '').trim();
    if (!folio) return jsonResponse({ error: 'Folio requerido' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaSolicitudes(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'archivarSolicitud.getValues');
    if (!datos || datos.length < 2) return jsonResponse({ error: 'Sin solicitudes' });
    const headers = datos[0];
    const idxEstado = headers.indexOf('ESTADO');
    const idxFolio = headers.indexOf('FOLIO_COTIZACION');
    if (idxEstado === -1 || idxFolio === -1) return jsonResponse({ error: 'Estructura de hoja incorrecta' });

    const filaIdx = datos.findIndex((row, i) => i > 0 && String(row[idxFolio] || '') === folio);
    if (filaIdx === -1) return jsonResponse({ error: 'No encontrada' });
    withRetry(() => hoja.getRange(filaIdx + 1, idxEstado + 1).setValue('archivado'), 'archivarSolicitud.setEstado');
    return jsonResponse({ success: true });
  }, 12000);
}

function obtenerHojaSolicitudes(ss) {
  return crearHojaSiNoExiste(ss, 'Solicitudes', [
    'ID', 'FOLIO_COTIZACION', 'FECHA_SOLICITUD', 'NOMBRE', 'TELEFONO',
    'EMAIL', 'DISPOSITIVO', 'MODELO', 'PROBLEMAS', 'DESCRIPCION',
    'URGENCIA', 'ESTADO', 'FECHA_COTIZACION', 'COTIZACION_JSON', 'COTIZACION_TOTAL', 'FOLIO_COTIZACION_MANUAL'
  ]);
}

function validarPayloadCrearEquipo(data) {
  const clienteNombre = String(data.clienteNombre || '').trim();
  const clienteTelefono = normalizarTelefono(data.clienteTelefono);
  const clienteEmail = String(data.clienteEmail || '').trim();
  const dispositivo = String(data.dispositivo || '').trim();
  const modelo = String(data.modelo || '').trim();
  const falla = String(data.falla || '').trim();
  const fechaPromesa = String(data.fechaPromesa || '').trim();
  const costo = normalizarNumero(data.costo, 0, 0);
  const checks = data.checks || {};
  const seguimientoRaw = Array.isArray(data.seguimientoFotos)
    ? data.seguimientoFotos
    : safeParseJsonArray(data.seguimientoFotos);
  const folioSolicitudOrigen = String(data.folioSolicitudOrigen || '').trim().toUpperCase();

  if (!clienteNombre) throw new Error('clienteNombre es obligatorio');
  if (!clienteTelefono || clienteTelefono.length !== 10) throw new Error('clienteTelefono inválido, deben ser 10 dígitos');
  if (!dispositivo) throw new Error('dispositivo es obligatorio');
  if (!modelo) throw new Error('modelo es obligatorio');
  if (!falla) throw new Error('falla es obligatoria');
  const fechaOk = parseFechaFlexible(fechaPromesa);
  if (!fechaOk) throw new Error('fechaPromesa inválida, usa yyyy-mm-dd');
  if (!validarEmailSimple(clienteEmail)) throw new Error('clienteEmail inválido');

  return {
    clienteNombre,
    clienteTelefono,
    clienteEmail,
    dispositivo,
    modelo,
    falla,
    fechaPromesa: formatearFechaYMD(fechaOk),
    costo,
    checks: {
      cargador: !!checks.cargador,
      pantalla: !!checks.pantalla,
      prende: !!checks.prende,
      respaldo: !!checks.respaldo
    },
    fotoRecepcion: String(data.fotoRecepcion || '').trim(),
    seguimientoCliente: String(data.seguimientoCliente || '').trim(),
    seguimientoFotos: seguimientoRaw.filter(Boolean),
    folioSolicitudOrigen: folioSolicitudOrigen
  };
}

function validarCamposActualizacion(camposRaw) {
  const campos = { ...camposRaw };
  if (campos.CLIENTE_TELEFONO !== undefined) {
    const tel = normalizarTelefono(campos.CLIENTE_TELEFONO);
    if (!tel || tel.length !== 10) throw new Error('CLIENTE_TELEFONO inválido, deben ser 10 dígitos');
    campos.CLIENTE_TELEFONO = tel;
  }
  if (campos.FECHA_PROMESA !== undefined) {
    const fecha = parseFechaFlexible(campos.FECHA_PROMESA);
    if (!fecha) throw new Error('FECHA_PROMESA inválida');
    campos.FECHA_PROMESA = formatearFechaYMD(fecha);
  }
  if (campos.ESTADO !== undefined) {
    const estado = String(campos.ESTADO || '').trim();
    if (estado && CONFIG.ESTADOS.indexOf(estado) === -1) throw new Error('ESTADO inválido');
    campos.ESTADO = estado;
  }
  if (campos.COSTO_ESTIMADO !== undefined) {
    campos.COSTO_ESTIMADO = normalizarNumero(campos.COSTO_ESTIMADO, 0, 0);
  }
  return campos;
}

function validarPayloadCrearSolicitud(data) {
  const nombre = String(data.nombre || '').trim();
  const telefono = normalizarTelefono(data.telefono);
  const email = String(data.email || '').trim();
  const dispositivo = String(data.dispositivo || '').trim();
  const modelo = String(data.modelo || '').trim();
  const descripcion = String(data.descripcion || '').trim();
  const urgencia = String(data.urgencia || '').trim();
  const problemas = Array.isArray(data.problemas)
    ? data.problemas.map(p => String(p || '').trim()).filter(Boolean)
    : String(data.problemas || '').split(',').map(p => String(p || '').trim()).filter(Boolean);

  if (!nombre) throw new Error('nombre es obligatorio');
  if (!telefono || telefono.length !== 10) throw new Error('telefono inválido, deben ser 10 dígitos');
  if (!dispositivo) throw new Error('dispositivo es obligatorio');
  if (!modelo) throw new Error('modelo es obligatorio');
  if (!descripcion) throw new Error('descripcion es obligatoria');
  if (!validarEmailSimple(email)) throw new Error('email inválido');

  return {
    nombre,
    telefono,
    email,
    dispositivo,
    modelo,
    descripcion,
    urgencia,
    problemas
  };
}

function safeParseJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function sanitizarCotizacion(cotizacion) {
  const items = Array.isArray(cotizacion.items) ? cotizacion.items : [];
  const cleanItems = items.slice(0, 50).map(it => ({
    concepto: String(it && it.concepto || '').slice(0, 200),
    cantidad: normalizarNumero(it && it.cantidad, 1, 0),
    precio: normalizarNumero(it && it.precio, 0, 0),
    total: normalizarNumero(it && it.total, 0, 0)
  }));
  return {
    items: cleanItems,
    notas: String(cotizacion.notas || '').slice(0, 2000),
    aplicaIva: !!cotizacion.aplicaIva,
    ivaRate: normalizarNumero(cotizacion.ivaRate, 0.16, 0),
    subtotal: normalizarNumero(cotizacion.subtotal, 0, 0),
    iva: normalizarNumero(cotizacion.iva, 0, 0),
    total: normalizarNumero(cotizacion.total, 0, 0),
    anticipo: normalizarNumero(cotizacion.anticipo, 0, 0),
    saldo: normalizarNumero(cotizacion.saldo, 0, 0)
  };
}

function archivarCotizacion(data) {
  return withDocumentLock(function() {
    const folio = String((data && data.folio) || '').trim();
    if (!folio) return jsonResponse({ error: 'Folio requerido' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaSolicitudes(ss);
    const datos = withRetry(() => hoja.getDataRange().getValues(), 'archivarCotizacion.getValues');
    if (!datos || datos.length < 2) return jsonResponse({ error: 'Sin solicitudes' });
    const headers = datos[0];

    const idxFolio = headers.indexOf('FOLIO_COTIZACION');
    const idxEstado = headers.indexOf('ESTADO');
    const idxFecha = headers.indexOf('FECHA_COTIZACION');
    const idxJson = headers.indexOf('COTIZACION_JSON');
    const idxTotal = headers.indexOf('COTIZACION_TOTAL');
    const idxFolioManual = headers.indexOf('FOLIO_COTIZACION_MANUAL');
    if ([idxFolio, idxEstado, idxFecha, idxJson, idxTotal, idxFolioManual].some(i => i === -1)) {
      return jsonResponse({ error: 'Estructura de hoja incorrecta' });
    }

    const filaIdx = datos.findIndex((row, i) => i > 0 && String(row[idxFolio] || '') === folio);
    if (filaIdx === -1) return jsonResponse({ error: 'No encontrada' });

    const fila = filaIdx + 1;
    const cotizacion = sanitizarCotizacion(data.cotizacion || {});
    const folioManualActual = String(datos[filaIdx][idxFolioManual] || '').trim();
    const folioCotizacionManual = folioManualActual || obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_COTIZACION_MANUAL_SEQ, 'CTM-');
    cotizacion.folioCotizacionManual = folioCotizacionManual;
    withRetry(() => hoja.getRange(fila, idxEstado + 1).setValue('cotizacion_archivada'), 'archivarCotizacion.estado');
    withRetry(() => hoja.getRange(fila, idxFecha + 1).setValue(new Date().toISOString()), 'archivarCotizacion.fecha');
    withRetry(() => hoja.getRange(fila, idxJson + 1).setValue(JSON.stringify(cotizacion)), 'archivarCotizacion.json');
    withRetry(() => hoja.getRange(fila, idxTotal + 1).setValue(Number(cotizacion.total || 0)), 'archivarCotizacion.total');
    withRetry(() => hoja.getRange(fila, idxFolioManual + 1).setValue(folioCotizacionManual), 'archivarCotizacion.folioManual');
    return jsonResponse({ success: true, folioCotizacionManual: folioCotizacionManual });
  }, 12000);
}

function listarArchivo(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tipo = String((data && data.tipo) || 'todos').toLowerCase();
  const from = parseFechaFiltro((data && data.from) || '');
  const to = parseFechaFiltro((data && data.to) || '');
  const p = parsePaginacion(data || {});
  if (to) to.setHours(23, 59, 59, 999);

  const archivo = [];
  const incluirSolicitudes = (tipo === 'todos' || tipo === 'solicitudes');
  const incluirCotizaciones = (tipo === 'todos' || tipo === 'cotizaciones');
  const incluirEquipos = (tipo === 'todos' || tipo === 'equipos');

  if (incluirSolicitudes || incluirCotizaciones) {
    const hojaSol = obtenerHojaSolicitudes(ss);
    const datosSol = withRetry(() => hojaSol.getDataRange().getValues(), 'listarArchivo.getSolicitudes');
    if (datosSol.length > 1) {
      const headers = datosSol[0];
      const idxEstado = headers.indexOf('ESTADO');
      datosSol.slice(1).forEach(row => {
        const estado = String(row[idxEstado] || '').toLowerCase();
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);

        const fechaBase = parseFechaFlexible(obj.FECHA_COTIZACION || obj.FECHA_SOLICITUD);
        if (!cumpleRango(fechaBase, from, to)) return;

        if (incluirSolicitudes && estado === 'archivado') {
          archivo.push({
            TIPO_ARCHIVO: 'solicitud',
            FECHA_ARCHIVO: formatearFechaYMDOrEmpty(obj.FECHA_SOLICITUD || ''),
            FOLIO: obj.FOLIO_COTIZACION || '',
            CLIENTE: obj.NOMBRE || '',
            TELEFONO: normalizarTelefono(obj.TELEFONO || ''),
            DETALLE: obj.DESCRIPCION || obj.PROBLEMAS || '',
            TOTAL: ''
          });
        }

        if (incluirCotizaciones && estado === 'cotizacion_archivada') {
          const folioCot = String(obj.FOLIO_COTIZACION_MANUAL || '').trim() || String(obj.FOLIO_COTIZACION || '');
          archivo.push({
            TIPO_ARCHIVO: 'cotizacion',
            FECHA_ARCHIVO: formatearFechaYMDOrEmpty(obj.FECHA_COTIZACION || obj.FECHA_SOLICITUD || ''),
            FOLIO: folioCot,
            CLIENTE: obj.NOMBRE || '',
            TELEFONO: normalizarTelefono(obj.TELEFONO || ''),
            DETALLE: obj.DESCRIPCION || obj.PROBLEMAS || '',
            TOTAL: Number(obj.COTIZACION_TOTAL || 0)
          });
        }
      });
    }
  }

  if (incluirEquipos) {
    const hojaEq = ss.getSheetByName('Equipos');
    if (hojaEq) {
      const datosEq = withRetry(() => hojaEq.getDataRange().getValues(), 'listarArchivo.getEquipos');
      if (datosEq.length > 1) {
        const headersEq = datosEq[0];
        const idxEstadoEq = headersEq.indexOf('ESTADO');
        const idxFolioEq = headersEq.indexOf('FOLIO');
        const idxClienteEq = headersEq.indexOf('CLIENTE_NOMBRE');
        const idxTelefonoEq = headersEq.indexOf('CLIENTE_TELEFONO');
        const idxModeloEq = headersEq.indexOf('MODELO');
        const idxDisEq = headersEq.indexOf('DISPOSITIVO');
        const idxFechaEntregaEq = headersEq.indexOf('FECHA_ENTREGA');
        const idxCostoEq = headersEq.indexOf('COSTO_ESTIMADO');

        datosEq.slice(1).forEach(row => {
          if (String(row[idxEstadoEq] || '') !== 'Entregado') return;
          const fechaEnt = parseFechaFlexible(row[idxFechaEntregaEq] || '');
          if (!cumpleRango(fechaEnt, from, to)) return;

          archivo.push({
            TIPO_ARCHIVO: 'equipo_entregado',
            FECHA_ARCHIVO: formatearFechaYMDOrEmpty(row[idxFechaEntregaEq] || ''),
            FOLIO: row[idxFolioEq] || '',
            CLIENTE: row[idxClienteEq] || '',
            TELEFONO: normalizarTelefono(row[idxTelefonoEq] || ''),
            DETALLE: `${row[idxDisEq] || ''} ${row[idxModeloEq] || ''}`.trim(),
            TOTAL: Number(row[idxCostoEq] || 0)
          });
        });
      }
    }
  }

  archivo.sort((a, b) => {
    const da = parseFechaFlexible(a.FECHA_ARCHIVO);
    const db = parseFechaFlexible(b.FECHA_ARCHIVO);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return tb - ta;
  });

  const paginada = paginarArreglo(archivo, p.page, p.pageSize);
  return jsonResponse({
    archivo: paginada.data,
    total: paginada.total,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function parseFechaFiltro(valor) {
  if (!valor) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) {
    const d = new Date(`${valor}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  return parseFechaFlexible(valor);
}

function cumpleRango(fecha, from, to) {
  if (!from && !to) return true;
  if (!fecha || isNaN(fecha.getTime())) return false;
  if (from && fecha < from) return false;
  if (to && fecha > to) return false;
  return true;
}

// ==========================================
// FUNCIÓN CORREGIDA (SIN CABECERAS MANUALES)
// ==========================================
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
