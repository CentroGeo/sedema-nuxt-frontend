<script setup>
import {
  SisdaiCapaVectorial,
  SisdaiCapaWms,
  SisdaiCapaXyz,
  SisdaiMapa,
} from '@centrogeomx/sisdai-mapas';
import { useMapControls } from '~/composables/useMapControls';
import { colorContraste } from '~/utils/color';

/**
 * Visor de mapa modular. Fusiona los controles y capas teseladas del antiguo
 * MapasVisorMapa con los marcadores del visor de escenas de geohistorias.
 *
 * - `vista` se pasa tal cual a SisdaiMapa (cada consumidor arma el orden de
 *   `centro` que le corresponde: mapas [lat, long], geohistorias [long, lat]).
 * - `capas` se ramifica por `layer_type`: 'wmts' -> MapasCapaTeselada, resto ->
 *   SisdaiCapaWms (con `consulta` autenticada segun `dataset_is_published`).
 * - `marcadores` (opcional) dibuja una capa vectorial de puntos con globo.
 * - `opciones` enciende/apaga controles (todos activos por defecto).
 */
const props = defineProps({
  vista: { type: Object, default: () => ({}) },
  capas: { type: Array, default: () => [] },
  marcadores: { type: Array, default: () => [] },
  baseLayer: { type: String, default: 'osm' },
  opciones: { type: Object, default: () => ({}) },
  // Mapas base adicionales/alternos, p.ej. [{ id, fuente }, ...]. Se combinan
  // con los 4 predefinidos (osm/carto/carto_dark/satellite); mismo id sobreescribe.
  basemaps: { type: Array, default: () => [] },
  // (url, capa) => contenido HTML | Promise<string> para el cuadro de info al
  // hacer click en una capa WMS (GetFeatureInfo). Opcional.
  cuadroInformativo: { type: Function, default: null },
  // (propiedadesFeature) => contenido HTML del globo al pasar el cursor sobre
  // un marcador. Por defecto solo muestra el titulo.
  globoMarcador: { type: Function, default: null },
});

const emit = defineEmits(['vista', 'clickVista', 'clickMarcador']);

const op = computed(() => ({
  titulo: '',
  colorControles: '#ff51ba',
  // [inicio, fin] -> fondo degradado de los botones de control (geohistorias).
  // Si esta presente tiene prioridad sobre colorControles.
  gradienteControles: null,
  // El control de info solo se muestra si ademas hay titulo que mostrar.
  info: true,
  cambiarBase: true,
  leyenda: true,
  coordenadas: true,
  ...props.opciones,
}));

const config = useRuntimeConfig();
const { gnoxyFetch } = useGnoxyUrl();

// Teselas/WMS: capas publicas se piden directo a GeoServer (mas rapido); las
// privadas van por gnoxy (inyecta auth). Requiere CORS en GeoServer para el
// fetch directo.
const fetchDirecto = (url) => fetch(url);
function consultaCapa(capa) {
  return capa.dataset_is_published === true ? fetchDirecto : gnoxyFetch;
}

