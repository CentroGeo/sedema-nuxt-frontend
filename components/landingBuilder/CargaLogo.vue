<script setup>
const store = useLandingBuilderStore();

const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const TAMANO_MAXIMO = 2 * 1024 * 1024; // 2MB

defineProps({
  logoUrl: {
    type: String,
    default: null,
  },
  label: {
    type: String,
    default: 'Logo de la plataforma',
  },
});
const emit = defineEmits(['seleccionar-logo']);

const dragNdrop = ref(null);
const mensajeError = ref('');

function manejarArchivos(archivos) {
  const archivo = archivos?.[0];
  if (!archivo) return;

  mensajeError.value = '';

  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    mensajeError.value = 'El logo debe ser una imagen PNG, JPEG, WEBP o SVG.';
    dragNdrop.value?.archivoNoValido();
    return;
  }
  if (archivo.size > TAMANO_MAXIMO) {
    mensajeError.value = 'El logo no debe superar 2MB.';
    dragNdrop.value?.archivoNoValido();
    return;
  }

  emit('seleccionar-logo', archivo);
}
</script>

<template>
  <div>
    <label class="m-0">{{ label }}</label>
    <div v-if="logoUrl" class="m-y-2">
      <img
        :src="store.resolverUrlImagen(logoUrl)"
        :alt="`Previsualización de ${label}`"
        style="max-height: 96px"
      />
    </div>
    <ClientOnly>
      <CatalogoElementoDragNdDrop ref="dragNdrop" @pasar-archivo="manejarArchivos" />
    </ClientOnly>
    <p v-if="mensajeError" class="texto-color-error">{{ mensajeError }}</p>
  </div>
</template>
