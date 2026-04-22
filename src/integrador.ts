;(function (): void {
  type IntegradorModule = SrFix.AllowedModule;

  interface SucursalLite {
    ID: string;
    NOMBRE: string;
  }

  interface ListarSucursalesResponse {
    success?: boolean;
    sucursales?: SucursalLite[];
    error?: string;
  }

  const MODULE_IDS: readonly IntegradorModule[] = [
    'operativo',
    'tecnico',
    'solicitudes',
    'archivo',
    'clientes',
    'tareas',
    'stock',
    'proveedores',
    'compras',
    'gastos',
    'finanzas',
    'reportes',
    'sucursales',
    'seguridad'
  ];

const APP_BUILD = '20260421ts3';
  const backend = window.SRFIXBackend as SrFix.BackendClient;

  const moduleMeta: Record<IntegradorModule, SrFix.ModuleMeta> = {
    operativo: { title: 'Recepción', subtitle: 'Recepción, captura y seguimiento de ingreso de equipos.' },
    tecnico: { title: 'Técnico', subtitle: 'Semáforo, diagnóstico, avances y cierre técnico del taller.' },
    solicitudes: { title: 'Solicitudes', subtitle: 'Entrada de cotizaciones y trazabilidad inicial del cliente.' },
    archivo: { title: 'Archivo', subtitle: 'Historial operativo y consulta de órdenes cerradas.' },
    clientes: { title: 'Clientes', subtitle: 'Consulta y gestión de clientes ligados al servicio.' },
    tareas: { title: 'Tareas', subtitle: 'Pendientes y seguimiento interno del equipo de trabajo.' },
    stock: { title: 'Stock', subtitle: 'Inventario, códigos, categorías y control de existencias.' },
    proveedores: { title: 'Proveedores', subtitle: 'Relación de abastecimiento y datos de compra.' },
    compras: { title: 'Compras', subtitle: 'Control de adquisiciones, entradas y trazabilidad de gasto.' },
    gastos: { title: 'Gastos', subtitle: 'Registro de egresos y control operativo del negocio.' },
    finanzas: { title: 'Finanzas', subtitle: 'Vista financiera consolidada para monitoreo administrativo.' },
    reportes: { title: 'Reportes', subtitle: 'Lectura global del negocio con indicadores y resúmenes.' },
    sucursales: { title: 'Sucursales', subtitle: 'Administración de vistas operativas por sede.' },
    seguridad: { title: 'Seguridad', subtitle: 'Permisos, usuarios internos y reglas de autorización crítica.' }
  };

  const frameSrc: Record<IntegradorModule, string> = {
    operativo: './panel-operativo.html',
    tecnico: './panel-tecnico.html',
    solicitudes: './panel-solicitudes.html',
    archivo: './panel-archivo.html',
    clientes: './panel-clientes.html',
    tareas: './panel-tareas.html',
    stock: './panel-stock.html',
    proveedores: './panel-proveedores.html',
    compras: './panel-compras.html',
    gastos: './panel-gastos.html',
    finanzas: './panel-finanzas.html',
    reportes: './panel-reportes.html',
    sucursales: './panel-sucursales.html',
    seguridad: './panel-seguridad.html'
  };

  const panels = {
    operativo: requireElement<HTMLDivElement>('panel-operativo'),
    tecnico: requireElement<HTMLDivElement>('panel-tecnico'),
    solicitudes: requireElement<HTMLDivElement>('panel-solicitudes'),
    archivo: requireElement<HTMLDivElement>('panel-archivo'),
    clientes: requireElement<HTMLDivElement>('panel-clientes'),
    tareas: requireElement<HTMLDivElement>('panel-tareas'),
    stock: requireElement<HTMLDivElement>('panel-stock'),
    proveedores: requireElement<HTMLDivElement>('panel-proveedores'),
    compras: requireElement<HTMLDivElement>('panel-compras'),
    gastos: requireElement<HTMLDivElement>('panel-gastos'),
    finanzas: requireElement<HTMLDivElement>('panel-finanzas'),
    reportes: requireElement<HTMLDivElement>('panel-reportes'),
    sucursales: requireElement<HTMLDivElement>('panel-sucursales'),
    seguridad: requireElement<HTMLDivElement>('panel-seguridad')
  } satisfies Record<IntegradorModule, HTMLDivElement>;

  const buttons = {
    operativo: requireElement<HTMLButtonElement>('tab-operativo'),
    tecnico: requireElement<HTMLButtonElement>('tab-tecnico'),
    solicitudes: requireElement<HTMLButtonElement>('tab-solicitudes'),
    archivo: requireElement<HTMLButtonElement>('tab-archivo'),
    clientes: requireElement<HTMLButtonElement>('tab-clientes'),
    tareas: requireElement<HTMLButtonElement>('tab-tareas'),
    stock: requireElement<HTMLButtonElement>('tab-stock'),
    proveedores: requireElement<HTMLButtonElement>('tab-proveedores'),
    compras: requireElement<HTMLButtonElement>('tab-compras'),
    gastos: requireElement<HTMLButtonElement>('tab-gastos'),
    finanzas: requireElement<HTMLButtonElement>('tab-finanzas'),
    reportes: requireElement<HTMLButtonElement>('tab-reportes'),
    sucursales: requireElement<HTMLButtonElement>('tab-sucursales'),
    seguridad: requireElement<HTMLButtonElement>('tab-seguridad')
  } satisfies Record<IntegradorModule, HTMLButtonElement>;

  const frames = {
    operativo: requireElement<HTMLIFrameElement>('frame-operativo'),
    tecnico: requireElement<HTMLIFrameElement>('frame-tecnico'),
    solicitudes: requireElement<HTMLIFrameElement>('frame-solicitudes'),
    archivo: requireElement<HTMLIFrameElement>('frame-archivo'),
    clientes: requireElement<HTMLIFrameElement>('frame-clientes'),
    tareas: requireElement<HTMLIFrameElement>('frame-tareas'),
    stock: requireElement<HTMLIFrameElement>('frame-stock'),
    proveedores: requireElement<HTMLIFrameElement>('frame-proveedores'),
    compras: requireElement<HTMLIFrameElement>('frame-compras'),
    gastos: requireElement<HTMLIFrameElement>('frame-gastos'),
    finanzas: requireElement<HTMLIFrameElement>('frame-finanzas'),
    reportes: requireElement<HTMLIFrameElement>('frame-reportes'),
    sucursales: requireElement<HTMLIFrameElement>('frame-sucursales'),
    seguridad: requireElement<HTMLIFrameElement>('frame-seguridad')
  } satisfies Record<IntegradorModule, HTMLIFrameElement>;

  const selectorSucursal = requireElement<HTMLSelectElement>('selector-sucursal');
  const loginScreen = requireElement<HTMLDivElement>('login-screen');
  const mainBar = requireElement<HTMLDivElement>('main-bar');
  const appLayout = requireElement<HTMLDivElement>('app-layout');
  const fallbackLinks = requireElement<HTMLDivElement>('fallback-links');
  const masterInput = requireElement<HTMLInputElement>('master-password');
  const masterUser = requireElement<HTMLInputElement>('master-username');
  const masterRemember = requireElement<HTMLInputElement>('master-remember');
  const masterBtn = requireElement<HTMLButtonElement>('master-login-btn');
  const masterError = requireElement<HTMLParagraphElement>('master-error');
  const loginCard = document.querySelector('.login-card') as HTMLDivElement | null;
  const workspaceTitle = requireElement<HTMLHeadingElement>('workspace-title');
  const workspaceSubtitle = requireElement<HTMLParagraphElement>('workspace-subtitle');
  const workspaceRole = requireElement<HTMLDivElement>('workspace-role');
  const workspaceModule = requireElement<HTMLDivElement>('workspace-current-module');
  const shellLogoutBtn = requireElement<HTMLButtonElement>('btn-shell-logout');

  function requireElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Elemento no encontrado: ${id}`);
    return el as T;
  }

  async function postAction<T>(action: string, payload: Record<string, unknown>, timeoutMs = 12000): Promise<T> {
    return backend.request<T>(action, payload, { method: 'POST', timeoutMs });
  }

  function buildFrameUrl(path: string): string {
    const url = new URL(path, window.location.href);
    url.searchParams.set('v', APP_BUILD);
    url.searchParams.set('integrador', '1');
    return url.toString();
  }

  function ensureFrameLoaded(moduleId: IntegradorModule): void {
    const frame = frames[moduleId];
    if (frame.src === 'about:blank') {
      frame.src = buildFrameUrl(frameSrc[moduleId]);
    }
  }

  function getStoredUser(): SrFix.AuthUser | null {
    const raw = sessionStorage.getItem('srfix_auth_user') || localStorage.getItem('srfix_auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SrFix.AuthUser;
    } catch {
      return null;
    }
  }

  function getAllowedModules(user: SrFix.AuthUser | null): IntegradorModule[] {
    if (!user?.ROL) return [];
    const role = String(user.ROL || '').toLowerCase();
    if (role === 'admin') return [...MODULE_IDS];
    return ['operativo', 'tecnico', 'solicitudes', 'archivo', 'tareas', 'stock'];
  }

  function showModule(moduleId: string): void {
    const storedUser = getStoredUser();
    const allowed = getAllowedModules(storedUser);
    const requested = MODULE_IDS.includes(moduleId as IntegradorModule) ? moduleId as IntegradorModule : 'operativo';
    const actual = allowed.includes(requested) ? requested : 'operativo';

    ensureFrameLoaded(actual);
    MODULE_IDS.forEach((key) => {
      panels[key].classList.toggle('active', key === actual);
      buttons[key].classList.toggle('active', key === actual);
    });

    const meta = moduleMeta[actual];
    workspaceTitle.textContent = meta.title;
    workspaceSubtitle.textContent = meta.subtitle;
    workspaceModule.textContent = `Modulo activo: ${meta.title}`;

    const url = new URL(window.location.href);
    url.searchParams.set('modulo', actual);
    window.history.replaceState({}, '', url.toString());
  }

  async function loadBranches(): Promise<void> {
    try {
      const data = await postAction<ListarSucursalesResponse>('listar_sucursales', { soloActivas: '1', page: 1, pageSize: 100 });
      const current = localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
      selectorSucursal.innerHTML = '<option value="GLOBAL">Todas las sucursales</option>';
      (data.sucursales || []).forEach((item) => {
        const option = document.createElement('option');
        option.value = String(item.ID || '');
        option.textContent = String(item.NOMBRE || item.ID || '');
        selectorSucursal.appendChild(option);
      });
      selectorSucursal.value = Array.from(selectorSucursal.options).some((opt) => opt.value === current) ? current : 'GLOBAL';
    } catch {
      selectorSucursal.innerHTML = '<option value="GLOBAL">Todas las sucursales</option>';
    }
  }

  function persistAuth(user: SrFix.AuthUser, remember: boolean): void {
    const raw = JSON.stringify(user || {});
    sessionStorage.setItem('srfix_auth_user', raw);
    sessionStorage.setItem('srfix_pass_master', 'OK');
    if (remember) localStorage.setItem('srfix_auth_user', raw);
    else localStorage.removeItem('srfix_auth_user');
  }

  function resetFrames(): void {
    MODULE_IDS.forEach((key) => {
      frames[key].src = 'about:blank';
    });
  }

  function showLoginScreen(): void {
    loginScreen.style.display = 'flex';
    mainBar.style.display = 'none';
    appLayout.style.display = 'none';
    fallbackLinks.style.display = 'none';
  }

  function showIntegrador(): void {
    loginScreen.style.display = 'none';
    mainBar.style.display = '';
    appLayout.style.display = 'flex';
    fallbackLinks.style.display = '';
  }

  function clearGlobalSession(): void {
    ['srfix_auth_user', 'srfix_pass_master'].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
  }

  function applyRoleUI(user: SrFix.AuthUser | null): void {
    const allowed = getAllowedModules(user);
    const role = String(user?.ROL || '').toLowerCase();
    MODULE_IDS.forEach((key) => {
      buttons[key].style.display = allowed.includes(key) ? '' : 'none';
    });
    workspaceRole.textContent = user ? `Rol: ${role || 'usuario'}` : 'Sin sesión';
    panels.seguridad.classList.remove('active');
  }

  function closeGlobalSession(): void {
    clearGlobalSession();
    masterInput.value = '';
    masterUser.value = '';
    masterError.textContent = '';
    resetFrames();
    applyRoleUI(null);
    showLoginScreen();
    showModule('operativo');
  }

  async function enterIntegrador(user: SrFix.AuthUser): Promise<void> {
    const allowed = getAllowedModules(user);
    applyRoleUI(user);
    if (!localStorage.getItem('srfix_sucursal_activa')) {
      localStorage.setItem('srfix_sucursal_activa', 'GLOBAL');
    }
    showIntegrador();
    await loadBranches();
    const requested = new URLSearchParams(window.location.search).get('modulo') || 'operativo';
    showModule(allowed.includes(requested as IntegradorModule) ? requested : 'operativo');
  }

  function setLoginLoading(isLoading: boolean, label = 'Entrar'): void {
    masterBtn.disabled = isLoading;
    loginCard?.classList.toggle('loading', isLoading);
    masterBtn.innerHTML = isLoading
      ? '<span class="btn-busy"><span class="spinner"></span><span>Ingresando...</span></span>'
      : label;
  }

  async function fetchLoginInternoConRetry(usuario: string, password: string, maxAttempts = 2): Promise<SrFix.LoginResult> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await postAction<SrFix.LoginResult>('login_interno', { usuario, password });
      } catch (error) {
        lastError = error;
        const message = String((error as Error)?.message || error || '');
        if (/credenciales|usuario|contrase/i.test(message)) throw error;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => window.setTimeout(resolve, 350));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('No se pudo validar el acceso');
  }

  async function validarMaster(): Promise<void> {
    masterError.textContent = '';
    const usuario = String(masterUser.value || '').trim();
    const password = String(masterInput.value || '').trim();

    if (!usuario || !password) {
      masterError.textContent = 'Ingresa usuario y contraseña';
      return;
    }

    setLoginLoading(true, 'Entrar');
    try {
      const data = await fetchLoginInternoConRetry(usuario, password, 2);
      if (!data.user) throw new Error(data.error || 'No se pudo validar el acceso');
      persistAuth(data.user, masterRemember.checked);
      await enterIntegrador(data.user);
    } catch (error) {
      const message = String((error as Error)?.message || error || 'No se pudo validar el acceso');
      masterError.textContent = /credenciales|usuario|contrase/i.test(message)
        ? message
        : 'No se pudo validar el acceso. Reintenta en unos segundos.';
    } finally {
      setLoginLoading(false, 'Entrar');
    }
  }

  function applyDeviceProfile(): void {
    const isMobile = window.matchMedia('(max-width: 900px)').matches || window.matchMedia('(pointer: coarse)').matches;
    document.body.setAttribute('data-device', isMobile ? 'mobile' : 'desktop');
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--app-vh', `${vh}px`);
  }

  function reloadLoadedFrames(): void {
    MODULE_IDS.forEach((key) => {
      const frame = frames[key];
      if (!frame.src || frame.src === 'about:blank') return;
      const cleanPath = new URL(frame.src).pathname.split('/').pop();
      if (!cleanPath) return;
      frame.src = buildFrameUrl(`./${cleanPath}`);
    });
  }

  function bindEvents(): void {
    MODULE_IDS.forEach((key) => {
      buttons[key].addEventListener('click', () => showModule(key));
    });

    selectorSucursal.addEventListener('change', () => {
      localStorage.setItem('srfix_sucursal_activa', selectorSucursal.value || 'GLOBAL');
      reloadLoadedFrames();
    });

    masterBtn.addEventListener('click', () => { void validarMaster(); });
    masterUser.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') void validarMaster();
    });
    masterInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') void validarMaster();
    });
    shellLogoutBtn.addEventListener('click', closeGlobalSession);

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if ((data as { type?: string }).type === 'srfix:logout') {
        closeGlobalSession();
      }
    });

    window.addEventListener('resize', applyDeviceProfile);
    window.addEventListener('orientationchange', applyDeviceProfile);
  }

  async function bootstrap(): Promise<void> {
    applyDeviceProfile();
    bindEvents();
    showLoginScreen();

    const rememberedRaw = localStorage.getItem('srfix_auth_user');
    if (rememberedRaw) {
      try {
        const rememberedUser = JSON.parse(rememberedRaw) as SrFix.AuthUser;
        masterUser.value = rememberedUser.USUARIO || '';
        masterRemember.checked = true;
      } catch {
        localStorage.removeItem('srfix_auth_user');
      }
    }

    const storedUser = getStoredUser();
    if (storedUser) {
      const raw = JSON.stringify(storedUser);
      sessionStorage.setItem('srfix_auth_user', raw);
      masterRemember.checked = !!localStorage.getItem('srfix_auth_user');
      await enterIntegrador(storedUser);
    }
  }

  void bootstrap();
})();
