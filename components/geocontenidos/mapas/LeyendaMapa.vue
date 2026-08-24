<script setup>
import { computed, reactive, ref } from 'vue';

const props = defineProps({
  capas: {
    type: Array,
    default: () => [],
  },
  geoserverUrl: {
    type: String,
    required: true,
  },
});

const { gnoxyUrl } = useGnoxyUrl();

const abierto = ref(false);
const erroresLeyenda = reactive({});

// Capas con identificador WMS, ordenadas de arriba hacia abajo.
const capasConLeyenda = computed(() =>
  [...props.capas]
    .filter((capa) => capa.wms_layer_name || capa.name)
    .sort((a, b) => b.stack_order - a.stack_order)
);

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

  return `${props.geoserverUrl}/wms`;
}

function agregarParametros(url, params) {
  const separador = url.includes('?') ? (url.endsWith('?') || url.endsWith('&') ? '' : '&') : '?';

  return `${url}${separador}${params.toString()}`;
}

function leyendaUrl(capa) {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetLegendGraphic',
    VERSION: '1.0.0',
    FORMAT: 'image/png',
    LAYER: nombreCapaWms(capa),
    LEGEND_OPTIONS: 'forceLabels:on;fontAntiAliasing:true',
  });

  if (capa.style) {
    params.set('STYLE', capa.style);
  }

  return gnoxyUrl(agregarParametros(fuenteCapaWms(capa), params));
}

function marcarErrorLeyenda(capa) {
  erroresLeyenda[capa.id] = true;
}

function limpiarErrorLeyenda(capa) {
  delete erroresLeyenda[capa.id];
}

function alternar() {
  abierto.value = !abierto.value;
}
</script>

<template>
  <div class="leyenda-control">
    <div v-if="abierto" class="leyenda-panel">
      <div class="leyenda-encabezado flex flex-contenido-separado">
        <strong>Leyenda</strong>
        <button class="leyenda-cerrar" type="button" aria-label="Cerrar leyenda" @click="alternar">
          <span class="pictograma-tache" aria-hidden="true" />
        </button>
      </div>
      <p v-if="!capasConLeyenda.length" class="leyenda-vacia">Este mapa no tiene capas.</p>
      <ul v-else class="leyenda-lista">
        <li v-for="capa in capasConLeyenda" :key="capa.id" class="leyenda-item">
          <span class="leyenda-titulo">{{ capa.dataset_title || capa.name }}</span>
          <img
            v-show="!erroresLeyenda[capa.id]"
            :src="leyendaUrl(capa)"
            :alt="`Leyenda de ${capa.dataset_title || capa.name}`"
            loading="lazy"
            @load="limpiarErrorLeyenda(capa)"
            @error="marcarErrorLeyenda(capa)"
          />
          <p v-if="erroresLeyenda[capa.id]" class="leyenda-error">
            El servicio no proporcionó una leyenda disponible.
          </p>
        </li>
      </ul>
    </div>

    <button
      class="leyenda-boton sisdai-mapa-control-boton"
      type="button"
      :aria-pressed="abierto"
      aria-label="Mostrar leyenda"
      title="Leyenda"
      @click="alternar"
    >
      <span class="pictograma-menu" aria-hidden="true"></span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.leyenda-control {
  position: absolute;
  bottom: 42px;
  left: 8px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.leyenda-boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  background-color: var(--boton-primario-fondo);
  color: var(--boton-primario-color);

  &:hover,
  &:focus-visible {
    background-color: var(--boton-primario-cursor-fondo);
    color: var(--boton-primario-cursor-color);
  }
}

.leyenda-panel {
  width: 240px;
  max-height: calc(var(--altura-visor, 60vh) - 80px);
  overflow-y: auto;
  background-color: var(--fondo);
  color: var(--texto-primario);
  border: 1px solid var(--borde-secundario);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(var(--color-neutro-7-rgb), 0.25);
  padding: 8px 10px;
}

.leyenda-encabezado {
  align-items: center;
  margin-bottom: 6px;
}

.leyenda-cerrar {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 2px;
  line-height: 1;
  color: var(--texto-secundario);
}

.leyenda-vacia {
  margin: 0;
  font-size: 0.8rem;
  color: var(--texto-secundario);
}

.leyenda-lista {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leyenda-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.leyenda-titulo {
  font-size: 0.8rem;
  font-weight: 600;
  word-break: break-word;
}

.leyenda-item img {
  align-self: flex-start;
  width: auto;
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.leyenda-error {
  margin: 0;
  font-size: 0.75rem;
  color: var(--texto-secundario);
}

.flex {
  display: flex;
  gap: 8px;
}

.flex-contenido-separado {
  justify-content: space-between;
}
</style>
