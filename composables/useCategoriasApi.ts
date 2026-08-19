export function useCategoriasApi() {
  const { gnoxyFetch } = useGnoxyUrl();
  const config = useRuntimeConfig();
  const baseUrl = `${config.public.geonodeApi}/categorias`;

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
    const text = await respuesta.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error(`[useCategoriasApi] Error de respuesta (status: ${respuesta.status}):`, text);
      throw new Error(`Respuesta inesperada del servidor (${respuesta.status})`);
    }
  }

  async function deleteRequest(url: string, token?: string | null) {
    const respuesta = await gnoxyFetch(url, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    return respuesta.ok;
  }

  return {
    // ---------- Conjuntos ----------
    fetchConjuntos: () => fetchJson(`${baseUrl}/conjuntos/?page_size=100`),

    fetchConjunto: (id: number | string) => fetchJson(`${baseUrl}/conjuntos/${id}/`),

    crearConjunto: (datos: unknown, token?: string | null) =>
      jsonRequest(`${baseUrl}/conjuntos/`, 'POST', datos, token),

    actualizarConjunto: (id: number | string, datos: unknown, token?: string | null) =>
      jsonRequest(`${baseUrl}/conjuntos/${id}/`, 'PATCH', datos, token),

    eliminarConjunto: (id: number | string, token?: string | null) =>
      deleteRequest(`${baseUrl}/conjuntos/${id}/`, token),

    activarConjunto: (id: number | string, token?: string | null) =>
      jsonRequest(`${baseUrl}/conjuntos/${id}/activar/`, 'POST', undefined, token),

    // ---------- Categorías ----------
    fetchCategorias: (conjuntoId: number | string) =>
      fetchJson(`${baseUrl}/categorias/?conjunto=${conjuntoId}&page_size=100`),

    crearCategoria: (datos: unknown, token?: string | null) =>
      jsonRequest(`${baseUrl}/categorias/`, 'POST', datos, token),

    actualizarCategoria: (id: number | string, datos: unknown, token?: string | null) =>
      jsonRequest(`${baseUrl}/categorias/${id}/`, 'PATCH', datos, token),

    eliminarCategoria: (id: number | string, token?: string | null) =>
      deleteRequest(`${baseUrl}/categorias/${id}/`, token),

    // ---------- Categorías visibles (público) ----------
    fetchCategoriasVisibles: () => fetchJson(`${baseUrl}/visibles/`),
  };
}
