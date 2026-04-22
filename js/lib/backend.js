"use strict";
;
(function () {
    const globalWindow = window;
    const apiUrl = String(globalWindow.CONFIG?.API_URL || '').trim();
    function requireApiUrl() {
        if (!apiUrl)
            throw new Error('CONFIG.API_URL no está definido');
        return apiUrl;
    }
    function buildGetUrl(action, payload = {}) {
        const params = new URLSearchParams();
        params.set('action', action);
        Object.entries(payload).forEach(([key, rawValue]) => {
            if (rawValue === undefined || rawValue === null || rawValue === '')
                return;
            if (Array.isArray(rawValue)) {
                params.set(key, rawValue.join(', '));
                return;
            }
            params.set(key, String(rawValue));
        });
        return `${requireApiUrl()}?${params.toString()}`;
    }
    async function readJson(response) {
        const text = await response.text();
        if (!text.trim())
            throw new Error(`Respuesta vacía (${response.status})`);
        try {
            return JSON.parse(text);
        }
        catch {
            throw new Error(`Respuesta inválida (${response.status})`);
        }
    }
    async function request(action, payload = {}, options = {}) {
        const method = options.method || 'POST';
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
            const data = await readJson(response);
            const backendError = typeof data.error === 'string' ? data.error.trim() : '';
            if (!response.ok || backendError || data.success === false) {
                throw new Error(backendError || `La acción ${action} fue rechazada`);
            }
            return data;
        }
        finally {
            window.clearTimeout(timer);
        }
    }
    globalWindow.SRFIXBackend = {
        request,
        buildGetUrl
    };
})();
