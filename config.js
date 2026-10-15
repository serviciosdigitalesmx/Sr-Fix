const CONFIG = {
    API_URL: (() => {
        const hostname = window.location && window.location.hostname || '';
        const isLocalHost = /^localhost$|^127\.0\.0\.1$|^\[::1\]$/.test(hostname);
        const explicitOverride = window.SRFIX_API_URL;
        const localOverride = isLocalHost ? localStorage.getItem('srfix_api_url') : '';
        if (explicitOverride || localOverride) return explicitOverride || localOverride;
        if (isLocalHost) {
            return '/api';
        }
        return 'https://script.google.com/macros/s/AKfycbyj2zoEbIFANn-MM_SGf3o7BpVCJ58hI1J5t4Y4lOTJLKKx2c_RfCPaQYeKoOw6gf4f/exec';
    })(),
    REVIEW_URL: 'https://search.google.com/local/writereview?placeid=ChIJn0CVSNy_YoYRKPaDAcE8nSA',
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
    return `https://serviciosdigitalesmx.github.io/Sr-Fix/portal-cliente.html?folio=${encodeURIComponent(cleanFolio)}`;
}
