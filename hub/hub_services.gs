/**
 * HUB Services v2.0 (Apps Script compatible)
 * Dashboard y paneles SaaS con normalización, memoización y manejo de errores.
 */

const HUB_RUNTIME_CONFIG = {
  LIMITS: {
    MAX_PAGE_SIZE: 1000,
    MAX_ALERTAS_STOCK: 300
  },
  CACHE_TTL_MS: 60000,
  DEFAULT_DATE_RANGE: {
    fechaDesde: (function() {
      const d = new Date();
      d.setDate(1);
      return d.toISOString().split('T')[0];
    })(),
    fechaHasta: new Date().toISOString().split('T')[0]
  }
};
let HUB_MEMO_VERSION = 1;

function hubToNumberSafe(value, defaultValue) {
  const fallback = defaultValue === undefined ? 0 : defaultValue;
  const num = Number(value);
  return isFinite(num) ? num : fallback;
}

function hubToStringSafe(value, defaultValue) {
  const fallback = defaultValue === undefined ? '' : defaultValue;
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function hubNormalizePhone(phone) {
  const raw = hubToStringSafe(phone);
  return raw.replace(/\D/g, '').replace(/^52/, '');
}

function hubExtractPayload(result, fallback) {
  try {
    const payload = ApiHelper_extractPayload(result);
    if (payload !== undefined && payload !== null) {
      if (payload && typeof payload === 'object' && payload.data !== undefined && payload.data !== null) {
        return payload.data;
      }
      return payload;
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
}

function hubWithErrorLogging(fnName, fn, fallback) {
  try {
    return fn();
  } catch (error) {
    LogHelper_error('HUB:' + fnName, error, {});
    return fallback;
  }
}

function hubMemoize(fn, ttlMs, resolver) {
  const cache = {};
  return function() {
    const args = Array.prototype.slice.call(arguments);
    const keyBase = resolver ? resolver.apply(null, args) : JSON.stringify(args);
    const key = HUB_MEMO_VERSION + '::' + keyBase;
    const now = Date.now();
    const cached = cache[key];
    if (cached && cached.expiresAt > now) return cached.value;
    const value = fn.apply(null, args);
    cache[key] = { value: value, expiresAt: now + ttlMs };
    return value;
  };
}

function hubResetMemoizedCaches() {
  HUB_MEMO_VERSION += 1;
  return {
    success: true,
    cacheVersion: HUB_MEMO_VERSION,
    updatedAt: new Date().toISOString()
  };
}

const getSemaforoDataMemoized = hubMemoize(function() {
  return hubExtractPayload(getSemaforoData({ page: 1, pageSize: HUB_RUNTIME_CONFIG.LIMITS.MAX_PAGE_SIZE }), {});
}, HUB_RUNTIME_CONFIG.CACHE_TTL_MS);

function getResumenFinanzas(params) {
  return hubExtractPayload(resumenFinanzas(params), {});
}

function getResumenGastos(params) {
  return hubExtractPayload(resumenGastos(params), {});
}

const getAlertasStockMemoized = hubMemoize(function(sucursalId) {
  return hubExtractPayload(obtenerAlertasStock({
    sucursalId: sucursalId,
    page: 1,
    pageSize: HUB_RUNTIME_CONFIG.LIMITS.MAX_ALERTAS_STOCK
  }), {});
}, HUB_RUNTIME_CONFIG.CACHE_TTL_MS, function(sucursalId) {
  return 'stock:' + sucursalId;
});

const getTareasMemoized = hubMemoize(function(sucursalId) {
  return hubExtractPayload(listarTareas({
    sucursalId: sucursalId,
    page: 1,
    pageSize: HUB_RUNTIME_CONFIG.LIMITS.MAX_PAGE_SIZE
  }), {});
}, HUB_RUNTIME_CONFIG.CACHE_TTL_MS, function(sucursalId) {
  return 'tareas:' + sucursalId;
});

function getDashboardSummary(params) {
  const fallback = {
    summary: {
      leads: 0,
      cotizaciones: 0,
      ordenesEntregadas: 0,
      ingresos: 0,
      gastos: 0,
      utilidad: 0,
      pendientes: 0,
      urgentes: 0
    },
    semaforo: {
      total: 0,
      urgentes: 0,
      atencion: 0,
      aTiempo: 0
    },
    actualizadoEn: new Date().toISOString()
  };

  return hubWithErrorLogging('getDashboardSummary', function() {
    const input = params || {};
    const safeParams = {
      fechaDesde: input.fechaDesde || HUB_RUNTIME_CONFIG.DEFAULT_DATE_RANGE.fechaDesde,
      fechaHasta: input.fechaHasta || HUB_RUNTIME_CONFIG.DEFAULT_DATE_RANGE.fechaHasta,
      sucursalId: input.sucursalId || ''
    };

    const finanzas = getResumenFinanzas(safeParams);
    const gastos = getResumenGastos(safeParams);
    const semaforo = getSemaforoDataMemoized();

    const ingresos = hubToNumberSafe(finanzas.ingresos);
    const gastosTotal = hubToNumberSafe(gastos.totalPeriodo);
    const utilidadRaw = hubToNumberSafe(finanzas.utilidad);
    const utilidadFinal = utilidadRaw !== 0 ? utilidadRaw : ingresos - gastosTotal;

    return {
      summary: {
        leads: hubToNumberSafe(finanzas.leadsGenerados),
        cotizaciones: hubToNumberSafe(finanzas.cotizacionesConvertidas),
        ordenesEntregadas: hubToNumberSafe(finanzas.ordenesEntregadas),
        ingresos: ingresos,
        gastos: gastosTotal,
        utilidad: utilidadFinal,
        pendientes: hubToNumberSafe(semaforo.total),
        urgentes: hubToNumberSafe(semaforo.urgentes)
      },
      semaforo: {
        total: hubToNumberSafe(semaforo.total),
        urgentes: hubToNumberSafe(semaforo.urgentes),
        atencion: hubToNumberSafe(semaforo.atencion),
        aTiempo: hubToNumberSafe(semaforo.aTiempo)
      },
      actualizadoEn: new Date().toISOString()
    };
  }, fallback);
}

function getOperationalPanel(params) {
  const fallback = {
    ordenes: [],
    alertas: {
      semaforoRojo: 0,
      semaforoAmarillo: 0,
      stockCritico: 0,
      stockBajo: 0
    },
    conteos: {
      totalOrdenes: 0,
      totalAlertasStock: 0
    },
    actualizadoEn: new Date().toISOString()
  };

  return hubWithErrorLogging('getOperationalPanel', function() {
    const input = params || {};
    const sucursalId = hubToStringSafe(input.sucursalId);
    const semaforo = getSemaforoDataMemoized();
    const alertasStock = getAlertasStockMemoized(sucursalId);

    const ordenes = Array.isArray(semaforo.equipos) ? semaforo.equipos.slice() : [];
    ordenes.sort(function(a, b) {
      return hubToNumberSafe(a && a.diasRestantes) - hubToNumberSafe(b && b.diasRestantes);
    });

    return {
      ordenes: ordenes,
      alertas: {
        semaforoRojo: hubToNumberSafe(semaforo.urgentes),
        semaforoAmarillo: hubToNumberSafe(semaforo.atencion),
        stockCritico: hubToNumberSafe(alertasStock.criticos),
        stockBajo: hubToNumberSafe(alertasStock.bajos)
      },
      conteos: {
        totalOrdenes: hubToNumberSafe(semaforo.total) || ordenes.length,
        totalAlertasStock: Array.isArray(alertasStock.productos) ? alertasStock.productos.length : 0
      },
      actualizadoEn: new Date().toISOString()
    };
  }, fallback);
}

function getTechnicianPanel(input) {
  const fallback = {
    technicianId: '',
    trabajosAsignados: [],
    agendaPendiente: [],
    indicadores: {
      totalTrabajos: 0,
      urgentes: 0,
      tareasPendientes: 0
    },
    actualizadoEn: new Date().toISOString()
  };

  return hubWithErrorLogging('getTechnicianPanel', function() {
    let rawTechnicianId = '';
    let sucursalId = '';

    if (typeof input === 'string' || typeof input === 'number') {
      rawTechnicianId = hubToStringSafe(input);
    } else {
      const obj = input || {};
      rawTechnicianId = hubToStringSafe(obj.technicianId !== undefined ? obj.technicianId : obj.tecnico);
      sucursalId = hubToStringSafe(obj.sucursalId);
    }

    const technicianId = rawTechnicianId.toLowerCase();
    if (!technicianId) return fallback;

    const semaforo = getSemaforoDataMemoized();
    const tareas = getTareasMemoized(sucursalId);

    const trabajosAsignados = (Array.isArray(semaforo.equipos) ? semaforo.equipos : []).filter(function(item) {
      return hubToStringSafe(item && item.TECNICO_ASIGNADO).toLowerCase() === technicianId;
    });

    const agendaPendiente = (Array.isArray(tareas.tareas) ? tareas.tareas : []).filter(function(t) {
      return hubToStringSafe(t && t.RESPONSABLE).toLowerCase() === technicianId;
    });

    const urgentesCount = trabajosAsignados.filter(function(t) {
      return hubToStringSafe(t && t.color).toLowerCase() === 'rojo';
    }).length;

    const tareasPendientesCount = agendaPendiente.filter(function(t) {
      return hubToStringSafe(t && t.ESTADO).toLowerCase() !== 'completada';
    }).length;

    return {
      technicianId: technicianId,
      trabajosAsignados: trabajosAsignados,
      agendaPendiente: agendaPendiente,
      indicadores: {
        totalTrabajos: trabajosAsignados.length,
        urgentes: urgentesCount,
        tareasPendientes: tareasPendientesCount
      },
      actualizadoEn: new Date().toISOString()
    };
  }, fallback);
}

function getClientPanel(input) {
  const fallback = {
    clientId: '',
    cliente: null,
    servicios: [],
    historial: [],
    actualizadoEn: new Date().toISOString()
  };

  return hubWithErrorLogging('getClientPanel', function() {
    let rawClientId = '';
    if (typeof input === 'string' || typeof input === 'number') {
      rawClientId = hubToStringSafe(input);
    } else {
      const obj = input || {};
      rawClientId = hubToStringSafe(obj.clientId !== undefined ? obj.clientId : obj.id);
    }

    if (!rawClientId) throw new Error('clientId requerido');
    const clientId = rawClientId;

    const clientePayload = hubExtractPayload(getClienteById(clientId), {});
    const cliente = clientePayload && clientePayload.cliente ? clientePayload.cliente : null;

    if (!cliente) {
      return {
        clientId: clientId,
        cliente: null,
        servicios: [],
        historial: [],
        actualizadoEn: new Date().toISOString()
      };
    }

    const telefonoCliente = hubNormalizePhone(cliente.TELEFONO);
    const equiposRaw = SheetsRepository_readObjects(HUB_CONFIG.SHEETS.EQUIPOS) || [];

    const equiposCliente = equiposRaw
      .map(function(raw) {
        const eq = normalizarEquipoForApi(raw);
        eq.CLIENTE_TELEFONO = hubNormalizePhone(eq.CLIENTE_TELEFONO);
        return eq;
      })
      .filter(function(eq) {
        return eq.CLIENTE_TELEFONO === telefonoCliente;
      })
      .sort(function(a, b) {
        return hubToStringSafe(b.FECHA_INGRESO).localeCompare(hubToStringSafe(a.FECHA_INGRESO));
      });

    const servicios = equiposCliente.map(function(eq) {
      return {
        folio: hubToStringSafe(eq.FOLIO),
        estado: hubToStringSafe(eq.ESTADO),
        fechaIngreso: hubToStringSafe(eq.FECHA_INGRESO),
        fechaPromesa: hubToStringSafe(eq.FECHA_PROMESA),
        equipo: [eq.DISPOSITIVO, eq.MODELO].filter(Boolean).join(' ').trim(),
        seguimiento: hubToStringSafe(eq.SEGUIMIENTO_CLIENTE)
      };
    });

    return {
      clientId: clientId,
      cliente: cliente,
      servicios: servicios,
      historial: servicios,
      actualizadoEn: new Date().toISOString()
    };
  }, fallback);
}
