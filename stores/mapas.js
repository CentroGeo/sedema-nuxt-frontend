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

  // Los WMS remotos son temporales: viven únicamente durante la sesión actual
  // de la página y nunca se envían al backend.
  const capasWmsTemporales = ref([]);

  const layersOrdered = computed(() =>
    [...(activeMap.value?.layers ?? []), ...capasWmsTemporales.value].sort(
      (a, b) => a.stack_order - b.stack_order
    )
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
      `&FORMAT=image/png`
    );
  }

  function esCapaTemporal(capaOId) {
    const id = typeof capaOId === 'object' ? capaOId?.id : capaOId;
    return String(id || '').startsWith('wms-temporal-');
  }

  async function agregarCapasWmsTemporales(datasets, mapPosition = 'left') {
    const idsExistentes = new Set(
      layersOrdered.value.map((capa) => Number(capa.geonode_id)).filter(Number.isFinite)
    );

    const nuevas = [];

    for (const resumen of datasets) {
      const geonodeId = Number(resumen?.pk);

      if (!Number.isFinite(geonodeId) || idsExistentes.has(geonodeId)) {
        continue;
      }

      try {
        const dataset = (await api.fetchDataset(geonodeId)) || resumen;
        const wmsUrl = dataset.ows_url || dataset.dataset_ows_url;
        const wmsLayerName = dataset.remote_typename || dataset.alternate || dataset.name;

        if (!wmsUrl || !wmsLayerName) {
          continue;
        }

        const stackOrder = layersOrdered.value.length + nuevas.length + 1;

        nuevas.push({
          id: `wms-temporal-${geonodeId}`,
          map: activeMap.value?.id ?? null,
          geonode_id: geonodeId,
          name: dataset.alternate || wmsLayerName,
          dataset_title: dataset.title || resumen.title || wmsLayerName,
          dataset_is_published: dataset.is_published ?? null,
          dataset_sourcetype: dataset.sourcetype || 'REMOTE',
          dataset_subtype: dataset.subtype || 'remote',
          wms_url: wmsUrl,
          wms_layer_name: wmsLayerName,
          map_position: mapPosition,
          visible: true,
          opacity: 1,
          stack_order: stackOrder,
          layer_type: 'wms',
          style: null,
          temporal: true,
        });

        idsExistentes.add(geonodeId);
      } catch (error) {
        console.error(`[mapas] No fue posible preparar el WMS ${geonodeId}:`, error);
      }
    }

    capasWmsTemporales.value = [...capasWmsTemporales.value, ...nuevas];

    return nuevas.length === datasets.length;
  }

  function actualizarCapaWmsTemporal(id, payload) {
    const indice = capasWmsTemporales.value.findIndex((capa) => capa.id === id);

    if (indice === -1) return null;

    const actualizada = {
      ...capasWmsTemporales.value[indice],
      ...payload,
    };

    capasWmsTemporales.value.splice(indice, 1, actualizada);
    return actualizada;
  }

  function eliminarCapaWmsTemporal(id) {
    const cantidadAnterior = capasWmsTemporales.value.length;

    capasWmsTemporales.value = capasWmsTemporales.value.filter((capa) => capa.id !== id);

    return capasWmsTemporales.value.length < cantidadAnterior;
  }

  function limpiarCapasWmsTemporales() {
    capasWmsTemporales.value = [];
  }

  // Estado del modal de agregar capas
  const modalAgregarCapasAbierto = ref(false);
  const abrirModalAgregarCapas = () => (modalAgregarCapasAbierto.value = true);
  const cerrarModalAgregarCapas = () => (modalAgregarCapasAbierto.value = false);

  async function cargarMapas({ page = 1 } = {}) {
    isLoading.value = true;
    try {
      const data = await api.fetchMapas({ page }); // ← requiere el ajuste de 1 línea (abajo)
      maps.value = data.results ?? [];
      pagination.value = {
        total: data.total ?? 0,
        page: data.page ?? page,
        page_size: data.page_size ?? 10,
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
    capasWmsTemporales.value = [];
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
  async function actualizarCapa(id, payload) {
    if (esCapaTemporal(id)) {
      return actualizarCapaWmsTemporal(id, payload);
    }

    return api.actualizarCapa(id, payload, token());
  }

  async function actualizarEstiloCapa(id, style) {
    if (esCapaTemporal(id)) {
      return actualizarCapaWmsTemporal(id, { style });
    }

    return api.actualizarEstiloCapa(id, style, token());
  }

  async function eliminarCapa(id) {
    if (esCapaTemporal(id)) {
      return eliminarCapaWmsTemporal(id);
    }

    return api.eliminarCapa(id, token());
  }

  async function reordenarCapas(items) {
    const persistentes = [];

    for (const item of items) {
      if (esCapaTemporal(item.id)) {
        actualizarCapaWmsTemporal(item.id, {
          stack_order: item.stack_order,
        });
      } else {
        persistentes.push(item);
      }
    }

    if (!persistentes.length) {
      return true;
    }

    return api.reordenarCapas(persistentes, token());
  }

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
    capasWmsTemporales,
    layersOrdered,
    layersByPosition,
    buildWmtsUrl,
    esCapaTemporal,
    agregarCapasWmsTemporales,
    actualizarCapaWmsTemporal,
    eliminarCapaWmsTemporal,
    limpiarCapasWmsTemporales,
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
