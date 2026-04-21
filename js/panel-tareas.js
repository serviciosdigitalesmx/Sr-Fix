"use strict";
;
(function () {
    const BACKEND_URL = String(CONFIG.API_URL || '').trim();
    const PAGE_SIZE = 24;
    const elGrid = requireElement('grid');
    const elLoading = requireElement('loading');
    const elEmpty = requireElement('empty');
    const elBtnMore = requireElement('btn-more');
    const elModal = requireElement('modal');
    const elForm = requireElement('form-tarea');
    const elResponsables = requireElement('responsables-lista');
    let currentPage = 1;
    let hasMore = false;
    let isLoading = false;
    function requireElement(id) {
        const el = document.getElementById(id);
        if (!el) {
            throw new Error(`Elemento no encontrado: ${id}`);
        }
        return el;
    }
    function getInputValue(id) {
        const el = document.getElementById(id);
        return String(el?.value || '');
    }
    function setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el)
            el.value = value;
    }
    function getSucursalActiva() {
        return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
    }
    function escapeHtml(v) {
        return String(v ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function prioridadBadge(v) {
        const p = String(v ?? '').toLowerCase();
        if (p === 'urgente')
            return 'bg-red-500/20 text-red-300 border-red-500/30';
        if (p === 'alta')
            return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
        if (p === 'media')
            return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
    function estadoBadge(v) {
        const e = String(v ?? '').toLowerCase();
        if (e === 'completada')
            return 'bg-green-500/20 text-green-300 border-green-500/30';
        if (e === 'cancelada')
            return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
        if (e === 'en_proceso')
            return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    }
    function prettyEstado(v) {
        return {
            pendiente: 'Pendiente',
            en_proceso: 'En proceso',
            completada: 'Completada',
            cancelada: 'Cancelada'
        }[String(v ?? '').toLowerCase()] || 'Pendiente';
    }
    function prettyPrioridad(v) {
        return {
            baja: 'Baja',
            media: 'Media',
            alta: 'Alta',
            urgente: 'Urgente'
        }[String(v ?? '').toLowerCase()] || 'Media';
    }
    function prettyTipo(v) {
        return {
            general: 'General',
            equipo: 'Equipo',
            solicitud: 'Solicitud'
        }[String(v ?? '').toLowerCase()] || 'General';
    }
    function getFiltros() {
        return {
            texto: getInputValue('filtro-texto').trim(),
            estado: getInputValue('filtro-estado'),
            prioridad: getInputValue('filtro-prioridad'),
            tipoRelacion: getInputValue('filtro-tipo-relacion'),
            responsable: getInputValue('filtro-responsable').trim(),
            fechaDesde: getInputValue('filtro-desde'),
            fechaHasta: getInputValue('filtro-hasta')
        };
    }
    function setMetricas(metricas = {}) {
        requireElement('kpi-pendientes').textContent = String(metricas.pendientes || 0);
        requireElement('kpi-urgentes').textContent = String(metricas.urgentes || 0);
        requireElement('kpi-completadas').textContent = String(metricas.completadas || 0);
    }
    function renderResponsables(lista = []) {
        elResponsables.innerHTML = '';
        lista.forEach((nombre) => {
            const option = document.createElement('option');
            option.value = nombre;
            elResponsables.appendChild(option);
        });
    }
    function getBackendUrl() {
        return BACKEND_URL;
    }
    function buildGetUrl(action, payload) {
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
        catch {
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
    function renderCards(tareas, append = false) {
        if (!append)
            elGrid.innerHTML = '';
        const frag = document.createDocumentFragment();
        tareas.forEach((tarea) => {
            const card = document.createElement('article');
            card.className = 'bg-[#2B2B2B] border border-[#1F7EDC]/25 rounded-2xl p-4 shadow-lg';
            card.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-xs text-[#8A8F95]">${escapeHtml(tarea.FOLIO_TAREA || '---')}</div>
            <h3 class="text-lg font-semibold text-white mt-1">${escapeHtml(tarea.TITULO || 'Sin título')}</h3>
          </div>
          <button data-edit="${escapeHtml(tarea.FOLIO_TAREA || '')}" class="shrink-0 px-2 py-1 rounded-lg border border-[#1F7EDC]/30 hover:bg-[#1F7EDC]/20 text-xs">
            <i class="fa-solid fa-pen"></i>
          </button>
        </div>
        <div class="flex flex-wrap gap-2 mt-3">
          <span class="px-2 py-1 rounded-full border text-xs ${estadoBadge(tarea.ESTADO)}">${prettyEstado(tarea.ESTADO)}</span>
          <span class="px-2 py-1 rounded-full border text-xs ${prioridadBadge(tarea.PRIORIDAD)}">${prettyPrioridad(tarea.PRIORIDAD)}</span>
          <span class="px-2 py-1 rounded-full border border-[#1F7EDC]/30 bg-[#1F7EDC]/10 text-[#9dcfff] text-xs">${prettyTipo(tarea.TIPO_RELACION)}</span>
        </div>
        <p class="text-sm text-[#d2d8df] mt-3 whitespace-pre-line min-h-[44px]">${escapeHtml(tarea.DESCRIPCION || 'Sin descripción')}</p>
        <div class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between gap-3">
            <span class="text-[#8A8F95]">Responsable</span>
            <span class="text-right">${escapeHtml(tarea.RESPONSABLE || '---')}</span>
          </div>
          <div class="flex justify-between gap-3">
            <span class="text-[#8A8F95]">Fecha límite</span>
            <span class="text-right">${escapeHtml(tarea.FECHA_LIMITE || '---')}</span>
          </div>
          <div class="flex justify-between gap-3">
            <span class="text-[#8A8F95]">Folio relacionado</span>
            <span class="text-right">${escapeHtml(tarea.FOLIO_RELACIONADO || '---')}</span>
          </div>
        </div>
      `;
            frag.appendChild(card);
        });
        elGrid.appendChild(frag);
    }
    async function cargarTareas({ append = false } = {}) {
        if (isLoading)
            return;
        isLoading = true;
        if (!append)
            currentPage = 1;
        elLoading.classList.remove('hidden');
        if (!append) {
            elEmpty.classList.add('hidden');
            elGrid.innerHTML = '';
        }
        const filtros = getFiltros();
        const payload = {
            sucursalId: getSucursalActiva(),
            page: currentPage,
            pageSize: PAGE_SIZE,
            ...filtros
        };
        try {
            let data = null;
            try {
                data = await requestBackend('listar_tareas', payload, 'POST');
            }
            catch {
                data = await requestBackend('listar_tareas', payload, 'GET');
            }
            if (!data) {
                throw new Error('No se obtuvo respuesta de tareas');
            }
            const tareas = Array.isArray(data.tareas) ? data.tareas : [];
            hasMore = !!data.hasMore;
            setMetricas(data.metricas || {});
            renderResponsables(Array.isArray(data.responsables) ? data.responsables : []);
            elLoading.classList.add('hidden');
            if (!append && !tareas.length) {
                elEmpty.classList.remove('hidden');
                elBtnMore.classList.add('hidden');
                return;
            }
            renderCards(tareas, append);
            elBtnMore.classList.toggle('hidden', !hasMore);
            if (hasMore)
                currentPage += 1;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            elLoading.classList.add('hidden');
            elEmpty.classList.remove('hidden');
            elEmpty.textContent = `No se pudieron cargar las tareas: ${message}`;
            elBtnMore.classList.add('hidden');
        }
        finally {
            isLoading = false;
        }
    }
    function abrirModalNueva() {
        requireElement('modal-title').textContent = 'Nueva tarea';
        elForm.reset();
        setInputValue('tarea-folio', '');
        setInputValue('tarea-estado', 'pendiente');
        setInputValue('tarea-prioridad', 'media');
        setInputValue('tarea-tipo-relacion', 'general');
        elModal.classList.remove('hidden');
    }
    function cerrarModal() {
        elModal.classList.add('hidden');
    }
    async function abrirEdicion(folio) {
        try {
            const q = new URLSearchParams({ action: 'tarea', folio, sucursalId: getSucursalActiva(), t: String(Date.now()) });
            const res = await fetch(`${getBackendUrl()}?${q.toString()}`);
            const data = await readJson(res);
            if (data.error || !data.tarea)
                throw new Error(String(data.error || 'No se encontró la tarea'));
            const tarea = data.tarea;
            requireElement('modal-title').textContent = `Editar ${tarea.FOLIO_TAREA}`;
            setInputValue('tarea-folio', tarea.FOLIO_TAREA || '');
            setInputValue('tarea-titulo', tarea.TITULO || '');
            setInputValue('tarea-descripcion', tarea.DESCRIPCION || '');
            setInputValue('tarea-estado', tarea.ESTADO || 'pendiente');
            setInputValue('tarea-prioridad', tarea.PRIORIDAD || 'media');
            setInputValue('tarea-responsable', tarea.RESPONSABLE || '');
            setInputValue('tarea-fecha-limite', tarea.FECHA_LIMITE || '');
            setInputValue('tarea-tipo-relacion', tarea.TIPO_RELACION || 'general');
            setInputValue('tarea-folio-relacionado', tarea.FOLIO_RELACIONADO || '');
            setInputValue('tarea-notas', tarea.NOTAS || '');
            elModal.classList.remove('hidden');
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo abrir la tarea');
        }
    }
    async function guardarTarea(ev) {
        ev.preventDefault();
        const folio = getInputValue('tarea-folio').trim();
        const payload = {
            folio,
            sucursalId: getSucursalActiva(),
            titulo: getInputValue('tarea-titulo').trim(),
            descripcion: getInputValue('tarea-descripcion').trim(),
            estado: getInputValue('tarea-estado').trim() || 'pendiente',
            prioridad: getInputValue('tarea-prioridad').trim() || 'media',
            responsable: getInputValue('tarea-responsable').trim(),
            fechaLimite: getInputValue('tarea-fecha-limite').trim(),
            tipoRelacion: getInputValue('tarea-tipo-relacion').trim() || 'general',
            folioRelacionado: getInputValue('tarea-folio-relacionado').trim(),
            notas: getInputValue('tarea-notas').trim()
        };
        try {
            const action = folio ? 'actualizar_tarea' : 'crear_tarea';
            const response = await requestBackend(action, payload, 'POST');
            if (response.error)
                throw new Error(response.error);
            cerrarModal();
            await cargarTareas({ append: false });
        }
        catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo guardar la tarea');
        }
    }
    function bindEvents() {
        requireElement('btn-refresh').addEventListener('click', () => void cargarTareas({ append: false }));
        requireElement('btn-nueva').addEventListener('click', abrirModalNueva);
        requireElement('btn-cerrar-modal').addEventListener('click', cerrarModal);
        requireElement('btn-cancelar').addEventListener('click', cerrarModal);
        requireElement('btn-limpiar').addEventListener('click', () => {
            setInputValue('filtro-texto', '');
            setInputValue('filtro-estado', '');
            setInputValue('filtro-prioridad', '');
            setInputValue('filtro-tipo-relacion', '');
            setInputValue('filtro-responsable', '');
            setInputValue('filtro-desde', '');
            setInputValue('filtro-hasta', '');
            void cargarTareas({ append: false });
        });
        ['filtro-texto', 'filtro-estado', 'filtro-prioridad', 'filtro-tipo-relacion', 'filtro-responsable', 'filtro-desde', 'filtro-hasta']
            .forEach((id) => {
            const el = document.getElementById(id);
            if (!el)
                return;
            el.addEventListener(id === 'filtro-texto' || id === 'filtro-responsable' ? 'input' : 'change', () => {
                void cargarTareas({ append: false });
            });
        });
        elBtnMore.addEventListener('click', () => {
            if (hasMore)
                void cargarTareas({ append: true });
        });
        elGrid.addEventListener('click', (event) => {
            const target = event.target;
            const btn = target?.closest('[data-edit]');
            if (!btn)
                return;
            void abrirEdicion(String(btn.getAttribute('data-edit') || ''));
        });
        elForm.addEventListener('submit', (ev) => void guardarTarea(ev));
        elModal.addEventListener('click', (event) => {
            if (event.target === elModal)
                cerrarModal();
        });
    }
    bindEvents();
    void cargarTareas({ append: false });
})();
