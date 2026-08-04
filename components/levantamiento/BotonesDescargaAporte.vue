<script setup>
const props = defineProps({
  aporteId: { type: [Number, String], required: true },
  email: { type: String, required: true },
});

const store = useLevantamientoStore();
const formatoEnProceso = ref('');
const error = ref('');

const formatos = [
  { value: 'geojson', label: 'GeoJSON' },
  { value: 'kml', label: 'KML' },
  { value: 'shapefile', label: 'Shapefile' },
];

async function descargar(format) {
  if (formatoEnProceso.value || !props.email) return;

  formatoEnProceso.value = format;
  error.value = '';
  try {
    await store.descargarAporte(props.aporteId, format, props.email);
  } catch (e) {
    error.value = e?.data?.message || e?.message || 'No fue posible descargar el aporte.';
  } finally {
    formatoEnProceso.value = '';
  }
}
</script>

<template>
  <div>
    <div class="flex botones-descarga-aporte">
      <button
        v-for="formato in formatos"
        :key="formato.value"
        type="button"
        class="boton-secundario boton-chico"
        :disabled="Boolean(formatoEnProceso)"
        @click="descargar(formato.value)"
      >
        {{ formatoEnProceso === formato.value ? 'Generando…' : formato.label }}
      </button>
    </div>
    <p v-if="error" class="texto-color-error texto-tamanio-1 m-y-1" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.botones-descarga-aporte {
  gap: 8px;
  flex-wrap: wrap;
}
</style>
