<script setup>
definePageMeta({ layout: 'embebido' }); // sin middleware: 'auth' → anónimo

const route = useRoute();
const { fetchMapa } = useMapaApi();

const mapa = ref(null);
const cargando = ref(true);

// Misma URL sirve enlace directo y embed (idegeo los separa en visualizar/embed):
// ?controles=false oculta controles del visor; ?marca=true muestra la marca de
// agua con enlace a la fuente (la agrega ModalCompartir al snippet de iframe).
const mostrarControles = computed(() => route.query.controles !== 'false');
const mostrarMarca = computed(() => route.query.marca === 'true');

const urlVisualizar = computed(() => (mapa.value ? `/mapas/${mapa.value.id}` : '#'));

async function recargarMapa() {
  const data = await fetchMapa(String(route.params.id)).catch(() => null);
  if (data?.id) mapa.value = data;
  cargando.value = false;
}

function alCambiarVisibilidadPestania() {
  if (document.visibilityState === 'visible') {
    recargarMapa();
  }
}

onMounted(async () => {
  await recargarMapa();
  document.addEventListener('visibilitychange', alCambiarVisibilidadPestania);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', alCambiarVisibilidadPestania);
});
</script>

<template>
  <ClientOnly>
    <div class="pagina-mapa" :class="{ 'ocultar-controles': !mostrarControles }">
      <div v-if="cargando" class="estado-centrado">
        <GeocontenidosLoader />
      </div>

      <div v-else-if="!mapa" class="estado-centrado">
        <span class="pictograma-informacion icono" aria-hidden="true" />
        <h2 class="m-0">Geovisor no disponible</h2>
        <p class="texto-secundario">El mapa no existe o está marcado como privado.</p>
      </div>

      <template v-else>
        <div :key="mapa.map_type" class="contenedor-mapa">
          <GeocontenidosMapasVisorMapa
            v-if="mapa.map_type === 'regular'"
            :mapa="mapa"
            :capas="mapa.layers"
          />
          <GeocontenidosMapasVisorSwipe
            v-else-if="mapa.map_type === 'swipe'"
            :mapa="mapa"
            :capas="mapa.layers"
          />
          <GeocontenidosMapasVisorDual
            v-else-if="mapa.map_type === 'dual'"
            :mapa="mapa"
            :capas="mapa.layers"
          />
        </div>

        <NuxtLink
          v-if="mostrarMarca"
          :to="urlVisualizar"
          target="_blank"
          rel="noopener"
          class="marca-agua"
        >
          <span class="pictograma-enlace-externo" aria-hidden="true" />
          {{ mapa.name }}
        </NuxtLink>
      </template>
    </div>
  </ClientOnly>
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
  color: var(--texto-secundario, #666);
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
  background-color: rgba(255, 255, 255, 0.85);
  color: #222;
  border-radius: 6px;
  text-decoration: none;
  pointer-events: auto;

  &:hover {
    background-color: rgba(255, 255, 255, 0.95);
  }
}

.ocultar-controles :deep(.visor-coords),
.ocultar-controles :deep(.sisdai-mapa-control),
.ocultar-controles :deep(.ol-scale-line),
.ocultar-controles :deep(.ol-control) {
  display: none !important;
}
</style>
