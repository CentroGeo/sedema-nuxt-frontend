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

const emit = defineEmits(['seleccionar-imagen', 'seleccionar-enlace']);

const inputArchivo = ref(null);
const arrastrandoArchivo = ref(false);
const error = ref('');

const modo = ref('subir');
const urlEnlace = ref('');
const tipoEnlace = ref('imagen');

const REGEX_EXTENSION_VIDEO = /\.(mp4|webm|ogv|mov)(\?|#|$)/i;

function cambiarModo(nuevoModo) {
  modo.value = nuevoModo;
  error.value = '';
}

function detectarTipoPorUrl() {
  tipoEnlace.value = REGEX_EXTENSION_VIDEO.test(urlEnlace.value.trim()) ? 'video' : 'imagen';
}

function aplicarEnlace() {
  const enlace = urlEnlace.value.trim();

  if (!enlace) {
    error.value = 'Ingresa el enlace de una imagen o video.';
    return;
  }

  try {
    const url = new URL(enlace);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Protocolo no permitido');
    }
  } catch {
    error.value = 'Ingresa un enlace válido que comience con http:// o https://.';
    return;
  }

  error.value = '';
  emit('seleccionar-enlace', { url: enlace, tipo: tipoEnlace.value });
  urlEnlace.value = '';
  modo.value = 'subir';
}

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
    <div class="selector-imagen-carrusel__pestanas" role="tablist" aria-label="Origen de la imagen">
      <button
        type="button"
        role="tab"
        class="selector-imagen-carrusel__pestana"
        :class="{ 'selector-imagen-carrusel__pestana--activa': modo === 'subir' }"
        :aria-selected="modo === 'subir'"
        @click="cambiarModo('subir')"
      >
        Subir
      </button>
      <button
        type="button"
        role="tab"
        class="selector-imagen-carrusel__pestana"
        :class="{ 'selector-imagen-carrusel__pestana--activa': modo === 'enlace' }"
        :aria-selected="modo === 'enlace'"
        @click="cambiarModo('enlace')"
      >
        Enlace
      </button>
    </div>

    <div v-if="modo === 'enlace'" class="selector-imagen-carrusel__enlace">
      <input
        v-model.trim="urlEnlace"
        type="url"
        placeholder="https://ejemplo.com/imagen.jpg"
        @blur="detectarTipoPorUrl"
        @keyup.enter="aplicarEnlace"
      />

      <div class="selector-imagen-carrusel__tipo-enlace">
        <button
          type="button"
          class="selector-imagen-carrusel__boton-tipo"
          :class="{ 'selector-imagen-carrusel__boton-tipo--activo': tipoEnlace === 'imagen' }"
          :aria-pressed="tipoEnlace === 'imagen'"
          @click="tipoEnlace = 'imagen'"
        >
          Imagen
        </button>
        <button
          type="button"
          class="selector-imagen-carrusel__boton-tipo"
          :class="{ 'selector-imagen-carrusel__boton-tipo--activo': tipoEnlace === 'video' }"
          :aria-pressed="tipoEnlace === 'video'"
          @click="tipoEnlace = 'video'"
        >
          Video
        </button>
      </div>

      <button type="button" class="boton-secundario boton-chico" @click="aplicarEnlace">
        Usar enlace
      </button>
    </div>

    <div
      v-else-if="imagenUrl"
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
  &__pestanas {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }

  &__pestana {
    padding: 4px 12px;
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }

    &--activa {
      opacity: 1;
      font-weight: 600;
      border-bottom-color: currentcolor;
    }
  }

  &__enlace {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px dashed rgb(255 255 255 / 40%);
    border-radius: 10px;

    input {
      width: 100%;
      box-sizing: border-box;
    }
  }

  &__tipo-enlace {
    display: inline-flex;
    gap: 8px;
  }

  &__boton-tipo {
    padding: 4px 12px;
    border: 1px solid rgb(255 255 255 / 30%);
    background: transparent;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    color: inherit;
    cursor: pointer;

    &--activo {
      background: rgb(255 255 255 / 20%);
      border-color: rgb(255 255 255 / 60%);
    }
  }

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
