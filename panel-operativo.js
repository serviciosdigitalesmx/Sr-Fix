        const CONFIG = {
            BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxH1zD8_14TvCajstFhtEpLNODwG9GZXkLoCXOb1IBNm0JIRmpCwS6SRsuGhZETK88z/exec',
            MODULO: 'operativo',
            LOGO_URL: './logo.webp',
            FRONT_PASSWORD: 'Admin1'
        };

        // ==========================================
        // VARIABLES GLOBALES
        // ==========================================
        let PASSWORD = '';
        let fotoRecepcionBase64 = '';
        let ultimaOrdenRegistrada = null;
        let folioSolicitudOrigen = '';
        let loginEnCurso = false;

        function readInternalUser() {
            try {
                const raw = sessionStorage.getItem('srfix_auth_user') || localStorage.getItem('srfix_auth_user');
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                return null;
            }
        }

        function isEmbeddedIntegratorAccess() {
            try {
                if (window.parent === window) return false;
                const params = new URLSearchParams(window.location.search);
                return params.get('integrador') === '1';
            } catch (e) {
                return false;
            }
        }

        function hasOperativoAccess() {
            if (isEmbeddedIntegratorAccess()) return true;
            const user = readInternalUser();
            if (!user) return false;
            const rol = String(user.ROL || '').toLowerCase();
            return ['admin', 'operativo', 'supervisor'].includes(rol);
        }

        (function() {
            if (hasOperativoAccess()) {
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('app').classList.remove('hidden');
                setTimeout(login, 200);
                return;
            }
            const saved = sessionStorage.getItem('srfix_pass_operativo') || localStorage.getItem('srfix_pass_operativo');
            if (saved) {
                document.getElementById('password-input').value = saved;
                if (localStorage.getItem('srfix_pass_operativo')) {
                    document.getElementById('remember-me').checked = true;
                }
                setTimeout(login, 500);
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
            if (loginEnCurso) return;
            loginEnCurso = true;
            PASSWORD = document.getElementById('password-input').value.trim();
            const trustedInternalAccess = hasOperativoAccess();
            if (!trustedInternalAccess) {
                if (!PASSWORD) {
                    loginEnCurso = false;
                    return mostrarErrorLogin('Ingresa la contraseña');
                }
                if (PASSWORD !== CONFIG.FRONT_PASSWORD) {
                    loginEnCurso = false;
                    return mostrarErrorLogin('Contraseña incorrecta');
                }
            }

            const btn = document.getElementById('btn-login');
            btn.disabled = true;
            btn.innerHTML = '<div class="loading-spinner w-5 h-5"></div> Verificando...';
            ocultarErrorLogin();

            try {
                let res = await fetch(CONFIG.BACKEND_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'semaforo'
                    })
                });
                let data = null;
                if (res.ok) {
                    try { data = await res.json(); } catch (e) {}
                }
                if (!data || data.error) {
                    res = await fetch(`${CONFIG.BACKEND_URL}?action=semaforo&t=${Date.now()}`);
                    if (!res.ok) throw new Error('Error de conexión');
                    data = await res.json();
                }
                if (data.error) throw new Error(data.error);

                const remember = document.getElementById('remember-me').checked;
                if (!trustedInternalAccess) {
                    sessionStorage.setItem('srfix_pass_operativo', PASSWORD);
                    if (remember) {
                        localStorage.setItem('srfix_pass_operativo', PASSWORD);
                    } else {
                        localStorage.removeItem('srfix_pass_operativo');
                    }
                }
                
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('app').classList.remove('hidden');
                
                const f = new Date();
                f.setDate(f.getDate() + 3);
                document.getElementById('fecha-promesa').valueAsDate = f;
                actualizarFechaActual();
                setInterval(actualizarFechaActual, 60000);
                cargarBorradorLocal();
                mostrarToast('Sesión iniciada', 'success');

            } catch (e) {
                mostrarErrorLogin('No se pudo iniciar sesión por conexión o backend. Si la clave es Admin1, intenta de nuevo.');
                btn.innerHTML = 'INGRESAR';
                btn.disabled = false;
            }
            loginEnCurso = false;
        }

        function logout() {
            if (confirm('¿Cerrar sesión? Se perderán los datos no guardados.')) {
                sessionStorage.removeItem('srfix_pass_operativo');
                localStorage.removeItem('srfix_pass_operativo');
                localStorage.removeItem('srfix_borrador_orden');
                try {
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({ type: 'srfix:logout' }, '*');
                        return;
                    }
                } catch (e) {}
                location.reload();
            }
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
        // PERSISTENCIA LOCAL
        // ==========================================
        function guardarBorradorLocal() {
            const datos = {
                folioCotizacion: document.getElementById('folio-cotizacion-input')?.value || '',
                clienteNombre: document.getElementById('cliente-nombre').value,
                clienteTelefono: document.getElementById('cliente-telefono').value,
                clienteEmail: document.getElementById('cliente-email').value,
                equipoTipo: document.getElementById('equipo-tipo').value,
                equipoModelo: document.getElementById('equipo-modelo').value,
                equipoFalla: document.getElementById('equipo-falla').value,
                fechaPromesa: document.getElementById('fecha-promesa').value,
                costo: document.getElementById('costo').value,
                notasExtra: document.getElementById('notas-extra').value,
                checks: {
                    cargador: document.getElementById('chk-cargador').checked,
                    pantalla: document.getElementById('chk-pantalla').checked,
                    prende: document.getElementById('chk-prende').checked,
                    respaldo: document.getElementById('chk-respaldo').checked
                },
                fotoAdjunta: !!fotoRecepcionBase64
            };
            localStorage.setItem('srfix_borrador_orden', JSON.stringify(datos));
        }

        function cargarBorradorLocal() {
            const guardado = localStorage.getItem('srfix_borrador_orden');
            if (!guardado) return;
            try {
                const datos = JSON.parse(guardado);
                if (document.getElementById('folio-cotizacion-input')) {
                    document.getElementById('folio-cotizacion-input').value = String(datos.folioCotizacion || '').toUpperCase();
                }
                document.getElementById('cliente-nombre').value = datos.clienteNombre || '';
                document.getElementById('cliente-telefono').value = datos.clienteTelefono || '';
                document.getElementById('cliente-email').value = datos.clienteEmail || '';
                document.getElementById('equipo-tipo').value = datos.equipoTipo || '';
                document.getElementById('equipo-modelo').value = datos.equipoModelo || '';
                document.getElementById('equipo-falla').value = datos.equipoFalla || '';
                document.getElementById('fecha-promesa').value = datos.fechaPromesa || '';
                document.getElementById('costo').value = datos.costo || '';
                document.getElementById('notas-extra').value = datos.notasExtra || '';
                document.getElementById('chk-cargador').checked = datos.checks?.cargador || false;
                document.getElementById('chk-pantalla').checked = datos.checks?.pantalla || false;
                document.getElementById('chk-prende').checked = datos.checks?.prende || false;
                document.getElementById('chk-respaldo').checked = datos.checks?.respaldo || false;
                fotoRecepcionBase64 = '';
                document.getElementById('foto-preview-wrap').classList.add('hidden');
            } catch (e) {}
        }

        function setMensajeFolio(texto = '', tipo = 'info') {
            const el = document.getElementById('folio-cotizacion-msg');
            if (!el) return;
            el.textContent = texto;
            el.classList.remove('text-[#8A8F95]', 'text-red-400', 'text-green-400');
            if (tipo === 'error') el.classList.add('text-red-400');
            else if (tipo === 'success') el.classList.add('text-green-400');
            else el.classList.add('text-[#8A8F95]');
        }

        async function cargarDesdeFolioCotizacion() {
            const input = document.getElementById('folio-cotizacion-input');
            const folio = String(input?.value || '').trim().toUpperCase();
            if (!folio) {
                setMensajeFolio('Ingresa un folio de cotización.', 'error');
                return;
            }

            setMensajeFolio('Buscando solicitud...');
            try {
                let data = null;
                let res = await fetch(CONFIG.BACKEND_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'solicitud', folio })
                });
                if (res.ok) {
                    try { data = await res.json(); } catch (e) {}
                }
                if (!data || data.error) {
                    res = await fetch(`${CONFIG.BACKEND_URL}?action=solicitud&folio=${encodeURIComponent(folio)}&t=${Date.now()}`);
                    if (!res.ok) throw new Error('Error de conexión');
                    data = await res.json();
                }
                if (!data || data.error || !data.solicitud) throw new Error(data?.error || 'No se encontró la solicitud');

                const s = data.solicitud;
                const estadoSolicitud = String(s.ESTADO || '').toLowerCase();
                if (estadoSolicitud && estadoSolicitud !== 'pendiente') {
                    setMensajeFolio(`La solicitud ${folio} está en estado "${s.ESTADO}". Se cargó solo como referencia.`, 'info');
                }
                document.getElementById('cliente-nombre').value = s.NOMBRE || '';
                document.getElementById('cliente-telefono').value = s.TELEFONO || '';
                document.getElementById('cliente-email').value = s.EMAIL || '';
                document.getElementById('equipo-tipo').value = resolverTipoDispositivo(s.DISPOSITIVO);
                document.getElementById('equipo-modelo').value = s.MODELO || '';
                document.getElementById('equipo-falla').value = s.DESCRIPCION || s.PROBLEMAS || '';

                // Si no hay nota manual, deja trazabilidad de origen sin forzar.
                const notasExtra = document.getElementById('notas-extra');
                if (notasExtra && !String(notasExtra.value || '').trim()) {
                    notasExtra.value = `Origen solicitud: ${folio}`;
                }

                folioSolicitudOrigen = folio;
                guardarBorradorLocal();
                setMensajeFolio(`Solicitud ${folio} cargada. Puedes editar todo antes de guardar.`, 'success');
                mostrarToast(`Solicitud ${folio} cargada`, 'success');
            } catch (e) {
                setMensajeFolio(e.message || 'No se pudo cargar la solicitud', 'error');
                mostrarToast('No se pudo cargar la solicitud', 'error');
            }
        }

        async function manejarFotoRecepcion(input) {
            const file = input.files && input.files[0];
            if (!file) return;
            try {
                fotoRecepcionBase64 = await comprimirImagenADataURL(file, 1280, 0.75);
                document.getElementById('foto-preview').src = fotoRecepcionBase64;
                document.getElementById('foto-preview-wrap').classList.remove('hidden');
                guardarBorradorLocal();
            } catch (e) {
                console.error('Error al procesar imagen:', e);
                mostrarToast('No se pudo procesar la foto', 'error');
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

        document.addEventListener('input', (e) => {
            if (e.target.closest('#app input, #app select, #app textarea')) guardarBorradorLocal();
        });
        document.addEventListener('change', (e) => {
            if (e.target.closest('#app input[type=checkbox]')) guardarBorradorLocal();
        });

        // ==========================================
        // NAVEGACIÓN ENTRE PASOS
        // ==========================================
        function irPaso(paso) {
            if (paso === 2 && !validarPaso1()) return;
            if (paso === 3 && !validarPaso2()) return;
            if (paso === 3) actualizarResumen();

            [1,2,3].forEach(i => document.getElementById(`step-${i}`).classList.add('hidden'));
            document.getElementById(`step-${paso}`).classList.remove('hidden');

            for (let i = 1; i <= 3; i++) {
                const ind = document.getElementById(`step-${i}-ind`);
                if (i < paso) {
                    ind.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold step-completed transition-all';
                    ind.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
                } else if (i === paso) {
                    ind.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold step-active transition-all';
                    ind.textContent = i;
                } else {
                    ind.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold step-inactive transition-all';
                    ind.textContent = i;
                }
            }
        }

        // ==========================================
        // VALIDACIONES
        // ==========================================
        function validarPaso1() {
            let ok = true;
            const nombre = document.getElementById('cliente-nombre').value.trim();
            const tel = normalizarTelefono10(document.getElementById('cliente-telefono').value);
            
            document.querySelectorAll('#step-1 .error-message, #step-1 .input-error').forEach(el => {
                if (el.classList.contains('error-message')) el.classList.add('hidden');
                else el.classList.remove('input-error');
            });

            if (!nombre) {
                mostrarError('error-nombre', 'El nombre es obligatorio');
                document.getElementById('cliente-nombre').classList.add('input-error');
                ok = false;
            }
            if (!tel) {
                mostrarError('error-telefono', 'Teléfono debe tener exactamente 10 dígitos');
                document.getElementById('cliente-telefono').classList.add('input-error');
                ok = false;
            }
            return ok;
        }

        function normalizarTelefono10(raw) {
            const digits = String(raw || '').replace(/\D/g, '');
            return digits.length === 10 ? digits : '';
        }

        function resolverTipoDispositivo(valorSolicitud) {
            const raw = String(valorSolicitud || '').trim();
            if (!raw) return '';
            const v = raw.toLowerCase();
            if (v.includes('smart') || v.includes('cel') || v.includes('phone') || v.includes('movil')) return 'Smartphone';
            if (v.includes('tablet') || v.includes('ipad')) return 'Tablet';
            if (v.includes('lap') || v.includes('notebook') || v.includes('macbook') || v.includes('surface')) return 'Laptop';
            if (v.includes('pc') || v.includes('comput') || v.includes('desktop')) return 'Computadora';
            return 'Otro';
        }

        function validarPaso2() {
            let ok = true;
            const tipo = document.getElementById('equipo-tipo').value;
            const modelo = document.getElementById('equipo-modelo').value.trim();
            const falla = document.getElementById('equipo-falla').value.trim();
            const fecha = document.getElementById('fecha-promesa').value;

            document.querySelectorAll('#step-2 .error-message, #step-2 .input-error').forEach(el => {
                if (el.classList.contains('error-message')) el.classList.add('hidden');
                else el.classList.remove('input-error');
            });

            if (!tipo) {
                mostrarError('error-tipo', 'Selecciona tipo de dispositivo');
                document.getElementById('equipo-tipo').classList.add('input-error');
                ok = false;
            }
            if (!modelo) {
                mostrarError('error-modelo', 'Completa marca y modelo');
                document.getElementById('equipo-modelo').classList.add('input-error');
                ok = false;
            }
            if (!falla) {
                mostrarError('error-falla', 'Describe la falla reportada');
                document.getElementById('equipo-falla').classList.add('input-error');
                ok = false;
            }
            if (!fecha) {
                mostrarError('error-fecha', 'Selecciona fecha de entrega');
                document.getElementById('fecha-promesa').classList.add('input-error');
                ok = false;
            } else {
                const hoy = new Date(); hoy.setHours(0,0,0,0);
                const fechaSel = new Date(fecha + 'T00:00:00');
                if (fechaSel < hoy) {
                    mostrarError('error-fecha', 'La fecha no puede ser anterior a hoy');
                    document.getElementById('fecha-promesa').classList.add('input-error');
                    ok = false;
                }
            }
            return ok;
        }

        function mostrarError(elementId, mensaje) {
            const el = document.getElementById(elementId);
            el.textContent = mensaje;
            el.classList.remove('hidden');
        }

        function actualizarResumen() {
            document.getElementById('res-cliente').textContent = document.getElementById('cliente-nombre').value;
            document.getElementById('res-telefono').textContent = document.getElementById('cliente-telefono').value;
            document.getElementById('res-email').textContent = document.getElementById('cliente-email').value || '(no proporcionado)';
            document.getElementById('res-equipo').textContent = document.getElementById('equipo-tipo').value + ' - ' + document.getElementById('equipo-modelo').value;
            document.getElementById('res-falla').textContent = document.getElementById('equipo-falla').value;
            document.getElementById('res-fecha').textContent = document.getElementById('fecha-promesa').value;
            const costo = document.getElementById('costo').value;
            document.getElementById('res-costo').textContent = costo ? `$${parseFloat(costo).toFixed(2)}` : '$0';

            const checks = [];
            if (document.getElementById('chk-cargador').checked) checks.push('⚡Cargador');
            if (document.getElementById('chk-pantalla').checked) checks.push('📱Pantalla');
            if (document.getElementById('chk-prende').checked) checks.push('🔌Prende');
            if (document.getElementById('chk-respaldo').checked) checks.push('💾Respaldo');
            document.getElementById('res-checklist').textContent = checks.join(' • ') || 'Ninguno';
            document.getElementById('res-foto').textContent = fotoRecepcionBase64 ? 'Adjunta' : 'Sin foto';
        }

        // ==========================================
        // GUARDAR ORDEN
        // ==========================================
        async function guardarOrden() {
            if (!validarPaso1()) {
                irPaso(1);
                return;
            }
            if (!validarPaso2()) {
                irPaso(2);
                return;
            }

            const btn = document.getElementById('btn-guardar');
            btn.disabled = true;
            btn.innerHTML = '<div class="loading-spinner w-5 h-5"></div> Guardando...';

            const telefono10 = normalizarTelefono10(document.getElementById('cliente-telefono').value);
            if (!telefono10) {
                mostrarToast('Teléfono inválido: deben ser 10 dígitos', 'error');
                irPaso(1);
                return;
            }

            const data = {
                action: 'crear_equipo',
                sucursalId: localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL',
                clienteNombre: document.getElementById('cliente-nombre').value.trim(),
                clienteTelefono: telefono10,
                clienteEmail: document.getElementById('cliente-email').value.trim() || '',
                dispositivo: document.getElementById('equipo-tipo').value,
                modelo: document.getElementById('equipo-modelo').value.trim(),
                falla: document.getElementById('equipo-falla').value.trim(),
                fechaPromesa: document.getElementById('fecha-promesa').value,
                costo: document.getElementById('costo').value || 0,
                notas: document.getElementById('notas-extra').value.trim() || '',
                checks: {
                    cargador: document.getElementById('chk-cargador').checked,
                    pantalla: document.getElementById('chk-pantalla').checked,
                    prende: document.getElementById('chk-prende').checked,
                    respaldo: document.getElementById('chk-respaldo').checked
                },
                fotoRecepcion: fotoRecepcionBase64 || '',
                folioSolicitudOrigen: folioSolicitudOrigen || String(document.getElementById('folio-cotizacion-input')?.value || '').trim().toUpperCase()
            };

            try {
                const res = await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: JSON.stringify(data) });
                if (!res.ok) throw new Error('Error de conexión');
                const result = await res.json();

                if (result.success) {
                    ultimaOrdenRegistrada = {
                        folio: result.folio,
                        fecha: new Date().toLocaleString('es-MX'),
                        clienteNombre: data.clienteNombre,
                        clienteTelefono: data.clienteTelefono,
                        clienteEmail: data.clienteEmail,
                        dispositivo: data.dispositivo,
                        modelo: data.modelo,
                        falla: data.falla,
                        fechaPromesa: data.fechaPromesa,
                        costo: data.costo || 0,
                        notas: data.notas || '',
                        fotoRecepcion: fotoRecepcionBase64 || '',
                        checks: {
                            cargador: !!data.checks?.cargador,
                            pantalla: !!data.checks?.pantalla,
                            prende: !!data.checks?.prende,
                            respaldo: !!data.checks?.respaldo
                        }
                    };
                    localStorage.removeItem('srfix_borrador_orden');
                    document.getElementById('step-3').classList.add('hidden');
                    document.getElementById('exito').classList.remove('hidden');
                    document.getElementById('folio-generado').textContent = result.folio;

                    const portalUrl = new URL('./portal-cliente.html', window.location.href);
                    portalUrl.searchParams.set('folio', result.folio);
                    const mensaje = `Hola, tu equipo ha sido registrado en SRFIX con el folio ${result.folio}. Puedes consultar el estado en: ${portalUrl.toString()}`;
                    document.getElementById('whatsapp-link').href = `https://wa.me/${telefono10}?text=${encodeURIComponent(mensaje)}`;
                    mostrarToast('Orden guardada con éxito', 'success');
                } else {
                    throw new Error(result.error || 'Error al guardar');
                }
            } catch (e) {
                mostrarToast('Error: ' + e.message, 'error');
            } finally {
                btn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Orden';
                btn.disabled = false;
            }
        }

        function copiarFolio() {
            const folio = document.getElementById('folio-generado').textContent;
            navigator.clipboard.writeText(folio).then(() => {
                mostrarToast('Folio copiado', 'success');
            }).catch(() => {
                prompt('Copia manualmente:', folio);
            });
        }

        function generarPDFOrden(tipo = 'previa') {
            let datos = null;
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
                    clienteNombre: document.getElementById('res-cliente').textContent || '---',
                    clienteTelefono: document.getElementById('res-telefono').textContent || '---',
                    clienteEmail: document.getElementById('res-email').textContent || '---',
                    dispositivo: document.getElementById('equipo-tipo').value || '---',
                    modelo: document.getElementById('equipo-modelo').value || '---',
                    falla: document.getElementById('res-falla').textContent || '---',
                    fechaPromesa: document.getElementById('res-fecha').textContent || '---',
                    costo: (document.getElementById('res-costo').textContent || '$0').replace('$', ''),
                    notas: document.getElementById('notas-extra').value || '---',
                    fotoRecepcion: fotoRecepcionBase64 || '',
                    checks: {
                        cargador: document.getElementById('chk-cargador').checked,
                        pantalla: document.getElementById('chk-pantalla').checked,
                        prende: document.getElementById('chk-prende').checked,
                        respaldo: document.getElementById('chk-respaldo').checked
                    }
                };
            }

            const checksList = [];
            if (datos.checks?.cargador) checksList.push('✅ Trae cargador');
            if (datos.checks?.pantalla) checksList.push('✅ Pantalla OK');
            if (datos.checks?.prende) checksList.push('✅ Equipo prende');
            if (datos.checks?.respaldo) checksList.push('✅ Datos respaldados');
            const checksHTML = checksList.length ? checksList.map(c => `<span class="check-item">${c}</span>`).join('') : '<span class="check-item">---</span>';

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
            if (!w) return mostrarToast('Permite ventanas emergentes para generar PDF', 'error');
            w.document.open();
            w.document.write(html);
            w.document.close();
        }

        function generarPDFResumenOrden() { generarPDFOrden('previa'); }
        function descargarOrdenPDF() { generarPDFOrden('confirmada'); }

        function nuevaOrden() {
            document.getElementById('cliente-nombre').value = '';
            document.getElementById('cliente-telefono').value = '';
            document.getElementById('cliente-email').value = '';
            if (document.getElementById('folio-cotizacion-input')) document.getElementById('folio-cotizacion-input').value = '';
            document.getElementById('equipo-tipo').value = '';
            document.getElementById('equipo-modelo').value = '';
            document.getElementById('equipo-falla').value = '';
            document.getElementById('costo').value = '';
            document.getElementById('notas-extra').value = '';
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.getElementById('foto-recepcion').value = '';
            document.getElementById('foto-preview-wrap').classList.add('hidden');
            fotoRecepcionBase64 = '';
            ultimaOrdenRegistrada = null;
            folioSolicitudOrigen = '';
            setMensajeFolio('');

            const f = new Date(); f.setDate(f.getDate() + 3);
            document.getElementById('fecha-promesa').valueAsDate = f;
            localStorage.removeItem('srfix_borrador_orden');

            document.getElementById('exito').classList.add('hidden');
            document.getElementById('step-1').classList.remove('hidden');
            document.getElementById('step-2').classList.add('hidden');
            document.getElementById('step-3').classList.add('hidden');
            
            for (let i = 1; i <= 3; i++) {
                const ind = document.getElementById(`step-${i}-ind`);
                if (i === 1) {
                    ind.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold step-active';
                    ind.textContent = '1';
                } else {
                    ind.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold step-inactive';
                    ind.textContent = i;
                }
            }
        }

        // ==========================================
        // TOAST
        // ==========================================
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
