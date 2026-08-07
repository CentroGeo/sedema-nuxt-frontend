<script setup>
/* eslint-disable no-unused-vars */
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue']);

function clonarBloquesTexto(listaBloques = []) {
  return listaBloques.map((bloque) => ({
    ...bloque,
  }));
}

const editorBloques = ref(null);
const modalAlineacionTexto = ref(null);

const menuAbierto = ref(false);
const menuContexto = ref({
  tipo: 'inicio',
  bloqueId: null,
});

const bloqueAlineacionId = ref(null);
const bloqueArrastrandoId = ref(null);
const bloqueActivoId = ref(null);
const elementosEditables = ref({});

const tiposBloque = [
  {
    id: 'encabezado-1',
    etiqueta: 'Encabezado 1',
    descripcion: 'Texto grande',
    icono: 'H1',
    componente: 'h2',
    clase: 'bloque-texto__contenido--h1',
    placeholder: 'Encabezado 1',
  },
  {
    id: 'encabezado-2',
    etiqueta: 'Encabezado 2',
    descripcion: 'Texto mediano',
    icono: 'H2',
    componente: 'h3',
    clase: 'bloque-texto__contenido--h2',
    placeholder: 'Encabezado 2',
  },
  {
    id: 'parrafo',
    etiqueta: 'Párrafo',
    descripcion: 'Texto normal',
    icono: 'P',
    componente: 'p',
    clase: 'bloque-texto__contenido--parrafo',
    placeholder: 'Escribe un párrafo...',
  },
];

const bloques = ref(clonarBloquesTexto(props.modelValue));

watch(
  () => props.modelValue,
  (nuevosBloques) => {
    const bloquesActualesTexto = JSON.stringify(bloques.value);
    const bloquesNuevosTexto = JSON.stringify(nuevosBloques);

    if (bloquesActualesTexto !== bloquesNuevosTexto) {
      bloques.value = clonarBloquesTexto(nuevosBloques);
    }
  },
  {
    deep: true,
  }
);

watch(
  bloques,
  (nuevosBloques) => {
    emit('update:modelValue', clonarBloquesTexto(nuevosBloques));
  },
  {
    deep: true,
  }
);

const tieneBloquesConContenido = computed(() =>
  bloques.value.some((bloque) => bloque.texto.trim())
);

function crearId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function abrirMenuInicio() {
  bloqueActivoId.value = null;

  menuContexto.value = {
    tipo: 'inicio',
    bloqueId: null,
  };

  menuAbierto.value = true;
}

function abrirMenuDespuesDeBloque(bloqueId) {
  bloqueActivoId.value = bloqueId;

  menuContexto.value = {
    tipo: 'despues',
    bloqueId,
  };

  menuAbierto.value = true;
}

function cerrarMenu() {
  menuAbierto.value = false;
  menuContexto.value = {
    tipo: 'inicio',
    bloqueId: null,
  };
}

function registrarEditable(elemento, bloqueId) {
  if (elemento) {
    elementosEditables[bloqueId] = elemento;

    const bloque = bloques.value.find((item) => item.id === bloqueId);

    if (bloque && document.activeElement !== elemento && elemento.textContent !== bloque.texto) {
      elemento.textContent = bloque.texto;
    }

    return;
  }

  delete elementosEditables[bloqueId];
}

function enfocarBloque(bloqueId) {
  nextTick(() => {
    const elemento = elementosEditables[bloqueId];

    if (!elemento) return;

    elemento.focus();

    if (!elemento.textContent?.trim()) {
      elemento.textContent = '';
    }

    elemento.focus();

    const rango = document.createRange();
    rango.selectNodeContents(elemento);
    rango.collapse(false);

    const seleccion = window.getSelection();
    seleccion?.removeAllRanges();
    seleccion?.addRange(rango);
  });
}

function crearBloqueDesdeTipo(tipo) {
  return {
    id: crearId(),
    tipo: tipo.id,
    componente: tipo.componente,
    clase: tipo.clase,
    texto: '',
    placeholder: tipo.placeholder,
    alineacion: 'left',
    color: '#FFFFFF',
  };
}

