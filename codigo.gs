/**
 * SRFIX CLOUD - Backend con Contraseñas
 * Google Apps Script + Google Sheets
 */

// ==========================================
// CONFIGURACIÓN
// ==========================================
const CONFIG = {
  SHEET_NAME: 'SRFIX_DATABASE',
  SCRIPT_PROP_KEYS: {
    TECNICO: 'SRFIX_PASSWORD_TECNICO',
    OPERATIVO: 'SRFIX_PASSWORD_OPERATIVO'
  },
  ESTADOS: ['Recibido', 'En Diagnóstico', 'En Reparación', 'Esperando Refacción', 'Listo', 'Entregado']
};

// ==========================================
// AUTO-CONFIGURACIÓN
// ==========================================

function inicializarSistema() {
  try {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      ss = SpreadsheetApp.create(CONFIG.SHEET_NAME);
      Logger.log('✅ Nuevo Spreadsheet creado: ' + ss.getUrl());
    }

    crearHojaSiNoExiste(ss, 'Equipos', [
      'ID', 'FOLIO', 'FECHA_INGRESO', 'CLIENTE_NOMBRE', 'CLIENTE_TELEFONO',
      'DISPOSITIVO', 'MODELO', 'FALLA_REPORTADA', 'ESTADO', 'TECNICO_ASIGNADO',
      'FECHA_PROMESA', 'FECHA_ENTREGA', 'COSTO_ESTIMADO', 'NOTAS_INTERNAS',
      'YOUTUBE_ID', 'CHECK_CARGADOR', 'CHECK_PANTALLA', 'CHECK_PRENDE', 'CHECK_RESPALDO'
    ]);

    crearHojaSiNoExiste(ss, 'Clientes', [
      'ID', 'NOMBRE', 'TELEFONO', 'EMAIL', 'FECHA_REGISTRO'
    ]);

    // Deja contraseñas de ejemplo si aún no existen.
    inicializarPasswordsPorDefecto();

    Logger.log('✅ Sistema listo. URL Web App: ' + ScriptApp.getService().getUrl());
    return { success: true, url: ScriptApp.getService().getUrl() };

  } catch (error) {
    Logger.log('❌ Error: ' + error);
    return { success: false, error: error.toString() };
  }
}

function crearHojaSiNoExiste(ss, nombre, headers) {
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#FFC107').setFontColor('#000');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function inicializarPasswordsPorDefecto() {
  const props = PropertiesService.getScriptProperties();
  const actual = props.getProperties();

  const updates = {};
  if (!actual[CONFIG.SCRIPT_PROP_KEYS.TECNICO]) updates[CONFIG.SCRIPT_PROP_KEYS.TECNICO] = 'SrFix123';
  if (!actual[CONFIG.SCRIPT_PROP_KEYS.OPERATIVO]) updates[CONFIG.SCRIPT_PROP_KEYS.OPERATIVO] = 'SrFix123';

  if (Object.keys(updates).length > 0) {
    props.setProperties(updates, false);
  }
}

function obtenerPasswords() {
  const props = PropertiesService.getScriptProperties();
  const tecnico = props.getProperty(CONFIG.SCRIPT_PROP_KEYS.TECNICO);
  const operativo = props.getProperty(CONFIG.SCRIPT_PROP_KEYS.OPERATIVO);

  if (!tecnico || !operativo) {
    throw new Error('Configura SRFIX_PASSWORD_TECNICO y SRFIX_PASSWORD_OPERATIVO en Script Properties');
  }

  return { tecnico: tecnico, operativo: operativo };
}

function configurarPasswords(tecnico, operativo) {
  if (!tecnico || !operativo) {
    throw new Error('Debes enviar ambas contraseñas');
  }

  PropertiesService.getScriptProperties().setProperties({
    [CONFIG.SCRIPT_PROP_KEYS.TECNICO]: String(tecnico),
    [CONFIG.SCRIPT_PROP_KEYS.OPERATIVO]: String(operativo)
  }, false);

  return { success: true };
}

// ==========================================
// API REST
// ==========================================

