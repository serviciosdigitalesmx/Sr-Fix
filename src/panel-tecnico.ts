type TecnicoRequestMethod = 'GET' | 'POST';

interface TecnicoBackendEnvelope {
  success?: boolean;
  error?: string | null;
}

interface TecnicoInternalUserRecord {
  ROL?: string;
  [key: string]: unknown;
}

interface TecnicoFiltroState {
  texto: string;
  color: 'todos' | 'rojo' | 'amarillo' | 'verde';
  estado: 'todos' | 'Recibido' | 'En Diagnóstico' | 'En Reparación' | 'Esperando Refacción' | 'Listo' | 'Entregado';
  orden: 'dias_asc' | 'dias_desc' | 'folio_asc' | 'folio_desc';
}

interface TecnicoEquipoRecord {
  FOLIO: SrFix.Folio;
  ESTADO: string;
  CLIENTE_NOMBRE: string;
  CLIENTE_TELEFONO?: string;
  DISPOSITIVO: string;
  MODELO?: string;
  FALLA_REPORTADA?: string;
  COSTO_ESTIMADO?: number | string;
  FECHA_INGRESO?: string;
  FECHA_PROMESA?: string;
  FECHA_ULTIMA_ACTUALIZACION?: string;
  TECNICO_ASIGNADO?: string;
  YOUTUBE_ID?: string;
  FOTO_RECEPCION?: string;
  fotoRecepcion?: string;
  FOTO?: string;
  foto?: string;
  IMAGEN_RECEPCION?: string;
  imagenRecepcion?: string;
  CASO_RESOLUCION_TECNICA?: string;
  NOTAS_INTERNAS?: string;
  SEGUIMIENTO_CLIENTE?: string;
  SEGUIMIENTO_FOTOS?: string | string[];
  CHECK_CARGADOR?: string;
  CHECK_PANTALLA?: string;
  CHECK_PRENDE?: string;
  CHECK_RESPALDO?: string;
  CHECK_CARGADOR_BOOL?: boolean;
  CHECK_PANTALLA_BOOL?: boolean;
  CHECK_PRENDE_BOOL?: boolean;
  CHECK_RESPALDO_BOOL?: boolean;
  diasRestantes?: number;
  color?: 'rojo' | 'amarillo' | 'verde' | 'gris';
}

interface TecnicoSemaforoResponse extends TecnicoBackendEnvelope {
  equipos?: TecnicoEquipoRecord[];
  urgentes?: number;
  atencion?: number;
  aTiempo?: number;
  total?: number;
}

interface TecnicoDetalleEquipoResponse extends TecnicoBackendEnvelope {
  equipo?: TecnicoEquipoRecord | null;
}

interface TecnicoActualizarEquipoResponse extends TecnicoBackendEnvelope {
  success?: boolean;
  equipo?: TecnicoEquipoRecord | Record<string, unknown>;
}

