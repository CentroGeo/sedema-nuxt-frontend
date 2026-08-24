export function useGnoxyUrl() {
  const config = useRuntimeConfig();

  function gnoxyUrl(inputUrl: string): string {
    if (!inputUrl) return '';

    const geonodeUrl = String(config.public.geonodeUrl || '');
    const geonodeHost = geonodeUrl.replace(/^https?:\/\//, '');

    // Caso 1: URL de GeoNode (sea http://, https:// o ruta /uploaded/)
    if (
      (geonodeUrl && inputUrl.startsWith(geonodeUrl)) ||
      (geonodeHost && inputUrl.replace(/^https?:\/\//, '').startsWith(geonodeHost)) ||
      inputUrl.startsWith('/uploaded/') ||
      inputUrl.startsWith('/media/')
    ) {
      const rutaRelativa = inputUrl.replace(/^https?:\/\/[^/]+/, '');
      const pathLimpio = rutaRelativa.startsWith('/') ? rutaRelativa : `/${rutaRelativa}`;
      return `${config.app.baseURL}api/gnoxy${pathLimpio}`;
    }

    // Caso 2: cualquier otra URL externa real → usar gnoxy/proxy con encode
    return `${config.app.baseURL}api/gnoxy/proxy/?url=${encodeURIComponent(inputUrl)}`;
  }

  return {
    gnoxyUrl,
    gnoxyFetch: (url: string, params: object = {}) => {
      const event = useRequestEvent();

      const finalUrl = gnoxyUrl(url);

      // 🟢 SSR
      if (event) {
        const host = event.node.req.headers.host;
        const proto = event.node.req.headers['x-forwarded-proto'] || 'http';
        const cookie = event.node.req.headers.cookie;

        return fetch(`${proto}://${host}${finalUrl}`, {
          ...params,
          headers: {
            ...((params as Record<string, unknown>).headers as Record<string, string>),
            ...(cookie ? { cookie } : {}),
          },
        });
      }

      // 🔵 CLIENTE
      return fetch(finalUrl, params);
    },
  };
}
