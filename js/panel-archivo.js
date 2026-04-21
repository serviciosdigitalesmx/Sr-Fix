"use strict";
;
(function () {
    const BACKEND_URL = String(CONFIG.API_URL || '').trim();
    const elRows = requireElement('rows');
    const elLoading = requireElement('loading');
    const elEmpty = requireElement('empty');
    const elCount = requireElement('count');
    const elPageInfo = requireElement('page-info');
    const elBtnMore = requireElement('btn-more');
    const elFiltroTipo = requireElement('filtro-tipo');
    const elFiltroFrom = requireElement('filtro-from');
    const elFiltroTo = requireElement('filtro-to');
    const btnRefresh = requireElement('btn-refresh');
    const elDetalleModal = requireElement('detalle-modal');
    const elDetalleOverlay = requireElement('detalle-overlay');
    const elDetalleBadge = requireElement('detalle-badge');
    const elDetalleFolio = requireElement('detalle-folio');
    const elDetalleCliente = requireElement('detalle-cliente');
    const elDetalleTipo = requireElement('detalle-tipo');
    const elDetalleFecha = requireElement('detalle-fecha');
    const elDetalleEstado = requireElement('detalle-estado');
    const elDetalleTelefono = requireElement('detalle-telefono');
    const elDetalleTotal = requireElement('detalle-total');
    const elDetalleEmail = requireElement('detalle-email');
    const elDetalleOperativo = requireElement('detalle-operativo');
    const elDetalleNotas = requireElement('detalle-notas');
    const elDetalleRaw = requireElement('detalle-raw');
    const elDetalleAviso = requireElement('detalle-aviso');
    const btnDetalleCerrar = requireElement('btn-detalle-cerrar');
    const btnDetalleCopiar = requireElement('btn-detalle-copiar');
    const btnDetalleReabrir = requireElement('btn-detalle-reabrir');
    const PAGE_SIZE = 150;
    const RENDER_CHUNK = 60;
    let currentPage = 1;
    let hasMore = false;
    let isLoading = false;
    let detalleActual = null;
    function requireElement(id) {
        const el = document.getElementById(id);
        if (!el) {
            throw new Error(`Elemento no encontrado: ${id}`);
        }
        return el;
    }
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function formatMoney(value) {
        const n = Number(value ?? 0);
        if (!Number.isFinite(n) || n <= 0)
            return '---';
        return `$${n.toFixed(2)}`;
    }
    function formatDate(value) {
        if (!value)
            return '---';
        const raw = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw))
            return raw;
        const date = new Date(raw);
        if (Number.isNaN(date.getTime()))
            return escapeHtml(value);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    function badgeTipo(tipo) {
        const normalized = String(tipo || '').toLowerCase();
        if (normalized === 'solicitud')
            return '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Solicitud</span>';
        if (normalized === 'cotizacion')
            return '<span class="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">Cotización</span>';
        return '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Equipo entregado</span>';
    }
    function formatMultiline(value) {
        const text = String(value ?? '').trim();
        if (!text)
            return '<span class="text-[#8A8F95]">Sin datos</span>';
        return escapeHtml(text).replace(/\n/g, '<br>');
    }
    function archivoBadgeLabel(tipo) {
        const normalized = String(tipo || '').toLowerCase();
        if (normalized === 'solicitud')
            return 'Solicitud archivada';
        if (normalized === 'cotizacion')
            return 'Cotización archivada';
        if (normalized === 'equipos')
            return 'Equipo entregado';
        return 'Archivo';
    }
    function archivoDetalleTexto(registro) {
        const partes = [];
        if (registro.DESCRIPCION)
            partes.push(`Descripción: ${registro.DESCRIPCION}`);
        if (registro.PROBLEMAS && registro.PROBLEMAS !== registro.DESCRIPCION)
            partes.push(`Problemas: ${registro.PROBLEMAS}`);
        if (registro.URGENCIA)
            partes.push(`Urgencia: ${registro.URGENCIA}`);
        if (registro.DISPOSITIVO)
            partes.push(`Dispositivo: ${registro.DISPOSITIVO}`);
        if (registro.MODELO)
            partes.push(`Modelo: ${registro.MODELO}`);
        if (registro.SEGUIMIENTO_CLIENTE)
            partes.push(`Seguimiento: ${registro.SEGUIMIENTO_CLIENTE}`);
        if (registro.CASO_RESOLUCION_TECNICA)
            partes.push(`Resolución: ${registro.CASO_RESOLUCION_TECNICA}`);
        return partes.join('\n\n');
    }
    function archivoNotasTexto(registro) {
        const partes = [];
        if (registro.NOTAS)
            partes.push(registro.NOTAS);
        if (registro.COTIZACION_JSON)
            partes.push(registro.COTIZACION_JSON);
        if (registro.CHECK_CARGADOR || registro.CHECK_PANTALLA || registro.CHECK_PRENDE || registro.CHECK_RESPALDO) {
            partes.push([
                `Checklist:`,
                `- Cargador: ${registro.CHECK_CARGADOR || '---'}`,
                `- Pantalla: ${registro.CHECK_PANTALLA || '---'}`,
                `- Prende: ${registro.CHECK_PRENDE || '---'}`,
                `- Respaldo: ${registro.CHECK_RESPALDO || '---'}`
            ].join('\n'));
        }
        return partes.filter(Boolean).join('\n\n');
    }
    function abrirModalDetalle() {
        elDetalleModal.classList.remove('hidden');
        elDetalleModal.classList.add('flex');
    }
    function cerrarModalDetalle() {
        elDetalleModal.classList.add('hidden');
        elDetalleModal.classList.remove('flex');
        detalleActual = null;
    }
    function renderDetalleRegistro(registro, raw, reabrible) {
        detalleActual = registro;
        elDetalleBadge.textContent = archivoBadgeLabel(registro.TIPO_ARCHIVO);
        elDetalleFolio.textContent = String(registro.FOLIO || '---');
        elDetalleCliente.textContent = String(registro.CLIENTE || '---');
        elDetalleTipo.textContent = archivoBadgeLabel(registro.TIPO_ARCHIVO);
        elDetalleFecha.textContent = formatDate(registro.FECHA_ARCHIVO || registro.FECHA_COTIZACION || registro.FECHA_INGRESO || registro.FECHA_ENTREGA);
        elDetalleEstado.textContent = String(registro.ESTADO || '---');
        elDetalleTelefono.textContent = String(registro.TELEFONO || '---');
        elDetalleTotal.textContent = formatMoney(registro.TOTAL);
        elDetalleEmail.textContent = String(registro.EMAIL || '---');
        elDetalleOperativo.innerHTML = formatMultiline(archivoDetalleTexto(registro));
        elDetalleNotas.innerHTML = formatMultiline(archivoNotasTexto(registro));
        elDetalleRaw.textContent = JSON.stringify(raw || registro, null, 2);
        elDetalleAviso.textContent = reabrible
            ? 'Este registro puede reabrirse para volver a editarlo en el flujo operativo.'
            : 'Este registro es de solo consulta desde archivo.';
        btnDetalleReabrir.classList.toggle('hidden', !reabrible);
        abrirModalDetalle();
    }
    function getFiltros() {
        return {
            tipo: elFiltroTipo.value,
            from: elFiltroFrom.value,
            to: elFiltroTo.value
        };
    }
    function getBackendUrl() {
        return BACKEND_URL;
    }
    function buildGetUrl(action, payload = {}) {
        const params = new URLSearchParams();
        params.set('action', action);
        params.set('t', String(Date.now()));
        Object.entries(payload).forEach(([key, raw]) => {
            if (raw === undefined || raw === null || raw === '')
                return;
            if (typeof raw === 'object') {
                params.set(key, JSON.stringify(raw));
                return;
            }
            params.set(key, String(raw));
        });
        return `${getBackendUrl()}?${params.toString()}`;
    }
    async function readJson(response) {
        const text = await response.text();
        if (!text.trim()) {
            throw new Error(`Respuesta vacía (${response.status})`);
        }
        try {
            return JSON.parse(text);
        }
        catch (error) {
            throw new Error(`Respuesta inválida (${response.status}): ${text.slice(0, 180)}`);
        }
    }
    async function requestBackend(action, payload = {}, method = 'POST') {
        const response = method === 'GET'
            ? await fetch(buildGetUrl(action, payload), { method: 'GET' })
            : await fetch(getBackendUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...payload })
            });
        const data = await readJson(response);
        const errorText = typeof data.error === 'string' ? data.error.trim() : '';
        if (errorText)
            throw new Error(errorText);
        if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
            throw new Error(errorText || `La operación ${action} fue rechazada`);
        }
        return data;
    }
    function renderRowsChunked(archivo, append = false) {
        return new Promise((resolve) => {
            if (!append)
                elRows.innerHTML = '';
            let idx = 0;
            function renderChunk() {
                const fragment = document.createDocumentFragment();
                const end = Math.min(idx + RENDER_CHUNK, archivo.length);
                for (; idx < end; idx += 1) {
                    const item = archivo[idx];
                    if (!item)
                        continue;
                    const tr = document.createElement('tr');
                    tr.className = 'border-t border-[#1F7EDC]/20 hover:bg-[#1F7EDC]/10';
                    tr.innerHTML = `
            <td class="px-3 py-3">${badgeTipo(item.TIPO_ARCHIVO)}</td>
            <td class="px-3 py-3 text-[#8A8F95]">${formatDate(item.FECHA_ARCHIVO)}</td>
            <td class="px-3 py-3 font-semibold text-[#1F7EDC]">${escapeHtml(item.FOLIO)}</td>
            <td class="px-3 py-3">${escapeHtml(item.CLIENTE)}</td>
            <td class="px-3 py-3">${escapeHtml(item.TELEFONO)}</td>
            <td class="px-3 py-3 text-[#8A8F95]">${escapeHtml(item.DETALLE)}</td>
            <td class="px-3 py-3 text-right">${formatMoney(item.TOTAL)}</td>
            <td class="px-3 py-3 text-right">
              <button
                type="button"
                class="btn-detalle rounded-lg border border-[#1F7EDC]/30 px-3 py-1.5 text-xs font-semibold text-[#7EC8FF] hover:bg-[#1F7EDC]/15"
                data-folio="${escapeHtml(item.FOLIO)}"
                data-tipo="${escapeHtml(item.TIPO_ARCHIVO || '')}"
              >
                Ver detalle
              </button>
            </td>
          `;
                    fragment.appendChild(tr);
                }
                elRows.appendChild(fragment);
                if (idx < archivo.length) {
                    requestAnimationFrame(renderChunk);
                }
                else {
                    resolve();
                }
            }
            renderChunk();
        });
    }
    async function cargarArchivo({ append = false } = {}) {
        if (isLoading)
            return;
        isLoading = true;
        const { tipo, from, to } = getFiltros();
        if (!append)
            currentPage = 1;
        elLoading.classList.remove('hidden');
        if (!append) {
            elEmpty.classList.add('hidden');
            elRows.innerHTML = '';
        }
        const queryPayload = {
            tipo,
            page: currentPage,
            pageSize: PAGE_SIZE,
            from: from || undefined,
            to: to || undefined
        };
        try {
            let data = null;
            try {
                data = await requestBackend('listar_archivo', queryPayload, 'POST');
            }
            catch {
                data = await requestBackend('listar_archivo', queryPayload, 'GET');
            }
            if (!data) {
                throw new Error('No se obtuvo respuesta del archivo');
            }
            const archivo = Array.isArray(data.archivo) ? data.archivo : [];
            const total = Number(data.total || 0);
            hasMore = !!data.hasMore;
            elCount.textContent = String(total);
            elPageInfo.textContent = `Página ${Number(data.page || currentPage)} · ${archivo.length} por carga`;
            elLoading.classList.add('hidden');
            if (!append && !archivo.length) {
                elEmpty.classList.remove('hidden');
                elBtnMore.classList.add('hidden');
                return;
            }
            await renderRowsChunked(archivo, append);
            elBtnMore.classList.toggle('hidden', !hasMore);
            if (hasMore)
                currentPage += 1;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            elLoading.classList.add('hidden');
            elEmpty.classList.remove('hidden');
            elEmpty.textContent = `No se pudo cargar el archivo: ${message}`;
            elBtnMore.classList.add('hidden');
        }
        finally {
            isLoading = false;
        }
    }
    async function abrirDetalleArchivo(tipo, folio) {
        const tipoNormalizado = String(tipo || '').trim().toLowerCase();
        const folioNormalizado = String(folio || '').trim().toUpperCase();
        if (!tipoNormalizado || !folioNormalizado)
            return;
        elDetalleAviso.textContent = 'Cargando detalle...';
        elDetalleRaw.textContent = '';
        abrirModalDetalle();
        try {
            const data = await requestBackend('detalle_archivo', { tipo: tipoNormalizado, folio: folioNormalizado }, 'GET');
            if (!data || !data.registro) {
                throw new Error('No se obtuvo el detalle del archivo');
            }
            renderDetalleRegistro(data.registro, data.raw || null, !!data.reabrible);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            elDetalleAviso.textContent = `No se pudo cargar el detalle: ${message}`;
            btnDetalleReabrir.classList.add('hidden');
        }
    }
    async function reabrirDetalleActual() {
        if (!detalleActual)
            return;
        const tipo = String(detalleActual.TIPO_ARCHIVO || '').trim().toLowerCase();
        if (!['solicitud', 'cotizacion'].includes(tipo))
            return;
        const guard = window.SRFXSecurityGuard;
        if (!guard || typeof guard.ensureAdminPassword !== 'function') {
            alert('No se pudo validar la clave admin');
            return;
        }
        const auth = await guard.ensureAdminPassword('reabrir una orden archivada');
        if (!auth.ok)
            return;
        try {
            const response = await requestBackend('reabrir_archivo', {
                tipo,
                folio: detalleActual.FOLIO,
                adminPasswordActual: auth.password || ''
            }, 'POST');
            if (response.success === false) {
                throw new Error(response.error || 'No se pudo reabrir');
            }
            cerrarModalDetalle();
            await cargarArchivo({ append: false });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            alert(`Error al reabrir: ${message}`);
        }
    }
    btnRefresh.addEventListener('click', () => void cargarArchivo({ append: false }));
    elFiltroTipo.addEventListener('change', () => void cargarArchivo({ append: false }));
    elFiltroFrom.addEventListener('change', () => void cargarArchivo({ append: false }));
    elFiltroTo.addEventListener('change', () => void cargarArchivo({ append: false }));
    elBtnMore.addEventListener('click', () => {
        if (hasMore) {
            void cargarArchivo({ append: true });
        }
    });
    elRows.addEventListener('click', (event) => {
        const target = event.target;
        const button = target?.closest('.btn-detalle');
        if (!button)
            return;
        const folio = button.getAttribute('data-folio') || '';
        const tipo = button.getAttribute('data-tipo') || '';
        void abrirDetalleArchivo(tipo, folio);
    });
    elDetalleOverlay.addEventListener('click', () => cerrarModalDetalle());
    btnDetalleCerrar.addEventListener('click', () => cerrarModalDetalle());
    btnDetalleCopiar.addEventListener('click', () => {
        const folio = detalleActual?.FOLIO || '';
        if (!folio)
            return;
        navigator.clipboard.writeText(folio).catch(() => {
            window.prompt('Copia manualmente:', folio);
        });
    });
    btnDetalleReabrir.addEventListener('click', () => {
        void reabrirDetalleActual();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !elDetalleModal.classList.contains('hidden')) {
            cerrarModalDetalle();
        }
    });
    void cargarArchivo({ append: false });
})();
