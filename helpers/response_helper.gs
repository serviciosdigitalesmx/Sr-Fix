/**
 * Helpers de respuesta estandarizada para API HUB.
 * Mantiene compatibilidad agregando success/data/error sin romper payload legacy.
 */
function ApiHelper_extractPayload(result) {
  if (result == null) return null;

  if (typeof result.getContent === 'function') {
    const raw = String(result.getContent() || '').trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { raw: raw };
    }
  }

  if (typeof result === 'string') {
    const txt = result.trim();
    if (!txt) return null;
    try {
      return JSON.parse(txt);
    } catch (e) {
      return { raw: txt };
    }
  }

  if (typeof result === 'object') return result;
  return { value: result };
}

function ApiHelper_envelope(payload) {
  const base = payload && typeof payload === 'object' ? payload : { value: payload };

  const alreadyHasEnvelope = Object.prototype.hasOwnProperty.call(base, 'success')
    && Object.prototype.hasOwnProperty.call(base, 'data')
    && Object.prototype.hasOwnProperty.call(base, 'error');

  if (alreadyHasEnvelope) return base;

  if (base && base.error) {
    return Object.assign({
      success: false,
      data: null,
      error: String(base.error || 'Error no especificado')
    }, base);
  }

  return Object.assign({
    success: true,
    data: base,
    error: null
  }, base || {});
}

function ApiHelper_toJsonOutput(result) {
  const payload = ApiHelper_extractPayload(result);
  const envelope = ApiHelper_envelope(payload);
  return jsonResponse(envelope);
}

function ApiHelper_validateRequired(input, requiredFields) {
  const data = input || {};
  const missing = (requiredFields || []).filter(function(field) {
    const value = data[field];
    return value === undefined || value === null || String(value).trim() === '';
  });
  return {
    ok: missing.length === 0,
    missing: missing
  };
}
