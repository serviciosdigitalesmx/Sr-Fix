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
    return normalizarTareaForApi(mapearFila(headers, row));
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
  return jsonResponse({ tarea: normalizarTareaForApi(task) });
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
    const current = normalizarTareaForApi(mapearFila(headers, row));
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
    return normalizarProveedorForApi(mapearFila(headers, row));
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
  return jsonResponse({ proveedor: normalizarProveedorForApi(prov) });
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

function Service_guardarProducto(data) {
  return guardarProducto(data || {});
}

function Service_eliminarProducto(data) {
  return eliminarProducto(data || {});
}

function Service_listarProductos(data) {
  return listarProductos(data || {});
}

function Service_obtenerAlertasStock(data) {
  return obtenerAlertasStock(data || {});
}

function Service_guardarGasto(data) {
  return withDocumentLock(function() {
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
  const table = Repository_readGastosTable();
  const headers = table.headers || [];
  const rows = table.rows || [];
  if (!headers.length || !rows.length) {
    return jsonResponse({ gastos: [], total: 0, page: p.page, pageSize: p.pageSize, hasMore: false });
  }

  const fechaDesde = parseFechaFiltro(input.fechaDesde || '');
  const fechaHasta = parseFechaFiltro(input.fechaHasta || '');
  const tipo = String(input.tipo || '').trim().toLowerCase();
  const categoria = String(input.categoria || '').trim().toLowerCase();
  const texto = String(input.texto || '').trim().toLowerCase();
  const sucursalId = normalizarSucursalId(input.sucursalId || 'GLOBAL');

  const gastos = rows.map(function(row) {
    return normalizarGastoForApi(mapearFila(headers, row));
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

  const paginada = paginarArreglo(gastos, p.page, p.pageSize);
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
    return normalizarClienteForApi(mapearFila(headers, row));
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
  return jsonResponse({ cliente: normalizarClienteForApi(cliente) });
}