// GetTile KVP: STYLE vacio = estilo por defecto del layer. OL sustituye z/y/x.
function buildWmtsUrl(capa) {
  const name = encodeURIComponent(capa.name);
  const style = encodeURIComponent(capa.style || '');
  return (
    `${config.public.geoserverUrl}/gwc/service/wmts` +
    `?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
    `&LAYER=${name}&STYLE=${style}` +
    `&TILEMATRIXSET=EPSG:3857&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}` +
    `&FORMAT=image/png`
  );
}

const wmsFuente = computed(() => `${config.public.geoserverUrl}/wms?`);

const capasOrdenadas = computed(() =>
  [...props.capas].sort((a, b) => a.stack_order - b.stack_order)
);

// ── Capa base (control la cambia de forma momentanea, no se persiste) ─────────

const baseLayerUrls = {
  osm: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  carto: 'https://{a-c}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
  carto_dark: 'https://{a-c}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
  satellite:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

const baseLayerActual = ref(props.baseLayer || 'osm');
watch(
  () => props.baseLayer,
  (v) => {
    baseLayerActual.value = v || 'osm';
  }
);
const baseLayerUrlsCombinado = computed(() => ({
  ...baseLayerUrls,
  ...Object.fromEntries(props.basemaps.map((b) => [b.id, b.fuente])),
}));
const baseLayerUrl = computed(
  () => baseLayerUrlsCombinado.value[baseLayerActual.value] || baseLayerUrls.osm
);

// ── Marcadores ───────────────────────────────────────────────────────────────

const idMarcadores = '_marcadores_';

const capaMarcadores = computed(() => ({
  type: 'FeatureCollection',
  features: props.marcadores.map((marcador) => ({
    type: 'Feature',
    properties: {
      id: marcador.id,
      title: marcador.title,
      content: marcador.content,
      icon: marcador.icon,
      color: marcador.color,
    },
    geometry: {
      type: 'Point',
      coordinates: [Number(marcador.lng), Number(marcador.lat)],
    },
  })),
}));

const tamanioIcono = 16;
const estiloMarcador = [
  {
    // triangulo
    'forma-angulo': Math.PI / 1,
    'forma-desplazamiento': [0, tamanioIcono],
    'forma-relleno-color': ['get', 'color'],
    'forma-puntos': 3,
    'forma-radio': tamanioIcono,
  },
  {
    // circulo
    'circulo-desplazamiento': [0, tamanioIcono * 2],
    'circulo-relleno-color': ['get', 'color'],
    'circulo-radio': tamanioIcono,
  },
  {
    // pictograma
    'circulo-desplazamiento': [0, tamanioIcono * 2],
    'circulo-relleno-color': 'white',
    'circulo-radio': tamanioIcono - tamanioIcono / 4,
    'texto-relleno-color': ['get', 'color'],
    'texto-tipografia': `${tamanioIcono + tamanioIcono / 4}px sisdai-pictogramas`,
    'texto-desplazar_en-y': -(tamanioIcono * 2) + 1,
    'texto-valor': ['get', 'icon'],
  },
];

// ── Eventos del mapa ─────────────────────────────────────────────────────────

function alMoverVista({ acercamiento, centro }) {
  if (!Array.isArray(centro) || centro.length < 2) return;
  // Payload crudo: el consumidor mapea a sus campos segun su orden de centro.
  emit('vista', { acercamiento, centro });
}

// La instalacion publicada de @centrogeomx/sisdai-mapas no anota el evento
// clickVista con la capa/feature bajo el cursor (a diferencia del fork
// fix/capa-vectorial), asi que se resuelve aqui con la API nativa de OL:
// coordenada -> pixel -> feature de la capa de marcadores en ese pixel.
function alClickVista({ coordenadas }) {
  emit('clickVista', { coordenadas });

  const map = mapaRef.value?.mapa;
  if (!map || !props.marcadores.length) return;

  const pixel = map.getPixelFromCoordinate(coordenadas);
  if (!pixel) return;

  const feature = map.forEachFeatureAtPixel(pixel, (f, layer) =>
    layer?.get('id') === idMarcadores ? f : undefined
  );
  if (!feature) return;

  const marcador = props.marcadores.find(({ id }) => id === feature.get('id'));
  if (marcador) emit('clickMarcador', marcador);
}

// ── Controles (escala, coordenadas del cursor) ───────────────────────────────

const mapaRef = ref(null);
const contenedorRef = ref(null);
const latRef = ref(null);
const lngRef = ref(null);
defineExpose({ mapaRef });

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
  if (!mapaRef.value?.mapa) return;
  inicializado = true;
  createScaleLineControl();
  addControlsToMap();
  if (op.value.coordenadas && contenedorRef.value && latRef.value && lngRef.value) {
    setupMousePositionTracking(latRef.value, lngRef.value);
    setupMouseLeaveHandler(contenedorRef.value);
  }
}

onMounted(() => inicializar());
watch(
  () => mapaRef.value?.mapa,
  () => inicializar()
);
onUnmounted(() => cleanup());

const estiloControles = computed(() => {
  const grad = op.value.gradienteControles;
  if (Array.isArray(grad) && grad.length === 2 && grad[0] && grad[1]) {
    const [inicio, fin] = grad;
    const bg = `linear-gradient(135deg, ${inicio}, ${fin})`;
    return {
      '--boton-mapa-fondo': bg,
      '--boton-mapa-fondo-hover': bg,
      // Contraste contra el color inicial del degradado.
      '--boton-mapa-texto': colorContraste(inicio),
    };
  }
  const solido = op.value.colorControles || '#ff51ba';
  return {
    '--boton-mapa-fondo': solido,
    '--boton-mapa-fondo-hover': solido,
    '--boton-mapa-texto': colorContraste(solido),
  };
});
</script>

<template>
  <ClientOnly>
    <div ref="contenedorRef" class="visor-mapa-contenedor" :style="estiloControles">
      <SisdaiMapa
        ref="mapaRef"
        class="visor-mapa gema"
        :vista="vista"
        :escala-grafica="false"
        @al-mover-vista="alMoverVista"
        @click-vista="alClickVista"
      >
        <SisdaiCapaXyz :key="`base-${baseLayerActual}`" :posicion="0" :fuente="baseLayerUrl" />

        <template v-for="capa in capasOrdenadas" :key="`capa-${capa.id}-${capa.style || 'def'}`">
          <MapasCapaTeselada
            v-if="capa.layer_type === 'wmts'"
            :id="`capa-${capa.id}`"
            :key="`wmts-${capa.id}-${capa.style || 'def'}`"
            :fuente-wmts="buildWmtsUrl(capa)"
            :fuente-wms="wmsFuente"
            :capa="capa.name"
            :estilo="capa.style || ''"
            :opacidad="capa.opacity"
            :visible="capa.visible"
            :posicion="capa.stack_order"
          />

          <SisdaiCapaWms
            v-else
            :key="`wms-${capa.id}-${capa.style || 'def'}`"
            :capa="capa.name"
            :fuente="wmsFuente"
            :consulta="consultaCapa(capa)"
            :estilo="capa.style || undefined"
            :opacidad="capa.opacity"
            :visible="capa.visible"
            :posicion="capa.stack_order"
            :mosaicos="true"
            :cuadro-informativo="
              cuadroInformativo ? (url) => cuadroInformativo(url, capa) : undefined
            "
          />
        </template>

        <SisdaiCapaVectorial
          v-if="marcadores.length"
          :id="idMarcadores"
          :estilo="estiloMarcador"
          :fuente="capaMarcadores"
          :globo-informativo="globoMarcador || ((marcador) => marcador.title)"
          :posicion="capasOrdenadas.length + 2"
        />

        <slot />
      </SisdaiMapa>

      <MapasControlInfo v-if="op.info && op.titulo?.trim()" :titulo="op.titulo" />

      <MapasControlCapaBase v-if="op.cambiarBase" v-model="baseLayerActual" />

      <MapasLeyendaMapa
        v-if="op.leyenda"
        :capas="capasOrdenadas"
        :geoserver-url="config.public.geoserverUrl"
      />

      <div v-if="op.coordenadas" class="visor-coords">
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

.visor-mapa-contenedor :deep(.sisdai-mapa-control-boton),
.visor-mapa-contenedor :deep(.sisdai-mapa-control button) {
  // `background` (no `background-color`) para aceptar tanto color solido como
  // el `linear-gradient()` de gradienteControles.
  background: var(--boton-mapa-fondo) !important;
  color: var(--boton-mapa-texto) !important;
  border-color: transparent !important;
  // Quita el "borde" (box-shadow inset) de los controles primarios del mapa.
  --boton-primario-borde: transparent;
  --boton-primario-cursor-borde: transparent;
  --boton-primario-enfoque-borde: transparent;

  &:hover,
  &:focus-visible {
    background: var(--boton-mapa-fondo-hover) !important;
    color: var(--boton-mapa-texto) !important;
    filter: brightness(0.92);
  }

  span,
  i {
    color: var(--boton-mapa-texto) !important;
  }
}
</style>
