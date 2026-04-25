type OperativoRequestMethod = 'GET' | 'POST';

interface OperativoBackendEnvelope {
  success?: boolean;
  error?: string | null;
}

type OperativoGuardarResponse = SrFix.OperativoGuardarResponse;
type SolicitudLookupResponse = SrFix.SolicitudLookupResponse;

interface OperativoDraftCotizacionItem {
  concepto: string;
  cantidad: number;
  precio: number;
}

interface InternalUserRecord {
  ROL?: string;
  [key: string]: unknown;
}

const API_URL = String(CONFIG.API_URL || '').trim();
const FRONT_PASSWORD = String(CONFIG.FRONT_PASSWORD || 'Admin1').trim();
const OPERATIVO_IVA_RATE = 0.16;
const DEFAULT_LOGIN_BUTTON_HTML = '<span>INGRESAR</span>';
const DEFAULT_GUARDAR_BUTTON_HTML = '<i class="fa-solid fa-save"></i> Guardar Orden';

const elLoginScreen = operativoRequireElement<HTMLDivElement>('login-screen');
const elApp = operativoRequireElement<HTMLDivElement>('app');
const elFechaActual = operativoRequireElement<HTMLSpanElement>('fecha-actual');
const elPasswordInput = operativoRequireElement<HTMLInputElement>('password-input');
const elRememberMe = operativoRequireElement<HTMLInputElement>('remember-me');
const elBtnLogin = operativoRequireElement<HTMLButtonElement>('btn-login');
const elLoginError = operativoRequireElement<HTMLParagraphElement>('login-error');
const elFolioCotizacionInput = operativoRequireElement<HTMLInputElement>('folio-cotizacion-input');
const elFolioCotizacionMsg = operativoRequireElement<HTMLParagraphElement>('folio-cotizacion-msg');
const elClienteNombre = operativoRequireElement<HTMLInputElement>('cliente-nombre');
const elClienteTelefono = operativoRequireElement<HTMLInputElement>('cliente-telefono');
const elClienteEmail = operativoRequireElement<HTMLInputElement>('cliente-email');
const elEquipoTipo = operativoRequireElement<HTMLSelectElement>('equipo-tipo');
const elEquipoModelo = operativoRequireElement<HTMLInputElement>('equipo-modelo');
const elEquipoFalla = operativoRequireElement<HTMLTextAreaElement>('equipo-falla');
const elFechaPromesa = operativoRequireElement<HTMLInputElement>('fecha-promesa');
const elCosto = operativoRequireElement<HTMLInputElement>('costo');
const elNotasExtra = operativoRequireElement<HTMLInputElement>('notas-extra');
const elChkCargador = operativoRequireElement<HTMLInputElement>('chk-cargador');
const elChkPantalla = operativoRequireElement<HTMLInputElement>('chk-pantalla');
const elChkPrende = operativoRequireElement<HTMLInputElement>('chk-prende');
const elChkRespaldo = operativoRequireElement<HTMLInputElement>('chk-respaldo');
const elFotoRecepcion = operativoRequireElement<HTMLInputElement>('foto-recepcion');
const elFotoPreviewWrap = operativoRequireElement<HTMLDivElement>('foto-preview-wrap');
const elFotoPreview = operativoRequireElement<HTMLImageElement>('foto-preview');
const elStep1 = operativoRequireElement<HTMLDivElement>('step-1');
const elStep2 = operativoRequireElement<HTMLDivElement>('step-2');
const elStep3 = operativoRequireElement<HTMLDivElement>('step-3');
const elStep1Ind = operativoRequireElement<HTMLDivElement>('step-1-ind');
const elStep2Ind = operativoRequireElement<HTMLDivElement>('step-2-ind');
const elStep3Ind = operativoRequireElement<HTMLDivElement>('step-3-ind');
const elResCliente = operativoRequireElement<HTMLSpanElement>('res-cliente');
const elResTelefono = operativoRequireElement<HTMLSpanElement>('res-telefono');
const elResEmail = operativoRequireElement<HTMLSpanElement>('res-email');
const elResEquipo = operativoRequireElement<HTMLSpanElement>('res-equipo');
const elResFalla = operativoRequireElement<HTMLSpanElement>('res-falla');
const elResChecklist = operativoRequireElement<HTMLSpanElement>('res-checklist');
const elResFoto = operativoRequireElement<HTMLSpanElement>('res-foto');
const elResFecha = operativoRequireElement<HTMLSpanElement>('res-fecha');
const elResCosto = operativoRequireElement<HTMLSpanElement>('res-costo');
const elBtnGuardar = operativoRequireElement<HTMLButtonElement>('btn-guardar');
const elExito = operativoRequireElement<HTMLDivElement>('exito');
const elFolioGenerado = operativoRequireElement<HTMLSpanElement>('folio-generado');
const elWhatsappLink = operativoRequireElement<HTMLAnchorElement>('whatsapp-link');
const elToast = operativoRequireElement<HTMLDivElement>('toast');
const elToastMessage = operativoRequireElement<HTMLSpanElement>('toast-message');

