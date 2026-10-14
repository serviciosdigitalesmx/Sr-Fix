const CONFIG = {
    API_URL: (() => {
        const override = window.SRFIX_API_URL || localStorage.getItem('srfix_api_url');
        if (override) return override;
        if (window.location && /^localhost$|^127\.0\.0\.1$|^\[::1\]$/.test(window.location.hostname)) {
            return '/api';
        }
        return 'https://script.google.com/macros/s/AKfycbw4EVRdYhlmup-Jz7o3OKCw8v17LOxbgwDwAk0gbxHElofAfoeY33Ot6ah9r7OC-Ywk/exec';
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
