"use strict";
;
(function () {
    const backend = window.SRFIXBackend;
    const globalWindow = window;
    const CONFIG = {
        TIENDA_WHATSAPP: '528117006536',
        TIENDA_MAPS: 'https://maps.app.goo.gl/WfZYxbunp9XhXHgr5',
        LOGO_URL: './logo.webp',
        SUGGESTIONS_KEY: 'srfix_folios_historial'
    };
    const portalWindow = window;
    function formatDateYMD(valor) {
        if (!valor)
            return '---';
        const raw = String(valor).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw))
            return raw;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime()))
            return raw;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function requireElement(id) {
        const el = document.getElementById(id);
        if (!el) {
            throw new Error(`Elemento no encontrado: ${id}`);
        }
        return el;
    }
    function showEl(id, visible) {
        const el = document.getElementById(id);
        if (!el)
            return;
        el.classList.toggle('hidden', !visible);
    }
    function setText(id, value) {
        const el = document.getElementById(id);
        if (!el)
            return;
        el.textContent = String(value ?? '---');
    }
    function getHistorialFolios() {
        try {
            const raw = localStorage.getItem(CONFIG.SUGGESTIONS_KEY);
            const arr = JSON.parse(raw || '[]');
            if (!Array.isArray(arr))
                return [];
            return arr.map((v) => String(v || '').trim().toUpperCase()).filter(Boolean);
        }
        catch {
            return [];
        }
    }
    function setHistorialFolios(arr) {
        localStorage.setItem(CONFIG.SUGGESTIONS_KEY, JSON.stringify(arr.slice(0, 20)));
    }
    function actualizarSugerenciasFolios() {
        const datalist = document.getElementById('folio-sugerencias');
        if (!datalist)
            return;
        const folios = getHistorialFolios();
        datalist.innerHTML = folios.map((folio) => `<option value="${escapeHtml(folio)}"></option>`).join('');
    }
    function agregarFolioHistorial(folio) {
        const clean = String(folio || '').trim().toUpperCase();
        if (!clean)
            return;
        const actuales = getHistorialFolios().filter((x) => x !== clean);
        actuales.unshift(clean);
        setHistorialFolios(actuales);
        actualizarSugerenciasFolios();
    }
    function parseSeguimientoFotos(raw) {
        if (!raw)
            return [];
        const isValid = (v) => typeof v === 'string' && (v.startsWith('data:image/') || /^https?:\/\//.test(v));
        if (Array.isArray(raw))
            return raw.filter(isValid);
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed))
                    return parsed.filter(isValid);
            }
            catch {
                return [];
            }
        }
        return [];
    }
    function renderizarFotosSeguimiento(raw) {
        const fotos = parseSeguimientoFotos(raw);
        const card = requireElement('seguimiento-fotos-card');
        const cont = requireElement('res-seguimiento-fotos');
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
    function abrirLightbox(src, caption) {
        const lb = requireElement('lightbox');
        const img = requireElement('lightbox-img');
        const cap = requireElement('lightbox-caption');
        img.src = src;
        cap.textContent = caption || '';
        lb.classList.remove('hidden');
    }
    function cerrarLightbox() {
        const lb = requireElement('lightbox');
        const img = requireElement('lightbox-img');
        lb.classList.add('hidden');
        img.removeAttribute('src');
    }
    function mostrarToast(mensaje, tipo = 'success') {
        const toast = requireElement('toast');
        const message = requireElement('toast-message');
        message.textContent = mensaje;
        toast.classList.remove('translate-y-20', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        toast.style.borderLeftColor = tipo === 'error' ? '#ef4444' : '#FF6A2A';
        window.setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            toast.classList.remove('translate-y-0', 'opacity-100');
        }, 3000);
    }
    function mostrarError(mensaje) {
        const el = requireElement('error');
        el.textContent = mensaje;
        el.classList.remove('hidden');
    }
    function ocultarError() {
        requireElement('error').classList.add('hidden');
    }
    function mostrarResultado(eq) {
        requireElement('buscador').classList.add('hidden');
        requireElement('resultado').classList.remove('hidden');
        setText('res-folio', eq.FOLIO);
        setText('res-equipo', eq.DISPOSITIVO || '---');
        setText('res-modelo', eq.MODELO || '---');
        setText('res-falla', eq.FALLA_REPORTADA || 'No especificada');
        setText('res-fecha', eq.FECHA_PROMESA || 'Por definir');
        setText('res-ingreso', formatDateYMD(eq.FECHA_INGRESO));
        setText('res-actualizacion', formatDateYMD(new Date().toISOString()));
        setText('res-seguimiento', eq.SEGUIMIENTO_CLIENTE || 'Sin avances registrados por el momento.');
        renderizarFotosSeguimiento(eq.SEGUIMIENTO_FOTOS);
        let diasTexto = '---';
        if (eq.diasRestantes !== undefined) {
            diasTexto = `${eq.diasRestantes} días`;
            if (eq.diasRestantes < 0)
                diasTexto = '⚠️ Vencido';
            else if (eq.diasRestantes === 0)
                diasTexto = '¡Hoy!';
        }
        setText('res-dias', diasTexto);
        const estado = eq.ESTADO || 'Recibido';
        const badge = requireElement('estado-badge');
        badge.textContent = estado;
        badge.className = `status-badge status-${String(estado).replace(/ /g, '')}`;
        const mensaje = `Hola, soy el cliente del folio ${eq.FOLIO}. ¿Podrían darme información sobre mi equipo?`;
        requireElement('wa-link').href = `https://wa.me/${CONFIG.TIENDA_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
        const liveCam = requireElement('live-cam');
        const ytPlayer = requireElement('yt-player');
        if (eq.YOUTUBE_ID) {
            liveCam.classList.remove('hidden');
            ytPlayer.src = `https://www.youtube.com/embed/${eq.YOUTUBE_ID}?autoplay=1&mute=1&rel=0`;
        }
        else {
            liveCam.classList.add('hidden');
            ytPlayer.removeAttribute('src');
        }
    }
    function volver() {
        requireElement('resultado').classList.add('hidden');
        requireElement('buscador').classList.remove('hidden');
        requireElement('folio-input').value = '';
        ocultarError();
    }
    function imprimirDetalle() {
        window.print();
    }
    async function buscar() {
        const input = requireElement('folio-input');
        const folio = input.value.trim().toUpperCase();
        if (!folio)
            return;
        const btn = requireElement('btn-buscar');
        btn.disabled = true;
        btn.innerHTML = '<div class="loading-spinner w-6 h-6"></div> Consultando...';
        ocultarError();
        try {
            const data = await backend.request('equipo', { folio }, { method: 'GET' });
            if (!data.equipo)
                throw new Error('No encontrado');
            mostrarResultado(data.equipo);
            agregarFolioHistorial(folio);
            mostrarToast('Equipo encontrado', 'success');
        }
        catch {
            mostrarError('Folio no encontrado. Verifica e intenta de nuevo.');
            mostrarToast('Error en la consulta', 'error');
        }
        finally {
            btn.innerHTML = '<i class="fa-solid fa-circle-arrow-right"></i> Consultar';
            btn.disabled = false;
        }
    }
    function bindEvents() {
        requireElement('folio-input').addEventListener('input', (e) => {
            const target = e.target;
            target.value = String(target.value || '').toUpperCase();
        });
        requireElement('res-seguimiento-fotos').addEventListener('click', (e) => {
            const target = e.target;
            const btn = target?.closest('button[data-src]');
            if (!btn)
                return;
            abrirLightbox(btn.dataset.src || '', btn.dataset.caption || '');
        });
        requireElement('lightbox-close').addEventListener('click', cerrarLightbox);
        requireElement('lightbox').addEventListener('click', (e) => {
            if (e.target === requireElement('lightbox'))
                cerrarLightbox();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape')
                cerrarLightbox();
        });
    }
    portalWindow.buscar = buscar;
    portalWindow.volver = volver;
    portalWindow.imprimirDetalle = imprimirDetalle;
    requireElement('fecha-header').textContent = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    actualizarSugerenciasFolios();
    const folioParam = new URLSearchParams(window.location.search).get('folio');
    if (folioParam) {
        requireElement('folio-input').value = String(folioParam).toUpperCase();
        void buscar();
    }
    bindEvents();
})();
