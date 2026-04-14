/**
 * Validators - validaciones transversales.
 */

function Validators_requireAction(data) {
  const action = String(data && data.action || '').trim();
  if (!action) {
    return { ok: false, error: 'Action requerida' };
  }
  return { ok: true, action: action };
}

function Validators_requireFields(data, requiredFields) {
  const missing = (requiredFields || []).filter(function(field) {
    const val = data && data[field];
    return val === undefined || val === null || String(val).trim() === '';
  });
  if (missing.length) {
    return { ok: false, error: 'Campos requeridos: ' + missing.join(', '), missing: missing };
  }
  return { ok: true, missing: [] };
}