let password = '';
let fotoRecepcionBase64 = '';
let ultimaOrdenRegistrada: SrFix.OperativoOrdenRegistrada | null = null;
let folioSolicitudOrigen = '';
let loginEnCurso = false;
let fechaTimer: number | null = null;
let toastTimer: number | null = null;

function operativoRequireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Elemento no encontrado: ${id}`);
  }
  return el as T;
}

function operativoGetBackendUrl(): string {
  return API_URL;
}

function operativoBuildGetUrl(action: string, payload: Record<string, unknown> = {}): string {
  const params = new URLSearchParams();
  params.set('action', action);
  params.set('t', String(Date.now()));
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'object') {
      params.set(key, JSON.stringify(value));
      return;
    }
    params.set(key, String(value));
  });
  return `${operativoGetBackendUrl()}?${params.toString()}`;
}

async function operativoReadJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Respuesta vacía (${response.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta inválida (${response.status}): ${text.slice(0, 180)}`);
  }
}

function backendErrorMessage(data: OperativoBackendEnvelope): string {
  const errorText = typeof data.error === 'string' ? data.error.trim() : '';
  if (errorText) return errorText;
  if (data.success === false) return 'La operación fue rechazada';
  return '';
}

function operativoCanRetryAsGet(action: string): boolean {
  return !/^(guardar_|registrar_|eliminar_|archivar_|transferir_|recibir_|cambiar_|login_|validar_|crear_|reabrir_)/.test(String(action || '').trim().toLowerCase());
}

async function operativoRequestBackend<T, P extends object = Record<string, unknown>>(
  action: string,
  payload: P = {} as P,
  method: OperativoRequestMethod = 'POST'
): Promise<T> {
  const requestGet = (): Promise<Response> => fetch(operativoBuildGetUrl(action, payload as Record<string, unknown>), { method: 'GET' });
  const requestPost = (): Promise<Response> => fetch(operativoGetBackendUrl(), {
    method: 'POST',
    body: JSON.stringify({ action, ...(payload as Record<string, unknown>) })
  });

  try {
    const response = method === 'GET' ? await requestGet() : await requestPost();
    const data = await operativoReadJson<T & OperativoBackendEnvelope>(response);
    const errorText = backendErrorMessage(data);
    if (errorText) {
      throw new Error(errorText);
    }
    return data as T;
  } catch (error) {
    if (method !== 'POST' || !operativoCanRetryAsGet(action)) throw error;
    const response = await requestGet();
    const data = await operativoReadJson<T & OperativoBackendEnvelope>(response);
    const errorText = backendErrorMessage(data);
    if (errorText) {
      throw new Error(errorText);
    }
    return data as T;
  }
}

async function operativoRequestBackendWithRetry<T, P extends object = Record<string, unknown>>(
  action: string,
  payload: P = {} as P,
  method: OperativoRequestMethod = 'POST',
  maxAttempts = 2
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operativoRequestBackend<T, P>(action, payload, method);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        await new Promise(resolve => window.setTimeout(resolve, 350));
      }
    }
  }
  throw lastError || new Error('Error de conexión');
}

function readInternalUser(): InternalUserRecord | null {
  try {
    const raw = sessionStorage.getItem('srfix_auth_user') || localStorage.getItem('srfix_auth_user');
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as InternalUserRecord;
  } catch {
    return null;
  }
}

function isEmbeddedIntegratorAccess(): boolean {
  try {
    if (window.parent === window) return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('integrador') === '1') return true;
    const parentHref = String((window.parent.location && window.parent.location.href) || '');
    return /integrador\.html/i.test(parentHref);
  } catch {
    return false;
  }
}

function hasOperativoAccess(): boolean {
  if (isEmbeddedIntegratorAccess()) return true;
  const user = readInternalUser();
  if (!user) return false;
  const rol = String(user.ROL || '').toLowerCase();
  return ['admin', 'operativo', 'supervisor'].includes(rol);
}