function doGet(e) {
  const action = e.parameter.action || 'status';

  try {
    switch(action) {
      case 'status':
        return jsonResponse({ status: 'online', version: '2.1.0' });
      case 'equipo':
        if (!e.parameter.folio) return jsonResponse({ error: 'Folio requerido' });
        return getEquipoByFolio(e.parameter.folio);
      default:
        return jsonResponse({ error: 'Acción no válida' });
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  try {
    const passwords = obtenerPasswords();

    // Verificar contraseñas según el módulo
    if (data.modulo === 'tecnico' && data.password !== passwords.tecnico) {
      return jsonResponse({ error: 'Acceso denegado' });
    }
    if (data.modulo === 'operativo' && data.password !== passwords.operativo) {
      return jsonResponse({ error: 'Acceso denegado' });
    }

    switch(action) {
      case 'crear_equipo':
        return crearEquipo(data);
      case 'actualizar_equipo':
        return actualizarEquipo(data);
      case 'semaforo':
        return getSemaforoData();
      default:
        return jsonResponse({ error: 'Acción no válida' });
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

// ==========================================
// LÓGICA DE NEGOCIO
// ==========================================

function getSemaforoData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');
  const datos = hoja.getDataRange().getValues();
  const headers = datos[0];

  const equipos = datos.slice(1)
    .filter(row => row[8] !== 'Entregado') // No entregados
    .map(row => {
      const eq = {};
      headers.forEach((h, i) => eq[h] = row[i]);

      const hoy = new Date();
      hoy.setHours(0,0,0,0);

      let promesa = null;
      if (eq['FECHA_PROMESA']) {
        promesa = new Date(eq['FECHA_PROMESA'] + 'T00:00:00');
      }

      let dias = 9999;
      if (promesa && !isNaN(promesa.getTime())) {
        promesa.setHours(0,0,0,0);
        dias = Math.ceil((promesa - hoy) / (1000 * 60 * 60 * 24));
      }

      let color = 'verde';
      if (dias <= 2) color = 'rojo';
      else if (dias <= 4) color = 'amarillo';

      return { ...eq, diasRestantes: dias, color: color };
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  return jsonResponse({
    total: equipos.length,
    urgentes: equipos.filter(e => e.color === 'rojo').length,
    atencion: equipos.filter(e => e.color === 'amarillo').length,
    aTiempo: equipos.filter(e => e.color === 'verde').length,
    equipos: equipos
  });
}

function getEquipoByFolio(folio) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');
  const datos = hoja.getDataRange().getValues();
  const headers = datos[0];

  const fila = datos.find(row => row[1] === folio);
  if (!fila) return jsonResponse({ error: 'No encontrado' });

  const equipo = {};
  headers.forEach((h, i) => equipo[h] = fila[i]);

  delete equipo.NOTAS_INTERNAS;
  delete equipo.COSTO_ESTIMADO;

  return jsonResponse({ equipo: equipo });
}

function crearEquipo(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');

  let folio;
  let existe;
  do {
    folio = 'SRF-' + Math.floor(1000 + Math.random() * 9000);
    const datos = hoja.getDataRange().getValues();
    existe = datos.some(row => row[1] === folio);
  } while (existe);

  const ahora = new Date().toISOString();

  hoja.appendRow([
    Utilities.getUuid(), folio, ahora, data.clienteNombre, data.clienteTelefono,
    data.dispositivo, data.modelo, data.falla, 'Recibido', 'Por asignar',
    data.fechaPromesa, '', data.costo || 0, '', '',
    data.checks?.cargador ? 'SÍ' : 'NO',
    data.checks?.pantalla ? 'SÍ' : 'NO',
    data.checks?.prende ? 'SÍ' : 'NO',
    data.checks?.respaldo ? 'SÍ' : 'NO'
  ]);

  if (data.clienteTelefono) {
    const hojaClientes = ss.getSheetByName('Clientes');
    const datosClientes = hojaClientes.getDataRange().getValues();
    const existeCliente = datosClientes.some(row => row[2] === data.clienteTelefono);
    if (!existeCliente) {
      hojaClientes.appendRow([
        Utilities.getUuid(),
        data.clienteNombre,
        data.clienteTelefono,
        data.clienteEmail || '',
        ahora
      ]);
    }
  }

  return jsonResponse({ success: true, folio: folio });
}

function actualizarEquipo(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName('Equipos');
  const datos = hoja.getDataRange().getValues();

  const filaIdx = datos.findIndex(row => row[1] === data.folio);
  if (filaIdx === -1) return jsonResponse({ error: 'No encontrado' });

  const fila = filaIdx + 1;
  const COL = {
    ESTADO: 9,
    TECNICO_ASIGNADO: 10,
    FECHA_ENTREGA: 12,
    NOTAS_INTERNAS: 14,
    YOUTUBE_ID: 15
  };

  const campos = data.campos || {};
  Object.keys(campos).forEach(k => {
    if (COL[k]) hoja.getRange(fila, COL[k]).setValue(campos[k]);
  });

  if (campos.ESTADO === 'Entregado') {
    hoja.getRange(fila, COL.FECHA_ENTREGA).setValue(new Date().toISOString());
  }

  return jsonResponse({ success: true });
}

// ==========================================
// FUNCIÓN CORREGIDA (SIN CABECERAS MANUALES)
// ==========================================
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
