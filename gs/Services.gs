/**
 * Services - capa de negocio desacoplada del transporte.
 * Inicio de migración; delega a lógica legacy existente.
 */

function Service_getStatus() {
  return { status: 'online', version: CONFIG.API_VERSION, storage: 'google_sheets' };
}

function Service_loginInterno(data) {
  return loginInterno(data || {});
}

function Service_obtenerConfigSeguridad() {
  return Security_getConfig();
}

function Service_guardarConfigSeguridad(data) {
  return Security_saveConfigAction(data || {});
}

function Service_listarUsuariosInternos() {
  return Security_listUsers();
}

function Service_guardarUsuarioInterno(data) {
  const auth = Security_requireAdminPassword(data || {}, 'Guardar usuario interno');
  if (!auth.ok) return jsonResponse({ error: auth.error });
  return Security_upsertUser(data || {});
}

function Service_validarAdminPassword(data) {
  return Security_validateAdminPasswordAction(data || {});
}

function Service_getDashboardSummary(data) {
  if (typeof getDashboardSummary === 'function') return getDashboardSummary(data || {});
  return { error: 'Servicio HUB no disponible' };
}

function Service_getOperationalPanel(data) {
  if (typeof getOperationalPanel === 'function') return getOperationalPanel(data || {});
  return { error: 'Servicio HUB no disponible' };
}

function Service_getTechnicianPanel(data) {
  if (typeof getTechnicianPanel === 'function') return getTechnicianPanel(data && data.technicianId);
  return { error: 'Servicio HUB no disponible' };
}

function Service_getClientPanel(data) {
  if (typeof getClientPanel === 'function') return getClientPanel(data && data.clientId);
  return { error: 'Servicio HUB no disponible' };
}

function Service_crearSolicitud(data) {
  return withDocumentLock(function() {
    const payload = validarPayloadCrearSolicitud(data || {});
    const folioCotizacion = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_COTIZACION_SEQ, 'COT-');
    const ahora = new Date().toISOString();

    Repository_appendSolicitud({
      folioCotizacion: folioCotizacion,
      fechaSolicitud: ahora,
      nombre: payload.nombre,
      telefono: payload.telefono,
      email: payload.email,
      dispositivo: payload.dispositivo,
      modelo: payload.modelo,
      problemas: Array.isArray(payload.problemas) ? payload.problemas.join(', ') : payload.problemas,
      descripcion: payload.descripcion,
      urgencia: payload.urgencia,
      estado: 'pendiente',
      fechaCotizacion: '',
      cotizacionJson: '',
      cotizacionTotal: 0,
      folioCotizacionManual: '',
      sucursalId: normalizarSucursalId(data && data.sucursalId),
      solicitudOrigenIp: data && data.solicitud_origen_ip ? data.solicitud_origen_ip : '0.0.0.0'
    });

    return jsonResponse({ success: true, folio: folioCotizacion });
  }, 12000);
}

function Service_getSolicitudByFolio(folio) {
  const target = String(folio || '').trim().toUpperCase();
  if (!target) return jsonResponse({ error: 'Folio requerido' });

  const solicitud = Repository_findSolicitudByFolio(target);
  if (!solicitud) return jsonResponse({ error: 'No encontrada' });

  solicitud.FOLIO_COTIZACION = String(solicitud.FOLIO_COTIZACION || '').trim().toUpperCase();
  solicitud.TELEFONO = normalizarTelefono(solicitud.TELEFONO || '');
  solicitud.FECHA_SOLICITUD = formatearFechaYMDOrEmpty(solicitud.FECHA_SOLICITUD || '');
  solicitud.FECHA_COTIZACION = formatearFechaYMDOrEmpty(solicitud.FECHA_COTIZACION || '');
  return jsonResponse({ solicitud: solicitud });
}

