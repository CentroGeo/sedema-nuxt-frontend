import { ref, unref } from 'vue';

/**
 * Adaptador de capas para escenas de geohistorias. Expone el contrato uniforme
 * que consume CapasModalAgregar, contra los endpoints /scene-layers/.
 *
 * @param {import('vue').MaybeRef<string|number>} escenaId
 */
export function useEscenasCapasAdapter(escenaId) {
  const { gnoxyFetch } = useGnoxyUrl();
  const config = useRuntimeConfig();
  const { data: userData } = useAuth();

  const layersOrdered = ref([]);
  const isLoading = ref(false);

  const idDe = () => unref(escenaId);

  function headers(json = true) {
    const h = { Authorization: `Bearer ${userData.value?.accessToken}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async function cargar() {
    isLoading.value = true;
    const respuesta = await gnoxyFetch(
      `${config.public.geonodeApi}/scene-layers/by-scene/${idDe()}/`
    );
    layersOrdered.value = respuesta.ok ? await respuesta.json() : [];
    isLoading.value = false;
  }

  async function agregar(seleccionadas) {
    const payload = seleccionadas.map((capa) => ({
      scene: idDe(),
      geonode_id: capa.pk,
      name: capa.alternate,
      visible: true,
      opacity: 1,
    }));

    const respuesta = await gnoxyFetch(
      `${config.public.geonodeApi}/scene-layers/bulk-add/${idDe()}/`,
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
    const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/scene-layers/${id}/`, {
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
    const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/scene-layers/${capa.id}/`, {
      method: 'DELETE',
      headers: headers(false),
    });
    if (!respuesta.ok) return false;

    layersOrdered.value = layersOrdered.value.filter((l) => l.id !== capa.id);
    return true;
  }

  async function reordenar(orden) {
    const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/scene-layers/bulk-reorder/`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(orden),
    });
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
