<script setup>
import { SisdaiCapaWms, SisdaiCapaXyz } from '@centrogeomx/sisdai-mapas';

defineProps({
  configuracion: {
    type: Object,
    required: true,
  },
  posicion: {
    type: Number,
    required: true,
  },
  lado: {
    type: String,
    default: undefined,
  },
});

const emit = defineEmits(['iniciar-carga', 'finalizar-carga']);

const { gnoxyFetch } = useGnoxyUrl();

const consultaExterna = (url) => gnoxyFetch(url);
</script>

<template>
  <SisdaiCapaWms
    v-if="configuracion.wms_or_tile === 'wms'"
    :fuente="configuracion.url"
    :capa="configuracion.wms_layers"
    :posicion="posicion"
    :lado="lado"
    :opacidad="configuracion.opacity ?? 1"
    :consulta="consultaExterna"
    @al-iniciar-carga="emit('iniciar-carga')"
    @al-finalizar-carga="(cargaExitosa) => emit('finalizar-carga', cargaExitosa)"
  />

  <SisdaiCapaXyz
    v-else
    :fuente="configuracion.url"
    :posicion="posicion"
    :lado="lado"
    :opacidad="configuracion.opacity ?? 1"
  />
</template>
