/**
 * Equipos - persistencia y servicios del flujo operativo.
 * Se apoya en Google Sheets para compatibilidad con el sistema legacy.
 */

const LEGACY_EQUIPO_HEADERS = [
  'ID',
  'FOLIO',
  'FECHA_INGRESO',
  'CLIENTE_NOMBRE',
  'CLIENTE_TELEFONO',
  'CLIENTE_EMAIL',
  'DISPOSITIVO',
  'MODELO',
  'FALLA_REPORTADA',
  'FECHA_PROMESA',
  'COSTO_ESTIMADO',
  'ESTADO',
  'SEGUIMIENTO_CLIENTE',
  'NOTAS_INTERNAS',
  'CASO_RESOLUCION_TECNICA',
  'YOUTUBE_ID',
  'FOTO_RECEPCION',
  'CHECK_CARGADOR',
  'CHECK_PANTALLA',
  'CHECK_PRENDE',
  'CHECK_RESPALDO',
  'FECHA_ULTIMA_ACTUALIZACION',
  'FECHA_ENTREGA',
  'PAGO_REGISTRADO_AT',
  'PAGO_REGISTRADO_ID',
  'SUCURSAL_ID',
  'FOLIO_SOLICITUD_ORIGEN'
];

const LEGACY_PAGOS_CLIENTES_HEADERS = [
  'ID',
  'FOLIO_EQUIPO',
  'FECHA_PAGO',
  'CLIENTE_NOMBRE',
  'CLIENTE_TELEFONO',
  'MONTO',
  'METODO_PAGO',
  'NOTAS',
  'SUCURSAL_ID',
  'FUENTE',
  'CREADO_EN'
];

function crearHojaSiNoExiste(ss, sheetName, headers) {
  if (!ss) return null;
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (headers && headers.length) {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
      const merged = currentHeaders.slice();
      headers.forEach(function(header) {
        if (merged.indexOf(header) < 0) merged.push(header);
      });
      if (merged.length !== currentHeaders.length) {
        sheet.getRange(1, 1, 1, merged.length).setValues([merged]);
      }
    }
  }
  return sheet;
}

function _legacyObtenerHoja(ss, name, headers) {
  return crearHojaSiNoExiste(ss, name, headers);
}

