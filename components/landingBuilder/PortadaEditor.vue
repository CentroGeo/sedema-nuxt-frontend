<script setup>
const store = useLandingBuilderStore();
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);

const datosInicialesPortada = {
  titulo: 'Constructor de landing page',
  subtitulo:
    'Personaliza los textos, el logotipo y la información principal que se mostrará en la página de inicio.',
  colorTitulo: '#FFFFFF',
  colorSubtitulo: '#FFFFFF',
  fondo: {
    tipo: 'video',
    url: '/inicio/Portada_SIGIC_1_1.mp4',
  },
  posicionFondo: {
    x: 50,
    y: 50,
  },
  posicionFondoGuardada: {
    x: 50,
    y: 50,
  },
};

const datosPortada = {
  ...datosInicialesPortada,
  ...props.modelValue,
  fondo: {
    ...datosInicialesPortada.fondo,
    ...props.modelValue.fondo,
  },
  posicionFondo: {
    ...datosInicialesPortada.posicionFondo,
    ...props.modelValue.posicionFondo,
  },
  posicionFondoGuardada: {
    ...datosInicialesPortada.posicionFondoGuardada,
    ...props.modelValue.posicionFondoGuardada,
  },
};

const modalCambiarPortada = ref(null);
const modalEditarTextoPortada = ref(null);
const portadaEditor = ref(null);
const mostrarAcciones = ref(false);
const reposicionando = ref(false);
const arrastrandoFondo = ref(false);

const posicionFondo = ref({
  ...datosPortada.posicionFondo,
});

const posicionFondoGuardada = ref({
  ...datosPortada.posicionFondoGuardada,
});

const inicioArrastre = ref({
  punteroX: 0,
  punteroY: 0,
  posicionX: 50,
  posicionY: 50,
});

const tituloPortada = ref(datosPortada.titulo);
const subtituloPortada = ref(datosPortada.subtitulo);
const colorTituloPortada = ref(datosPortada.colorTitulo);
const colorSubtituloPortada = ref(datosPortada.colorSubtitulo);

const fondoActual = ref({
  ...datosPortada.fondo,
});

let urlTemporal;

const nombreArchivoDescarga = computed(() => {
  const urlSinParametros = fondoActual.value.url.split('?')[0];
  const nombreOriginal = urlSinParametros.split('/').pop();

  if (nombreOriginal?.includes('.')) {
    return nombreOriginal;
  }

  return fondoActual.value.tipo === 'video' ? 'portada-sigic.mp4' : 'portada-sigic.jpg';
});

const estiloFondo = computed(() => ({
  objectPosition: `${posicionFondo.value.x}% ${posicionFondo.value.y}%`,
}));

function emitirCambiosPortada() {
  emit('update:modelValue', {
    titulo: tituloPortada.value,
    subtitulo: subtituloPortada.value,
    colorTitulo: colorTituloPortada.value,
    colorSubtitulo: colorSubtituloPortada.value,
    fondo: {
      ...fondoActual.value,
    },
    posicionFondo: {
      ...posicionFondo.value,
    },
    posicionFondoGuardada: {
      ...posicionFondoGuardada.value,
    },
  });
}

watch(
  [
    tituloPortada,
    subtituloPortada,
    colorTituloPortada,
    colorSubtituloPortada,
    fondoActual,
    posicionFondo,
    posicionFondoGuardada,
  ],
  emitirCambiosPortada,
  {
    deep: true,
  }
);

