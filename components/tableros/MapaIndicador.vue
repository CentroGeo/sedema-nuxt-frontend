<script setup>
import { SisdaiCapaVectorial, SisdaiCapaXyz, SisdaiMapa } from '@centrogeomx/sisdai-mapas';

const config = useRuntimeConfig();
const { gnoxyUrl } = useGnoxyUrl();

const props = defineProps({
  indicadorId: {
    type: [Number, String],
    default: null,
  },
  mapValues: {
    type: Object,
    default: null,
  },
  plotConfig: {
    type: Object,
    default: null,
  },
  layerIdField: {
    type: String,
    default: '',
  },
  layerName: {
    type: String,
    default: null,
  },
  bbox: {
    type: Array,
    default: null,
  },
  useFilter: {
    type: Boolean,
    default: false,
  },
  filters: {
    type: Object,
    default: () => ({}),
  },
  rangoActivoColor: {
    type: String,
    default: null,
  },
  capasWms: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['hover-rango']);

const leyendaMinimizada = ref(false);

const VISTA_DEFAULT = { centro: [-99.1332, 19.4326], acercamiento: 5 };

const capasWmsActivas = computed(() =>
  [...props.capasWms]
    .filter((capa) => capa.at_start && capa.url && (capa.wms_or_tile === 'tile' || capa.wms_layers))
    .sort((a, b) => Number(a.stack_order ?? 0) - Number(b.stack_order ?? 0))
);

const firmaCapasWms = computed(() =>
  capasWmsActivas.value
    .map(
      (capa) =>
        `${capa.id || capa.name}:${capa.url}:${
          capa.wms_layers || ''
        }:${capa.opacity ?? 1}:${capa.stack_order ?? 0}`
    )
    .join('|')
);

const estadosCargaWms = ref({});

function obtenerClaveCapaWms(capa, indice) {
  return String(capa.id || `${capa.url}-${capa.wms_layers || ''}-${indice}`);
}

function alIniciarCargaWms(capa, indice) {
  const clave = obtenerClaveCapaWms(capa, indice);

  estadosCargaWms.value = {
    ...estadosCargaWms.value,
    [clave]: 'cargando',
  };
}

function alFinalizarCargaWms(capa, indice, cargaExitosa) {
  const clave = obtenerClaveCapaWms(capa, indice);

  estadosCargaWms.value = {
    ...estadosCargaWms.value,
    [clave]: cargaExitosa ? 'correcta' : 'error',
  };
}

const totalCapasWmsCargando = computed(
  () => Object.values(estadosCargaWms.value).filter((estado) => estado === 'cargando').length
);

const totalCapasWmsConError = computed(
  () => Object.values(estadosCargaWms.value).filter((estado) => estado === 'error').length
);

watch(firmaCapasWms, () => {
  estadosCargaWms.value = {};
});

const mapaKey = computed(
  () =>
    `${props.indicadorId || 'sin-indicador'}-${props.layerName || 'sin-capa'}-${(
      props.bbox || []
    ).join(',')}-${firmaCapasWms.value}`
);

const vista = computed(() => {
  if (!props.bbox || props.bbox.length < 4) return VISTA_DEFAULT;
  const [minLon, minLat, maxLon, maxLat] = props.bbox;
  if (!isFinite(minLon) || !isFinite(minLat) || !isFinite(maxLon) || !isFinite(maxLat)) {
    return VISTA_DEFAULT;
  }
  const centro = [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
  const maxDiff = Math.max(maxLon - minLon, maxLat - minLat);
  const acercamiento =
    maxDiff > 0 ? Math.max(1, Math.min(16, Math.round(Math.log2(360 / maxDiff)) + 1)) : 5;
  return { centro, acercamiento };
});

const mapFeaturesUrl = computed(() => {
  if (!props.indicadorId) return null;

  const endpoint =
    `${config.public.geonodeApi}/dashboard/indicators/` + `${props.indicadorId}/map-features/`;

  return gnoxyUrl(endpoint);
});

function hexToRgba(hex, alpha) {
  const clean = (hex || '#cccccc').replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const estiloVectorial = computed(() => {
  if (!props.mapValues || !props.layerIdField) {
    return {
      // Símbolo para Point y MultiPoint.
      'circulo-radio': 6,
      'circulo-relleno-color': 'rgba(180,180,180,0.75)',
      'circulo-contorno-color': '#ffffff',
      'circulo-contorno-grosor': 1,

      // Compatibilidad con Polygon, MultiPolygon y líneas.
      'relleno-color': 'rgba(180,180,180,0.4)',
      'contorno-color': '#888888',
      'contorno-grosor': 1,
    };
  }

  const estilosCategorias = {};

  for (const [featureId, info] of Object.entries(props.mapValues)) {
    const color = info.color || '#cccccc';
    const isActive = !props.rangoActivoColor || color === props.rangoActivoColor;
    const thematicColor = isActive ? color : hexToRgba(color, 0.45);
    const borderColor = isActive && props.rangoActivoColor ? '#333333' : '#ffffff';
    const borderWidth = isActive && props.rangoActivoColor ? 2 : 0.8;

    estilosCategorias[String(featureId)] = {
      // Estilo para geometrías puntuales.
      'circulo-radio': isActive && props.rangoActivoColor ? 8 : 6,
      'circulo-relleno-color': thematicColor,
      'circulo-contorno-color': borderColor,
      'circulo-contorno-grosor': borderWidth,

      // Conserva el soporte para capas poligonales.
      'relleno-color': thematicColor,
      'contorno-color': borderColor,
      'contorno-grosor': borderWidth,
    };
  }

  return {
    // Estilo general para Point y MultiPoint.
    'circulo-radio': 6,
    'circulo-relleno-color': 'rgba(180,180,180,0.75)',
    'circulo-contorno-color': '#ffffff',
    'circulo-contorno-grosor': 1,

    // Estilo general para Polygon y MultiPolygon.
    'relleno-color': 'rgba(180,180,180,0.3)',
    'contorno-color': '#aaaaaa',
    'contorno-grosor': 1,

    categorias: {
      atributo: props.layerIdField,
      estilo: estilosCategorias,
    },
  };
});

/**
 * Sin `mapValues` (o sin el campo que los liga a las geometrías) el mapa se dibuja completo
 * con los grises de respaldo de `estiloVectorial`, lo que se lee como un error de estilo y no
 * como lo que es: el indicador nunca fue recalculado, o su último recálculo falló.
 */
const sinColoresCalculados = computed(
  () => !props.layerIdField || !props.mapValues || Object.keys(props.mapValues).length === 0
);

const globoInformativo = computed(() => {
  if (!props.mapValues) return undefined;
  return (featureProps) => {
    const fid = String(featureProps[props.layerIdField] ?? '');
    const nombre = featureProps.nomgeo || featureProps.NOMGEO || featureProps.nombre_entidad || fid;
    const info = props.mapValues?.[fid];
    const valor = info?.value ?? 'N/D';
    return `<strong>${nombre}</strong><br/>${valor}`;
  };
});
</script>

<template>
  <ClientOnly>
    <div class="mapa-indicador">
      <SisdaiMapa :key="mapaKey" class="gema" :vista="vista">
        <SisdaiCapaXyz :posicion="0" />

        <GeocontenidosMapasCapaWmsExterna
          v-for="(capa, indice) in capasWmsActivas"
          :key="capa.id || `${capa.url}-${capa.wms_layers}-${indice}`"
          :configuracion="capa"
          :posicion="indice + 1"
          @iniciar-carga="alIniciarCargaWms(capa, indice)"
          @finalizar-carga="(cargaExitosa) => alFinalizarCargaWms(capa, indice, cargaExitosa)"
        />

        <SisdaiCapaVectorial
          v-if="mapFeaturesUrl"
          :fuente="mapFeaturesUrl"
          :estilo="estiloVectorial"
          :globo-informativo="globoInformativo"
          :posicion="capasWmsActivas.length + 1"
        />
      </SisdaiMapa>

      <div
        v-if="totalCapasWmsCargando"
        class="mapa-indicador__estado-wms"
        role="status"
        aria-live="polite"
      >
        <span class="mapa-indicador__spinner-wms" aria-hidden="true" />

        <span>
          {{
            totalCapasWmsCargando === 1
              ? 'Cargando capa WMS…'
              : `Cargando ${totalCapasWmsCargando} capas WMS…`
          }}
        </span>
      </div>

      <div
        v-else-if="totalCapasWmsConError"
        class="mapa-indicador__estado-wms mapa-indicador__estado-wms--error"
        role="alert"
      >
        <span class="pictograma-alerta" aria-hidden="true" />

        <span>
          {{
            totalCapasWmsConError === 1
              ? 'No fue posible cargar una capa WMS.'
              : `No fue posible cargar ${totalCapasWmsConError} capas WMS.`
          }}
        </span>
      </div>

      <p v-if="sinColoresCalculados" class="mapa-indicador__aviso" role="status">
        Este indicador no tiene colores calculados, por eso el mapa se muestra en gris. Recalcúlalo
        desde el repositorio de indicadores del tablero.
      </p>

      <div v-if="plotConfig?.ranges" class="mapa-indicador__leyenda">
        <button
          class="mapa-indicador__leyenda-toggle"
          :aria-expanded="!leyendaMinimizada"
          @click="leyendaMinimizada = !leyendaMinimizada"
        >
          <span>{{ plotConfig.title || 'Leyenda' }}</span>
          <span class="mapa-indicador__leyenda-icono">{{ leyendaMinimizada ? '▸' : '▾' }}</span>
        </button>

        <ul v-if="!leyendaMinimizada" class="mapa-indicador__leyenda-lista">
          <li
            v-for="(rango, idx) in plotConfig.ranges"
            :key="idx"
            class="mapa-indicador__leyenda-item"
            :class="{ 'mapa-indicador__leyenda-item--activo': rango.color === rangoActivoColor }"
            @mouseenter="emit('hover-rango', rango.color)"
            @mouseleave="emit('hover-rango', null)"
          >
            <span class="mapa-indicador__leyenda-color" :style="{ backgroundColor: rango.color }" />
            <span>{{ rango.alias || rango.label || `${rango.min} - ${rango.max}` }}</span>
          </li>
        </ul>
      </div>
    </div>
  </ClientOnly>
</template>

<style lang="scss" scoped>
.mapa-indicador {
  position: relative;
  width: 100%;
  min-height: 520px;

  .gema {
    width: 100%;
    height: 520px;
  }

  &__aviso {
    position: absolute;
    top: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    max-width: min(90%, 34rem);
    margin: 0;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.95);
    border-left: 4px solid #b45309;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    font-size: 0.8rem;
    color: #1f2937;
    z-index: 10;
  }

  &__leyenda {
    position: absolute;
    bottom: 2.5rem;
    left: 0.5rem;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 6px;
    font-size: 0.8rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    max-width: 210px;
    z-index: 10;
    overflow: hidden;
  }

  &__leyenda-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    color: inherit;
    gap: 0.5rem;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }
  }

  &__leyenda-icono {
    font-size: 0.7rem;
    flex-shrink: 0;
  }

  &__leyenda-lista {
    list-style: none;
    margin: 0;
    padding: 0 0.75rem 0.5rem;
    max-height: 200px;
    overflow-y: auto;
  }

  &__leyenda-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.2rem 0.25rem;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover,
    &--activo {
      background: rgba(0, 0, 0, 0.06);
    }
  }

  &__leyenda-color {
    width: 16px;
    height: 16px;
    border-radius: 2px;
    flex-shrink: 0;
    transition: box-shadow 0.15s;
  }

  &__leyenda-item--activo &__leyenda-color {
    box-shadow: 0 0 0 2px #333;
  }

  &__estado-wms {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    z-index: 20;
    display: inline-flex;
    max-width: calc(100% - 5rem);
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0.55rem 0.75rem;
    border-left: 4px solid var(--color-primario-4, #691c32);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.96);
    color: #1f2937;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
    font-size: 0.8rem;
    font-weight: 600;

    &--error {
      border-left-color: #b91c1c;
      color: #991b1b;
    }
  }

  &__spinner-wms {
    width: 1rem;
    height: 1rem;
    flex: 0 0 auto;
    border: 2px solid rgba(105, 28, 50, 0.25);
    border-top-color: var(--color-primario-4, #691c32);
    border-radius: 50%;
    animation: girar-spinner-wms 0.8s linear infinite;
  }
}

@keyframes girar-spinner-wms {
  to {
    transform: rotate(360deg);
  }
}
</style>
