import { defineStore } from 'pinia';

export const useMapasStore = defineStore('mapas', () => {
  const api = useMapaApi();
  const config = useRuntimeConfig();
  const { data: session } = useAuth();
  const token = () => session.value?.accessToken ?? null;

  // Estado que lee el listado (index.vue)
  const maps = ref([]);
  const pagination = ref({ total: 0, page: 1, page_size: 10 });
  const isLoading = ref(false);

  // Mapa activo que leen el editor y ModalAgregarCapas
  const activeMap = ref(null);
  const isLoadingMap = ref(false);
  // false hasta que un cargarMapa termina (éxito o fallo). Distingue el estado
  // inicial "aún no se intenta" del estado real "cargó y vacío / no existe".
  const mapaCargado = ref(false);
  const layersOrdered = computed(() =>
    [...(activeMap.value?.layers ?? [])].sort((a, b) => a.stack_order - b.stack_order)
  );

  // Capas de un lado del swipe/dual ('left' | 'right').
  function layersByPosition(position) {
    return layersOrdered.value.filter((l) => l.map_position === position);
  }

  function buildWmtsUrl(layer) {
    // KVP GetTile: STYLE vacío = estilo por defecto del layer (el literal
    // 'default' es inválido en GWC). OL sustituye {z}/{y}/{x}.
    const name = encodeURIComponent(layer.name);
    const style = encodeURIComponent(layer.style || '');
    return (
      `${config.public.geoserverUrl}/gwc/service/wmts` +
      `?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
      `&LAYER=${name}&STYLE=${style}` +
      `&TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}` +
      `&FORMAT=image/png&_t=${Date.now()}`
    );
  }

  // Estado del modal de agregar capas
  const modalAgregarCapasAbierto = ref(false);
  const abrirModalAgregarCapas = () => (modalAgregarCapasAbierto.value = true);
  const cerrarModalAgregarCapas = () => (modalAgregarCapasAbierto.value = false);

  async function cargarMapas({ page = 1, pageSize = 6 } = {}) {
    isLoading.value = true;
    try {
      const data = await api.fetchMapas({ page, page_size: pageSize }); // ← requiere el ajuste de 1 línea (abajo)
      maps.value = data.results ?? [];
      pagination.value = {
        total: data.total ?? 0,
        page: data.page ?? page,
        page_size: data.page_size ?? pageSize,
      };
    } finally {
      isLoading.value = false;
    }
  }
  async function cargarMapa(id) {
    isLoadingMap.value = true;
    try {
      // Privado/inexistente → 404: dejar activeMap en null para el estado vacío.
      activeMap.value = await api.fetchMapa(id).catch(() => null); // el detalle ya trae layers[]
    } finally {
      isLoadingMap.value = false;
      mapaCargado.value = true;
    }
    return activeMap.value;
  }
  function limpiarMapa() {
    activeMap.value = null;
    mapaCargado.value = false;
  }
  const crearMapa = (payload) => api.crearMapa(payload, token());
  const actualizarMapa = (id, payload) => api.actualizarMapa(id, payload, token());
  const eliminarMapa = (id) => api.eliminarMapa(id, token());

  // upload-image devuelve el detalle del mapa; refrescar preview en memoria.
  async function subirImagenMapa(id, file) {
    const data = await api.subirImagen(id, file, token());
    if (!data?.id) return null;
    if (activeMap.value?.id === id) {
      activeMap.value = { ...activeMap.value, preview: data.preview };
    }
    const idx = maps.value.findIndex((m) => m.id === id);
    if (idx !== -1) maps.value[idx] = { ...maps.value[idx], preview: data.preview };
    return data;
  }

  // Alta masiva vía bulk-add (una sola petición, valida geonode_id por capa).
  // Devuelve true solo si todas las capas se crearon (cada item trae id);
  // así el modal puede distinguir éxito de fallo real.
  async function agregarCapas(mapId, capas) {
    const creadas = await api.agregarCapasBulk(mapId, capas, token());
    await cargarMapa(mapId);
    return Array.isArray(creadas) && creadas.length > 0 && creadas.every((r) => r && r.id);
  }
  const actualizarCapa = (id, payload) => api.actualizarCapa(id, payload, token());
  async function actualizarEstiloCapa(id, style) {
    const res = await api.actualizarEstiloCapa(id, style, token());
    const layer = (activeMap.value?.layers ?? []).find((l) => l.id === id);
    if (layer) layer.style = style;
    return res;
  }
  const eliminarCapa = (id) => api.eliminarCapa(id, token());
  const reordenarCapas = (items) => api.reordenarCapas(items, token());

  // Borrado masivo vía bulk-delete; refresca el mapa para reflejar el estado real.
  async function eliminarCapas(mapId, ids) {
    const data = await api.eliminarCapasBulk(mapId, ids, token());
    if (activeMap.value?.id === mapId) await cargarMapa(mapId);
    return data;
  }

  return {
    maps,
    pagination,
    isLoading,
    activeMap,
    isLoadingMap,
    mapaCargado,
    layersOrdered,
    layersByPosition,
    buildWmtsUrl,
    modalAgregarCapasAbierto,
    abrirModalAgregarCapas,
    cerrarModalAgregarCapas,
    cargarMapas,
    cargarMapa,
    limpiarMapa,
    crearMapa,
    actualizarMapa,
    eliminarMapa,
    subirImagenMapa,
    agregarCapas,
    actualizarCapa,
    actualizarEstiloCapa,
    eliminarCapa,
    eliminarCapas,
    reordenarCapas,
  };
});
