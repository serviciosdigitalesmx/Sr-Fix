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
