;(function (): void {
  type ProveedoresRequestMethod = 'GET' | 'POST';

  interface ProveedoresBackendEnvelope {
    success?: boolean;
    error?: unknown;
  }

  type ProveedorRecord = SrFix.ProveedorRecord;
  type ProveedoresListResponse = SrFix.ProveedoresListResponse;
  type ProveedorDetailResponse = SrFix.ProveedorDetailResponse;

  const BACKEND_URL = String(CONFIG.API_URL || '').trim();
  const PAGE_SIZE = 80;

  const elRows = requireElement<HTMLTableSectionElement>('rows');
  const elLoading = requireElement<HTMLDivElement>('loading');
  const elEmpty = requireElement<HTMLDivElement>('empty');
  const elBtnMore = requireElement<HTMLButtonElement>('btn-more');

  let currentPage = 1;
  let hasMore = false;
  let isLoading = false;
  let proveedoresCache: ProveedorRecord[] = [];

  const filtroTexto = requireElement<HTMLInputElement>('filtro-texto');
  const filtroEstatus = requireElement<HTMLSelectElement>('filtro-estatus');
  const filtroCategoria = requireElement<HTMLSelectElement>('filtro-categoria');

  function requireElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Elemento no encontrado: ${id}`);
    }
    return el as T;
  }

  function escapeHtml(v: unknown): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function stars(n: unknown): string {
    const val = Math.max(0, Math.min(5, Number(n ?? 0)));
    return '★'.repeat(Math.round(val)) + '☆'.repeat(5 - Math.round(val));
  }

  function statusBadge(v: unknown): string {
    return String(v ?? '').toLowerCase() === 'activo'
      ? '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Activo</span>'
      : '<span class="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">Inactivo</span>';
  }

  function getFiltros(): { texto: string; estatus: string; categoria: string } {
    return {
      texto: filtroTexto.value.trim(),
      estatus: filtroEstatus.value,
      categoria: filtroCategoria.value
    };
  }

  function setKpis(items: ProveedorRecord[], categorias: string[] = []): void {
    requireElement<HTMLSpanElement>('kpi-total').textContent = String(items.length);
    requireElement<HTMLSpanElement>('kpi-activos').textContent = String(items.filter((x) => String(x.ESTATUS || '').toLowerCase() === 'activo').length);
    requireElement<HTMLSpanElement>('kpi-categorias').textContent = String(categorias.length);
  }

  function fillCategorias(categorias: string[] = []): void {
    const current = filtroCategoria.value;
    filtroCategoria.innerHTML = '<option value="">Todas las categorías</option>';
    categorias.forEach((cat) => {
      filtroCategoria.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`);
    });
    filtroCategoria.value = current;
  }

  function getBackendUrl(): string {
    return BACKEND_URL;
  }

  function buildGetUrl(action: string, payload: Record<string, unknown>): string {
    const q = new URLSearchParams();
    q.set('action', action);
    q.set('t', String(Date.now()));
    Object.entries(payload).forEach(([key, raw]) => {
      if (raw === undefined || raw === null || raw === '') return;
      if (typeof raw === 'object') {
        q.set(key, JSON.stringify(raw));
        return;
      }
      q.set(key, String(raw));
    });
    return `${getBackendUrl()}?${q.toString()}`;
  }

  async function readJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text.trim()) throw new Error(`Respuesta vacía (${response.status})`);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Respuesta inválida (${response.status}): ${text.slice(0, 180)}`);
    }
  }

  function canRetryAsGet(action: string): boolean {
    const normalized = String(action || '').trim().toLowerCase();
    return !/^(guardar_|registrar_|eliminar_|archivar_|transferir_|recibir_|cambiar_|login_|validar_|crear_|reabrir_)/.test(normalized);
  }

  async function requestBackend<T>(
    action: string,
    payload: Record<string, unknown> = {},
    method: ProveedoresRequestMethod = 'POST',
  ): Promise<T> {
    const requestGet = (): Promise<Response> => fetch(buildGetUrl(action, payload), { method: 'GET' });
    const requestPost = (): Promise<Response> => fetch(getBackendUrl(), {
      method: 'POST',
      body: JSON.stringify({ action, ...payload })
    });

    try {
      const response = method === 'GET' ? await requestGet() : await requestPost();
      const data = await readJson<T & ProveedoresBackendEnvelope>(response);
      const errorText = typeof data.error === 'string' ? data.error.trim() : '';
      if (errorText) throw new Error(errorText);
      if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
        throw new Error(errorText || `La operación ${action} fue rechazada`);
      }
      return data as T;
    } catch (error) {
      if (method !== 'POST' || !canRetryAsGet(action)) throw error;
      const response = await requestGet();
      const data = await readJson<T & ProveedoresBackendEnvelope>(response);
      const errorText = typeof data.error === 'string' ? data.error.trim() : '';
      if (errorText) throw new Error(errorText);
      if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
        throw new Error(errorText || `La operación ${action} fue rechazada`);
      }
      return data as T;
    }
  }

  function renderRows(items: ProveedorRecord[], append = false): void {
    if (!append) elRows.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach((prov) => {
      const tr = document.createElement('tr');
      tr.className = 'border-t border-[#1F7EDC]/20 hover:bg-[#1F7EDC]/10';
      tr.innerHTML = `
        <td class="px-3 py-3">
          <div class="font-semibold text-[#1F7EDC]">${escapeHtml(prov.NOMBRE_COMERCIAL)}</div>
          <div class="text-xs text-[#8A8F95]">${escapeHtml(prov.RAZON_SOCIAL || '---')}</div>
        </td>
        <td class="px-3 py-3">
          <div>${escapeHtml(prov.CONTACTO || '---')}</div>
          <div class="text-xs text-[#8A8F95]">${escapeHtml(prov.EMAIL || prov.TELEFONO || '---')}</div>
        </td>
        <td class="px-3 py-3">${escapeHtml(prov.CATEGORIAS || '---')}</td>
        <td class="px-3 py-3">${escapeHtml(prov.TIEMPO_ENTREGA || '---')}</td>
        <td class="px-3 py-3">${escapeHtml(prov.CONDICIONES_PAGO || '---')}</td>
        <td class="px-3 py-3">${statusBadge(prov.ESTATUS)}</td>
        <td class="px-3 py-3 text-yellow-300">${stars(prov.CALIFICACION_PROMEDIO)}</td>
        <td class="px-3 py-3">
          <div class="flex flex-wrap gap-2">
            <button data-view="${escapeHtml(prov.ID || '')}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-eye"></i></button>
            <button data-edit="${escapeHtml(prov.ID || '')}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-pen"></i></button>
            <button data-del="${escapeHtml(prov.ID || '')}" class="px-2 py-1 rounded border border-red-500/40 text-xs hover:bg-red-500/20"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      frag.appendChild(tr);
    });
    elRows.appendChild(frag);
  }

  async function cargarProveedores({ append = false } = {}): Promise<void> {
    if (isLoading) return;
    isLoading = true;
    if (!append) currentPage = 1;
    elLoading.classList.remove('hidden');
    if (!append) {
      elRows.innerHTML = '';
      elEmpty.classList.add('hidden');
    }
    const payload = { page: currentPage, pageSize: PAGE_SIZE, ...getFiltros() };
    try {
      const data = await requestBackend<ProveedoresListResponse>('listar_proveedores', payload, 'POST');
      const items = Array.isArray(data.proveedores) ? data.proveedores : [];
      if (!append) proveedoresCache = items.slice();
      else proveedoresCache = proveedoresCache.concat(items);
      hasMore = !!data.hasMore;
      fillCategorias((data.filtros && data.filtros.categorias) || []);
      setKpis(proveedoresCache, (data.filtros && data.filtros.categorias) || []);
      renderRows(items, append);
      if (!proveedoresCache.length) elEmpty.classList.remove('hidden');
      elBtnMore.classList.toggle('hidden', !hasMore);
      if (hasMore) currentPage += 1;
      elLoading.classList.add('hidden');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      elLoading.classList.add('hidden');
      elEmpty.classList.remove('hidden');
      elEmpty.textContent = `No se pudieron cargar los proveedores: ${message}`;
    } finally {
      isLoading = false;
    }
  }

  function abrirModal(prov: ProveedorRecord | null = null): void {
    requireElement<HTMLFormElement>('form-proveedor').reset();
    requireElement<HTMLInputElement>('proveedor-id').value = prov?.ID || '';
    requireElement<HTMLElement>('proveedor-title').textContent = prov ? `Editar ${prov.NOMBRE_COMERCIAL}` : 'Nuevo proveedor';
    requireElement<HTMLInputElement>('prov-nombre').value = prov?.NOMBRE_COMERCIAL || '';
    requireElement<HTMLInputElement>('prov-razon').value = prov?.RAZON_SOCIAL || '';
    requireElement<HTMLInputElement>('prov-contacto').value = prov?.CONTACTO || '';
    requireElement<HTMLInputElement>('prov-telefono').value = prov?.TELEFONO || '';
    requireElement<HTMLInputElement>('prov-whatsapp').value = prov?.WHATSAPP || '';
    requireElement<HTMLInputElement>('prov-email').value = prov?.EMAIL || '';
    requireElement<HTMLInputElement>('prov-direccion').value = prov?.DIRECCION || '';
    requireElement<HTMLInputElement>('prov-ciudad').value = prov?.CIUDAD_ESTADO || '';
    requireElement<HTMLInputElement>('prov-categorias').value = prov?.CATEGORIAS || '';
    requireElement<HTMLInputElement>('prov-entrega').value = prov?.TIEMPO_ENTREGA || '';
    requireElement<HTMLInputElement>('prov-pago').value = prov?.CONDICIONES_PAGO || '';
    requireElement<HTMLSelectElement>('prov-cal-precio').value = String(prov?.CALIFICACION_PRECIO || 0);
    requireElement<HTMLSelectElement>('prov-cal-rapidez').value = String(prov?.CALIFICACION_RAPIDEZ || 0);
    requireElement<HTMLSelectElement>('prov-cal-calidad').value = String(prov?.CALIFICACION_CALIDAD || 0);
    requireElement<HTMLSelectElement>('prov-cal-conf').value = String(prov?.CALIFICACION_CONFIABILIDAD || 0);
    requireElement<HTMLSelectElement>('prov-estatus').value = prov?.ESTATUS || 'activo';
    requireElement<HTMLTextAreaElement>('prov-notas').value = prov?.NOTAS || '';
    requireElement<HTMLDivElement>('modal-proveedor').classList.remove('hidden');
  }

  function cerrarModal(): void {
    requireElement<HTMLDivElement>('modal-proveedor').classList.add('hidden');
  }

  async function guardarProveedor(ev: SubmitEvent): Promise<void> {
    ev.preventDefault();
    const payload = {
      id: requireElement<HTMLInputElement>('proveedor-id').value,
      nombreComercial: requireElement<HTMLInputElement>('prov-nombre').value.trim(),
      razonSocial: requireElement<HTMLInputElement>('prov-razon').value.trim(),
      contacto: requireElement<HTMLInputElement>('prov-contacto').value.trim(),
      telefono: requireElement<HTMLInputElement>('prov-telefono').value.trim(),
      whatsapp: requireElement<HTMLInputElement>('prov-whatsapp').value.trim(),
      email: requireElement<HTMLInputElement>('prov-email').value.trim(),
      direccion: requireElement<HTMLInputElement>('prov-direccion').value.trim(),
      ciudadEstado: requireElement<HTMLInputElement>('prov-ciudad').value.trim(),
      categorias: requireElement<HTMLInputElement>('prov-categorias').value.trim(),
      tiempoEntrega: requireElement<HTMLInputElement>('prov-entrega').value.trim(),
      condicionesPago: requireElement<HTMLInputElement>('prov-pago').value.trim(),
      calificacionPrecio: requireElement<HTMLSelectElement>('prov-cal-precio').value,
      calificacionRapidez: requireElement<HTMLSelectElement>('prov-cal-rapidez').value,
      calificacionCalidad: requireElement<HTMLSelectElement>('prov-cal-calidad').value,
      calificacionConfiabilidad: requireElement<HTMLSelectElement>('prov-cal-conf').value,
      notas: requireElement<HTMLTextAreaElement>('prov-notas').value.trim(),
      estatus: requireElement<HTMLSelectElement>('prov-estatus').value
    };
    try {
      await requestBackend('guardar_proveedor', payload, 'POST');
      cerrarModal();
      await cargarProveedores({ append: false });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo guardar el proveedor');
    }
  }

  async function verDetalle(id: string): Promise<void> {
    try {
      const data = await requestBackend<ProveedorDetailResponse>('proveedor', { id }, 'POST');
      const prov = data.proveedor;
      if (!prov) throw new Error(data.error || 'No se pudo cargar el detalle');
      requireElement<HTMLElement>('detalle-title').textContent = prov.NOMBRE_COMERCIAL || 'Proveedor';
      requireElement<HTMLElement>('detalle-body').innerHTML = `
        <div><span class="text-[#8A8F95]">Razón social:</span> ${escapeHtml(prov.RAZON_SOCIAL || '---')}</div>
        <div><span class="text-[#8A8F95]">Contacto:</span> ${escapeHtml(prov.CONTACTO || '---')}</div>
        <div><span class="text-[#8A8F95]">Teléfono:</span> ${escapeHtml(prov.TELEFONO || '---')}</div>
        <div><span class="text-[#8A8F95]">WhatsApp:</span> ${escapeHtml(prov.WHATSAPP || '---')}</div>
        <div><span class="text-[#8A8F95]">Email:</span> ${escapeHtml(prov.EMAIL || '---')}</div>
        <div><span class="text-[#8A8F95]">Dirección:</span> ${escapeHtml(prov.DIRECCION || '---')}</div>
        <div><span class="text-[#8A8F95]">Ciudad/Estado:</span> ${escapeHtml(prov.CIUDAD_ESTADO || '---')}</div>
        <div><span class="text-[#8A8F95]">Categorías:</span> ${escapeHtml(prov.CATEGORIAS || '---')}</div>
        <div><span class="text-[#8A8F95]">Entrega:</span> ${escapeHtml(prov.TIEMPO_ENTREGA || '---')}</div>
        <div><span class="text-[#8A8F95]">Pago:</span> ${escapeHtml(prov.CONDICIONES_PAGO || '---')}</div>
        <div><span class="text-[#8A8F95]">Calificación:</span> ${stars(prov.CALIFICACION_PROMEDIO)} (${prov.CALIFICACION_PROMEDIO || 0})</div>
        <div><span class="text-[#8A8F95]">Notas:</span><div class="mt-1 whitespace-pre-line">${escapeHtml(prov.NOTAS || '---')}</div></div>
      `;
      requireElement<HTMLDivElement>('modal-detalle').classList.remove('hidden');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo cargar el detalle');
    }
  }

  function cerrarDetalle(): void {
    requireElement<HTMLDivElement>('modal-detalle').classList.add('hidden');
  }

  async function eliminarProveedor(id: string): Promise<void> {
    if (!confirm('¿Marcar proveedor como inactivo?')) return;
    try {
      await requestBackend('eliminar_proveedor', { id }, 'POST');
      await cargarProveedores({ append: false });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo eliminar');
    }
  }

  function bindEvents(): void {
    requireElement<HTMLButtonElement>('btn-refresh').addEventListener('click', () => void cargarProveedores({ append: false }));
    requireElement<HTMLButtonElement>('btn-nuevo').addEventListener('click', () => abrirModal());
    requireElement<HTMLFormElement>('form-proveedor').addEventListener('submit', (ev) => void guardarProveedor(ev as SubmitEvent));
    document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', cerrarModal));
    document.querySelectorAll('[data-close-detalle]').forEach((btn) => btn.addEventListener('click', cerrarDetalle));
    elBtnMore.addEventListener('click', () => { if (hasMore) void cargarProveedores({ append: true }); });

    ['filtro-texto', 'filtro-estatus', 'filtro-categoria'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(id === 'filtro-texto' ? 'input' : 'change', () => void cargarProveedores({ append: false }));
    });

    elRows.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      const view = target?.closest('[data-view]') as HTMLElement | null;
      const edit = target?.closest('[data-edit]') as HTMLElement | null;
      const del = target?.closest('[data-del]') as HTMLElement | null;
      if (view) void verDetalle(String(view.getAttribute('data-view') || ''));
      if (edit) {
        const prov = proveedoresCache.find((item) => String(item.ID) === String(edit.getAttribute('data-edit')));
        if (prov) abrirModal(prov);
      }
      if (del) void eliminarProveedor(String(del.getAttribute('data-del') || ''));
    });

    requireElement<HTMLDivElement>('modal-detalle').addEventListener('click', (event) => {
      if ((event.target as HTMLElement | null)?.id === 'modal-detalle') cerrarDetalle();
    });

    requireElement<HTMLDivElement>('modal-proveedor').addEventListener('click', (event) => {
      if ((event.target as HTMLElement | null)?.id === 'modal-proveedor') cerrarModal();
    });
  }

  bindEvents();
  void cargarProveedores({ append: false });
})();
