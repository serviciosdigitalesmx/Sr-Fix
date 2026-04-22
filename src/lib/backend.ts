;(function (): void {
  type RequestMethod = 'GET' | 'POST';

  interface BackendEnvelope {
    success?: boolean;
    error?: unknown;
  }

  interface BackendRequestOptions extends SrFix.BackendRequestOptions {}

  const globalWindow = window as Window & { CONFIG?: { API_URL?: string } };
  const apiUrl = String(globalWindow.CONFIG?.API_URL || '').trim();

  function requireApiUrl(): string {
    if (!apiUrl) throw new Error('CONFIG.API_URL no está definido');
    return apiUrl;
  }

  function buildGetUrl(action: string, payload: object = {}): string {
    const params = new URLSearchParams();
    params.set('action', action);
    Object.entries(payload as Record<string, unknown>).forEach(([key, rawValue]) => {
      if (rawValue === undefined || rawValue === null || rawValue === '') return;
      if (Array.isArray(rawValue)) {
        params.set(key, rawValue.join(', '));
        return;
      }
      params.set(key, String(rawValue));
    });
    return `${requireApiUrl()}?${params.toString()}`;
  }

  async function readJson<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!text.trim()) throw new Error(`Respuesta vacía (${response.status})`);
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Respuesta inválida (${response.status})`);
    }
  }

  async function request<T>(
    action: string,
    payload: object = {},
    options: BackendRequestOptions = {}
  ): Promise<T> {
    const method: RequestMethod = options.method || 'POST';
    const timeoutMs = options.timeoutMs || 12000;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = method === 'GET'
        ? await fetch(buildGetUrl(action, payload), { method: 'GET', signal: controller.signal })
        : await fetch(requireApiUrl(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                    body: JSON.stringify({ action, ...payload }),
                    signal: controller.signal
                });

      const data = await readJson<T & BackendEnvelope>(response);
      const backendError = typeof data.error === 'string' ? data.error.trim() : '';
      if (!response.ok || backendError || data.success === false) {
        throw new Error(backendError || `La acción ${action} fue rechazada`);
      }
      return data as T;
    } finally {
      window.clearTimeout(timer);
    }
  }

  globalWindow.SRFIXBackend = {
    request,
    buildGetUrl
  };
})();
