        const CONFIG = {
            BACKEND_URL: 'https://script.google.com/macros/s/AKfycbwtwvep33d_ftb4bChFXvD6m1LJPlMStp8B09LUoJDD0jU8Jlj4uSpr409x79Pz6mvJ/exec',
            MODULO: 'tecnico',
            LOGO_URL: './logo.webp'
        };

        // ==========================================
        // VARIABLES GLOBALES
        // ==========================================
        let PASSWORD = '';
        let equiposData = [];
        let equiposFiltrados = [];
        let intervalo = null;
        let filtros = {
            texto: '',
            color: 'todos',
            estado: 'todos',
            orden: 'dias_asc'
        };

        // Cargar preferencias guardadas
        (function() {
            const savedPass = sessionStorage.getItem('srfix_pass_tecnico');
            if (savedPass) document.getElementById('password-input').value = savedPass;
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

        // ==========================================
        // LOGIN / LOGOUT
        // ==========================================
        async function login() {
            PASSWORD = document.getElementById('password-input').value.trim();
            if (!PASSWORD) return mostrarErrorLogin('Ingresa la contraseña');

            const btn = document.getElementById('btn-login');
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner w-5 h-5"></div> Verificando...';
            ocultarErrorLogin();

            const ok = await cargarDatos(true);

            if (ok) {
                sessionStorage.setItem('srfix_pass_tecnico', PASSWORD);
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('app').classList.remove('hidden');
                document.getElementById('fecha-actual').textContent = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
        async function cargarDatos(esLogin = false) {
            mostrarRefreshing(true);
            try {
                const res = await fetch(CONFIG.BACKEND_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'semaforo',
                        modulo: CONFIG.MODULO,
                        password: PASSWORD
                    })
                });
                if (!res.ok) throw new Error('Error de conexión');
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                equiposData = data.equipos || [];
                document.getElementById('count-urgentes').textContent = data.urgentes || 0;
                document.getElementById('count-atencion').textContent = data.atencion || 0;
                document.getElementById('count-tiempo').textContent = data.aTiempo || 0;
                document.getElementById('count-total').textContent = equiposData.length;

                aplicarFiltrosYOrdenar();
                actualizarHoraActualizacion();
                mostrarToast('Datos actualizados', 'success');
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
                    case 'dias_asc': return a.diasRestantes - b.diasRestantes;
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
        function renderizar() {
            const grid = document.getElementById('equipos-grid');
            if (!equiposFiltrados.length) {
                grid.innerHTML = '<div class="col-span-full text-center py-12 text-[#8A8F95]"><i class="fa-solid fa-folder-open text-4xl mb-4 opacity-30"></i><p>No hay equipos con esos filtros</p></div>';
                return;
            }

            grid.innerHTML = '';
            equiposFiltrados.forEach(eq => {
                const card = document.createElement('div');
                card.className = `card-${eq.color} rounded-xl p-5 cursor-pointer hover:scale-[1.02] transition-all`;
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
                        </div>
                        <span class="text-xs ${diasClase} bg-[#1E1E1E] px-2 py-1 rounded-full">${eq.diasRestantes} días</span>
                    </div>
                    <h3 class="font-semibold text-[#F2F2F2] mb-1 truncate" title="${escapeHtml(eq.CLIENTE_NOMBRE)}">${escapeHtml(eq.CLIENTE_NOMBRE)}</h3>
                    <p class="text-[#8A8F95] text-sm mb-2 truncate">${escapeHtml(eq.DISPOSITIVO)} ${escapeHtml(eq.MODELO || '')}</p>
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

        function abrirModal(eq) {
            equipoActual = eq;
            document.getElementById('modal-folio').textContent = eq.FOLIO;
            document.getElementById('modal-cliente').textContent = eq.CLIENTE_NOMBRE || 'N/A';
            document.getElementById('modal-telefono').textContent = eq.CLIENTE_TELEFONO || 'N/A';
            document.getElementById('modal-equipo').textContent = `${eq.DISPOSITIVO || ''} ${eq.MODELO || ''}`.trim() || 'N/A';
            document.getElementById('modal-falla').textContent = eq.FALLA_REPORTADA || 'Sin descripción';

            const fechaPromesaEl = document.getElementById('modal-fecha-promesa');
            const diasClase = eq.diasRestantes <= 2 ? 'text-red-500 font-bold' : eq.diasRestantes <= 4 ? 'text-yellow-500' : '';
            fechaPromesaEl.className = `text-[#F2F2F2] ${diasClase}`;
            fechaPromesaEl.textContent = `${eq.FECHA_PROMESA || 'N/A'} (${eq.diasRestantes} días)`;

            document.getElementById('modal-estado').value = eq.ESTADO || 'Recibido';
            document.getElementById('modal-tecnico').value = eq.TECNICO_ASIGNADO || '';
            document.getElementById('modal-yt').value = eq.YOUTUBE_ID || '';
            document.getElementById('modal-notas').value = eq.NOTAS_INTERNAS || '';

            document.getElementById('check-cargador').checked = eq.CHECK_CARGADOR === 'SÍ';
            document.getElementById('check-pantalla').checked = eq.CHECK_PANTALLA === 'SÍ';
            document.getElementById('check-prende').checked = eq.CHECK_PRENDE === 'SÍ';
            document.getElementById('check-respaldo').checked = eq.CHECK_RESPALDO === 'SÍ';

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

        function mostrarSeccion(tabId) {
            document.querySelectorAll('.tab-section').forEach(s => s.classList.add('hidden'));
            const section = document.getElementById(`section-${tabId}`);
            if (section) section.classList.remove('hidden');

            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active', 'text-[#1F7EDC]', 'border-b-2', 'border-[#1F7EDC]');
                btn.classList.add('text-[#8A8F95]');
            });
            const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active', 'text-[#1F7EDC]', 'border-b-2', 'border-[#1F7EDC]');
                activeBtn.classList.remove('text-[#8A8F95]');
            }
        }

        function cerrarModal() {
            document.getElementById('modal').classList.add('hidden');
            equipoActual = null;
        }

        async function guardarCambios() {
            const campos = {
                ESTADO: document.getElementById('modal-estado').value,
                TECNICO_ASIGNADO: document.getElementById('modal-tecnico').value,
                YOUTUBE_ID: document.getElementById('modal-yt').value,
                NOTAS_INTERNAS: document.getElementById('modal-notas').value,
                CHECK_CARGADOR: document.getElementById('check-cargador').checked ? 'SÍ' : 'NO',
                CHECK_PANTALLA: document.getElementById('check-pantalla').checked ? 'SÍ' : 'NO',
                CHECK_PRENDE: document.getElementById('check-prende').checked ? 'SÍ' : 'NO',
                CHECK_RESPALDO: document.getElementById('check-respaldo').checked ? 'SÍ' : 'NO'
            };

            try {
                const res = await fetch(CONFIG.BACKEND_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'actualizar_equipo',
                        modulo: CONFIG.MODULO,
                        password: PASSWORD,
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
                        modulo: CONFIG.MODULO,
                        password: PASSWORD,
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

        window.addEventListener('load', () => {
            if (sessionStorage.getItem('srfix_pass_tecnico')) {
                document.getElementById('password-input').value = sessionStorage.getItem('srfix_pass_tecnico');
                login();
            }
        });
