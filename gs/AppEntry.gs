/**
 * AppEntry - puntos de entrada del Web App de Apps Script.
 */

function doGet(e) {
  try {
    return AppEntry_dispatch(e, Router_dispatchGet);
  } catch (error) {
    logError('doGet', error, {});
    return Utils_fail(error && error.message ? error.message : String(error || 'Error'));
  }
}

function doPost(e) {
  try {
    return AppEntry_dispatch(e, Router_dispatchPost);
  } catch (error) {
    logError('doPost', error, {});
    return Utils_fail(error && error.message ? error.message : String(error || 'Error'));
  }
}

function AppEntry_dispatch(e, dispatcher) {
  const params = (e && e.parameter) ? e.parameter : {};
  const responseMode = String(params.responseMode || '').trim().toLowerCase();
  const result = dispatcher(e, function legacyHandler(legacyEvent) {
    if (String((legacyEvent && legacyEvent.parameter && legacyEvent.parameter.action) || '').trim() === 'status') {
      return Utils_ok(Service_getStatus());
    }
    return Utils_fail('Accion no soportada');
  });

  if (responseMode === 'redirect' && String(params.action || '').trim() === 'login_interno') {
    return AppEntry_redirectLoginResponse(result, params);
  }
  return result;
}

function AppEntry_redirectLoginResponse(result, params) {
  let body = {};
  try {
    body = JSON.parse(result.getContent ? result.getContent() : JSON.stringify(result || {}));
  } catch (e) {
    body = { success: false, error: 'Respuesta invalida del servidor' };
  }
  const returnUrl = String(params.returnUrl || '').trim() || 'https://serviciosdigitalesmx.github.io/Sr-Fix/integrador.html';
  const user = body && body.data && body.data.user ? body.data.user : null;
  const target = new URL(returnUrl);
  target.searchParams.set('srfix_login', body && body.success ? 'success' : 'error');
  if (body && body.success && user) {
    target.searchParams.set('srfix_login_user', encodeURIComponent(JSON.stringify(user)));
  } else if (body && body.error) {
    target.searchParams.set('srfix_login_error', encodeURIComponent(String(body.error)));
  }
  const html = HtmlService.createHtmlOutput(
    '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>' +
    '(function(){' +
    'window.top.location.replace(' + JSON.stringify(target.toString()) + ');' +
    '})();' +
    '</script>' +
    '</body></html>'
  );
  return html;
}
