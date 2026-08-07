<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const emit = defineEmits(['guardar-estilos']);

const modalAlineacion = ref(null);
const alineacionSeleccionada = ref('left');
const colorTexto = ref('#FFFFFF');

const opciones = [
  {
    id: 'left',
    etiqueta: 'Izquierda',
    descripcion: 'Alinear texto al inicio',
    icono: '←',
  },
  {
    id: 'center',
    etiqueta: 'Centro',
    descripcion: 'Centrar texto',
    icono: '↔',
  },
  {
    id: 'right',
    etiqueta: 'Derecha',
    descripcion: 'Alinear texto al final',
    icono: '→',
  },
  {
    id: 'justify',
    etiqueta: 'Justificar',
    descripcion: 'Alinear texto a ambos lados',
    icono: '☰',
  },
];

function abrirModal(valores = {}) {
  alineacionSeleccionada.value = valores.alineacion || 'left';
  colorTexto.value = valores.color || '#FFFFFF';

  modalAlineacion.value?.abrirModal();
}

function cerrarModal() {
  modalAlineacion.value?.cerrarModal?.();
}

function seleccionarAlineacion(alineacion) {
  alineacionSeleccionada.value = alineacion;
}

function guardarEstilos() {
  emit('guardar-estilos', {
    alineacion: alineacionSeleccionada.value,
    color: colorTexto.value,
  });

  cerrarModal();
}

function cerrarModalAlClickAfuera(event) {
  const contenedor = document.querySelector('.modal-alineacion .modal-contenedor');

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

defineExpose({
  abrirModal,
});
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modalAlineacion" class="modal-alineacion">
      <template #encabezado>
        <div class="modal-alineacion__encabezado">
          <div>
            <h2 class="modal-alineacion__titulo">Alinear texto</h2>

            <p class="modal-alineacion__descripcion">Selecciona cómo quieres alinear el bloque.</p>
          </div>

          <button
            type="button"
            class="modal-alineacion__cerrar"
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
        <div class="modal-alineacion__opciones">
          <button
            v-for="opcion in opciones"
            :key="opcion.id"
            type="button"
            class="modal-alineacion__opcion"
            :class="{
              'modal-alineacion__opcion--activa': alineacionSeleccionada === opcion.id,
            }"
            :aria-pressed="alineacionSeleccionada === opcion.id"
            @click="seleccionarAlineacion(opcion.id)"
          >
            <span class="modal-alineacion__icono">
              {{ opcion.icono }}
            </span>

            <span class="modal-alineacion__textos">
              <span class="modal-alineacion__opcion-titulo">
                {{ opcion.etiqueta }}
              </span>

              <span class="modal-alineacion__opcion-descripcion">
                {{ opcion.descripcion }}
              </span>
            </span>
          </button>
        </div>

        <div class="modal-alineacion__color">
          <LandingBuilderSelectorColorHex
            id="bloque-texto-color"
            v-model="colorTexto"
            etiqueta="Color del texto"
          />
        </div>

        <div class="modal-alineacion__acciones">
          <button type="button" class="boton-secundario boton-chico" @click="cerrarModal">
            Cancelar
          </button>

          <button type="button" class="boton-primario boton-chico" @click="guardarEstilos">
            Guardar cambios
          </button>
        </div>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>

<style scoped lang="scss">
.modal-alineacion {
  :deep(.modal-contenedor) {
    width: min(460px, calc(100vw - 32px));
    max-width: 100%;
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

    svg {
      width: 18px;
      height: 18px;
    }
  }

  &__opciones {
    display: grid;
    gap: 10px;
  }

  &__opcion {
    display: grid;
    width: 100%;
    grid-template-columns: 42px 1fr;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid rgb(255 255 255 / 16%);
    border-radius: 10px;
    background: rgb(255 255 255 / 4%);
    color: inherit;
    text-align: left;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      border-color: rgb(255 255 255 / 30%);
      background: rgb(255 255 255 / 8%);
    }
  }

  &__icono {
    display: inline-flex;
    width: 36px;
    height: 36px;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgb(255 255 255 / 8%);
    font-size: 1.25rem;
    font-weight: 700;
  }

  &__textos {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
  }

  &__opcion-titulo {
    font-weight: 700;
  }

  &__opcion-descripcion {
    color: var(--texto-secundario);
    font-size: 0.8125rem;
  }
  &__opcion--activa {
    border-color: rgb(255 255 255 / 46%);
    background: rgb(255 255 255 / 12%);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 12%);
  }

  &__color {
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid rgb(255 255 255 / 12%);
  }

  &__acciones {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
  }
}

@media (max-width: 767px) {
  .modal-alineacion {
    :deep(.modal-contenedor) {
      width: calc(100vw - 24px);
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
