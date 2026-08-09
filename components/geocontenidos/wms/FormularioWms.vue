<script setup>
const props = defineProps({
  valoresIniciales: {
    type: Object,
    default: () => ({}),
  },
  guardando: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['guardar', 'cancelar']);

const formulario = reactive({
  name: '',
  url: '',
  attribution: '',
  wms_or_tile: 'wms',
  wms_layers: '',
  at_start: false,
});

function cargarValores(valores = {}) {
  Object.assign(formulario, {
    name: valores.name || '',
    url: valores.url || '',
    attribution: valores.attribution || '',
    wms_or_tile: valores.wms_or_tile || 'wms',
    wms_layers: valores.wms_layers || '',
    at_start: Boolean(valores.at_start),
  });
}

watch(
  () => props.valoresIniciales,
  (valores) => cargarValores(valores),
  {
    immediate: true,
    deep: true,
  }
);

function enviar() {
  emit('guardar', { ...formulario });
}
</script>

<template>
  <form class="formulario-wms" @submit.prevent="enviar">
    <p v-if="error" class="texto-color-error m-b-4" role="alert">
      {{ error }}
    </p>

    <div class="m-b-4">
      <label for="wms-nombre">Nombre</label>
      <input id="wms-nombre" v-model.trim="formulario.name" type="text" required />
    </div>

    <div class="m-b-4">
      <label for="wms-url">URL del servicio</label>
      <input id="wms-url" v-model.trim="formulario.url" type="url" required />
    </div>

    <div class="m-b-4">
      <label for="wms-attribution">Atribución</label>
      <input id="wms-attribution" v-model.trim="formulario.attribution" type="text" />
    </div>

    <div class="m-b-4">
      <label for="wms-tipo">Tipo</label>
      <select id="wms-tipo" v-model="formulario.wms_or_tile">
        <option value="wms">WMS</option>
        <option value="tile">Tile (XYZ)</option>
      </select>
    </div>

    <div v-if="formulario.wms_or_tile === 'wms'" class="m-b-4">
      <label for="wms-layers">Nombre(s) de capa WMS</label>
      <input id="wms-layers" v-model.trim="formulario.wms_layers" type="text" required />
    </div>

    <div class="m-b-4">
      <input id="wms-inicio" v-model="formulario.at_start" type="checkbox" />
      <label for="wms-inicio">Mostrar al inicio</label>
    </div>

    <div class="flex flex-contenido-final acciones-formulario">
      <button
        type="button"
        class="boton boton-secundario"
        :disabled="guardando"
        @click="emit('cancelar')"
      >
        Cancelar
      </button>

      <button type="submit" class="boton boton-primario" :disabled="guardando">
        {{ guardando ? 'Guardando…' : 'Guardar' }}
      </button>
    </div>
  </form>
</template>

<style lang="scss" scoped>
.formulario-wms {
  width: 100%;
}

.formulario-wms input:not([type='checkbox']),
.formulario-wms select {
  width: 100%;
}

.acciones-formulario {
  gap: 8px;
  flex-wrap: wrap;
}
</style>
