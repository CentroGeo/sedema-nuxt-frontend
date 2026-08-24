<script setup>
definePageMeta({
  layout: 'visualizar',
  auth: false,
});

const route = useRoute();
const mapasStore = useMapasStore();
const { rutaApp } = useUrlAbsoluta();

const mapaId = computed(() => Number(route.params.id));

// Misma URL sirve enlace directo y embed: ?controles=false oculta los controles
// del visor; ?marca=true muestra la marca de agua con enlace a la fuente.
// La routeRule '/mapas/**' de nuxt.config.ts permite embeberla en un <iframe>.
const mostrarControles = computed(() => route.query.controles !== 'false');
const mostrarMarca = computed(() => route.query.marca === 'true');

const enlaceFuente = computed(() =>
  mapasStore.activeMap ? rutaApp(`/mapas/${mapasStore.activeMap.id}`) : '#'
);

// Al volver a la pestaña se refresca por si el mapa cambió mientras no se veía
// (upstream lo hace con estado local; aquí la vista entera lee del store).
function alCambiarVisibilidadPestania() {
  if (document.visibilityState === 'visible') {
    mapasStore.refrescarMapa(mapaId.value);
  }
}

onMounted(async () => {
  // Anónimo solo puede ver mapas públicos; privado/inexistente → mensaje neutro.
  await mapasStore.cargarMapa(mapaId.value);
  document.addEventListener('visibilitychange', alCambiarVisibilidadPestania);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', alCambiarVisibilidadPestania);
  mapasStore.limpiarMapa();
});
</script>

<template>
  <div class="pagina-mapa" :class="{ 'ocultar-controles': !mostrarControles }">
    <div v-if="mapasStore.isLoadingMap || !mapasStore.mapaCargado" class="estado-centrado">
      <div class="spinner" aria-hidden="true"></div>
      <p>Cargando mapa…</p>
    </div>

    <div v-else-if="!mapasStore.activeMap" class="estado-centrado">
      <span class="pictograma-informacion icono" aria-hidden="true" />
      <h2 class="m-0">Geovisor no disponible</h2>
      <p class="texto-secundario">El mapa no existe o está marcado como privado.</p>
    </div>

    <template v-else>
      <div :key="mapasStore.activeMap.map_type" class="contenedor-mapa">
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

      <a v-if="mostrarMarca" :href="enlaceFuente" target="_blank" rel="noopener" class="marca-agua">
        <span class="pictograma-enlace-externo" aria-hidden="true" />
        {{ mapasStore.activeMap.name }}
      </a>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.pagina-mapa {
  width: 100%;
  height: 100%;
  position: relative;
}

.contenedor-mapa {
  width: 100%;
  height: 100%;
}

.contenedor-mapa :deep(.visor-mapa) {
  --altura-visor: 100vh !important;
  height: 100vh !important;
}

.marca-agua {
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 0.75rem;
  background-color: var(--fondo);
  color: var(--texto-primario);
  border: 1px solid var(--borde-secundario);
  border-radius: 6px;
  text-decoration: none;
  pointer-events: auto;

  &:hover {
    background-color: var(--estado-cursor);
  }
}

.ocultar-controles :deep(.visor-coords),
.ocultar-controles :deep(.sisdai-mapa-control),
.ocultar-controles :deep(.ol-scale-line),
.ocultar-controles :deep(.ol-control) {
  display: none !important;
}

.estado-centrado {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100vh;
  text-align: center;
  padding: 24px;
}

.estado-centrado .icono {
  font-size: 3rem;
  color: var(--texto-secundario);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-neutro-1);
  border-top-color: var(--color-primario);
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}
</style>
