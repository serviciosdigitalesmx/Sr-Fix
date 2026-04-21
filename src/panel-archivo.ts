;(function (): void {
  type ArchivoRequestMethod = 'GET' | 'POST';

  interface ArchivoBackendEnvelope {
    success?: boolean;
    error?: unknown;
  }

  type ArchivoListResponse = SrFix.ArchivoListResponse;
  type ArchivoRecord = SrFix.ArchivoRecord;
  type ArchivoDetalleResponse = SrFix.ArchivoDetalleResponse;

  const BACKEND_URL = String(CONFIG.API_URL || '').trim();

  const elRows = requireElement<HTMLTableSectionElement>('rows');
  const elLoading = requireElement<HTMLDivElement>('loading');
  const elEmpty = requireElement<HTMLDivElement>('empty');
  const elCount = requireElement<HTMLSpanElement>('count');
  const elPageInfo = requireElement<HTMLSpanElement>('page-info');
  const elBtnMore = requireElement<HTMLButtonElement>('btn-more');
  const elFiltroTipo = requireElement<HTMLSelectElement>('filtro-tipo');
  const elFiltroFrom = requireElement<HTMLInputElement>('filtro-from');
  const elFiltroTo = requireElement<HTMLInputElement>('filtro-to');
  const btnRefresh = requireElement<HTMLButtonElement>('btn-refresh');
  const elDetalleModal = requireElement<HTMLDivElement>('detalle-modal');
  const elDetalleOverlay = requireElement<HTMLDivElement>('detalle-overlay');
  const elDetalleBadge = requireElement<HTMLDivElement>('detalle-badge');
  const elDetalleFolio = requireElement<HTMLHeadingElement>('detalle-folio');
  const elDetalleCliente = requireElement<HTMLParagraphElement>('detalle-cliente');
  const elDetalleTipo = requireElement<HTMLDivElement>('detalle-tipo');
  const elDetalleFecha = requireElement<HTMLDivElement>('detalle-fecha');
  const elDetalleEstado = requireElement<HTMLDivElement>('detalle-estado');
  const elDetalleTelefono = requireElement<HTMLDivElement>('detalle-telefono');
  const elDetalleTotal = requireElement<HTMLDivElement>('detalle-total');
  const elDetalleEmail = requireElement<HTMLDivElement>('detalle-email');
  const elDetalleOperativo = requireElement<HTMLDivElement>('detalle-operativo');
  const elDetalleNotas = requireElement<HTMLDivElement>('detalle-notas');
  const elDetalleCampos = requireElement<HTMLDivElement>('detalle-campos');
  const elDetalleRaw = requireElement<HTMLPreElement>('detalle-raw');
  const elDetalleAviso = requireElement<HTMLDivElement>('detalle-aviso');
  const btnDetalleCerrar = requireElement<HTMLButtonElement>('btn-detalle-cerrar');
  const btnDetalleCopiar = requireElement<HTMLButtonElement>('btn-detalle-copiar');
  const btnDetalleReabrir = requireElement<HTMLButtonElement>('btn-detalle-reabrir');

  const PAGE_SIZE = 150;
  const RENDER_CHUNK = 60;

  let currentPage = 1;
  let hasMore = false;
  let isLoading = false;
  let detalleActual: ArchivoRecord | null = null;
  const archivoCache = new Map<string, ArchivoRecord>();

  function requireElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Elemento no encontrado: ${id}`);
    }
    return el as T;
  }

  function escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMoney(value: unknown): string {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n) || n <= 0) return '---';
    return `$${n.toFixed(2)}`;
  }

  function formatDate(value: unknown): string {
    if (!value) return '---';
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function badgeTipo(tipo: unknown): string {
    const normalized = String(tipo || '').toLowerCase();
    if (normalized === 'solicitud') return '<span class="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300">Solicitud</span>';
    if (normalized === 'cotizacion') return '<span class="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">Cotización</span>';
    return '<span class="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-300">Equipo entregado</span>';
  }

  function formatMultiline(value: unknown): string {
    const text = String(value ?? '').trim();
    if (!text) return '<span class="text-[#8A8F95]">Sin datos</span>';
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function getArchivoCacheKey(tipo: unknown, folio: unknown): string {
    return `${String(tipo || '').trim().toLowerCase()}::${String(folio || '').trim().toUpperCase()}`;
  }

  function archivoBadgeLabel(tipo: string | undefined): string {
    const normalized = String(tipo || '').toLowerCase();
    if (normalized === 'solicitud') return 'Solicitud archivada';
    if (normalized === 'cotizacion') return 'Cotización archivada';
    if (normalized === 'equipos') return 'Equipo entregado';
    return 'Archivo';
  }

  function archivoDetalleTexto(registro: ArchivoRecord): string {
    const partes: string[] = [];
    if (registro.DESCRIPCION) partes.push(`Descripción: ${registro.DESCRIPCION}`);
    if (registro.PROBLEMAS && registro.PROBLEMAS !== registro.DESCRIPCION) partes.push(`Problemas: ${registro.PROBLEMAS}`);
    if (registro.URGENCIA) partes.push(`Urgencia: ${registro.URGENCIA}`);
    if (registro.DISPOSITIVO) partes.push(`Dispositivo: ${registro.DISPOSITIVO}`);
    if (registro.MODELO) partes.push(`Modelo: ${registro.MODELO}`);
    if (registro.SEGUIMIENTO_CLIENTE) partes.push(`Seguimiento: ${registro.SEGUIMIENTO_CLIENTE}`);
    if (registro.CASO_RESOLUCION_TECNICA) partes.push(`Resolución: ${registro.CASO_RESOLUCION_TECNICA}`);
    return partes.join('\n\n');
  }

  function archivoNotasTexto(registro: ArchivoRecord): string {
    const partes: string[] = [];
    if (registro.NOTAS) partes.push(registro.NOTAS);
    if (registro.COTIZACION_JSON) partes.push(registro.COTIZACION_JSON);
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

  function formatFieldLabel(key: string): string {
    return String(key || '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatFieldValue(value: unknown): string {
    if (value === undefined || value === null) return '---';
    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : '---';
    }
    const text = String(value).trim();
    return text || '---';
  }

  function buildDetalleCampos(registro: ArchivoRecord, raw: Record<string, unknown> | null): string {
    const source = raw && Object.keys(raw).length ? raw : (registro as unknown as Record<string, unknown>);
    const preferredOrder = [
      'TIPO_ARCHIVO',
      'FECHA_ARCHIVO',
      'FECHA_SOLICITUD',
      'FECHA_COTIZACION',
      'FECHA_INGRESO',
      'FECHA_ENTREGA',
      'ESTADO',
      'CLIENTE',
      'CLIENTE_NOMBRE',
      'TELEFONO',
      'CLIENTE_TELEFONO',
      'EMAIL',
      'CLIENTE_EMAIL',
      'DISPOSITIVO',
      'MODELO',
      'DETALLE',
      'DESCRIPCION',
      'PROBLEMAS',
      'FALLA_REPORTADA',
      'URGENCIA',
      'TOTAL',
      'COSTO_ESTIMADO',
      'TECNICO_ASIGNADO',
      'SEGUIMIENTO_CLIENTE',
      'CASO_RESOLUCION_TECNICA',
      'NOTAS',
      'NOTAS_INTERNAS',
      'CHECK_CARGADOR',
      'CHECK_PANTALLA',
      'CHECK_PRENDE',
      'CHECK_RESPALDO'
    ];

    const rendered = new Set<string>();
    const items: Array<{ key: string; value: string }> = [];

    preferredOrder.forEach((key) => {
      if (!(key in source)) return;
      const formatted = formatFieldValue(source[key]);
      if (formatted === '---') return;
      items.push({ key, value: formatted });
      rendered.add(key);
    });

    Object.keys(source).forEach((key) => {
      if (rendered.has(key)) return;
      const value = source[key];
      if (typeof value === 'object') return;
      const formatted = formatFieldValue(value);
      if (formatted === '---') return;
      items.push({ key, value: formatted });
    });

    if (!items.length) {
      return '<div class="rounded-xl border border-[#1F7EDC]/15 bg-black/20 px-4 py-3 text-sm text-[#8A8F95] sm:col-span-2">Sin datos adicionales</div>';
    }

    return items.map((item) => `
      <div class="rounded-xl border border-[#1F7EDC]/15 bg-black/20 px-4 py-3">
        <div class="text-[11px] uppercase tracking-[0.14em] text-[#8A8F95]">${escapeHtml(formatFieldLabel(item.key))}</div>
        <div class="mt-2 break-words text-sm font-medium text-[#F2F2F2]">${escapeHtml(item.value)}</div>
      </div>
    `).join('');
  }

  function parseCotizacionJson(raw: unknown): Record<string, unknown> | null {
    const text = String(raw ?? '').trim();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function mapSolicitudToArchivoRecord(solicitud: Record<string, unknown>): ArchivoRecord {
    const cotizacionJson = String(solicitud.COTIZACION_JSON ?? '').trim();
    const cotizacion = parseCotizacionJson(cotizacionJson);
    const fechaCotizacion = String(solicitud.FECHA_COTIZACION ?? '').trim();
    const tipoArchivo = fechaCotizacion || cotizacionJson || Number(solicitud.COTIZACION_TOTAL || cotizacion?.total || 0) > 0
      ? 'cotizacion'
      : 'solicitud';

    return {
      TIPO_ARCHIVO: tipoArchivo,
      FECHA_ARCHIVO: String(fechaCotizacion || solicitud.FECHA_SOLICITUD || '').trim(),
      FOLIO: String(solicitud.FOLIO_COTIZACION ?? '').trim().toUpperCase(),
      CLIENTE: String(solicitud.NOMBRE ?? '').trim(),
      TELEFONO: String(solicitud.TELEFONO ?? '').trim(),
      EMAIL: String(solicitud.EMAIL ?? '').trim(),
      DETALLE: String(solicitud.DESCRIPCION || solicitud.PROBLEMAS || solicitud.URGENCIA || '').trim(),
      TOTAL: Number(solicitud.COTIZACION_TOTAL || cotizacion?.total || 0),
      ESTADO: String(solicitud.ESTADO ?? '').trim(),
      NOTAS: String((cotizacion && cotizacion.notas) || '').trim(),
      DESCRIPCION: String(solicitud.DESCRIPCION ?? '').trim(),
      PROBLEMAS: String(solicitud.PROBLEMAS ?? '').trim(),
      URGENCIA: String(solicitud.URGENCIA ?? '').trim(),
      FECHA_SOLICITUD: String(solicitud.FECHA_SOLICITUD ?? '').trim(),
      FECHA_COTIZACION: fechaCotizacion,
      COTIZACION_JSON: cotizacionJson,
      FOLIO_COTIZACION_MANUAL: String(solicitud.FOLIO_COTIZACION_MANUAL ?? '').trim().toUpperCase()
    };
  }

  function mapEquipoToArchivoRecord(equipo: Record<string, unknown>): ArchivoRecord {
    return {
      TIPO_ARCHIVO: 'equipos',
      FECHA_ARCHIVO: String(equipo.FECHA_ENTREGA || equipo.FECHA_ULTIMA_ACTUALIZACION || equipo.FECHA_INGRESO || '').trim(),
      FOLIO: String(equipo.FOLIO ?? '').trim().toUpperCase(),
      CLIENTE: String(equipo.CLIENTE_NOMBRE ?? '').trim(),
      TELEFONO: String(equipo.CLIENTE_TELEFONO ?? '').trim(),
      EMAIL: String(equipo.CLIENTE_EMAIL ?? '').trim(),
      DETALLE: String(equipo.DISPOSITIVO || '').trim() || String(equipo.FALLA_REPORTADA || '').trim(),
      TOTAL: Number(equipo.COSTO_ESTIMADO || 0),
      ESTADO: String(equipo.ESTADO ?? '').trim(),
      NOTAS: String(equipo.NOTAS_INTERNAS ?? '').trim(),
      DESCRIPCION: String(equipo.FALLA_REPORTADA ?? '').trim(),
      PROBLEMAS: String(equipo.FALLA_REPORTADA ?? '').trim(),
      DISPOSITIVO: String(equipo.DISPOSITIVO ?? '').trim(),
      MODELO: String(equipo.MODELO ?? '').trim(),
      FECHA_INGRESO: String(equipo.FECHA_INGRESO ?? '').trim(),
      FECHA_ENTREGA: String(equipo.FECHA_ENTREGA ?? '').trim(),
      FECHA_ULTIMA_ACTUALIZACION: String(equipo.FECHA_ULTIMA_ACTUALIZACION ?? '').trim(),
      SEGUIMIENTO_CLIENTE: String(equipo.SEGUIMIENTO_CLIENTE ?? '').trim(),
      CASO_RESOLUCION_TECNICA: String(equipo.CASO_RESOLUCION_TECNICA ?? '').trim(),
      FOTO_RECEPCION: String(equipo.FOTO_RECEPCION ?? '').trim(),
      CHECK_CARGADOR: String(equipo.CHECK_CARGADOR ?? '').trim(),
      CHECK_PANTALLA: String(equipo.CHECK_PANTALLA ?? '').trim(),
      CHECK_PRENDE: String(equipo.CHECK_PRENDE ?? '').trim(),
      CHECK_RESPALDO: String(equipo.CHECK_RESPALDO ?? '').trim()
    };
  }

  async function requestDetalleLegado(tipo: string, folio: string): Promise<{ registro: ArchivoRecord; raw: Record<string, unknown> | null; reabrible: boolean } | null> {
    if (tipo === 'equipos') {
      const data = await requestBackend<{ equipo?: Record<string, unknown>; error?: string }>('equipo', { folio }, 'GET');
      if (!data || !data.equipo) return null;
      return {
        registro: mapEquipoToArchivoRecord(data.equipo),
        raw: data.equipo,
        reabrible: false
      };
    }

    const data = await requestBackend<{ solicitud?: Record<string, unknown>; error?: string }>('solicitud', { folio }, 'GET');
    if (!data || !data.solicitud) return null;
    const registro = mapSolicitudToArchivoRecord(data.solicitud);
    return {
      registro,
      raw: data.solicitud,
      reabrible: ['solicitud', 'cotizacion'].includes(String(registro.TIPO_ARCHIVO || '').toLowerCase())
    };
  }

  function abrirModalDetalle(): void {
    elDetalleModal.classList.remove('hidden');
    elDetalleModal.classList.add('flex');
  }

  function cerrarModalDetalle(): void {
    elDetalleModal.classList.add('hidden');
    elDetalleModal.classList.remove('flex');
    detalleActual = null;
  }

  function renderDetalleRegistro(registro: ArchivoRecord, raw: Record<string, unknown> | null, reabrible: boolean): void {
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
    elDetalleCampos.innerHTML = buildDetalleCampos(registro, raw);
    elDetalleRaw.textContent = JSON.stringify(raw || registro, null, 2);
    elDetalleAviso.textContent = reabrible
      ? 'Este registro puede reabrirse para volver a editarlo en el flujo operativo.'
      : 'Este registro es de solo consulta desde archivo.';
    btnDetalleReabrir.classList.toggle('hidden', !reabrible);
    abrirModalDetalle();
  }

  function getFiltros(): { tipo: string; from: string; to: string } {
    return {
      tipo: elFiltroTipo.value,
      from: elFiltroFrom.value,
      to: elFiltroTo.value
    };
  }

  function getBackendUrl(): string {
    return BACKEND_URL;
  }

  function buildGetUrl(action: string, payload: Record<string, unknown> = {}): string {
    const params = new URLSearchParams();
    params.set('action', action);
    params.set('t', String(Date.now()));
    Object.entries(payload).forEach(([key, raw]) => {
      if (raw === undefined || raw === null || raw === '') return;
      if (typeof raw === 'object') {
        params.set(key, JSON.stringify(raw));
        return;
      }
      params.set(key, String(raw));
    });
    return `${getBackendUrl()}?${params.toString()}`;
  }

  async function readJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text.trim()) {
      throw new Error(`Respuesta vacía (${response.status})`);
    }
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new Error(`Respuesta inválida (${response.status}): ${text.slice(0, 180)}`);
    }
  }

  function canRetryAsGet(action: string): boolean {
    return !/^(guardar_|registrar_|eliminar_|archivar_|transferir_|recibir_|cambiar_|login_|validar_|crear_|reabrir_)/.test(String(action || '').trim().toLowerCase());
  }

  async function requestBackend<T>(
    action: string,
    payload: Record<string, unknown> = {},
    method: ArchivoRequestMethod = 'POST',
  ): Promise<T> {
    const requestGet = (): Promise<Response> => fetch(buildGetUrl(action, payload), { method: 'GET' });
    const requestPost = (): Promise<Response> => fetch(getBackendUrl(), {
      method: 'POST',
      body: JSON.stringify({ action, ...payload })
    });

    try {
      const response = method === 'GET' ? await requestGet() : await requestPost();
      const data = await readJson<T & ArchivoBackendEnvelope>(response);
      const errorText = typeof data.error === 'string' ? data.error.trim() : '';
      if (errorText) throw new Error(errorText);
      if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
        throw new Error(errorText || `La operación ${action} fue rechazada`);
      }
      return data as T;
    } catch (error) {
      if (method !== 'POST' || !canRetryAsGet(action)) throw error;
      const response = await requestGet();
      const data = await readJson<T & ArchivoBackendEnvelope>(response);
      const errorText = typeof data.error === 'string' ? data.error.trim() : '';
      if (errorText) throw new Error(errorText);
      if (Object.prototype.hasOwnProperty.call(data, 'success') && data.success === false) {
        throw new Error(errorText || `La operación ${action} fue rechazada`);
      }
      return data as T;
    }
  }

  function renderRowsChunked(archivo: ArchivoRecord[], append = false): Promise<void> {
    return new Promise((resolve) => {
      if (!append) elRows.innerHTML = '';
      let idx = 0;

      function renderChunk(): void {
        const fragment = document.createDocumentFragment();
        const end = Math.min(idx + RENDER_CHUNK, archivo.length);
        for (; idx < end; idx += 1) {
          const item = archivo[idx];
          if (!item) continue;
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
        } else {
          resolve();
        }
      }

      renderChunk();
    });
  }

  async function cargarArchivo({ append = false } = {}): Promise<void> {
    if (isLoading) return;
    isLoading = true;

    const { tipo, from, to } = getFiltros();
    if (!append) currentPage = 1;

    elLoading.classList.remove('hidden');
    if (!append) {
      elEmpty.classList.add('hidden');
      elRows.innerHTML = '';
    }

    const queryPayload: Record<string, unknown> = {
      tipo,
      page: currentPage,
      pageSize: PAGE_SIZE,
      from: from || undefined,
      to: to || undefined
    };

    try {
      let data: ArchivoListResponse | null = null;

      try {
        data = await requestBackend<ArchivoListResponse>('listar_archivo', queryPayload, 'POST');
      } catch {
        data = await requestBackend<ArchivoListResponse>('listar_archivo', queryPayload, 'GET');
      }

      if (!data) {
        throw new Error('No se obtuvo respuesta del archivo');
      }

      const archivo = Array.isArray(data.archivo) ? data.archivo : [];
      const total = Number(data.total || 0);
      hasMore = !!data.hasMore;

      archivo.forEach((item) => {
        archivoCache.set(getArchivoCacheKey(item.TIPO_ARCHIVO, item.FOLIO), item);
      });

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
      if (hasMore) currentPage += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      elLoading.classList.add('hidden');
      elEmpty.classList.remove('hidden');
      elEmpty.textContent = `No se pudo cargar el archivo: ${message}`;
      elBtnMore.classList.add('hidden');
    } finally {
      isLoading = false;
    }
  }

  async function abrirDetalleArchivo(tipo: string, folio: string): Promise<void> {
    const tipoNormalizado = String(tipo || '').trim().toLowerCase();
    const folioNormalizado = String(folio || '').trim().toUpperCase();
    if (!tipoNormalizado || !folioNormalizado) return;

    const cacheKey = getArchivoCacheKey(tipoNormalizado, folioNormalizado);
    const registroBase = archivoCache.get(cacheKey) || null;

    elDetalleAviso.textContent = 'Cargando detalle...';
    elDetalleRaw.textContent = '';
    if (registroBase) {
      renderDetalleRegistro(registroBase, registroBase as unknown as Record<string, unknown>, ['solicitud', 'cotizacion'].includes(tipoNormalizado));
      elDetalleAviso.textContent = 'Cargando detalle completo...';
    } else {
      abrirModalDetalle();
    }

    try {
      const data = await requestBackend<ArchivoDetalleResponse>('detalle_archivo', { tipo: tipoNormalizado, folio: folioNormalizado }, 'GET');
      if (!data || !data.registro) {
        throw new Error('No se obtuvo el detalle del archivo');
      }
      archivoCache.set(cacheKey, data.registro);
      renderDetalleRegistro(data.registro, data.raw || null, !!data.reabrible);
    } catch (error) {
      try {
        const fallback = await requestDetalleLegado(tipoNormalizado, folioNormalizado);
        if (!fallback || !fallback.registro) {
          throw error;
        }
        archivoCache.set(cacheKey, fallback.registro);
        renderDetalleRegistro(fallback.registro, fallback.raw, fallback.reabrible);
        elDetalleAviso.textContent = 'Detalle cargado con compatibilidad legacy.';
      } catch (fallbackError) {
        const message = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        if (registroBase) {
          renderDetalleRegistro(registroBase, registroBase as unknown as Record<string, unknown>, ['solicitud', 'cotizacion'].includes(tipoNormalizado));
          elDetalleAviso.textContent = `Se mostró el resumen disponible. El detalle completo no cargó: ${message}`;
        } else {
          elDetalleAviso.textContent = `No se pudo cargar el detalle: ${message}`;
          btnDetalleReabrir.classList.add('hidden');
        }
      }
    }
  }

  async function reabrirDetalleActual(): Promise<void> {
    if (!detalleActual) return;
    const tipo = String(detalleActual.TIPO_ARCHIVO || '').trim().toLowerCase();
    if (!['solicitud', 'cotizacion'].includes(tipo)) return;

    const guard = (window as Window & { SRFXSecurityGuard?: SrFix.SecurityGuardApi }).SRFXSecurityGuard;
    if (!guard || typeof guard.ensureAdminPassword !== 'function') {
      alert('No se pudo validar la clave admin');
      return;
    }
    const auth = await guard.ensureAdminPassword('reabrir una orden archivada');
    if (!auth.ok) return;

    try {
      const response = await requestBackend<{ success?: boolean; error?: string }>('reabrir_archivo', {
        tipo,
        folio: detalleActual.FOLIO,
        adminPasswordActual: auth.password || ''
      }, 'POST');
      if (response.success === false) {
        throw new Error(response.error || 'No se pudo reabrir');
      }
      cerrarModalDetalle();
      await cargarArchivo({ append: false });
    } catch (error) {
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
    const target = event.target as HTMLElement | null;
    const button = target?.closest('.btn-detalle') as HTMLButtonElement | null;
    if (!button) return;
    const folio = button.getAttribute('data-folio') || '';
    const tipo = button.getAttribute('data-tipo') || '';
    void abrirDetalleArchivo(tipo, folio);
  });
  elDetalleOverlay.addEventListener('click', () => cerrarModalDetalle());
  btnDetalleCerrar.addEventListener('click', () => cerrarModalDetalle());
  btnDetalleCopiar.addEventListener('click', () => {
    const folio = detalleActual?.FOLIO || '';
    if (!folio) return;
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
