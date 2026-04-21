;(function (): void {
  type RequestMethod = 'GET' | 'POST';

  interface BackendEnvelope {
    success?: boolean;
    error?: unknown;
  }

  type SecurityActionRecord = SrFix.SecurityActionRecord;
  type SecurityConfigResponse = SrFix.SecurityConfigResponse;
  type SecuritySaveConfigResponse = SrFix.SecuritySaveConfigResponse;
  type SecuritySaveUserResponse = SrFix.SecuritySaveUserResponse;
  type SecurityUsersResponse = SrFix.SecurityUsersResponse;
  type SecurityUserRecord = SrFix.SecurityUserRecord;

  const BACKEND_URL = String(CONFIG.API_URL || '').trim();

  const elBtnRefresh = requireElement<HTMLButtonElement>('btn-refresh');
  const elBtnReload = requireElement<HTMLButtonElement>('btn-reload');
  const elBtnSaveConfig = requireElement<HTMLButtonElement>('btn-save-config');
  const elBtnNuevoUsuario = requireElement<HTMLButtonElement>('btn-nuevo-usuario');
  const elFormSeguridad = requireElement<HTMLFormElement>('form-seguridad');
  const elFormUsuario = requireElement<HTMLFormElement>('form-usuario');
  const elAccessDenied = requireElement<HTMLDivElement>('access-denied');
  const elUsuariosWrap = requireElement<HTMLDivElement>('usuarios-wrap');
  const elAccionesList = requireElement<HTMLDivElement>('acciones-list');
  const elUsuariosList = requireElement<HTMLDivElement>('usuarios-list');
  const elMensajeAutorizacion = requireElement<HTMLTextAreaElement>('mensaje-autorizacion');
  const elBitacoraActiva = requireElement<HTMLInputElement>('bitacora-activa');
  const elAdminPasswordActual = requireElement<HTMLInputElement>('admin-password-actual');
  const elAdminPassword = requireElement<HTMLInputElement>('admin-password');
  const elAdminPasswordConfirm = requireElement<HTMLInputElement>('admin-password-confirm');
  const elKpiAcciones = requireElement<HTMLDivElement>('kpi-acciones');
  const elKpiAdmin = requireElement<HTMLDivElement>('kpi-admin');
  const elKpiBitacora = requireElement<HTMLDivElement>('kpi-bitacora');
  const elSaveStatus = requireElement<HTMLDivElement>('save-status');
  const elUsuarioStatus = requireElement<HTMLDivElement>('usuario-status');
  const elModalUsuario = requireElement<HTMLDivElement>('modal-usuario');
  const elModalUsuarioBusy = requireElement<HTMLDivElement>('modal-usuario-busy');
  const elFormUsuarioBusy = requireElement<HTMLFormElement>('form-usuario');
  const elUsuarioTitle = requireElement<HTMLHeadingElement>('usuario-title');
  const elUsuarioUser = requireElement<HTMLInputElement>('usuario-user');
  const elUsuarioNombre = requireElement<HTMLInputElement>('usuario-nombre');
  const elUsuarioRol = requireElement<HTMLSelectElement>('usuario-rol');
  const elUsuarioActivo = requireElement<HTMLSelectElement>('usuario-activo');
  const elUsuarioPassword = requireElement<HTMLInputElement>('usuario-password');
  const elUsuarioAdminPasswordActual = requireElement<HTMLInputElement>('usuario-admin-password-actual');
  const elUsuarioNotas = requireElement<HTMLTextAreaElement>('usuario-notas');
  const elBtnSaveUser = requireElement<HTMLButtonElement>('btn-save-user');

  let accionesCache: SecurityActionRecord[] = [];
  let usuariosCache: SecurityUserRecord[] = [];
  let currentUser: SrFix.AuthUser | null = null;

  function requireElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Elemento no encontrado: ${id}`);
    }
    return el as T;
  }

  function escapeHtml(v: unknown): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function readCurrentUser(): SrFix.AuthUser | null {
    try {
      const raw = sessionStorage.getItem('srfix_auth_user') || localStorage.getItem('srfix_auth_user');
      return raw ? JSON.parse(raw) as SrFix.AuthUser : null;
    } catch {
      return null;
    }
  }

  function setButtonBusy(button: HTMLButtonElement, isBusy: boolean, idleLabel: string, busyLabel: string): void {
    button.disabled = isBusy;
    button.classList.toggle('opacity-80', isBusy);
    button.classList.toggle('cursor-wait', isBusy);
    button.innerHTML = isBusy
      ? `<span class="btn-busy"><span class="spinner-ui"></span><span>${busyLabel}</span></span>`
      : idleLabel;
  }

  function setUserModalBusy(isBusy: boolean): void {
    elModalUsuarioBusy.classList.toggle('hidden', !isBusy);
    Array.from(elFormUsuarioBusy.elements || []).forEach((el) => {
      (el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement).disabled = isBusy;
    });
  }

  function buildGetUrl(action: string, payload: Record<string, unknown>): string {
    const q = new URLSearchParams();
    q.set('action', action);
    q.set('t', String(Date.now()));
    Object.entries(payload).forEach(([key, raw]) => {
      if (raw === undefined || raw === null || raw === '') return;
      if (typeof raw === 'object') {
        q.set(key, JSON.stringify(raw));
        return;
      }
      q.set(key, String(raw));
    });
    return `${BACKEND_URL}?${q.toString()}`;
  }

  async function readJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text.trim()) throw new Error(`Respuesta vacía (${response.status})`);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Respuesta inválida (${response.status}): ${text.slice(0, 180)}`);
    }
  }

  async function requestBackend<T>(action: string, payload: Record<string, unknown> = {}, method: RequestMethod = 'POST'): Promise<T> {
    const canRetryAsGet = !/^(guardar_|registrar_|eliminar_|archivar_|transferir_|recibir_|cambiar_|login_|validar_|crear_|reabrir_)/.test(String(action || '').trim().toLowerCase());
    const requestGet = (): Promise<Response> => fetch(buildGetUrl(action, payload), { method: 'GET' });
    const requestPost = (): Promise<Response> => fetch(BACKEND_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload })
    });

    try {
      const response = method === 'GET' ? await requestGet() : await requestPost();
      const data = await readJson<T & BackendEnvelope>(response);
      const errorText = typeof data.error === 'string' ? data.error.trim() : '';
      if (errorText) throw new Error(errorText);
      if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
        throw new Error(errorText || `La operación ${action} fue rechazada`);
      }
      return data as T;
    } catch (error) {
      if (method !== 'POST' || !canRetryAsGet) throw error;
      const response = await requestGet();
      const data = await readJson<T & BackendEnvelope>(response);
      const errorText = typeof data.error === 'string' ? data.error.trim() : '';
      if (errorText) throw new Error(errorText);
      if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
        throw new Error(errorText || `La operación ${action} fue rechazada`);
      }
      return data as T;
    }
  }

  function setStatus(msg: string, type: 'muted' | 'ok' | 'error' | 'working' = 'muted'): void {
    elSaveStatus.className = 'text-sm min-h-[20px]';
    if (type === 'ok') elSaveStatus.classList.add('text-green-300');
    else if (type === 'error') elSaveStatus.classList.add('text-red-300');
    else if (type === 'working') elSaveStatus.classList.add('status-working');
    else elSaveStatus.classList.add('text-[#8A8F95]');
    elSaveStatus.textContent = msg || '';
  }

  function setUserStatus(msg: string, type: 'muted' | 'ok' | 'error' | 'working' = 'muted'): void {
    elUsuarioStatus.className = 'text-sm min-h-[20px]';
    if (type === 'ok') elUsuarioStatus.classList.add('text-green-300');
    else if (type === 'error') elUsuarioStatus.classList.add('text-red-300');
    else if (type === 'working') elUsuarioStatus.classList.add('status-working');
    else elUsuarioStatus.classList.add('text-[#8A8F95]');
    elUsuarioStatus.textContent = msg || '';
  }

  function ensureAdminAccess(): boolean {
    currentUser = readCurrentUser();
    const isAdmin = !!currentUser && String(currentUser.ROL || '').toLowerCase() === 'admin';
    elAccessDenied.classList.toggle('hidden', !!isAdmin);
    elFormSeguridad.classList.toggle('hidden', !isAdmin);
    elUsuariosWrap.classList.toggle('hidden', !isAdmin);
    return isAdmin;
  }

  function renderAcciones(): void {
    elAccionesList.innerHTML = accionesCache.map((item) => `
      <label class="flex items-start gap-3 rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-4 security-action-card">
        <input type="checkbox" class="mt-1 accent-[#FF6A2A]" data-clave="${escapeHtml(item.clave)}" ${item.requiereAdmin ? 'checked' : ''}>
        <div>
          <div class="font-semibold text-white">${escapeHtml(item.titulo)}</div>
          <div class="text-sm text-[#8A8F95] mt-1">${escapeHtml(item.descripcion || '')}</div>
          <div class="text-[11px] text-[#5ea8ff] mt-2 font-mono">${escapeHtml(item.accion || item.clave)}</div>
        </div>
      </label>
    `).join('');
  }

  function renderUsuarios(): void {
    elUsuariosList.innerHTML = usuariosCache.map((item) => `
      <button type="button" data-edit-user="${escapeHtml(item.USUARIO)}" class="w-full text-left rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-4 hover:bg-[#1F7EDC]/10 security-user-card">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="font-semibold text-white">${escapeHtml(item.NOMBRE || item.USUARIO)}</div>
            <div class="text-sm text-[#8A8F95] mt-1">${escapeHtml(item.USUARIO)} · ${escapeHtml(String(item.ROL || ''))}</div>
          </div>
          <div class="text-xs ${item.ACTIVO ? 'text-green-300' : 'text-red-300'}">
            ${item.ACTIVO ? 'Activo' : 'Inactivo'}
          </div>
        </div>
        ${item.NOTAS ? `<div class="text-xs text-[#8A8F95] mt-2">${escapeHtml(item.NOTAS)}</div>` : ''}
      </button>
    `).join('') || '<div class="text-sm text-[#8A8F95]">Sin usuarios cargados.</div>';
  }

  function actualizarKpis(config: SrFix.SecurityConfigState): void {
    elKpiAcciones.textContent = String(accionesCache.filter((x) => x.requiereAdmin).length);
    elKpiAdmin.textContent = config.adminPasswordConfigured ? 'Sí' : 'No';
    elKpiBitacora.textContent = config.bitacoraActiva ? 'Sí' : 'No';
  }

  async function cargarConfiguracion(): Promise<void> {
    setButtonBusy(elBtnRefresh, true, '<i class="fa-solid fa-rotate-right"></i> Actualizar', 'Actualizando...');
    setButtonBusy(elBtnReload, true, 'Recargar', 'Recargando...');
    elFormSeguridad.classList.add('section-busy');
    setStatus('Cargando configuración...', 'working');
    const [seguridad, usuarios] = await Promise.all([
      requestBackend<SecurityConfigResponse>('obtener_config_seguridad', {}, 'GET'),
      requestBackend<SecurityUsersResponse>('listar_usuarios_internos', {}, 'GET')
    ]);
    accionesCache = Array.isArray(seguridad.acciones) ? seguridad.acciones : [];
    usuariosCache = Array.isArray(usuarios.usuarios) ? usuarios.usuarios : [];
    renderAcciones();
    renderUsuarios();
    elMensajeAutorizacion.value = String(seguridad.config?.mensajeAutorizacion || '');
    elBitacoraActiva.checked = !!seguridad.config?.bitacoraActiva;
    elAdminPassword.value = '';
    elAdminPasswordConfirm.value = '';
    elAdminPasswordActual.value = '';
    actualizarKpis(seguridad.config || {});
    setStatus('Configuración cargada.');
    setButtonBusy(elBtnRefresh, false, '<i class="fa-solid fa-rotate-right"></i> Actualizar', 'Actualizando...');
    setButtonBusy(elBtnReload, false, 'Recargar', 'Recargando...');
    elFormSeguridad.classList.remove('section-busy');
  }

  function abrirModalUsuario(item: SecurityUserRecord | null = null): void {
    elUsuarioTitle.textContent = item ? `Editar ${item.NOMBRE || item.USUARIO}` : 'Nuevo usuario';
    elUsuarioUser.value = item?.USUARIO || '';
    elUsuarioUser.readOnly = !!item;
    elUsuarioUser.classList.toggle('opacity-70', !!item);
    elUsuarioNombre.value = item?.NOMBRE || '';
    elUsuarioRol.value = String(item?.ROL || 'operativo');
    elUsuarioActivo.value = item?.ACTIVO ? 'SI' : 'NO';
    elUsuarioPassword.value = '';
    elUsuarioAdminPasswordActual.value = '';
    elUsuarioNotas.value = item?.NOTAS || '';
    setUserStatus('');
    setUserModalBusy(false);
    elModalUsuario.classList.remove('hidden');
  }

  function cerrarModalUsuario(): void {
    setUserModalBusy(false);
    elModalUsuario.classList.add('hidden');
  }

  async function guardarConfiguracion(ev: SubmitEvent): Promise<void> {
    ev.preventDefault();
    const passActual = elAdminPasswordActual.value;
    const pass = elAdminPassword.value;
    const confirmPass = elAdminPasswordConfirm.value;
    if (!passActual) {
      setStatus('Necesitas ingresar la clave admin actual para guardar.', 'error');
      return;
    }
    if (pass || confirmPass) {
      if (pass.length < 4) {
        setStatus('La nueva clave admin debe tener al menos 4 caracteres.', 'error');
        return;
      }
      if (pass !== confirmPass) {
        setStatus('La confirmación de la nueva clave admin no coincide.', 'error');
        return;
      }
    }

    const acciones = Array.from(document.querySelectorAll('#acciones-list [data-clave]')).map((input) => {
      const checkbox = input as HTMLInputElement;
      return {
        clave: checkbox.getAttribute('data-clave') || '',
        requiereAdmin: checkbox.checked
      };
    });

    setButtonBusy(elBtnSaveConfig, true, 'Guardar configuración', 'Guardando...');
    elFormSeguridad.classList.add('section-busy');
    setStatus('Guardando configuración...', 'working');
    try {
      const data = await requestBackend<SecuritySaveConfigResponse>('guardar_config_seguridad', {
        adminPasswordActual: passActual,
        adminPassword: pass,
        mensajeAutorizacion: elMensajeAutorizacion.value.trim(),
        bitacoraActiva: elBitacoraActiva.checked,
        acciones,
        actor: {
          usuario: currentUser?.USUARIO || '',
          nombre: currentUser?.NOMBRE || '',
          rol: currentUser?.ROL || ''
        }
      }, 'POST');

      accionesCache = Array.isArray(data.acciones) ? data.acciones : [];
      renderAcciones();
      actualizarKpis(data.config || {});
      elAdminPassword.value = '';
      elAdminPasswordConfirm.value = '';
      elAdminPasswordActual.value = '';
      setStatus('Configuración guardada correctamente.', 'ok');
    } finally {
      setButtonBusy(elBtnSaveConfig, false, 'Guardar configuración', 'Guardando...');
      elFormSeguridad.classList.remove('section-busy');
    }
  }

  async function guardarUsuario(ev: SubmitEvent): Promise<void> {
    ev.preventDefault();
    const adminPasswordActual = elUsuarioAdminPasswordActual.value;
    if (!adminPasswordActual) {
      setUserStatus('Necesitas la clave admin actual para guardar usuarios.', 'error');
      return;
    }
    const payload = {
      action: 'guardar_usuario_interno',
      adminPasswordActual,
      usuario: elUsuarioUser.value.trim(),
      nombre: elUsuarioNombre.value.trim(),
      rol: elUsuarioRol.value,
      activo: elUsuarioActivo.value === 'SI',
      password: elUsuarioPassword.value,
      notas: elUsuarioNotas.value.trim(),
      actor: {
        usuario: currentUser?.USUARIO || '',
        nombre: currentUser?.NOMBRE || '',
        rol: currentUser?.ROL || ''
      }
    };

    setButtonBusy(elBtnSaveUser, true, 'Guardar usuario', 'Guardando...');
    setUserModalBusy(true);
    setUserStatus('Guardando usuario...', 'working');
    setStatus('Guardando usuario...', 'working');
    try {
      const data = await requestBackend<SecuritySaveUserResponse>('guardar_usuario_interno', payload, 'POST');
      usuariosCache = Array.isArray(data.usuarios) ? data.usuarios : [];
      renderUsuarios();
      cerrarModalUsuario();
      setStatus('Usuario guardado correctamente.', 'ok');
    } finally {
      setButtonBusy(elBtnSaveUser, false, 'Guardar usuario', 'Guardando...');
      setUserModalBusy(false);
    }
  }

  function bindEvents(): void {
    elBtnRefresh.addEventListener('click', () => { void cargarConfiguracion().catch((e) => setStatus(e instanceof Error ? e.message : String(e), 'error')); });
    elBtnReload.addEventListener('click', () => { void cargarConfiguracion().catch((e) => setStatus(e instanceof Error ? e.message : String(e), 'error')); });
    elFormSeguridad.addEventListener('submit', (ev) => { void guardarConfiguracion(ev).catch((e) => setStatus(e instanceof Error ? e.message : String(e), 'error')); });
    elBtnNuevoUsuario.addEventListener('click', () => abrirModalUsuario());
    elUsuariosList.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest('[data-edit-user]') as HTMLElement | null;
      if (!btn) return;
      const item = usuariosCache.find((x) => x.USUARIO === btn.getAttribute('data-edit-user'));
      if (item) abrirModalUsuario(item);
    });
    document.querySelectorAll('[data-close-usuario]').forEach((btn) => btn.addEventListener('click', cerrarModalUsuario));
    elModalUsuario.addEventListener('click', (e) => {
      if (e.target === elModalUsuario) cerrarModalUsuario();
    });
    elFormUsuario.addEventListener('submit', (ev) => { void guardarUsuario(ev).catch((e) => setStatus(e instanceof Error ? e.message : String(e), 'error')); });
  }

  bindEvents();

  if (ensureAdminAccess()) {
    void cargarConfiguracion().catch((e) => setStatus(e instanceof Error ? e.message : String(e), 'error'));
  } else {
    setStatus('Acceso restringido.', 'error');
  }
})();