;(function (): void {
const BACKEND_URL: string = String(CONFIG.API_URL || '').trim();
const FRONT_PASSWORD: string = String(CONFIG.FRONT_PASSWORD || 'Admin1').trim();
const LOGO_URL: string = './logo.webp';

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let PASSWORD = '';
let equiposData: TecnicoEquipoRecord[] = [];
let equiposFiltrados: TecnicoEquipoRecord[] = [];
let seguimientoFotosBase64: string[] = [];
let intervalo: number | null = null;
let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let urgentesPrevio = 0;
let primeraCargaTecnico = true;
let ultimoBeepRojoTs = 0;
let ultimaFirmaSemaforo = '';
let loginEnCurso = false;
let cargaDatosSeq = 0;
let seguimientoOriginalSerializado = '[]';
let filtros: TecnicoFiltroState = {
  texto: '',
  color: 'todos',
  estado: 'todos',
  orden: 'dias_asc'
};

function readInternalUser(): TecnicoInternalUserRecord | null {
  try {
    const raw = sessionStorage.getItem('srfix_auth_user') || localStorage.getItem('srfix_auth_user');
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as TecnicoInternalUserRecord;
  } catch {
    return null;
  }
}

function getRequestedFolio(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const folio = String(params.get('folio') || '').trim().toUpperCase();
    return folio || '';
  } catch {
    return '';
  }
}

function clearRequestedFolio(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('folio');
    history.replaceState({}, document.title, url.toString());
  } catch {
    // No-op.
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

function hasTecnicoAccess(): boolean {
  if (isEmbeddedIntegratorAccess()) return true;
  const user = readInternalUser();
  if (!user) return false;
  const rol = String(user.ROL || '').toLowerCase();
  return ['admin', 'operativo', 'tecnico', 'supervisor'].includes(rol);
}

function tecnicoGetElement(id: string): any {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Elemento no encontrado: ${id}`);
  }
  return el;
}

// Cargar preferencias guardadas
        (function() {
            if (hasTecnicoAccess()) {
                tecnicoGetElement('login-screen').classList.add('hidden');
                tecnicoGetElement('app').classList.remove('hidden');
                setTimeout(login, 200);
                return;
            }
            const savedPass = sessionStorage.getItem('srfix_pass_tecnico') || localStorage.getItem('srfix_pass_tecnico');
            if (savedPass) {
                tecnicoGetElement('password-input').value = savedPass;
                if (localStorage.getItem('srfix_pass_tecnico')) {
                    tecnicoGetElement('remember-me').checked = true;
                }
                // Si hay pass guardado, intentamos login automático
                setTimeout(login, 500);
            }
            const savedFiltros = localStorage.getItem('srfix_filtros_tecnico');
            if (savedFiltros) {
                try {
                    filtros = JSON.parse(savedFiltros);
                    tecnicoGetElement('buscador').value = filtros.texto || '';
                    tecnicoGetElement('filtro-color').value = filtros.color || 'todos';
                    tecnicoGetElement('filtro-estado').value = filtros.estado || 'todos';
                    tecnicoGetElement('ordenar-por').value = filtros.orden || 'dias_asc';
                } catch (e) {}
            }
        })();

        function formatearFechaHoraLarga(date: Date = new Date()): string {
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
            const el = tecnicoGetElement('fecha-actual');
            if (!el) return;
            const texto = formatearFechaHoraLarga();
            el.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
        }

        // ==========================================
        // LOGIN / LOGOUT
        // ==========================================
        async function login(): Promise<void> {
            if (loginEnCurso) return;
            loginEnCurso = true;
            PASSWORD = tecnicoGetElement('password-input').value.trim();
            const trustedInternalAccess = hasTecnicoAccess();
            if (!trustedInternalAccess) {
                if (!PASSWORD) {
                    loginEnCurso = false;
                    return mostrarErrorLogin('Ingresa la contraseña');
                }
                if (PASSWORD !== FRONT_PASSWORD) {
                    loginEnCurso = false;
                    return mostrarErrorLogin('Contraseña incorrecta');
                }
            }

            const btn = tecnicoGetElement('btn-login');
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner w-5 h-5"></div> Verificando...';
            ocultarErrorLogin();

            const ok = await cargarDatos(true);

            if (ok) {
                const remember = tecnicoGetElement('remember-me').checked;
                if (!trustedInternalAccess) {
                    sessionStorage.setItem('srfix_pass_tecnico', PASSWORD);
                    if (remember) {
                        localStorage.setItem('srfix_pass_tecnico', PASSWORD);
                    } else {
                        localStorage.removeItem('srfix_pass_tecnico');
                    }
                }
                
                tecnicoGetElement('login-screen').classList.add('hidden');
                tecnicoGetElement('app').classList.remove('hidden');
                actualizarFechaActual();
                setInterval(actualizarFechaActual, 60000);
                if (intervalo) clearInterval(intervalo);
                intervalo = setInterval(cargarDatos, 30000);
                await abrirEquipoDesdeQuery();
            } else {
                mostrarErrorLogin('No se pudo iniciar sesión por conexión o backend. Si la clave es Admin1, intenta de nuevo.');
                btn.innerHTML = 'INGRESAR';
                btn.disabled = false;
            }
            loginEnCurso = false;
        }

        function logout(): void {
            if (intervalo) clearInterval(intervalo);
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'srfix:logout' }, '*');
                    return;
                }
            } catch (e) {}
            sessionStorage.removeItem('srfix_pass_tecnico');
            localStorage.removeItem('srfix_pass_tecnico');
            location.reload();
        }

        function mostrarErrorLogin(msg: string): void {
            const el = tecnicoGetElement('login-error');
            el.textContent = msg;
            el.classList.remove('hidden');
        }
        function ocultarErrorLogin(): void {
            tecnicoGetElement('login-error').classList.add('hidden');
        }

        // ==========================================
        // CARGA DE DATOS
        // ==========================================
        function getAudioCtx(): AudioContext | null {
            if (!audioCtx) {
                const mediaWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
                const Ctx = window.AudioContext || mediaWindow.webkitAudioContext;
                if (!Ctx) return null;
                audioCtx = new Ctx();
            }
            return audioCtx;
        }

        async function unlockAudio(): Promise<void> {
            const ctx = getAudioCtx();
            if (!ctx) return;
            try {
                if (ctx.state === 'suspended') await ctx.resume();
                audioUnlocked = ctx.state === 'running';
            } catch (e) {
                audioUnlocked = false;
            }
        }

        function beep(freq: number = 520, duration: number = 0.12, delay: number = 0): void {
            const ctx = getAudioCtx();
            if (!ctx || !audioUnlocked || ctx.state !== 'running') return;
            const t0 = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + duration + 0.01);
        }

        function sonidoAlertaRojo(): void {
            beep(520, 0.1, 0);
            beep(430, 0.14, 0.14);
        }

        function calcularFirmaSemaforo(lista: TecnicoEquipoRecord[] = []): string {
            return (lista || [])
                .map(eq => `${eq.FOLIO}|${eq.ESTADO}|${eq.diasRestantes}|${eq.color}|${eq.TECNICO_ASIGNADO || ''}`)
                .join('||');
        }

        async function fetchJsonConTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 12000): Promise<Response> {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const res = await fetch(url, { ...options, signal: controller.signal });
                return res;
            } finally {
                clearTimeout(timer);
            }
        }

        async function obtenerSemaforoData(pageSize: number): Promise<TecnicoSemaforoResponse> {
            const queryUrl = `${BACKEND_URL}?action=semaforo&page=1&pageSize=${encodeURIComponent(pageSize)}&t=${Date.now()}`;
            const body = JSON.stringify({
                action: 'semaforo',
                page: 1,
                pageSize: pageSize
            });

            let data = null;
            let res = await fetchJsonConTimeout(queryUrl, { method: 'GET' });
            if (res.ok) {
                try { data = await res.json(); } catch (e) {}
            }
            if (!data || data.error) {
                res = await fetchJsonConTimeout(BACKEND_URL, { method: 'POST', body: body });
                if (res.ok) {
                    try { data = await res.json(); } catch (e) {}
                }
            }
            if (!data || data.error) throw new Error((data && data.error) || 'Error de conexión');
            return data;
        }

        async function cargarDatos(esLogin: boolean = false): Promise<boolean> {
            const requestSeq = ++cargaDatosSeq;
            mostrarRefreshing(true);
            try {
                const pageSize = Math.max(1000, equiposData.length || 0);
                const data = await obtenerSemaforoData(pageSize);
                if (requestSeq !== cargaDatosSeq) return false;

                const nuevosEquipos = data.equipos || [];
                const firmaNueva = calcularFirmaSemaforo(nuevosEquipos);
                const huboCambios = firmaNueva !== ultimaFirmaSemaforo;
                equiposData = nuevosEquipos;
                ultimaFirmaSemaforo = firmaNueva;
                tecnicoGetElement('count-urgentes').textContent = data.urgentes || 0;
                tecnicoGetElement('count-atencion').textContent = data.atencion || 0;
                tecnicoGetElement('count-tiempo').textContent = data.aTiempo || 0;
                tecnicoGetElement('count-total').textContent = Number(data.total || equiposData.length);
                const urgentesActual = Number(data.urgentes || 0);
                const now = Date.now();
                const cooldownMs = 120000;
                if (!primeraCargaTecnico && urgentesActual > urgentesPrevio && now - ultimoBeepRojoTs > cooldownMs) {
                    sonidoAlertaRojo();
                    ultimoBeepRojoTs = now;
                }
                urgentesPrevio = urgentesActual;
                primeraCargaTecnico = false;

                if (huboCambios || esLogin) aplicarFiltrosYOrdenar();
                actualizarHoraActualizacion();
                if (!esLogin && huboCambios) mostrarToast('Datos actualizados', 'success');
                return true;
            } catch (e) {
                const mensaje = String(e instanceof Error ? e.message : e || '');
                const esAbort = mensaje.toLowerCase().includes('abort');
                if (esAbort) return false;
                console.error('Error cargando datos:', e);
                if (!esLogin) {
                    mostrarToast('Error al actualizar', 'error');
                }
                return false;
            } finally {
                mostrarRefreshing(false);
            }
        }

        function refrescarManual(): void {
            cargarDatos();
        }

        function mostrarRefreshing(mostrar: boolean): void {
            const el = tecnicoGetElement('refreshing-indicator');
            if (mostrar) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }

        function actualizarHoraActualizacion(): void {
            tecnicoGetElement('last-update').innerHTML = `<i class="fa-regular fa-clock mr-1 text-[#1F7EDC]"></i> ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second:'2-digit' })}`;
        }

        // ==========================================
        // FILTROS Y ORDENAMIENTO
        // ==========================================
        function aplicarFiltrosYOrdenar(): void {
            filtros.texto = tecnicoGetElement('buscador').value.trim().toLowerCase();
            filtros.color = tecnicoGetElement('filtro-color').value;
            filtros.estado = tecnicoGetElement('filtro-estado').value;
            filtros.orden = tecnicoGetElement('ordenar-por').value;

            localStorage.setItem('srfix_filtros_tecnico', JSON.stringify(filtros));

            let resultado = equiposData.filter(eq => {
                if (filtros.color !== 'todos' && eq.color !== filtros.color) return false;
                if (filtros.estado !== 'todos' && eq.ESTADO !== filtros.estado) return false;
                if (filtros.texto) {
                    const texto = filtros.texto;
                    return (eq.FOLIO && eq.FOLIO.toLowerCase().includes(texto)) ||
                           (eq.CLIENTE_NOMBRE && eq.CLIENTE_NOMBRE.toLowerCase().includes(texto)) ||
                           (eq.DISPOSITIVO && eq.DISPOSITIVO.toLowerCase().includes(texto)) ||
                           (eq.MODELO && eq.MODELO.toLowerCase().includes(texto));
                }
                return true;
            });

            resultado.sort((a, b) => {
                const diasA = Number(a.diasRestantes || 0);
                const diasB = Number(b.diasRestantes || 0);
                switch (filtros.orden) {
                    case 'dias_asc':
                        return (diasA - diasB)
                            || String(a.FECHA_PROMESA || '').localeCompare(String(b.FECHA_PROMESA || ''))
                            || String(a.FOLIO || '').localeCompare(String(b.FOLIO || ''));
                    case 'dias_desc': return diasB - diasA;
                    case 'folio_asc': return (a.FOLIO || '').localeCompare(b.FOLIO || '');
                    case 'folio_desc': return (b.FOLIO || '').localeCompare(a.FOLIO || '');
                    default: return 0;
                }
            });

            equiposFiltrados = resultado;
            renderizar();
        }

        tecnicoGetElement('buscador').addEventListener('input', aplicarFiltrosYOrdenar);
        tecnicoGetElement('filtro-color').addEventListener('change', aplicarFiltrosYOrdenar);
        tecnicoGetElement('filtro-estado').addEventListener('change', aplicarFiltrosYOrdenar);
        tecnicoGetElement('ordenar-por').addEventListener('change', aplicarFiltrosYOrdenar);

        function limpiarFiltros(): void {
            tecnicoGetElement('buscador').value = '';
            tecnicoGetElement('filtro-color').value = 'todos';
            tecnicoGetElement('filtro-estado').value = 'todos';
            tecnicoGetElement('ordenar-por').value = 'dias_asc';
            aplicarFiltrosYOrdenar();
        }

        // ==========================================
        // RENDERIZADO DE TARJETAS
        // ==========================================
        function formatDateWords(dateStr: string | null | undefined): string {
            if (!dateStr) return '---';
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return dateStr;
                const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const d = date.getDate();
                const m = meses[date.getMonth()];
                let h = date.getHours();
                const min = String(date.getMinutes()).padStart(2, '0');
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                return `${d} de ${m}, ${h}:${min} ${ampm}`;
            } catch (e) { return dateStr; }
        }

        function formatMoney(value: number | string | null | undefined): string {
            const amount = Number(value || 0);
            return new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                minimumFractionDigits: 2
            }).format(isFinite(amount) ? amount : 0);
        }

        function formatDateInput(value: string | null | undefined): string {
            if (!value) return '';
            const raw = String(value).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
            const d = new Date(raw);
            if (Number.isNaN(d.getTime())) return '';
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        function toggleEditField(field: string): void {
            const map: Record<string, any> = {
                cliente: tecnicoGetElement('modal-cliente-input'),
                telefono: tecnicoGetElement('modal-telefono-input'),
                equipo: tecnicoGetElement('modal-equipo-edit'),
                costo: tecnicoGetElement('modal-costo-input'),
                'fecha-promesa': tecnicoGetElement('modal-fecha-promesa-input')
            };
            const el = map[field];
            if (!el) return;
            el.classList.toggle('hidden');
            if (!el.classList.contains('hidden')) {
                const target = el.matches && el.matches('input,textarea,select') ? el : el.querySelector && el.querySelector('input,textarea,select');
                if (target && typeof target.focus === 'function') {
                    target.focus();
                    if (typeof target.select === 'function') target.select();
                }
            }
        }

        interface TecnicoEdicionModalEquipo {
            clienteNombre: string;
            clienteTelefono: string;
            dispositivo: string;
            modelo: string;
            costo: number;
            fechaPromesa: string;
            estado: string;
            tecnico: string;
            yt: string;
            notas: string;
            seguimiento: string;
            resolucion: string;
            checkCargador: boolean;
            checkPantalla: boolean;
            checkPrende: boolean;
            checkRespaldo: boolean;
        }

        function leerEdicionModalEquipo(): TecnicoEdicionModalEquipo {
            return {
                clienteNombre: tecnicoGetElement('modal-cliente-input').value.trim(),
                clienteTelefono: tecnicoGetElement('modal-telefono-input').value.trim(),
                dispositivo: tecnicoGetElement('modal-equipo-dispositivo').value.trim(),
                modelo: tecnicoGetElement('modal-equipo-modelo').value.trim(),
                costo: Number(tecnicoGetElement('modal-costo-input').value || 0),
                fechaPromesa: tecnicoGetElement('modal-fecha-promesa-input').value,
                estado: tecnicoGetElement('modal-estado').value,
                tecnico: tecnicoGetElement('modal-tecnico').value.trim(),
                yt: tecnicoGetElement('modal-yt').value.trim(),
                notas: tecnicoGetElement('modal-notas').value,
                seguimiento: tecnicoGetElement('modal-seguimiento').value,
                resolucion: tecnicoGetElement('modal-resolucion').value,
                checkCargador: tecnicoGetElement('check-cargador').checked,
                checkPantalla: tecnicoGetElement('check-pantalla').checked,
                checkPrende: tecnicoGetElement('check-prende').checked,
                checkRespaldo: tecnicoGetElement('check-respaldo').checked
            };
        }

        function construirCamposActualizacionEquipo(estadoForzado: string = ''): { ed: TecnicoEdicionModalEquipo; campos: Record<string, unknown> } {
            const ed = leerEdicionModalEquipo();
            if (estadoForzado) ed.estado = estadoForzado;
            const campos: Record<string, unknown> = {};
            const pushIfChanged = (key: string, next: unknown, prev: unknown, normalizer: (v: unknown) => unknown = (v) => v): void => {
                const nNext = normalizer(next);
                const nPrev = normalizer(prev);
                if (String(nNext) !== String(nPrev)) campos[key] = nNext;
            };
            pushIfChanged('CLIENTE_NOMBRE', ed.clienteNombre, equipoActual?.CLIENTE_NOMBRE || '');
            pushIfChanged('CLIENTE_TELEFONO', ed.clienteTelefono, equipoActual?.CLIENTE_TELEFONO || '');
            pushIfChanged('DISPOSITIVO', ed.dispositivo, equipoActual?.DISPOSITIVO || '');
            pushIfChanged('MODELO', ed.modelo, equipoActual?.MODELO || '');
            pushIfChanged('COSTO_ESTIMADO', Number(ed.costo || 0), Number(equipoActual?.COSTO_ESTIMADO || 0), (v) => Number(v || 0));
            pushIfChanged('FECHA_PROMESA', ed.fechaPromesa, formatDateInput(equipoActual?.FECHA_PROMESA || ''));
            pushIfChanged('ESTADO', ed.estado, equipoActual?.ESTADO || '');
            pushIfChanged('TECNICO_ASIGNADO', ed.tecnico, equipoActual?.TECNICO_ASIGNADO || '');
            pushIfChanged('YOUTUBE_ID', ed.yt, equipoActual?.YOUTUBE_ID || '');
            pushIfChanged('NOTAS_INTERNAS', ed.notas, equipoActual?.NOTAS_INTERNAS || '');
            pushIfChanged('SEGUIMIENTO_CLIENTE', ed.seguimiento, equipoActual?.SEGUIMIENTO_CLIENTE || '');
            pushIfChanged('CASO_RESOLUCION_TECNICA', ed.resolucion, equipoActual?.CASO_RESOLUCION_TECNICA || '');
            pushIfChanged('CHECK_CARGADOR', ed.checkCargador ? 'SÍ' : 'NO', equipoActual?.CHECK_CARGADOR || 'NO');
            pushIfChanged('CHECK_PANTALLA', ed.checkPantalla ? 'SÍ' : 'NO', equipoActual?.CHECK_PANTALLA || 'NO');
            pushIfChanged('CHECK_PRENDE', ed.checkPrende ? 'SÍ' : 'NO', equipoActual?.CHECK_PRENDE || 'NO');
            pushIfChanged('CHECK_RESPALDO', ed.checkRespaldo ? 'SÍ' : 'NO', equipoActual?.CHECK_RESPALDO || 'NO');
            return { ed, campos };
        }

        function renderizar(): void {
            const grid = tecnicoGetElement('equipos-grid');
            if (!equiposFiltrados.length) {
                grid.innerHTML = '<div class="col-span-full text-center py-12 text-[#8A8F95]"><i class="fa-solid fa-folder-open text-4xl mb-4 opacity-30"></i><p>No hay equipos con esos filtros</p></div>';
                return;
            }

            grid.innerHTML = '';
            equiposFiltrados.forEach(eq => {
                // Alerta de inactividad (48h)
                const ultimaAct = new Date(String(eq.FECHA_ULTIMA_ACTUALIZACION || eq.FECHA_INGRESO || ''));
                const esInactivo = (Date.now() - ultimaAct.getTime()) > (48 * 60 * 60 * 1000);
                const inactivoClase = esInactivo && eq.ESTADO !== 'Entregado' ? 'border-2 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border border-transparent';
                const diasValor = Number(eq.diasRestantes);
                const tieneDias = Number.isFinite(diasValor) && String(eq.FECHA_PROMESA || '').trim() !== '';

                const card = document.createElement('div');
                card.className = `card-${eq.color} rounded-xl p-5 cursor-pointer hover:scale-[1.02] transition-all ${inactivoClase}`;
                card.onclick = () => abrirModal(eq);

                const dotClass = eq.color === 'rojo' ? 'bg-red-500 animate-pulse-red' : eq.color === 'amarillo' ? 'bg-yellow-500' : 'bg-green-500';
                const diasClase = !tieneDias ? 'text-[#8A8F95]' : diasValor <= 2 ? 'text-red-500 font-bold' : diasValor <= 4 ? 'text-yellow-500' : 'text-[#8A8F95]';

                let badgeClass = '';
                switch (eq.ESTADO) {
                    case 'Recibido': badgeClass = 'badge-recibido'; break;
                    case 'En Diagnóstico': badgeClass = 'badge-diagnostico'; break;
                    case 'En Reparación': badgeClass = 'badge-reparacion'; break;
                    case 'Esperando Refacción': badgeClass = 'badge-esperando'; break;
                    case 'Listo': badgeClass = 'badge-listo'; break;
                    case 'Entregado': badgeClass = 'badge-entregado'; break;
                    default: badgeClass = 'badge-recibido';
                }

                card.innerHTML = `
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded-full ${dotClass}"></div>
                            <span class="font-mono font-bold text-[#F2F2F2]">${escapeHtml(eq.FOLIO)}</span>
                            ${esInactivo && eq.ESTADO !== 'Entregado' ? '<span class="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded animate-pulse">SIN AVANCE</span>' : ''}
                        </div>
                        <span class="text-xs ${diasClase} bg-[#1E1E1E] px-2 py-1 rounded-full">${tieneDias ? `${diasValor} días` : 'Sin fecha'}</span>
                    </div>
                    <h3 class="font-semibold text-[#F2F2F2] mb-1 truncate" title="${escapeHtml(eq.CLIENTE_NOMBRE)}">${escapeHtml(eq.CLIENTE_NOMBRE)}</h3>
                    <p class="text-[#8A8F95] text-sm mb-1 truncate">${escapeHtml(eq.DISPOSITIVO)} ${escapeHtml(eq.MODELO || '')}</p>
                    <div class="mt-3 rounded-xl border border-[#1F7EDC]/20 bg-[#1E1E1E]/90 p-3 space-y-2">
                        <div class="flex items-start gap-2">
                            <i class="fa-solid fa-triangle-exclamation text-[#FF6A2A] mt-0.5"></i>
                            <div class="min-w-0">
                                <div class="text-[11px] uppercase tracking-wider text-[#8A8F95]">Falla reportada</div>
                                <p class="text-xs text-[#F2F2F2] leading-5 break-words" title="${escapeHtml(eq.FALLA_REPORTADA || 'Sin descripción')}">${escapeHtml(eq.FALLA_REPORTADA || 'Sin descripción')}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-sack-dollar text-[#1F7EDC]"></i>
                            <div>
                                <div class="text-[11px] uppercase tracking-wider text-[#8A8F95]">Precio</div>
                                <p class="text-xs text-[#F2F2F2] font-semibold">${formatMoney(eq.COSTO_ESTIMADO || 0)}</p>
                            </div>
                        </div>
                    </div>
                    <p class="text-[10px] text-[#8A8F95] mb-2 uppercase tracking-wider">Recibido: ${formatDateWords(eq.FECHA_INGRESO)}</p>
                    <div class="flex flex-wrap gap-2 items-center justify-between mt-3">
                        <span class="badge-estado ${badgeClass} text-xs">${escapeHtml(eq.ESTADO)}</span>
                        <span class="text-xs text-[#1F7EDC] flex items-center gap-1"><i class="fa-regular fa-eye"></i> Ver detalles</span>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        // ==========================================
        // MODAL
        // ==========================================
        let equipoActual: TecnicoEquipoRecord | null = null;

        function extraerDriveIdDesdeTexto(texto: string | null | undefined): string {
            const s = String(texto || '').trim();
            if (!s) return '';
            let m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (m && m[1]) return m[1];
            m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (m && m[1]) return m[1];
            return '';
        }

        function obtenerCandidatasImagen(raw: unknown): string[] {
            const resultados: string[] = [];
            const push = (valor: unknown): void => {
                const s = String(valor || '').trim();
                if (!s) return;
                if (!resultados.includes(s)) resultados.push(s);
            };

            let valor = raw;
            if (Array.isArray(valor) && valor.length) {
                valor = valor[0];
            }
            if (valor && typeof valor === 'object') {
                const rawObj = valor as Record<string, unknown>;
                valor = rawObj.url || rawObj.src || rawObj.dataUrl || rawObj.base64 || rawObj.FOTO_RECEPCION || rawObj.fotoRecepcion || '';
            } else if (typeof valor === 'string') {
                const t = valor.trim();
                if (t.startsWith('{') || t.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(t);
                        if (Array.isArray(parsed) && parsed.length) {
                            valor = parsed[0];
                        } else if (parsed && typeof parsed === 'object' && parsed.url) {
                            valor = parsed.url;
                        }
                    } catch (e) {}
                }
            }

            const principal = String(valor || '').trim();
            if (!principal) return resultados;
            push(principal);

            if (principal.startsWith('//')) {
                push(`https:${principal}`);
            }

            const driveId = extraerDriveIdDesdeTexto(principal);
            if (driveId) {
                push(`https://drive.google.com/uc?export=view&id=${driveId}`);
                push(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`);
            }

            return resultados;
        }

        function obtenerFotoRecepcionRaw(eq: TecnicoEquipoRecord | null | undefined): unknown {
            if (!eq || typeof eq !== 'object') return '';
            return eq.FOTO_RECEPCION
                || eq.fotoRecepcion
                || eq.FOTO
                || eq.foto
                || eq.IMAGEN_RECEPCION
                || eq.imagenRecepcion
                || '';
        }

        function cargarFotoRecepcionModal(raw: unknown): void {
            const wrap = tecnicoGetElement('modal-foto-wrap');
            const img = tecnicoGetElement('modal-foto');
            const candidatas = obtenerCandidatasImagen(raw);

            if (!candidatas.length) {
                wrap.classList.add('hidden');
                img.removeAttribute('src');
                img.onerror = null;
                return;
            }

            let idx = 0;
            wrap.classList.remove('hidden');
            img.onerror = () => {
                idx += 1;
                if (idx < candidatas.length) {
                    img.src = candidatas[idx];
                    return;
                }
                img.onerror = null;
                wrap.classList.add('hidden');
                img.removeAttribute('src');
            };
            img.src = candidatas[idx];
        }

        async function abrirModal(eq: TecnicoEquipoRecord): Promise<void> {
            equipoActual = eq;
            if (!eq.FOTO_RECEPCION) {
                const detalle = await obtenerDetalleEquipo(eq.FOLIO);
                if (detalle) eq = { ...eq, ...detalle };
            }
            equipoActual = eq;
            tecnicoGetElement('modal-folio').textContent = eq.FOLIO;
            tecnicoGetElement('modal-folio-detalle').textContent = eq.FOLIO || 'N/A';
            tecnicoGetElement('modal-cliente').textContent = eq.CLIENTE_NOMBRE || 'N/A';
            tecnicoGetElement('modal-telefono').textContent = eq.CLIENTE_TELEFONO || 'N/A';
            tecnicoGetElement('modal-cliente-input').value = eq.CLIENTE_NOMBRE || '';
            tecnicoGetElement('modal-telefono-input').value = eq.CLIENTE_TELEFONO || '';
            tecnicoGetElement('modal-equipo-dispositivo').value = eq.DISPOSITIVO || '';
            tecnicoGetElement('modal-equipo-modelo').value = eq.MODELO || '';
            tecnicoGetElement('modal-costo-input').value = Number(eq.COSTO_ESTIMADO || 0).toFixed(2);
            tecnicoGetElement('modal-fecha-promesa-input').value = formatDateInput(eq.FECHA_PROMESA || '');
            const waBtn = tecnicoGetElement('modal-wa-btn');
            const waUrl = construirWaUrl(eq.CLIENTE_TELEFONO, eq.FOLIO);
            if (waUrl) {
                waBtn.href = waUrl;
                waBtn.classList.remove('hidden');
            } else {
                waBtn.href = '#';
                waBtn.classList.add('hidden');
            }
            tecnicoGetElement('modal-equipo').textContent = `${eq.DISPOSITIVO || ''} ${eq.MODELO || ''}`.trim() || 'N/A';
            tecnicoGetElement('modal-costo').textContent = Number(eq.COSTO_ESTIMADO || 0) > 0
                ? formatMoney(eq.COSTO_ESTIMADO)
                : 'Pendiente por cotizar';
            tecnicoGetElement('modal-falla').textContent = eq.FALLA_REPORTADA || 'Sin descripción';

            const fechaPromesaEl = tecnicoGetElement('modal-fecha-promesa');
            const diasValor = Number(eq.diasRestantes);
            const tieneDias = Number.isFinite(diasValor) && String(eq.FECHA_PROMESA || '').trim() !== '';
            const diasClase = !tieneDias ? '' : diasValor <= 2 ? 'text-red-500 font-bold' : diasValor <= 4 ? 'text-yellow-500' : '';
            fechaPromesaEl.className = `text-[#F2F2F2] ${diasClase}`;
            fechaPromesaEl.textContent = tieneDias ? `${eq.FECHA_PROMESA || 'N/A'} (${diasValor} días)` : 'N/A';

            tecnicoGetElement('modal-estado').value = eq.ESTADO || 'Recibido';
            tecnicoGetElement('modal-tecnico').value = eq.TECNICO_ASIGNADO || '';
            tecnicoGetElement('modal-yt').value = eq.YOUTUBE_ID || '';
            tecnicoGetElement('modal-notas').value = eq.NOTAS_INTERNAS || '';
            tecnicoGetElement('modal-seguimiento').value = eq.SEGUIMIENTO_CLIENTE || '';
            tecnicoGetElement('modal-resolucion').value = eq.CASO_RESOLUCION_TECNICA || '';
            seguimientoFotosBase64 = parseSeguimientoFotos(eq.SEGUIMIENTO_FOTOS);
            seguimientoOriginalSerializado = JSON.stringify(seguimientoFotosBase64);
            renderizarGaleriaSeguimiento();

            cargarFotoRecepcionModal(obtenerFotoRecepcionRaw(eq));

            tecnicoGetElement('check-cargador').checked = checkToBool(eq.CHECK_CARGADOR, eq.CHECK_CARGADOR_BOOL);
            tecnicoGetElement('check-pantalla').checked = checkToBool(eq.CHECK_PANTALLA, eq.CHECK_PANTALLA_BOOL);
            tecnicoGetElement('check-prende').checked = checkToBool(eq.CHECK_PRENDE, eq.CHECK_PRENDE_BOOL);
            tecnicoGetElement('check-respaldo').checked = checkToBool(eq.CHECK_RESPALDO, eq.CHECK_RESPALDO_BOOL);

            const historial = (eq.NOTAS_INTERNAS || '')
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean)
                .map(l => `• ${escapeHtml(l)}`)
                .join('<br>');
            tecnicoGetElement('modal-historial').innerHTML = historial || '<span class="text-[#8A8F95]">Sin historial de notas</span>';

            mostrarSeccion('detalles');
            tecnicoGetElement('modal').classList.remove('hidden');
        }

        async function obtenerDetalleEquipo(folio: string): Promise<TecnicoEquipoRecord | null> {
            try {
                const res = await fetch(`${BACKEND_URL}?action=equipo&folio=${encodeURIComponent(folio)}&t=${Date.now()}`);
                if (!res.ok) return null;
                const data = await res.json();
                return data && data.equipo ? data.equipo : null;
            } catch (e) {
                return null;
            }
        }

        async function abrirEquipoDesdeQuery(): Promise<boolean> {
            const folio = getRequestedFolio();
            if (!folio) return false;
            const detalle = await obtenerDetalleEquipo(folio);
            if (!detalle) return false;
            await abrirModal(detalle);
            clearRequestedFolio();
            return true;
        }

        function mostrarSeccion(tabId: string): void {
            document.querySelectorAll<HTMLElement>('[data-tab]').forEach((btn) => {
                const active = String(btn.dataset.tab || '') === tabId;
                btn.dataset.active = active ? '1' : '0';
                btn.classList.toggle('active', active);
                btn.classList.toggle('text-[#1F7EDC]', active);
                btn.classList.toggle('border-b-2', active);
                btn.classList.toggle('border-[#1F7EDC]', active);
                btn.classList.toggle('text-[#8A8F95]', !active);
            });
            document.querySelectorAll<HTMLElement>('.tab-section').forEach(section => {
                const active = section.id === `section-${tabId}`;
                section.dataset.active = active ? '1' : '0';
                section.classList.toggle('hidden', !active);
            });
        }

        function cerrarModal(): void {
            tecnicoGetElement('modal').classList.add('hidden');
            equipoActual = null;
            seguimientoFotosBase64 = [];
            const inputFotos = tecnicoGetElement('modal-seguimiento-fotos');
            if (inputFotos) inputFotos.value = '';
        }

        async function guardarCambios(): Promise<void> {
            if (!equipoActual) {
                mostrarToast('No hay equipo seleccionado', 'error');
                return;
            }
            const { campos } = construirCamposActualizacionEquipo();
            const fotosLimitadas = (seguimientoFotosBase64 || []).slice(0, 8);
            const fotosSerializadas = JSON.stringify(fotosLimitadas);
            let adminPasswordActual = '';

            if (fotosSerializadas !== seguimientoOriginalSerializado) {
                if (fotosSerializadas.length > 280000) {
                    mostrarToast('SEGUIMIENTO_FOTOS es muy grande. Reduce fotos o tamaño.', 'error');
                    return;
                }
                // Enviamos arreglo, backend lo serializa/persiste de forma segura.
                campos.SEGUIMIENTO_FOTOS = fotosLimitadas;
            }
            if (!Object.keys(campos).length) {
                mostrarToast('No hay cambios para guardar', 'success');
                return;
            }

            const requiereAuth = campos.COSTO_ESTIMADO !== undefined || String(campos.ESTADO || '').trim().toLowerCase() === 'entregado';
            if (requiereAuth) {
                const guard = window.SRFXSecurityGuard;
                if (!guard || typeof guard.ensureAdminPassword !== 'function') {
                    mostrarToast('No se pudo validar la clave admin', 'error');
                    return;
                }
                const auth = await guard.ensureAdminPassword('editar un valor monetario del equipo');
                if (!auth.ok) return;
                adminPasswordActual = auth.password ?? '';
            }

            try {
                const res = await fetch(BACKEND_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'actualizar_equipo',
                        folio: equipoActual.FOLIO,
                        campos: campos,
                        adminPasswordActual: adminPasswordActual
                    })
                });

                if (!res.ok) throw new Error('Error de conexión');
                const data = await res.json();

                if (data.success) {
                    mostrarToast('Cambios guardados', 'success');
                    cerrarModal();
                    await cargarDatos();
                } else {
                    throw new Error(data.error);
                }
            } catch (e) {
                mostrarToast('Error: ' + String(e instanceof Error ? e.message : e), 'error');
            }
        }

        async function cambiarEstadoEntregado(): Promise<void> {
            if (!equipoActual) {
                mostrarToast('No hay equipo seleccionado', 'error');
                return;
            }
            const { campos } = construirCamposActualizacionEquipo('Entregado');
            if (campos.ESTADO !== 'Entregado') campos.ESTADO = 'Entregado';
            let adminPasswordActual = '';
            const guard = window.SRFXSecurityGuard;
            if (!guard || typeof guard.ensureAdminPassword !== 'function') {
                mostrarToast('No se pudo validar la clave admin', 'error');
                return;
            }
            const auth = await guard.ensureAdminPassword('marcar un equipo como entregado');
            if (!auth.ok) return;
            adminPasswordActual = auth.password ?? '';
            try {
                const res = await fetch(BACKEND_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'actualizar_equipo',
                        folio: equipoActual.FOLIO,
                        campos: campos,
                        adminPasswordActual: adminPasswordActual
                    })
                });
                if (!res.ok) throw new Error('Error de conexión');
                const data = await res.json();
                if (data.success) {
                    mostrarToast('Equipo marcado como entregado', 'success');
                    cerrarModal();
                    await cargarDatos();
                } else throw new Error(data.error);
            } catch (e) {
                mostrarToast('Error: ' + String(e instanceof Error ? e.message : e), 'error');
            }
        }

        // ==========================================
        // UTILERÍAS
        // ==========================================
        function escapeHtml(unsafe: string | number | boolean | null | undefined): string {
            if (!unsafe) return '';
            return unsafe.toString()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        function checkToBool(value: string | null | undefined, boolValue: boolean | null | undefined): boolean {
            if (typeof boolValue === 'boolean') return boolValue;
            const s = String(value || '').trim().toUpperCase();
            return s === 'SÍ' || s === 'SI' || s === 'TRUE' || s === '1';
        }

        function construirWaUrl(telefono: string | null | undefined, folio: string): string {
            const limpio = String(telefono || '').replace(/\D/g, '');
            if (!limpio) return '';
            const destino = limpio.length === 10 ? `52${limpio}` : limpio;
            const mensaje = `Hola, te escribimos de SrFix sobre tu equipo con folio ${folio}.`;
            return `https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}`;
        }

        function enviarWhatsAppCliente(): void {
            if (!equipoActual) return;
            const telefono = equipoActual.CLIENTE_TELEFONO;
            if (!telefono) {
                mostrarToast('El cliente no tiene teléfono registrado', 'error');
                return;
            }
            const folio = equipoActual.FOLIO;
            const estado = equipoActual.ESTADO || 'Recibido';
            const limpio = String(telefono).replace(/\D/g, '');
            const destino = limpio.length === 10 ? `52${limpio}` : limpio;
            const mensaje = `Hola, te escribimos de SrFix para informarte que tu equipo con folio ${folio} se encuentra en estado: ${estado}.`;
            window.open(`https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}`, '_blank');
        }

        async function descargarFichaPDF(): Promise<void> {
            if (!equipoActual) {
                mostrarToast('No hay equipo seleccionado', 'error');
                return;
            }
            const e = equipoActual;
            const logoPrincipal = await resolverLogoPdf();
            const fotoRecepcionPdf = obtenerCandidatasImagen(obtenerFotoRecepcionRaw(e))[0] || '';
            const html = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Ficha ${e.FOLIO || 'SRFIX'}</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                    <style>
                        *{margin:0;padding:0;box-sizing:border-box}
                        body{font-family:'Inter',sans-serif;background:#f4f7fc;padding:30px;color:#1e293b}
                        .container{max-width:980px;margin:0 auto;background:#fff;border-radius:24px;box-shadow:0 20px 40px -10px rgba(0,20,50,.15);overflow:hidden;border:1px solid #e2e8f0}
                        .header{background:linear-gradient(135deg,#0F4C81 0%,#1F7EDC 100%);color:#fff;padding:30px 35px;display:flex;justify-content:space-between;align-items:center}
                        .header h1{font-size:30px;font-weight:800;letter-spacing:1px}.header h1 span{color:#FF6A2A}
                        .brand-logo{width:58px;height:58px;border-radius:12px;object-fit:contain;background:#fff;padding:6px;border:2px solid rgba(255,255,255,.3)}
                        .folio{background:rgba(255,255,255,.15);padding:10px 22px;border-radius:60px;border:1px solid rgba(255,255,255,.3);font-weight:700}
                        .content{padding:35px}
                        .pill{display:flex;justify-content:space-between;gap:10px;background:#f1f5f9;padding:14px 18px;border-radius:999px;margin-bottom:24px}
                        .grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
                        .card{background:#f8fafc;border-radius:16px;padding:18px;border:1px solid #e2e8f0}
                        .card h3{font-size:16px;color:#1F7EDC;margin-bottom:12px;border-bottom:2px solid #FF6A2A;padding-bottom:6px}
                        .row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed #cbd5e1}.row:last-child{border-bottom:0}
                        .k{font-weight:600;color:#475569}.v{font-weight:500;color:#0f172a;text-align:right;max-width:60%}
                        .notas{background:#fff7ed;border-left:6px solid #FF6A2A;padding:16px;border-radius:12px;margin-top:18px}
                        .footer{background:#f1f5f9;border-top:1px solid #cbd5e1;padding:14px;text-align:center;color:#64748b;font-size:13px}
                        @media print{body{background:#fff;padding:0}.container{box-shadow:none}}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div style="display:flex;align-items:center;gap:15px">
                                ${logoPrincipal ? `<img src="${logoPrincipal}" class="brand-logo" alt="Logo SrFix">` : '<div class="brand-logo" style="display:flex;align-items:center;justify-content:center;font-weight:800;color:#0F4C81">SRFIX</div>'}
                                ${fotoRecepcionPdf ? `<img src="${fotoRecepcionPdf}" style="width:60px;height:60px;border-radius:12px;object-fit:cover;border:2px solid rgba(255,255,255,0.3);background:#fff">` : ''}
                                <div><h1>SR<span>FIX</span></h1><p>Ficha Técnica (Semáforo)</p></div>
                            </div>
                            <div class="folio">${escapeHtml(e.FOLIO || '---')}</div>
                        </div>
                        <div class="content">
                            <div class="pill"><span><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</span><span><strong>Estado:</strong> ${escapeHtml(tecnicoGetElement('modal-estado').value || e.ESTADO || '---')}</span></div>
                            <div class="grid">
                                <div class="card">
                                    <h3>Cliente</h3>
                                    <div class="row"><div class="k">Nombre</div><div class="v">${escapeHtml(e.CLIENTE_NOMBRE || '---')}</div></div>
                                    <div class="row"><div class="k">Teléfono</div><div class="v">${escapeHtml(e.CLIENTE_TELEFONO || '---')}</div></div>
                                    <div class="row"><div class="k">Técnico</div><div class="v">${escapeHtml(tecnicoGetElement('modal-tecnico').value || e.TECNICO_ASIGNADO || '---')}</div></div>
                                </div>
                                <div class="card">
                                    <h3>Equipo</h3>
                                    <div class="row"><div class="k">Dispositivo</div><div class="v">${escapeHtml(e.DISPOSITIVO || '---')}</div></div>
                                    <div class="row"><div class="k">Modelo</div><div class="v">${escapeHtml(e.MODELO || '---')}</div></div>
                                    <div class="row"><div class="k">Fecha promesa</div><div class="v">${escapeHtml(e.FECHA_PROMESA || '---')}</div></div>
                                </div>
                            </div>
                            
                            <div style="margin-top:22px" class="grid">
                                <div class="card">
                                    <h3>Falla Reportada</h3>
                                    <div style="font-size:13px;line-height:1.5;color:#475569">${escapeHtml(e.FALLA_REPORTADA || '---')}</div>
                                </div>
                                <div class="card">
                                    <h3>Resolución del Caso</h3>
                                    <div style="font-size:13px;line-height:1.5;color:#475569">${escapeHtml(tecnicoGetElement('modal-resolucion').value || e.CASO_RESOLUCION_TECNICA || 'Pendiente de resolución')}</div>
                                </div>
                            </div>

                            ${seguimientoFotosBase64 && seguimientoFotosBase64.length > 0 ? `
                                <div style="margin-top:22px">
                                    <h3 style="font-size:16px;color:#1F7EDC;margin-bottom:12px;border-bottom:2px solid #FF6A2A;padding-bottom:6px">Evidencia de Reparación</h3>
                                    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px">
                                        ${seguimientoFotosBase64.map(src => `<img src="${src}" style="width:100%;height:120px;object-fit:cover;border-radius:10px;border:1px solid #e2e8f0">`).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            <div class="notas" style="margin-top:22px">
                                <strong>Notas Internas / Historial:</strong>
                                <div style="margin-top:8px;font-size:12px;line-height:1.4;white-space:pre-wrap">${escapeHtml(tecnicoGetElement('modal-notas').value || e.NOTAS_INTERNAS || 'Sin notas adicionales')}</div>
                            </div>
                        </div>
                        <div class="footer">SrFix Oficial · Plaza Chapultepec · 81 1700 6536</div>
                    </div>
                    <script>window.onload=()=>window.print();<\/script>
                </body>
                </html>
            `;
            const w = window.open('', '_blank');
            if (!w) return mostrarToast('Permite ventanas emergentes para generar PDF', 'error');
            w.document.open();
            w.document.write(html);
            w.document.close();
        }

        async function resolverLogoPdf(): Promise<string> {
            const intentos = [LOGO_URL || './logo.webp', './logo.webp', './logo.png'];
            for (const ruta of intentos) {
                try {
                    const url = new URL(ruta, window.location.href).href;
                    const res = await fetch(url);
                    if (!res.ok) continue;
                    const blob = await res.blob();
                    const dataUrl = await blobToDataUrl(blob);
                    if (dataUrl) return dataUrl;
                } catch (e) {}
            }
            return '';
        }

        function blobToDataUrl(blob: Blob): Promise<string> {
            return new Promise((resolve) => {
                try {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result || ''));
                    reader.onerror = () => resolve('');
                    reader.readAsDataURL(blob);
                } catch (e) {
                    resolve('');
                }
            });
        }

        function parseSeguimientoFotos(raw: unknown): string[] {
            if (!raw) return [];
            if (Array.isArray(raw)) return raw.filter(v => typeof v === 'string' && (v.startsWith('data:image/') || /^https?:\/\//.test(v)));
            try {
                const parsed = JSON.parse(String(raw));
                if (Array.isArray(parsed)) {
                    return parsed.filter(v => typeof v === 'string' && (v.startsWith('data:image/') || /^https?:\/\//.test(v)));
                }
            } catch (e) {}
            return [];
        }

        function renderizarGaleriaSeguimiento(): void {
            const galeria = tecnicoGetElement('modal-seguimiento-galeria');
            galeria.innerHTML = '';
            if (!seguimientoFotosBase64.length) {
                galeria.innerHTML = '<div class="col-span-full text-xs text-[#8A8F95]">Sin fotos de avance.</div>';
                return;
            }

            seguimientoFotosBase64.forEach((src, idx) => {
                const item = document.createElement('div');
                item.className = 'relative rounded-lg overflow-hidden border border-[#1F7EDC] bg-[#1E1E1E]';
                item.innerHTML = `
                    <img src="${src}" alt="Seguimiento ${idx + 1}" class="w-full h-24 object-cover">
                    <button type="button" class="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded" data-foto-idx="${idx}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
                galeria.appendChild(item);
            });
        }

        async function manejarFotosSeguimiento(input: HTMLInputElement | null): Promise<void> {
            const files = Array.from((input && input.files) || []);
            if (!files.length) return;
            try {
                for (const file of files) {
                    if (seguimientoFotosBase64.length >= 8) {
                        mostrarToast('Máximo 8 fotos de seguimiento', 'error');
                        break;
                    }
                    const dataUrl = await comprimirImagenADataURL(file, 1280, 0.75);
                    if (dataUrl) seguimientoFotosBase64.push(dataUrl);
                }
                renderizarGaleriaSeguimiento();
                mostrarToast('Fotos de seguimiento agregadas', 'success');
            } catch (e) {
                console.error('Error al procesar fotos de seguimiento:', e);
                mostrarToast('No se pudieron procesar las fotos', 'error');
            } finally {
                if (input) input.value = '';
            }
        }

        function comprimirImagenADataURL(file: File, maxWidth: number = 1280, quality: number = 0.75): Promise<string> {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
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
                    img.onerror = reject;
                    img.src = String(reader.result || '');
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function mostrarToast(mensaje: string, tipo: 'success' | 'error' | 'info' = 'success'): void {
            const toast = tecnicoGetElement('toast');
            tecnicoGetElement('toast-message').textContent = mensaje;
            toast.classList.remove('translate-y-20', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
            toast.style.borderLeftColor = tipo === 'error' ? '#ef4444' : '#FF6A2A';
            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0');
                toast.classList.remove('translate-y-0', 'opacity-100');
            }, 3000);
        }

        function bindWindowActions(): void {
            Object.assign(window, {
                login,
                logout,
                refrescarManual,
                limpiarFiltros,
                toggleEditField,
                abrirModal,
                cerrarModal,
                guardarCambios,
                cambiarEstadoEntregado,
                descargarFichaPDF,
                enviarWhatsAppCliente,
                manejarFotosSeguimiento,
                mostrarToast,
                cargarDatos,
                aplicarFiltrosYOrdenar,
                mostrarSeccion,
                abrirEquipoDesdeQuery
            });
        }

        bindWindowActions();

        tecnicoGetElement('modal').addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && target.id === 'modal') cerrarModal();
        });

        document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => mostrarSeccion(String(btn.dataset.tab || '')));
        });

        tecnicoGetElement('modal-seguimiento-fotos').addEventListener('change', (e: Event) => {
            manejarFotosSeguimiento(e.target instanceof HTMLInputElement ? e.target : null);
        });

        tecnicoGetElement('modal-seguimiento-galeria').addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            const btn = target?.closest('[data-foto-idx]');
            if (!btn) return;
            const idx = Number(btn.getAttribute('data-foto-idx'));
            if (Number.isNaN(idx)) return;
            seguimientoFotosBase64.splice(idx, 1);
            renderizarGaleriaSeguimiento();
        });

        tecnicoGetElement('modal-wa-btn').addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            enviarWhatsAppCliente();
        });

        ['click', 'touchstart', 'keydown'].forEach((evt: string) => {
            document.addEventListener(evt, unlockAudio, { once: true, passive: true });
        });
})();