function formatearFechaHoraLarga(date = new Date()): string {
  return date.toLocaleString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function actualizarFechaActual(): void {
  const texto = formatearFechaHoraLarga();
  elFechaActual.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
}

function setLoginButtonLoading(loading: boolean): void {
  elBtnLogin.disabled = loading;
  elBtnLogin.innerHTML = loading
    ? '<div class="loading-spinner w-5 h-5"></div> Verificando...'
    : DEFAULT_LOGIN_BUTTON_HTML;
}

function setGuardarButtonLoading(loading: boolean): void {
  elBtnGuardar.disabled = loading;
  elBtnGuardar.innerHTML = loading
    ? '<div class="loading-spinner w-5 h-5"></div> Guardando...'
    : DEFAULT_GUARDAR_BUTTON_HTML;
}

function mostrarErrorLogin(msg: string): void {
  elLoginError.textContent = msg;
  elLoginError.classList.remove('hidden');
}

function ocultarErrorLogin(): void {
  elLoginError.classList.add('hidden');
}

function mostrarToast(mensaje: string, tipo: 'success' | 'error' | 'info' = 'success'): void {
  elToastMessage.textContent = mensaje;
  elToast.classList.remove('translate-y-20', 'opacity-0');
  elToast.classList.add('translate-y-0', 'opacity-100');
  elToast.style.borderLeftColor = tipo === 'error' ? '#ef4444' : '#FF6A2A';
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
  }
  toastTimer = window.setTimeout(() => {
    elToast.classList.add('translate-y-20', 'opacity-0');
    elToast.classList.remove('translate-y-0', 'opacity-100');
  }, 3000);
}

function guardarBorradorLocal(): void {
  const datos: SrFix.OperativoDraft = {
    folioCotizacion: elFolioCotizacionInput.value ? elFolioCotizacionInput.value : '',
    clienteNombre: elClienteNombre.value,
    clienteTelefono: elClienteTelefono.value,
    clienteEmail: elClienteEmail.value,
    equipoTipo: elEquipoTipo.value,
    equipoModelo: elEquipoModelo.value,
    equipoFalla: elEquipoFalla.value,
    fechaPromesa: elFechaPromesa.value ? elFechaPromesa.value : '',
    costo: elCosto.value,
    notasExtra: elNotasExtra.value,
    checks: {
      cargador: elChkCargador.checked,
      pantalla: elChkPantalla.checked,
      prende: elChkPrende.checked,
      respaldo: elChkRespaldo.checked
    },
    fotoAdjunta: !!fotoRecepcionBase64
  };
  localStorage.setItem('srfix_borrador_orden', JSON.stringify(datos));
}

function cargarBorradorLocal(): void {
  const guardado = localStorage.getItem('srfix_borrador_orden');
  if (!guardado) return;
  try {
    const datos = JSON.parse(guardado) as Partial<SrFix.OperativoDraft> & { checks?: Partial<SrFix.ReceptionChecklist> };
    elFolioCotizacionInput.value = String(datos.folioCotizacion || '').toUpperCase();
    elClienteNombre.value = String(datos.clienteNombre || '');
    elClienteTelefono.value = String(datos.clienteTelefono || '');
    elClienteEmail.value = String(datos.clienteEmail || '');
    elEquipoTipo.value = String(datos.equipoTipo || '');
    elEquipoModelo.value = String(datos.equipoModelo || '');
    elEquipoFalla.value = String(datos.equipoFalla || '');
    elFechaPromesa.value = String(datos.fechaPromesa || '');
    elCosto.value = String(datos.costo || '');
    elNotasExtra.value = String(datos.notasExtra || '');
    elChkCargador.checked = !!datos.checks?.cargador;
    elChkPantalla.checked = !!datos.checks?.pantalla;
    elChkPrende.checked = !!datos.checks?.prende;
    elChkRespaldo.checked = !!datos.checks?.respaldo;
    fotoRecepcionBase64 = '';
    elFotoPreviewWrap.classList.add('hidden');
  } catch {
    // Se ignora borrador corrupto.
  }
}

function setMensajeFolio(texto = '', tipo: 'info' | 'success' | 'error' = 'info'): void {
  elFolioCotizacionMsg.textContent = texto;
  elFolioCotizacionMsg.classList.remove('text-[#8A8F95]', 'text-red-400', 'text-green-400');
  if (tipo === 'error') {
    elFolioCotizacionMsg.classList.add('text-red-400');
  } else if (tipo === 'success') {
    elFolioCotizacionMsg.classList.add('text-green-400');
  } else {
    elFolioCotizacionMsg.classList.add('text-[#8A8F95]');
  }
}

function normalizarTelefono10(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length === 10 ? digits : '';
}