function obtenerHojaSolicitudes(ss) { return _legacyObtenerHoja(ss, CORE_SHEETS.SOLICITUDES, ['ID', 'FOLIO_COTIZACION', 'FECHA_SOLICITUD', 'NOMBRE', 'TELEFONO', 'EMAIL', 'DISPOSITIVO', 'MODELO', 'PROBLEMAS', 'DESCRIPCION', 'URGENCIA', 'ESTADO', 'FECHA_COTIZACION', 'COTIZACION_JSON', 'COTIZACION_TOTAL', 'FOLIO_COTIZACION_MANUAL', 'SUCURSAL_ID', 'SOLICITUD_ORIGEN_IP']); }
function obtenerHojaTareas(ss) { return _legacyObtenerHoja(ss, CORE_SHEETS.TAREAS, ['ID', 'FOLIO_TAREA', 'FECHA_CREACION', 'TITULO', 'DESCRIPCION', 'ESTADO', 'PRIORIDAD', 'RESPONSABLE', 'FECHA_LIMITE', 'TIPO_RELACION', 'FOLIO_RELACIONADO', 'NOTAS', 'HISTORIAL', 'FECHA_ACTUALIZACION', 'SUCURSAL_ID']); }
function obtenerHojaProveedores(ss) { return _legacyObtenerHoja(ss, CORE_SHEETS.PROVEEDORES, ['ID', 'NOMBRE_COMERCIAL', 'RAZON_SOCIAL', 'CONTACTO', 'TELEFONO', 'WHATSAPP', 'EMAIL', 'DIRECCION', 'CIUDAD_ESTADO', 'CATEGORIAS', 'TIEMPO_ENTREGA', 'CONDICIONES_PAGO', 'CALIFICACION_PRECIO', 'CALIFICACION_RAPIDEZ', 'CALIFICACION_CALIDAD', 'CALIFICACION_CONFIABILIDAD', 'NOTAS', 'ESTATUS', 'FECHA_CREACION', 'FECHA_ACTUALIZACION']); }
function obtenerHojaOrdenesCompra(ss) { return _legacyObtenerHoja(ss, CORE_SHEETS.ORDENES_COMPRA, ['ID', 'FOLIO_OC', 'FECHA', 'PROVEEDOR', 'ESTADO', 'REFERENCIA', 'CONDICIONES_PAGO', 'FECHA_ESTIMADA', 'FOLIO_RELACIONADO', 'NOTAS', 'SUBTOTAL', 'IVA_PORCENTAJE', 'IVA_MONTO', 'TOTAL', 'SUCURSAL_ID', 'FECHA_CREACION', 'FECHA_ACTUALIZACION']); }
function obtenerHojaOrdenesCompraItems(ss) { return _legacyObtenerHoja(ss, CORE_SHEETS.ORDENES_COMPRA_ITEMS, ['ID', 'FOLIO_OC', 'ITEM_ID', 'SKU', 'PRODUCTO', 'CANTIDAD_PEDIDA', 'COSTO_UNITARIO', 'CANTIDAD_RECIBIDA', 'SUBTOTAL', 'FECHA_CREACION', 'FECHA_ACTUALIZACION']); }
function obtenerHojaGastos(ss) { return _legacyObtenerHoja(ss, CORE_SHEETS.GASTOS, ['ID', 'FECHA', 'TIPO', 'CATEGORIA', 'CONCEPTO', 'DESCRIPCION', 'MONTO', 'METODO_PAGO', 'PROVEEDOR', 'FOLIO_RELACIONADO', 'COMPROBANTE_URL', 'NOTAS', 'FECHA_CREACION', 'FECHA_ACTUALIZACION', 'SUCURSAL_ID']); }
function obtenerHojaClientes(ss) { return _legacyObtenerHoja(ss, CORE_SHEETS.CLIENTES, ['ID', 'NOMBRE', 'TELEFONO', 'EMAIL', 'ETIQUETA', 'NOTAS', 'ESTATUS', 'FECHA_CREACION', 'FECHA_ACTUALIZACION', 'SUCURSAL_ID']); }
function obtenerHojaProductos(ss) { return _legacyObtenerHoja(ss, CORE_SHEETS.PRODUCTOS, ['ID', 'SKU', 'NOMBRE', 'CATEGORIA', 'MARCA', 'MODELO_COMPATIBLE', 'PROVEEDOR', 'COSTO', 'PRECIO', 'STOCK_ACTUAL', 'STOCK_MINIMO', 'UNIDAD', 'UBICACION', 'NOTAS', 'ESTATUS', 'FECHA_CREACION', 'FECHA_ACTUALIZACION']); }
function obtenerHojaEquipos(ss) { return _legacyObtenerHoja(ss, CORE_SHEETS.EQUIPOS, LEGACY_EQUIPO_HEADERS); }
function obtenerHojaPagosClientes(ss) { return _legacyObtenerHoja(ss, CORE_SHEETS.PAGOS_CLIENTES || 'PagosClientes', LEGACY_PAGOS_CLIENTES_HEADERS); }

