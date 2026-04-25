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
    return `https://serviciosdigitalesmx.github.io/Sr-Fix/portal-cliente.html?folio=${encodeURIComponent(cleanFolio)}`;
}