function resolverTipoDispositivo(valorSolicitud: string): string {
  const raw = String(valorSolicitud || '').trim();
  if (!raw) return '';
  const v = raw.toLowerCase();
  if (v.includes('smart') || v.includes('cel') || v.includes('phone') || v.includes('movil')) return 'Smartphone';
  if (v.includes('tablet') || v.includes('ipad')) return 'Tablet';
  if (v.includes('lap') || v.includes('notebook') || v.includes('macbook') || v.includes('surface')) return 'Laptop';
  if (v.includes('pc') || v.includes('comput') || v.includes('desktop')) return 'Computadora';
  return 'Otro';
}

function mostrarError(elementId: string, mensaje: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = mensaje;
  el.classList.remove('hidden');
}

function validarPaso1(): boolean {
  let ok = true;
  const nombre = elClienteNombre.value.trim();
  const tel = normalizarTelefono10(elClienteTelefono.value);

  document.querySelectorAll('#step-1 .error-message, #step-1 .input-error').forEach((node) => {
    const el = node as HTMLElement;
    if (el.classList.contains('error-message')) {
      el.classList.add('hidden');
    } else {
      el.classList.remove('input-error');
    }
  });

  if (!nombre) {
    mostrarError('error-nombre', 'El nombre es obligatorio');
    elClienteNombre.classList.add('input-error');
    ok = false;
  }
  if (!tel) {
    mostrarError('error-telefono', 'Teléfono debe tener exactamente 10 dígitos');
    elClienteTelefono.classList.add('input-error');
    ok = false;
  }
  return ok;
}

function validarPaso2(): boolean {
  let ok = true;
  const tipo = elEquipoTipo.value;
  const modelo = elEquipoModelo.value.trim();
  const falla = elEquipoFalla.value.trim();
  const fecha = elFechaPromesa.value;

  document.querySelectorAll('#step-2 .error-message, #step-2 .input-error').forEach((node) => {
    const el = node as HTMLElement;
    if (el.classList.contains('error-message')) {
      el.classList.add('hidden');
    } else {
      el.classList.remove('input-error');
    }
  });

  if (!tipo) {
    mostrarError('error-tipo', 'Selecciona tipo de dispositivo');
    elEquipoTipo.classList.add('input-error');
    ok = false;
  }
  if (!modelo) {
    mostrarError('error-modelo', 'Completa marca y modelo');
    elEquipoModelo.classList.add('input-error');
    ok = false;
  }
  if (!falla) {
    mostrarError('error-falla', 'Describe la falla reportada');
    elEquipoFalla.classList.add('input-error');
    ok = false;
  }
  if (!fecha) {
    mostrarError('error-fecha', 'Selecciona fecha de entrega');
    elFechaPromesa.classList.add('input-error');
    ok = false;
  } else {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaSel = new Date(`${fecha}T00:00:00`);
    if (fechaSel < hoy) {
      mostrarError('error-fecha', 'La fecha no puede ser anterior a hoy');
      elFechaPromesa.classList.add('input-error');
      ok = false;
    }
  }
  return ok;
}

function irPaso(paso: number): void {
  if (paso === 2 && !validarPaso1()) return;
  if (paso === 3 && !validarPaso2()) return;
  if (paso === 3) actualizarResumen();

  [elStep1, elStep2, elStep3].forEach((section) => section.classList.add('hidden'));
  const nextSection = document.getElementById(`step-${paso}`);
  if (nextSection) {
    nextSection.classList.remove('hidden');
  }

  for (let i = 1; i <= 3; i += 1) {
    const ind = document.getElementById(`step-${i}-ind`);
    if (!ind) continue;
    if (i < paso) {
      ind.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold step-completed transition-all';
      ind.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
    } else if (i === paso) {
      ind.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold step-active transition-all';
      ind.textContent = String(i);
    } else {
      ind.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold step-inactive transition-all';
      ind.textContent = String(i);
    }
  }
}

