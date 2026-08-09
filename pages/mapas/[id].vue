<script setup>
definePageMeta({ layout: 'embebido' }); // sin middleware: 'auth' → anónimo

const route = useRoute();
const config = useRuntimeConfig();

const { fetchMapa } = useMapaApi();
const { gnoxyFetch } = useGnoxyUrl();
const { data: session } = useAuth();

const mapa = ref(null);
const wmsExternos = ref([]);
const cargando = ref(true);

const temporizadoresWms = new Map();

const mensajesEstadoWms = {
  loading: 'Cargando capa…',
  success: 'Capa agregada al mapa',
  error: 'No fue posible cargar esta capa',
  idle: '',
};

// Misma URL sirve enlace directo y embed (idegeo los separa en visualizar/embed):
// ?controles=false oculta controles del visor; ?marca=true muestra la marca de
// agua con enlace a la fuente (la agrega ModalCompartir al snippet de iframe).
const mostrarControles = computed(() => route.query.controles !== 'false');
const mostrarMarca = computed(() => route.query.marca === 'true');

const urlVisualizar = computed(() => (mapa.value ? `/mapas/${mapa.value.id}` : '#'));

async function cargarWmsExternos(mapaId) {
  try {
    const headers = {};

    if (session.value?.accessToken) {
      headers.Authorization = `Bearer ${session.value.accessToken}`;
    }

    const respuesta = await gnoxyFetch(
      `${config.public.geonodeApi}/sigic-map-external-wms/?map=${mapaId}`,
      { headers }
    );

    if (!respuesta.ok) {
      throw new Error(`Error ${respuesta.status} al consultar las capas WMS`);
    }

    const cuerpo = await respuesta.json();
    const capasWms = Array.isArray(cuerpo) ? cuerpo : cuerpo.results || [];

    wmsExternos.value = capasWms.map((capa) => ({
      ...capa,
      activo: Boolean(capa.at_start),
      estado: 'idle',
      mensaje: '',
    }));
  } catch (error) {
    console.error('No se pudieron cargar las capas WMS del visualizador:', error);

    wmsExternos.value = [];
  }
}

function actualizarWmsExterno(id, cambios) {
  wmsExternos.value = wmsExternos.value.map((capa) =>
    String(capa.id) === String(id)
      ? {
          ...capa,
          ...cambios,
          mensaje:
            cambios.estado !== undefined ? mensajesEstadoWms[cambios.estado] || '' : capa.mensaje,
        }
      : capa
  );
}

function limpiarTemporizadorWms(id) {
  const clave = String(id);
  const temporizador = temporizadoresWms.get(clave);

  if (temporizador) {
    clearTimeout(temporizador);
    temporizadoresWms.delete(clave);
  }
}

function cambiarEstadoWmsExterno(id, estado) {
  limpiarTemporizadorWms(id);
  actualizarWmsExterno(id, { estado });
}

function alIniciarCargaWmsExterno(item) {
  cambiarEstadoWmsExterno(item.id, 'loading');

  const clave = String(item.id);
  const temporizador = setTimeout(() => {
    actualizarWmsExterno(item.id, { estado: 'error' });
    temporizadoresWms.delete(clave);
  }, 15000);

  temporizadoresWms.set(clave, temporizador);
}

function alFinalizarCargaWmsExterno(item, cargaExitosa) {
  cambiarEstadoWmsExterno(item.id, cargaExitosa ? 'success' : 'error');

  if (!cargaExitosa) return;

  const clave = String(item.id);
  const temporizador = setTimeout(() => {
    actualizarWmsExterno(item.id, { estado: 'idle' });
    temporizadoresWms.delete(clave);
  }, 3000);

  temporizadoresWms.set(clave, temporizador);
}

async function reintentarWmsExterno(item) {
  cambiarEstadoWmsExterno(item.id, 'loading');
  actualizarWmsExterno(item.id, { activo: false });

  await nextTick();

  actualizarWmsExterno(item.id, { activo: true });
}

function alternarWmsExterno(valor) {
  const id = typeof valor === 'object' && valor !== null ? valor.id : valor;

  if (id === undefined || id === null) return;

  const capa = wmsExternos.value.find((item) => String(item.id) === String(id));

  if (!capa) return;

  if (capa.activo) {
    cambiarEstadoWmsExterno(id, 'idle');
    actualizarWmsExterno(id, { activo: false });
    return;
  }

  cambiarEstadoWmsExterno(id, 'loading');
  actualizarWmsExterno(id, { activo: true });
}

onMounted(async () => {
  // Anónimo solo puede ver mapas públicos; privado/inexistente → 404 → mensaje neutro.
  const data = await fetchMapa(String(route.params.id)).catch(() => null);

  if (data?.id) {
    mapa.value = data;
    await cargarWmsExternos(data.id);
  }

  cargando.value = false;
});

onBeforeUnmount(() => {
  temporizadoresWms.forEach((temporizador) => {
    clearTimeout(temporizador);
  });

  temporizadoresWms.clear();
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
            :wms-externos="wmsExternos"
            :mostrar-agregar-wms="false"
            :mostrar-ver-wms="false"
            @alternar-wms="alternarWmsExterno"
            @reintentar-wms="reintentarWmsExterno"
            @iniciar-carga-wms="alIniciarCargaWmsExterno"
            @finalizar-carga-wms="
              ({ item, cargaExitosa }) => alFinalizarCargaWmsExterno(item, cargaExitosa)
            "
          />
          <GeocontenidosMapasVisorSwipe
            v-else-if="mapa.map_type === 'swipe'"
            :mapa="mapa"
            :capas="mapa.layers"
            :wms-externos="wmsExternos"
            :mostrar-agregar-wms="false"
            :mostrar-ver-wms="false"
            @alternar-wms="alternarWmsExterno"
            @reintentar-wms="reintentarWmsExterno"
            @iniciar-carga-wms="alIniciarCargaWmsExterno"
            @finalizar-carga-wms="
              ({ item, cargaExitosa }) => alFinalizarCargaWmsExterno(item, cargaExitosa)
            "
          />
          <GeocontenidosMapasVisorDual
            v-else-if="mapa.map_type === 'dual'"
            :mapa="mapa"
            :capas="mapa.layers"
            :wms-externos="wmsExternos"
            :mostrar-agregar-wms="false"
            :mostrar-ver-wms="false"
            @alternar-wms="alternarWmsExterno"
            @reintentar-wms="reintentarWmsExterno"
            @iniciar-carga-wms="alIniciarCargaWmsExterno"
            @finalizar-carga-wms="
              ({ item, cargaExitosa }) => alFinalizarCargaWmsExterno(item, cargaExitosa)
            "
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
