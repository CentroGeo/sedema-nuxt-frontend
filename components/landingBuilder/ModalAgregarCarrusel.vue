<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const LIMITE_DIAPOSITIVAS = 10;

const emit = defineEmits(['guardar-carrusel']);

const modalCarrusel = ref(null);
const diapositivas = ref([]);
const idArrastrado = ref(null);

function crearDiapositivaVacia() {
  return {
    id: crypto.randomUUID(),
    texto: '',
    imagenUrl: null,
    imagenArchivo: null,
    imagenTipo: 'imagen',
    botonTexto: '',
    botonUrl: '',
  };
}

function puedeAgregarDiapositiva() {
  return diapositivas.value.length < LIMITE_DIAPOSITIVAS;
}

function agregarDiapositiva() {
  if (!puedeAgregarDiapositiva()) return;
  diapositivas.value.push(crearDiapositivaVacia());
}

function eliminarDiapositiva(id) {
  const diapositiva = diapositivas.value.find((d) => d.id === id);
  if (diapositiva?.imagenUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(diapositiva.imagenUrl);
  }
  diapositivas.value = diapositivas.value.filter((d) => d.id !== id);
}

function manejarSeleccionImagen(id, archivo) {
  const diapositiva = diapositivas.value.find((d) => d.id === id);
  if (!diapositiva) return;

  if (diapositiva.imagenUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(diapositiva.imagenUrl);
  }

  diapositiva.imagenArchivo = archivo;
  diapositiva.imagenUrl = URL.createObjectURL(archivo);
  diapositiva.imagenTipo = archivo.type.startsWith('video/') ? 'video' : 'imagen';
}

function alIniciarArrastre(id) {
  idArrastrado.value = id;
}

function alSoltar(idDestino) {
  if (!idArrastrado.value || idArrastrado.value === idDestino) {
    idArrastrado.value = null;
    return;
  }

  const indiceOrigen = diapositivas.value.findIndex((d) => d.id === idArrastrado.value);
  const indiceDestino = diapositivas.value.findIndex((d) => d.id === idDestino);
  idArrastrado.value = null;

  if (indiceOrigen === -1 || indiceDestino === -1) return;

  const lista = [...diapositivas.value];
  const [movida] = lista.splice(indiceOrigen, 1);
  lista.splice(indiceDestino, 0, movida);
  diapositivas.value = lista;
}

function abrirModal(carruselExistente) {
  diapositivas.value = carruselExistente?.length
    ? carruselExistente.map((diapositiva) => ({
        ...crearDiapositivaVacia(),
        ...diapositiva,
      }))
    : [crearDiapositivaVacia()];

  modalCarrusel.value?.abrirModal();
}

function cerrarModal() {
  modalCarrusel.value?.cerrarModal?.();
}

function confirmarCarrusel() {
  const diapositivasValidas = diapositivas.value.filter((d) => d.texto.trim() || d.imagenUrl);

  emit('guardar-carrusel', diapositivasValidas);
  cerrarModal();
}

