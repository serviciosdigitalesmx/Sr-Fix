        const CONFIG = {
            BACKEND_URL: 'https://script.google.com/macros/s/AKfycbz8kwnncjT8hEy2o-KOoUSQBHBzFpTLjqqZ-EwANJ8mx_XzeB-4FIsD_DWvJQVOuTjM/exec',
            WHATSAPP: '528117006536'
        };

        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            const navbar = document.getElementById('navbar');
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(30, 30, 30, 0.98)';
                navbar.style.padding = '0.8rem 5%';
            } else {
                navbar.style.background = 'rgba(30, 30, 30, 0.95)';
                navbar.style.padding = '1rem 5%';
            }
        });

        // Intersection Observer for fade-in animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

        // Service card selection
        document.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', function() {
                document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
                const servicio = this.dataset.servicio;
                document.getElementById('servicioInput').value = servicio;
                const select = document.getElementById('dispositivoSelect');
                const options = Array.from(select.options);
                const option = options.find(opt => opt.value === servicio);
                if (option) select.value = servicio;
                document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });

        // Urgencia buttons
        document.querySelectorAll('.urgencia-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.urgencia-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                document.getElementById('urgenciaInput').value = this.dataset.value;
            });
        });

        // Form submission - guardar en backend y enviar a WhatsApp
        document.getElementById('cotizadorForm').addEventListener('submit', async function(e) {
            e.preventDefault(); // Evitar envío tradicional

            try {
                // Validar que se haya seleccionado un dispositivo (por tarjeta o select)
                const servicioSeleccionado = document.querySelector('.service-card.selected');
                const dispositivoSelect = document.getElementById('dispositivoSelect').value;
                if (!servicioSeleccionado && !dispositivoSelect) {
                    alert('Por favor selecciona un tipo de servicio (haz clic en una tarjeta o elige del menú desplegable).');
                    return;
                }

                // Obtener valores del formulario
                const nombre = document.querySelector('input[name="nombre"]').value.trim();
                const telefono = document.querySelector('input[name="telefono"]').value.trim();
                const dispositivo = dispositivoSelect || (servicioSeleccionado ? servicioSeleccionado.dataset.servicio : 'No especificado');
                const modelo = document.querySelector('input[name="modelo"]').value.trim();
                const descripcion = document.querySelector('textarea[name="descripcion"]').value.trim();
                const urgencia = document.getElementById('urgenciaInput').value;
                const email = document.querySelector('input[name="email"]')?.value.trim() || '';

                // Recoger problemas seleccionados
                const problemas = [];
                document.querySelectorAll('input[name="problemas"]:checked').forEach(cb => {
                    const label = document.querySelector(`label[for="${cb.id}"]`);
                    problemas.push(label ? label.innerText.trim() : cb.value);
                });

                // Mapear urgencia a texto legible
                let urgenciaTexto = '';
                if (urgencia === 'baja') urgenciaTexto = 'Baja (esta semana)';
                else if (urgencia === 'media') urgenciaTexto = 'Media (en 2-3 días)';
                else urgenciaTexto = 'Alta (urgente, 24h)';

                const payload = {
                    action: 'crear_solicitud',
                    nombre: nombre,
                    telefono: telefono,
                    email: email,
                    dispositivo: dispositivo,
                    modelo: modelo,
                    problemas: problemas,
                    descripcion: descripcion,
                    urgencia: urgencia
                };

                const response = await fetch(CONFIG.BACKEND_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                let result = null;
                if (response.ok) {
                    try {
                        result = await response.json();
                    } catch (e) {}
                }

                // Fallback por si POST regresa HTML/redirect en ciertos deployments de Apps Script.
                if (!result || result.error || !result.success) {
                    const qs = new URLSearchParams({
                        action: 'crear_solicitud',
                        nombre: nombre,
                        telefono: telefono,
                        email: email,
                        dispositivo: dispositivo,
                        modelo: modelo,
                        problemas: problemas.join(', '),
                        descripcion: descripcion,
                        urgencia: urgencia
                    });
                    const fallbackRes = await fetch(`${CONFIG.BACKEND_URL}?${qs.toString()}`);
                    if (!fallbackRes.ok) throw new Error('Error de conexión al backend');
                    result = await fallbackRes.json();
                    if (result.error || !result.success) throw new Error(result.error || 'No se pudo guardar la solicitud');
                }

                // Construir mensaje con saltos de línea reales (luego se codificará)
                let mensaje = "*Nueva cotización - SrFix Oficial*\n\n";
                mensaje += `*Folio:* ${result.folio || 'N/A'}\n`;
                mensaje += `*Nombre:* ${nombre || 'No especificado'}\n`;
                mensaje += `*Teléfono:* ${telefono || 'No especificado'}\n`;
                mensaje += `*Email:* ${email || 'No especificado'}\n`;
                mensaje += `*Dispositivo:* ${dispositivo}\n`;
                mensaje += `*Modelo:* ${modelo || 'No especificado'}\n`;
                mensaje += `*Problemas:* ${problemas.length > 0 ? problemas.join(', ') : 'No especificados'}\n`;
                mensaje += `*Descripción:* ${descripcion || 'Sin descripción'}\n`;
                mensaje += `*Urgencia:* ${urgenciaTexto}\n`;

                // Codificar el mensaje completo y abrir WhatsApp
                const url = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
                window.open(url, '_blank');

                // Resetear formulario después de abrir la ventana
                this.reset();
                document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
                document.querySelector('.urgencia-btn[data-value="alta"]').click(); // reset a urgencia alta

                // Feedback opcional
                alert(`Solicitud guardada con folio ${result.folio}. Redirigiendo a WhatsApp...`);
            } catch (error) {
                console.error('Error al enviar cotización:', error);
                alert('No se pudo guardar la solicitud. Revisa tu conexión e intenta de nuevo.');
            }
        });

        // Actualizar año en copyright
        document.querySelector('.copyright').innerHTML = 
            `© ${new Date().getFullYear()} SrFix Oficial. Todos los derechos reservados.<br>
             Especialistas en reparación de electrónicos en Monterrey, N.L.`;
