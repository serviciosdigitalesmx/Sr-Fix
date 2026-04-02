        const CONFIG = {
            BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxH1zD8_14TvCajstFhtEpLNODwG9GZXkLoCXOb1IBNm0JIRmpCwS6SRsuGhZETK88z/exec',
            MODULO: 'tecnico',
            LOGO_URL: './logo.webp',
            FRONT_PASSWORD: 'Admin1'
        };

        // ==========================================
        // VARIABLES GLOBALES
        // ==========================================
        let PASSWORD = '';
        let equiposData = [];
        let equiposFiltrados = [];
        let seguimientoFotosBase64 = [];
        let intervalo = null;
        let audioCtx = null;
        let audioUnlocked = false;
        let urgentesPrevio = 0;
        let primeraCargaTecnico = true;
        let ultimoBeepRojoTs = 0;
        let ultimaFirmaSemaforo = '';
        let seguimientoOriginalSerializado = '[]';
        let filtros = {
            texto: '',
            color: 'todos',
            estado: 'todos',
            orden: 'dias_asc'
        };

        function readInternalUser() {
            try {
                const raw = sessionStorage.getItem('srfix_auth_user') || localStorage.getItem('srfix_auth_user');
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                return null;
            }
        }

        function hasTecnicoAccess() {
            const user = readInternalUser();
            if (!user) return false;
            const rol = String(user.ROL || '').toLowerCase();
            return ['admin', 'tecnico', 'supervisor'].includes(rol);
        }

        // Cargar preferencias guardadas
        (function() {
            const savedPass = sessionStorage.getItem('srfix_pass_tecnico') || localStorage.getItem('srfix_pass_tecnico');
            if (savedPass) {
                document.getElementById('password-input').value = savedPass;
                if (localStorage.getItem('srfix_pass_tecnico')) {
                    document.getElementById('remember-me').checked = true;
                }
                // Si hay pass guardado, intentamos login automático
                setTimeout(login, 500);
            }
            const savedFiltros = localStorage.getItem('srfix_filtros_tecnico');
            if (savedFiltros) {
                try {
                    filtros = JSON.parse(savedFiltros);
                    document.getElementById('buscador').value = filtros.texto || '';
                    document.getElementById('filtro-color').value = filtros.color || 'todos';
                    document.getElementById('filtro-estado').value = filtros.estado || 'todos';
                    document.getElementById('ordenar-por').value = filtros.orden || 'dias_asc';
                } catch (e) {}
            }
        })();

        function formatearFechaHoraLarga(date = new Date()) {
            return date.toLocaleString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function actualizarFechaActual() {
            const el = document.getElementById('fecha-actual');
            if (!el) return;
            const texto = formatearFechaHoraLarga();
            el.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
        }

        // ==========================================
        // LOGIN / LOGOUT
        // ==========================================
        async function login() {
            PASSWORD = document.getElementById('password-input').value.trim();
            const trustedInternalAccess = hasTecnicoAccess();
            if (!trustedInternalAccess) {
                if (!PASSWORD) return mostrarErrorLogin('Ingresa la contraseña');
                if (PASSWORD !== CONFIG.FRONT_PASSWORD) return mostrarErrorLogin('Contraseña incorrecta');
            }

            const btn = document.getElementById('btn-login');
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner w-5 h-5"></div> Verificando...';
            ocultarErrorLogin();

            const ok = await cargarDatos(true);

            if (ok) {
                const remember = document.getElementById('remember-me').checked;
                if (!trustedInternalAccess) {
                    sessionStorage.setItem('srfix_pass_tecnico', PASSWORD);
                    if (remember) {
                        localStorage.setItem('srfix_pass_tecnico', PASSWORD);
                    } else {
                        localStorage.removeItem('srfix_pass_tecnico');
                    }
                }
                
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('app').classList.remove('hidden');
                actualizarFechaActual();
                setInterval(actualizarFechaActual, 60000);
                if (intervalo) clearInterval(intervalo);
                intervalo = setInterval(cargarDatos, 30000);
            } else {
                mostrarErrorLogin('Contraseña incorrecta o error de conexión');
                btn.innerHTML = 'INGRESAR';
                btn.disabled = false;
            }
        }

        function logout() {
            if (intervalo) clearInterval(intervalo);
            sessionStorage.removeItem('srfix_pass_tecnico');
            localStorage.removeItem('srfix_pass_tecnico');
            location.reload();
        }

        function mostrarErrorLogin(msg) {
            const el = document.getElementById('login-error');
            el.textContent = msg;
            el.classList.remove('hidden');
        }
        function ocultarErrorLogin() {
            document.getElementById('login-error').classList.add('hidden');
        }

        // ==========================================
        // CARGA DE DATOS
        // ==========================================
        function getAudioCtx() {
            if (!audioCtx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return null;
                audioCtx = new Ctx();
            }
            return audioCtx;
        }

        async function unlockAudio() {
            const ctx = getAudioCtx();
            if (!ctx) return;
            try {
                if (ctx.state === 'suspended') await ctx.resume();
                audioUnlocked = ctx.state === 'running';
            } catch (e) {
                audioUnlocked = false;
            }
        }

        function beep(freq = 520, duration = 0.12, delay = 0) {
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

        function sonidoAlertaRojo() {
            beep(520, 0.1, 0);
            beep(430, 0.14, 0.14);
        }

        function calcularFirmaSemaforo(lista) {
            return (lista || [])
                .map(eq => `${eq.FOLIO}|${eq.ESTADO}|${eq.diasRestantes}|${eq.color}|${eq.TECNICO_ASIGNADO || ''}`)
                .join('||');
        }

        async function cargarDatos(esLogin = false) {
            mostrarRefreshing(true);
            try {
                const pageSize = Math.max(1000, equiposData.length || 0);
                let res = await fetch(CONFIG.BACKEND_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'semaforo',
                        page: 1,
                        pageSize: pageSize
                    })
                });
                let data = null;
                if (res.ok) {
                    try { data = await res.json(); } catch (e) {}
                }
                if (!data || data.error) {
                    res = await fetch(`${CONFIG.BACKEND_URL}?action=semaforo&page=1&pageSize=${encodeURIComponent(pageSize)}&t=${Date.now()}`);
                    if (!res.ok) throw new Error('Error de conexión');
                    data = await res.json();
                }
                if (data.error) throw new Error(data.error);

                const nuevosEquipos = data.equipos || [];
                const firmaNueva = calcularFirmaSemaforo(nuevosEquipos);
                const huboCambios = firmaNueva !== ultimaFirmaSemaforo;
                equiposData = nuevosEquipos;
                ultimaFirmaSemaforo = firmaNueva;
                document.getElementById('count-urgentes').textContent = data.urgentes || 0;
                document.getElementById('count-atencion').textContent = data.atencion || 0;
                document.getElementById('count-tiempo').textContent = data.aTiempo || 0;
                document.getElementById('count-total').textContent = Number(data.total || equiposData.length);
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
                console.error('Error cargando datos:', e);
                if (!esLogin) {
                    mostrarToast('Error al actualizar', 'error');
                }
                return false;
            } finally {
                mostrarRefreshing(false);
            }
        }

        function refrescarManual() {
            cargarDatos();
        }

        function mostrarRefreshing(mostrar) {
            const el = document.getElementById('refreshing-indicator');
            if (mostrar) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }

        function actualizarHoraActualizacion() {
            document.getElementById('last-update').innerHTML = `<i class="fa-regular fa-clock mr-1 text-[#1F7EDC]"></i> ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second:'2-digit' })}`;
        }

        // ==========================================
        // FILTROS Y ORDENAMIENTO
        // ==========================================
        function aplicarFiltrosYOrdenar() {
            filtros.texto = document.getElementById('buscador').value.trim().toLowerCase();
            filtros.color = document.getElementById('filtro-color').value;
            filtros.estado = document.getElementById('filtro-estado').value;
            filtros.orden = document.getElementById('ordenar-por').value;

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
                switch (filtros.orden) {
                    case 'dias_asc':
                        return (a.diasRestantes - b.diasRestantes)
                            || String(a.FECHA_PROMESA || '').localeCompare(String(b.FECHA_PROMESA || ''))
                            || String(a.FOLIO || '').localeCompare(String(b.FOLIO || ''));
                    case 'dias_desc': return b.diasRestantes - a.diasRestantes;
                    case 'folio_asc': return (a.FOLIO || '').localeCompare(b.FOLIO || '');
                    case 'folio_desc': return (b.FOLIO || '').localeCompare(a.FOLIO || '');
                    default: return 0;
                }
            });

            equiposFiltrados = resultado;
            renderizar();
        }

        document.getElementById('buscador').addEventListener('input', aplicarFiltrosYOrdenar);
        document.getElementById('filtro-color').addEventListener('change', aplicarFiltrosYOrdenar);
        document.getElementById('filtro-estado').addEventListener('change', aplicarFiltrosYOrdenar);
        document.getElementById('ordenar-por').addEventListener('change', aplicarFiltrosYOrdenar);

        function limpiarFiltros() {
            document.getElementById('buscador').value = '';
            document.getElementById('filtro-color').value = 'todos';
            document.getElementById('filtro-estado').value = 'todos';
            document.getElementById('ordenar-por').value = 'dias_asc';
            aplicarFiltrosYOrdenar();
        }

        // ==========================================
        // RENDERIZADO DE TARJETAS
        // ==========================================
        function formatDateWords(dateStr) {
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

        function formatMoney(value) {
            const amount = Number(value || 0);
            return new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                minimumFractionDigits: 2
            }).format(isFinite(amount) ? amount : 0);
        }

        function renderizar() {
            const grid = document.getElementById('equipos-grid');
            if (!equiposFiltrados.length) {
                grid.innerHTML = '<div class="col-span-full text-center py-12 text-[#8A8F95]"><i class="fa-solid fa-folder-open text-4xl mb-4 opacity-30"></i><p>No hay equipos con esos filtros</p></div>';
                return;
            }

            grid.innerHTML = '';
            equiposFiltrados.forEach(eq => {
                // Alerta de inactividad (48h)
                const ultimaAct = new Date(eq.FECHA_ULTIMA_ACTUALIZACION || eq.FECHA_INGRESO);
                const esInactivo = (Date.now() - ultimaAct.getTime()) > (48 * 60 * 60 * 1000);
                const inactivoClase = esInactivo && eq.ESTADO !== 'Entregado' ? 'border-2 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border border-transparent';

                const card = document.createElement('div');
                card.className = `card-${eq.color} rounded-xl p-5 cursor-pointer hover:scale-[1.02] transition-all ${inactivoClase}`;
                card.onclick = () => abrirModal(eq);

                const dotClass = eq.color === 'rojo' ? 'bg-red-500 animate-pulse-red' : eq.color === 'amarillo' ? 'bg-yellow-500' : 'bg-green-500';
                const diasClase = eq.diasRestantes <= 2 ? 'text-red-500 font-bold' : eq.diasRestantes <= 4 ? 'text-yellow-500' : 'text-[#8A8F95]';

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
                        <span class="text-xs ${diasClase} bg-[#1E1E1E] px-2 py-1 rounded-full">${eq.diasRestantes} días</span>
                    </div>
                    <h3 class="font-semibold text-[#F2F2F2] mb-1 truncate" title="${escapeHtml(eq.CLIENTE_NOMBRE)}">${escapeHtml(eq.CLIENTE_NOMBRE)}</h3>
                    <p class="text-[#8A8F95] text-sm mb-1 truncate">${escapeHtml(eq.DISPOSITIVO)} ${escapeHtml(eq.MODELO || '')}</p>
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
        let equipoActual = null;

        async function abrirModal(eq) {
            equipoActual = eq;
            if (!eq.FOTO_RECEPCION) {
                const detalle = await obtenerDetalleEquipo(eq.FOLIO);
                if (detalle) eq = { ...eq, ...detalle };
            }
            equipoActual = eq;
            document.getElementById('modal-folio').textContent = eq.FOLIO;
            document.getElementById('modal-folio-detalle').textContent = eq.FOLIO || 'N/A';
            document.getElementById('modal-cliente').textContent = eq.CLIENTE_NOMBRE || 'N/A';
            document.getElementById('modal-telefono').textContent = eq.CLIENTE_TELEFONO || 'N/A';
            const waBtn = document.getElementById('modal-wa-btn');
            const waUrl = construirWaUrl(eq.CLIENTE_TELEFONO, eq.FOLIO);
            if (waUrl) {
                waBtn.href = waUrl;
                waBtn.classList.remove('hidden');
            } else {
                waBtn.href = '#';
                waBtn.classList.add('hidden');
            }
            document.getElementById('modal-equipo').textContent = `${eq.DISPOSITIVO || ''} ${eq.MODELO || ''}`.trim() || 'N/A';
            document.getElementById('modal-costo').textContent = Number(eq.COSTO_ESTIMADO || 0) > 0
                ? formatMoney(eq.COSTO_ESTIMADO)
                : 'Pendiente por cotizar';
            document.getElementById('modal-falla').textContent = eq.FALLA_REPORTADA || 'Sin descripción';

            const fechaPromesaEl = document.getElementById('modal-fecha-promesa');
            const diasClase = eq.diasRestantes <= 2 ? 'text-red-500 font-bold' : eq.diasRestantes <= 4 ? 'text-yellow-500' : '';
            fechaPromesaEl.className = `text-[#F2F2F2] ${diasClase}`;
            fechaPromesaEl.textContent = `${eq.FECHA_PROMESA || 'N/A'} (${eq.diasRestantes} días)`;

            document.getElementById('modal-estado').value = eq.ESTADO || 'Recibido';
            document.getElementById('modal-tecnico').value = eq.TECNICO_ASIGNADO || '';
            document.getElementById('modal-yt').value = eq.YOUTUBE_ID || '';
            document.getElementById('modal-notas').value = eq.NOTAS_INTERNAS || '';
            document.getElementById('modal-seguimiento').value = eq.SEGUIMIENTO_CLIENTE || '';
            document.getElementById('modal-resolucion').value = eq.CASO_RESOLUCION_TECNICA || '';
            seguimientoFotosBase64 = parseSeguimientoFotos(eq.SEGUIMIENTO_FOTOS);
            seguimientoOriginalSerializado = JSON.stringify(seguimientoFotosBase64);
            renderizarGaleriaSeguimiento();

            if (eq.FOTO_RECEPCION) {
                // Asegurar que la URL sea de visualización directa para Google Drive si es un ID
                let src = eq.FOTO_RECEPCION;
                if (src.includes('drive.google.com') && !src.includes('export=view')) {
                    const idMatch = src.match(/id=([a-zA-Z0-9_-]+)/);
                    if (idMatch) src = `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
                }
                document.getElementById('modal-foto').src = src;
                document.getElementById('modal-foto-wrap').classList.remove('hidden');
            } else {
                document.getElementById('modal-foto-wrap').classList.add('hidden');
                document.getElementById('modal-foto').removeAttribute('src');
            }

            document.getElementById('check-cargador').checked = checkToBool(eq.CHECK_CARGADOR, eq.CHECK_CARGADOR_BOOL);
            document.getElementById('check-pantalla').checked = checkToBool(eq.CHECK_PANTALLA, eq.CHECK_PANTALLA_BOOL);
            document.getElementById('check-prende').checked = checkToBool(eq.CHECK_PRENDE, eq.CHECK_PRENDE_BOOL);
            document.getElementById('check-respaldo').checked = checkToBool(eq.CHECK_RESPALDO, eq.CHECK_RESPALDO_BOOL);

            const historial = (eq.NOTAS_INTERNAS || '')
                .split('\n')
                .map(l => l.trim())
                .filter(Boolean)
                .map(l => `• ${escapeHtml(l)}`)
                .join('<br>');
            document.getElementById('modal-historial').innerHTML = historial || '<span class="text-[#8A8F95]">Sin historial de notas</span>';

            mostrarSeccion('detalles');
            document.getElementById('modal').classList.remove('hidden');
        }

        async function obtenerDetalleEquipo(folio) {
            try {
                const res = await fetch(`${CONFIG.BACKEND_URL}?action=equipo&folio=${encodeURIComponent(folio)}&t=${Date.now()}`);
                if (!res.ok) return null;
                const data = await res.json();
                return data && data.equipo ? data.equipo : null;
            } catch (e) {
                return null;
            }
        }

        function mostrarSeccion(tabId) {
            document.querySelectorAll('[data-tab]').forEach(btn => {
                const active = btn.dataset.tab === tabId;
                btn.dataset.active = active ? '1' : '0';
                btn.classList.toggle('active', active);
                btn.classList.toggle('text-[#1F7EDC]', active);
                btn.classList.toggle('border-b-2', active);
                btn.classList.toggle('border-[#1F7EDC]', active);
                btn.classList.toggle('text-[#8A8F95]', !active);
            });
            document.querySelectorAll('.tab-section').forEach(section => {
                const active = section.id === `section-${tabId}`;
                section.dataset.active = active ? '1' : '0';
                section.classList.toggle('hidden', !active);
            });
        }

        function cerrarModal() {
            document.getElementById('modal').classList.add('hidden');
            equipoActual = null;
            seguimientoFotosBase64 = [];
            const inputFotos = document.getElementById('modal-seguimiento-fotos');
            if (inputFotos) inputFotos.value = '';
        }

        async function guardarCambios() {
            const estado = document.getElementById('modal-estado').value;
            const tecnico = document.getElementById('modal-tecnico').value;
            const yt = document.getElementById('modal-yt').value;
            const notas = document.getElementById('modal-notas').value;
            const seguimiento = document.getElementById('modal-seguimiento').value;
            const resolucion = document.getElementById('modal-resolucion').value;
            const checkCargador = document.getElementById('check-cargador').checked ? 'SÍ' : 'NO';
            const checkPantalla = document.getElementById('check-pantalla').checked ? 'SÍ' : 'NO';
            const checkPrende = document.getElementById('check-prende').checked ? 'SÍ' : 'NO';
            const checkRespaldo = document.getElementById('check-respaldo').checked ? 'SÍ' : 'NO';
            const fotosLimitadas = (seguimientoFotosBase64 || []).slice(0, 8);
            const fotosSerializadas = JSON.stringify(fotosLimitadas);

            const campos = {};
            if (estado !== (equipoActual.ESTADO || '')) campos.ESTADO = estado;
            if (tecnico !== (equipoActual.TECNICO_ASIGNADO || '')) campos.TECNICO_ASIGNADO = tecnico;
            if (yt !== (equipoActual.YOUTUBE_ID || '')) campos.YOUTUBE_ID = yt;
            if (notas !== (equipoActual.NOTAS_INTERNAS || '')) campos.NOTAS_INTERNAS = notas;
            if (seguimiento !== (equipoActual.SEGUIMIENTO_CLIENTE || '')) campos.SEGUIMIENTO_CLIENTE = seguimiento;
            if (resolucion !== (equipoActual.CASO_RESOLUCION_TECNICA || '')) campos.CASO_RESOLUCION_TECNICA = resolucion;
            if (checkCargador !== (equipoActual.CHECK_CARGADOR || 'NO')) campos.CHECK_CARGADOR = checkCargador;
            if (checkPantalla !== (equipoActual.CHECK_PANTALLA || 'NO')) campos.CHECK_PANTALLA = checkPantalla;
            if (checkPrende !== (equipoActual.CHECK_PRENDE || 'NO')) campos.CHECK_PRENDE = checkPrende;
            if (checkRespaldo !== (equipoActual.CHECK_RESPALDO || 'NO')) campos.CHECK_RESPALDO = checkRespaldo;
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

            try {
                const res = await fetch(CONFIG.BACKEND_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'actualizar_equipo',
                        folio: equipoActual.FOLIO,
                        campos: campos
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
                mostrarToast('Error: ' + e.message, 'error');
            }
        }

        async function cambiarEstadoEntregado() {
            const campos = { ESTADO: 'Entregado' };
            try {
                const res = await fetch(CONFIG.BACKEND_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'actualizar_equipo',
                        folio: equipoActual.FOLIO,
                        campos: campos
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
                mostrarToast('Error: ' + e.message, 'error');
            }
        }

        // ==========================================
        // UTILERÍAS
        // ==========================================
        function escapeHtml(unsafe) {
            if (!unsafe) return '';
            return unsafe.toString()
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        function checkToBool(value, boolValue) {
            if (typeof boolValue === 'boolean') return boolValue;
            const s = String(value || '').trim().toUpperCase();
            return s === 'SÍ' || s === 'SI' || s === 'TRUE' || s === '1';
        }

        function construirWaUrl(telefono, folio) {
            const limpio = String(telefono || '').replace(/\D/g, '');
            if (!limpio) return '';
            const destino = limpio.length === 10 ? `52${limpio}` : limpio;
            const mensaje = `Hola, te escribimos de SrFix sobre tu equipo con folio ${folio}.`;
            return `https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}`;
        }

        function enviarWhatsAppCliente() {
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

        function descargarFichaPDF() {
            if (!equipoActual) {
                mostrarToast('No hay equipo seleccionado', 'error');
                return;
            }
            const e = equipoActual;
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
                                ${e.FOTO_RECEPCION ? `<img src="${e.FOTO_RECEPCION}" style="width:60px;height:60px;border-radius:12px;object-cover;border:2px solid rgba(255,255,255,0.3);background:#fff">` : ''}
                                <div><h1>SR<span>FIX</span></h1><p>Ficha Técnica (Semáforo)</p></div>
                            </div>
                            <div class="folio">${escapeHtml(e.FOLIO || '---')}</div>
                        </div>
                        <div class="content">
                            <div class="pill"><span><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</span><span><strong>Estado:</strong> ${escapeHtml(document.getElementById('modal-estado').value || e.ESTADO || '---')}</span></div>
                            <div class="grid">
                                <div class="card">
                                    <h3>Cliente</h3>
                                    <div class="row"><div class="k">Nombre</div><div class="v">${escapeHtml(e.CLIENTE_NOMBRE || '---')}</div></div>
                                    <div class="row"><div class="k">Teléfono</div><div class="v">${escapeHtml(e.CLIENTE_TELEFONO || '---')}</div></div>
                                    <div class="row"><div class="k">Técnico</div><div class="v">${escapeHtml(document.getElementById('modal-tecnico').value || e.TECNICO_ASIGNADO || '---')}</div></div>
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
                                    <div style="font-size:13px;line-height:1.5;color:#475569">${escapeHtml(document.getElementById('modal-resolucion').value || e.CASO_RESOLUCION_TECNICA || 'Pendiente de resolución')}</div>
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
                                <div style="margin-top:8px;font-size:12px;line-height:1.4;white-space:pre-wrap">${escapeHtml(document.getElementById('modal-notas').value || e.NOTAS_INTERNAS || 'Sin notas adicionales')}</div>
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

        function parseSeguimientoFotos(raw) {
            if (!raw) return [];
            if (Array.isArray(raw)) return raw.filter(v => typeof v === 'string' && (v.startsWith('data:image/') || /^https?:\/\//.test(v)));
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.filter(v => typeof v === 'string' && (v.startsWith('data:image/') || /^https?:\/\//.test(v)));
                }
            } catch (e) {}
            return [];
        }

        function renderizarGaleriaSeguimiento() {
            const galeria = document.getElementById('modal-seguimiento-galeria');
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

        async function manejarFotosSeguimiento(input) {
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
                input.value = '';
            }
        }

        function comprimirImagenADataURL(file, maxWidth = 1280, quality = 0.75) {
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
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg', quality));
                    };
                    img.onerror = reject;
                    img.src = reader.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function mostrarToast(mensaje, tipo = 'success') {
            const toast = document.getElementById('toast');
            document.getElementById('toast-message').textContent = mensaje;
            toast.classList.remove('translate-y-20', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
            toast.style.borderLeftColor = tipo === 'error' ? '#ef4444' : '#FF6A2A';
            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0');
                toast.classList.remove('translate-y-0', 'opacity-100');
            }, 3000);
        }

        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') cerrarModal();
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => mostrarSeccion(btn.dataset.tab));
        });

        document.getElementById('modal-seguimiento-fotos').addEventListener('change', (e) => {
            manejarFotosSeguimiento(e.target);
        });

        document.getElementById('modal-seguimiento-galeria').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-foto-idx]');
            if (!btn) return;
            const idx = Number(btn.getAttribute('data-foto-idx'));
            if (Number.isNaN(idx)) return;
            seguimientoFotosBase64.splice(idx, 1);
            renderizarGaleriaSeguimiento();
        });

        document.getElementById('modal-wa-btn').addEventListener('click', (e) => {
            e.preventDefault();
            enviarWhatsAppCliente();
        });

        window.addEventListener('load', () => {
            const pass = sessionStorage.getItem('srfix_pass_master') || sessionStorage.getItem('srfix_pass_tecnico');
            if (pass) {
                document.getElementById('password-input').value = pass;
                login();
            }
        });
        ['click', 'touchstart', 'keydown'].forEach(evt => {
            document.addEventListener(evt, unlockAudio, { once: true, passive: true });
        });