function _getHeaderIndex(headers, aliases) {
  const normalized = (headers || []).map(function(h) { return String(h || '').trim().toUpperCase(); });
  for (let i = 0; i < aliases.length; i += 1) {
    const idx = normalized.indexOf(String(aliases[i] || '').trim().toUpperCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

function _getField(obj, aliases, fallback) {
  const source = obj || {};
  for (let i = 0; i < aliases.length; i += 1) {
    const key = aliases[i];
    if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') {
      return source[key];
    }
  }
  return fallback;
}

function _toMoney(value) {
  const num = Number(value || 0);
  return isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function _safeDate(value) {
  const d = parseFechaFlexible(value);
  return d && !isNaN(d.getTime()) ? d : null;
}

function _calculateDiasRestantes(fechaPromesa) {
  const d = _safeDate(fechaPromesa);
  if (!d) return null;
  const hoy = new Date();
  const startToday = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const startPromesa = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startPromesa.getTime() - startToday.getTime()) / 86400000);
}

function normalizarEquipoForApi(raw) {
  const obj = raw || {};
  const costo = _toMoney(_getField(obj, ['COSTO_ESTIMADO', 'PRECIO', 'COSTO', 'MONTO', 'VALOR'], 0));
  const fechaPromesa = formatearFechaYMDOrEmpty(_getField(obj, ['FECHA_PROMESA', 'PROMESA', 'FECHA_ENTREGA', 'FECHA_LIMITE'], ''));
  const fechaIngreso = formatearFechaYMDOrEmpty(_getField(obj, ['FECHA_INGRESO', 'FECHA_CREACION', 'CREATED_AT', 'FECHA'], ''));
  const estado = String(_getField(obj, ['ESTADO', 'STATUS'], 'Recibido') || 'Recibido').trim();
  const diasRestantes = _calculateDiasRestantes(fechaPromesa);
  let color = 'verde';
  if (String(estado).toLowerCase() === 'entregado') color = 'gris';
  else if (diasRestantes !== null && diasRestantes <= 2) color = 'rojo';
  else if (diasRestantes !== null && diasRestantes <= 4) color = 'amarillo';
  const salida = Object.assign({}, obj, {
    FOLIO: String(_getField(obj, ['FOLIO', 'FOLIO_EQUIPO', 'FOLIO_ORDEN'], '') || '').trim().toUpperCase(),
    CLIENTE_NOMBRE: String(_getField(obj, ['CLIENTE_NOMBRE', 'NOMBRE_CLIENTE', 'CLIENTE', 'NOMBRE'], '') || '').trim(),
    CLIENTE_TELEFONO: normalizarTelefono(_getField(obj, ['CLIENTE_TELEFONO', 'TELEFONO', 'WHATSAPP'], '')),
    CLIENTE_EMAIL: String(_getField(obj, ['CLIENTE_EMAIL', 'EMAIL'], '') || '').trim(),
    DISPOSITIVO: String(_getField(obj, ['DISPOSITIVO', 'EQUIPO', 'TIPO_DISPOSITIVO', 'TIPO'], '') || '').trim(),
    MODELO: String(_getField(obj, ['MODELO', 'MODELO_EQUIPO', 'MARCA_MODELO'], '') || '').trim(),
    FALLA_REPORTADA: String(_getField(obj, ['FALLA_REPORTADA', 'FALLA', 'DESCRIPCION', 'DESCRIPCION_FALLA'], '') || '').trim(),
    FECHA_PROMESA: fechaPromesa,
    COSTO_ESTIMADO: costo,
    ESTADO: estado,
    SEGUIMIENTO_CLIENTE: String(_getField(obj, ['SEGUIMIENTO_CLIENTE', 'SEGUIMIENTO', 'SEGUIMIENTO_VISIBLE'], '') || '').trim(),
    NOTAS_INTERNAS: String(_getField(obj, ['NOTAS_INTERNAS', 'NOTAS'], '') || '').trim(),
    CASO_RESOLUCION_TECNICA: String(_getField(obj, ['CASO_RESOLUCION_TECNICA', 'RESOLUCION_TECNICA'], '') || '').trim(),
    YOUTUBE_ID: String(_getField(obj, ['YOUTUBE_ID', 'YT_ID'], '') || '').trim(),
    FOTO_RECEPCION: _getField(obj, ['FOTO_RECEPCION', 'FOTO', 'IMAGEN_RECEPCION', 'fotoRecepcion'], ''),
    FECHA_INGRESO: fechaIngreso,
    FECHA_ULTIMA_ACTUALIZACION: formatearFechaYMDOrEmpty(_getField(obj, ['FECHA_ULTIMA_ACTUALIZACION', 'UPDATED_AT', 'FECHA_ACTUALIZACION'], '')),
    FECHA_ENTREGA: formatearFechaYMDOrEmpty(_getField(obj, ['FECHA_ENTREGA', 'DELIVERED_AT'], '')),
    PAGO_REGISTRADO_AT: formatearFechaYMDOrEmpty(_getField(obj, ['PAGO_REGISTRADO_AT'], '')),
    PAGO_REGISTRADO_ID: String(_getField(obj, ['PAGO_REGISTRADO_ID'], '') || '').trim(),
    SUCURSAL_ID: normalizarSucursalId(_getField(obj, ['SUCURSAL_ID', 'SUCURSAL'], 'GLOBAL')),
    FOLIO_SOLICITUD_ORIGEN: String(_getField(obj, ['FOLIO_SOLICITUD_ORIGEN', 'SOLICITUD_ORIGEN'], '') || '').trim().toUpperCase(),
    diasRestantes: diasRestantes === null ? 0 : diasRestantes,
    color: color
  });
  salida.folio = salida.FOLIO;
  salida.cliente = salida.CLIENTE_NOMBRE;
  salida.telefono = salida.CLIENTE_TELEFONO;
  salida.dispositivo = salida.DISPOSITIVO;
  salida.modelo = salida.MODELO;
  salida.falla = salida.FALLA_REPORTADA;
  salida.costo = salida.COSTO_ESTIMADO;
  salida.estado = salida.ESTADO;
  salida.fechaPromesa = salida.FECHA_PROMESA;
  return salida;
}

function _buildRowFromHeaders(headers, obj) {
  return (headers || []).map(function(header) {
    const key = String(header || '').trim();
    return obj[key] !== undefined ? obj[key] : '';
  });
}

function _ensureNextId(table) {
  return Math.max(0, (table && table.rows && table.rows.length) || 0) + 1;
}

function _appendIfMissing(sheet, rowValues) {
  return withRetry(function() {
    sheet.appendRow(rowValues);
    return true;
  }, 'appendIfMissing');
}

function Repository_readEquiposTable() {
  const hoja = obtenerHojaEquipos(Core_getSpreadsheet());
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_readEquiposTable');
  if (!data || data.length < 1) return { headers: [], rows: [] };
  return { headers: data[0] || [], rows: data.slice(1) };
}

function Repository_findEquipoByFolio(folio) {
  const target = String(folio || '').trim().toUpperCase();
  if (!target) return null;
  const table = Repository_readEquiposTable();
  const idx = _getHeaderIndex(table.headers, ['FOLIO', 'FOLIO_EQUIPO', 'FOLIO_ORDEN']);
  if (idx < 0) return null;
  const row = (table.rows || []).find(function(r) {
    return String(r[idx] || '').trim().toUpperCase() === target;
  });
  return row ? mapearFila(table.headers, row) : null;
}

function Repository_appendEquipo(record) {
  const hoja = obtenerHojaEquipos(Core_getSpreadsheet());
  const table = Repository_readEquiposTable();
  const headers = table.headers && table.headers.length ? table.headers : LEGACY_EQUIPO_HEADERS;
  const rowObj = Object.assign({}, record || {});
  if (!rowObj.ID) rowObj.ID = _ensureNextId(table);
  const rowValues = _buildRowFromHeaders(headers, rowObj);
  return _appendIfMissing(hoja, rowValues);
}

function Repository_updateEquipoByFolio(folio, changes) {
  const target = String(folio || '').trim().toUpperCase();
  if (!target) return false;
  const hoja = obtenerHojaEquipos(Core_getSpreadsheet());
  const table = Repository_readEquiposTable();
  const headers = table.headers || [];
  const idxFolio = _getHeaderIndex(headers, ['FOLIO', 'FOLIO_EQUIPO', 'FOLIO_ORDEN']);
  if (idxFolio < 0) return false;
  const rowIndex = table.rows.findIndex(function(row, i) {
    return String(row[idxFolio] || '').trim().toUpperCase() === target;
  });
  if (rowIndex < 0) return false;
  const current = mapearFila(headers, table.rows[rowIndex]);
  const next = Object.assign({}, current, changes || {});
  const rowValues = _buildRowFromHeaders(headers, next);
  withRetry(function() {
    hoja.getRange(rowIndex + 2, 1, 1, rowValues.length).setValues([rowValues]);
    return true;
  }, 'Repository_updateEquipoByFolio.write');
  return true;
}

function Repository_readPagosClientesTable() {
  const hoja = obtenerHojaPagosClientes(Core_getSpreadsheet());
  const data = withRetry(function() {
    return hoja.getDataRange().getValues();
  }, 'Repository_readPagosClientesTable');
  if (!data || data.length < 1) return { headers: [], rows: [] };
  return { headers: data[0] || [], rows: data.slice(1) };
}

function Repository_appendPagoCliente(record) {
  const hoja = obtenerHojaPagosClientes(Core_getSpreadsheet());
  const table = Repository_readPagosClientesTable();
  const headers = table.headers && table.headers.length ? table.headers : LEGACY_PAGOS_CLIENTES_HEADERS;
  const rowValues = _buildRowFromHeaders(headers, record || {});
  return _appendIfMissing(hoja, rowValues);
}

function Repository_findPagoClienteByFolio(folio) {
  const target = String(folio || '').trim().toUpperCase();
  if (!target) return null;
  const table = Repository_readPagosClientesTable();
  const idx = _getHeaderIndex(table.headers, ['FOLIO_EQUIPO', 'FOLIO']);
  if (idx < 0) return null;
  const row = (table.rows || []).find(function(r) {
    return String(r[idx] || '').trim().toUpperCase() === target;
  });
  return row ? mapearFila(table.headers, row) : null;
}

function validarPayloadEquipo(data, isUpdate) {
  const payload = data || {};
  const costoDefinido = payload.costo !== undefined || payload.COSTO_ESTIMADO !== undefined;
  const out = {
    clienteNombre: String(payload.clienteNombre || payload.CLIENTE_NOMBRE || '').trim(),
    clienteTelefono: normalizarTelefono(payload.clienteTelefono || payload.CLIENTE_TELEFONO || ''),
    clienteEmail: String(payload.clienteEmail || payload.CLIENTE_EMAIL || '').trim(),
    dispositivo: String(payload.dispositivo || payload.DISPOSITIVO || '').trim(),
    modelo: String(payload.modelo || payload.MODELO || '').trim(),
    falla: String(payload.falla || payload.FALLA_REPORTADA || payload.descripcion || '').trim(),
    fechaPromesa: String(payload.fechaPromesa || payload.FECHA_PROMESA || '').trim(),
    costo: costoDefinido ? _toMoney(payload.costo !== undefined ? payload.costo : payload.COSTO_ESTIMADO) : undefined,
    notas: String(payload.notas || payload.NOTAS_INTERNAS || '').trim(),
    sucursalId: normalizarSucursalId(payload.sucursalId || payload.SUCURSAL_ID || 'GLOBAL'),
    folioSolicitudOrigen: String(payload.folioSolicitudOrigen || payload.FOLIO_SOLICITUD_ORIGEN || '').trim().toUpperCase(),
    fotoRecepcion: String(payload.fotoRecepcion || payload.FOTO_RECEPCION || '').trim(),
    estado: String(payload.estado || payload.ESTADO || '').trim(),
    checkCargador: boolFromCheck(payload.checks && payload.checks.cargador),
    checkPantalla: boolFromCheck(payload.checks && payload.checks.pantalla),
    checkPrende: boolFromCheck(payload.checks && payload.checks.prende),
    checkRespaldo: boolFromCheck(payload.checks && payload.checks.respaldo)
  };

  if (!isUpdate) {
    const faltantes = [];
    if (!out.clienteNombre) faltantes.push('clienteNombre');
    if (!out.clienteTelefono) faltantes.push('clienteTelefono');
    if (!out.dispositivo) faltantes.push('dispositivo');
    if (!out.falla) faltantes.push('falla');
    if (!out.fechaPromesa) faltantes.push('fechaPromesa');
    if (faltantes.length) return { ok: false, error: 'Campos requeridos: ' + faltantes.join(', ') };
  }

  return { ok: true, payload: out };
}

function Service_crearEquipo(data) {
  return withDocumentLock(function() {
    const check = validarPayloadEquipo(data || {}, false);
    if (!check.ok) return jsonResponse({ error: check.error });
    const payload = check.payload;
    const table = Repository_readEquiposTable();
    const now = new Date().toISOString();
    const folio = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_EQUIPO_SEQ || 'FOLIO_EQUIPO_SEQ', 'SRF-');
    const nextId = _ensureNextId(table);
    const record = {
      ID: nextId,
      FOLIO: folio,
      FECHA_INGRESO: now,
      CLIENTE_NOMBRE: payload.clienteNombre,
      CLIENTE_TELEFONO: payload.clienteTelefono,
      CLIENTE_EMAIL: payload.clienteEmail,
      DISPOSITIVO: payload.dispositivo,
      MODELO: payload.modelo,
      FALLA_REPORTADA: payload.falla,
      FECHA_PROMESA: payload.fechaPromesa,
      COSTO_ESTIMADO: payload.costo,
      ESTADO: 'Recibido',
      SEGUIMIENTO_CLIENTE: '',
      NOTAS_INTERNAS: payload.notas,
      CASO_RESOLUCION_TECNICA: '',
      YOUTUBE_ID: '',
      FOTO_RECEPCION: payload.fotoRecepcion,
      CHECK_CARGADOR: checkToText(payload.checkCargador),
      CHECK_PANTALLA: checkToText(payload.checkPantalla),
      CHECK_PRENDE: checkToText(payload.checkPrende),
      CHECK_RESPALDO: checkToText(payload.checkRespaldo),
      FECHA_ULTIMA_ACTUALIZACION: now,
      FECHA_ENTREGA: '',
      PAGO_REGISTRADO_AT: '',
      PAGO_REGISTRADO_ID: '',
      SUCURSAL_ID: payload.sucursalId,
      FOLIO_SOLICITUD_ORIGEN: payload.folioSolicitudOrigen
    };

    Repository_appendEquipo(record);
    return jsonResponse({ success: true, folio: folio, equipo: normalizarEquipoForApi(record) });
  }, 12000);
}