function seleccionarTipoBloque(tipo) {
  const nuevoBloque = crearBloqueDesdeTipo(tipo);

  if (menuContexto.value.tipo === 'despues') {
    const indice = bloques.value.findIndex((bloque) => bloque.id === menuContexto.value.bloqueId);

    if (indice === -1) {
      bloques.value.push(nuevoBloque);
    } else {
      bloques.value.splice(indice + 1, 0, nuevoBloque);
    }
  } else {
    bloques.value.push(nuevoBloque);
  }

  cerrarMenu();
  enfocarBloque(nuevoBloque.id);
}

function obtenerTextoEditable(event) {
  return event.target.textContent || '';
}

function guardarTextoBloque(bloque, event) {
  const texto = obtenerTextoEditable(event);

  bloque.texto = texto;

  if (!texto.trim()) {
    eliminarBloque(bloque.id);
  }
}

function sincronizarTextoBloque(bloque, event) {
  bloque.texto = obtenerTextoEditable(event);
}

function crearBloqueSiguiente(bloque, event) {
  guardarTextoBloque(bloque, event);

  if (!bloque.texto.trim()) {
    eliminarBloque(bloque.id);
    return;
  }

  abrirMenuDespuesDeBloque(bloque.id);
}

function eliminarBloque(id) {
  bloques.value = bloques.value.filter((bloque) => bloque.id !== id);

  if (!bloques.value.length) {
    cerrarMenu();
  }
}

function activarBloque(bloqueId) {
  bloqueActivoId.value = bloqueId;
}

function abrirModalAlineacion(bloque) {
  cerrarMenu();

  bloqueActivoId.value = bloque.id;
  bloqueAlineacionId.value = bloque.id;

  modalAlineacionTexto.value?.abrirModal({
    alineacion: bloque.alineacion || 'left',
    color: bloque.color || '#FFFFFF',
  });
}

function guardarEstilosBloque(estilos) {
  const bloque = bloques.value.find((item) => item.id === bloqueAlineacionId.value);

  if (!bloque) return;

  bloque.alineacion = estilos.alineacion || 'left';
  bloque.color = estilos.color || '#FFFFFF';

  bloqueAlineacionId.value = null;
  bloqueActivoId.value = null;
}

function iniciarArrastreBloque(bloque, event) {
  if (!bloque.texto.trim()) return;

  event.preventDefault();

  bloqueArrastrandoId.value = bloque.id;

  document.addEventListener('pointermove', moverBloqueArrastrado);
  document.addEventListener('pointerup', terminarArrastreBloque, { once: true });
  document.addEventListener('pointercancel', terminarArrastreBloque, { once: true });
}

function moverBloqueArrastrado(event) {
  if (!bloqueArrastrandoId.value) return;

  const elementoDebajo = document
    .elementsFromPoint(event.clientX, event.clientY)
    .find((elemento) => elemento.dataset?.bloqueId);

  const bloqueDestinoId = elementoDebajo?.dataset?.bloqueId;

  if (!bloqueDestinoId || bloqueDestinoId === bloqueArrastrandoId.value) return;

  reordenarBloques(bloqueArrastrandoId.value, bloqueDestinoId);
}

function reordenarBloques(bloqueOrigenId, bloqueDestinoId) {
  const indiceOrigen = bloques.value.findIndex((bloque) => bloque.id === bloqueOrigenId);
  const indiceDestino = bloques.value.findIndex((bloque) => bloque.id === bloqueDestinoId);

  if (indiceOrigen === -1 || indiceDestino === -1) return;

  const [bloqueMovido] = bloques.value.splice(indiceOrigen, 1);

  bloques.value.splice(indiceDestino, 0, bloqueMovido);
}

function terminarArrastreBloque() {
  bloqueArrastrandoId.value = null;

  document.removeEventListener('pointermove', moverBloqueArrastrado);
  document.removeEventListener('pointerup', terminarArrastreBloque);
  document.removeEventListener('pointercancel', terminarArrastreBloque);
}

function cerrarMenuConEscape(event) {
  if (event.key === 'Escape') {
    cerrarMenu();
  }
}

