<script setup>
const props = defineProps({
  indicadorId: {
    type: [Number, String],
    default: null,
  },
  nombre: {
    type: String,
    default: '',
  },
  datos: {
    type: Object,
    default: null,
  },
  cargando: {
    type: Boolean,
    default: false,
  },
  capasWms: {
    type: Array,
    default: () => [],
  },
  featuresUrl: {
    type: String,
    default: null,
  },
  basemap: {
    type: String,
    default: null,
  },
  vistaConfigurada: {
    type: Object,
    default: null,
  },
  mapPanel: {
    type: Number,
    default: null,
  },
  plotPanel: {
    type: Number,
    default: null,
  },
  emitirVista: {
    type: Boolean,
    default: false,
  },
  revisionVista: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['vista']);

const rangoActivoColor = ref(null);
let _hoverTimer = null;

const MAP_PANEL_DEFAULT = 65;

const basemapEfectivo = computed(() => props.basemap || props.datos?.map_basemap || 'gray');

const vistaEfectiva = computed(() => {
  if (props.vistaConfigurada) return props.vistaConfigurada;
  const d = props.datos;
  if (!d) return null;
  return {
    zoom: d.map_zoom,
    centerLat: d.map_center_lat,
    centerLong: d.map_center_long,
    bbox: d.map_bbox,
  };
});

/**
 * Reparto de ancho mapa/gráfica. Un indicador anterior a esta configuración no
 * trae los campos, así que cae al 65/35 por defecto.
 */
const anchoPaneles = computed(() => {
  const mapa = Number(props.mapPanel ?? props.datos?.map_panel ?? MAP_PANEL_DEFAULT);
  const valido = isFinite(mapa) && mapa > 0 && mapa < 100 ? mapa : MAP_PANEL_DEFAULT;
  const grafica = Number(props.plotPanel ?? props.datos?.plot_panel ?? 100 - valido);
  return {
    '--map-panel': `${valido}fr`,
    '--plot-panel': `${isFinite(grafica) && grafica > 0 ? grafica : 100 - valido}fr`,
  };
});

function onHoverRango(color) {
  clearTimeout(_hoverTimer);
  if (color) {
    rangoActivoColor.value = color;
  } else {
    _hoverTimer = setTimeout(() => {
      rangoActivoColor.value = null;
    }, 180);
  }
}

watch(
  () => props.datos,
  () => {
    rangoActivoColor.value = null;
  }
);
</script>

<template>
  <section class="tablero-indicador">
    <header v-if="nombre" class="tablero-indicador__encabezado">
      <h2 class="tablero-indicador__titulo">{{ nombre }}</h2>
      <p v-if="datos?.info_text" class="tablero-indicador__info">{{ datos.info_text }}</p>
    </header>

    <TablerosLoader v-if="cargando" mensaje="Cargando indicador..." />

    <template v-else-if="datos">
      <TablerosCuadrosDatos
        v-if="datos.info_boxes?.length"
        :cuadros="datos.info_boxes"
        :datos-indicador="datos"
      />

      <div class="tablero-indicador__visual" :style="anchoPaneles">
        <div class="tablero-indicador__mapa">
          <TablerosMapaIndicador
            :indicador-id="indicadorId"
            :map-values="datos.map_values"
            :plot-config="datos.plot_config"
            :layer-id-field="datos.layer_id_field"
            :layer-name="datos.layer_name"
            :bbox="datos.bbox"
            :use-filter="datos.use_filter"
            :filters="datos.filters"
            :rango-activo-color="rangoActivoColor"
            :capas-wms="capasWms"
            :basemap="basemapEfectivo"
            :vista-configurada="vistaEfectiva"
            :features-url="featuresUrl"
            :emitir-vista="emitirVista"
            :revision-vista="revisionVista"
            @hover-rango="onHoverRango"
            @vista="emit('vista', $event)"
          />
        </div>

        <div class="tablero-indicador__grafica">
          <TablerosGraficaIndicador
            :plot-values="datos.plot_values"
            :plot-config="datos.plot_config"
            :custom-colors="datos.custom_colors"
            :rango-activo-color="rangoActivoColor"
            @hover-rango="onHoverRango"
          />
        </div>
      </div>
    </template>

    <div v-else class="tablero-indicador__vacio">
      <p>Selecciona un indicador para visualizarlo.</p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.tablero-indicador {
  padding: 1rem 2rem;
  max-width: 1400px;
  margin: 0 auto;

  &__encabezado {
    margin-bottom: 1rem;
  }

  &__titulo {
    margin: 0;
    font-size: 1.5rem;
    color: var(--tablero-interface-text, inherit);
  }

  &__info {
    margin: 0.5rem 0 0;
    color: var(--tablero-interface-text, inherit);
    opacity: 0.85;
    font-size: 0.9rem;
  }

  &__visual {
    display: grid;
    // El reparto lo fija el indicador (variables inline); 65/35 es el respaldo.
    // Se expresa en `fr` y no en `%` para que el `gap` no desborde el contenedor.
    // El `minmax(0, …)` no es opcional: un `fr` a secas nunca baja del ancho
    // mínimo del contenido, y la gráfica no se deja encoger, así que se quedaba
    // con el espacio y el mapa recibía las sobras sin importar el porcentaje.
    grid-template-columns:
      minmax(0, var(--map-panel, 65fr))
      minmax(0, var(--plot-panel, 35fr));
    gap: 1rem;
    margin-top: 1rem;
    background: var(--tablero-interface-bg, #ffffff);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

    @media (max-width: 960px) {
      grid-template-columns: 1fr;
    }
  }

  // Sin esto, el contenido de cada celda vuelve a imponer su ancho mínimo y
  // deshace el reparto que fijan las columnas.
  &__mapa,
  &__grafica {
    min-width: 0;
    overflow: hidden;
  }

  &__grafica {
    height: 520px;
  }

  &__vacio {
    text-align: center;
    padding: 3rem;
    color: #999;
  }
}
</style>
