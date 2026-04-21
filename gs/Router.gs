/**
 * Router - dispatcher central de acciones (inicio de routing por capas).
 * Si una acción no está en rutas nuevas, cae en handler legacy para no romper compatibilidad.
 */

function Router_getPagination(input) {
  return parsePaginacion(input || {});
}

function Router_getGetRoutes() {
  return {
    status: {
      required: [],
      handler: function() { return Utils_ok(Service_getStatus()); }
    },
    obtener_config_seguridad: {
      required: [],
      handler: function() { return Service_obtenerConfigSeguridad(); }
    },
    listar_usuarios_internos: {
      required: [],
      handler: function() { return Service_listarUsuariosInternos(); }
    },
    validar_admin_password: {
      required: [],
      handler: function(params) { return Service_validarAdminPassword(params || {}); }
    },
    semaforo: {
      required: [],
      handler: function(params) { return getSemaforoData(Router_getPagination(params)); }
    },
    listar_solicitudes: {
      required: [],
      handler: function(params) {
        const pag = Router_getPagination(params);
        return Service_listarSolicitudes({ page: pag.page, pageSize: pag.pageSize });
      }
    },
    solicitud: {
      required: ['folio'],
      handler: function(params) { return Service_getSolicitudByFolio(params.folio); }
    },
    equipo: {
      required: ['folio'],
      handler: function(params) { return Service_getEquipoByFolio(params.folio); }
    },
    listar_sucursales: {
      required: [],
      handler: function(params) {
        const pag = Router_getPagination(params);
        return listarSucursales({
          texto: params.texto || '',
          soloActivas: params.soloActivas || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    listar_tareas: {
      required: [],
      handler: function(params) {
        const pag = Router_getPagination(params);
        return Service_listarTareas(Object.assign({}, params || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    tarea: {
      required: ['folio'],
      handler: function(params) { return Service_getTareaByFolio(params.folio); }
    },
    listar_productos: {
      required: [],
      handler: function(params) {
        const pag = Router_getPagination(params);
        return Service_listarProductos({
          texto: params.texto || '',
          categoria: params.categoria || '',
          marca: params.marca || '',
          proveedor: params.proveedor || '',
          estatus: params.estatus || '',
          nivelAlerta: params.nivelAlerta || '',
          soloAlertas: params.soloAlertas || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    obtener_alertas_stock: {
      required: [],
      handler: function(params) {
        const pag = Router_getPagination(params);
        return Service_obtenerAlertasStock({
          texto: params.texto || '',
          categoria: params.categoria || '',
          marca: params.marca || '',
          proveedor: params.proveedor || '',
          nivelAlerta: params.nivelAlerta || '',
          estatus: params.estatus || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    listar_proveedores: {
      required: [],
      handler: function(params) {
        const pag = Router_getPagination(params);
        return Service_listarProveedores(Object.assign({}, params || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    proveedor: {
      required: ['id'],
      handler: function(params) { return Service_getProveedorById(params.id); }
    },
    listar_nombres_proveedores: {
      required: [],
      handler: function() { return Service_listarNombresProveedores(); }
    },
    listar_folios_relacion: {
      required: [],
      handler: function() { return Service_listarFoliosRelacion(); }
    },
    listar_ordenes_compra: {
      required: [],
      handler: function(params) {
        const pag = Router_getPagination(params);
        return Service_listarOrdenesCompra(Object.assign({}, params || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    listar_compras: {
      required: [],
      handler: function(params) {
        const pag = Router_getPagination(params);
        return Service_listarCompras(Object.assign({}, params || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    orden_compra: {
      required: ['folio'],
      handler: function(params) { return Service_getOrdenCompraByFolio(params.folio); }
    },
    listar_gastos: {
      required: [],
      handler: function(params) {
        const pag = Router_getPagination(params);
        return Service_listarGastos({
          fechaDesde: params.fechaDesde || '',
          fechaHasta: params.fechaHasta || '',
          tipo: params.tipo || '',
          categoria: params.categoria || '',
          sucursalId: params.sucursalId || '',
          texto: params.texto || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    resumen_gastos: {
      required: [],
      handler: function(params) {
        return Service_resumenGastos({
          fechaDesde: params.fechaDesde || '',
          fechaHasta: params.fechaHasta || '',
          sucursalId: params.sucursalId || ''
        });
      }
    },
    resumen_finanzas: {
      required: [],
      handler: function(params) {
        return Service_resumenFinanzas({
          fechaDesde: params.fechaDesde || '',
          fechaHasta: params.fechaHasta || '',
          sucursalId: params.sucursalId || ''
        });
      }
    },
    listar_clientes: {
      required: [],
      handler: function(params) {
        const pag = Router_getPagination(params);
        return Service_listarClientes({
          texto: params.texto || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    cliente: {
      required: ['id'],
      handler: function(params) { return Service_getClienteById(params.id); }
    },
    listar_archivo: {
      required: [],
      handler: function(params) {
        const pag = Router_getPagination(params);
        return Service_listarArchivo({
          tipo: params.tipo || 'todos',
          from: params.from || params.fechaDesde || '',
          to: params.to || params.fechaHasta || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    detalle_archivo: {
      required: ['tipo', 'folio'],
      handler: function(params) { return Service_getArchivoDetalle(params || {}); }
    },
    hub_dashboard_summary: {
      required: [],
      handler: function(params) { return jsonResponse(Service_getDashboardSummary(params || {})); }
    },
    hub_operational_panel: {
      required: [],
      handler: function(params) { return jsonResponse(Service_getOperationalPanel(params || {})); }
    },
    hub_technician_panel: {
      required: ['technicianId'],
      handler: function(params) { return jsonResponse(Service_getTechnicianPanel(params || {})); }
    },
    hub_client_panel: {
      required: ['clientId'],
      handler: function(params) { return jsonResponse(Service_getClientPanel(params || {})); }
    }
  };
}

function Router_getPostRoutes() {
  return {
    login_interno: {
      required: ['usuario', 'password'],
      handler: function(data) { return Service_loginInterno(data || {}); }
    },
    obtener_config_seguridad: {
      required: [],
      handler: function(data) { return Service_obtenerConfigSeguridad(); }
    },
    listar_usuarios_internos: {
      required: [],
      handler: function(data) { return Service_listarUsuariosInternos(); }
    },
    guardar_config_seguridad: {
      required: ['adminPasswordActual'],
      handler: function(data) { return Service_guardarConfigSeguridad(data || {}); }
    },
    guardar_usuario_interno: {
      required: ['adminPasswordActual', 'usuario'],
      handler: function(data) { return Service_guardarUsuarioInterno(data || {}); }
    },
    validar_admin_password: {
      required: [],
      handler: function(data) { return Service_validarAdminPassword(data || {}); }
    },
    crear_solicitud: {
      required: [],
      handler: function(data) { return Service_crearSolicitud(data || {}); }
    },
    archivar_solicitud: {
      required: ['folio'],
      handler: function(data) { return Service_archivarSolicitud(data || {}); }
    },
    archivar_cotizacion: {
      required: ['folio'],
      handler: function(data) { return Service_archivarCotizacion(data || {}); }
    },
    reabrir_archivo: {
      required: ['tipo', 'folio', 'adminPasswordActual'],
      handler: function(data) { return Service_reabrirArchivo(data || {}); }
    },
    crear_tarea: {
      required: [],
      handler: function(data) { return Service_crearTarea(data || {}); }
    },
    actualizar_tarea: {
      required: ['folio'],
      handler: function(data) { return Service_actualizarTarea(data || {}); }
    },
    tarea: {
      required: ['folio'],
      handler: function(data) { return Service_getTareaByFolio(data.folio); }
    },
    guardar_producto: {
      required: [],
      handler: function(data) { return Service_guardarProducto(data || {}); }
    },
    eliminar_producto: {
      required: ['sku'],
      handler: function(data) { return Service_eliminarProducto(data || {}); }
    },
    guardar_proveedor: {
      required: [],
      handler: function(data) { return Service_guardarProveedor(data || {}); }
    },
    eliminar_proveedor: {
      required: ['id'],
      handler: function(data) { return Service_eliminarProveedor(data || {}); }
    },
    guardar_gasto: {
      required: [],
      handler: function(data) { return Service_guardarGasto(data || {}); }
    },
    eliminar_gasto: {
      required: ['id'],
      handler: function(data) { return Service_eliminarGasto(data || {}); }
    },
    guardar_cliente: {
      required: [],
      handler: function(data) { return Service_guardarCliente(data || {}); }
    },
    listar_sucursales: {
      required: [],
      handler: function(data) {
        const pag = Router_getPagination(data);
        return listarSucursales({
          texto: data.texto || '',
          soloActivas: data.soloActivas || '',
          page: pag.page,
          pageSize: pag.pageSize
        });
      }
    },
    semaforo: {
      required: [],
      handler: function(data) { return getSemaforoData(Router_getPagination(data)); }
    },
    listar_solicitudes: {
      required: [],
      handler: function(data) {
        const pag = Router_getPagination(data);
        return Service_listarSolicitudes({ page: pag.page, pageSize: pag.pageSize });
      }
    },
    solicitud: {
      required: ['folio'],
      handler: function(data) { return Service_getSolicitudByFolio(data.folio); }
    },
    crear_equipo: {
      required: [],
      handler: function(data) { return Service_crearEquipo(data || {}); }
    },
    actualizar_equipo: {
      required: ['folio'],
      handler: function(data) { return Service_actualizarEquipo(data || {}); }
    },
    listar_tareas: {
      required: [],
      handler: function(data) {
        const pag = Router_getPagination(data);
        return Service_listarTareas(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    listar_productos: {
      required: [],
      handler: function(data) {
        const pag = Router_getPagination(data);
        return Service_listarProductos(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    obtener_alertas_stock: {
      required: [],
      handler: function(data) {
        const pag = Router_getPagination(data);
        return Service_obtenerAlertasStock(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    listar_proveedores: {
      required: [],
      handler: function(data) {
        const pag = Router_getPagination(data);
        return Service_listarProveedores(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    proveedor: {
      required: ['id'],
      handler: function(data) { return Service_getProveedorById(data.id); }
    },
    listar_nombres_proveedores: {
      required: [],
      handler: function() { return Service_listarNombresProveedores(); }
    },
    listar_folios_relacion: {
      required: [],
      handler: function() { return Service_listarFoliosRelacion(); }
    },
    listar_ordenes_compra: {
      required: [],
      handler: function(data) {
        const pag = Router_getPagination(data);
        return Service_listarOrdenesCompra(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    listar_compras: {
      required: [],
      handler: function(data) {
        const pag = Router_getPagination(data);
        return Service_listarCompras(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    orden_compra: {
      required: ['folio'],
      handler: function(data) { return Service_getOrdenCompraByFolio(data.folio); }
    },
    listar_gastos: {
      required: [],
      handler: function(data) {
        const pag = Router_getPagination(data);
        return Service_listarGastos(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    resumen_gastos: {
      required: [],
      handler: function(data) { return Service_resumenGastos(data || {}); }
    },
    resumen_finanzas: {
      required: [],
      handler: function(data) { return Service_resumenFinanzas(data || {}); }
    },
    listar_clientes: {
      required: [],
      handler: function(data) {
        const pag = Router_getPagination(data);
        return Service_listarClientes(Object.assign({}, data || {}, { page: pag.page, pageSize: pag.pageSize }));
      }
    },
    cliente: {
      required: ['id'],
      handler: function(data) { return Service_getClienteById(data.id); }
    },
    hub_dashboard_summary: {
      required: [],
      handler: function(data) { return jsonResponse(Service_getDashboardSummary(data || {})); }
    },
    hub_operational_panel: {
      required: [],
      handler: function(data) { return jsonResponse(Service_getOperationalPanel(data || {})); }
    },
    hub_technician_panel: {
      required: ['technicianId'],
      handler: function(data) { return jsonResponse(Service_getTechnicianPanel(data || {})); }
    },
    hub_client_panel: {
      required: ['clientId'],
      handler: function(data) { return jsonResponse(Service_getClientPanel(data || {})); }
    }
  };
}

function Router_dispatchGet(e, legacyHandler) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = String(params.action || 'status').trim();
  const route = Router_getGetRoutes()[action];

  if (!route) {
    return legacyHandler(e);
  }

  const required = Validators_requireFields(params, route.required || []);
  if (!required.ok) return Utils_fail(required.error);

  try {
    return route.handler(params);
  } catch (error) {
    logError('Router_dispatchGet', error, { action: action });
    return Utils_fail(error && error.message ? error.message : String(error || 'Error'));
  }
}

function Router_dispatchPost(e, legacyHandler) {
  const data = parsePostData(e);
  const actionCheck = Validators_requireAction(data);
  if (!actionCheck.ok) return Utils_fail(actionCheck.error);

  const action = actionCheck.action;
  const route = Router_getPostRoutes()[action];

  if (!route) {
    return legacyHandler(e);
  }

  const required = Validators_requireFields(data, route.required || []);
  if (!required.ok) return Utils_fail(required.error);

  try {
    return route.handler(data);
  } catch (error) {
    logError('Router_dispatchPost', error, { action: action });
    return Utils_fail(error && error.message ? error.message : String(error || 'Error'));
  }
}
