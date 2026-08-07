<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue']);

function clonarValor(valor) {
  if (valor === null || valor === undefined) return valor ?? null;
  if (valor instanceof File) return valor;
  if (Array.isArray(valor)) return valor.map((item) => clonarValor(item));
  if (typeof valor === 'object') {
    const copia = {};
    for (const clave of Object.keys(valor)) {
      copia[clave] = clonarValor(valor[clave]);
    }
    return copia;
  }
  return valor;
}

function clonarBloquesLanding(listaBloques = []) {
  return listaBloques.map((bloque) => ({
    ...bloque,
    datos: clonarValor(bloque.datos ?? {}),
  }));
}

const modalSeleccionBloque = ref(null);
const modalCarrusel = ref(null);
const bloqueCarruselEditandoId = ref(null);

const bloques = ref(clonarBloquesLanding(props.modelValue));

const barrasOcultas = ref([]);

const bloquePadreActivoId = ref(null);

watch(
  () => props.modelValue,
  (nuevosBloques) => {
    const bloquesActualesTexto = JSON.stringify(bloques.value);
    const bloquesNuevosTexto = JSON.stringify(nuevosBloques);

    if (bloquesActualesTexto !== bloquesNuevosTexto) {
      bloques.value = clonarBloquesLanding(nuevosBloques);
    }
  },
  {
    deep: true,
  }
);

watch(
  bloques,
  (nuevosBloques) => {
    emit('update:modelValue', clonarBloquesLanding(nuevosBloques));
  },
  {
    deep: true,
  }
);

const contextoAgregar = ref({
  tipo: 'final',
  bloqueId: null,
});

const tiposBloquePadre = [
  {
    id: 'portada',
    etiqueta: 'Portada',
    descripcion: 'Bloque principal con fondo, título, subtítulo y acciones de edición.',
    icono: '▣',
  },
  {
    id: 'titulo',
    etiqueta: 'Título',
    descripcion: 'Encabezado independiente con herramientas de formato.',
    icono: 'H',
  },
  {
    id: 'parrafo',
    etiqueta: 'Párrafo',
    descripcion: 'Texto independiente con formato, alineación y listas.',
    icono: 'P',
  },
  {
    id: 'texto-imagen',
    etiqueta: 'Texto con imagen',
    descripcion: 'Combina un título, un párrafo editable y una imagen.',
    icono: '▧',
  },
  {
    id: 'carrusel',
    etiqueta: 'Carrusel',
    descripcion: 'Bloque con varias diapositivas de imagen y texto.',
    icono: '▤',
  },
  {
    id: 'tarjetas',
    etiqueta: 'Sección de tarjetas',
    descripcion: 'Muestra un conjunto de tarjetas editables en sitio.',
    icono: '▤',
  },
  {
    id: 'mapa',
    etiqueta: 'Mapa embebido',
    descripcion: 'Inserta un mapa de Geocontenidos pegando su código embed.',
    icono: '◫',
  },
];

