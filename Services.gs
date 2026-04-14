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