function Service_getEquipoByFolio(folio) {
  const equipo = Repository_findEquipoByFolio(folio);
  if (!equipo) return jsonResponse({ error: 'No encontrado' });
  return jsonResponse({ equipo: normalizarEquipoForApi(equipo) });
}

function _registrarPagoSiAplica(equipoAntes, equipoDespues, ahoraIso) {
  const antesEstado = String(_getField(equipoAntes, ['ESTADO'], '') || '').trim().toLowerCase();
  const despuesEstado = String(_getField(equipoDespues, ['ESTADO'], '') || '').trim().toLowerCase();
  const folio = String(_getField(equipoDespues, ['FOLIO'], '') || '').trim().toUpperCase();
  if (!folio) return null;
  if (antesEstado === 'entregado' || despuesEstado !== 'entregado') return null;

  const monto = _toMoney(_getField(equipoDespues, ['COSTO_ESTIMADO', 'PRECIO', 'COSTO'], 0));
  if (monto <= 0) return null;

  const existente = Repository_findPagoClienteByFolio(folio);
  if (existente) return existente;

  const pago = {
    ID: _ensureNextId(Repository_readPagosClientesTable()),
    FOLIO_EQUIPO: folio,
    FECHA_PAGO: ahoraIso,
    CLIENTE_NOMBRE: String(_getField(equipoDespues, ['CLIENTE_NOMBRE'], '') || '').trim(),
    CLIENTE_TELEFONO: normalizarTelefono(_getField(equipoDespues, ['CLIENTE_TELEFONO'], '')),
    MONTO: monto,
    METODO_PAGO: 'Entrega',
    NOTAS: 'Ingreso registrado al entregar equipo',
    SUCURSAL_ID: normalizarSucursalId(_getField(equipoDespues, ['SUCURSAL_ID'], 'GLOBAL')),
    FUENTE: 'entrega_equipo',
    CREADO_EN: ahoraIso
  };

  Repository_appendPagoCliente(pago);
  return pago;
}