async function cargarDesdeFolioCotizacion(): Promise<void> {
  const folio = String(elFolioCotizacionInput.value || '').trim().toUpperCase();
  if (!folio) {
    setMensajeFolio('Ingresa un folio de cotización.', 'error');
    return;
  }

  setMensajeFolio('Buscando solicitud...');
  try {
    const data = await operativoRequestBackend<SolicitudLookupResponse>('solicitud', { folio }, 'GET');
    if (!data || data.error || !data.solicitud) {
      throw new Error(data?.error || 'No se encontró la solicitud');
    }

    const s = data.solicitud;
    const estadoSolicitud = String(s.ESTADO || '').toLowerCase();
    if (estadoSolicitud && estadoSolicitud !== 'pendiente') {
      setMensajeFolio(`La solicitud ${folio} está en estado "${s.ESTADO}". Se cargó solo como referencia.`, 'info');
    }
    elClienteNombre.value = s.NOMBRE || '';
    elClienteTelefono.value = s.TELEFONO || '';
    elClienteEmail.value = s.EMAIL || '';
    elEquipoTipo.value = resolverTipoDispositivo(s.DISPOSITIVO);
    elEquipoModelo.value = s.MODELO || '';
    elEquipoFalla.value = s.DESCRIPCION || s.PROBLEMAS || '';

    if (elNotasExtra && !String(elNotasExtra.value || '').trim()) {
      elNotasExtra.value = `Origen solicitud: ${folio}`;
    }

    folioSolicitudOrigen = folio;
    guardarBorradorLocal();
    setMensajeFolio(`Solicitud ${folio} cargada. Puedes editar todo antes de guardar.`, 'success');
    mostrarToast(`Solicitud ${folio} cargada`, 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cargar la solicitud';
    setMensajeFolio(message, 'error');
    mostrarToast('No se pudo cargar la solicitud', 'error');
  }
}

async function manejarFotoRecepcion(input: HTMLInputElement): Promise<void> {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    fotoRecepcionBase64 = await comprimirImagenADataURL(file, 1280, 0.75);
    elFotoPreview.src = fotoRecepcionBase64;
    elFotoPreviewWrap.classList.remove('hidden');
    guardarBorradorLocal();
  } catch (error) {
    console.error('Error al procesar imagen:', error);
    mostrarToast('No se pudo procesar la foto', 'error');
  }
}

function comprimirImagenADataURL(file: File, maxWidth = 1280, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('No se pudo leer la imagen'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo preparar el canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('No se pudo procesar la imagen'));
      img.src = result;
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });
}

function actualizarResumen(): void {
  elResCliente.textContent = elClienteNombre.value;
  elResTelefono.textContent = elClienteTelefono.value;
  elResEmail.textContent = elClienteEmail.value || '(no proporcionado)';
  elResEquipo.textContent = `${elEquipoTipo.value} - ${elEquipoModelo.value}`;
  elResFalla.textContent = elEquipoFalla.value;
  elResFecha.textContent = elFechaPromesa.value;
  const costo = elCosto.value;
  elResCosto.textContent = costo ? `$${Number.parseFloat(costo).toFixed(2)}` : '$0';

  const checks: string[] = [];
  if (elChkCargador.checked) checks.push('⚡Cargador');
  if (elChkPantalla.checked) checks.push('📱Pantalla');
  if (elChkPrende.checked) checks.push('🔌Prende');
  if (elChkRespaldo.checked) checks.push('💾Respaldo');
  elResChecklist.textContent = checks.join(' • ') || 'Ninguno';
  elResFoto.textContent = fotoRecepcionBase64 ? 'Adjunta' : 'Sin foto';
}

function getOperacionChecks(): SrFix.ReceptionChecklist {
  return {
    cargador: elChkCargador.checked,
    pantalla: elChkPantalla.checked,
    prende: elChkPrende.checked,
    respaldo: elChkRespaldo.checked
  };
}

