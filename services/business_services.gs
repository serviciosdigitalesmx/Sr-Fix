/**
 * Services (lógica de negocio) desacoplados del transporte HTTP.
 * Mantiene compatibilidad delegando a funciones legacy ya existentes.
 */

function createLead(input) {
  return crearSolicitud(input || {});
}

function qualifyLead(input) {
  // En implementación legacy la calificación/cierre fluye por archivo de solicitud.
  return archivarSolicitud(input || {});
}

function generateQuote(input) {
  return archivarCotizacion(input || {});
}

function bookAppointment(input) {
  // En implementación legacy la agenda operativa vive en Tareas.
  return crearTarea(input || {});
}

function registerPayment(input) {
  // Flujo de pagos legado centralizado en finanzas/gastos.
  // Se mantiene sin alterar reglas de negocio existentes.
  return guardarGasto(input || {});
}

function getDashboardData(input) {
  return getDashboardSummary(input || {});
}

function getTechnicianView(input) {
  return getTechnicianPanel(input || {});
}

function getClientView(input) {
  return getClientPanel(input || {});
}
