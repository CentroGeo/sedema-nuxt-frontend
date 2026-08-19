export function useMapaApi() {
  const { gnoxyFetch } = useGnoxyUrl();
  const config = useRuntimeConfig();
  const baseUrl = `${config.public.geonodeApi}`;

  async function fetchJson(url: string) {
    const respuesta = await gnoxyFetch(url);
    return respuesta.json();
  }

  const datasetsCache = new Map<string, Promise<Record<string, any> | null>>();

  async function fetchDataset(id: number | string) {
    const clave = String(id);

    if (!datasetsCache.has(clave)) {
      const solicitud = fetchJson(`${baseUrl}/datasets/${encodeURIComponent(clave)}/`)
        .then((data) => data?.dataset ?? data ?? null)
        .catch((error) => {
          datasetsCache.delete(clave);
          throw error;
        });

      datasetsCache.set(clave, solicitud);
    }

    return datasetsCache.get(clave);
  }

  async function hidratarCapasWms(capas: any[] = []) {
    return Promise.all(
      capas.map(async (capa) => {
        if (!capa?.geonode_id) return capa;

        try {
          const dataset = await fetchDataset(capa.geonode_id);

          if (!dataset) return capa;

          return {
            ...capa,
            dataset_title: capa.dataset_title || dataset.title || null,
            dataset_is_published: capa.dataset_is_published ?? dataset.is_published ?? null,
            dataset_sourcetype: dataset.sourcetype || null,
            dataset_subtype: dataset.subtype || null,
            wms_url: dataset.ows_url || dataset.dataset_ows_url || null,
            wms_layer_name: dataset.remote_typename || dataset.alternate || capa.name,
          };
        } catch (error) {
          console.error(`[useMapaApi] No fue posible cargar el Dataset ${capa.geonode_id}:`, error);

          return capa;
        }
      })
    );
  }

  async function fetchMapaDetalle(id: number | string) {
    const mapa = await fetchJson(`${baseUrl}/sigic-maps/${id}/`);

    if (!mapa?.id) return mapa;

    return {
      ...mapa,
      layers: await hidratarCapasWms(mapa.layers || []),
    };
  }

  function authHeaders(token?: string | null, extra: Record<string, string> = {}) {
    const headers: Record<string, string> = { ...extra };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function jsonRequest(url: string, method: string, body: unknown, token?: string | null) {
    const respuesta = await gnoxyFetch(url, {
      method,
      headers: authHeaders(token, {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (respuesta.status === 204) return null;
    return respuesta.json();
  }

  async function deleteRequest(url: string, token?: string | null) {
    const respuesta = await gnoxyFetch(url, { method: 'DELETE', headers: authHeaders(token) });
    return respuesta.ok;
  }

  // multipart/form-data: sin Content-Type manual (el navegador pone el boundary).
  async function formRequest(url: string, form: FormData, token?: string | null) {
    const respuesta = await gnoxyFetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: form,
    });
    return respuesta.json();
  }

  return {
    fetchMapas: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetchJson(`${baseUrl}/sigic-maps/${q ? `?${q}` : ''}`);
    },
    fetchMapa: (id: number | string) => fetchMapaDetalle(id),
    crearMapa: (datos: unknown, token?: string | null) =>
      jsonRequest(`${baseUrl}/sigic-maps/`, 'POST', datos, token),
    actualizarMapa: (id: number, datos: unknown, token?: string | null) =>
      jsonRequest(`${baseUrl}/sigic-maps/${id}/`, 'PATCH', datos, token),
    eliminarMapa: (id: number, token?: string | null) =>
      deleteRequest(`${baseUrl}/sigic-maps/${id}/`, token),
    // El backend responde con el detalle completo del mapa (incluye `preview`).
    subirImagen: (id: number, file: File, token?: string | null) => {
      const form = new FormData();
      form.append('card_image', file);
      return formRequest(`${baseUrl}/sigic-maps/${id}/upload-image/`, form, token);
    },
    agregarCapa: (datos: unknown, token?: string | null) =>
      jsonRequest(`${baseUrl}/sigic-map-layers/`, 'POST', datos, token),
    agregarCapasBulk: (mapId: number, items: unknown[], token?: string | null) =>
      jsonRequest(`${baseUrl}/sigic-map-layers/bulk-add/${mapId}/`, 'POST', items, token),
    actualizarCapa: (id: number, datos: unknown, token?: string | null) =>
      jsonRequest(`${baseUrl}/sigic-map-layers/${id}/`, 'PATCH', datos, token),
    // El PATCH regular ignora `style` (MapLayerUpdateSerializer no lo incluye);
    // el estilo solo se actualiza vía la action update-style.
    actualizarEstiloCapa: (id: number, style: unknown, token?: string | null) =>
      jsonRequest(`${baseUrl}/sigic-map-layers/${id}/update-style/`, 'PATCH', { style }, token),
    eliminarCapa: (id: number, token?: string | null) =>
      deleteRequest(`${baseUrl}/sigic-map-layers/${id}/`, token),
    reordenarCapas: (items: Array<{ id: number; stack_order: number }>, token?: string | null) =>
      jsonRequest(`${baseUrl}/sigic-map-layers/bulk-reorder/`, 'POST', items, token),
    eliminarCapasBulk: (mapId: number, ids: number[], token?: string | null) =>
      jsonRequest(
        `${baseUrl}/sigic-map-layers/bulk-delete/${mapId}/`,
        'POST',
        ids.map((id) => ({ id })),
        token
      ),

    // Catálogo GeoNode (mismo patrón que fetchDatasetsPaginados de useTableroApi.ts)
    fetchDatasetsPaginados: (search: string, page = 1, token?: string | null, pageSize = 20) => {
      const params = new URLSearchParams({ page_size: String(pageSize), page: String(page) });
      if (search) params.set('filter{title.icontains}', search);
      const url = `${config.public.geonodeApi}/datasets/?${params.toString()}`;
      if (token)
        return gnoxyFetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
          r.json()
        );
      return fetchJson(url);
    },
  };
}