function crearId() {
  return `bloque-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function abrirModalAgregarBloque(tipo = 'final', bloqueId = null) {
  contextoAgregar.value = {
    tipo,
    bloqueId,
  };

  modalSeleccionBloque.value?.abrirModal();
}

function cerrarModalAgregarBloque() {
  modalSeleccionBloque.value?.cerrarModal?.();
}

function estaBarraOculta(bloqueId) {
  return barrasOcultas.value.includes(bloqueId);
}

function ocultarBarraBloque(bloqueId) {
  if (estaBarraOculta(bloqueId)) return;

  barrasOcultas.value = [...barrasOcultas.value, bloqueId];
  bloquePadreActivoId.value = null;
}

function mostrarBarraBloque(bloqueId) {
  barrasOcultas.value = barrasOcultas.value.filter((id) => id !== bloqueId);
  bloquePadreActivoId.value = bloqueId;
}

function activarBloquePadre(bloqueId) {
  bloquePadreActivoId.value = bloqueId;
}

function desactivarBloquePadreAlClickAfuera(event) {
  if (!(event.target instanceof Element)) return;

  const clickDentroDeBloque = event.target.closest('.lienzo-bloques__bloque');
  const clickDentroDeModal = event.target.closest('.modal-bloques-padre');

  if (!clickDentroDeBloque && !clickDentroDeModal) {
    bloquePadreActivoId.value = null;
  }
}

function estaDeshabilitado() {
  return false;
}

function crearDatosPortada() {
  return {
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
}

function crearDatosTitulo() {
  return {
    texto: '',
    alineacion: 'left',
    color: '#FFFFFF',
    negrita: true,
    tamano: 'grande',
  };
}

function crearDatosParrafo() {
  return {
    texto: '',
    alineacion: 'left',
    color: '#FFFFFF',
    negrita: false,
    tamano: 'normal',
    tipoLista: 'ninguna',
  };
}

function crearDatosTextoImagen() {
  return {
    parrafo: {
      texto: 'Escribe aquí la descripción de la sección.',
      alineacion: 'left',
      color: '#FFFFFF',
      negrita: false,
      tamano: 'normal',
      tipoLista: 'ninguna',
    },
    posicionImagen: 'derecha',
    imagen: {
      url: null,
      archivo: null,
      alt: '',
    },
  };
}

function crearDatosCarrusel() {
  return {
    diapositivas: [],
  };
}

function crearDatosMapa() {
  return {
    codigoEmbed: '',
    url: '',
    alto: 480,
    titulo: '',
  };
}

function crearDatosTarjetas() {
  return {
    disposicion: 'vertical',
    tarjetas: [
      {
        id: 'tarjeta-' + Math.random().toString(36).substring(2),
        titulo: '',
        descripcion: '',
        imagenUrl: '/inicio/tarjeta_visualiza.png',
        tituloTipo: 'h2',
        tituloAlineacion: 'left',
        descripcionTipo: 'p',
        descripcionAlineacion: 'left',
      },
    ],
  };
}

function crearDatosPorTipo(tipoBloque) {
  if (tipoBloque.id === 'portada') {
    return crearDatosPortada();
  }

  if (tipoBloque.id === 'titulo') {
    return crearDatosTitulo();
  }

  if (tipoBloque.id === 'parrafo') {
    return crearDatosParrafo();
  }

  if (tipoBloque.id === 'texto-imagen') {
    return crearDatosTextoImagen();
  }

  if (tipoBloque.id === 'carrusel') {
    return crearDatosCarrusel();
  }

  if (tipoBloque.id === 'tarjetas') {
    return crearDatosTarjetas();
  }

  if (tipoBloque.id === 'mapa') {
    return crearDatosMapa();
  }

  return {};
}

function crearBloque(tipoBloque) {
  return {
    id: crearId(),
    tipo: tipoBloque.id,
    etiqueta: tipoBloque.etiqueta,
    datos: crearDatosPorTipo(tipoBloque),
  };
}

function insertarBloque(nuevoBloque) {
  if (contextoAgregar.value.tipo === 'despues') {
    const indice = bloques.value.findIndex(
      (bloque) => bloque.id === contextoAgregar.value.bloqueId
    );

    if (indice === -1) {
      bloques.value.push(nuevoBloque);
    } else {
      bloques.value.splice(indice + 1, 0, nuevoBloque);
    }
  } else {
    bloques.value.push(nuevoBloque);
  }
}

function seleccionarBloque(tipoBloque) {
  if (estaDeshabilitado(tipoBloque)) return;

  if (tipoBloque.id === 'carrusel') {
    cerrarModalAgregarBloque();
    bloqueCarruselEditandoId.value = null;
    modalCarrusel.value?.abrirModal();
    return;
  }

  const nuevoBloque = crearBloque(tipoBloque);

  insertarBloque(nuevoBloque);
  cerrarModalAgregarBloque();
}

function abrirEdicionCarrusel(bloqueId) {
  const bloque = bloques.value.find((b) => b.id === bloqueId);
  if (!bloque) return;

  bloqueCarruselEditandoId.value = bloqueId;
  modalCarrusel.value?.abrirModal(bloque.datos.diapositivas);
}

function manejarGuardarCarrusel(diapositivas) {
  if (bloqueCarruselEditandoId.value) {
    const bloque = bloques.value.find((b) => b.id === bloqueCarruselEditandoId.value);

    if (bloque) {
      bloque.datos.diapositivas = diapositivas;
    }

    bloqueCarruselEditandoId.value = null;
    return;
  }

  const nuevoBloque = crearBloque({ id: 'carrusel', etiqueta: 'Carrusel' });
  nuevoBloque.datos.diapositivas = diapositivas;

  insertarBloque(nuevoBloque);
}

function eliminarBloque(bloqueId) {
  bloques.value = bloques.value.filter((bloque) => bloque.id !== bloqueId);
  barrasOcultas.value = barrasOcultas.value.filter((id) => id !== bloqueId);
}

function obtenerIndiceBloque(bloqueId) {
  return bloques.value.findIndex((bloque) => bloque.id === bloqueId);
}

function puedeSubirBloque(bloqueId) {
  return obtenerIndiceBloque(bloqueId) > 0;
}

function puedeBajarBloque(bloqueId) {
  const indice = obtenerIndiceBloque(bloqueId);

  return indice !== -1 && indice < bloques.value.length - 1;
}

function moverBloqueArriba(bloqueId) {
  const indice = obtenerIndiceBloque(bloqueId);

  if (indice <= 0) return;

  const bloqueActual = bloques.value[indice];
  const bloqueAnterior = bloques.value[indice - 1];

  bloques.value.splice(indice - 1, 2, bloqueActual, bloqueAnterior);
}

function moverBloqueAbajo(bloqueId) {
  const indice = obtenerIndiceBloque(bloqueId);

  if (indice === -1 || indice >= bloques.value.length - 1) return;

  const bloqueActual = bloques.value[indice];
  const bloqueSiguiente = bloques.value[indice + 1];

  bloques.value.splice(indice, 2, bloqueSiguiente, bloqueActual);
}

function obtenerEtiquetaBloque(bloque) {
  if (bloque.tipo === 'portada') return 'Portada';
  if (bloque.tipo === 'titulo') return 'Título';
  if (bloque.tipo === 'parrafo') return 'Párrafo';
  if (bloque.tipo === 'texto-imagen') return 'Texto con imagen';
  if (bloque.tipo === 'texto') return 'Sección de texto';
  if (bloque.tipo === 'carrusel') return 'Carrusel';
  if (bloque.tipo === 'tarjetas') return 'Sección de tarjetas';
  if (bloque.tipo === 'mapa') return 'Mapa embebido';

  return 'Bloque';
}

onMounted(() => {
  document.addEventListener('pointerdown', desactivarBloquePadreAlClickAfuera);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', desactivarBloquePadreAlClickAfuera);
});
</script>

<template>
  <section class="lienzo-bloques contenedor" aria-label="Constructor de landing page por bloques">
    <!-- Si el lienzo está vacío (length === 0) -->
    <div v-if="!bloques.length" class="lienzo-bloques__vacio">
      <button
        type="button"
        class="lienzo-bloques__boton-agregar lienzo-bloques__boton-agregar--grande"
        aria-label="Agregar primer bloque"
        title="Agregar bloque"
        @click="abrirModalAgregarBloque('final')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <h3>Tu lienzo está vacío</h3>
      <p class="m-b-3">
        Presiona el botón para agregar una portada, un título, un párrafo u otra sección.
      </p>
    </div>

    <div v-else class="lienzo-bloques__lista">
      <article
        v-for="bloque in bloques"
        :key="bloque.id"
        class="lienzo-bloques__bloque"
        :class="{
          'lienzo-bloques__bloque--barra-oculta': estaBarraOculta(bloque.id),
          'lienzo-bloques__bloque--activo': bloquePadreActivoId === bloque.id,
        }"
        @pointerdown.capture="activarBloquePadre(bloque.id)"
        @focusin="activarBloquePadre(bloque.id)"
      >
        <button
          v-if="estaBarraOculta(bloque.id)"
          type="button"
          class="lienzo-bloques__boton-maximizar"
          title="Mostrar controles del bloque"
          aria-label="Mostrar controles del bloque"
          @click="mostrarBarraBloque(bloque.id)"
        >
          <svg class="lienzo-bloques__icono-controles" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3.75a2.25 2.25 0 0 1 2.12 1.5h4.13a.75.75 0 0 1 0 1.5h-4.13a2.25 2.25 0 0 1-4.24 0H5.75a.75.75 0 0 1 0-1.5h4.13A2.25 2.25 0 0 1 12 3.75Zm0 1.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM8 9.75a2.25 2.25 0 0 1 2.12 1.5h8.13a.75.75 0 0 1 0 1.5h-8.13a2.25 2.25 0 0 1-4.24 0H5.75a.75.75 0 0 1 0-1.5h.13A2.25 2.25 0 0 1 8 9.75Zm0 1.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8 4.5a2.25 2.25 0 0 1 2.12 1.5h.13a.75.75 0 0 1 0 1.5h-.13a2.25 2.25 0 0 1-4.24 0H5.75a.75.75 0 0 1 0-1.5h8.13A2.25 2.25 0 0 1 16 15.75Zm0 1.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"
              fill="currentColor"
            />
          </svg>

          <span class="lienzo-bloques__boton-maximizar-texto"> Controles </span>
        </button>
        <div v-if="!estaBarraOculta(bloque.id)" class="lienzo-bloques__barra">
          <div>
            <p class="lienzo-bloques__bloque-tipo">
              {{ obtenerEtiquetaBloque(bloque) }}
            </p>
          </div>

          <div class="lienzo-bloques__acciones">
            <button
              type="button"
              class="lienzo-bloques__accion"
              title="Subir bloque"
              aria-label="Subir bloque"
              :disabled="!puedeSubirBloque(bloque.id)"
              @click="moverBloqueArriba(bloque.id)"
            >
              ↑
            </button>

            <button
              type="button"
              class="lienzo-bloques__accion"
              title="Bajar bloque"
              aria-label="Bajar bloque"
              :disabled="!puedeBajarBloque(bloque.id)"
              @click="moverBloqueAbajo(bloque.id)"
            >
              ↓
            </button>

            <button
              v-if="bloque.tipo === 'carrusel'"
              type="button"
              class="lienzo-bloques__accion"
              title="Editar carrusel"
              aria-label="Editar carrusel"
              @click="abrirEdicionCarrusel(bloque.id)"
            >
              Editar carrusel
            </button>

            <button
              type="button"
              class="lienzo-bloques__accion"
              title="Agregar bloque debajo"
              aria-label="Agregar bloque debajo"
              @click="abrirModalAgregarBloque('despues', bloque.id)"
            >
              + Agregar debajo
            </button>

            <button
              type="button"
              class="lienzo-bloques__accion lienzo-bloques__accion--minimizar"
              title="Ocultar barra de controles"
              aria-label="Ocultar barra de controles"
              @click="ocultarBarraBloque(bloque.id)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5 12h14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>

              <span>Ocultar</span>
            </button>

            <button
              type="button"
              class="lienzo-bloques__accion lienzo-bloques__accion--eliminar"
              title="Eliminar bloque"
              aria-label="Eliminar bloque"
              @click="eliminarBloque(bloque.id)"
            >
              Eliminar
            </button>
          </div>
        </div>

        <div class="lienzo-bloques__contenido">
          <LandingBuilderPortadaEditor v-if="bloque.tipo === 'portada'" v-model="bloque.datos" />

          <LandingBuilderEditorTitulo v-else-if="bloque.tipo === 'titulo'" v-model="bloque.datos" />

          <LandingBuilderEditorParrafo
            v-else-if="bloque.tipo === 'parrafo'"
            v-model="bloque.datos"
          />

          <LandingBuilderEditorTextoImagen
            v-else-if="bloque.tipo === 'texto-imagen'"
            v-model="bloque.datos"
          />

          <LandingBuilderEditorBloquesTexto
            v-else-if="bloque.tipo === 'texto'"
            v-model="bloque.datos.bloquesTexto"
          />

          <LandingBuilderCarruselVistaPrevia
            v-else-if="bloque.tipo === 'carrusel'"
            :diapositivas="bloque.datos.diapositivas"
          />

          <LandingBuilderSeccionesTarjetasBloque
            v-else-if="bloque.tipo === 'tarjetas'"
            :seccion-id="bloque.id"
            :datos="bloque.datos"
          />

          <LandingBuilderEditorMapa v-else-if="bloque.tipo === 'mapa'" v-model="bloque.datos" />
        </div>
      </article>

      <div class="lienzo-bloques__agregar-final">
        <button
          type="button"
          class="lienzo-bloques__boton-agregar"
          aria-label="Agregar bloque al final"
          @click="abrirModalAgregarBloque('final')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>

        <span>Agregar otro bloque</span>
      </div>
    </div>

    <ClientOnly>
      <SisdaiModal ref="modalSeleccionBloque" class="modal-bloques-padre">
        <template #encabezado>
          <div class="modal-bloques-padre__encabezado">
            <div>
              <h2 class="modal-bloques-padre__titulo">Agregar bloque</h2>

              <p class="modal-bloques-padre__descripcion">
                Selecciona el tipo de bloque que quieres insertar en el lienzo.
              </p>
            </div>

            <button
              type="button"
              class="modal-bloques-padre__cerrar"
              aria-label="Cerrar modal"
              title="Cerrar"
              @click="cerrarModalAgregarBloque"
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
          <div class="modal-bloques-padre__opciones">
            <button
              v-for="tipoBloque in tiposBloquePadre"
              :key="tipoBloque.id"
              type="button"
              class="modal-bloques-padre__opcion"
              :class="{
                'modal-bloques-padre__opcion--deshabilitada': estaDeshabilitado(tipoBloque),
              }"
              :disabled="estaDeshabilitado(tipoBloque)"
              @click="seleccionarBloque(tipoBloque)"
            >
              <span class="modal-bloques-padre__icono">
                {{ tipoBloque.icono }}
              </span>

              <span class="modal-bloques-padre__textos">
                <span class="modal-bloques-padre__opcion-titulo">
                  {{ tipoBloque.etiqueta }}
                </span>

                <span class="modal-bloques-padre__opcion-descripcion">
                  {{ tipoBloque.descripcion }}
                </span>
              </span>
            </button>
          </div>
        </template>
      </SisdaiModal>
    </ClientOnly>

    <LandingBuilderModalAgregarCarrusel
      ref="modalCarrusel"
      @guardar-carrusel="manejarGuardarCarrusel"
    />
  </section>
</template>

<style scoped lang="scss">
.lienzo-bloques {
  padding-top: 32px;
  padding-bottom: 32px;

  &__encabezado {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  &__eyebrow {
    margin: 0 0 4px;
    color: var(--texto-secundario);
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  &__titulo {
    margin: 0;
  }

  &__descripcion {
    max-width: 620px;
    margin: 8px 0 0;
    color: var(--texto-secundario);
  }

  &__vacio {
    display: flex;
    min-height: 340px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    border: 1px dashed rgb(255 255 255 / 32%);
    border-radius: 18px;
    background:
      radial-gradient(circle at center, rgb(255 255 255 / 6%), transparent 58%),
      rgb(255 255 255 / 3%);
    text-align: center;

    h3 {
      margin: 16px 0 6px;
    }

    p {
      max-width: 420px;
      margin: 0;
      color: var(--texto-secundario);
    }
  }

  &__boton-agregar {
    display: inline-flex;
    width: 34px;
    height: 34px;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border: 1px solid rgb(255 255 255 / 24%);
    border-radius: 999px;
    background: rgb(105 28 50 / 72%);
    color: white;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: rgb(105 28 50 / 92%);
    }

    &:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: 3px;
    }

    svg {
      width: 18px;
      height: 18px;
    }

    &--grande {
      width: 52px;
      height: 52px;

      svg {
        width: 24px;
        height: 24px;
      }
    }
  }

  &__boton-maximizar {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 80;
    display: inline-flex;
    min-height: 34px;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 7px 12px;
    border: 1px solid rgb(255 255 255 / 24%);
    border-radius: 999px;
    background: rgb(105 28 50 / 72%);
    box-shadow: 0 10px 24px rgb(0 0 0 / 22%);
    color: white;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    backdrop-filter: blur(12px) saturate(120%);
    -webkit-backdrop-filter: blur(12px) saturate(120%);

    &:hover,
    &:focus-visible {
      background: rgb(105 28 50 / 92%);
      transform: translateY(-1px);
    }

    &:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: 3px;
    }
  }

  &__icono-controles {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  &__boton-maximizar-texto {
    display: inline;
  }

  &__lista {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  &__bloque {
    position: relative;
    z-index: 1;
    overflow: visible;
    border: 1px solid rgb(255 255 255 / 16%);
    border-radius: 18px;
    background: rgb(255 255 255 / 3%);
    box-shadow: 0 14px 34px rgb(0 0 0 / 16%);
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover,
    &:focus-within {
      z-index: 30;
    }

    &--barra-oculta {
      border-color: transparent;
      background: transparent;
      box-shadow: none;
    }

    &--barra-oculta.lienzo-bloques__bloque--activo {
      border-color: rgb(255 255 255 / 18%);
      background: rgb(255 255 255 / 3%);
      box-shadow: 0 14px 34px rgb(0 0 0 / 16%);
    }
  }

  &__barra {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 12px;
    border-bottom: 1px solid rgb(255 255 255 / 12%);
    background: rgb(105 28 50 / 85%);
  }

  &__bloque-tipo {
    margin: 0;
    color: white;
    font-size: 0.8125rem;
    font-weight: 700;
  }

  &__acciones {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__accion {
    min-height: 30px;
    padding: 5px 10px;
    border: 1px solid rgb(255 255 255 / 18%);
    border-radius: 999px;
    background: rgb(255 255 255 / 8%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: white;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: rgb(255 255 255 / 14%);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    &:disabled:hover {
      background: rgb(255 255 255 / 8%);
    }

    svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    &--minimizar {
      color: rgb(255 255 255 / 82%);
    }

    &--eliminar {
      color: #ffd6d6;
    }
  }

  &__contenido {
    min-width: 0;
  }

  &__agregar-final {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 56px;
    color: var(--texto-secundario);
  }
}

.modal-bloques-padre {
  :deep(.modal-contenedor) {
    width: min(560px, calc(100vw - 32px));
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
    grid-template-columns: 44px 1fr;
    align-items: center;
    gap: 12px;
    padding: 14px 12px;
    border: 1px solid rgb(255 255 255 / 16%);
    border-radius: 12px;
    background: rgb(255 255 255 / 4%);
    color: inherit;
    text-align: left;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      border-color: rgb(255 255 255 / 30%);
      background: rgb(255 255 255 / 8%);
    }

    &--deshabilitada {
      cursor: not-allowed;
      opacity: 0.55;
    }
  }

  &__icono {
    display: inline-flex;
    width: 38px;
    height: 38px;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgb(255 255 255 / 8%);
    font-size: 1rem;
    font-weight: 800;
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

  &__opcion-descripcion,
  &__aviso {
    color: var(--texto-secundario);
    font-size: 0.8125rem;
  }

  &__aviso {
    color: #ffd6d6;
    font-weight: 700;
  }
}

.lienzo-bloques__bloque--barra-oculta {
  :deep(.editor-texto-imagen__controles),
  :deep(.editor-texto-imagen__acciones-imagen) {
    display: none;
  }
}

@media (max-width: 767px) {
  .lienzo-bloques {
    padding-top: 20px;
    padding-bottom: 24px;

    &__vacio {
      min-height: 300px;
      padding: 28px 18px;
    }

    &__lista {
      gap: 16px;
    }

    &__bloque {
      border-radius: 16px;
      overflow: visible;
    }

    &__bloque--barra-oculta {
      border-color: transparent;
      background: transparent;
      box-shadow: none;
    }

    &__bloque--barra-oculta.lienzo-bloques__bloque--activo {
      border-color: transparent;
      background: transparent;
      box-shadow: none;
    }

    &__boton-maximizar {
      position: relative;
      top: auto;
      left: auto;
      z-index: 5;
      width: 38px;
      height: 38px;
      min-height: 38px;
      margin: 8px 0 10px;
      padding: 0;
      border-radius: 999px;
      transform: none;

      &:hover,
      &:focus-visible {
        transform: none;
      }
    }

    &__icono-controles {
      width: 18px;
      height: 18px;
    }

    &__boton-maximizar-texto {
      display: none;
    }

    &__boton-maximizar-texto {
      display: none;
    }

    &__barra {
      align-items: stretch;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      border-radius: 16px 16px 0 0;
      background: rgb(105 28 50 / 85%);
    }

    &__bloque-tipo {
      font-size: 0.8125rem;
    }

    &__acciones {
      display: grid;
      width: 100%;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    &__accion {
      width: 100%;
      min-height: 34px;
      justify-content: center;
      padding: 7px 10px;
      font-size: 0.75rem;
      white-space: nowrap;
    }

    &__accion:nth-child(3),
    &__accion--minimizar,
    &__accion--eliminar {
      grid-column: span 2;
    }

    &__contenido {
      position: relative;
      z-index: 1;
      min-width: 0;
    }

    &__agregar-final {
      min-height: 48px;
      padding: 4px 0;
      gap: 10px;
      font-size: 0.875rem;
    }
  }

  .modal-bloques-padre {
    :deep(.modal-contenedor) {
      width: calc(100vw - 24px);
    }
  }
}
</style>