function Service_listarSolicitudes(params) {
  const table = Repository_readSolicitudesTable();
  const headers = table.headers || [];
  const rows = table.rows || [];
  const p = parsePaginacion(params || {});

  if (!headers.length || !rows.length) {
    return jsonResponse({
      solicitudes: [],
      total: 0,
      page: p.page,
      pageSize: p.pageSize,
      hasMore: false
    });
  }

  const solicitudes = rows.map(function(row) {
    const obj = mapearFila(headers, row);
    obj.TELEFONO = normalizarTelefono(obj.TELEFONO);
    obj.FECHA_SOLICITUD = formatearFechaYMDOrEmpty(obj.FECHA_SOLICITUD || '');
    obj.FECHA_COTIZACION = formatearFechaYMDOrEmpty(obj.FECHA_COTIZACION || '');
    return obj;
  }).filter(function(item) {
    return String(item.ESTADO || '').toLowerCase() === 'pendiente';
  });

  const paginada = paginarArreglo(solicitudes, p.page, p.pageSize);
  return jsonResponse({
    solicitudes: paginada.data,
    total: paginada.total,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function Service_archivarSolicitud(data) {
  return withDocumentLock(function() {
    const folio = String(data && data.folio || '').trim();
    if (!folio) return jsonResponse({ error: 'Folio requerido' });

    const ok = Repository_updateSolicitudEstado(folio, 'archivado');
    if (!ok) return jsonResponse({ error: 'No encontrada' });
    return jsonResponse({ success: true });
  }, 12000);
}

function Service_archivarCotizacion(data) {
  return withDocumentLock(function() {
    const folio = String(data && data.folio || '').trim().toUpperCase();
    if (!folio) return jsonResponse({ error: 'Folio requerido' });

    const cotizacion = data && data.cotizacion && typeof data.cotizacion === 'object' ? data.cotizacion : {};
    const folioCotizacionManual = String(data && data.folioCotizacionManual || '').trim().toUpperCase();
    const ok = Repository_updateSolicitudCotizacion(folio, cotizacion, folioCotizacionManual);
    if (!ok) return jsonResponse({ error: 'No encontrada' });
    return jsonResponse({
      success: true,
      folio: folio,
      folioCotizacionManual: folioCotizacionManual
    });
  }, 12000);
}

function _archivoParseJson(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    return null;
  }
}

function _archivoText(value) {
  return String(value || '').trim();
}

function _archivoBuildSolicitudRecord(item) {
  const cotizacionJson = _archivoText(item.COTIZACION_JSON);
  const cotizacion = _archivoParseJson(cotizacionJson);
  const tieneCotizacion = !!cotizacionJson || Number(item.COTIZACION_TOTAL || 0) > 0 || _archivoText(item.FECHA_COTIZACION);
  const fechaArchivo = _archivoText(item.FECHA_COTIZACION) || _archivoText(item.FECHA_SOLICITUD);
  const detalle = _archivoText(item.DESCRIPCION) || _archivoText(item.PROBLEMAS) || _archivoText(item.URGENCIA);
  const notas = cotizacion && cotizacion.notas ? _archivoText(cotizacion.notas) : '';
  const total = Number(item.COTIZACION_TOTAL || (cotizacion && cotizacion.total) || 0);

  return {
    TIPO_ARCHIVO: tieneCotizacion ? 'cotizacion' : 'solicitud',
    FECHA_ARCHIVO: formatearFechaYMDOrEmpty(fechaArchivo),
    FOLIO: _archivoText(item.FOLIO_COTIZACION).toUpperCase(),
    CLIENTE: _archivoText(item.NOMBRE),
    TELEFONO: normalizarTelefono(item.TELEFONO || ''),
    EMAIL: _archivoText(item.EMAIL),
    DETALLE: detalle,
    TOTAL: total,
    ESTADO: _archivoText(item.ESTADO),
    NOTAS: notas,
    DESCRIPCION: _archivoText(item.DESCRIPCION),
    PROBLEMAS: _archivoText(item.PROBLEMAS),
    URGENCIA: _archivoText(item.URGENCIA),
    FECHA_SOLICITUD: formatearFechaYMDOrEmpty(item.FECHA_SOLICITUD || ''),
    FECHA_COTIZACION: formatearFechaYMDOrEmpty(item.FECHA_COTIZACION || ''),
    COTIZACION_JSON: cotizacionJson,
    FOLIO_COTIZACION_MANUAL: _archivoText(item.FOLIO_COTIZACION_MANUAL).toUpperCase(),
    raw: item
  };
}

function _archivoBuildEquipoRecord(item) {
  const fechaArchivo = _archivoText(item.FECHA_ENTREGA) || _archivoText(item.FECHA_ULTIMA_ACTUALIZACION) || _archivoText(item.FECHA_INGRESO);
  const detalle = _archivoText(item.DISPOSITIVO) + (_archivoText(item.MODELO) ? ' ' + _archivoText(item.MODELO) : '');
  return {
    TIPO_ARCHIVO: 'equipos',
    FECHA_ARCHIVO: formatearFechaYMDOrEmpty(fechaArchivo),
    FOLIO: _archivoText(item.FOLIO).toUpperCase(),
    CLIENTE: _archivoText(item.CLIENTE_NOMBRE),
    TELEFONO: normalizarTelefono(item.CLIENTE_TELEFONO || ''),
    EMAIL: _archivoText(item.CLIENTE_EMAIL),
    DETALLE: detalle.trim() || _archivoText(item.FALLA_REPORTADA),
    TOTAL: Number(item.COSTO_ESTIMADO || 0),
    ESTADO: _archivoText(item.ESTADO),
    NOTAS: _archivoText(item.NOTAS_INTERNAS),
    DESCRIPCION: _archivoText(item.FALLA_REPORTADA),
    PROBLEMAS: _archivoText(item.FALLA_REPORTADA),
    DISPOSITIVO: _archivoText(item.DISPOSITIVO),
    MODELO: _archivoText(item.MODELO),
    FECHA_INGRESO: formatearFechaYMDOrEmpty(item.FECHA_INGRESO || ''),
    FECHA_ENTREGA: formatearFechaYMDOrEmpty(item.FECHA_ENTREGA || ''),
    FECHA_ULTIMA_ACTUALIZACION: formatearFechaYMDOrEmpty(item.FECHA_ULTIMA_ACTUALIZACION || ''),
    SEGUIMIENTO_CLIENTE: _archivoText(item.SEGUIMIENTO_CLIENTE),
    CASO_RESOLUCION_TECNICA: _archivoText(item.CASO_RESOLUCION_TECNICA),
    FOTO_RECEPCION: _archivoText(item.FOTO_RECEPCION),
    CHECK_CARGADOR: _archivoText(item.CHECK_CARGADOR),
    CHECK_PANTALLA: _archivoText(item.CHECK_PANTALLA),
    CHECK_PRENDE: _archivoText(item.CHECK_PRENDE),
    CHECK_RESPALDO: _archivoText(item.CHECK_RESPALDO),
    raw: item
  };
}

function _archivoCumpleFiltro(itemTipo, tipoFiltro) {
  const filtro = String(tipoFiltro || 'todos').trim().toLowerCase();
  if (!filtro || filtro === 'todos') return true;
  const tipo = String(itemTipo || '').trim().toLowerCase();
  if (filtro === 'solicitudes') return tipo === 'solicitud';
  if (filtro === 'cotizaciones') return tipo === 'cotizacion';
  if (filtro === 'equipos') return tipo === 'equipos';
  return tipo === filtro;
}

function _archivoOrdenar(items) {
  return (items || []).slice().sort(function(a, b) {
    return String(b.FECHA_ARCHIVO || b.FECHA_ENTREGA || b.FECHA_ULTIMA_ACTUALIZACION || b.FECHA_COTIZACION || b.FECHA_SOLICITUD || '').localeCompare(String(a.FECHA_ARCHIVO || a.FECHA_ENTREGA || a.FECHA_ULTIMA_ACTUALIZACION || a.FECHA_COTIZACION || a.FECHA_SOLICITUD || ''));
  });
}

function Service_listarArchivo(data) {
  const input = data || {};
  const p = parsePaginacion(input);
  const tipo = String(input.tipo || 'todos').trim().toLowerCase();
  const fechaDesde = parseFechaFiltro(input.from || input.fechaDesde || '');
  const fechaHasta = parseFechaFiltro(input.to || input.fechaHasta || '');
  const registros = [];

  const solicitudesTable = Repository_readSolicitudesTable();
  (solicitudesTable.rows || []).forEach(function(row) {
    const item = mapearFila(solicitudesTable.headers || [], row);
    if (String(item.ESTADO || '').trim().toLowerCase() !== 'archivado') return;
    const registro = _archivoBuildSolicitudRecord(item);
    if (!_archivoCumpleFiltro(registro.TIPO_ARCHIVO, tipo)) return;
    const fecha = parseFechaFlexible(registro.FECHA_ARCHIVO || registro.FECHA_COTIZACION || registro.FECHA_SOLICITUD || '');
    if ((fechaDesde || fechaHasta) && !cumpleRango(fecha, fechaDesde, fechaHasta)) return;
    registros.push(registro);
  });

  const equiposTable = Repository_readEquiposTable();
  (equiposTable.rows || []).forEach(function(row) {
    const item = mapearFila(equiposTable.headers || [], row);
    if (String(item.ESTADO || '').trim().toLowerCase() !== 'entregado') return;
    const registro = _archivoBuildEquipoRecord(item);
    if (!_archivoCumpleFiltro(registro.TIPO_ARCHIVO, tipo)) return;
    const fecha = parseFechaFlexible(registro.FECHA_ARCHIVO || registro.FECHA_ENTREGA || registro.FECHA_ULTIMA_ACTUALIZACION || '');
    if ((fechaDesde || fechaHasta) && !cumpleRango(fecha, fechaDesde, fechaHasta)) return;
    registros.push(registro);
  });

  const ordenados = _archivoOrdenar(registros);
  const paginada = paginarArreglo(ordenados, p.page, p.pageSize);

  return jsonResponse({
    archivo: paginada.data.map(function(item) {
      return {
        TIPO_ARCHIVO: item.TIPO_ARCHIVO,
        FECHA_ARCHIVO: item.FECHA_ARCHIVO,
        FOLIO: item.FOLIO,
        CLIENTE: item.CLIENTE,
        TELEFONO: item.TELEFONO,
        DETALLE: item.DETALLE,
        TOTAL: item.TOTAL,
        ESTADO: item.ESTADO
      };
    }),
    total: paginada.total,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function Service_getArchivoDetalle(data) {
  const input = data || {};
  let tipo = String(input.tipo || '').trim().toLowerCase();
  const folio = String(input.folio || '').trim().toUpperCase();
  if (!tipo) return jsonResponse({ error: 'Tipo requerido' });
  if (!folio) return jsonResponse({ error: 'Folio requerido' });

  if (tipo === 'solicitudes') tipo = 'solicitud';
  if (tipo === 'cotizaciones') tipo = 'cotizacion';
  if (tipo === 'equipos entregados') tipo = 'equipos';

  if (tipo === 'equipos') {
    const equipo = Repository_findEquipoByFolio(folio);
    if (!equipo || String(equipo.ESTADO || '').trim().toLowerCase() !== 'entregado') {
      return jsonResponse({ error: 'No encontrado' });
    }
    return jsonResponse({
      registro: _archivoBuildEquipoRecord(normalizarEquipoForApi(equipo)),
      raw: normalizarEquipoForApi(equipo),
      reabrible: false
    });
  }

  const solicitud = Repository_findSolicitudByFolio(folio);
  if (!solicitud || String(solicitud.ESTADO || '').trim().toLowerCase() !== 'archivado') {
    return jsonResponse({ error: 'No encontrada' });
  }
  const registro = _archivoBuildSolicitudRecord(solicitud);
  return jsonResponse({
    registro: registro,
    raw: solicitud,
    reabrible: true
  });
}

function Service_reabrirArchivo(data) {
  return withDocumentLock(function() {
    const input = data || {};
    let tipo = String(input.tipo || '').trim().toLowerCase();
    const folio = String(input.folio || '').trim().toUpperCase();
    if (!tipo) return jsonResponse({ error: 'Tipo requerido' });
    if (!folio) return jsonResponse({ error: 'Folio requerido' });

    if (tipo === 'solicitudes') tipo = 'solicitud';
    if (tipo === 'cotizaciones') tipo = 'cotizacion';

    const auth = Security_requireAdminPassword(input, 'Reabrir archivo');
    if (!auth.ok) return jsonResponse({ error: auth.error });

    if (tipo === 'equipos') {
      return jsonResponse({ error: 'Los equipos entregados no se reabren desde archivo' });
    }

    const ok = Repository_updateSolicitudEstado(folio, 'pendiente');
    if (!ok) return jsonResponse({ error: 'No encontrada' });
    return jsonResponse({ success: true, folio: folio });
  }, 12000);
}

function Service_listarTareas(params) {
  const p = parsePaginacion(params || {});
  const texto = String(params && params.texto || '').trim().toLowerCase();
  const estado = String(params && params.estado || '').trim().toLowerCase();
  const prioridad = String(params && params.prioridad || '').trim().toLowerCase();
  const responsable = String(params && params.responsable || '').trim().toLowerCase();
  const hasFilters = !!(texto || estado || prioridad || responsable || (params && params.fechaDesde) || (params && params.fechaHasta) || (params && params.sucursalId) || (params && params.tipoRelacion));

  const table = hasFilters
    ? Repository_readTareasTable()
    : Repository_readPage('Tareas', p.page, p.pageSize);
  const headers = table.headers || [];
  const rows = table.rows || [];

  if (!headers.length || !rows.length) {
    return jsonResponse({
      tareas: [],
      total: 0,
      page: p.page,
      pageSize: p.pageSize,
      hasMore: false
    });
  }

  const tareas = rows.map(function(row) {
    return Utils_normalizeEntity('tarea', mapearFila(headers, row));
  }).filter(function(item) {
    if (estado && String(item.ESTADO || '').toLowerCase() !== estado) return false;
    if (prioridad && String(item.PRIORIDAD || '').toLowerCase() !== prioridad) return false;
    if (responsable && String(item.RESPONSABLE || '').toLowerCase() !== responsable) return false;
    if (texto) {
      const hay = [item.FOLIO_TAREA, item.TITULO, item.DESCRIPCION, item.RESPONSABLE, item.NOTAS]
        .some(function(v) { return String(v || '').toLowerCase().indexOf(texto) >= 0; });
      if (!hay) return false;
    }
    return true;
  });

  const paginada = hasFilters ? paginarArreglo(tareas, p.page, p.pageSize) : {
    data: tareas,
    total: table.total,
    page: table.page,
    pageSize: table.pageSize,
    hasMore: table.hasMore
  };
  return jsonResponse({
    tareas: paginada.data,
    total: paginada.total,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function Service_getTareaByFolio(folio) {
  const task = Repository_findTareaByFolio(folio);
  if (!task) return jsonResponse({ error: 'No encontrado' });
  return jsonResponse({ tarea: Utils_normalizeEntity('tarea', task) });
}

function Service_crearTarea(data) {
  return withDocumentLock(function() {
    const payload = validarPayloadTarea(data || {}, false);
    const table = Repository_readTareasTable();
    const folio = obtenerSiguienteFolio(CONFIG.SCRIPT_PROP_KEYS.FOLIO_TAREA_SEQ, 'TAR-');
    const id = Math.max(0, table.rows.length) + 1;
    const nowIso = new Date().toISOString();
    const historial = JSON.stringify([{
      fecha: nowIso,
      evento: 'creada',
      detalle: 'Tarea creada'
    }]);

    Repository_appendTarea([
      id,
      folio,
      nowIso,
      payload.titulo,
      payload.descripcion,
      payload.estado,
      payload.prioridad,
      payload.responsable,
      payload.fechaLimite || '',
      payload.tipoRelacion,
      payload.folioRelacionado,
      payload.notas,
      historial,
      nowIso,
      normalizarSucursalId(data && data.sucursalId)
    ]);

    return jsonResponse({ success: true, folio: folio, id: id });
  }, 10000);
}

function Service_actualizarTarea(data) {
  const folio = String(data && data.folio || '').trim().toUpperCase();
  if (!folio) return jsonResponse({ error: 'folio requerido' });

  return withDocumentLock(function() {
    const payload = validarPayloadTarea(data || {}, true);
    const table = Repository_readTareasTable();
    const headers = table.headers || [];
    const idxFolio = headers.indexOf('FOLIO_TAREA');
    if (idxFolio < 0) return jsonResponse({ error: 'No encontrado' });

    const rowIndex = table.rows.findIndex(function(row) {
      return String(row[idxFolio] || '').trim().toUpperCase() === folio;
    });
    if (rowIndex < 0) return jsonResponse({ error: 'No encontrado' });

    const row = table.rows[rowIndex].slice();
    const current = Utils_normalizeEntity('tarea', mapearFila(headers, row));
    let historial = current.HISTORIAL || [];

    const mapping = {
      titulo: 'TITULO',
      descripcion: 'DESCRIPCION',
      estado: 'ESTADO',
      prioridad: 'PRIORIDAD',
      responsable: 'RESPONSABLE',
      fechaLimite: 'FECHA_LIMITE',
      tipoRelacion: 'TIPO_RELACION',
      folioRelacionado: 'FOLIO_RELACIONADO',
      notas: 'NOTAS'
    };

    const cambios = [];
    Object.keys(mapping).forEach(function(key) {
      if (data[key] === undefined) return;
      const field = mapping[key];
      const prev = current[field] || '';
      const next = payload[key] !== undefined ? payload[key] : '';
      if (String(prev) === String(next)) return;
      const col = headers.indexOf(field);
      if (col >= 0) row[col] = next;
      cambios.push({
        fecha: new Date().toISOString(),
        campo: field,
        anterior: prev,
        nuevo: next
      });
    });

    if (cambios.length) {
      historial = historial.concat(cambios);
      const idxHist = headers.indexOf('HISTORIAL');
      if (idxHist >= 0) row[idxHist] = JSON.stringify(historial);
    }

    const idxUpd = headers.indexOf('FECHA_ACTUALIZACION');
    if (idxUpd >= 0) row[idxUpd] = new Date().toISOString();

    const ok = Repository_updateTareaByFolio(folio, row);
    if (!ok) return jsonResponse({ error: 'No encontrado' });
    return jsonResponse({ success: true, folio: folio, cambios: cambios.length });
  }, 10000);
}

function Service_listarProveedores(params) {
  const p = parsePaginacion(params || {});
  const texto = String(params && params.texto || '').trim().toLowerCase();
  const estatus = String(params && params.estatus || '').trim().toLowerCase();
  const categoria = String(params && params.categoria || '').trim().toLowerCase();
  const hasFilters = !!(texto || estatus || categoria);

  const table = hasFilters
    ? Repository_readProveedoresTable()
    : Repository_readPage('Proveedores', p.page, p.pageSize);
  const headers = table.headers || [];
  const rows = table.rows || [];

  if (!headers.length || !rows.length) {
    return jsonResponse({ proveedores: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false, filtros: { categorias: [] } });
  }

  const items = rows.map(function(row) {
    return Utils_normalizeEntity('proveedor', mapearFila(headers, row));
  }).filter(function(prov) {
    if (estatus && prov.ESTATUS !== estatus) return false;
    if (categoria) {
      const cats = String(prov.CATEGORIAS || '').toLowerCase();
      if (cats.indexOf(categoria) === -1) return false;
    }
    if (texto) {
      const hay = [prov.NOMBRE_COMERCIAL, prov.RAZON_SOCIAL, prov.CONTACTO, prov.EMAIL, prov.TELEFONO, prov.CIUDAD_ESTADO]
        .some(function(v) { return String(v || '').toLowerCase().indexOf(texto) >= 0; });
      if (!hay) return false;
    }
    return true;
  });

  const categorias = items
    .map(function(x) { return x.CATEGORIAS; })
    .filter(Boolean)
    .reduce(function(acc, cur) {
      cur.split(',').map(function(v) { return String(v || '').trim(); }).filter(Boolean).forEach(function(v) {
        if (acc.indexOf(v) === -1) acc.push(v);
      });
      return acc;
    }, [])
    .sort();

  const paginada = hasFilters ? paginarArreglo(items, p.page, p.pageSize) : {
    data: items,
    total: table.total,
    page: table.page,
    pageSize: table.pageSize,
    hasMore: table.hasMore
  };
  return jsonResponse({
    proveedores: paginada.data,
    total: paginada.total,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore,
    filtros: { categorias: categorias }
  });
}

function Service_getProveedorById(id) {
  const prov = Repository_findProveedorById(id);
  if (!prov) return jsonResponse({ error: 'No encontrado' });
  return jsonResponse({ proveedor: Utils_normalizeEntity('proveedor', prov) });
}

function Service_guardarProveedor(data) {
  return withDocumentLock(function() {
    const id = Number(data && data.id || 0);
    const payload = normalizarProveedorPayload(data || {}, !!id);
    const table = Repository_readProveedoresTable();
    const headers = table.headers || [];
    const now = new Date().toISOString();

    if (id) {
      const idxId = headers.indexOf('ID');
      const rowIndex = table.rows.findIndex(function(r) { return Number(r[idxId] || 0) === id; });
      if (rowIndex < 0) return jsonResponse({ error: 'Proveedor no encontrado' });
      const row = table.rows[rowIndex].slice();
      const mapping = {
        NOMBRE_COMERCIAL: payload.nombreComercial,
        RAZON_SOCIAL: payload.razonSocial,
        CONTACTO: payload.contacto,
        TELEFONO: payload.telefono,
        WHATSAPP: payload.whatsapp,
        EMAIL: payload.email,
        DIRECCION: payload.direccion,
        CIUDAD_ESTADO: payload.ciudadEstado,
        CATEGORIAS: payload.categorias,
        TIEMPO_ENTREGA: payload.tiempoEntrega,
        CONDICIONES_PAGO: payload.condicionesPago,
        CALIFICACION_PRECIO: payload.calificacionPrecio,
        CALIFICACION_RAPIDEZ: payload.calificacionRapidez,
        CALIFICACION_CALIDAD: payload.calificacionCalidad,
        CALIFICACION_CONFIABILIDAD: payload.calificacionConfiabilidad,
        NOTAS: payload.notas,
        ESTATUS: payload.estatus,
        FECHA_ACTUALIZACION: now
      };
      Object.keys(mapping).forEach(function(key) {
        const col = headers.indexOf(key);
        if (col >= 0) row[col] = mapping[key];
      });
      const ok = Repository_updateProveedorById(id, row);
      if (!ok) return jsonResponse({ error: 'Proveedor no encontrado' });
      return jsonResponse({ success: true, id: id, actualizado: true });
    }

    const nextId = Math.max(0, table.rows.length) + 1;
    Repository_appendProveedor([
      nextId,
      payload.nombreComercial,
      payload.razonSocial,
      payload.contacto,
      payload.telefono,
      payload.whatsapp,
      payload.email,
      payload.direccion,
      payload.ciudadEstado,
      payload.categorias,
      payload.tiempoEntrega,
      payload.condicionesPago,
      payload.calificacionPrecio,
      payload.calificacionRapidez,
      payload.calificacionCalidad,
      payload.calificacionConfiabilidad,
      payload.notas,
      payload.estatus,
      now,
      now
    ]);
    return jsonResponse({ success: true, id: nextId, actualizado: false });
  }, 10000);
}

function Service_eliminarProveedor(data) {
  return withDocumentLock(function() {
    const id = Number(data && data.id || 0);
    if (!id) return jsonResponse({ error: 'id requerido' });

    const table = Repository_readProveedoresTable();
    const headers = table.headers || [];
    const idxId = headers.indexOf('ID');
    const rowIndex = table.rows.findIndex(function(r) { return Number(r[idxId] || 0) === id; });
    if (rowIndex < 0) return jsonResponse({ error: 'Proveedor no encontrado' });

    const row = table.rows[rowIndex].slice();
    const colEstatus = headers.indexOf('ESTATUS');
    const colActualizacion = headers.indexOf('FECHA_ACTUALIZACION');
    if (colEstatus >= 0) row[colEstatus] = 'inactivo';
    if (colActualizacion >= 0) row[colActualizacion] = new Date().toISOString();
    const ok = Repository_updateProveedorById(id, row);
    if (!ok) return jsonResponse({ error: 'Proveedor no encontrado' });
    return jsonResponse({ success: true, id: id });
  }, 10000);
}

function _ordenCompraToNumber(value) {
  const num = Number(value || 0);
  return isFinite(num) ? num : 0;
}

function normalizarOrdenCompraForApi(raw) {
  const obj = raw || {};
  const folio = String(obj.FOLIO_OC || obj.folio || '').trim().toUpperCase();
  const estado = String(obj.ESTADO || obj.estado || 'borrador').trim().toLowerCase() || 'borrador';
  const subtotal = _ordenCompraToNumber(obj.SUBTOTAL || obj.subtotal);
  const ivaPorcentaje = _ordenCompraToNumber(obj.IVA_PORCENTAJE || obj.ivaPorcentaje);
  const ivaMonto = _ordenCompraToNumber(obj.IVA_MONTO || obj.ivaMonto);
  const total = _ordenCompraToNumber(obj.TOTAL || obj.total || subtotal + ivaMonto);
  return Object.assign({}, obj, {
    ID: obj.ID,
    FOLIO_OC: folio,
    FECHA: formatearFechaYMDOrEmpty(obj.FECHA || obj.fecha),
    PROVEEDOR: String(obj.PROVEEDOR || obj.proveedor || '').trim(),
    ESTADO: estado,
    REFERENCIA: String(obj.REFERENCIA || obj.referencia || '').trim(),
    CONDICIONES_PAGO: String(obj.CONDICIONES_PAGO || obj.condicionesPago || '').trim(),
    FECHA_ESTIMADA: formatearFechaYMDOrEmpty(obj.FECHA_ESTIMADA || obj.fechaEstimada),
    FOLIO_RELACIONADO: String(obj.FOLIO_RELACIONADO || obj.folioRelacionado || '').trim().toUpperCase(),
    NOTAS: String(obj.NOTAS || obj.notas || '').trim(),
    SUBTOTAL: subtotal,
    IVA_PORCENTAJE: ivaPorcentaje,
    IVA_MONTO: ivaMonto,
    TOTAL: total,
    SUCURSAL_ID: normalizarSucursalId(obj.SUCURSAL_ID || obj.sucursalId || 'GLOBAL'),
    FECHA_CREACION: formatearFechaYMDOrEmpty(obj.FECHA_CREACION || obj.fechaCreacion),
    FECHA_ACTUALIZACION: formatearFechaYMDOrEmpty(obj.FECHA_ACTUALIZACION || obj.fechaActualizacion),
    folio: folio,
    estado: estado,
    proveedor: String(obj.PROVEEDOR || obj.proveedor || '').trim(),
    referencia: String(obj.REFERENCIA || obj.referencia || '').trim(),
    condicionesPago: String(obj.CONDICIONES_PAGO || obj.condicionesPago || '').trim(),
    fechaEstimada: formatearFechaYMDOrEmpty(obj.FECHA_ESTIMADA || obj.fechaEstimada),
    folioRelacionado: String(obj.FOLIO_RELACIONADO || obj.folioRelacionado || '').trim().toUpperCase(),
    notas: String(obj.NOTAS || obj.notas || '').trim(),
    subtotal: subtotal,
    ivaPorcentaje: ivaPorcentaje,
    ivaMonto: ivaMonto,
    total: total,
    sucursalId: normalizarSucursalId(obj.SUCURSAL_ID || obj.sucursalId || 'GLOBAL')
  });
}

function normalizarOrdenCompraItemForApi(raw) {
  const obj = raw || {};
  const cantidadPedida = _ordenCompraToNumber(obj.CANTIDAD_PEDIDA || obj.cantidadPedida);
  const costoUnitario = _ordenCompraToNumber(obj.COSTO_UNITARIO || obj.costoUnitario);
  const cantidadRecibida = _ordenCompraToNumber(obj.CANTIDAD_RECIBIDA || obj.cantidadRecibida);
  const subtotal = _ordenCompraToNumber(obj.SUBTOTAL || (cantidadPedida * costoUnitario));
  return Object.assign({}, obj, {
    ID: obj.ID,
    FOLIO_OC: String(obj.FOLIO_OC || obj.folio || '').trim().toUpperCase(),
    ITEM_ID: _ordenCompraToNumber(obj.ITEM_ID || obj.itemId),
    SKU: String(obj.SKU || obj.sku || '').trim().toUpperCase(),
    PRODUCTO: String(obj.PRODUCTO || obj.producto || '').trim(),
    CANTIDAD_PEDIDA: cantidadPedida,
    COSTO_UNITARIO: costoUnitario,
    CANTIDAD_RECIBIDA: cantidadRecibida,
    SUBTOTAL: subtotal,
    FECHA_CREACION: formatearFechaYMDOrEmpty(obj.FECHA_CREACION || obj.fechaCreacion),
    FECHA_ACTUALIZACION: formatearFechaYMDOrEmpty(obj.FECHA_ACTUALIZACION || obj.fechaActualizacion),
    folio: String(obj.FOLIO_OC || obj.folio || '').trim().toUpperCase(),
    itemId: _ordenCompraToNumber(obj.ITEM_ID || obj.itemId),
    sku: String(obj.SKU || obj.sku || '').trim().toUpperCase(),
    producto: String(obj.PRODUCTO || obj.producto || '').trim(),
    cantidadPedida: cantidadPedida,
    costoUnitario: costoUnitario,
    cantidadRecibida: cantidadRecibida,
    subtotal: subtotal
  });
}

function _siguienteFolioOrdenCompra(table) {
  const rows = (table && table.rows) || [];
  const maxNum = rows.reduce(function(max, row) {
    const folio = String(row.FOLIO_OC || row.folio || row[1] || '').trim().toUpperCase();
    const match = folio.match(/^OC-(\d+)$/);
    const num = match ? Number(match[1]) : 0;
    return num > max ? num : max;
  }, 0);
  return 'OC-' + String(maxNum + 1).padStart(5, '0');
}

function _uniqueStrings(values) {
  return (values || []).map(function(v) { return String(v || '').trim(); }).filter(Boolean).filter(function(v, i, arr) { return arr.indexOf(v) === i; }).sort();
}

function Service_listarNombresProveedores() {
  const table = Repository_readProveedoresTable();
  const nombres = _uniqueStrings((table.rows || []).map(function(row) {
    const prov = mapearFila(table.headers || [], row);
    return prov.NOMBRE_COMERCIAL || prov.RAZON_SOCIAL || prov.CONTACTO || '';
  }));
  return jsonResponse({ proveedores: nombres.map(function(nombre) { return { nombre: nombre }; }) });
}

function Service_listarFoliosRelacion() {
  const equiposTable = Repository_readEquiposTable();
  const solicitudesTable = Repository_readSolicitudesTable ? Repository_readSolicitudesTable() : { headers: [], rows: [] };
  const foliosEquipos = (equiposTable.rows || []).map(function(row) {
    const item = mapearFila(equiposTable.headers || [], row);
    return item.FOLIO || item.FOLIO_EQUIPO || '';
  });
  const foliosSolicitudes = (solicitudesTable.rows || []).map(function(row) {
    const item = mapearFila(solicitudesTable.headers || [], row);
    return item.FOLIO_COTIZACION || '';
  });
  const folios = _uniqueStrings([].concat(foliosEquipos, foliosSolicitudes));
  return jsonResponse({ folios: folios.map(function(folio) { return { folio: folio }; }) });
}

function Service_listarOrdenesCompra(data) {
  const input = data || {};
  const p = parsePaginacion(input);
  const texto = String(input.texto || '').trim().toLowerCase();
  const estado = String(input.estado || '').trim().toLowerCase();
  const proveedor = String(input.proveedor || '').trim().toLowerCase();
  const sucursalId = normalizarSucursalId(input.sucursalId || 'GLOBAL');
  const hasFilters = !!(texto || estado || proveedor || sucursalId !== 'GLOBAL');

  const table = hasFilters ? Repository_readOrdenesCompraTable() : Repository_readPage('OrdenesCompra', p.page, p.pageSize);
  const headers = table.headers || [];
  const rows = table.rows || [];
  if (!headers.length || !rows.length) {
    return jsonResponse({ ordenes: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false, proveedores: [] });
  }

  const items = rows.map(function(row) {
    return normalizarOrdenCompraForApi(mapearFila(headers, row));
  }).filter(function(orden) {
    if (estado && String(orden.ESTADO || '').toLowerCase() !== estado) return false;
    if (proveedor && String(orden.PROVEEDOR || '').toLowerCase() !== proveedor) return false;
    if (sucursalId !== 'GLOBAL' && normalizarSucursalId(orden.SUCURSAL_ID || '') !== sucursalId) return false;
    if (texto) {
      const hay = [orden.FOLIO_OC, orden.PROVEEDOR, orden.REFERENCIA, orden.FOLIO_RELACIONADO, orden.NOTAS]
        .some(function(v) { return String(v || '').toLowerCase().indexOf(texto) >= 0; });
      if (!hay) return false;
    }
    return true;
  }).sort(function(a, b) {
    return String(b.FECHA_ACTUALIZACION || b.FECHA_CREACION || '').localeCompare(String(a.FECHA_ACTUALIZACION || a.FECHA_CREACION || ''));
  });

  const paginada = hasFilters ? paginarArreglo(items, p.page, p.pageSize) : {
    data: items,
    total: table.total,
    page: table.page,
    pageSize: table.pageSize,
    hasMore: table.hasMore
  };

  const proveedores = _uniqueStrings((Repository_readProveedoresTable().rows || []).map(function(row) {
    const prov = mapearFila(Repository_readProveedoresTable().headers || [], row);
    return prov.NOMBRE_COMERCIAL || prov.RAZON_SOCIAL || prov.CONTACTO || '';
  }));

  return jsonResponse({
    ordenes: paginada.data,
    total: paginada.total,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore,
    proveedores: proveedores.map(function(nombre) { return { nombre: nombre }; })
  });
}

function Service_listarCompras(data) {
  return Service_listarOrdenesCompra(data || {});
}

function Service_getOrdenCompraByFolio(folio) {
  const target = String(folio || '').trim().toUpperCase();
  if (!target) return jsonResponse({ error: 'folio requerido' });
  const orden = Repository_findOrdenCompraByFolio(target);
  if (!orden) return jsonResponse({ error: 'Orden no encontrada' });
  const items = Repository_readOrdenCompraItemsByFolio(target).map(normalizarOrdenCompraItemForApi);
  return jsonResponse({ orden: normalizarOrdenCompraForApi(orden), items: items });
}

function Service_guardarOrdenCompra(data) {
  return withDocumentLock(function() {
    const input = data || {};
    const table = Repository_readOrdenesCompraTable();
    const now = new Date().toISOString();
    const folio = String(input.folio || '').trim().toUpperCase() || _siguienteFolioOrdenCompra(table);
    const existing = Repository_findOrdenCompraByFolio(folio);
    const headers = table.headers || [];
    const existingRows = table.rows || [];
    const idxFolio = headers.indexOf('FOLIO_OC');
    const rowIndex = existing ? existingRows.findIndex(function(r) {
      return idxFolio >= 0 && String(r[idxFolio] || '').trim().toUpperCase() === folio;
    }) : -1;
    const itemsInput = Array.isArray(input.items) ? input.items : [];
    const normalizedItems = itemsInput.map(function(item, index) {
      const qty = _ordenCompraToNumber(item && (item.cantidadPedida !== undefined ? item.cantidadPedida : item.CANTIDAD_PEDIDA));
      const cost = _ordenCompraToNumber(item && (item.costoUnitario !== undefined ? item.costoUnitario : item.COSTO_UNITARIO));
      const received = _ordenCompraToNumber(item && (item.cantidadRecibida !== undefined ? item.cantidadRecibida : item.CANTIDAD_RECIBIDA));
      return {
        ID: existing ? (item && item.ID ? item.ID : index + 1) : index + 1,
        FOLIO_OC: folio,
        ITEM_ID: item && item.itemId ? Number(item.itemId) : index + 1,
        SKU: String(item && (item.sku !== undefined ? item.sku : item.SKU) || '').trim().toUpperCase(),
        PRODUCTO: String(item && (item.producto !== undefined ? item.producto : item.PRODUCTO) || '').trim(),
        CANTIDAD_PEDIDA: qty,
        COSTO_UNITARIO: cost,
        CANTIDAD_RECIBIDA: received,
        SUBTOTAL: _ordenCompraToNumber(qty * cost),
        FECHA_CREACION: now,
        FECHA_ACTUALIZACION: now
      };
    });
    const subtotal = _ordenCompraToNumber(input.subtotal || normalizedItems.reduce(function(acc, item) { return acc + _ordenCompraToNumber(item.SUBTOTAL); }, 0));
    const ivaPorcentaje = _ordenCompraToNumber(input.ivaPorcentaje || 0);
    const ivaMonto = _ordenCompraToNumber(input.ivaMonto || (subtotal * (ivaPorcentaje / 100)));
    const total = _ordenCompraToNumber(input.total || (subtotal + ivaMonto));
    const payload = {
      ID: existing && existing.ID ? existing.ID : (rowIndex >= 0 ? Number((existingRows[rowIndex] || [])[0] || 0) : (existingRows.length + 1)),
      FOLIO_OC: folio,
      FECHA: formatearFechaYMDOrEmpty(input.fecha || now),
      PROVEEDOR: String(input.proveedor || '').trim(),
      ESTADO: String(input.estado || 'borrador').trim().toLowerCase() || 'borrador',
      REFERENCIA: String(input.referencia || '').trim(),
      CONDICIONES_PAGO: String(input.condicionesPago || '').trim(),
      FECHA_ESTIMADA: formatearFechaYMDOrEmpty(input.fechaEstimada || ''),
      FOLIO_RELACIONADO: String(input.folioRelacionado || '').trim().toUpperCase(),
      NOTAS: String(input.notas || '').trim(),
      SUBTOTAL: subtotal,
      IVA_PORCENTAJE: ivaPorcentaje,
      IVA_MONTO: ivaMonto,
      TOTAL: total,
      SUCURSAL_ID: normalizarSucursalId(input.sucursalId || 'GLOBAL'),
      FECHA_CREACION: existing && existing.FECHA_CREACION ? existing.FECHA_CREACION : now,
      FECHA_ACTUALIZACION: now
    };
    const rowValues = headers.length ? headers.map(function(header) {
      return payload[header] !== undefined ? payload[header] : (payload[String(header || '').toUpperCase()] !== undefined ? payload[String(header || '').toUpperCase()] : '');
    }) : [];
    if (existing && rowIndex >= 0) {
      const row = (existingRows[rowIndex] || []).slice();
      headers.forEach(function(header, i) {
        const key = String(header || '').trim();
        if (payload[key] !== undefined) row[i] = payload[key];
      });
      Repository_updateOrdenCompraByFolio(folio, row);
    } else {
      Repository_appendOrdenCompra(headers.length ? rowValues : [
        payload.ID,
        payload.FOLIO_OC,
        payload.FECHA,
        payload.PROVEEDOR,
        payload.ESTADO,
        payload.REFERENCIA,
        payload.CONDICIONES_PAGO,
        payload.FECHA_ESTIMADA,
        payload.FOLIO_RELACIONADO,
        payload.NOTAS,
        payload.SUBTOTAL,
        payload.IVA_PORCENTAJE,
        payload.IVA_MONTO,
        payload.TOTAL,
        payload.SUCURSAL_ID,
        payload.FECHA_CREACION,
        payload.FECHA_ACTUALIZACION
      ]);
    }

    const itemsTable = Repository_readOrdenesCompraItemsTable();
    const itemHeaders = itemsTable.headers || [];
    const existingItems = itemsTable.rows || [];
    const idxItemFolio = itemHeaders.indexOf('FOLIO_OC');
    const deleteIndexes = [];
    existingItems.forEach(function(row, i) {
      if (idxItemFolio >= 0 && String(row[idxItemFolio] || '').trim().toUpperCase() === folio) {
        deleteIndexes.push(i + 1);
      }
    });
    if (deleteIndexes.length) {
      const hojaItems = Repository_getOrdenesCompraItemsSheet();
      deleteIndexes.sort(function(a, b) { return b - a; }).forEach(function(rowIndexToDelete) {
        withRetry(function() {
          hojaItems.deleteRow(rowIndexToDelete);
          return true;
        }, 'Service_guardarOrdenCompra.deleteItems');
      });
    }
    normalizedItems.forEach(function(item) {
      Repository_appendOrdenCompraItem([
        item.ID,
        item.FOLIO_OC,
        item.ITEM_ID,
        item.SKU,
        item.PRODUCTO,
        item.CANTIDAD_PEDIDA,
        item.COSTO_UNITARIO,
        item.CANTIDAD_RECIBIDA,
        item.SUBTOTAL,
        item.FECHA_CREACION,
        item.FECHA_ACTUALIZACION
      ]);
    });

    return jsonResponse({ success: true, folio: folio, orden: normalizarOrdenCompraForApi(Object.assign({}, payload, { ID: payload.ID })) });
  }, 10000);
}

function Service_cambiarEstadoOrdenCompra(data) {
  return withDocumentLock(function() {
    const folio = String(data && data.folio || '').trim().toUpperCase();
    const estado = String(data && data.estado || '').trim().toLowerCase();
    if (!folio) return jsonResponse({ error: 'folio requerido' });
    if (!estado) return jsonResponse({ error: 'estado requerido' });
    const table = Repository_readOrdenesCompraTable();
    const headers = table.headers || [];
    const row = Repository_findOrdenCompraByFolio(folio);
    if (!row) return jsonResponse({ error: 'Orden no encontrada' });
    const next = Object.assign({}, row, { ESTADO: estado, FECHA_ACTUALIZACION: new Date().toISOString() });
    const rowValues = headers.map(function(header) {
      return next[header] !== undefined ? next[header] : '';
    });
    const ok = Repository_updateOrdenCompraByFolio(folio, rowValues);
    if (!ok) return jsonResponse({ error: 'Orden no encontrada' });
    return jsonResponse({ success: true, folio: folio, estado: estado });
  }, 10000);
}

function Service_recibirOrdenCompra(data) {
  return withDocumentLock(function() {
    const folio = String(data && data.folio || '').trim().toUpperCase();
    const usuario = String(data && data.usuario || '').trim();
    const itemsInput = Array.isArray(data && data.items) ? data.items : [];
    if (!folio) return jsonResponse({ error: 'folio requerido' });
    if (!itemsInput.length) return jsonResponse({ error: 'items requeridos' });

    const order = Repository_findOrdenCompraByFolio(folio);
    if (!order) return jsonResponse({ error: 'Orden no encontrada' });

    const orderItems = Repository_readOrdenCompraItemsByFolio(folio);
    if (!orderItems.length) return jsonResponse({ error: 'La orden no tiene items' });
    const itemMap = {};
    orderItems.forEach(function(item) {
      itemMap[String(item.ITEM_ID || '').trim()] = item;
    });

    let anyPartial = false;
    let allComplete = true;
    const now = new Date().toISOString();
    const updatedItems = orderItems.map(function(item) {
      const receivedDelta = (itemsInput.find(function(inputItem) {
        return Number(inputItem && inputItem.itemId) === Number(item.ITEM_ID || 0);
      }) || {}).cantidadRecibida;
      const delta = _ordenCompraToNumber(receivedDelta);
      const nextReceived = _ordenCompraToNumber(item.CANTIDAD_RECIBIDA) + delta;
      if (delta > 0 && nextReceived < _ordenCompraToNumber(item.CANTIDAD_PEDIDA)) anyPartial = true;
      if (nextReceived < _ordenCompraToNumber(item.CANTIDAD_PEDIDA)) allComplete = false;

      if (delta > 0 && item.SKU) {
        const producto = Repository_findProductoBySku(item.SKU);
        if (producto) {
          const table = Repository_readProductosTable();
          const headers = table.headers || [];
          const rows = table.rows || [];
          const idxSku = headers.indexOf('SKU');
          const idxStock = headers.indexOf('STOCK_ACTUAL');
          const rowIndex = rows.findIndex(function(row) {
            return String(row[idxSku] || '').trim().toUpperCase() === String(item.SKU || '').trim().toUpperCase();
          });
          if (rowIndex >= 0 && idxStock >= 0) {
            const row = rows[rowIndex].slice();
            row[idxStock] = _ordenCompraToNumber(row[idxStock]) + delta;
            const idxActualizacion = headers.indexOf('FECHA_ACTUALIZACION');
            if (idxActualizacion >= 0) row[idxActualizacion] = now;
            Repository_updateProductoBySku(String(item.SKU || '').trim().toUpperCase(), row);
          }
        }
      }

      return Object.assign({}, item, {
        CANTIDAD_RECIBIDA: nextReceived,
        FECHA_ACTUALIZACION: now
      });
    });

    const status = allComplete ? 'recibida' : (anyPartial ? 'parcialmente_recibida' : String(order.ESTADO || 'borrador').toLowerCase());
    const orderTable = Repository_readOrdenesCompraTable();
    const headers = orderTable.headers || [];
    const nextOrder = Object.assign({}, order, { ESTADO: status, FECHA_ACTUALIZACION: now });
    const orderRowValues = headers.map(function(header) {
      return nextOrder[header] !== undefined ? nextOrder[header] : '';
    });
    const ok = Repository_updateOrdenCompraByFolio(folio, orderRowValues);
    if (!ok) return jsonResponse({ error: 'Orden no encontrada' });

    const itemsTable = Repository_readOrdenesCompraItemsTable();
    const itemHeaders = itemsTable.headers || [];
    const rowsByFolio = [];
    updatedItems.forEach(function(item) {
      rowsByFolio.push(itemHeaders.map(function(header) {
        return item[header] !== undefined ? item[header] : '';
      }));
    });
    Repository_replaceOrdenCompraItemsByFolio(folio, rowsByFolio);

    return jsonResponse({ success: true, folio: folio, estado: status, usuario: usuario });
  }, 10000);
}

function Service_guardarProducto(data) {
  try {
    return withDocumentLock(function() {
      const input = data || {};
      const payload = normalizarProductoPayload(input, !!(input && input.skuOriginal));
      const skuOriginal = String(input && input.skuOriginal || payload.sku).trim().toUpperCase();
      const now = new Date().toISOString();
      const table = Repository_readProductosTable();
      const headers = table.headers || [];
      const rows = table.rows || [];
      const idxSku = headers.indexOf('SKU');
      if (idxSku < 0) throw new Error('Estructura de Productos inválida');
      const idxCosto = headers.indexOf('COSTO');
      const idxPrecio = headers.indexOf('PRECIO');

      const existingIndex = rows.findIndex(function(r) {
        return String(r[idxSku] || '').trim().toUpperCase() === skuOriginal;
      });
      const duplicateIndex = payload.sku !== skuOriginal
        ? rows.findIndex(function(r) { return String(r[idxSku] || '').trim().toUpperCase() === payload.sku; })
        : -1;
      if (duplicateIndex >= 0) throw new Error('Ya existe un producto con ese SKU');

      const costoNuevo = Number(payload.costo || 0);
      const precioNuevo = Number(payload.precio || 0);
      const costoActual = existingIndex >= 0 && idxCosto >= 0 ? Number(rows[existingIndex][idxCosto] || 0) : 0;
      const precioActual = existingIndex >= 0 && idxPrecio >= 0 ? Number(rows[existingIndex][idxPrecio] || 0) : 0;
      const requiereAuth = existingIndex >= 0
        ? (costoNuevo !== costoActual || precioNuevo !== precioActual)
        : (costoNuevo > 0 || precioNuevo > 0);
      if (requiereAuth) {
        const auth = Security_requireAdminPassword(input, 'Guardar producto con valor monetario');
        if (!auth.ok) return jsonResponse({ error: auth.error });
      }

      const ss = Core_getSpreadsheet();
      asegurarEstructuraMultisucursal(ss);

      if (existingIndex >= 0) {
        const row = rows[existingIndex].slice();
        const mapping = {
          SKU: payload.sku,
          NOMBRE: payload.nombre,
          CATEGORIA: payload.categoria,
          MARCA: payload.marca,
          MODELO_COMPATIBLE: payload.modeloCompatible,
          PROVEEDOR: payload.proveedor,
          COSTO: payload.costo,
          PRECIO: payload.precio,
          STOCK_MINIMO: payload.stockMinimo,
          UNIDAD: payload.unidad,
          UBICACION: payload.ubicacion,
          NOTAS: payload.notas,
          ESTATUS: payload.estatus,
          FECHA_ACTUALIZACION: now
        };
        Object.keys(mapping).forEach(function(key) {
          const col = headers.indexOf(key);
          if (col >= 0) row[col] = mapping[key];
        });

        actualizarInventarioSucursal(ss, payload.sku, payload.sucursalId, payload.stockActual, payload.stockMinimo);
        const idxStock = headers.indexOf('STOCK_ACTUAL');
        if (idxStock >= 0) row[idxStock] = recalcularStockGlobalProducto(ss, payload.sku);

        const ok = Repository_updateProductoBySku(skuOriginal, row);
        if (!ok) throw new Error('Producto no encontrado');
        return jsonResponse({ success: true, sku: payload.sku, actualizado: true });
      }

      const nextId = Math.max(0, rows.length) + 1;
      Repository_appendProducto([
        nextId,
        payload.sku,
        payload.nombre,
        payload.categoria,
        payload.marca,
        payload.modeloCompatible,
        payload.proveedor,
        payload.costo,
        payload.precio,
        0,
        payload.stockMinimo,
        payload.unidad,
        payload.ubicacion,
        payload.notas,
        payload.estatus,
        now,
        now
      ]);

      actualizarInventarioSucursal(ss, payload.sku, payload.sucursalId, payload.stockActual, payload.stockMinimo);
      recalcularStockGlobalProducto(ss, payload.sku);
      return jsonResponse({ success: true, sku: payload.sku, actualizado: false });
    }, 10000);
  } catch (error) {
    logError('Service_guardarProducto', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function Service_eliminarProducto(data) {
  try {
    return withDocumentLock(function() {
      const sku = String(data && data.sku || '').trim().toUpperCase();
      if (!sku) throw new Error('sku requerido');
      const table = Repository_readProductosTable();
      const headers = table.headers || [];
      const idxSku = headers.indexOf('SKU');
      if (idxSku < 0) throw new Error('Estructura de Productos inválida');
      const rowIndex = table.rows.findIndex(function(r) {
        return String(r[idxSku] || '').trim().toUpperCase() === sku;
      });
      if (rowIndex < 0) throw new Error('Producto no encontrado');

      const row = table.rows[rowIndex].slice();
      const colEstatus = headers.indexOf('ESTATUS');
      const colActualizacion = headers.indexOf('FECHA_ACTUALIZACION');
      if (colEstatus >= 0) row[colEstatus] = 'inactivo';
      if (colActualizacion >= 0) row[colActualizacion] = new Date().toISOString();

      const ok = Repository_updateProductoBySku(sku, row);
      if (!ok) throw new Error('Producto no encontrado');
      return jsonResponse({ success: true, sku: sku });
    }, 10000);
  } catch (error) {
    logError('Service_eliminarProducto', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function Service_listarProductos(data) {
  try {
    const input = data || {};
    const p = parsePaginacion(input);
    const texto = String(input.texto || '').trim().toLowerCase();
    const categoria = String(input.categoria || '').trim().toLowerCase();
    const marca = String(input.marca || '').trim().toLowerCase();
    const proveedor = String(input.proveedor || '').trim().toLowerCase();
    const estatus = String(input.estatus || '').trim().toLowerCase();
    const soloAlertas = String(input.soloAlertas || '').trim().toLowerCase();
    const nivelAlerta = String(input.nivelAlerta || '').trim().toLowerCase();
    const hasFilters = !!(texto || categoria || marca || proveedor || estatus || (soloAlertas === '1') || nivelAlerta);

    const table = hasFilters
      ? Repository_readProductosTable()
      : Repository_readPage('Productos', p.page, p.pageSize);
    const headers = table.headers || [];
    const rows = table.rows || [];
    if (!headers.length || !rows.length) {
      return jsonResponse({
        productos: [],
        total: 0,
        page: p.page,
        pageSize: p.pageSize,
        hasMore: false,
        filtros: { categorias: [], marcas: [], proveedores: [] }
      });
    }

    const ss = Core_getSpreadsheet();
    asegurarEstructuraMultisucursal(ss);
    const sucursalId = normalizarSucursalId(input.sucursalId || 'GLOBAL');

    const productos = rows.map(function(row) {
      const producto = Utils_normalizeEntity('producto', mapearFila(headers, row));
      producto.SUCURSAL_ID = sucursalId;
      producto.STOCK_ACTUAL = obtenerStockProductoEnSucursal(ss, producto.SKU, sucursalId);
      producto.STOCK_MINIMO = obtenerStockMinimoProductoEnSucursal(ss, producto.SKU, sucursalId, producto.STOCK_MINIMO);
      producto.ALERTA_NIVEL = clasificarNivelAlertaStock(producto);
      producto.ALERTA_STOCK = !!producto.ALERTA_NIVEL;
      return producto;
    }).filter(function(item) {
      if (categoria && String(item.CATEGORIA || '').toLowerCase() !== categoria) return false;
      if (marca && String(item.MARCA || '').toLowerCase() !== marca) return false;
      if (proveedor && String(item.PROVEEDOR || '').toLowerCase() !== proveedor) return false;
      if (estatus && String(item.ESTATUS || '').toLowerCase() !== estatus) return false;
      if (soloAlertas === '1' && !item.ALERTA_STOCK) return false;
      if (nivelAlerta && String(item.ALERTA_NIVEL || '').toLowerCase() !== nivelAlerta) return false;
      if (texto) {
        const hay = [item.SKU, item.NOMBRE, item.MARCA, item.CATEGORIA, item.PROVEEDOR, item.MODELO_COMPATIBLE]
          .some(function(v) { return String(v || '').toLowerCase().indexOf(texto) >= 0; });
        if (!hay) return false;
      }
      return true;
    }).sort(function(a, b) {
      if (a.ALERTA_STOCK !== b.ALERTA_STOCK) return a.ALERTA_STOCK ? -1 : 1;
      return String(a.NOMBRE || '').localeCompare(String(b.NOMBRE || ''));
    });

    const categorias = productos.map(function(x) { return x.CATEGORIA; }).filter(Boolean).filter(function(v, i, arr) { return arr.indexOf(v) === i; }).sort();
    const marcas = productos.map(function(x) { return x.MARCA; }).filter(Boolean).filter(function(v, i, arr) { return arr.indexOf(v) === i; }).sort();
    const proveedores = productos.map(function(x) { return x.PROVEEDOR; }).filter(Boolean).filter(function(v, i, arr) { return arr.indexOf(v) === i; }).sort();

    const paginada = hasFilters ? paginarArreglo(productos, p.page, p.pageSize) : {
      data: productos,
      total: table.total,
      page: table.page,
      pageSize: table.pageSize,
      hasMore: table.hasMore
    };

    return jsonResponse({
      productos: paginada.data,
      total: paginada.total,
      page: paginada.page,
      pageSize: paginada.pageSize,
      hasMore: paginada.hasMore,
      filtros: { categorias: categorias, marcas: marcas, proveedores: proveedores }
    });
  } catch (error) {
    logError('Service_listarProductos', error, data || {});
    return jsonResponse({ error: error.toString() });
  }
}

function Service_obtenerAlertasStock(data) {
  const payload = Object.assign({}, data || {}, { soloAlertas: '1' });
  return Service_listarProductos(payload);
}

function Service_guardarGasto(data) {
  return withDocumentLock(function() {
    const auth = Security_requireAdminPassword(data || {}, 'Guardar gasto');
    if (!auth.ok) return jsonResponse({ error: auth.error });
    const payload = normalizarGastoPayload(data || {}, !!(data && data.id));
    const table = Repository_readGastosTable();
    const headers = table.headers || [];
    const now = new Date().toISOString();

    if (payload.id) {
      const idxId = headers.indexOf('ID');
      const rowIndex = table.rows.findIndex(function(r) { return Number(r[idxId] || 0) === payload.id; });
      if (rowIndex < 0) return jsonResponse({ error: 'Gasto no encontrado' });
      const row = table.rows[rowIndex].slice();
      const mapping = {
        FECHA: payload.fecha,
        TIPO: payload.tipo,
        CATEGORIA: payload.categoria,
        CONCEPTO: payload.concepto,
        DESCRIPCION: payload.descripcion,
        MONTO: payload.monto,
        METODO_PAGO: payload.metodoPago,
        PROVEEDOR: payload.proveedor,
        FOLIO_RELACIONADO: payload.folioRelacionado,
        COMPROBANTE_URL: payload.comprobanteUrl,
        NOTAS: payload.notas,
        SUCURSAL_ID: normalizarSucursalId(data && data.sucursalId),
        FECHA_ACTUALIZACION: now
      };
      Object.keys(mapping).forEach(function(key) {
        const col = headers.indexOf(key);
        if (col >= 0) row[col] = mapping[key];
      });
      const ok = Repository_updateGastoById(payload.id, row);
      if (!ok) return jsonResponse({ error: 'Gasto no encontrado' });
      return jsonResponse({ success: true, id: payload.id, actualizado: true });
    }

    const nextId = Math.max(0, table.rows.length) + 1;
    Repository_appendGasto([
      nextId,
      payload.fecha,
      payload.tipo,
      payload.categoria,
      payload.concepto,
      payload.descripcion,
      payload.monto,
      payload.metodoPago,
      payload.proveedor,
      payload.folioRelacionado,
      payload.comprobanteUrl,
      payload.notas,
      now,
      now,
      normalizarSucursalId(data && data.sucursalId)
    ]);
    return jsonResponse({ success: true, id: nextId, actualizado: false });
  }, 10000);
}

function Service_eliminarGasto(data) {
  return withDocumentLock(function() {
    const id = Number(data && data.id || 0);
    if (!id) return jsonResponse({ error: 'id requerido' });
    const ok = Repository_deleteGastoById(id);
    if (!ok) return jsonResponse({ error: 'Gasto no encontrado' });
    return jsonResponse({ success: true, id: id });
  }, 10000);
}

function Service_listarGastos(data) {
  const input = data || {};
  const p = parsePaginacion(input);
  const fechaDesdeRaw = String(input.fechaDesde || '').trim();
  const fechaHastaRaw = String(input.fechaHasta || '').trim();
  const tipoRaw = String(input.tipo || '').trim();
  const categoriaRaw = String(input.categoria || '').trim();
  const textoRaw = String(input.texto || '').trim();
  const sucursalRaw = String(input.sucursalId || '').trim();
  const hasFilters = !!(fechaDesdeRaw || fechaHastaRaw || tipoRaw || categoriaRaw || textoRaw || sucursalRaw);
  const table = hasFilters
    ? Repository_readGastosTable()
    : Repository_readPage('Gastos', p.page, p.pageSize);
  const headers = table.headers || [];
  const rows = table.rows || [];
  if (!headers.length || !rows.length) {
    return jsonResponse({ gastos: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false });
  }

  const fechaDesde = parseFechaFiltro(fechaDesdeRaw);
  const fechaHasta = parseFechaFiltro(fechaHastaRaw);
  const tipo = tipoRaw.toLowerCase();
  const categoria = categoriaRaw.toLowerCase();
  const texto = textoRaw.toLowerCase();
  const sucursalId = normalizarSucursalId(input.sucursalId || 'GLOBAL');

  const gastos = rows.map(function(row) {
    return Utils_normalizeEntity('gasto', mapearFila(headers, row));
  }).filter(function(gasto) {
    if (sucursalId !== 'GLOBAL' && normalizarSucursalId(gasto.SUCURSAL_ID) !== sucursalId) return false;
    if (tipo && gasto.TIPO !== tipo) return false;
    if (categoria && gasto.CATEGORIA !== categoria) return false;
    const fecha = parseFechaFlexible(gasto.FECHA);
    if ((fechaDesde || fechaHasta) && !cumpleRango(fecha, fechaDesde, fechaHasta)) return false;
    if (texto) {
      const hay = [gasto.CONCEPTO, gasto.DESCRIPCION, gasto.PROVEEDOR, gasto.FOLIO_RELACIONADO, gasto.METODO_PAGO]
        .some(function(v) { return String(v || '').toLowerCase().indexOf(texto) >= 0; });
      if (!hay) return false;
    }
    return true;
  }).sort(function(a, b) {
    const fa = parseFechaFlexible(a.FECHA || '');
    const fb = parseFechaFlexible(b.FECHA || '');
    return (fb ? fb.getTime() : 0) - (fa ? fa.getTime() : 0);
  });

  const paginada = hasFilters ? paginarArreglo(gastos, p.page, p.pageSize) : {
    data: gastos,
    total: table.total,
    page: table.page,
    pageSize: table.pageSize,
    hasMore: table.hasMore
  };
  return jsonResponse({
    gastos: paginada.data,
    total: paginada.total,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function Service_resumenGastos(data) {
  return resumenGastos(data || {});
}

function Service_resumenFinanzas(data) {
  return resumenFinanzas(data || {});
}

function Service_guardarCliente(data) {
  return guardarCliente(data || {});
}

function Service_listarClientes(data) {
  const input = data || {};
  const p = parsePaginacion(input);
  const texto = String(input.texto || '').trim().toLowerCase();
  const hasFilters = !!texto;
  const table = hasFilters
    ? Repository_readClientesTable()
    : Repository_readPage('Clientes', p.page, p.pageSize);
  const headers = table.headers || [];
  const rows = table.rows || [];
  if (!headers.length || !rows.length) {
    return jsonResponse({ clientes: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false });
  }

  const clientes = rows.map(function(row) {
    return Utils_normalizeEntity('cliente', mapearFila(headers, row));
  }).filter(function(cliente) {
    if (!texto) return true;
    return [cliente.NOMBRE, cliente.TELEFONO, cliente.EMAIL, cliente.ETIQUETA, cliente.NOTAS]
      .some(function(v) { return String(v || '').toLowerCase().indexOf(texto) >= 0; });
  }).sort(function(a, b) {
    return String(a.NOMBRE || '').localeCompare(String(b.NOMBRE || ''));
  });

  const paginada = hasFilters ? paginarArreglo(clientes, p.page, p.pageSize) : {
    data: clientes,
    total: table.total,
    page: table.page,
    pageSize: table.pageSize,
    hasMore: table.hasMore
  };
  return jsonResponse({
    clientes: paginada.data,
    total: paginada.total,
    page: paginada.page,
    pageSize: paginada.pageSize,
    hasMore: paginada.hasMore
  });
}

function Service_getClienteById(id) {
  const cliente = Repository_findClienteById(id);
  if (!cliente) return jsonResponse({ error: 'No encontrado' });
  return jsonResponse({ cliente: Utils_normalizeEntity('cliente', cliente) });
}