function cerrarInteraccionesAlDarClickAfuera(event) {
  if (!(event.target instanceof Element)) return;

  const clickEnMenu = event.target.closest('.bloque-texto__menu');
  const clickEnHerramientas = event.target.closest('.bloque-texto__herramientas');
  const clickEnBloque = event.target.closest('.bloque-texto');
  const clickEnBotonInicial = event.target.closest(
    '.editor-bloques__boton-inicial, .editor-bloques__boton-final'
  );

  if (!clickEnMenu && !clickEnHerramientas && !clickEnBotonInicial) {
    cerrarMenu();
  }

  if (!clickEnBloque && !clickEnMenu && !clickEnHerramientas) {
    bloqueActivoId.value = null;
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', cerrarInteraccionesAlDarClickAfuera);
  document.addEventListener('keydown', cerrarMenuConEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', cerrarInteraccionesAlDarClickAfuera);
  document.removeEventListener('keydown', cerrarMenuConEscape);
  terminarArrastreBloque();
});
</script>

<template>
  <section ref="editorBloques" class="editor-bloques contenedor ancho-fijo">
    <div class="editor-bloques__lista">
      <article
        v-for="bloque in bloques"
        :key="bloque.id"
        class="bloque-texto"
        :class="{
          'bloque-texto--arrastrando': bloqueArrastrandoId === bloque.id,
          'bloque-texto--activo': bloqueActivoId === bloque.id,
        }"
        :data-bloque-id="bloque.id"
        @pointerdown.capture="activarBloque(bloque.id)"
        @focusin="activarBloque(bloque.id)"
      >
        <div class="bloque-texto__herramientas">
          <button
            type="button"
            class="bloque-texto__boton-agregar"
            aria-label="Agregar bloque debajo"
            @pointerdown.stop
            @click.stop="abrirMenuDespuesDeBloque(bloque.id)"
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

          <button
            type="button"
            class="bloque-texto__boton-editar"
            aria-label="Editar alineación del bloque"
            title="Editar alineación"
            @pointerdown.stop
            @click.stop="abrirModalAlineacion(bloque)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
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

          <button
            type="button"
            class="bloque-texto__boton-mover"
            aria-label="Mover bloque"
            title="Arrastra para mover"
            @pointerdown.stop="iniciarArrastreBloque(bloque, $event)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 12V8.8a1.3 1.3 0 0 1 2.6 0V12m0 0V6.8a1.3 1.3 0 0 1 2.6 0V12m0 0V7.8a1.3 1.3 0 0 1 2.6 0V13m0 0v-2.2a1.3 1.3 0 0 1 2.6 0v4.1c0 3.2-2.2 5.1-5.2 5.1h-1.1c-2.1 0-3.5-.8-4.8-2.5L4.8 15a1.4 1.4 0 0 1 2-2l1 1.1"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            class="bloque-texto__boton-eliminar"
            aria-label="Eliminar bloque"
            title="Eliminar bloque"
            @pointerdown.stop
            @click.stop="eliminarBloque(bloque.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9 4h6m-8 4h10m-9 0 .7 12h6.6L16 8M10 11v6M14 11v6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>

        <component
          :is="bloque.componente"
          :ref="(elemento) => registrarEditable(elemento, bloque.id)"
          class="bloque-texto__contenido"
          :class="bloque.clase"
          :style="{
            textAlign: bloque.alineacion,
            color: bloque.color || '#FFFFFF',
          }"
          :data-placeholder="bloque.placeholder"
          contenteditable="true"
          spellcheck="true"
          @blur="guardarTextoBloque(bloque, $event)"
          @keydown.enter.prevent="crearBloqueSiguiente(bloque, $event)"
        />

        <div
          v-if="
            menuAbierto && menuContexto.tipo === 'despues' && menuContexto.bloqueId === bloque.id
          "
          class="bloque-texto__menu"
          role="dialog"
          aria-label="Seleccionar tipo de bloque"
          @pointerdown.stop
          @click.stop
        >
          <p class="bloque-texto__menu-titulo">Bloques básicos</p>

          <button
            v-for="tipo in tiposBloque"
            :key="tipo.id"
            type="button"
            class="bloque-texto__opcion"
            @click="seleccionarTipoBloque(tipo)"
          >
            <span class="bloque-texto__opcion-icono">
              {{ tipo.icono }}
            </span>

            <span class="bloque-texto__opcion-textos">
              <span class="bloque-texto__opcion-titulo">
                {{ tipo.etiqueta }}
              </span>

              <span class="bloque-texto__opcion-descripcion">
                {{ tipo.descripcion }}
              </span>
            </span>
          </button>
        </div>
      </article>

      <div v-if="!bloques.length" class="editor-bloques__inicio">
        <button
          type="button"
          class="editor-bloques__boton-inicial"
          aria-label="Agregar primer bloque"
          @pointerdown.stop
          @click.stop="abrirMenuInicio"
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

        <span>Pulsa para agregar un bloque</span>

        <div
          v-if="menuAbierto && menuContexto.tipo === 'inicio'"
          class="bloque-texto__menu editor-bloques__menu-inicial"
          role="dialog"
          aria-label="Seleccionar tipo de bloque"
          @pointerdown.stop
          @click.stop
        >
          <p class="bloque-texto__menu-titulo">Bloques básicos</p>

          <button
            v-for="tipo in tiposBloque"
            :key="tipo.id"
            type="button"
            class="bloque-texto__opcion"
            @click="seleccionarTipoBloque(tipo)"
          >
            <span class="bloque-texto__opcion-icono">
              {{ tipo.icono }}
            </span>

            <span class="bloque-texto__opcion-textos">
              <span class="bloque-texto__opcion-titulo">
                {{ tipo.etiqueta }}
              </span>

              <span class="bloque-texto__opcion-descripcion">
                {{ tipo.descripcion }}
              </span>
            </span>
          </button>
        </div>
      </div>

      <div
        v-else-if="tieneBloquesConContenido && (!menuAbierto || menuContexto.tipo === 'inicio')"
        class="editor-bloques__linea-final"
      >
        <button
          type="button"
          class="editor-bloques__boton-final"
          aria-label="Agregar bloque al final"
          @pointerdown.stop
          @click.stop="abrirMenuInicio"
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

        <span>Pulsa + para agregar un bloque</span>

        <div
          v-if="menuAbierto && menuContexto.tipo === 'inicio'"
          class="bloque-texto__menu editor-bloques__menu-final"
          role="dialog"
          aria-label="Seleccionar tipo de bloque"
          @pointerdown.stop
          @click.stop
        >
          <p class="bloque-texto__menu-titulo">Bloques básicos</p>

          <button
            v-for="tipo in tiposBloque"
            :key="tipo.id"
            type="button"
            class="bloque-texto__opcion"
            @click="seleccionarTipoBloque(tipo)"
          >
            <span class="bloque-texto__opcion-icono">
              {{ tipo.icono }}
            </span>

            <span class="bloque-texto__opcion-textos">
              <span class="bloque-texto__opcion-titulo">
                {{ tipo.etiqueta }}
              </span>

              <span class="bloque-texto__opcion-descripcion">
                {{ tipo.descripcion }}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <LandingBuilderModalAlineacionTexto
      ref="modalAlineacionTexto"
      @guardar-estilos="guardarEstilosBloque"
    />
  </section>
