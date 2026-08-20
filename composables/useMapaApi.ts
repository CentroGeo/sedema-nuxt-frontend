export function useMapaApi() {
  const { gnoxyFetch } = useGnoxyUrl();
  const config = useRuntimeConfig();
  const baseUrl = `${config.public.geonodeApi}`;

  async function fetchJson(url: string) {
    const respuesta = await gnoxyFetch(url);
    return respuesta.json();
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
    fetchMapas: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams({ ...params, _t: String(Date.now()) }).toString();
      return fetchJson(`${baseUrl}/sigic-maps/${q ? `?${q}` : ''}`);
    },
    fetchMapa: (id: number | string) => fetchJson(`${baseUrl}/sigic-maps/${id}/?t=${Date.now()}`),
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
