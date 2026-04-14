/**
 * Controllers HTTP (entrada API).
 * Action-based routing + validación de entrada + respuesta estandarizada.
 */

function HttpController_doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = String(params.action || 'status').trim();

  try {
    LogHelper_event('http_get', { action: action, params: params });
    const routes = HttpController_getRoutes();
    const route = routes[action];
    if (!route) return ApiHelper_toJsonOutput({ error: 'Acción no válida' });

    const validation = ApiHelper_validateRequired(params, route.required || []);
    if (!validation.ok) {
      return ApiHelper_toJsonOutput({
        error: 'Campos requeridos: ' + validation.missing.join(', ')
      });
    }

    const result = route.handler(params);
    return ApiHelper_toJsonOutput(result);
  } catch (error) {
    LogHelper_error('HttpController_doGet', error, { action: action, params: params });
    return ApiHelper_toJsonOutput({ error: String(error && error.message || error || 'Error interno') });
  }
}

function HttpController_doPost(e) {
  const data = parsePostData(e);
  const action = String(data && data.action || '').trim();

  try {
    LogHelper_event('http_post', { action: action, keys: Object.keys(data || {}) });
    if (!action) return ApiHelper_toJsonOutput({ error: 'Action requerida' });

    const routes = HttpController_postRoutes();
    const route = routes[action];
    if (!route) return ApiHelper_toJsonOutput({ error: 'Acción no válida' });

    const validation = ApiHelper_validateRequired(data, route.required || []);
    if (!validation.ok) {
      return ApiHelper_toJsonOutput({
        error: 'Campos requeridos: ' + validation.missing.join(', ')
      });
    }

    const result = route.handler(data);
    return ApiHelper_toJsonOutput(result);
  } catch (error) {
    LogHelper_error('HttpController_doPost', error, { action: action });
    return ApiHelper_toJsonOutput({ error: String(error && error.message || error || 'Error interno') });
  }
}

