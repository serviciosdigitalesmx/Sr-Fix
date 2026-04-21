;(function (): void {
  type RequestMethod = 'GET' | 'POST';

  interface BackendEnvelope {
    success?: boolean;
    error?: unknown;
  }

  type SucursalRecord = SrFix.SucursalRecord;
  type SucursalesListResponse = SrFix.SucursalesListResponse;
  type TransferenciaStockRecord = SrFix.TransferenciaStockRecord;
  type TransferenciasStockResponse = SrFix.TransferenciasStockResponse;

  const BACKEND_URL = String(CONFIG.API_URL || '').trim();

  const elKpiSucursales = requireElement<HTMLDivElement>('kpi-sucursales');
  const elKpiTransferencias = requireElement<HTMLDivElement>('kpi-transferencias');
  const elKpiActiva = requireElement<HTMLDivElement>('kpi-activa');
  const elFiltroSucursal = requireElement<HTMLInputElement>('filtro-sucursal');
  const elFiltroTransferencias = requireElement<HTMLInputElement>('filtro-transferencias');
  const elRowsSucursales = requireElement<HTMLTableSectionElement>('rows-sucursales');
  const elRowsTransferencias = requireElement<HTMLDivElement>('rows-transferencias');
  const elBtnRefresh = requireElement<HTMLButtonElement>('btn-refresh');
  const elBtnNuevaSucursal = requireElement<HTMLButtonElement>('btn-nueva-sucursal');
  const elModalSucursal = requireElement<HTMLDivElement>('modal-sucursal');
  const elFormSucursal = requireElement<HTMLFormElement>('form-sucursal');
  const elSucursalId = requireElement<HTMLInputElement>('sucursal-id');
  const elSucursalTitle = requireElement<HTMLHeadingElement>('sucursal-title');
  const elSucursalNombre = requireElement<HTMLInputElement>('sucursal-nombre');
  const elSucursalDireccion = requireElement<HTMLInputElement>('sucursal-direccion');
  const elSucursalTelefono = requireElement<HTMLInputElement>('sucursal-telefono');
  const elSucursalEmail = requireElement<HTMLInputElement>('sucursal-email');
  const elSucursalEstatus = requireElement<HTMLSelectElement>('sucursal-estatus');
  const elTransferForm = requireElement<HTMLFormElement>('form-transferencia');
  const elTransferOrigen = requireElement<HTMLSelectElement>('transfer-origen');
  const elTransferDestino = requireElement<HTMLSelectElement>('transfer-destino');
  const elTransferSku = requireElement<HTMLSelectElement>('transfer-sku');
  const elTransferCantidad = requireElement<HTMLInputElement>('transfer-cantidad');
  const elTransferUsuario = requireElement<HTMLInputElement>('transfer-usuario');
  const elTransferMotivo = requireElement<HTMLInputElement>('transfer-motivo');
  const elTransferNotas = requireElement<HTMLTextAreaElement>('transfer-notas');

  let sucursalesCache: SucursalRecord[] = [];
  let productosCache: Array<{ SKU?: string; NOMBRE?: string }> = [];
  let transferenciasCache: TransferenciaStockRecord[] = [];

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

  function getSucursalActiva(): string {
    return localStorage.getItem('srfix_sucursal_activa') || 'GLOBAL';
  }

  function badgeEstado(v: unknown, esMatriz?: boolean): string {
    if (esMatriz) return '<span class="px-2 py-1 rounded-full text-xs bg-[#1F7EDC]/20 text-[#9dcfff]">Matriz</span>';
    if (String(v || '').toLowerCase() === 'activo') return '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Activa</span>';
    return '<span class="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-300">Inactiva</span>';
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
    method: RequestMethod = 'POST',
  ): Promise<T> {
    const response = method === 'GET'
      ? await fetch(buildGetUrl(action, payload), { method: 'GET' })
      : await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...payload })
        });
    const data = await readJson<T & BackendEnvelope>(response);
    const errorText = typeof data.error === 'string' ? data.error.trim() : '';
    if (errorText) throw new Error(errorText);
    if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
      throw new Error(errorText || `La operación ${action} fue rechazada`);
    }
    return data as T;
  }

  function fillSelects(): void {
    const sucursalesActivas = sucursalesCache.filter((item) => String(item.ESTATUS || '').toLowerCase() === 'activo');
    [elTransferOrigen, elTransferDestino].forEach((select) => {
      select.innerHTML = '';
      sucursalesActivas.forEach((item) => {
        const opt = document.createElement('option');
        opt.value = String(item.ID || '');
        opt.textContent = String(item.NOMBRE || '');
        select.appendChild(opt);
      });
    });
    elTransferSku.innerHTML = '';
    productosCache.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = String(item.SKU || '');
      opt.textContent = `${String(item.SKU || '')} · ${String(item.NOMBRE || '')}`;
      elTransferSku.appendChild(opt);
    });
  }

  function renderSucursales(): void {
    const filtro = elFiltroSucursal.value.trim().toLowerCase();
    const rows = sucursalesCache.filter((item) => {
      if (!filtro) return true;
      return [item.ID, item.NOMBRE, item.DIRECCION, item.TELEFONO, item.EMAIL]
        .some((v) => String(v || '').toLowerCase().includes(filtro));
    });
    elKpiSucursales.textContent = String(sucursalesCache.filter((x) => String(x.ESTATUS || '').toLowerCase() === 'activo').length);
    elKpiActiva.textContent = getSucursalActiva();
    elRowsSucursales.innerHTML = rows.map((item) => `
      <tr class="border-t border-[#1F7EDC]/20">
        <td class="px-3 py-3 font-semibold text-[#1F7EDC]">${escapeHtml(item.ID || '')}</td>
        <td class="px-3 py-3">${escapeHtml(item.NOMBRE)}</td>
        <td class="px-3 py-3">${escapeHtml(item.DIRECCION || '---')}</td>
        <td class="px-3 py-3">
          <div>${escapeHtml(item.TELEFONO || '---')}</div>
          <div class="text-xs text-[#8A8F95]">${escapeHtml(item.EMAIL || '---')}</div>
        </td>
        <td class="px-3 py-3">${badgeEstado(item.ESTATUS, item.ES_MATRIZ)}</td>
        <td class="px-3 py-3">
          <div class="flex gap-2">
            <button data-edit="${escapeHtml(item.ID || '')}" class="px-2 py-1 rounded border border-[#1F7EDC]/30 text-xs hover:bg-[#1F7EDC]/20"><i class="fa-solid fa-pen"></i></button>
            <button data-use="${escapeHtml(item.ID || '')}" class="px-2 py-1 rounded border border-[#FF6A2A]/40 text-xs hover:bg-[#FF6A2A]/20"><i class="fa-solid fa-location-dot"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderTransferencias(): void {
    const filtro = elFiltroTransferencias.value.trim().toLowerCase();
    const rows = transferenciasCache.filter((item) => {
      if (!filtro) return true;
      return [item.ID, item.SKU, item.PRODUCTO, item.SUCURSAL_ORIGEN, item.SUCURSAL_DESTINO, item.USUARIO, item.MOTIVO]
        .some((v) => String(v || '').toLowerCase().includes(filtro));
    });
    elKpiTransferencias.textContent = String(rows.length);
    elRowsTransferencias.innerHTML = rows.length
      ? rows.map((item) => `
        <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
          <div class="flex items-center justify-between gap-3">
            <div class="font-semibold text-[#1F7EDC]">${escapeHtml(item.ID || '')}</div>
            <div class="text-xs text-[#8A8F95]">${escapeHtml(item.FECHA || '---')}</div>
          </div>
          <div class="mt-2 text-sm text-white">${escapeHtml(item.SKU || '---')} · ${escapeHtml(item.PRODUCTO || '')}</div>
          <div class="mt-1 text-sm text-[#d2d8df]">${escapeHtml(item.SUCURSAL_ORIGEN || '---')} -> ${escapeHtml(item.SUCURSAL_DESTINO || '---')} · Cantidad ${Number(item.CANTIDAD || 0)}</div>
          <div class="mt-1 text-xs text-[#8A8F95]">${escapeHtml(item.MOTIVO || 'Sin motivo')} · ${escapeHtml(item.USUARIO || 'Sin usuario')}</div>
        </div>
      `).join('')
      : '<div class="text-sm text-[#8A8F95]">Sin transferencias registradas.</div>';
  }

  function abrirModalSucursal(item: SucursalRecord | null = null): void {
    elFormSucursal.reset();
    elSucursalId.value = item?.ID || '';
    elSucursalTitle.textContent = item ? `Editar ${item.NOMBRE}` : 'Nueva sucursal';
    elSucursalNombre.value = item?.NOMBRE || '';
    elSucursalDireccion.value = item?.DIRECCION || '';
    elSucursalTelefono.value = item?.TELEFONO || '';
    elSucursalEmail.value = item?.EMAIL || '';
    elSucursalEstatus.value = item?.ESTATUS || 'activo';
    elModalSucursal.classList.remove('hidden');
  }

  function cerrarModalSucursal(): void {
    elModalSucursal.classList.add('hidden');
  }

  async function cargarTodo(): Promise<void> {
    const [sucursales, productos, transferencias] = await Promise.all([
      requestBackend<SucursalesListResponse>('listar_sucursales', { soloActivas: '', page: 1, pageSize: 100 }, 'GET'),
      requestBackend<{ productos: Array<{ SKU?: string; NOMBRE?: string }> }>('listar_productos', { sucursalId: 'GLOBAL', page: 1, pageSize: 500 }, 'POST'),
      requestBackend<TransferenciasStockResponse>('listar_transferencias_stock', { sucursalId: getSucursalActiva(), page: 1, pageSize: 100 }, 'GET')
    ]);
    sucursalesCache = Array.isArray(sucursales.sucursales) ? sucursales.sucursales : [];
    productosCache = Array.isArray(productos.productos) ? productos.productos : [];
    transferenciasCache = Array.isArray(transferencias.transferencias) ? transferencias.transferencias : [];
    fillSelects();
    renderSucursales();
    renderTransferencias();
  }

  async function guardarSucursal(ev: SubmitEvent): Promise<void> {
    ev.preventDefault();
    await requestBackend('guardar_sucursal', {
      id: elSucursalId.value,
      nombre: elSucursalNombre.value.trim(),
      direccion: elSucursalDireccion.value.trim(),
      telefono: elSucursalTelefono.value.trim(),
      email: elSucursalEmail.value.trim(),
      estatus: elSucursalEstatus.value
    }, 'POST');
    cerrarModalSucursal();
    await cargarTodo();
  }

  async function guardarTransferencia(ev: SubmitEvent): Promise<void> {
    ev.preventDefault();
    await requestBackend('transferir_stock', {
      sku: elTransferSku.value,
      sucursalOrigen: elTransferOrigen.value,
      sucursalDestino: elTransferDestino.value,
      cantidad: elTransferCantidad.value,
      usuario: elTransferUsuario.value.trim(),
      motivo: elTransferMotivo.value.trim(),
      notas: elTransferNotas.value.trim()
    }, 'POST');
    elTransferForm.reset();
    await cargarTodo();
  }

  elBtnRefresh.addEventListener('click', () => { void cargarTodo(); });
  elBtnNuevaSucursal.addEventListener('click', () => abrirModalSucursal());
  elFormSucursal.addEventListener('submit', (ev) => { void guardarSucursal(ev); });
  elTransferForm.addEventListener('submit', (ev) => { void guardarTransferencia(ev); });
  document.querySelectorAll('[data-close-sucursal]').forEach((btn) => {
    btn.addEventListener('click', cerrarModalSucursal);
  });
  elFiltroSucursal.addEventListener('input', renderSucursales);
  elFiltroTransferencias.addEventListener('input', renderTransferencias);
  elRowsSucursales.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const edit = target?.closest('[data-edit]') as HTMLElement | null;
    const use = target?.closest('[data-use]') as HTMLElement | null;
    if (edit) {
      const item = sucursalesCache.find((x) => x.ID === edit.getAttribute('data-edit'));
      if (item) abrirModalSucursal(item);
    }
    if (use) {
      localStorage.setItem('srfix_sucursal_activa', use.getAttribute('data-use') || 'GLOBAL');
      renderSucursales();
    }
  });

  elModalSucursal.addEventListener('click', (e) => {
    if (e.target === elModalSucursal) cerrarModalSucursal();
  });

  void cargarTodo().catch((e: unknown) => {
    elRowsTransferencias.innerHTML = `<div class="text-sm text-red-300">${escapeHtml(e instanceof Error ? e.message : String(e))}</div>`;
  });
})();
