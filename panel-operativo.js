        const CONFIG = {
            BACKEND_URL: 'https://script.google.com/macros/s/AKfycbw548d2MN54QEFoua9XPcLCaHSlSFjZ1mlIYKVVHM0w2ZAakOm02MYjhLPiko5pic33/exec',
            MODULO: 'operativo',
            LOGO_URL: './logo.webp'
        };

        // ==========================================
        // VARIABLES GLOBALES
        // ==========================================
        let PASSWORD = '';
        let fotoRecepcionBase64 = '';

        (function() {
            const saved = sessionStorage.getItem('srfix_pass_operativo');
            if (saved) document.getElementById('password-input').value = saved;
        })();

        // ==========================================
        // LOGIN / LOGOUT
        // ==========================================
        async function login() {
            PASSWORD = document.getElementById('password-input').value.trim();
            if (!PASSWORD) return mostrarErrorLogin('Ingresa la contraseña');

            const btn = document.getElementById('btn-login');
            btn.disabled = true;
            btn.innerHTML = '<div class="loading-spinner w-5 h-5"></div> Verificando...';
            ocultarErrorLogin();

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

                sessionStorage.setItem('srfix_pass_operativo', PASSWORD);
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('app').classList.remove('hidden');
                
                const f = new Date();
                f.setDate(f.getDate() + 3);
                document.getElementById('fecha-promesa').valueAsDate = f;
                cargarBorradorLocal();
                mostrarToast('Sesión iniciada', 'success');

            } catch (e) {
                mostrarErrorLogin(e.message || 'Contraseña incorrecta');
                btn.innerHTML = 'INGRESAR';
                btn.disabled = false;
            }
        }

        function logout() {
            if (confirm('¿Cerrar sesión? Se perderán los datos no guardados.')) {
                sessionStorage.removeItem('srfix_pass_operativo');
                localStorage.removeItem('srfix_borrador_orden');
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
                fotoRecepcion: fotoRecepcionBase64 || ''
            };
            localStorage.setItem('srfix_borrador_orden', JSON.stringify(datos));
        }

        function cargarBorradorLocal() {
            const guardado = localStorage.getItem('srfix_borrador_orden');
            if (!guardado) return;
            try {
                const datos = JSON.parse(guardado);
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
                fotoRecepcionBase64 = datos.fotoRecepcion || '';
                if (fotoRecepcionBase64) {
                    document.getElementById('foto-preview').src = fotoRecepcionBase64;
                    document.getElementById('foto-preview-wrap').classList.remove('hidden');
                } else {
                    document.getElementById('foto-preview-wrap').classList.add('hidden');
                }
            } catch (e) {}
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
            const tel = document.getElementById('cliente-telefono').value.replace(/\D/g, '');
            
            document.querySelectorAll('#step-1 .error-message, #step-1 .input-error').forEach(el => {
                if (el.classList.contains('error-message')) el.classList.add('hidden');
                else el.classList.remove('input-error');
            });

            if (!nombre) {
                mostrarError('error-nombre', 'El nombre es obligatorio');
                document.getElementById('cliente-nombre').classList.add('input-error');
                ok = false;
            }
            if (!tel || tel.length < 10) {
                mostrarError('error-telefono', 'Teléfono debe tener 10 dígitos');
                document.getElementById('cliente-telefono').classList.add('input-error');
                ok = false;
            }
            return ok;
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
            if (!validarPaso2()) {
                irPaso(2);
                return;
            }

            const btn = document.getElementById('btn-guardar');
            btn.disabled = true;
            btn.innerHTML = '<div class="loading-spinner w-5 h-5"></div> Guardando...';

            const data = {
                action: 'crear_equipo',
                modulo: CONFIG.MODULO,
                password: PASSWORD,
                clienteNombre: document.getElementById('cliente-nombre').value.trim(),
                clienteTelefono: document.getElementById('cliente-telefono').value.replace(/\D/g, ''),
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
                fotoRecepcion: fotoRecepcionBase64 || ''
            };

            try {
                const res = await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: JSON.stringify(data) });
                if (!res.ok) throw new Error('Error de conexión');
                const result = await res.json();

                if (result.success) {
                    localStorage.removeItem('srfix_borrador_orden');
                    document.getElementById('step-3').classList.add('hidden');
                    document.getElementById('exito').classList.remove('hidden');
                    document.getElementById('folio-generado').textContent = result.folio;

                    const telefono = document.getElementById('cliente-telefono').value.replace(/\D/g, '');
                    const portalUrl = new URL('./portal-cliente.html', window.location.href);
                    portalUrl.searchParams.set('folio', result.folio);
                    const mensaje = `Hola, tu equipo ha sido registrado en SRFIX con el folio ${result.folio}. Puedes consultar el estado en: ${portalUrl.toString()}`;
                    document.getElementById('whatsapp-link').href = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
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

        function nuevaOrden() {
            document.getElementById('cliente-nombre').value = '';
            document.getElementById('cliente-telefono').value = '';
            document.getElementById('cliente-email').value = '';
            document.getElementById('equipo-tipo').value = '';
            document.getElementById('equipo-modelo').value = '';
            document.getElementById('equipo-falla').value = '';
            document.getElementById('costo').value = '';
            document.getElementById('notas-extra').value = '';
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.getElementById('foto-recepcion').value = '';
            document.getElementById('foto-preview-wrap').classList.add('hidden');
            fotoRecepcionBase64 = '';

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