function esDispositivoTactil() {
  return import.meta.client && window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

function mostrarAccionesConPuntero(event) {
  if (!reposicionando.value && event.pointerType === 'mouse') {
    mostrarAcciones.value = true;
  }
}

function ocultarAccionesConPuntero(event) {
  if (!reposicionando.value && event.pointerType === 'mouse') {
    mostrarAcciones.value = false;
  }
}

function alternarAccionesPortada() {
  if (!reposicionando.value && esDispositivoTactil()) {
    mostrarAcciones.value = !mostrarAcciones.value;
  }
}

function mostrarAccionesConTeclado() {
  if (!reposicionando.value) {
    mostrarAcciones.value = true;
  }
}

function ocultarAccionesConTeclado(event) {
  const siguienteElemento = event.relatedTarget;

  if (!(siguienteElemento instanceof Node) || !portadaEditor.value?.contains(siguienteElemento)) {
    mostrarAcciones.value = false;
  }
}

function abrirModalCambiarPortada() {
  mostrarAcciones.value = false;

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  modalCambiarPortada.value?.abrirModal();
}

function abrirModalEditarTextoPortada() {
  mostrarAcciones.value = false;

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  modalEditarTextoPortada.value?.abrirModal({
    titulo: tituloPortada.value,
    subtitulo: subtituloPortada.value,
    colorTitulo: colorTituloPortada.value,
    colorSubtitulo: colorSubtituloPortada.value,
  });
}

function guardarTextosPortada(valores) {
  tituloPortada.value = valores.titulo;
  subtituloPortada.value = valores.subtitulo;
  colorTituloPortada.value = valores.colorTitulo;
  colorSubtituloPortada.value = valores.colorSubtitulo;
}

function limitarValor(valor, minimo, maximo) {
  return Math.min(Math.max(valor, minimo), maximo);
}

function iniciarReposicionamiento() {
  posicionFondoGuardada.value = {
    ...posicionFondo.value,
  };

  mostrarAcciones.value = false;
  reposicionando.value = true;
}

function iniciarArrastreFondo(event) {
  if (!reposicionando.value) return;

  const elementoInteractivo = event.target.closest('button, a');

  if (elementoInteractivo) return;

  event.preventDefault();

  arrastrandoFondo.value = true;

  inicioArrastre.value = {
    punteroX: event.clientX,
    punteroY: event.clientY,
    posicionX: posicionFondo.value.x,
    posicionY: posicionFondo.value.y,
  };

  event.currentTarget?.setPointerCapture?.(event.pointerId);
}

function moverFondo(event) {
  if (!reposicionando.value || !arrastrandoFondo.value) return;

  event.preventDefault();

  const contenedor = portadaEditor.value?.getBoundingClientRect();

  if (!contenedor?.width || !contenedor?.height) return;

  const desplazamientoX = event.clientX - inicioArrastre.value.punteroX;
  const desplazamientoY = event.clientY - inicioArrastre.value.punteroY;

  posicionFondo.value = {
    x: limitarValor(
      inicioArrastre.value.posicionX - (desplazamientoX / contenedor.width) * 100,
      0,
      100
    ),
    y: limitarValor(
      inicioArrastre.value.posicionY - (desplazamientoY / contenedor.height) * 100,
      0,
      100
    ),
  };
}

function terminarArrastreFondo(event) {
  if (!arrastrandoFondo.value) return;

  arrastrandoFondo.value = false;

  if (event.currentTarget?.hasPointerCapture?.(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}

function guardarPosicionFondo() {
  posicionFondoGuardada.value = {
    ...posicionFondo.value,
  };

  arrastrandoFondo.value = false;
  reposicionando.value = false;
  mostrarAcciones.value = false;
}

function cancelarReposicionamiento() {
  posicionFondo.value = {
    ...posicionFondoGuardada.value,
  };

  arrastrandoFondo.value = false;
  reposicionando.value = false;
  mostrarAcciones.value = false;
}

function restablecerPosicionFondo() {
  posicionFondo.value = {
    x: 50,
    y: 50,
  };

  posicionFondoGuardada.value = {
    x: 50,
    y: 50,
  };
}

function seleccionarArchivo(archivo) {
  if (urlTemporal) {
    URL.revokeObjectURL(urlTemporal);
  }

  urlTemporal = URL.createObjectURL(archivo);

  fondoActual.value = {
    tipo: 'imagen',
    url: urlTemporal,
    archivo,
  };

  restablecerPosicionFondo();
}

function seleccionarEnlace(enlace) {
  if (urlTemporal) {
    URL.revokeObjectURL(urlTemporal);
    urlTemporal = undefined;
  }

  fondoActual.value = {
    tipo: 'imagen',
    url: enlace,
    archivo: null,
  };

  restablecerPosicionFondo();
}

onBeforeUnmount(() => {
  if (urlTemporal) {
    URL.revokeObjectURL(urlTemporal);
  }
});
</script>

<template>
  <section
    ref="portadaEditor"
    class="portada-editor"
    :class="{
      'portada-editor--acciones-visibles': mostrarAcciones,
      'portada-editor--reposicionando': reposicionando,
      'portada-editor--arrastrando': arrastrandoFondo,
    }"
    aria-labelledby="landing-builder-titulo"
    @pointerenter="mostrarAccionesConPuntero"
    @pointerleave="ocultarAccionesConPuntero"
    @pointerdown="iniciarArrastreFondo"
    @pointermove="moverFondo"
    @pointerup="terminarArrastreFondo"
    @pointercancel="terminarArrastreFondo"
    @click="alternarAccionesPortada"
    @focusin="mostrarAccionesConTeclado"
    @focusout="ocultarAccionesConTeclado"
  >
    <video
      v-if="fondoActual.tipo === 'video'"
      aria-hidden="true"
      role="presentation"
      class="portada-editor__media"
      :style="estiloFondo"
      autoplay
      loop
      muted
      playsinline
    >
      <source :src="store.resolverUrlImagen(fondoActual.url)" type="video/mp4" />
    </video>

    <img
      v-else
      class="portada-editor__media"
      :src="store.resolverUrlImagen(fondoActual.url)"
      :style="estiloFondo"
      alt=""
      draggable="false"
    />

    <div class="portada-editor__degradado">
      <div v-if="!reposicionando" class="portada-editor__acciones">
        <button
          type="button"
          class="portada-editor__accion portada-editor__accion--texto"
          @click.stop="abrirModalCambiarPortada"
        >
          Cambiar
        </button>

        <button
          type="button"
          class="portada-editor__accion portada-editor__accion--texto"
          @click.stop="iniciarReposicionamiento"
        >
          Reposicionar
        </button>

        <a
          :href="fondoActual.url"
          :download="nombreArchivoDescarga"
          class="portada-editor__accion portada-editor__accion--icono"
          aria-label="Descargar fondo actual"
          title="Descargar fondo actual"
          @click.stop
        >
          <svg class="portada-editor__icono-descarga" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </a>
      </div>

      <div v-else class="portada-editor__acciones-reposicion">
        <button
          type="button"
          class="portada-editor__accion portada-editor__accion--texto"
          @click.stop="guardarPosicionFondo"
        >
          Guardar posición
        </button>

        <button
          type="button"
          class="portada-editor__accion portada-editor__accion--texto"
          @click.stop="cancelarReposicionamiento"
        >
          Cancelar
        </button>
      </div>

      <div v-if="!reposicionando" class="portada-editor__contenido">
        <h1
          id="landing-builder-titulo"
          :style="{
            color: colorTituloPortada,
            textShadow: calcularSombraTexto(colorTituloPortada),
          }"
        >
          {{ tituloPortada }}
        </h1>

        <p
          :style="{
            color: colorSubtituloPortada,
            textShadow: calcularSombraTexto(colorSubtituloPortada),
          }"
        >
          {{ subtituloPortada }}
        </p>

        <button
          type="button"
          class="portada-editor__editar"
          @click.stop="abrirModalEditarTextoPortada"
        >
          <span>Editar</span>

          <svg class="portada-editor__icono-editar" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
      <div v-else class="portada-editor__ayuda-reposicion" aria-live="polite">
        Arrastra la imagen para reposicionarla
      </div>
    </div>

    <LandingBuilderModalCambiarPortada
      ref="modalCambiarPortada"
      @seleccionar-archivo="seleccionarArchivo"
      @seleccionar-enlace="seleccionarEnlace"
    />

    <LandingBuilderModalEditarTextoPortada
      ref="modalEditarTextoPortada"
      @guardar-textos="guardarTextosPortada"
    />
  </section>
