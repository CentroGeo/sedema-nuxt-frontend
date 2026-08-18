<script setup>
const store = useLandingBuilderStore();

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);

const modalImagenContenido = ref(null);

let urlTemporal;

const datosPorDefecto = {
  parrafo: {
    texto: 'Escribe aquí la descripción de la sección.',
    color: '#FFFFFF',
  },
  posicionImagen: 'derecha',
  imagen: {
    url: null,
    archivo: null,
    alt: '',
  },
};

function actualizarDatos(cambios) {
  const datosActuales = {
    ...(props.modelValue || {}),
  };

  delete datosActuales.titulo;

  emit('update:modelValue', {
    ...datosPorDefecto,
    ...datosActuales,
    ...cambios,
    parrafo: {
      ...datosPorDefecto.parrafo,
      ...(datosActuales.parrafo || {}),
      ...(cambios.parrafo || {}),
    },
    imagen: {
      ...datosPorDefecto.imagen,
      ...(datosActuales.imagen || {}),
      ...(cambios.imagen || {}),
    },
  });
}

const parrafoModel = computed({
  get() {
    return {
      ...datosPorDefecto.parrafo,
      ...(props.modelValue.parrafo || {}),
    };
  },
  set(valor) {
    actualizarDatos({
      parrafo: valor,
    });
  },
});

const posicionImagen = computed(() => props.modelValue.posicionImagen || 'derecha');

const imagenActual = computed(() => ({
  ...datosPorDefecto.imagen,
  ...(props.modelValue.imagen || {}),
}));

function cambiarPosicionImagen(posicion) {
  actualizarDatos({
    posicionImagen: posicion,
  });
}

function abrirModalImagen() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  modalImagenContenido.value?.abrirModal();
}

function seleccionarArchivo(archivo) {
  if (urlTemporal) {
    URL.revokeObjectURL(urlTemporal);
  }

  urlTemporal = URL.createObjectURL(archivo);

  actualizarDatos({
    imagen: {
      ...imagenActual.value,
      url: urlTemporal,
      archivo,
    },
  });
}

function seleccionarEnlace(enlace) {
  if (urlTemporal) {
    URL.revokeObjectURL(urlTemporal);
    urlTemporal = undefined;
  }

  actualizarDatos({
    imagen: {
      ...imagenActual.value,
      url: enlace,
      archivo: null,
    },
  });
}

function eliminarImagen() {
  if (urlTemporal) {
    URL.revokeObjectURL(urlTemporal);
    urlTemporal = undefined;
  }

  actualizarDatos({
    imagen: {
      ...imagenActual.value,
      url: null,
      archivo: null,
    },
  });
}

onBeforeUnmount(() => {
  if (urlTemporal) {
    URL.revokeObjectURL(urlTemporal);
  }
});
</script>

<template>
  <section class="editor-texto-imagen" :class="`editor-texto-imagen--imagen-${posicionImagen}`">
    <div class="editor-texto-imagen__controles">
      <span class="editor-texto-imagen__controles-etiqueta">Posición de la imagen:</span>

      <div class="editor-texto-imagen__opciones-posicion">
        <button
          type="button"
          class="editor-texto-imagen__boton-posicion"
          :class="{
            'editor-texto-imagen__boton-posicion--activo': posicionImagen === 'izquierda',
          }"
          :aria-pressed="posicionImagen === 'izquierda'"
          @click="cambiarPosicionImagen('izquierda')"
        >
          Imagen a la izquierda
        </button>

        <button
          type="button"
          class="editor-texto-imagen__boton-posicion"
          :class="{
            'editor-texto-imagen__boton-posicion--activo': posicionImagen === 'derecha',
          }"
          :aria-pressed="posicionImagen === 'derecha'"
          @click="cambiarPosicionImagen('derecha')"
        >
          Imagen a la derecha
        </button>
      </div>
    </div>

    <div class="editor-texto-imagen__rejilla">
      <div class="editor-texto-imagen__texto">
        <LandingBuilderEditorParrafo v-model="parrafoModel" />
      </div>

      <div class="editor-texto-imagen__media">
        <div class="editor-texto-imagen__contenedor-imagen">
          <img
            v-if="imagenActual.url"
            class="editor-texto-imagen__imagen"
            :src="store.resolverUrlImagen(imagenActual.url)"
            :alt="imagenActual.alt || ''"
          />

          <div v-else class="editor-texto-imagen__imagen-vacia">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 5.75A1.75 1.75 0 0 1 5.75 4h12.5A1.75 1.75 0 0 1 20 5.75v12.5A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25V5.75ZM4.5 16l4.25-4.25 3.25 3.25 2-2L19.5 18M15.5 8.5h.01"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <p>Agrega una imagen para acompañar el contenido.</p>

            <button
              type="button"
              class="editor-texto-imagen__boton-imagen"
              @click="abrirModalImagen"
            >
              Agregar imagen
            </button>
          </div>

          <div v-if="imagenActual.url" class="editor-texto-imagen__acciones-imagen">
            <button
              type="button"
              class="editor-texto-imagen__boton-imagen"
              @click="abrirModalImagen"
            >
              Cambiar imagen
            </button>

            <button type="button" class="editor-texto-imagen__boton-quitar" @click="eliminarImagen">
              Quitar
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <LandingBuilderModalImagenContenido
    ref="modalImagenContenido"
    @seleccionar-archivo="seleccionarArchivo"
    @seleccionar-enlace="seleccionarEnlace"
  />
