"use strict";
;
(function () {
    const MODULE_IDS = [
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
    const backend = window.SRFIXBackend;
    const moduleMeta = {
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
    const frameSrc = {
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
        operativo: requireElement('panel-operativo'),
        tecnico: requireElement('panel-tecnico'),
        solicitudes: requireElement('panel-solicitudes'),
        archivo: requireElement('panel-archivo'),
        clientes: requireElement('panel-clientes'),
        tareas: requireElement('panel-tareas'),
        stock: requireElement('panel-stock'),
        proveedores: requireElement('panel-proveedores'),
        compras: requireElement('panel-compras'),
        gastos: requireElement('panel-gastos'),
        finanzas: requireElement('panel-finanzas'),
        reportes: requireElement('panel-reportes'),
        sucursales: requireElement('panel-sucursales'),
        seguridad: requireElement('panel-seguridad')
    };
    const buttons = {
        operativo: requireElement('tab-operativo'),
        tecnico: requireElement('tab-tecnico'),
        solicitudes: requireElement('tab-solicitudes'),
        archivo: requireElement('tab-archivo'),
        clientes: requireElement('tab-clientes'),
        tareas: requireElement('tab-tareas'),
        stock: requireElement('tab-stock'),
        proveedores: requireElement('tab-proveedores'),
        compras: requireElement('tab-compras'),
        gastos: requireElement('tab-gastos'),
        finanzas: requireElement('tab-finanzas'),
        reportes: requireElement('tab-reportes'),
        sucursales: requireElement('tab-sucursales'),
        seguridad: requireElement('tab-seguridad')
    };
    const frames = {
        operativo: requireElement('frame-operativo'),
        tecnico: requireElement('frame-tecnico'),
        solicitudes: requireElement('frame-solicitudes'),
        archivo: requireElement('frame-archivo'),
        clientes: requireElement('frame-clientes'),
        tareas: requireElement('frame-tareas'),
        stock: requireElement('frame-stock'),
        proveedores: requireElement('frame-proveedores'),
        compras: requireElement('frame-compras'),
        gastos: requireElement('frame-gastos'),
        finanzas: requireElement('frame-finanzas'),
        reportes: requireElement('frame-reportes'),
        sucursales: requireElement('frame-sucursales'),
        seguridad: requireElement('frame-seguridad')
    };
    const selectorSucursal = requireElement('selector-sucursal');
    const loginScreen = requireElement('login-screen');
    const mainBar = requireElement('main-bar');
    const appLayout = requireElement('app-layout');
    const fallbackLinks = requireElement('fallback-links');
    const masterInput = requireElement('master-password');
    const masterUser = requireElement('master-username');
    const masterRemember = requireElement('master-remember');
    const masterBtn = requireElement('master-login-btn');
    const masterError = requireElement('master-error');
    const loginCard = document.querySelector('.login-card');
    const workspaceTitle = requireElement('workspace-title');
    const workspaceSubtitle = requireElement('workspace-subtitle');
    const workspaceRole = requireElement('workspace-role');
    const workspaceModule = requireElement('workspace-current-module');
    const shellLogoutBtn = requireElement('btn-shell-logout');
    function requireElement(id) {
        const el = document.getElementById(id);
        if (!el)
            throw new Error(`Elemento no encontrado: ${id}`);
        return el;
    }
    async function postAction(action, payload, timeoutMs = 12000) {
        return backend.request(action, payload, { method: 'POST', timeoutMs });
    }
    function buildFrameUrl(path) {
        const url = new URL(path, window.location.href);
        url.searchParams.set('v', APP_BUILD);
        url.searchParams.set('integrador', '1');
        return url.toString();
    }
    function ensureFrameLoaded(moduleId) {
        const frame = frames[moduleId];
        if (frame.src === 'about:blank') {
            frame.src = buildFrameUrl(frameSrc[moduleId]);
        }
    }
    function getStoredUser() {
        const raw = sessionStorage.getItem('srfix_auth_user') || localStorage.getItem('srfix_auth_user');
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    function getAllowedModules(user) {
        if (!user?.ROL)
            return [];
        const role = String(user.ROL || '').toLowerCase();
        if (role === 'admin')
            return [...MODULE_IDS];
        return ['operativo', 'tecnico', 'solicitudes', 'archivo', 'tareas', 'stock'];
    }
    function showModule(moduleId) {
        const storedUser = getStoredUser();
        const allowed = getAllowedModules(storedUser);
        const requested = MODULE_IDS.includes(moduleId) ? moduleId : 'operativo';
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
    async function loadBranches() {
        try {
            const data = await postAction('listar_sucursales', { soloActivas: '1', page: 1, pageSize: 100 });
            const current = localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
            selectorSucursal.innerHTML = '<option value="GLOBAL">Todas las sucursales</option>';
            (data.sucursales || []).forEach((item) => {
                const option = document.createElement('option');
                option.value = String(item.ID || '');
                option.textContent = String(item.NOMBRE || item.ID || '');
                selectorSucursal.appendChild(option);
            });
            selectorSucursal.value = Array.from(selectorSucursal.options).some((opt) => opt.value === current) ? current : 'GLOBAL';
        }
        catch {
            selectorSucursal.innerHTML = '<option value="GLOBAL">Todas las sucursales</option>';
        }
    }
    function persistAuth(user, remember) {
        const raw = JSON.stringify(user || {});
        sessionStorage.setItem('srfix_auth_user', raw);
        sessionStorage.setItem('srfix_pass_master', 'OK');
        if (remember)
            localStorage.setItem('srfix_auth_user', raw);
        else
            localStorage.removeItem('srfix_auth_user');
    }
    function resetFrames() {
        MODULE_IDS.forEach((key) => {
            frames[key].src = 'about:blank';
        });
    }
    function showLoginScreen() {
        loginScreen.style.display = 'flex';
        mainBar.style.display = 'none';
        appLayout.style.display = 'none';
        fallbackLinks.style.display = 'none';
    }
    function showIntegrador() {
        loginScreen.style.display = 'none';
        mainBar.style.display = '';
        appLayout.style.display = 'flex';
        fallbackLinks.style.display = '';
    }
    function clearGlobalSession() {
        ['srfix_auth_user', 'srfix_pass_master'].forEach((key) => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });
    }
    function applyRoleUI(user) {
        const allowed = getAllowedModules(user);
        const role = String(user?.ROL || '').toLowerCase();
        MODULE_IDS.forEach((key) => {
            buttons[key].style.display = allowed.includes(key) ? '' : 'none';
        });
        workspaceRole.textContent = user ? `Rol: ${role || 'usuario'}` : 'Sin sesión';
        panels.seguridad.classList.remove('active');
    }
    function closeGlobalSession() {
        clearGlobalSession();
        masterInput.value = '';
        masterUser.value = '';
        masterError.textContent = '';
        resetFrames();
        applyRoleUI(null);
        showLoginScreen();
        showModule('operativo');
    }
    async function enterIntegrador(user) {
        const allowed = getAllowedModules(user);
        applyRoleUI(user);
        if (!localStorage.getItem('srfix_sucursal_activa')) {
            localStorage.setItem('srfix_sucursal_activa', 'GLOBAL');
        }
        showIntegrador();
        await loadBranches();
        const requested = new URLSearchParams(window.location.search).get('modulo') || 'operativo';
        showModule(allowed.includes(requested) ? requested : 'operativo');
    }
    function setLoginLoading(isLoading, label = 'Entrar') {
        masterBtn.disabled = isLoading;
        loginCard?.classList.toggle('loading', isLoading);
        masterBtn.innerHTML = isLoading
            ? '<span class="btn-busy"><span class="spinner"></span><span>Ingresando...</span></span>'
            : label;
    }
    async function fetchLoginInternoConRetry(usuario, password, maxAttempts = 2) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                return await postAction('login_interno', { usuario, password });
            }
            catch (error) {
                lastError = error;
                const message = String(error?.message || error || '');
                if (/credenciales|usuario|contrase/i.test(message))
                    throw error;
                if (attempt < maxAttempts) {
                    await new Promise((resolve) => window.setTimeout(resolve, 350));
                }
            }
        }
        throw lastError instanceof Error ? lastError : new Error('No se pudo validar el acceso');
    }
    async function validarMaster() {
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
            if (!data.user)
                throw new Error(data.error || 'No se pudo validar el acceso');
            persistAuth(data.user, masterRemember.checked);
            await enterIntegrador(data.user);
        }
        catch (error) {
            const message = String(error?.message || error || 'No se pudo validar el acceso');
            masterError.textContent = /credenciales|usuario|contrase/i.test(message)
                ? message
                : 'No se pudo validar el acceso. Reintenta en unos segundos.';
        }
        finally {
            setLoginLoading(false, 'Entrar');
        }
    }
    function applyDeviceProfile() {
        const isMobile = window.matchMedia('(max-width: 900px)').matches || window.matchMedia('(pointer: coarse)').matches;
        document.body.setAttribute('data-device', isMobile ? 'mobile' : 'desktop');
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--app-vh', `${vh}px`);
    }
    function reloadLoadedFrames() {
        MODULE_IDS.forEach((key) => {
            const frame = frames[key];
            if (!frame.src || frame.src === 'about:blank')
                return;
            const cleanPath = new URL(frame.src).pathname.split('/').pop();
            if (!cleanPath)
                return;
            frame.src = buildFrameUrl(`./${cleanPath}`);
        });
    }
    function bindEvents() {
        MODULE_IDS.forEach((key) => {
            buttons[key].addEventListener('click', () => showModule(key));
        });
        selectorSucursal.addEventListener('change', () => {
            localStorage.setItem('srfix_sucursal_activa', selectorSucursal.value || 'GLOBAL');
            reloadLoadedFrames();
        });
        masterBtn.addEventListener('click', () => { void validarMaster(); });
        masterUser.addEventListener('keypress', (event) => {
            if (event.key === 'Enter')
                void validarMaster();
        });
        masterInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter')
                void validarMaster();
        });
        shellLogoutBtn.addEventListener('click', closeGlobalSession);
        window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || typeof data !== 'object')
                return;
            if (data.type === 'srfix:logout') {
                closeGlobalSession();
            }
        });
        window.addEventListener('resize', applyDeviceProfile);
        window.addEventListener('orientationchange', applyDeviceProfile);
    }
    async function bootstrap() {
        applyDeviceProfile();
        bindEvents();
        showLoginScreen();
        const rememberedRaw = localStorage.getItem('srfix_auth_user');
        if (rememberedRaw) {
            try {
                const rememberedUser = JSON.parse(rememberedRaw);
                masterUser.value = rememberedUser.USUARIO || '';
                masterRemember.checked = true;
            }
            catch {
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
