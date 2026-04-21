;(function (): void {
  type RequestMethod = 'GET' | 'POST';

  interface BackendEnvelope {
    success?: boolean;
    error?: unknown;
  }

  type ReporteOperativoResponse = SrFix.ReporteOperativoResponse;
  type ReporteOperativoResumen = SrFix.ReporteOperativoResumen;
  type ReporteOperativoDetalle = SrFix.ReporteOperativoDetalle;
  type ReporteOperativoEquipoRecibido = SrFix.ReporteOperativoEquipoRecibido;
  type ReporteOperativoCotizacion = SrFix.ReporteOperativoCotizacion;
  type ReporteOperativoTecnico = SrFix.ReporteOperativoTecnico;
  type ReporteOperativoStockCritico = SrFix.ReporteOperativoStockCritico;
  type ReporteOperativoServicioFrecuente = SrFix.ReporteOperativoServicioFrecuente;
  type ReporteOperativoClienteRecurrente = SrFix.ReporteOperativoClienteRecurrente;

  const BACKEND_URL = String(CONFIG.API_URL || '').trim();

  const elBtnRefresh = requireElement<HTMLButtonElement>('btn-refresh');
  const elFiltroTipo = requireElement<HTMLSelectElement>('filtro-tipo');
  const elFiltroDesde = requireElement<HTMLInputElement>('filtro-desde');
  const elFiltroHasta = requireElement<HTMLInputElement>('filtro-hasta');
  const elKpi1 = requireElement<HTMLDivElement>('kpi-1');
  const elKpi2 = requireElement<HTMLDivElement>('kpi-2');
  const elKpi3 = requireElement<HTMLDivElement>('kpi-3');
  const elKpi4 = requireElement<HTMLDivElement>('kpi-4');
  const elKpi5 = requireElement<HTMLDivElement>('kpi-5');
  const elKpi1Label = requireElement<HTMLDivElement>('kpi-1-label');
  const elKpi2Label = requireElement<HTMLDivElement>('kpi-2-label');
  const elKpi3Label = requireElement<HTMLDivElement>('kpi-3-label');
  const elKpi4Label = requireElement<HTMLDivElement>('kpi-4-label');
  const elKpi5Label = requireElement<HTMLDivElement>('kpi-5-label');
  const elTablaPrincipal = requireElement<HTMLDivElement>('tabla-principal');
  const elTablaSecundaria = requireElement<HTMLDivElement>('tabla-secundaria');

  function requireElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Elemento no encontrado: ${id}`);
    }
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

  function getFiltros(): { tipo: string; fechaDesde: string; fechaHasta: string; sucursalId: string } {
    return {
      tipo: elFiltroTipo.value,
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
    method: RequestMethod = 'POST',
  ): Promise<T> {
    const requestGet = (): Promise<Response> => fetch(buildGetUrl(action, payload), { method: 'GET' });
    const requestPost = (): Promise<Response> => fetch(BACKEND_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload })
    });

    try {
      const response = method === 'GET' ? await requestGet() : await requestPost();
      const data = await readJson<T & BackendEnvelope>(response);
      const errorText = typeof data.error === 'string' ? data.error.trim() : '';
      if (errorText) throw new Error(errorText);
      if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
        throw new Error(errorText || `La operación ${action} fue rechazada`);
      }
      return data as T;
    } catch (error) {
      if (method !== 'POST' || !canRetryAsGet(action)) throw error;
      const response = await requestGet();
      const data = await readJson<T & BackendEnvelope>(response);
      const errorText = typeof data.error === 'string' ? data.error.trim() : '';
      if (errorText) throw new Error(errorText);
      if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
        throw new Error(errorText || `La operación ${action} fue rechazada`);
      }
      return data as T;
    }
  }

  function renderList<T>(
    targetId: string,
    rows: T[] = [],
    mapper: (item: T) => string
  ): void {
    const wrap = document.getElementById(targetId);
    if (!wrap) return;
    if (!rows.length) {
      wrap.innerHTML = '<div class="text-[#8A8F95]">Sin datos para este rango.</div>';
      return;
    }
    wrap.innerHTML = rows.map(mapper).join('');
  }

  function fillKpis(tipo: string, resumen: ReporteOperativoResumen = {}): void {
    const labels: Record<string, string[]> = {
      diario: ['Equipos recibidos', 'Equipos entregados', 'Cotizaciones', 'Ventas estimadas', 'Gastos'],
      semanal: ['Equipos recibidos', 'Equipos entregados', 'Cotizaciones', 'Promedio dias entrega', 'Stock critico'],
      mensual: ['Ingresos', 'Egresos', 'Utilidad', 'Servicios frecuentes', 'Clientes recurrentes']
    };
    const labelSet = (labels[tipo] ?? labels.diario) as string[];

    const values = tipo === 'mensual'
      ? [money(resumen.ingresos), money(resumen.egresos), money(resumen.utilidad), resumen.serviciosFrecuentes || 0, resumen.clientesRecurrentes || 0]
      : tipo === 'semanal'
        ? [resumen.equiposRecibidos || 0, resumen.equiposEntregados || 0, resumen.cotizacionesGeneradas || 0, resumen.promedioDiasEntrega || 0, resumen.stockCritico || 0]
        : [resumen.equiposRecibidos || 0, resumen.equiposEntregados || 0, resumen.cotizacionesGeneradas || 0, money(resumen.ventasEstimadas), money(resumen.gastos)];

    const cards = [
      [elKpi1, elKpi1Label],
      [elKpi2, elKpi2Label],
      [elKpi3, elKpi3Label],
      [elKpi4, elKpi4Label],
      [elKpi5, elKpi5Label]
    ] as Array<[HTMLDivElement, HTMLDivElement]>;
    cards.forEach(([kpiEl, labelEl], index) => {
      kpiEl.textContent = String(values[index] ?? 0);
      labelEl.textContent = labelSet[index] || '';
    });
  }

  async function cargarReporte(): Promise<void> {
    const filtros = getFiltros();
    const data = await requestBackend<ReporteOperativoResponse>('reporte_operativo', filtros, 'POST');
    fillKpis(filtros.tipo, data.resumen || {});

    if (filtros.tipo === 'diario') {
      renderList<ReporteOperativoEquipoRecibido>('tabla-principal', data.detalle?.equiposRecibidos || [], (item) => `
        <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
          <div class="font-semibold text-white">${escapeHtml(item.FOLIO || '---')} · ${escapeHtml(item.CLIENTE_NOMBRE || 'Sin cliente')}</div>
          <div class="text-xs text-[#8A8F95] mt-1">${escapeHtml(item.DISPOSITIVO || '---')} · ${escapeHtml(item.MODELO || '---')}</div>
        </div>
      `);
      renderList<ReporteOperativoCotizacion>('tabla-secundaria', data.detalle?.cotizaciones || [], (item) => `
        <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3 flex items-center justify-between gap-3">
          <div>
            <div class="font-semibold text-white">${escapeHtml(item.folio || '---')}</div>
            <div class="text-xs text-[#8A8F95]">${escapeHtml(item.cliente || 'Sin cliente')}</div>
          </div>
          <div class="text-[#FF6A2A] font-semibold">${money(item.total)}</div>
        </div>
      `);
      return;
    }

    if (filtros.tipo === 'semanal') {
      renderList<ReporteOperativoTecnico>('tabla-principal', data.detalle?.porTecnico || [], (item) => `
        <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3 flex items-center justify-between gap-3">
          <div class="font-semibold text-white">${escapeHtml(item.tecnico || '---')}</div>
          <div class="text-[#1F7EDC] font-semibold">${String(item.total ?? 0)}</div>
        </div>
      `);
      renderList<ReporteOperativoStockCritico>('tabla-secundaria', data.detalle?.stockCritico || [], (item) => `
        <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3">
          <div class="font-semibold text-white">${escapeHtml(item.SKU || '---')} · ${escapeHtml(item.NOMBRE || '---')}</div>
          <div class="text-xs text-[#8A8F95] mt-1">Actual ${Number(item.STOCK_ACTUAL || 0)} · Minimo ${Number(item.STOCK_MINIMO || 0)}</div>
        </div>
      `);
      return;
    }

    renderList<ReporteOperativoServicioFrecuente>('tabla-principal', data.detalle?.serviciosFrecuentes || [], (item) => `
      <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3 flex items-center justify-between gap-3">
        <div class="font-semibold text-white">${escapeHtml(item.servicio || '---')}</div>
        <div class="text-[#1F7EDC] font-semibold">${String(item.total ?? 0)}</div>
      </div>
    `);
    renderList<ReporteOperativoClienteRecurrente>('tabla-secundaria', data.detalle?.clientesRecurrentes || [], (item) => `
      <div class="rounded-xl border border-[#1F7EDC]/20 bg-[#161616] p-3 flex items-center justify-between gap-3">
        <div class="font-semibold text-white">${escapeHtml(item.cliente || '---')}</div>
        <div class="text-[#FF6A2A] font-semibold">${String(item.total ?? 0)}</div>
      </div>
    `);
  }

  function reportError(error: unknown): void {
    const message = escapeHtml(error instanceof Error ? error.message : String(error));
    elTablaPrincipal.innerHTML = `<div class="text-red-300">${message}</div>`;
    elTablaSecundaria.innerHTML = `<div class="text-red-300">${message}</div>`;
  }

  elBtnRefresh.addEventListener('click', () => {
    void cargarReporte().catch(reportError);
  });

  ['change', 'input'].forEach((eventName) => {
    elFiltroTipo.addEventListener(eventName, () => {
      void cargarReporte().catch(reportError);
    });
    elFiltroDesde.addEventListener(eventName, () => {
      void cargarReporte().catch(reportError);
    });
    elFiltroHasta.addEventListener(eventName, () => {
      void cargarReporte().catch(reportError);
    });
  });

  setDefaults();
  void cargarReporte().catch(reportError);
})();