</template>

<style scoped lang="scss">
.editor-texto-imagen {
  width: 100%;
  box-sizing: border-box;
  padding: 15px 120px;

  &__controles {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-bottom: 24px;
  }

  &__controles-etiqueta {
    font-size: 0.875rem;
    font-weight: 600;
  }

  &__opciones-posicion {
    display: inline-flex;
    gap: 8px;
  }

  &__boton-posicion {
    min-height: 36px;
    padding: 6px 12px;
    border: 1px solid currentcolor;
    border-radius: 18px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 0.875rem;

    &:hover,
    &:focus-visible,
    &--activo {
      background: rgb(255 255 255 / 14%);
    }

    &--activo {
      font-weight: 700;
    }

    &:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: 2px;
    }
  }

  &__rejilla {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 1fr);
    align-items: center;
    gap: clamp(24px, 4vw, 64px);
  }

  &__texto,
  &__media {
    min-width: 0;
  }

  &__texto {
    display: grid;
    gap: 12px;
  }

  &__media {
    display: flex;
    min-height: 320px;
    align-items: stretch;
  }

  &__contenedor-imagen {
    position: relative;
    display: flex;
    width: 100%;
    min-width: 0;
  }

  &__imagen,
  &__imagen-vacia {
    width: 100%;
    min-height: 320px;
    border-radius: 24px;
  }

  &__imagen {
    display: block;
    max-height: 460px;
    object-fit: cover;
  }

  &__imagen-vacia {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px;
    border: 1px dashed currentcolor;
    opacity: 0.75;
    text-align: center;

    svg {
      width: 48px;
      height: 48px;
    }

    p {
      max-width: 280px;
      margin: 0;
    }
  }

  &__acciones-imagen {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  &__boton-imagen,
  &__boton-quitar {
    min-height: 38px;
    padding: 7px 14px;
    border: 1px solid currentcolor;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;

    &:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: 2px;
    }
  }

  &__boton-imagen {
    background: rgb(65 22 34 / 92%);
    color: white;

    &:hover {
      background: rgb(65 22 34 / 100%);
    }
  }

  &__boton-quitar {
    background: rgb(255 255 255 / 92%);
    color: #411622;

    &:hover {
      background: white;
    }
  }

  &--imagen-izquierda {
    .editor-texto-imagen__media {
      order: 1;
    }

    .editor-texto-imagen__texto {
      order: 2;
    }
  }

  &--imagen-derecha {
    .editor-texto-imagen__texto {
      order: 1;
    }

    .editor-texto-imagen__media {
      order: 2;
    }
  }
}

@media (max-width: 1024px) {
  .editor-texto-imagen {
    padding: 10px 40px;
  }
}

@media (max-width: 767px) {
  .editor-texto-imagen {
    padding: 16px;

    &__acciones-imagen {
      top: 12px;
      right: 12px;
      left: 12px;
    }

    &__boton-imagen,
    &__boton-quitar {
      flex: 1;
    }

    &__controles {
      align-items: flex-start;
      flex-direction: column;
      margin-bottom: 20px;
    }

    &__opciones-posicion {
      width: 100%;
      flex-direction: column;
    }

    &__boton-posicion {
      width: 100%;
    }

    &__rejilla {
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
    }

    &__texto {
      order: 1;
    }

    &__media {
      min-height: 220px;
      order: 2;
    }

    &__imagen,
    &__imagen-vacia {
      min-height: 220px;
      border-radius: 16px;
    }
  }
}
</style>