function HttpController_getRoutes() {
  return {
    status: {
      required: [],
      handler: function() {
        return { status: 'online', version: CONFIG.API_VERSION, storage: 'google_sheets' };
      }
    },
    equipo: {
      required: ['folio'],
      handler: function(p) { return getEquipoByFolio(p.folio); }
    },
    semaforo: {
      required: [],
      handler: function(p) { return getSemaforoData(parsePaginacion(p || {})); }
    },
    listar_solicitudes: {
      required: [],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return listarSolicitudes({ page: pag.page, pageSize: pag.pageSize });
      }
    },
    solicitud: {
      required: ['folio'],
      handler: function(p) { return getSolicitudByFolio(p.folio); }
    },
    archivar_solicitud: {
      required: ['folio'],
      handler: function(p) { return archivarSolicitud({ folio: p.folio }); }
    },
    archivar_cotizacion: {
      required: ['folio'],
      handler: function(p) { return archivarCotizacion({ folio: p.folio, cotizacion: {} }); }
    },
    listar_archivo: {
      required: [],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return listarArchivo({
          from: p.from || '',
          to: p.to || '',
          tipo: p.tipo || 'todos',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    listar_tareas: {
      required: [],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return listarTareas({
          texto: p.texto || '',
          estado: p.estado || '',
          prioridad: p.prioridad || '',
          responsable: p.responsable || '',
          fechaDesde: p.fechaDesde || '',
          fechaHasta: p.fechaHasta || '',
          sucursalId: p.sucursalId || '',
          tipoRelacion: p.tipoRelacion || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    tarea: {
      required: ['folio'],
      handler: function(p) { return getTareaByFolio(p.folio); }
    },
    listar_productos: {
      required: [],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return listarProductos({
          texto: p.texto || '',
          categoria: p.categoria || '',
          marca: p.marca || '',
          proveedor: p.proveedor || '',
          estatus: p.estatus || '',
          nivelAlerta: p.nivelAlerta || '',
          soloAlertas: p.soloAlertas || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    obtener_alertas_stock: {
      required: [],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return obtenerAlertasStock({
          texto: p.texto || '',
          categoria: p.categoria || '',
          marca: p.marca || '',
          proveedor: p.proveedor || '',
          nivelAlerta: p.nivelAlerta || '',
          estatus: p.estatus || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    listar_movimientos_producto: {
      required: ['sku'],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return listarMovimientosProducto({
          sku: p.sku || '',
          sucursalId: p.sucursalId || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    listar_folios_relacion: {
      required: [],
      handler: function() { return listarFoliosRelacion(); }
    },
    listar_proveedores: {
      required: [],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return listarProveedores({
          texto: p.texto || '',
          estatus: p.estatus || '',
          categoria: p.categoria || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    proveedor: {
      required: ['id'],
      handler: function(p) { return getProveedorById(p.id); }
    },
    listar_nombres_proveedores: {
      required: [],
      handler: function() { return listarNombresProveedores(); }
    },
    listar_sucursales: {
      required: [],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return listarSucursales({ texto: p.texto || '', soloActivas: p.soloActivas || '', page: pag.page, pageSize: pag.pageSize });
      }
    },
    listar_usuarios_internos: {
      required: [],
      handler: function() { return listarUsuariosInternos(); }
    },
    obtener_config_seguridad: {
      required: [],
      handler: function() { return obtenerConfiguracionSeguridad(); }
    },
    politica_accion_critica: {
      required: [],
      handler: function(p) { return obtenerPoliticaAccionCritica(p.accion || ''); }
    },
    listar_transferencias_stock: {
      required: [],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return listarTransferenciasStock({ texto: p.texto || '', sucursalId: p.sucursalId || '', page: pag.page, pageSize: pag.pageSize });
      }
    },
    listar_ordenes_compra: {
      required: [],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return listarOrdenesCompra({
          texto: p.texto || '',
          estado: p.estado || '',
          proveedor: p.proveedor || '',
          sucursalId: p.sucursalId || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    orden_compra: {
      required: ['folio'],
      handler: function(p) { return getOrdenCompraByFolio(p.folio); }
    },
    listar_gastos: {
      required: [],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return listarGastos({
          fechaDesde: p.fechaDesde || '',
          fechaHasta: p.fechaHasta || '',
          tipo: p.tipo || '',
          categoria: p.categoria || '',
          sucursalId: p.sucursalId || '',
          texto: p.texto || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    resumen_gastos: {
      required: [],
      handler: function(p) {
        return resumenGastos({ fechaDesde: p.fechaDesde || '', fechaHasta: p.fechaHasta || '', sucursalId: p.sucursalId || '' });
      }
    },
    resumen_finanzas: {
      required: [],
      handler: function(p) {
        return resumenFinanzas({ fechaDesde: p.fechaDesde || '', fechaHasta: p.fechaHasta || '', sucursalId: p.sucursalId || '' });
      }
    },
    reporte_operativo: {
      required: [],
      handler: function(p) {
        return reporteOperativo({ tipo: p.tipo || 'diario', fechaDesde: p.fechaDesde || '', fechaHasta: p.fechaHasta || '', sucursalId: p.sucursalId || '' });
      }
    },
    listar_clientes: {
      required: [],
      handler: function(p) {
        const pag = parsePaginacion(p || {});
        return listarClientes({ texto: p.texto || '', page: pag.page, pageSize: pag.pageSize });
      }
    },
    cliente: {
      required: ['id'],
      handler: function(p) { return getClienteById(p.id); }
    },
    crear_solicitud: {
      required: [],
      handler: function(p) {
        return createLead({
          nombre: p.nombre || '',
          telefono: p.telefono || '',
          email: p.email || '',
          dispositivo: p.dispositivo || '',
          modelo: p.modelo || '',
          problemas: String(p.problemas || '').split(',').map(function(s) { return String(s).trim(); }).filter(Boolean),
          descripcion: p.descripcion || '',
          urgencia: p.urgencia || ''
        });
      }
    },

    // Endpoints HUB central (SaaS).
    hub_dashboard_summary: {
      required: [],
      handler: function(p) { return getDashboardSummary(p); }
    },
    hub_operational_panel: {
      required: [],
      handler: function(p) { return getOperationalPanel(p); }
    },
    hub_technician_panel: {
      required: ['technicianId'],
      handler: function(p) { return getTechnicianPanel(p.technicianId); }
    },
    hub_client_panel: {
      required: ['clientId'],
      handler: function(p) { return getClientPanel(p.clientId); }
    }
  };
}

function HttpController_postRoutes() {
  return {
    crear_equipo: { required: [], handler: function(data) { return crearEquipo(data); } },
    actualizar_equipo: { required: [], handler: function(data) { return actualizarEquipo(data); } },
    semaforo: {
      required: [],
      handler: function(data) { return getSemaforoData(parsePaginacion(data || {})); }
    },
    crear_solicitud: { required: [], handler: function(data) { return createLead(data); } },
    login_interno: { required: ['usuario', 'password'], handler: function(data) { return loginInterno(data); } },
    listar_solicitudes: {
      required: [],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return listarSolicitudes({ page: pag.page, pageSize: pag.pageSize });
      }
    },
    solicitud: { required: ['folio'], handler: function(data) { return getSolicitudByFolio(data.folio); } },
    archivar_solicitud: { required: ['folio'], handler: function(data) { return qualifyLead(data); } },
    archivar_cotizacion: { required: ['folio'], handler: function(data) { return generateQuote(data); } },
    listar_archivo: {
      required: [],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return listarArchivo(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    crear_tarea: { required: [], handler: function(data) { return bookAppointment(data); } },
    actualizar_tarea: { required: [], handler: function(data) { return actualizarTarea(data); } },
    listar_tareas: {
      required: [],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return listarTareas(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    tarea: { required: ['folio'], handler: function(data) { return getTareaByFolio(data.folio); } },
    guardar_producto: { required: [], handler: function(data) { return guardarProducto(data); } },
    eliminar_producto: { required: ['sku'], handler: function(data) { return eliminarProducto(data); } },
    listar_productos: {
      required: [],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return listarProductos(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    obtener_alertas_stock: {
      required: [],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return obtenerAlertasStock(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    listar_movimientos_producto: {
      required: ['sku'],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return listarMovimientosProducto(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    registrar_movimiento_stock: { required: [], handler: function(data) { return registrarMovimientoStock(data); } },
    listar_folios_relacion: { required: [], handler: function() { return listarFoliosRelacion(); } },
    guardar_proveedor: { required: [], handler: function(data) { return guardarProveedor(data); } },
    eliminar_proveedor: { required: ['id'], handler: function(data) { return eliminarProveedor(data); } },
    listar_proveedores: {
      required: [],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return listarProveedores(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    proveedor: { required: ['id'], handler: function(data) { return getProveedorById(data.id); } },
    listar_nombres_proveedores: { required: [], handler: function() { return listarNombresProveedores(); } },
    listar_sucursales: {
      required: [],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return listarSucursales(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    listar_usuarios_internos: { required: [], handler: function() { return listarUsuariosInternos(); } },
    guardar_usuario_interno: { required: ['usuario', 'nombre', 'rol', 'adminPasswordActual'], handler: function(data) { return guardarUsuarioInterno(data); } },
    obtener_config_seguridad: { required: [], handler: function() { return obtenerConfiguracionSeguridad(); } },
    guardar_config_seguridad: { required: ['adminPasswordActual'], handler: function(data) { return guardarConfiguracionSeguridad(data); } },
    validar_admin_password: { required: ['adminPassword'], handler: function(data) { return validarAutorizacionAdmin(data); } },
    politica_accion_critica: { required: [], handler: function(data) { return obtenerPoliticaAccionCritica(data.accion || ''); } },
    guardar_sucursal: { required: [], handler: function(data) { return guardarSucursal(data); } },
    transferir_stock: { required: [], handler: function(data) { return transferirStock(data); } },
    listar_transferencias_stock: {
      required: [],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return listarTransferenciasStock(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    guardar_orden_compra: { required: [], handler: function(data) { return guardarOrdenCompra(data); } },
    listar_ordenes_compra: {
      required: [],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return listarOrdenesCompra(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    orden_compra: { required: ['folio'], handler: function(data) { return getOrdenCompraByFolio(data.folio); } },
    cambiar_estado_orden_compra: { required: ['folio', 'estado'], handler: function(data) { return cambiarEstadoOrdenCompra(data); } },
    recibir_orden_compra: { required: ['folio'], handler: function(data) { return recibirOrdenCompra(data); } },
    guardar_gasto: { required: [], handler: function(data) { return registerPayment(data); } },
    eliminar_gasto: { required: ['id'], handler: function(data) { return eliminarGasto(data); } },
    listar_gastos: {
      required: [],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return listarGastos(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    resumen_gastos: { required: [], handler: function(data) { return resumenGastos(data); } },
    resumen_finanzas: { required: [], handler: function(data) { return resumenFinanzas(data); } },
    reporte_operativo: { required: [], handler: function(data) { return reporteOperativo(data); } },
    listar_clientes: {
      required: [],
      handler: function(data) {
        const pag = parsePaginacion(data || {});
        return listarClientes(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    cliente: { required: ['id'], handler: function(data) { return getClienteById(data.id); } },
    guardar_cliente: { required: [], handler: function(data) { return guardarCliente(data); } },

    // Endpoints HUB central (SaaS).
    hub_dashboard_summary: { required: [], handler: function(data) { return getDashboardSummary(data); } },
    hub_operational_panel: { required: [], handler: function(data) { return getOperationalPanel(data); } },
    hub_technician_panel: {
      required: ['technicianId'],
      handler: function(data) { return getTechnicianPanel(data.technicianId); }
    },
    hub_client_panel: {
      required: ['clientId'],
      handler: function(data) { return getClientPanel(data.clientId); }
    }
  };
}