function Service_actualizarEquipo(data) {
  return withDocumentLock(function() {
    const folio = String(data && data.folio || '').trim().toUpperCase();
    if (!folio) return jsonResponse({ error: 'folio requerido' });
    const table = Repository_readEquiposTable();
    const equipoActual = Repository_findEquipoByFolio(folio);
    if (!equipoActual) return jsonResponse({ error: 'No encontrado' });

    const payload = validarPayloadEquipo(data || {}, true);
    if (!payload.ok) return jsonResponse({ error: payload.error });

    const ahora = new Date().toISOString();
    const campos = Object.assign({}, data.campos || {});
    const next = Object.assign({}, equipoActual);
    const costoAntes = _toMoney(_getField(equipoActual, ['COSTO_ESTIMADO'], 0));
    const estadoAntes = String(_getField(equipoActual, ['ESTADO'], '') || '').trim().toLowerCase();

    if (payload.payload.clienteNombre) next.CLIENTE_NOMBRE = payload.payload.clienteNombre;
    if (payload.payload.clienteTelefono) next.CLIENTE_TELEFONO = payload.payload.clienteTelefono;
    if (payload.payload.clienteEmail !== '') next.CLIENTE_EMAIL = payload.payload.clienteEmail;
    if (payload.payload.dispositivo) next.DISPOSITIVO = payload.payload.dispositivo;
    if (payload.payload.modelo !== '') next.MODELO = payload.payload.modelo;
    if (payload.payload.falla !== '') next.FALLA_REPORTADA = payload.payload.falla;
    if (payload.payload.fechaPromesa !== '') next.FECHA_PROMESA = payload.payload.fechaPromesa;
    if (payload.payload.costo !== undefined) next.COSTO_ESTIMADO = payload.payload.costo;
    if (payload.payload.notas !== '') next.NOTAS_INTERNAS = payload.payload.notas;
    if (payload.payload.fotoRecepcion !== '') next.FOTO_RECEPCION = payload.payload.fotoRecepcion;
    if (payload.payload.sucursalId) next.SUCURSAL_ID = payload.payload.sucursalId;
    if (payload.payload.folioSolicitudOrigen !== '') next.FOLIO_SOLICITUD_ORIGEN = payload.payload.folioSolicitudOrigen;

    ['ESTADO', 'TECNICO_ASIGNADO', 'YOUTUBE_ID', 'NOTAS_INTERNAS', 'SEGUIMIENTO_CLIENTE', 'CASO_RESOLUCION_TECNICA', 'FECHA_PROMESA', 'DISPOSITIVO', 'MODELO', 'COSTO_ESTIMADO', 'FOTO_RECEPCION'].forEach(function(field) {
      if (campos[field] !== undefined) {
        next[field] = campos[field];
      }
    });

    if (campos.CHECK_CARGADOR !== undefined) next.CHECK_CARGADOR = campos.CHECK_CARGADOR;
    if (campos.CHECK_PANTALLA !== undefined) next.CHECK_PANTALLA = campos.CHECK_PANTALLA;
    if (campos.CHECK_PRENDE !== undefined) next.CHECK_PRENDE = campos.CHECK_PRENDE;
    if (campos.CHECK_RESPALDO !== undefined) next.CHECK_RESPALDO = campos.CHECK_RESPALDO;

    const estadoPrevio = String(equipoActual.ESTADO || '').trim();
    const estadoNuevo = String(next.ESTADO || estadoPrevio || 'Recibido').trim();
    const costoDespues = _toMoney(_getField(next, ['COSTO_ESTIMADO'], 0));
    next.ESTADO = estadoNuevo || 'Recibido';
    next.FECHA_ULTIMA_ACTUALIZACION = ahora;

    if (String(estadoNuevo).toLowerCase() === 'entregado') {
      next.FECHA_ENTREGA = next.FECHA_ENTREGA || ahora;
    }

    const pago = _registrarPagoSiAplica(equipoActual, next, ahora);
    if (pago) {
      next.PAGO_REGISTRADO_AT = ahora;
      next.PAGO_REGISTRADO_ID = String(pago.ID || '');
    }

    const ok = Repository_updateEquipoByFolio(folio, next);
    if (!ok) return jsonResponse({ error: 'No encontrado' });

    return jsonResponse({
      success: true,
      folio: folio,
      equipo: normalizarEquipoForApi(next),
      pagoRegistrado: !!pago
    });
  }, 12000);
}

