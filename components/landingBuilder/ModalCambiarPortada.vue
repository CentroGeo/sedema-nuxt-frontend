<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const emit = defineEmits(['seleccionar-archivo', 'seleccionar-enlace']);

const modalCambiarPortada = ref(null);
const inputArchivo = ref(null);

const pestanaActiva = ref('subir');
const urlImagen = ref('');
const error = ref('');
const arrastrandoArchivo = ref(false);

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

function abrirModal() {
  pestanaActiva.value = 'subir';
  urlImagen.value = '';
  error.value = '';

  if (inputArchivo.value) {
    inputArchivo.value.value = '';
  }

  modalCambiarPortada.value?.abrirModal();
}

function cerrarModal() {
  modalCambiarPortada.value?.cerrarModal?.();
}

function cerrarModalAlClickAfuera(event) {
  const contenedor = document.querySelector('.modal-portada .modal-contenedor');

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
    error.value = 'Selecciona una imagen JPG, PNG, WEBP o SVG.';
    return;
  }

  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    error.value = 'La imagen no puede pesar más de 5 MB.';
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
    <SisdaiModal ref="modalCambiarPortada" class="modal-portada">
      <template #encabezado>
        <div class="modal-portada__encabezado">
          <h2 class="modal-portada__titulo">Cambiar portada</h2>

          <button
            type="button"
            class="modal-portada__cerrar"
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
        <div class="modal-portada__pestanas" role="tablist" aria-label="Origen de la imagen">
          <button
            id="pestana-subir"
            type="button"
            role="tab"
            class="modal-portada__pestana"
            :class="{ 'modal-portada__pestana--activa': pestanaActiva === 'subir' }"
            :aria-selected="pestanaActiva === 'subir'"
            aria-controls="panel-subir"
            @click="cambiarPestana('subir')"
          >
            Subir
          </button>

          <button
            id="pestana-enlace"
            type="button"
            role="tab"
            class="modal-portada__pestana"
            :class="{ 'modal-portada__pestana--activa': pestanaActiva === 'enlace' }"
            :aria-selected="pestanaActiva === 'enlace'"
            aria-controls="panel-enlace"
            @click="cambiarPestana('enlace')"
          >
            Enlace
          </button>
        </div>

        <section
          v-if="pestanaActiva === 'subir'"
          id="panel-subir"
          class="modal-portada__panel"
          role="tabpanel"
          aria-labelledby="pestana-subir"
        >
          <input
            id="portada-archivo"
            ref="inputArchivo"
            class="modal-portada__input-archivo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            @change="seleccionarArchivo"
          />

          <div
            class="modal-portada__zona-subida"
            :class="{ 'modal-portada__zona-subida--activa': arrastrandoArchivo }"
            role="button"
            tabindex="0"
            aria-label="Arrastra o selecciona una imagen de portada"
            @click="abrirSelectorArchivos"
            @keydown.enter.prevent="abrirSelectorArchivos"
            @keydown.space.prevent="abrirSelectorArchivos"
            @dragenter.prevent="activarArrastre"
            @dragover.prevent="activarArrastre"
            @dragleave.prevent="desactivarArrastre"
            @drop.prevent="soltarArchivo"
          >
            <span class="modal-portada__icono-subida" aria-hidden="true">
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

            <p class="modal-portada__indicacion">Arrastra o suelta tu archivo</p>

            <button
              type="button"
              class="modal-portada__boton-subir"
              @click.stop="abrirSelectorArchivos"
            >
              Elige Archivo
            </button>

            <p class="modal-portada__ayuda">
              Las imágenes con un ancho mayor a 1500 píxeles funcionan mejor.
            </p>

            <p class="modal-portada__formatos">JPG, PNG, WEBP o SVG. Tamaño máximo: 5 MB.</p>
          </div>
        </section>

        <section
          v-else
          id="panel-enlace"
          class="modal-portada__panel"
          role="tabpanel"
          aria-labelledby="pestana-enlace"
        >
          <div class="modal-portada__campo">
            <label for="portada-enlace">Enlace de la imagen</label>

            <input
              id="portada-enlace"
              v-model.trim="urlImagen"
              type="url"
              placeholder="https://ejemplo.com/imagen.jpg"
              @keyup.enter="aplicarEnlace"
            />

            <p class="formulario-ayuda">Pega un enlace directo a una imagen pública.</p>
          </div>

          <button
            type="button"
            class="boton-primario boton-chico modal-portada__boton-enlace"
            @click="aplicarEnlace"
          >
            Usar imagen
          </button>
        </section>

        <p v-if="error" class="texto-color-error modal-portada__error" role="alert">
          {{ error }}
        </p>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>

<style scoped lang="scss">
.modal-portada {
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
    border: 1px dashed rgb(255 255 255 / 55%);
    border-radius: 10px;
    background: rgb(255 255 255 / 4%);
    text-align: center;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover,
    &:focus-visible,
    &--activa {
      border-color: rgb(255 255 255 / 85%);
      background: rgb(255 255 255 / 8%);
      box-shadow: inset 0 0 0 1px rgb(255 255 255 / 18%);
    }

    &:focus-visible {
      outline: 2px solid white;
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
    color: rgb(255 255 255 / 78%);

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
    border: 1px solid rgb(255 255 255 / 45%);
    border-radius: 6px;
    background: rgb(255 255 255 / 9%);
    color: inherit;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: rgb(255 255 255 / 14%);
    }

    &:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: 2px;
    }
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

  &__indicacion {
    margin-top: 0;
    margin-bottom: 0;
    color: var(--texto-secundario);
    font-size: 0.875rem;
  }

  &__ayuda {
    margin-top: 0;
    margin-bottom: 0;
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
  .modal-portada {
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

    &__boton-subir {
      white-space: normal;
    }
  }
}
</style>
