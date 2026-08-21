import { computed, unref } from 'vue';

/**
 * Adaptador de capas para mapas. Expone el contrato uniforme que consume
 * CapasModalAgregar, envolviendo useMapasStore() (que ya trae las peticiones
 * reales contra /sigic-map-layers/).
 *
 * @param {import('vue').MaybeRef<number>} mapaId
 */
export function useMapaCapasAdapter(mapaId) {
  const mapasStore = useMapasStore();
  const api = useMapaApi();
  const { data: session } = useAuth();
  const idDe = () => unref(mapaId);

  const layersOrdered = computed(() => mapasStore.layersOrdered);
  const isLoading = computed(() => mapasStore.isLoadingMap);

  // no-op: el mapa ya está cargado. OJO: no usar mapasStore.cargarMapa() aquí,
  // prende isLoadingMap y la página desmonta todo (incl. este modal) con eso.
  async function cargar() {}

  async function agregar(seleccionadas, { posicion } = {}) {
    const base = mapasStore.layersOrdered.length;
    const payload = seleccionadas.map((capa, i) => ({
      geonode_id: capa.pk,
      visible: true,
      opacity: 1.0,
      map_position: posicion || 'left',
      stack_order: base + i,
    }));

    // api directo, no mapasStore.agregarCapas: ese llama a cargarMapa() por
    // dentro y prende isLoadingMap, mismo problema que cargar().
    const creadas = await api.agregarCapasBulk(idDe(), payload, session.value?.accessToken);
    const ok = Array.isArray(creadas) && creadas.length > 0 && creadas.every((r) => r?.id);
    if (!ok) return { success: false, errors: ['No se pudieron agregar las capas.'] };

    await mapasStore.refrescarMapa(idDe());
    return { success: true };
  }

  function actualizar(id, patch) {
    return mapasStore.actualizarCapa(id, patch);
  }

  // El backend ignora un título de estilo (update-style solo acepta `style`).
  function actualizarEstilo(id, style) {
    return mapasStore.actualizarEstiloCapa(id, style);
  }

  async function eliminar(capa) {
    await mapasStore.eliminarCapa(capa.id);
    // mismo motivo que cargar(): sin cargarMapa(), se actualiza a mano.
    if (mapasStore.activeMap) {
      mapasStore.activeMap = {
        ...mapasStore.activeMap,
        layers: mapasStore.activeMap.layers.filter((l) => l.id !== capa.id),
      };
    }
    return true;
  }

  function reordenar(orden) {
    return mapasStore.reordenarCapas(orden);
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
