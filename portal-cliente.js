        const CONFIG = {
            BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxH1zD8_14TvCajstFhtEpLNODwG9GZXkLoCXOb1IBNm0JIRmpCwS6SRsuGhZETK88z/exec',
            TIENDA_WHATSAPP: '528117006536',
            TIENDA_MAPS: 'https://maps.app.goo.gl/WfZYxbunp9XhXHgr5',
            LOGO_URL: './logo.webp',
            SUGGESTIONS_KEY: 'srfix_folios_historial'
        };

        function formatDateYMD(valor) {
            if (!valor) return '---';
            const raw = String(valor).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
            const d = new Date(raw);
            if (Number.isNaN(d.getTime())) return raw;
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        (function() {
            document.getElementById('fecha-header').textContent = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
            actualizarSugerenciasFolios();
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
                agregarFolioHistorial(folio);
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
            document.getElementById('res-ingreso').textContent = formatDateYMD(eq.FECHA_INGRESO);
            document.getElementById('res-actualizacion').textContent = formatDateYMD(new Date().toISOString());
            document.getElementById('res-seguimiento').textContent = eq.SEGUIMIENTO_CLIENTE || 'Sin avances registrados por el momento.';
            renderizarFotosSeguimiento(eq.SEGUIMIENTO_FOTOS);

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

        function renderizarFotosSeguimiento(raw) {
            const fotos = parseSeguimientoFotos(raw);
            const card = document.getElementById('seguimiento-fotos-card');
            const cont = document.getElementById('res-seguimiento-fotos');
            cont.innerHTML = '';

            if (!fotos.length) {
                card.classList.add('hidden');
                return;
            }

            fotos.forEach((src, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'block rounded-lg overflow-hidden border border-[#1F7EDC] hover:opacity-90 transition';
                btn.dataset.src = src;
                btn.dataset.caption = `Avance ${idx + 1}`;
                btn.innerHTML = `<img src="${src}" alt="Avance ${idx + 1}" class="w-full h-28 object-cover">`;
                cont.appendChild(btn);
            });

            card.classList.remove('hidden');
        }

        function getHistorialFolios() {
            try {
                const raw = localStorage.getItem(CONFIG.SUGGESTIONS_KEY);
                const arr = JSON.parse(raw || '[]');
                if (!Array.isArray(arr)) return [];
                return arr.map(v => String(v || '').trim().toUpperCase()).filter(Boolean);
            } catch (e) {
                return [];
            }
        }

        function setHistorialFolios(arr) {
            localStorage.setItem(CONFIG.SUGGESTIONS_KEY, JSON.stringify(arr.slice(0, 20)));
        }

        function agregarFolioHistorial(folio) {
            const clean = String(folio || '').trim().toUpperCase();
            if (!clean) return;
            const actuales = getHistorialFolios().filter(x => x !== clean);
            actuales.unshift(clean);
            setHistorialFolios(actuales);
            actualizarSugerenciasFolios();
        }

        function actualizarSugerenciasFolios() {
            const datalist = document.getElementById('folio-sugerencias');
            if (!datalist) return;
            const folios = getHistorialFolios();
            datalist.innerHTML = folios.map(f => `<option value="${f}"></option>`).join('');
        }

        function abrirLightbox(src, caption) {
            const lb = document.getElementById('lightbox');
            const img = document.getElementById('lightbox-img');
            const cap = document.getElementById('lightbox-caption');
            img.src = src;
            cap.textContent = caption || '';
            lb.classList.remove('hidden');
        }

        function cerrarLightbox() {
            const lb = document.getElementById('lightbox');
            const img = document.getElementById('lightbox-img');
            lb.classList.add('hidden');
            img.removeAttribute('src');
        }

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

        document.getElementById('folio-input').addEventListener('input', (e) => {
            e.target.value = String(e.target.value || '').toUpperCase();
        });

        document.getElementById('res-seguimiento-fotos').addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-src]');
            if (!btn) return;
            abrirLightbox(btn.dataset.src, btn.dataset.caption || '');
        });

        document.getElementById('lightbox-close').addEventListener('click', cerrarLightbox);
        document.getElementById('lightbox').addEventListener('click', (e) => {
            if (e.target.id === 'lightbox') cerrarLightbox();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cerrarLightbox();
        });