</template>

<style scoped lang="scss">
.portada-editor {
  position: relative;
  min-height: clamp(320px, 52vh, 580px);
  overflow: hidden;

  &--reposicionando {
    cursor: grab;
    touch-action: none;
    user-select: none;
  }

  &--arrastrando {
    cursor: grabbing;
  }

  &__media {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__degradado {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    // Oscurece de forma pareja en todo el marco (no solo abajo) para que el
    // texto centrado siga siendo legible incluso sobre imágenes con mucho
    // detalle/contraste propio, no solo fotografías uniformes.
    background: linear-gradient(
      180deg,
      rgb(0 0 0 / 45%) 0%,
      rgb(0 0 0 / 55%) 50%,
      rgb(0 0 0 / 70%) 100%
    );
  }

  &__acciones {
    position: absolute;
    top: 24px;
    right: 24px;
    z-index: 2;
    display: flex;
    align-items: stretch;
    border: 1px solid rgb(255 255 255 / 24%);
    background: rgb(105 28 50 / 52%);
    box-shadow: 0 6px 18px rgb(0 0 0 / 18%);
    backdrop-filter: blur(12px) saturate(120%);
    -webkit-backdrop-filter: blur(12px) saturate(120%);
    overflow: hidden;
    border-radius: 6px;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-6px);
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
  }

  &__acciones-reposicion {
    position: absolute;
    top: 24px;
    right: 24px;
    z-index: 3;
    display: flex;
    align-items: stretch;
    overflow: hidden;
    border: 1px solid rgb(255 255 255 / 24%);
    border-radius: 6px;
    background: rgb(105 28 50 / 68%);
    box-shadow: 0 6px 18px rgb(0 0 0 / 18%);
    backdrop-filter: blur(12px) saturate(120%);
    -webkit-backdrop-filter: blur(12px) saturate(120%);
  }

  &__ayuda-reposicion {
    position: relative;
    z-index: 2;
    max-width: 260px;
    padding: 10px 16px;
    border: 1px solid rgb(255 255 255 / 18%);
    border-radius: 6px;
    background: rgb(0 0 0 / 48%);
    box-shadow: 0 6px 18px rgb(0 0 0 / 20%);
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: center;
    pointer-events: none;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  &--acciones-visibles &__acciones,
  &--acciones-visibles &__editar {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  &__icono-descarga {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  &__accion {
    display: inline-flex;
    min-height: 34px;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: white;
    font: inherit;
    font-size: 0.75rem;
    line-height: 1;
    text-decoration: none;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      color 0.2s ease;

    &:hover,
    &:focus-visible {
      background: rgb(105 28 50 / 82%);
      color: white;
    }

    &:focus-visible {
      outline: 2px solid white;
      outline-offset: -3px;
    }
  }

  &__accion + &__accion {
    border-left: 1px solid rgb(255 255 255 / 18%);
  }

  &__accion--texto {
    padding: 6px 10px;
  }

  &__accion--icono {
    width: 34px;
    padding: 6px;
  }

  &__editar {
    display: inline-flex;
    min-height: 34px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 18px;
    padding: 6px 10px;
    border: 1px solid rgb(255 255 255 / 24%);
    border-radius: 5px;
    opacity: 0;
    background: rgb(105 28 50 / 52%);
    box-shadow: 0 6px 18px rgb(0 0 0 / 18%);
    color: white;
    font: inherit;
    font-size: 0.75rem;
    line-height: 1;
    cursor: pointer;
    pointer-events: none;
    transform: translateY(6px);
    backdrop-filter: blur(12px) saturate(120%);
    -webkit-backdrop-filter: blur(12px) saturate(120%);
    transition:
      opacity 0.2s ease,
      background-color 0.2s ease,
      transform 0.2s ease;

    &:hover,
    &:focus-visible {
      background: rgb(105 28 50 / 82%);
    }

    &:focus-visible {
      outline: 2px solid white;
      outline-offset: 3px;
    }
  }

  &__icono-editar {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }

  &__contenido {
    width: min(820px, 100%);
    color: white;
    text-align: center;

    h1 {
      margin: 0 0 16px;
    }

    p {
      max-width: 680px;
      margin: 0 auto;
      font-size: 1.125rem;
    }
  }
}

@media (max-width: 767px) {
  .portada-editor {
    min-height: 420px;

    &__degradado {
      padding: 72px 20px 24px;
    }

    &__acciones {
      top: 12px;
      right: 12px;
    }

    &__accion {
      min-height: 34px;
      font-size: 0.75rem;
    }

    &__accion--texto {
      padding: 6px 10px;
    }

    &__accion--icono {
      width: 34px;
      padding: 6px;
    }

    &__editar {
      min-height: 34px;
      margin-top: 16px;
      padding: 6px 10px;
      font-size: 0.75rem;
    }

    &__contenido p {
      font-size: 1rem;
    }

    &__acciones-reposicion {
      top: 12px;
      right: 12px;
    }

    &__ayuda-reposicion {
      max-width: 220px;
      padding: 8px 12px;
      font-size: 0.75rem;
    }
  }
}
</style>