defineExpose({
  abrirModal,
});
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modalCarrusel" class="modal-carrusel">
      <template #encabezado>
        <div class="modal-carrusel__encabezado">
          <h2 class="modal-carrusel__titulo">Carrusel</h2>

          <button
            type="button"
            class="modal-carrusel__cerrar"
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
        <div class="flex flex-contenido-separado modal-carrusel__encabezado-lista">
          <p class="texto-color-secundario m-0">Agrega una imagen y un texto por diapositiva.</p>

          <span class="modal-carrusel__contador" aria-live="polite">
            {{ diapositivas.length }}/{{ LIMITE_DIAPOSITIVAS }}
          </span>
        </div>

        <ul class="modal-carrusel__lista">
          <li
            v-for="(diapositiva, indice) in diapositivas"
            :key="diapositiva.id"
            class="modal-carrusel__item borde borde-redondeado-8"
            @dragover.prevent
            @drop="alSoltar(diapositiva.id)"
          >
            <div
              class="modal-carrusel__item-encabezado"
              draggable="true"
              @dragstart="alIniciarArrastre(diapositiva.id)"
            >
              <button
                type="button"
                class="boton-pictograma boton-sin-contenedor-secundario boton-chico"
                aria-label="Arrastra para reordenar la diapositiva"
                title="Arrastra para reordenar"
              >
                <span class="pictograma-mover" aria-hidden="true" />
              </button>

              <p class="modal-carrusel__item-titulo">Diapositiva {{ indice + 1 }}</p>

              <button
                type="button"
                class="boton-pictograma boton-sin-contenedor-secundario boton-chico"
                aria-label="Eliminar diapositiva"
                title="Eliminar diapositiva"
                @click="eliminarDiapositiva(diapositiva.id)"
              >
                <span class="pictograma-eliminar" aria-hidden="true" />
              </button>
            </div>

            <div class="modal-carrusel__campo">
              <LandingBuilderSelectorImagenCarrusel
                :imagen-url="diapositiva.imagenUrl"
                :imagen-tipo="diapositiva.imagenTipo"
                @seleccionar-imagen="(archivo) => manejarSeleccionImagen(diapositiva.id, archivo)"
              />
            </div>

            <div class="modal-carrusel__campo">
              <label :for="`carrusel-texto-${diapositiva.id}`">Texto</label>
              <input
                :id="`carrusel-texto-${diapositiva.id}`"
                v-model="diapositiva.texto"
                type="text"
                placeholder="Texto de la diapositiva"
              />
            </div>

            <div class="modal-carrusel__campo">
              <label :for="`carrusel-boton-texto-${diapositiva.id}`"
                >Texto del botón (opcional)</label
              >
              <input
                :id="`carrusel-boton-texto-${diapositiva.id}`"
                v-model="diapositiva.botonTexto"
                type="text"
                placeholder="Ej: Ver más"
              />
            </div>

            <div v-if="diapositiva.botonTexto" class="modal-carrusel__campo">
              <label :for="`carrusel-boton-url-${diapositiva.id}`">Enlace del botón</label>
              <input
                :id="`carrusel-boton-url-${diapositiva.id}`"
                v-model="diapositiva.botonUrl"
                type="text"
                placeholder="https://ejemplo.com o /ruta-interna"
              />
            </div>
          </li>
        </ul>

        <button
          type="button"
          class="boton-secundario boton-chico"
          :disabled="!puedeAgregarDiapositiva()"
          @click="agregarDiapositiva"
        >
          <span class="pictograma-agregar m-r-1" aria-hidden="true" />
          Agregar diapositiva
        </button>

        <p v-if="!puedeAgregarDiapositiva()" class="texto-color-secundario m-t-1">
          Alcanzaste el límite máximo de {{ LIMITE_DIAPOSITIVAS }} diapositivas.
        </p>
      </template>

      <template #pie>
        <div class="flex flex-vertical-centrado modal-carrusel__acciones">
          <button type="button" class="boton-secundario boton-chico" @click="cerrarModal">
            Cancelar
          </button>

          <button type="button" class="boton-primario boton-chico" @click="confirmarCarrusel">
            Agregar carrusel
          </button>
        </div>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>

<style scoped lang="scss">
.modal-carrusel {
  :deep(.modal-contenedor) {
    width: min(720px, calc(100vw - 32px));
    max-width: 100%;
    max-height: calc(100dvh - 32px);
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: auto;
  }

  &__encabezado {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__titulo {
    margin: 0;
    font-size: 1.125rem;
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

  &__encabezado-lista {
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__contador {
    flex-shrink: 0;
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--fondo-acento);
    font-size: 0.8125rem;
    font-weight: 600;
    white-space: nowrap;
  }

  &__lista {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
  }

  &__item {
    padding: 16px;
  }

  &__item-encabezado {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__item-titulo {
    flex: 1;
    margin: 0;
    font-weight: 600;
  }

  &__campo {
    margin-bottom: 12px;
  }

  &__acciones {
    justify-content: flex-end;
    gap: 12px;
  }
}
</style>
