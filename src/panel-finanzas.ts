;(function (): void {
  type FinanzasRequestMethod = 'GET' | 'POST';

  interface FinanzasBackendEnvelope {
    success?: boolean;
    error?: unknown;
  }

  type FinanzasResumenResponse = SrFix.FinanzasResumenResponse;
  type FinanzasKpis = SrFix.FinanzasKpis;
  type FinanzasComparativoMensualItem = SrFix.FinanzasComparativoMensualItem;
  type FinanzasResumenCategoriaItem = SrFix.FinanzasResumenCategoriaItem;

  const BACKEND_URL = String(CONFIG.API_URL || '').trim();

  const elBtnRefresh = requireElement<HTMLButtonElement>('btn-refresh');
  const elFiltroDesde = requireElement<HTMLInputElement>('filtro-desde');
  const elFiltroHasta = requireElement<HTMLInputElement>('filtro-hasta');
  const elComparativoMensual = requireElement<HTMLDivElement>('comparativo-mensual');
  const elResumenCategorias = requireElement<HTMLDivElement>('resumen-categorias');

  function requireElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Elemento no encontrado: ${id}`);
    return el as T;
  }

  function money(v: unknown): string {
    return `$${Number(v ?? 0).toFixed(2)}`;
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

  function setDefaults(): void {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    elFiltroDesde.value = inicio.toISOString().slice(0, 10);
    elFiltroHasta.value = hoy.toISOString().slice(0, 10);
  }

  function getFiltros(): { fechaDesde: string; fechaHasta: string; sucursalId: string } {
    return {
      fechaDesde: elFiltroDesde.value,
      fechaHasta: elFiltroHasta.value,
      sucursalId: getSucursalActiva()
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

  function canRetryAsGet(action: string): boolean {
    return !/^(guardar_|registrar_|eliminar_|archivar_|transferir_|recibir_|cambiar_|login_|validar_|crear_|reabrir_)/.test(String(action || '').trim().toLowerCase());
  }

  async function requestBackend<T>(
    action: string,
    payload: Record<string, unknown> = {},
    method: FinanzasRequestMethod = 'POST',
  ): Promise<T> {
    const requestGet = (): Promise<Response> => fetch(buildGetUrl(action, payload), { method: 'GET' });
    const requestPost = (): Promise<Response> => fetch(BACKEND_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload })
    });

    try {
      const response = method === 'GET' ? await requestGet() : await requestPost();
      const data = await readJson<T & FinanzasBackendEnvelope>(response);
      const errorText = typeof data.error === 'string' ? data.error.trim() : '';
      if (errorText) throw new Error(errorText);
      if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
        throw new Error(errorText || `La operación ${action} fue rechazada`);
      }
      return data as T;
    } catch (error) {
      if (method !== 'POST' || !canRetryAsGet(action)) throw error;
      const response = await requestGet();
      const data = await readJson<T & FinanzasBackendEnvelope>(response);
      const errorText = typeof data.error === 'string' ? data.error.trim() : '';
      if (errorText) throw new Error(errorText);
      if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
        throw new Error(errorText || `La operación ${action} fue rechazada`);
      }
      return data as T;
    }
  }

  function renderComparativo(rows: FinanzasComparativoMensualItem[] = []): void {
    if (!rows.length) {
      elComparativoMensual.innerHTML = '<div class="text-[#8A8F95]">Sin datos suficientes.</div>';
      return;
    }
    elComparativoMensual.innerHTML = rows.map((item) => `
      <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
        <div class="flex items-center justify-between gap-3">
          <div class="font-semibold text-[#1F7EDC]">${escapeHtml(item.mes)}</div>
          <div class="text-sm text-[#8A8F95]">Utilidad ${money(item.utilidad)}</div>
        </div>
        <div class="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div class="rounded-lg bg-green-500/10 border border-green-500/20 p-2 text-green-300">Ingresos ${money(item.ingresos)}</div>
          <div class="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-red-300">Egresos ${money(item.egresos)}</div>
          <div class="rounded-lg bg-[#1F7EDC]/10 border border-[#1F7EDC]/20 p-2 text-[#9dcfff]">Utilidad ${money(item.utilidad)}</div>
        </div>
      </div>
    `).join('');
  }

  function renderCategorias(rows: FinanzasResumenCategoriaItem[] = []): void {
    if (!rows.length) {
      elResumenCategorias.innerHTML = '<div class="text-[#8A8F95]">Sin categorías para este periodo.</div>';
      return;
    }
    elResumenCategorias.innerHTML = rows.map((item) => `
      <div class="flex items-center justify-between rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
        <div class="font-semibold text-white">${escapeHtml(item.categoria)}</div>
        <div class="text-[#FF6A2A] font-semibold">${money(item.total)}</div>
      </div>
    `).join('');
  }

  function renderKpis(k: FinanzasKpis = {}): void {
    requireElement<HTMLDivElement>('kpi-ingresos').textContent = money(k.ingresos);
    requireElement<HTMLDivElement>('kpi-egresos').textContent = money(k.egresos);
    requireElement<HTMLDivElement>('kpi-utilidad').textContent = money(k.utilidadBruta);
    requireElement<HTMLDivElement>('kpi-ticket').textContent = money(k.ticketPromedio);
    requireElement<HTMLDivElement>('kpi-entregadas').textContent = String(k.ordenesEntregadas || 0);
    requireElement<HTMLDivElement>('kpi-cotizaciones').textContent = String(k.cotizacionesConvertidas || 0);
    requireElement<HTMLDivElement>('kpi-cxc').textContent = money(k.cuentasPorCobrar);
    requireElement<HTMLDivElement>('kpi-anticipos').textContent = money(k.anticiposPendientes);
  }

  async function cargarFinanzas(): Promise<void> {
    try {
      const data = await requestBackend<FinanzasResumenResponse>('resumen_finanzas', getFiltros(), 'POST');
      renderKpis(data.kpis || {});
      renderComparativo(Array.isArray(data.comparativoMensual) ? data.comparativoMensual : []);
      renderCategorias(Array.isArray(data.resumenCategorias) ? data.resumenCategorias : []);
    } catch (error) {
      const message = escapeHtml(error instanceof Error ? error.message : String(error));
      elComparativoMensual.innerHTML = `<div class="text-red-300">${message}</div>`;
      elResumenCategorias.innerHTML = `<div class="text-red-300">${message}</div>`;
    }
  }

  elBtnRefresh.addEventListener('click', () => { void cargarFinanzas(); });
  elFiltroDesde.addEventListener('change', () => { void cargarFinanzas(); });
  elFiltroHasta.addEventListener('change', () => { void cargarFinanzas(); });

  setDefaults();
  void cargarFinanzas();
})();
