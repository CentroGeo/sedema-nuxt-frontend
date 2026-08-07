<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const emit = defineEmits(['seleccionar-archivo', 'seleccionar-enlace']);

const modalCambiarImagen = ref(null);
const inputArchivo = ref(null);

const pestanaActiva = ref('subir');
const urlImagen = ref('');
const error = ref('');
const arrastrandoArchivo = ref(false);

const TAMANO_MAXIMO_IMAGEN_BYTES = 500 * 1024; // 500 KB
const TAMANO_MAXIMO_VIDEO_BYTES = 15 * 1024 * 1024; // 15 MB

const TIPOS_IMAGEN_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TIPOS_VIDEO_PERMITIDOS = ['video/mp4', 'video/webm'];
const tiposPermitidos = [...TIPOS_IMAGEN_PERMITIDOS, ...TIPOS_VIDEO_PERMITIDOS];

function abrirModal() {
  pestanaActiva.value = 'subir';
  urlImagen.value = '';
  error.value = '';

  if (inputArchivo.value) {
    inputArchivo.value.value = '';
  }

  modalCambiarImagen.value?.abrirModal();
}

function cerrarModal() {
  modalCambiarImagen.value?.cerrarModal?.();
}

function cerrarModalAlClickAfuera(event) {
  const contenedor = document.querySelector('.modal-tarjeta-imagen .modal-contenedor');

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

function cambiarPestana(pestana) {
  pestanaActiva.value = pestana;
  error.value = '';
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

  if (!tiposPermitidos.includes(archivo.type)) {
    error.value = 'Selecciona una imagen JPG, PNG, WEBP o un video MP4/WEBM.';
    return;
  }

  const esVideo = TIPOS_VIDEO_PERMITIDOS.includes(archivo.type);
  const limite = esVideo ? TAMANO_MAXIMO_VIDEO_BYTES : TAMANO_MAXIMO_IMAGEN_BYTES;

  if (archivo.size > limite) {
    error.value = esVideo
      ? 'El video no puede pesar más de 15 MB.'
      : 'La imagen no puede pesar más de 500 KB.';
    return;
  }

  error.value = '';
  emit('seleccionar-archivo', archivo);
  cerrarModal();
}

function seleccionarArchivo(event) {
  const archivo = event.target.files?.[0];

  procesarArchivo(archivo);

  if (event.target) {
    event.target.value = '';
  }
}

function soltarArchivo(event) {
  arrastrandoArchivo.value = false;

  const archivo = event.dataTransfer?.files?.[0];

  procesarArchivo(archivo);
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
  emit('seleccionar-enlace', enlace);
  cerrarModal();
}

defineExpose({
  abrirModal,
});
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modalCambiarImagen" class="modal-tarjeta-imagen">
      <template #encabezado>
        <div class="modal-tarjeta-imagen__encabezado">
          <h2 class="modal-tarjeta-imagen__titulo">Cambiar imagen de tarjeta</h2>

          <button
            type="button"
            class="modal-tarjeta-imagen__cerrar"
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
        <div class="modal-tarjeta-imagen__pestanas" role="tablist" aria-label="Origen de la imagen">
          <button
            id="pestana-subir-tarjeta"
            type="button"
            role="tab"
            class="modal-tarjeta-imagen__pestana"
            :class="{ 'modal-tarjeta-imagen__pestana--activa': pestanaActiva === 'subir' }"
            :aria-selected="pestanaActiva === 'subir'"
            aria-controls="panel-subir-tarjeta"
            @click="cambiarPestana('subir')"
          >
            Subir
          </button>

          <button
            id="pestana-enlace-tarjeta"
            type="button"
            role="tab"
            class="modal-tarjeta-imagen__pestana"
            :class="{ 'modal-tarjeta-imagen__pestana--activa': pestanaActiva === 'enlace' }"
            :aria-selected="pestanaActiva === 'enlace'"
            aria-controls="panel-enlace-tarjeta"
            @click="cambiarPestana('enlace')"
          >
            Enlace
          </button>
        </div>

        <section
          v-if="pestanaActiva === 'subir'"
          id="panel-subir-tarjeta"
          class="modal-tarjeta-imagen__panel"
          role="tabpanel"
          aria-labelledby="pestana-subir-tarjeta"
        >
          <input
            id="tarjeta-archivo"
            ref="inputArchivo"
            class="modal-tarjeta-imagen__input-archivo"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            @change="seleccionarArchivo"
          />

          <div
            class="modal-tarjeta-imagen__zona-subida borde borde-redondeado-16"
            :class="{ 'modal-tarjeta-imagen__zona-subida--activa': arrastrandoArchivo }"
            role="button"
            tabindex="0"
            aria-label="Arrastra o selecciona una imagen de tarjeta"
            @click="abrirSelectorArchivos"
            @keydown.enter.prevent="abrirSelectorArchivos"
            @keydown.space.prevent="abrirSelectorArchivos"
            @dragenter.prevent="activarArrastre"
            @dragover.prevent="activarArrastre"
            @dragleave.prevent="desactivarArrastre"
            @drop.prevent="soltarArchivo"
          >
            <span class="modal-tarjeta-imagen__icono-subida" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 16V5m0 0-4 4m4-4 4 4M5 19h14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>

            <p class="modal-tarjeta-imagen__indicacion">Arrastra o suelta tu archivo</p>

            <button
              type="button"
              class="modal-tarjeta-imagen__boton-subir"
              @click.stop="abrirSelectorArchivos"
            >
              Elige Archivo
            </button>

            <p class="modal-tarjeta-imagen__ayuda">
              Las imágenes con un ancho de 800 a 1200 píxeles funcionan mejor.
            </p>

            <p class="modal-tarjeta-imagen__formatos">
              JPG, PNG o WEBP (máx. 500 KB), o video MP4/WEBM (máx. 15 MB).
            </p>
          </div>
        </section>

        <section
          v-else
          id="panel-enlace-tarjeta"
          class="modal-tarjeta-imagen__panel"
          role="tabpanel"
          aria-labelledby="pestana-enlace-tarjeta"
        >
          <div class="modal-tarjeta-imagen__campo">
            <label for="tarjeta-enlace">Enlace de la imagen</label>

            <input
              id="tarjeta-enlace"
              v-model.trim="urlImagen"
              type="url"
              placeholder="https://ejemplo.com/imagen.jpg"
              @keyup.enter="aplicarEnlace"
            />

            <p class="formulario-ayuda">Pega un enlace directo a una imagen pública.</p>
          </div>

          <button
            type="button"
            class="boton-primario boton-chico modal-tarjeta-imagen__boton-enlace"
            @click="aplicarEnlace"
          >
            Usar imagen
          </button>
        </section>

        <p v-if="error" class="texto-color-error modal-tarjeta-imagen__error" role="alert">
          {{ error }}
        </p>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>

<style scoped lang="scss">
.modal-tarjeta-imagen {
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
  &__zona-subida,
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

  &__input-archivo {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }

  &__indicacion,
  &__ayuda,
  &__formatos {
    width: 100%;
    max-width: 100%;
    margin-right: 0;
    margin-left: 0;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  &__zona-subida {
    display: flex;
    min-height: 190px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px 16px;
    overflow: hidden;
    border: 1.5px dashed var(--color-neutro-3, #ced4da);
    border-radius: 10px;
    background: transparent;
    text-align: center;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover,
    &:focus-visible,
    &--activa {
      border-color: var(--color-primario, rgb(105 28 50));
      background: rgba(128, 128, 128, 0.08);
      box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.15);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primario, rgb(105 28 50));
      outline-offset: 3px;
    }
  }

  &__zona-subida > * {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  &__icono-subida {
    display: inline-flex;
    width: 36px;
    height: 36px;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
    border-radius: 50%;
    color: var(--texto-secundario, #6f7276);

    svg {
      width: 26px;
      height: 26px;
    }
  }

  &__boton-subir {
    width: auto;
    min-height: 34px;
    margin: 8px 0 14px;
    padding: 7px 14px;
    box-sizing: border-box;
    border: 1px solid var(--color-neutro-3, #ced4da);
    border-radius: 6px;
    background: rgba(128, 128, 128, 0.08);
    color: var(--texto-primario, inherit);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: rgba(128, 128, 128, 0.15);
    }

    &:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: 2px;
    }
  }

  &__indicacion {
    margin-top: 0;
    margin-bottom: 0;
    color: var(--texto-secundario);
    font-size: 0.875rem;
  }

  &__ayuda {
    margin-top: 0;
    margin-bottom: 0;
    color: inherit;
    font-size: 0.8125rem;
  }

  &__formatos {
    margin-top: 6px;
    margin-bottom: 0;
    color: var(--texto-secundario);
    font-size: 0.75rem;
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
  .modal-tarjeta-imagen {
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

    &__zona-subida {
      min-height: 180px;
      padding: 16px 12px;
    }

    &__icono-subida {
      width: 32px;
      height: 32px;

      svg {
        width: 22px;
        height: 22px;
      }
    }

    &__boton-subir {
      min-height: 32px;
      padding: 6px 12px;
      font-size: 0.75rem;
    }
  }
}
</style>
