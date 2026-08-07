<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const props = defineProps({
  redireccionInicial: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['seleccionar-archivo', 'seleccionar-enlace']);

const modalCambiarLogo = ref(null);
const dragNdrop = ref(null);

const pestanaActiva = ref('subir');
const urlImagen = ref('');
const urlRedireccion = ref('');
const error = ref('');

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

function abrirModal() {
  pestanaActiva.value = 'subir';
  urlImagen.value = '';
  urlRedireccion.value = props.redireccionInicial || '';
  error.value = '';
  modalCambiarLogo.value?.abrirModal();
}

function cerrarModal() {
  modalCambiarLogo.value?.cerrarModal?.();
}

function cambiarPestana(pestana) {
  pestanaActiva.value = pestana;
  error.value = '';
}

function seleccionarArchivoDrag(archivos) {
  const archivo = archivos?.[0];
  if (!archivo) return;

  const extension = archivo.name.split('.').pop()?.toLowerCase();
  const extensionesPermitidas = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
  const esTipoValido =
    tiposPermitidos.includes(archivo.type) ||
    (extension && extensionesPermitidas.includes(extension));

  if (!esTipoValido) {
    error.value = 'Selecciona una imagen JPG, PNG, WEBP o SVG.';
    dragNdrop.value?.archivoNoValido();
    return;
  }

  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    error.value = 'La imagen no puede pesar más de 5 MB.';
    dragNdrop.value?.archivoNoValido();
    return;
  }

  error.value = '';
  emit('seleccionar-archivo', archivo, urlRedireccion.value.trim());
  cerrarModal();
}

function aplicarEnlace() {
  const enlace = urlImagen.value.trim();
  if (!enlace) {
    error.value = 'Ingresa el enlace de una imagen.';
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
  emit('seleccionar-enlace', enlace, urlRedireccion.value.trim());
  cerrarModal();
}

defineExpose({
  abrirModal,
});
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modalCambiarLogo" class="modal-logo">
      <template #encabezado>
        <div class="modal-logo__encabezado">
          <h2 class="modal-logo__titulo">Cambiar logotipo</h2>

          <button
            type="button"
            class="modal-logo__cerrar"
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
        <div class="modal-logo__pestanas" role="tablist" aria-label="Origen de la imagen">
          <button
            id="pestana-logo-subir"
            type="button"
            role="tab"
            class="modal-logo__pestana"
            :class="{ 'modal-logo__pestana--activa': pestanaActiva === 'subir' }"
            :aria-selected="pestanaActiva === 'subir'"
            aria-controls="panel-logo-subir"
            @click="cambiarPestana('subir')"
          >
            Subir
          </button>

          <button
            id="pestana-logo-enlace"
            type="button"
            role="tab"
            class="modal-logo__pestana"
            :class="{ 'modal-logo__pestana--activa': pestanaActiva === 'enlace' }"
            :aria-selected="pestanaActiva === 'enlace'"
            aria-controls="panel-logo-enlace"
            @click="cambiarPestana('enlace')"
          >
            Enlace
          </button>
        </div>

        <section
          v-if="pestanaActiva === 'subir'"
          id="panel-logo-subir"
          class="modal-logo__panel"
          role="tabpanel"
          aria-labelledby="pestana-logo-subir"
        >
          <ClientOnly>
            <CatalogoElementoDragNdDrop ref="dragNdrop" @pasar-archivo="seleccionarArchivoDrag" />
          </ClientOnly>
        </section>

        <section
          v-else
          id="panel-logo-enlace"
          class="modal-logo__panel"
          role="tabpanel"
          aria-labelledby="pestana-logo-enlace"
        >
          <div class="modal-logo__campo">
            <label for="logo-enlace">Enlace de la imagen</label>

            <input
              id="logo-enlace"
              v-model.trim="urlImagen"
              type="url"
              placeholder="https://ejemplo.com/imagen.jpg"
              @keyup.enter="aplicarEnlace"
            />

            <p class="formulario-ayuda">Pega un enlace directo a una imagen pública.</p>
          </div>

          <button
            type="button"
            class="boton-primario boton-chico modal-logo__boton-enlace"
            @click="aplicarEnlace"
          >
            Usar imagen
          </button>
        </section>

        <div class="modal-logo__campo m-t-3">
          <label for="logo-redireccion">Enlace de redirección</label>
          <input
            id="logo-redireccion"
            v-model.trim="urlRedireccion"
            type="url"
            placeholder="https://"
          />
          <p class="formulario-ayuda">
            Pega la URL a la que se redirigirá al hacer clic en el logo.
          </p>
        </div>

        <p v-if="error" class="texto-color-error modal-logo__error" role="alert">
          {{ error }}
        </p>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>

<style scoped lang="scss">
.modal-logo {
  :deep(.modal-contenedor) {
    width: min(580px, calc(100vw - 32px));
    max-width: 100%;
    max-height: calc(100dvh - 32px);
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: auto;
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
    overflow-x: hidden;
  }

  &__encabezado {
    display: flex;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__titulo {
    min-width: 0;
    margin: 0;
    font-size: 1.125rem;
    line-height: 1.3;
  }

  &__cerrar {
    display: inline-flex;
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    align-items: center;
    justify-content: center;
    padding: 8px;
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
      width: 20px;
      height: 20px;
    }
  }

  &__pestanas,
  &__panel,
  &__campo {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  &__pestanas {
    display: flex;
    gap: 4px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--color-neutro-2, #bdbdbd);
  }

  &__pestana {
    position: relative;
    min-width: 0;
    margin: 0;
    padding: 10px 16px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;

    &::after {
      position: absolute;
      right: 0;
      bottom: -1px;
      left: 0;
      height: 3px;
      background: transparent;
      content: '';
    }

    &:hover,
    &:focus-visible {
      background: rgb(255 255 255 / 6%);
    }

    &:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: -2px;
    }

    &--activa {
      font-weight: 600;

      &::after {
        background: currentcolor;
      }
    }
  }

  &__panel {
    min-height: 190px;
  }

  &__campo {
    display: flex;
    flex-direction: column;
    gap: 8px;

    label,
    input,
    p {
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    input {
      width: 100%;
    }
  }

  &__boton-enlace {
    margin-top: 20px;
  }

  &__error {
    width: 100%;
    max-width: 100%;
    margin-top: 16px;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 767px) {
  .modal-logo {
    :deep(.modal-contenedor) {
      width: calc(100vw - 24px);
      max-height: calc(100dvh - 24px);
    }

    &__encabezado {
      gap: 12px;
    }

    &__titulo {
      font-size: 1rem;
    }

    &__cerrar {
      width: 34px;
      height: 34px;
      flex-basis: 34px;
      padding: 7px;
    }

    &__pestanas {
      width: 100%;
      margin-bottom: 20px;
    }

    &__pestana {
      flex: 1;
      padding: 10px 12px;
    }
  }
}
</style>
