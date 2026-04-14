/**
 * Logging centralizado para eventos HTTP y negocio.
 */
function LogHelper_event(tipo, payload) {
  try {
    const entry = {
      tipo: String(tipo || 'EVENT').trim().toUpperCase(),
      ts: new Date().toISOString(),
      payload: payload || {}
    };
    console.log(JSON.stringify(entry));
  } catch (e) {
    // No romper flujo por logging.
  }
}

function LogHelper_error(contexto, error, extra) {
  logError(contexto, error, extra || {});
}
