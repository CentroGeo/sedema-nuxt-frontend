<script setup>
const store = useLandingBuilderStore();

const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const TIPOS_VIDEO_PERMITIDOS = ['video/mp4', 'video/webm'];
const TIPOS_PERMITIDOS = [...TIPOS_IMAGEN_PERMITIDOS, ...TIPOS_VIDEO_PERMITIDOS];
const TAMANO_MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024;
const TAMANO_MAXIMO_VIDEO_BYTES = 15 * 1024 * 1024;

defineProps({
  imagenUrl: {
    type: String,
    default: null,
  },
  imagenTipo: {
    type: String,
    default: 'imagen',
  },
});

const emit = defineEmits(['seleccionar-imagen']);

const inputArchivo = ref(null);
const arrastrandoArchivo = ref(false);
const error = ref('');

function abrirSelectorArchivos() {
  inputArchivo.value?.click();
}

function activarArrastre() {
  arrastrandoArchivo.value = true;
}

function desactivarArrastre() {
  arrastrandoArchivo.value = false;
}

function procesarArchivo(archivo) {
  if (!archivo) return;

  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    error.value = 'Selecciona una imagen JPG, PNG, WEBP, SVG o un video MP4/WEBM.';
    return;
  }

  const esVideo = TIPOS_VIDEO_PERMITIDOS.includes(archivo.type);
  const limite = esVideo ? TAMANO_MAXIMO_VIDEO_BYTES : TAMANO_MAXIMO_IMAGEN_BYTES;

  if (archivo.size > limite) {
    error.value = esVideo
      ? 'El video no puede pesar más de 15 MB.'
      : 'La imagen no puede pesar más de 5 MB.';
    return;
  }

  error.value = '';
  emit('seleccionar-imagen', archivo);
}

function seleccionarArchivo(event) {
  procesarArchivo(event.target.files?.[0]);

  if (event.target) {
    event.target.value = '';
  }
}

function soltarArchivo(event) {
  arrastrandoArchivo.value = false;
  procesarArchivo(event.dataTransfer?.files?.[0]);
}
</script>

<template>
  <div class="selector-imagen-carrusel">
    <div
      v-if="imagenUrl"
      class="selector-imagen-carrusel__previsualizacion"
      role="button"
      tabindex="0"
      aria-label="Cambiar imagen de la diapositiva"
      title="Cambiar imagen"
      @click="abrirSelectorArchivos"
      @keydown.enter.prevent="abrirSelectorArchivos"
      @keydown.space.prevent="abrirSelectorArchivos"
    >
      <input
        ref="inputArchivo"
        class="selector-imagen-carrusel__input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml,video/mp4,video/webm"
        @change="seleccionarArchivo"
      />

      <video v-if="imagenTipo === 'video'" autoplay loop muted playsinline>
        <source :src="store.resolverUrlImagen(imagenUrl)" type="video/mp4" />
      </video>
      <img v-else :src="store.resolverUrlImagen(imagenUrl)" alt="Imagen de la diapositiva" />

      <span class="selector-imagen-carrusel__superponer" aria-hidden="true">
        <span class="pictograma-archivo-subir pictograma-chico" />
        Cambiar imagen o video
      </span>
    </div>

    <div
      v-else
      class="selector-imagen-carrusel__zona"
      :class="{ 'selector-imagen-carrusel__zona--activa': arrastrandoArchivo }"
      role="button"
      tabindex="0"
      aria-label="Arrastra o selecciona una imagen para la diapositiva"
      @click="abrirSelectorArchivos"
      @keydown.enter.prevent="abrirSelectorArchivos"
      @keydown.space.prevent="abrirSelectorArchivos"
      @dragenter.prevent="activarArrastre"
      @dragover.prevent="activarArrastre"
      @dragleave.prevent="desactivarArrastre"
      @drop.prevent="soltarArchivo"
    >
      <input
        ref="inputArchivo"
        class="selector-imagen-carrusel__input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml,video/mp4,video/webm"
        @change="seleccionarArchivo"
      />

      <span class="pictograma-archivo-subir pictograma-mediano" aria-hidden="true" />
      <p class="selector-imagen-carrusel__indicacion">Arrastra o elige una imagen o video</p>
    </div>

    <p v-if="error" class="texto-color-error">{{ error }}</p>
  </div>
</template>

<style scoped lang="scss">
.selector-imagen-carrusel {
  &__previsualizacion {
    position: relative;
    overflow: hidden;
    border-radius: 10px;
    cursor: pointer;

    img,
    video {
      display: block;
      width: 100%;
      height: 140px;
      object-fit: cover;
    }

    &:hover,
    &:focus-visible {
      .selector-imagen-carrusel__superponer {
        opacity: 1;
      }
    }

    &:focus-visible {
      outline: 2px solid white;
      outline-offset: -2px;
    }
  }

  &__superponer {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: rgb(0 0 0 / 55%);
    color: white;
    font-size: 0.8125rem;
    font-weight: 600;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }

  &__zona {
    display: flex;
    min-height: 140px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    border: 1px dashed rgb(255 255 255 / 40%);
    border-radius: 10px;
    background: rgb(255 255 255 / 4%);
    text-align: center;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease;

    &:hover,
    &:focus-visible,
    &--activa {
      border-color: rgb(255 255 255 / 75%);
      background: rgb(255 255 255 / 8%);
    }

    &:focus-visible {
      outline: 2px solid white;
      outline-offset: 3px;
    }
  }

  &__input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }

  &__indicacion {
    margin: 8px 0 0;
    color: var(--texto-secundario);
    font-size: 0.875rem;
  }
}
</style>
