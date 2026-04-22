((): void => {
  type BackendRequest = SrFix.BackendClient['request'];
  type BackendGetUrl = SrFix.BackendClient['buildGetUrl'];

  const globalWindow = window as Window & {
    SRFIXBackend?: SrFix.BackendClient;
    api?: BackendRequest;
    buildGetUrl?: BackendGetUrl;
  };

  const backend = globalWindow.SRFIXBackend;
  if (!backend) return;

  if (typeof globalWindow.api !== 'function') {
    globalWindow.api = backend.request.bind(backend);
  }

  if (typeof globalWindow.buildGetUrl !== 'function') {
    globalWindow.buildGetUrl = backend.buildGetUrl.bind(backend);
  }
})();