</template>

<style scoped lang="scss">
.editor-bloques {
  position: relative;
  z-index: 40;
  overflow: visible;
  padding-top: 28px;
  padding-bottom: 28px;

  &__lista {
    display: flex;
    overflow: visible;
    flex-direction: column;
    gap: 2px;
  }

  &__inicio,
  &__linea-final {
    position: relative;
    z-index: 200;
    display: flex;
    min-height: 44px;
    align-items: center;
    gap: 8px;
    padding-left: 28px;
    color: var(--texto-secundario);
  }

  &__boton-inicial,
  &__boton-final {
    display: inline-flex;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--texto-secundario);
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: rgb(255 255 255 / 8%);
      color: inherit;
    }

    svg {
      width: 16px;
      height: 16px;
    }
  }

  &__inicio span,
  &__linea-final span {
    font-size: 0.9375rem;
  }

  &__menu-inicial,
  &__menu-final {
    top: 38px;
    left: 60px;
  }
}

.bloque-texto {
  position: relative;
  z-index: 1;
  display: block;
  min-height: 44px;
  margin-top: 4px;
  border-radius: 12px;
  isolation: isolate;
  overflow: visible;

  &--arrastrando {
    opacity: 0.55;
  }

  &::before {
    position: absolute;
    inset: -4px -10px;
    z-index: -1;
    border: 1px solid transparent;
    border-radius: 12px;
    background: transparent;
    pointer-events: none;
    content: '';
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  &--activo {
    z-index: 250;
  }

  &--activo::before {
    border-color: rgb(255 255 255 / 10%);
    background: rgb(255 255 255 / 4%);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 4%);
  }

  &__herramientas {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    z-index: 20;
    display: inline-flex;
    height: 26px;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 2px 4px;
    border: 1px solid rgb(255 255 255 / 14%);
    border-radius: 999px;
    opacity: 0;
    background: rgb(105 28 50 / 68%);
    box-shadow: 0 8px 18px rgb(0 0 0 / 18%);
    pointer-events: none;
    backdrop-filter: blur(10px) saturate(120%);
    -webkit-backdrop-filter: blur(10px) saturate(120%);
    transform: translateY(4px);
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
  }

  &--activo &__herramientas {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
  &__boton-agregar,
  &__boton-editar,
  &__boton-mover,
  &__boton-eliminar {
    display: inline-flex;
    width: 22px;
    height: 22px;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--texto-secundario);
    cursor: pointer;
    touch-action: none;

    &:hover,
    &:focus-visible {
      background: rgb(255 255 255 / 12%);
      color: inherit;
    }

    svg {
      width: 14px;
      height: 14px;
    }
  }

  &__boton-mover {
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__contenido {
    position: relative;
    z-index: 1;
    min-width: 0;
    margin: 0;
    padding: 4px 0;
    outline: none;
    color: inherit;
    overflow-wrap: anywhere;

    &:focus-visible {
      outline: none;
    }

    &:empty::before {
      color: var(--texto-secundario);
      content: attr(data-placeholder);
      opacity: 0.75;
      pointer-events: none;
    }

    &--h1 {
      font-size: 2rem;
      font-weight: 500;
      line-height: 1.25;
    }

    &--h2 {
      font-size: 1.5rem;
      font-weight: 500;
      line-height: 1.3;
    }

    &--parrafo {
      font-size: 1rem;
      line-height: 1.6;
    }
  }

  &__menu {
    position: absolute;
    top: 4px;
    left: 0;
    z-index: 1000;
    width: min(320px, calc(100vw - 48px));
    overflow: hidden;
    border: 1px solid rgb(255 255 255 / 18%);
    border-radius: 10px;
    background: var(--color-primario-5, #3b111d);
    box-shadow: 0 18px 36px rgb(0 0 0 / 32%);
    color: white;
  }

  &__menu-titulo {
    margin: 0;
    padding: 12px 14px 6px;
    color: rgb(255 255 255 / 68%);
    font-size: 0.75rem;
    font-weight: 600;
  }

  &__opcion {
    display: grid;
    width: 100%;
    grid-template-columns: 34px 1fr;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: rgb(255 255 255 / 9%);
    }
  }

  &__opcion-icono {
    color: rgb(255 255 255 / 72%);
    font-size: 0.875rem;
    font-weight: 700;
  }

  &__opcion-textos {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
  }

  &__opcion-titulo {
    font-size: 0.9375rem;
    font-weight: 600;
  }

  &__opcion-descripcion {
    color: rgb(255 255 255 / 52%);
    font-size: 0.75rem;
  }
}

@media (hover: none), (pointer: coarse), (max-width: 767px) {
  .editor-bloques {
    padding-top: 18px;
    padding-bottom: 20px;

    &__inicio,
    &__linea-final {
      min-height: 42px;
      padding-left: 0;
      padding-right: 0;
    }

    &__menu-inicial,
    &__menu-final {
      top: 44px;
      left: 0;
      width: min(300px, calc(100vw - 48px));
    }
  }

  .bloque-texto {
    display: block;
    margin-top: 4px;
    overflow: visible;

    &__herramientas {
      bottom: calc(100% + 4px);
      left: 0;
      z-index: 30;
      opacity: 0;
      pointer-events: none;
      transform: translateY(4px);
    }

    &:hover &__herramientas,
    &:focus-within &__herramientas {
      opacity: 0;
      pointer-events: none;
      transform: translateY(4px);
    }

    &--activo &__herramientas,
    &--activo:hover &__herramientas,
    &--activo:focus-within &__herramientas {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    &__menu {
      top: 4px;
      left: 0;
      width: min(300px, calc(100vw - 32px));
    }

    &__contenido {
      min-height: 32px;

      &--h1 {
        font-size: 1.75rem;
      }

      &--h2 {
        font-size: 1.375rem;
      }
    }
  }
}
</style>