function getSemaforoData(paginacion) {
  const p = parsePaginacion(paginacion || {});
  const table = Repository_readEquiposTable();
  const headers = table.headers || [];
  const rows = table.rows || [];
  if (!headers.length || !rows.length) {
    return jsonResponse({ equipos: [], urgentes: 0, atencion: 0, aTiempo: 0, total: 0, page: p.page, pageSize: p.pageSize, hasMore: false });
  }

  const equipos = rows.map(function(row) {
    return normalizarEquipoForApi(mapearFila(headers, row));
  }).filter(function(eq) {
    return String(eq.ESTADO || '').trim().toLowerCase() !== 'entregado';
  }).sort(function(a, b) {
    const da = Number(a.diasRestantes || 0);
    const db = Number(b.diasRestantes || 0);
    return da - db || String(a.FOLIO || '').localeCompare(String(b.FOLIO || ''));
  });

  const urgentes = equipos.filter(function(eq) { return Number(eq.diasRestantes || 0) <= 2; }).length;
  const atencion = equipos.filter(function(eq) { return Number(eq.diasRestantes || 0) > 2 && Number(eq.diasRestantes || 0) <= 4; }).length;
  const aTiempo = equipos.filter(function(eq) { return Number(eq.diasRestantes || 0) > 4; }).length;

  const paginada = paginarArreglo(equipos, p.page, p.pageSize);
  return jsonResponse({
    equipos: paginada.data,
    urgentes: urgentes,
    atencion: atencion,
    aTiempo: aTiempo,
    total: equipos.length,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function _sumBy(rows, field) {
  return (rows || []).reduce(function(acc, row) {
    return acc + _toMoney(row[field]);
  }, 0);
}

function _groupByMonth(records, dateField, amountField) {
  const groups = {};
  (records || []).forEach(function(row) {
    const d = _safeDate(row[dateField]);
    if (!d) return;
    const key = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM');
    if (!groups[key]) groups[key] = { key: key, ingresos: 0, egresos: 0 };
    groups[key][amountField] += _toMoney(row.amount || row.MONTO || row.COSTO_ESTIMADO || 0);
  });
  return Object.keys(groups).sort().map(function(key) {
    const item = groups[key];
    return {
      mes: key,
      ingresos: _toMoney(item.ingresos),
      egresos: _toMoney(item.egresos),
      utilidad: _toMoney(item.ingresos - item.egresos)
    };
  });
}

function resumenGastos(data) {
  const input = data || {};
  const fechaDesde = parseFechaFiltro(input.fechaDesde || '');
  const fechaHasta = parseFechaFiltro(input.fechaHasta || '');
  const sucursalId = normalizarSucursalId(input.sucursalId || 'GLOBAL');
  const gastosTable = Repository_readGastosTable();
  const headers = gastosTable.headers || [];
  const rows = gastosTable.rows || [];
  const gastos = rows.map(function(row) { return mapearFila(headers, row); }).filter(function(gasto) {
    if (sucursalId !== 'GLOBAL' && normalizarSucursalId(gasto.SUCURSAL_ID) !== sucursalId) return false;
    const fecha = parseFechaFlexible(gasto.FECHA || gasto.ExpenseDate || gasto.expense_date || '');
    if ((fechaDesde || fechaHasta) && !cumpleRango(fecha, fechaDesde, fechaHasta)) return false;
    return true;
  });

  const total = _sumBy(gastos, 'MONTO');
  const porCategoria = {};
  gastos.forEach(function(gasto) {
    const cat = String(gasto.CATEGORIA || 'Sin categoría').trim();
    porCategoria[cat] = (porCategoria[cat] || 0) + _toMoney(gasto.MONTO);
  });

  return {
    kpis: {
      total: total,
      conteo: gastos.length
    },
    resumenCategorias: Object.keys(porCategoria).sort(function(a, b) { return porCategoria[b] - porCategoria[a]; }).map(function(categoria) {
      return { categoria: categoria, total: _toMoney(porCategoria[categoria]) };
    }),
    gastos: gastos
  };
}

function resumenFinanzas(data) {
  const input = data || {};
  const fechaDesde = parseFechaFiltro(input.fechaDesde || '');
  const fechaHasta = parseFechaFiltro(input.fechaHasta || '');
  const sucursalId = normalizarSucursalId(input.sucursalId || 'GLOBAL');
  const pagosTable = Repository_readPagosClientesTable();
  const gastosTable = Repository_readGastosTable();
  const equiposTable = Repository_readEquiposTable();

  const pagos = (pagosTable.rows || []).map(function(row) { return mapearFila(pagosTable.headers, row); }).filter(function(pago) {
    if (sucursalId !== 'GLOBAL' && normalizarSucursalId(pago.SUCURSAL_ID) !== sucursalId) return false;
    const fecha = parseFechaFlexible(pago.FECHA_PAGO || pago.CREADO_EN || '');
    if ((fechaDesde || fechaHasta) && !cumpleRango(fecha, fechaDesde, fechaHasta)) return false;
    return true;
  });

  const gastos = (gastosTable.rows || []).map(function(row) { return mapearFila(gastosTable.headers, row); }).filter(function(gasto) {
    if (sucursalId !== 'GLOBAL' && normalizarSucursalId(gasto.SUCURSAL_ID) !== sucursalId) return false;
    const fecha = parseFechaFlexible(gasto.FECHA || gasto.FECHA_CREACION || '');
    if ((fechaDesde || fechaHasta) && !cumpleRango(fecha, fechaDesde, fechaHasta)) return false;
    return true;
  });

  const equipos = (equiposTable.rows || []).map(function(row) { return normalizarEquipoForApi(mapearFila(equiposTable.headers, row)); }).filter(function(eq) {
    if (sucursalId !== 'GLOBAL' && normalizarSucursalId(eq.SUCURSAL_ID) !== sucursalId) return false;
    const fecha = parseFechaFlexible(eq.FECHA_INGRESO || '');
    if ((fechaDesde || fechaHasta) && !cumpleRango(fecha, fechaDesde, fechaHasta)) return false;
    return true;
  });

  const ingresos = _sumBy(pagos, 'MONTO');
  const egresos = _sumBy(gastos, 'MONTO');
  const utilidad = ingresos - egresos;
  const ordenesEntregadas = equipos.filter(function(eq) { return String(eq.ESTADO || '').trim().toLowerCase() === 'entregado'; }).length;
  const cuentasPorCobrar = equipos.reduce(function(acc, eq) {
    const estado = String(eq.ESTADO || '').trim().toLowerCase();
    if (estado === 'entregado') return acc;
    return acc + _toMoney(eq.COSTO_ESTIMADO);
  }, 0);
  const ticketPromedio = pagos.length ? ingresos / pagos.length : 0;
  const cotizacionesConvertidas = ordenesEntregadas;
  const anticiposPendientes = 0;

  const meses = {};
  pagos.forEach(function(pago) {
    const fecha = parseFechaFlexible(pago.FECHA_PAGO || pago.CREADO_EN || '');
    if (!fecha) return;
    const key = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM');
    if (!meses[key]) meses[key] = { ingresos: 0, egresos: 0 };
    meses[key].ingresos += _toMoney(pago.MONTO);
  });
  gastos.forEach(function(gasto) {
    const fecha = parseFechaFlexible(gasto.FECHA || gasto.FECHA_CREACION || '');
    if (!fecha) return;
    const key = Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM');
    if (!meses[key]) meses[key] = { ingresos: 0, egresos: 0 };
    meses[key].egresos += _toMoney(gasto.MONTO);
  });

  const comparativoMensual = Object.keys(meses).sort().map(function(mes) {
    const item = meses[mes];
    return {
      mes: mes,
      ingresos: _toMoney(item.ingresos),
      egresos: _toMoney(item.egresos),
      utilidad: _toMoney(item.ingresos - item.egresos)
    };
  });

  const porCategoria = {};
  gastos.forEach(function(gasto) {
    const categoria = String(gasto.CATEGORIA || 'Sin categoría').trim();
    porCategoria[categoria] = (porCategoria[categoria] || 0) + _toMoney(gasto.MONTO);
  });

  return {
    kpis: {
      ingresos: ingresos,
      egresos: egresos,
      utilidadBruta: utilidad,
      ticketPromedio: ticketPromedio,
      ordenesEntregadas: ordenesEntregadas,
      cotizacionesConvertidas: cotizacionesConvertidas,
      cuentasPorCobrar: cuentasPorCobrar,
      anticiposPendientes: anticiposPendientes
    },
    comparativoMensual: comparativoMensual,
    resumenCategorias: Object.keys(porCategoria).sort(function(a, b) { return porCategoria[b] - porCategoria[a]; }).map(function(categoria) {
      return { categoria: categoria, total: _toMoney(porCategoria[categoria]) };
    })
  };
}
