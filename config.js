const CONFIG = {
    API_URL: window.SRFIX_API_URL || localStorage.getItem('srfix_api_url') || 'https://script.google.com/macros/s/AKfycbw49B0GeqyZ2Yr0a-IZNqUhrhUBH0yldSO274EDHBU9gT5SPrXSs2ixIhwD5BRmg-6W/exec',
    APP_URL: window.SRFIX_APP_URL || localStorage.getItem('srfix_app_url') || ((window.location.protocol === 'http:' || window.location.protocol === 'https:') ? window.location.origin : ''),
    FRONT_PASSWORD: window.SRFIX_FRONT_PASSWORD || localStorage.getItem('srfix_front_password') || 'Admin1'
};
window.CONFIG = CONFIG;

function srfixGetPublicAppBaseUrl() {
    const raw = String(CONFIG.APP_URL || '').trim();
    if (raw) {
        return raw.replace(/\/+$/, '');
    }

    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        return window.location.origin.replace(/\/+$/, '');
    }

    return '';
}

function srfixBuildPortalUrl(folio) {
    const cleanFolio = String(folio || '').trim().toUpperCase();
    if (!cleanFolio) return '';

    const configuredBase = srfixGetPublicAppBaseUrl();
    let baseUrl = configuredBase;

    if (!baseUrl) {
        const href = String(window.location.href || '').trim();
        if (href) {
            try {
                const current = new URL(href);
                const path = current.pathname.replace(/\/[^/]*$/, '/');
                baseUrl = `${current.origin}${path}`;
            } catch (error) {
                baseUrl = '';
            }
        }
    }

    if (!baseUrl) {
        return '';
    }

    try {
        const parsed = new URL(baseUrl, window.location.href);
        const isAppsScriptExec = /\/macros\/s\/[^/]+\/exec\/?$/.test(parsed.pathname) || /script\.google\.com$/.test(parsed.hostname);
        if (isAppsScriptExec) {
            const origin = `${parsed.protocol}//${parsed.host}`;
            const path = parsed.pathname.replace(/\/exec\/?$/, '/');
            baseUrl = `${origin}${path}`;
        }
    } catch (error) {
        baseUrl = configuredBase || baseUrl;
    }

    const url = new URL('portal-cliente.html', `${baseUrl}/`);
    url.searchParams.set('folio', cleanFolio);
    return url.href;
}
