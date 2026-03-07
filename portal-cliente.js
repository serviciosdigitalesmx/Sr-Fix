        const CONFIG = {
            BACKEND_URL: 'https://script.google.com/macros/s/AKfycbwEgugkot4Ib8Y8H3onbkwLHbllQiv2_LsbclkvNETcAfh03q4LgdussMr13917g7sX/exec',
            TIENDA_WHATSAPP: '528117006536',
            TIENDA_MAPS: 'https://maps.app.goo.gl/WfZYxbunp9XhXHgr5',
            LOGO_URL: './logo.webp'
        };

        (function() {
            document.getElementById('fecha-header').textContent = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const folioParam = new URLSearchParams(window.location.search).get('folio');
            if (folioParam) {
                document.getElementById('folio-input').value = String(folioParam).toUpperCase();
                buscar();
            }
        })();

        async function buscar() {
            const folio = document.getElementById('folio-input').value.trim().toUpperCase();
            if (!folio) return;

            const btn = document.getElementById('btn-buscar');
            btn.disabled = true;
            btn.innerHTML = '<div class="loading-spinner w-6 h-6"></div> Consultando...';
            ocultarError();

            try {
                const res = await fetch(`${CONFIG.BACKEND_URL}?action=equipo&folio=${encodeURIComponent(folio)}&t=${Date.now()}`);
                const data = await res.json();
                if (data.error) throw new Error('No encontrado');
                mostrarResultado(data.equipo);
                mostrarToast('Equipo encontrado', 'success');
            } catch (e) {
                mostrarError('Folio no encontrado. Verifica e intenta de nuevo.');
                mostrarToast('Error en la consulta', 'error');
            } finally {
                btn.innerHTML = '<i class="fa-solid fa-circle-arrow-right"></i> Consultar';
                btn.disabled = false;
            }
        }

        function mostrarResultado(eq) {
            document.getElementById('buscador').classList.add('hidden');
            document.getElementById('resultado').classList.remove('hidden');

            document.getElementById('res-folio').textContent = eq.FOLIO;
            document.getElementById('res-equipo').textContent = eq.DISPOSITIVO || '---';
            document.getElementById('res-modelo').textContent = eq.MODELO || '---';
            document.getElementById('res-falla').textContent = eq.FALLA_REPORTADA || 'No especificada';
            document.getElementById('res-fecha').textContent = eq.FECHA_PROMESA || 'Por definir';
            document.getElementById('res-ingreso').textContent = eq.FECHA_INGRESO ? new Date(eq.FECHA_INGRESO).toLocaleDateString() : '---';
            document.getElementById('res-actualizacion').textContent = new Date().toLocaleString();
            document.getElementById('res-seguimiento').textContent = eq.SEGUIMIENTO_CLIENTE || 'Sin avances registrados por el momento.';

            let diasTexto = '---';
            if (eq.diasRestantes !== undefined) {
                diasTexto = eq.diasRestantes + ' días';
                if (eq.diasRestantes < 0) diasTexto = '⚠️ Vencido';
                else if (eq.diasRestantes === 0) diasTexto = '¡Hoy!';
            }
            document.getElementById('res-dias').textContent = diasTexto;

            const estado = eq.ESTADO || 'Recibido';
            const badge = document.getElementById('estado-badge');
            badge.textContent = estado;
            badge.className = `status-badge status-${estado.replace(/ /g, '')}`;

            const mensaje = `Hola, soy el cliente del folio ${eq.FOLIO}. ¿Podrían darme información sobre mi equipo?`;
            document.getElementById('wa-link').href = `https://wa.me/${CONFIG.TIENDA_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;

            if (eq.YOUTUBE_ID) {
                document.getElementById('live-cam').classList.remove('hidden');
                document.getElementById('yt-player').src = `https://www.youtube.com/embed/${eq.YOUTUBE_ID}?autoplay=1&mute=1&rel=0`;
            } else {
                document.getElementById('live-cam').classList.add('hidden');
            }
        }

        function volver() {
            document.getElementById('resultado').classList.add('hidden');
            document.getElementById('buscador').classList.remove('hidden');
            document.getElementById('folio-input').value = '';
            ocultarError();
        }

        function imprimirDetalle() { window.print(); }
        function mostrarError(mensaje) { document.getElementById('error').textContent = mensaje; document.getElementById('error').classList.remove('hidden'); }
        function ocultarError() { document.getElementById('error').classList.add('hidden'); }

        function mostrarToast(mensaje, tipo = 'success') {
            const toast = document.getElementById('toast');
            document.getElementById('toast-message').textContent = mensaje;
            toast.classList.remove('translate-y-20', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
            if (tipo === 'error') toast.style.borderLeftColor = '#ef4444';
            else toast.style.borderLeftColor = '#FF6A2A';
            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0');
                toast.classList.remove('translate-y-0', 'opacity-100');
            }, 3000);
        }
