;(function (): void {
  type GastosRequestMethod = 'GET' | 'POST';

  interface GastosBackendEnvelope {
    success?: boolean;
    error?: unknown;
  }

  type GastoRecord = SrFix.GastoRecord;
  type GastosListResponse = SrFix.GastosListResponse;
  type GastosResumenResponse = SrFix.GastosResumenResponse;
  type GastoGuardadoResponse = SrFix.GastoGuardadoResponse;

  interface GastoProveedorNombre {
    nombre: string;
  }

  interface GastoFolioRelacion {
    folio: string;
  }

  const BACKEND_URL = String(CONFIG.API_URL || '').trim();
  const PAGE_SIZE = 100;

  const elRows = requireElement<HTMLTableSectionElement>('rows');
  const elLoading = requireElement<HTMLDivElement>('loading');
  const elEmpty = requireElement<HTMLDivElement>('empty');
  const elBtnMore = requireElement<HTMLButtonElement>('btn-more');

  let currentPage = 1;
  let hasMore = false;
  let isLoading = false;
  let gastosCache: GastoRecord[] = [];
  let proveedoresCache: GastoProveedorNombre[] = [];
  let foliosRelacionCache: GastoFolioRelacion[] = [];

  const elFiltroDesde = requireElement<HTMLInputElement>('filtro-desde');
  const elFiltroHasta = requireElement<HTMLInputElement>('filtro-hasta');
  const elFiltroTipo = requireElement<HTMLSelectElement>('filtro-tipo');
  const elFiltroCategoria = requireElement<HTMLSelectElement>('filtro-categoria');
  const elFiltroTexto = requireElement<HTMLInputElement>('filtro-texto');
  const elResumenMensual = requireElement<HTMLDivElement>('resumen-mensual');
  const elFormGasto = requireElement<HTMLFormElement>('form-gasto');
  const elModalGasto = requireElement<HTMLDivElement>('modal-gasto');
  const elBtnRefresh = requireElement<HTMLButtonElement>('btn-refresh');
  const elBtnNuevo = requireElement<HTMLButtonElement>('btn-nuevo');

  function requireElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Elemento no encontrado: ${id}`);
    return el as T;
  }

  function getInputValue(id: string): string {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    return String(el?.value || '');
  }

  function setInputValue(id: string, value: string): void {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (el) el.value = value;
  }

  function escapeHtml(v: unknown): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(v: unknown): string {
    return `$${Number(v ?? 0).toFixed(2)}`;
  }

  function getSucursalActiva(): string {
    return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
  }

  function getFiltros(): { fechaDesde: string; fechaHasta: string; tipo: string; categoria: string; texto: string } {
    return {
      fechaDesde: elFiltroDesde.value,
      fechaHasta: elFiltroHasta.value,
      tipo: elFiltroTipo.value,
      categoria: elFiltroCategoria.value,
      texto: elFiltroTexto.value.trim()
    };
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
    return `${BACKEND_URL}?${q.toString()}`;
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

  async function requestBackend<T>(
    action: string,
    payload: Record<string, unknown> = {},
    method: GastosRequestMethod = 'POST',
  ): Promise<T> {
    const response = method === 'GET'
      ? await fetch(buildGetUrl(action, payload), { method: 'GET' })
      : await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...payload })
        });
    const data = await readJson<T & GastosBackendEnvelope>(response);
    const errorText = typeof data.error === 'string' ? data.error.trim() : '';
    if (errorText) throw new Error(errorText);
    if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
      throw new Error(errorText || `La operación ${action} fue rechazada`);
    }
    return data as T;
  }

  function badgeTipo(v: unknown): string {
    return String(v ?? '').toLowerCase() === 'fijo'
      ? '<span class="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">Fijo</span>'
      : '<span class="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-300">Variable</span>';
  }

  function setKpis(items: GastoRecord[]): void {
    const total = items.reduce((acc, x) => acc + Number(x.MONTO || 0), 0);
    const fijos = items.filter((x) => String(x.TIPO || '').toLowerCase() === 'fijo').reduce((acc, x) => acc + Number(x.MONTO || 0), 0);
    const variables = items.filter((x) => String(x.TIPO || '').toLowerCase() === 'variable').reduce((acc, x) => acc + Number(x.MONTO || 0), 0);
    requireElement<HTMLDivElement>('kpi-total').textContent = money(total);
    requireElement<HTMLDivElement>('kpi-fijos').textContent = money(fijos);
    requireElement<HTMLDivElement>('kpi-variables').textContent = money(variables);
  }

  function fillAuxiliares(): void {
    const provList = requireElement<HTMLDataListElement>('proveedores-lista');
    provList.innerHTML = '';
    proveedoresCache.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.nombre;
      provList.appendChild(opt);
    });
    const folioList = requireElement<HTMLDataListElement>('folios-relacion-lista');
    folioList.innerHTML = '';
    foliosRelacionCache.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.folio;
      folioList.appendChild(opt);
    });
  }

  function renderRows(items: GastoRecord[], append = false): void {
    if (!append) elRows.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach((gasto) => {
      const tr = document.createElement('tr');
      tr.className = 'border-t border-[#1F7EDC]/20 hover:bg-[#1F7EDC]/10';
      tr.innerHTML = `
        <td class="px-3 py-3">${escapeHtml(gasto.FECHA)}</td>
        <td class="px-3 py-3">${badgeTipo(gasto.TIPO)}</td>
        <td class="px-3 py-3">${escapeHtml(gasto.CATEGORIA || '---')}</td>
        <td class="px-3 py-3">
          <div class="font-semibold">${escapeHtml(gasto.CONCEPTO)}</div>
          <div class="text-xs text-[#8A8F95]">${escapeHtml(gasto.DESCRIPCION || '---')}</div>
        </td>
        <td class="px-3 py-3">${escapeHtml(gasto.PROVEEDOR || '---')}</td>
        <td class="px-3 py-3">${escapeHtml(gasto.FOLIO_RELACIONADO || '---')}</td>
        <td class="px-3 py-3">${escapeHtml(gasto.METODO_PAGO || '---')}</td>
        <td class="px-3 py-3 text-right font-semibold text-[#FF6A2A]">${money(gasto.MONTO)}</td>
        <td class="px-3 py-3">
          <div class="flex gap-2">
            <button data-edit="${escapeHtml(gasto.ID || '')}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-pen"></i></button>
            <button data-del="${escapeHtml(gasto.ID || '')}" class="px-2 py-1 rounded border border-red-500/40 text-xs hover:bg-red-500/20"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      frag.appendChild(tr);
    });
    elRows.appendChild(frag);
  }

  function renderResumen(data: GastosResumenResponse): void {
    const rows = Array.isArray(data.resumenMensual) ? data.resumenMensual : [];
    if (!rows.length) {
      elResumenMensual.innerHTML = '<div class="text-[#8A8F95]">Sin datos para el periodo seleccionado.</div>';
      return;
    }
    elResumenMensual.innerHTML = rows.map((item) => {
      const categorias = Object.entries(item.categorias || {})
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .map(([cat, total]) => `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#161616] border border-[#1F7EDC]/20 text-xs">${escapeHtml(cat)}: ${money(total)}</span>`)
        .join(' ');
      return `
        <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div class="font-semibold text-[#1F7EDC]">${escapeHtml(item.mes)}</div>
            <div class="font-semibold text-[#FF6A2A]">${money(item.total)}</div>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">${categorias}</div>
        </div>
      `;
    }).join('');
  }

  async function cargarAuxiliares(): Promise<void> {
    try {
      const [proveedoresData, foliosData] = await Promise.all([
        requestBackend<{ proveedores?: GastoProveedorNombre[] }>('listar_nombres_proveedores', {}, 'POST'),
        requestBackend<{ folios?: GastoFolioRelacion[] }>('listar_folios_relacion', {}, 'POST')
      ]);
      proveedoresCache = Array.isArray(proveedoresData.proveedores) ? proveedoresData.proveedores : [];
      foliosRelacionCache = Array.isArray(foliosData.folios) ? foliosData.folios : [];
      fillAuxiliares();
    } catch {
      // No bloquea el módulo si fallan catálogos auxiliares.
    }
  }

  async function cargarResumen(): Promise<void> {
    try {
      const data = await requestBackend<GastosResumenResponse>('resumen_gastos', { sucursalId: getSucursalActiva(), ...getFiltros() }, 'POST');
      renderResumen(data);
    } catch (error) {
      elResumenMensual.innerHTML = `<div class="text-red-300">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
    }
  }

  async function cargarGastos({ append = false } = {}): Promise<void> {
    if (isLoading) return;
    isLoading = true;
    if (!append) currentPage = 1;
    elLoading.classList.remove('hidden');
    if (!append) {
      elRows.innerHTML = '';
      elEmpty.classList.add('hidden');
    }
    try {
      const data = await requestBackend<GastosListResponse>('listar_gastos', { sucursalId: getSucursalActiva(), page: currentPage, pageSize: PAGE_SIZE, ...getFiltros() }, 'POST');
      const items = Array.isArray(data.gastos) ? data.gastos : [];
      if (!append) gastosCache = items.slice();
      else gastosCache = gastosCache.concat(items);
      hasMore = !!data.hasMore;
      setKpis(gastosCache);
      renderRows(items, append);
      if (!gastosCache.length) elEmpty.classList.remove('hidden');
      elBtnMore.classList.toggle('hidden', !hasMore);
      if (hasMore) currentPage += 1;
      await cargarResumen();
    } catch (error) {
      elEmpty.classList.remove('hidden');
      elEmpty.textContent = `No se pudieron cargar los gastos: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      elLoading.classList.add('hidden');
      isLoading = false;
    }
  }

  function abrirModal(gasto: Partial<GastoRecord> | null = null): void {
    elFormGasto.reset();
    setInputValue('gasto-id', String(gasto?.ID || ''));
    requireElement<HTMLElement>('gasto-title').textContent = gasto ? `Editar gasto #${gasto.ID}` : 'Nuevo gasto';
    setInputValue('gasto-fecha', String(gasto?.FECHA || new Date().toISOString().slice(0, 10)));
    setInputValue('gasto-tipo', String(gasto?.TIPO || 'fijo'));
    setInputValue('gasto-categoria', String(gasto?.CATEGORIA || 'renta'));
    setInputValue('gasto-concepto', String(gasto?.CONCEPTO || ''));
    setInputValue('gasto-descripcion', String(gasto?.DESCRIPCION || ''));
    setInputValue('gasto-monto', String(Number(gasto?.MONTO || 0)));
    setInputValue('gasto-metodo', String(gasto?.METODO_PAGO || ''));
    setInputValue('gasto-proveedor', String(gasto?.PROVEEDOR || ''));
    setInputValue('gasto-folio', String(gasto?.FOLIO_RELACIONADO || ''));
    setInputValue('gasto-comprobante', String(gasto?.COMPROBANTE_URL || ''));
    setInputValue('gasto-notas', String(gasto?.NOTAS || ''));
    elModalGasto.classList.remove('hidden');
  }

  function cerrarModal(): void {
    elModalGasto.classList.add('hidden');
  }

  async function guardarGasto(ev: SubmitEvent): Promise<void> {
    ev.preventDefault();
    const guard = window.SRFXSecurityGuard;
    if (!guard || typeof guard.ensureAdminPassword !== 'function') {
      alert('No se pudo validar la clave admin');
      return;
    }
    const auth = await guard.ensureAdminPassword('guardar un gasto');
    if (!auth.ok) return;

    const payload = {
      sucursalId: getSucursalActiva(),
      id: getInputValue('gasto-id').trim(),
      fecha: getInputValue('gasto-fecha'),
      tipo: getInputValue('gasto-tipo'),
      categoria: getInputValue('gasto-categoria'),
      concepto: getInputValue('gasto-concepto').trim(),
      descripcion: getInputValue('gasto-descripcion').trim(),
      monto: Number(getInputValue('gasto-monto') || 0),
      metodoPago: getInputValue('gasto-metodo').trim(),
      proveedor: getInputValue('gasto-proveedor').trim(),
      folioRelacionado: getInputValue('gasto-folio').trim().toUpperCase(),
      comprobanteUrl: getInputValue('gasto-comprobante').trim(),
      notas: getInputValue('gasto-notas').trim(),
      adminPasswordActual: auth.password || ''
    };
    try {
      await requestBackend<GastoGuardadoResponse>('guardar_gasto', payload, 'POST');
      cerrarModal();
      await cargarGastos({ append: false });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo guardar el gasto');
    }
  }

  async function eliminarGasto(id: string): Promise<void> {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await requestBackend<{ success?: boolean }>('eliminar_gasto', { id }, 'POST');
      await cargarGastos({ append: false });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo eliminar el gasto');
    }
  }

  elBtnRefresh.addEventListener('click', () => { void cargarGastos({ append: false }); });
  elBtnNuevo.addEventListener('click', () => abrirModal());
  elFormGasto.addEventListener('submit', (ev) => { void guardarGasto(ev); });
  document.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => btn.addEventListener('click', cerrarModal));
  elBtnMore.addEventListener('click', () => { if (hasMore) void cargarGastos({ append: true }); });

  ['filtro-desde', 'filtro-hasta', 'filtro-tipo', 'filtro-categoria', 'filtro-texto'].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener(id === 'filtro-texto' ? 'input' : 'change', () => { void cargarGastos({ append: false }); });
  });

  elRows.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    const edit = target?.closest('[data-edit]') as HTMLButtonElement | null;
    const del = target?.closest('[data-del]') as HTMLButtonElement | null;
    if (edit) {
      const gasto = gastosCache.find((x) => String(x.ID || '') === String(edit.getAttribute('data-edit') || ''));
      if (gasto) abrirModal(gasto);
    }
    if (del) void eliminarGasto(String(del.getAttribute('data-del') || ''));
  });

  elModalGasto.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement | null)?.id === 'modal-gasto') cerrarModal();
  });

  void cargarAuxiliares();
  void cargarGastos({ append: false });
})();
