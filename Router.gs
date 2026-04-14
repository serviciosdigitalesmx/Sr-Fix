/**
 * Router - dispatcher central de acciones (inicio de routing por capas).
 * Si una acción no está en rutas nuevas, cae en handler legacy para no romper compatibilidad.
 */

function Router_getGetRoutes() {
  return {
    status: {
      required: [],
      handler: function() { return Utils_ok(Service_getStatus()); }
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
