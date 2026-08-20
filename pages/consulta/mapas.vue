<script setup>
const route = useRoute();
const router = useRouter();
const mapasStore = useMapasStore();

// El mapa a pre-visualizar viaja en la query (?mapa=<id>) en vez de sembrarse en
// el store antes de navegar: así la vista es enlazable, sobrevive a una recarga
// y no depende del orden de desmontaje (el onUnmounted de abajo limpia el store).
const idMapa = computed(() => {
  const valor = Number(route.query.mapa);
  return Number.isInteger(valor) && valor > 0 ? valor : null;
});

async function sincronizarMapa(id) {
  if (!id) {
    mapasStore.limpiarMapa();
    return;
  }
  if (mapasStore.activeMap?.id === id) return;
  await mapasStore.cargarMapa(id);
}

function deseleccionar() {
  mapasStore.limpiarMapa();
  // Sin quitar ?mapa= de la URL, una recarga volvería a abrir el mapa cerrado.
  if (route.query.mapa === undefined) return;
  const query = { ...route.query };
  delete query.mapa;
  router.replace({ query });
}

// En cliente: fetchMap() firma con el accessToken de la sesión.
onMounted(() => sincronizarMapa(idMapa.value));
// Cubre navegar entre mapas sin salir de la ruta (el componente no se remonta).
watch(idMapa, sincronizarMapa);

onUnmounted(() => {
  mapasStore.limpiarMapa();
});
</script>

<template>
  <ConsultaLayoutPaneles :mostrar-seleccion="false">
    <template #catalogo>
      <ConsultaLayoutCatalogo titulo="Mapas" etiqueta-elementos="Mapas" />
    </template>

    <template #visualizador>
      <div v-if="!mapasStore.activeMap" class="contenedor">
        <ConsultaTarjetaSinSeleccion />
      </div>
      <div v-else :key="mapasStore.activeMap.map_type" class="contenedor-visor">
        <header class="visor-encabezado flex flex-contenido-separado p-x-2 p-y-1">
          <div>
            <strong>Pre-visualizando: {{ mapasStore.activeMap.name }}</strong>
            <span class="texto-secundario"> · {{ mapasStore.activeMap.map_type }}</span>
          </div>
          <div class="flex">
            <NuxtLink
              :to="`/geocontenidos/mapas/${mapasStore.activeMap.id}/visualizar`"
              class="boton-secundario boton-chico"
              target="_blank"
            >
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Visualizar
            </NuxtLink>
            <button class="boton-secundario boton-chico" type="button" @click="deseleccionar">
              Cerrar
            </button>
          </div>
        </header>

        <MapasVisor
          v-if="mapasStore.activeMap.map_type === 'regular'"
          :vista="{
            centro: [mapasStore.activeMap.center_lat, mapasStore.activeMap.center_long],
            acercamiento: mapasStore.activeMap.zoom,
          }"
          :capas="mapasStore.activeLayers"
          :base-layer="mapasStore.activeMap.base_layer"
          :opciones="{
            titulo: mapasStore.activeMap.name,
            colorControles: mapasStore.activeMap.highlight_color,
          }"
        />
        <MapasVisorSwipe
          v-else-if="mapasStore.activeMap.map_type === 'swipe'"
          :mapa="mapasStore.activeMap"
          :capas="mapasStore.activeLayers"
        />
        <MapasVisorDual
          v-else-if="mapasStore.activeMap.map_type === 'dual'"
          :mapa="mapasStore.activeMap"
          :capas="mapasStore.activeLayers"
        />
      </div>
    </template>
  </ConsultaLayoutPaneles>
</template>

<style lang="scss" scoped>
.contenedor-visor {
  display: flex;
  flex-direction: column;
  height: var(--altura-consulta-esc);
}

.visor-encabezado {
  align-items: center;
  border-bottom: 1px solid var(--color-neutro-1);
}

.contenedor-visor :deep(.visor-mapa) {
  --altura-visor: calc(var(--altura-consulta-esc) - 48px) !important;
  flex: 1;
  height: calc(var(--altura-consulta-esc) - 48px) !important;
}

.flex {
  gap: 8px;
}
</style>