async function guardarOrden(): Promise<void> {
  if (!validarPaso1()) {
    irPaso(1);
    return;
  }
  if (!validarPaso2()) {
    irPaso(2);
    return;
  }

  setGuardarButtonLoading(true);

  const telefono10 = normalizarTelefono10(elClienteTelefono.value);
  if (!telefono10) {
    mostrarToast('Teléfono inválido: deben ser 10 dígitos', 'error');
    irPaso(1);
    setGuardarButtonLoading(false);
    return;
  }

  const costoOrden = Number(elCosto.value || 0);

  const payload: SrFix.OperativoOrdenInput = {
    sucursalId: localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL',
    clienteNombre: elClienteNombre.value.trim(),
    clienteTelefono: telefono10,
    clienteEmail: elClienteEmail.value.trim() || '',
    dispositivo: elEquipoTipo.value,
    modelo: elEquipoModelo.value.trim(),
    falla: elEquipoFalla.value.trim(),
    fechaPromesa: elFechaPromesa.value,
    costo: costoOrden,
    notas: elNotasExtra.value.trim() || '',
    checks: getOperacionChecks(),
    fotoRecepcion: fotoRecepcionBase64 || '',
    folioSolicitudOrigen: folioSolicitudOrigen || String(elFolioCotizacionInput.value || '').trim().toUpperCase()
  };

  try {
    const result = await operativoRequestBackendWithRetry<OperativoGuardarResponse, SrFix.OperativoOrdenInput>('crear_equipo', payload, 'POST', 2);
    if (!result.success) {
      throw new Error(result.error || 'Error al guardar');
    }

    ultimaOrdenRegistrada = {
      folio: result.folio,
      fecha: new Date().toLocaleString('es-MX'),
      clienteNombre: payload.clienteNombre,
      clienteTelefono: payload.clienteTelefono,
      clienteEmail: payload.clienteEmail,
      dispositivo: payload.dispositivo,
      modelo: payload.modelo,
      falla: payload.falla,
      fechaPromesa: payload.fechaPromesa,
      costo: payload.costo ? Number(payload.costo) : 0,
      notas: payload.notas,
      fotoRecepcion: payload.fotoRecepcion,
      checks: {
        cargador: !!payload.checks.cargador,
        pantalla: !!payload.checks.pantalla,
        prende: !!payload.checks.prende,
        respaldo: !!payload.checks.respaldo
      }
    };

    localStorage.removeItem('srfix_borrador_orden');
    elStep3.classList.add('hidden');
    elExito.classList.remove('hidden');
    elFolioGenerado.textContent = result.folio;

    const portalUrl = typeof srfixBuildPortalUrl === 'function' ? srfixBuildPortalUrl(result.folio) : '';
    const partesMensaje = [
      `Hola, tu equipo ha sido registrado en SRFIX con el folio ${result.folio}.`,
      portalUrl
        ? `Puedes consultar el estado en:\n${portalUrl}`
        : `Puedes consultar el estado en el portal del cliente.\nFolio: ${result.folio}`
    ];
    const mensaje = partesMensaje.join('\n\n');
    elWhatsappLink.href = `https://wa.me/${telefono10}?text=${encodeURIComponent(mensaje)}`;
    elWhatsappLink.setAttribute('rel', 'noopener');
    mostrarToast('Orden guardada con éxito', 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al guardar';
    mostrarToast(`Error: ${message}`, 'error');
  } finally {
    setGuardarButtonLoading(false);
  }
}

function copiarFolio(): void {
  const folio = elFolioGenerado.textContent || '';
  navigator.clipboard.writeText(folio).then(() => {
    mostrarToast('Folio copiado', 'success');
  }).catch(() => {
    window.prompt('Copia manualmente:', folio);
  });
}

function generarPDFOrden(tipo = 'previa'): void {
  let datos: SrFix.OperativoOrdenRegistrada | null = null;
  if (tipo === 'confirmada') {
    if (!ultimaOrdenRegistrada) {
      mostrarToast('No hay orden registrada para exportar', 'error');
      return;
    }
    datos = { ...ultimaOrdenRegistrada, folio: ultimaOrdenRegistrada.folio || 'SIN-FOLIO' };
  } else {
    actualizarResumen();
    datos = {
      folio: 'PRE-ORDEN',
      fecha: new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' }),
      clienteNombre: elResCliente.textContent || '---',
      clienteTelefono: elResTelefono.textContent || '---',
      clienteEmail: elResEmail.textContent || '---',
      dispositivo: elEquipoTipo.value || '---',
      modelo: elEquipoModelo.value || '---',
      falla: elResFalla.textContent || '---',
      fechaPromesa: elResFecha.textContent || '---',
      costo: Number(String(elResCosto.textContent || '$0').replace('$', '')) || 0,
      notas: elNotasExtra.value || '---',
      fotoRecepcion: fotoRecepcionBase64 || '',
      checks: getOperacionChecks()
    };
  }

  const checksList: string[] = [];
  if (datos.checks?.cargador) checksList.push('✅ Trae cargador');
  if (datos.checks?.pantalla) checksList.push('✅ Pantalla OK');
  if (datos.checks?.prende) checksList.push('✅ Equipo prende');
  if (datos.checks?.respaldo) checksList.push('✅ Datos respaldados');
  const checksHTML = checksList.length ? checksList.map(check => `<span class="check-item">${check}</span>`).join('') : '<span class="check-item">---</span>';

  const accionPDF = tipo === 'previa'
    ? `<div style="text-align:center;padding:14px;background:#fff">
         <button onclick="window.print()" style="background:#1F7EDC;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer">Imprimir / Guardar PDF</button>
       </div>`
    : `<script>window.onload=()=>window.print();<\/script>`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>SrFix - Orden</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box} body{font-family:'Inter',sans-serif;background:#f4f7fc;padding:30px;color:#1e293b}
        .container{max-width:980px;margin:0 auto;background:#fff;border-radius:24px;box-shadow:0 20px 40px -10px rgba(0,20,50,.15);overflow:hidden;border:1px solid #e2e8f0}
        .header{background:linear-gradient(135deg,#0F4C81 0%,#1F7EDC 100%);color:#fff;padding:30px 35px;display:flex;justify-content:space-between;align-items:center}
        .header h1{font-size:32px;font-weight:800;letter-spacing:1px}.header h1 span{color:#FF6A2A}
        .folio{background:rgba(255,255,255,.15);padding:10px 22px;border-radius:60px;border:1px solid rgba(255,255,255,.3);font-weight:700}
        .content{padding:35px}.pill{display:flex;justify-content:space-between;gap:10px;background:#f1f5f9;padding:14px 18px;border-radius:999px;margin-bottom:24px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
        .card{background:#f8fafc;border-radius:16px;padding:18px;border:1px solid #e2e8f0}
        .card h3{font-size:16px;color:#1F7EDC;margin-bottom:12px;border-bottom:2px solid #FF6A2A;padding-bottom:6px}
        .row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed #cbd5e1}.row:last-child{border-bottom:0}
        .k{font-weight:600;color:#475569}.v{font-weight:500;color:#0f172a;text-align:right;max-width:60%}
        .checks{margin:22px 0;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:16px;padding:16px}
        .checks h3{color:#FF6A2A;margin-bottom:10px}.check-list{display:flex;gap:10px;flex-wrap:wrap}
        .check-item{background:#fff;border:1px solid #cbd5e1;border-radius:999px;padding:7px 12px;font-size:13px}
        .notas{background:#fff7ed;border-left:6px solid #FF6A2A;padding:16px;border-radius:12px;margin-top:18px}
        .total{margin-top:18px;text-align:right;font-size:20px;font-weight:700}.footer{background:#f1f5f9;border-top:1px solid #cbd5e1;padding:14px;text-align:center;color:#64748b;font-size:13px}
        @media print{body{background:#fff;padding:0}.container{box-shadow:none}}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div><h1>SR<span>FIX</span></h1><p>Orden de Servicio</p></div>
          <div class="folio">${datos.folio}</div>
        </div>
        <div class="content">
          <div class="pill"><span><strong>Fecha:</strong> ${datos.fecha || '---'}</span><span><strong>Entrega:</strong> ${datos.fechaPromesa || '---'}</span></div>
          <div class="grid">
            <div class="card">
              <h3>Cliente</h3>
              <div class="row"><div class="k">Nombre</div><div class="v">${datos.clienteNombre || '---'}</div></div>
              <div class="row"><div class="k">Teléfono</div><div class="v">${datos.clienteTelefono || '---'}</div></div>
              <div class="row"><div class="k">Email</div><div class="v">${datos.clienteEmail || '---'}</div></div>
            </div>
            <div class="card">
              <h3>Equipo</h3>
              <div class="row"><div class="k">Tipo</div><div class="v">${datos.dispositivo || '---'}</div></div>
              <div class="row"><div class="k">Modelo</div><div class="v">${datos.modelo || '---'}</div></div>
              <div class="row"><div class="k">Falla</div><div class="v">${datos.falla || '---'}</div></div>
            </div>
          </div>
          <div class="checks"><h3>Checklist recepción</h3><div class="check-list">${checksHTML}</div></div>
          ${datos.fotoRecepcion ? `
            <div style="margin-top:22px" class="card">
              <h3>Foto de ingreso del equipo</h3>
              <div style="display:flex;justify-content:center;padding-top:8px">
                <img src="${datos.fotoRecepcion}" alt="Foto de recepción del equipo" style="max-width:100%;max-height:320px;object-fit:contain;border-radius:14px;border:1px solid #cbd5e1;background:#fff">
              </div>
            </div>
          ` : ''}
          <div class="notas"><strong>Notas:</strong><div style="margin-top:6px;line-height:1.5">${datos.notas || '---'}</div></div>
          <div class="total">Costo estimado: $${Number(datos.costo || 0).toFixed(2)}</div>
        </div>
        <div class="footer">SrFix Oficial · Plaza Chapultepec · 81 1700 6536</div>
      </div>
      ${accionPDF}
    </body>
    </html>
  `;

  const w = window.open('', '_blank');
  if (!w) {
    mostrarToast('Permite ventanas emergentes para generar PDF', 'error');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function generarPDFResumenOrden(): void {
  generarPDFOrden('previa');
}

function descargarOrdenPDF(): void {
  generarPDFOrden('confirmada');
}

function nuevaOrden(): void {
  elClienteNombre.value = '';
  elClienteTelefono.value = '';
  elClienteEmail.value = '';
  elFolioCotizacionInput.value = '';
  elEquipoTipo.value = '';
  elEquipoModelo.value = '';
  elEquipoFalla.value = '';
  elCosto.value = '';
  elNotasExtra.value = '';
  document.querySelectorAll<HTMLInputElement>('#app input[type="checkbox"]').forEach((cb) => {
    cb.checked = false;
  });
  elFotoRecepcion.value = '';
  elFotoPreviewWrap.classList.add('hidden');
  fotoRecepcionBase64 = '';
  ultimaOrdenRegistrada = null;
  folioSolicitudOrigen = '';
  setMensajeFolio('');

  const f = new Date();
  f.setDate(f.getDate() + 3);
  elFechaPromesa.valueAsDate = f;
  localStorage.removeItem('srfix_borrador_orden');

  elExito.classList.add('hidden');
  elStep1.classList.remove('hidden');
  elStep2.classList.add('hidden');
  elStep3.classList.add('hidden');

  for (let i = 1; i <= 3; i += 1) {
    const ind = document.getElementById(`step-${i}-ind`);
    if (!ind) continue;
    if (i === 1) {
      ind.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold step-active';
      ind.textContent = '1';
    } else {
      ind.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold step-inactive';
      ind.textContent = String(i);
    }
  }
}

function bindListeners(): void {
  document.addEventListener('input', (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('#app input, #app select, #app textarea')) {
      guardarBorradorLocal();
    }
  });

  document.addEventListener('change', (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('#app input[type=checkbox]')) {
      guardarBorradorLocal();
    }
  });
}

function initializeLoginState(): void {
  if (hasOperativoAccess()) {
    elLoginScreen.classList.add('hidden');
    elApp.classList.remove('hidden');
    window.setTimeout(() => {
      void login();
    }, 200);
    return;
  }

  const saved = sessionStorage.getItem('srfix_pass_operativo') || localStorage.getItem('srfix_pass_operativo');
  if (saved) {
    elPasswordInput.value = saved;
    if (localStorage.getItem('srfix_pass_operativo')) {
      elRememberMe.checked = true;
    }
    window.setTimeout(() => {
      void login();
    }, 500);
  }
}

async function login(): Promise<void> {
  if (loginEnCurso) return;
  loginEnCurso = true;
  password = elPasswordInput.value.trim();
  const trustedInternalAccess = hasOperativoAccess();

  if (!trustedInternalAccess) {
    if (!password) {
      loginEnCurso = false;
      mostrarErrorLogin('Ingresa la contraseña');
      return;
    }
    if (password !== FRONT_PASSWORD) {
      loginEnCurso = false;
      mostrarErrorLogin('Contraseña incorrecta');
      return;
    }
  }

  setLoginButtonLoading(true);
  ocultarErrorLogin();

  try {
    await operativoRequestBackend<Record<string, unknown>>('semaforo', {}, 'GET');

    const remember = elRememberMe.checked;
    if (!trustedInternalAccess) {
      sessionStorage.setItem('srfix_pass_operativo', password);
      if (remember) {
        localStorage.setItem('srfix_pass_operativo', password);
      } else {
        localStorage.removeItem('srfix_pass_operativo');
      }
    }

    elLoginScreen.classList.add('hidden');
    elApp.classList.remove('hidden');

    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 3);
    elFechaPromesa.valueAsDate = fecha;
    actualizarFechaActual();
    if (fechaTimer !== null) {
      window.clearInterval(fechaTimer);
    }
    fechaTimer = window.setInterval(actualizarFechaActual, 60000);
    cargarBorradorLocal();
    mostrarToast('Sesión iniciada', 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión';
    mostrarErrorLogin(`No se pudo iniciar sesión por conexión o backend. ${message}`);
  } finally {
    setLoginButtonLoading(false);
    loginEnCurso = false;
  }
}

function logout(): void {
  if (!confirm('¿Cerrar sesión? Se perderán los datos no guardados.')) {
    return;
  }
  sessionStorage.removeItem('srfix_pass_operativo');
  localStorage.removeItem('srfix_pass_operativo');
  localStorage.removeItem('srfix_borrador_orden');
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'srfix:logout' }, '*');
      return;
    }
  } catch {
    // Sin acción.
  }
  location.reload();
}

function bindWindowActions(): void {
  const bindings = {
    login,
    logout,
    cargarDesdeFolioCotizacion,
    manejarFotoRecepcion,
    irPaso,
    generarPDFResumenOrden,
    descargarOrdenPDF,
    copiarFolio,
    nuevaOrden,
    guardarOrden,
    mostrarToast
  };
  Object.assign(window, bindings);
}

bindListeners();
bindWindowActions();
initializeLoginState();
