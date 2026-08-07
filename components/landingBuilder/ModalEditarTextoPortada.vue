<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const emit = defineEmits(['guardar-textos']);

const modalEditarTexto = ref(null);
const inputTitulo = ref(null);

const titulo = ref('');
const subtitulo = ref('');
const colorTitulo = ref('#FFFFFF');
const colorSubtitulo = ref('#FFFFFF');

const PATRON_COLOR_HEX = /^#[0-9A-F]{6}$/i;
const error = ref('');

const LIMITE_TITULO = 80;
const LIMITE_SUBTITULO = 180;

function abrirModal(valores = {}) {
  titulo.value = valores.titulo || '';
  subtitulo.value = valores.subtitulo || '';
  colorTitulo.value = valores.colorTitulo || '#FFFFFF';
  colorSubtitulo.value = valores.colorSubtitulo || '#FFFFFF';
  error.value = '';

  modalEditarTexto.value?.abrirModal();

  nextTick(() => {
    inputTitulo.value?.focus();
  });
}

function cerrarModal() {
  modalEditarTexto.value?.cerrarModal?.();
}

function cerrarModalAlClickAfuera(event) {
  const contenedor = document.querySelector('.modal-editar-texto .modal-contenedor');

  if (!contenedor) return;

  const dialogo = contenedor.closest('dialog');

  if (dialogo && !dialogo.open) return;

  if (!contenedor.contains(event.target)) {
    cerrarModal();
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', cerrarModalAlClickAfuera);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', cerrarModalAlClickAfuera);
});

function guardarTextos() {
  const tituloLimpio = titulo.value.trim();
  const subtituloLimpio = subtitulo.value.trim();

  if (!PATRON_COLOR_HEX.test(colorTitulo.value)) {
    error.value = 'El color del título debe tener el formato #RRGGBB.';
    return;
  }

  if (!PATRON_COLOR_HEX.test(colorSubtitulo.value)) {
    error.value = 'El color del subtítulo debe tener el formato #RRGGBB.';
    return;
  }

  error.value = '';

  emit('guardar-textos', {
    titulo: tituloLimpio,
    subtitulo: subtituloLimpio,
    colorTitulo: colorTitulo.value.toUpperCase(),
    colorSubtitulo: colorSubtitulo.value.toUpperCase(),
  });

  cerrarModal();
}

defineExpose({
  abrirModal,
});
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modalEditarTexto" class="modal-editar-texto">
      <template #encabezado>
        <div class="modal-editar-texto__encabezado">
          <div>
            <h2 class="modal-editar-texto__titulo">Editar contenido</h2>
            <p class="modal-editar-texto__descripcion">
              Cambia el título y el texto descriptivo de la portada.
            </p>
          </div>

          <button
            type="button"
            class="modal-editar-texto__cerrar"
            aria-label="Cerrar modal"
            title="Cerrar"
            @click="cerrarModal"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6 6 18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </template>

      <template #cuerpo>
        <form class="modal-editar-texto__formulario" @submit.prevent="guardarTextos">
          <div class="modal-editar-texto__campo">
            <div class="modal-editar-texto__etiqueta">
              <label for="portada-titulo">Título</label>

              <span aria-live="polite"> {{ titulo.length }}/{{ LIMITE_TITULO }} </span>
            </div>

            <input
              id="portada-titulo"
              ref="inputTitulo"
              v-model="titulo"
              type="text"
              :maxlength="LIMITE_TITULO"
              placeholder="Escribe el título principal"
              autocomplete="off"
            />

            <LandingBuilderSelectorColorHex
              id="portada-color-titulo"
              v-model="colorTitulo"
              etiqueta="Color del título"
            />
          </div>

          <div class="modal-editar-texto__campo">
            <div class="modal-editar-texto__etiqueta">
              <label for="portada-subtitulo">Subtítulo</label>

              <span aria-live="polite"> {{ subtitulo.length }}/{{ LIMITE_SUBTITULO }} </span>
            </div>

            <textarea
              id="portada-subtitulo"
              v-model="subtitulo"
              :maxlength="LIMITE_SUBTITULO"
              rows="3"
              placeholder="Escribe el texto descriptivo de la portada"
            />

            <LandingBuilderSelectorColorHex
              id="portada-color-subtitulo"
              v-model="colorSubtitulo"
              etiqueta="Color del subtítulo"
            />
          </div>

          <p v-if="error" class="texto-color-error modal-editar-texto__error" role="alert">
            {{ error }}
          </p>

          <div class="modal-editar-texto__acciones">
            <button type="button" class="boton-secundario boton-chico" @click="cerrarModal">
              Cancelar
            </button>

            <button type="submit" class="boton-primario boton-chico">Guardar cambios</button>
          </div>
        </form>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>

<style scoped lang="scss">
.modal-editar-texto {
  :deep(.modal-contenedor) {
    width: min(600px, calc(100vw - 32px));
    max-width: 100%;
    max-height: none;
    box-sizing: border-box;
    overflow: hidden;
  }

  :deep(.modal-cabecera),
  :deep(.modal-cuerpo) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  :deep(.modal-cabecera) {
    padding-bottom: 8px;
  }

  :deep(.modal-cuerpo) {
    max-height: none;
    overflow: visible;
  }

  &__encabezado {
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  &__titulo {
    margin: 0;
    font-size: 1.125rem;
    line-height: 1.25;
  }

  &__descripcion {
    margin: 4px 0 0;
    color: var(--texto-secundario);
    font-size: 0.8125rem;
    line-height: 1.35;
  }

  &__cerrar {
    display: inline-flex;
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    align-items: center;
    justify-content: center;
    padding: 7px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: rgb(255 255 255 / 10%);
    }

    &:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: 2px;
    }

    svg {
      width: 18px;
      height: 18px;
    }
  }

  &__formulario {
    display: flex;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    flex-direction: column;
    gap: 16px;
  }

  &__campo {
    display: flex;
    width: 100%;
    min-width: 0;
    flex-direction: column;
    gap: 6px;

    input,
    textarea {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    textarea {
      min-height: 92px;
      resize: vertical;
    }
  }

  &__etiqueta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    label {
      font-size: 0.875rem;
      font-weight: 600;
    }

    span {
      color: var(--texto-secundario);
      font-size: 0.75rem;
      white-space: nowrap;
    }
  }

  &__error {
    margin: 0;
    font-size: 0.8125rem;
    overflow-wrap: anywhere;
  }

  &__acciones {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 0;
  }
}

@media (max-width: 767px) {
  .modal-editar-texto {
    :deep(.modal-contenedor) {
      width: calc(100vw - 24px);
      max-height: calc(100dvh - 16px);
      overflow-x: hidden;
      overflow-y: auto;
    }

    :deep(.modal-cuerpo) {
      overflow: visible;
    }

    &__encabezado {
      gap: 10px;
    }

    &__titulo {
      font-size: 1rem;
    }

    &__descripcion {
      font-size: 0.75rem;
    }

    &__formulario {
      gap: 14px;
    }

    &__campo {
      gap: 5px;

      textarea {
        min-height: 86px;
      }
    }

    &__acciones {
      align-items: stretch;
      flex-direction: column-reverse;

      button {
        width: 100%;
      }
    }
  }
}
</style>
