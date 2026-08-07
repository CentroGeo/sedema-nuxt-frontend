import { ref, unref } from 'vue';

/**
 * Adaptador de capas para tematicas de panorama. Expone el contrato uniforme
 * que consume CapasModalAgregar, contra los endpoints /panorama-layers/.
 *
 * @param {import('vue').MaybeRef<string|number>} tematicaId
 */
export function usePanoramaCapasAdapter(tematicaId) {
  const { gnoxyFetch } = useGnoxyUrl();
  const config = useRuntimeConfig();
  const { data: userData } = useAuth();

  const layersOrdered = ref([]);
  const isLoading = ref(false);

  const idDe = () => unref(tematicaId);

  function headers(json = true) {
    const h = { Authorization: `Bearer ${userData.value?.accessToken}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async function cargar() {
    isLoading.value = true;
    const respuesta = await gnoxyFetch(
      `${config.public.geonodeApi}/panorama-layers/by-topic/${idDe()}/`
    );
    layersOrdered.value = respuesta.ok ? await respuesta.json() : [];
    isLoading.value = false;
  }

  async function agregar(seleccionadas) {
    const payload = seleccionadas.map((capa) => ({
      topic: idDe(),
      geonode_id: capa.pk,
      name: capa.alternate,
      visible: true,
    }));

    const respuesta = await gnoxyFetch(
      `${config.public.geonodeApi}/panorama-layers/bulk-add/${idDe()}/`,
      { method: 'POST', headers: headers(), body: JSON.stringify(payload) }
    );

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => null);
      return { success: false, errors: [cuerpo?.detail || 'No se pudieron agregar las capas.'] };
    }

    await cargar();
    return { success: true };
  }

  async function actualizar(id, patch) {
    const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panorama-layers/${id}/`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(patch),
    });
    if (!respuesta.ok) return null;

    const data = await respuesta.json();
    const idx = layersOrdered.value.findIndex((capa) => capa.id === id);
    if (idx !== -1) layersOrdered.value[idx] = { ...layersOrdered.value[idx], ...data };
    return data;
  }

  function actualizarEstilo(id, style, styleTitle) {
    return actualizar(id, { style, style_title: styleTitle });
  }

  async function eliminar(capa) {
    const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panorama-layers/${capa.id}/`, {
      method: 'DELETE',
      headers: headers(false),
    });
    if (!respuesta.ok) return false;

    layersOrdered.value = layersOrdered.value.filter((l) => l.id !== capa.id);
    return true;
  }

  async function reordenar(orden) {
    const respuesta = await gnoxyFetch(
      `${config.public.geonodeApi}/panorama-layers/bulk-reorder/`,
      { method: 'POST', headers: headers(), body: JSON.stringify(orden) }
    );
    if (!respuesta.ok) return null;

    orden.forEach(({ id, stack_order: stackOrder }) => {
      const idx = layersOrdered.value.findIndex((capa) => capa.id === id);
      if (idx !== -1)
        layersOrdered.value[idx] = { ...layersOrdered.value[idx], stack_order: stackOrder };
    });
    return true;
  }

  return {
    layersOrdered,
    isLoading,
    cargar,
    agregar,
    actualizar,
    actualizarEstilo,
    eliminar,
    reordenar,
  };
}
