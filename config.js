const CONFIG = {
    API_URL: window.SRFIX_API_URL || localStorage.getItem('srfix_api_url') || 'https://script.google.com/macros/s/AKfycbw49B0GeqyZ2Yr0a-IZNqUhrhUBH0yldSO274EDHBU9gT5SPrXSs2ixIhwD5BRmg-6W/exec',
    APP_URL: window.SRFIX_APP_URL || localStorage.getItem('srfix_app_url') || 'https://serviciosdigitalesmx.github.io/Sr-Fix',
    FRONT_PASSWORD: window.SRFIX_FRONT_PASSWORD || localStorage.getItem('srfix_front_password') || 'Admin1'
};
window.CONFIG = CONFIG;

function srfixGetPublicAppBaseUrl() {
    return 'https://serviciosdigitalesmx.github.io/Sr-Fix';
}

function srfixBuildPortalUrl(folio) {
    const cleanFolio = String(folio || '').trim().toUpperCase();
    if (!cleanFolio) return '';

    const configuredBase = srfixGetPublicAppBaseUrl();
    let baseUrl = configuredBase;

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
