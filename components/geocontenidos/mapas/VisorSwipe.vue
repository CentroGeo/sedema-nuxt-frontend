<script setup>
import { SisdaiCapaWms, SisdaiCapaXyz, SisdaiMapa } from '@centrogeomx/sisdai-mapas';
import { useMapControls } from '~/composables/useMapControls';

const props = defineProps({
  mapa: {
    type: Object,
    required: true,
  },
  capas: {
    type: Array,
    default: () => [],
  },
  posicionInicial: {
    type: Number,
    default: 50,
  },
});

const emit = defineEmits(['vista', 'estado-capa']);

function alMoverVista({ acercamiento, centro }) {
  if (!Array.isArray(centro) || centro.length < 2) return;
  emit('vista', {
    zoom: acercamiento,
    center_lat: centro[0],
    center_long: centro[1],
  });
}

const config = useRuntimeConfig();
const { gnoxyFetch } = useGnoxyUrl();

const mapasStore = useMapasStore();

const mapaRef = ref(null);
const contenedorRef = ref(null);
const latRef = ref(null);
const lngRef = ref(null);
const dividir = ref(props.posicionInicial);
defineExpose({ mapaRef, dividir });

const {
  createScaleLineControl,
  addControlsToMap,
  setupMousePositionTracking,
  setupMouseLeaveHandler,
  cleanup,
} = useMapControls(() => mapaRef.value?.mapa ?? null);

let inicializado = false;
function inicializar() {
  if (inicializado) return;
  if (!mapaRef.value?.mapa || !contenedorRef.value || !latRef.value || !lngRef.value) return;
  console.warn('[VisorSwipe] inicializar controles');
  inicializado = true;
  createScaleLineControl();
  addControlsToMap();
  setupMousePositionTracking(latRef.value, lngRef.value);
  setupMouseLeaveHandler(contenedorRef.value);
}

onMounted(inicializar);
watch(() => mapaRef.value?.mapa, inicializar);

onUnmounted(() => {
  cleanup();
});

const baseLayerUrls = {
  osm: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  carto: 'https://{a-c}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
  carto_dark: 'https://{a-c}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
  satellite:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

// Capa base mostrada. Inicia con la guardada; el control permite cambiarla de
// forma momentanea (no se persiste, se reinicia al refrescar la pagina).
const baseLayerActual = ref(props.mapa.base_layer || 'osm');

watch(
  () => props.mapa.base_layer,
  (v) => {
    baseLayerActual.value = v || 'osm';
  }
);

const baseLayerUrl = computed(() => baseLayerUrls[baseLayerActual.value] || baseLayerUrls.osm);

const vista = computed(() => ({
  centro: [props.mapa.center_lat, props.mapa.center_long],
  acercamiento: props.mapa.zoom,
}));

const wmsFuente = computed(() => `${config.public.geoserverUrl}/wms?`);

function esCapaRemota(capa) {
  return String(capa.dataset_sourcetype || '').toUpperCase() === 'REMOTE';
}

function nombreCapaWms(capa) {
  return capa.wms_layer_name || capa.name;
}

function fuenteCapaWms(capa) {
  if (esCapaRemota(capa) && capa.wms_url) {
    return capa.wms_url;
  }

  return wmsFuente.value;
}

// Las capas remotas utilizan gnoxy para evitar restricciones CORS.
// Las capas locales públicas conservan la petición directa a GeoServer.
const fetchDirecto = (url) => fetch(url);

function consultaCapa(capa) {
  if (esCapaRemota(capa)) {
    return gnoxyFetch;
  }

  return capa.dataset_is_published === true ? fetchDirecto : gnoxyFetch;
}

const ladoMap = { left: 'izquierdo', right: 'derecho' };

const capasOrdenadas = computed(() =>
  [...props.capas].sort((a, b) => a.stack_order - b.stack_order)
);
</script>

<template>
  <ClientOnly>
    <div ref="contenedorRef" class="visor-mapa-contenedor">
      <SisdaiMapa
        ref="mapaRef"
        class="visor-mapa gema"
        :vista="vista"
        :dividir="dividir"
        :escala-grafica="false"
        @al-mover-vista="alMoverVista"
      >
        <SisdaiCapaXyz :key="`base-${baseLayerActual}`" :posicion="0" :fuente="baseLayerUrl" />

        <template v-for="capa in capasOrdenadas" :key="`swipe-${capa.id}-${capa.style || 'def'}`">
          <SisdaiCapaWms
            v-if="capa.layer_type === 'wms'"
            :capa="nombreCapaWms(capa)"
            :fuente="fuenteCapaWms(capa)"
            :key="`wms-${capa.id}-${capa.style || 'def'}`"
            :consulta="consultaCapa(capa)"
            :estilo="capa.style || undefined"
            :opacidad="capa.opacity"
            :visible="capa.visible"
            :posicion="capa.stack_order"
            :lado="ladoMap[capa.map_position]"
            :mosaicos="true"
            @al-iniciar-carga="
              emit('estado-capa', {
                id: capa.id,
                estado: 'loading',
              })
            "
            @al-finalizar-carga="
              (cargaExitosa) =>
                emit('estado-capa', {
                  id: capa.id,
                  estado: cargaExitosa ? 'success' : 'error',
                })
            "
          />

          <GeocontenidosMapasCapaTeselada
            v-else-if="capa.layer_type === 'wmts'"
            :id="`capa-${capa.id}`"
            :key="`wmts-${capa.id}-${capa.style || 'def'}`"
            :fuente-wmts="mapasStore.buildWmtsUrl(capa)"
            :fuente-wms="wmsFuente"
            :capa="capa.name"
            :estilo="capa.style || ''"
            :opacidad="capa.opacity"
            :visible="capa.visible"
            :posicion="capa.stack_order"
            :lado="ladoMap[capa.map_position]"
          />
        </template>

        <slot />
      </SisdaiMapa>
      <GeocontenidosMapasControlCapaBase v-model="baseLayerActual" />
      <GeocontenidosMapasLeyendaMapa
        :capas="capasOrdenadas"
        :geoserver-url="config.public.geoserverUrl"
      />
      <div class="visor-coords">
        Lat: <span ref="latRef">---</span> · Lng: <span ref="lngRef">---</span>
      </div>
    </div>
  </ClientOnly>
</template>

<style lang="scss" scoped>
.visor-mapa-contenedor {
  position: relative;
  width: 100%;
  height: 100%;
}

.visor-mapa {
  height: 100%;
  width: 100%;
}

.visor-coords {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 2;
  font-size: 0.75rem;
  font-family: monospace;
  background-color: var(--fondo);
  color: var(--texto-primario);
  border: 1px solid var(--borde-secundario);
  padding: 4px 8px;
  border-radius: 6px;
  pointer-events: none;
}

// Divisor (swipe): alto ligado al alto del visor (--altura-visor, basado en vh)
// en vez del valor px que sisdai calcula una sola vez → ahora sí sigue el resize.
.visor-mapa-contenedor :deep(.divisor) {
  // --altura-visor lo hereda del contenedor padre (p. ej. .contenedor-mapa);
  // fallback por si no se define.
  --altura-divisor: var(--altura-visor, 88.5vh) !important;
}
</style>
