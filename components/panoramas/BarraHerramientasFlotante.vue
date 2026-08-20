<script setup>
const props = defineProps({
  topicosCapas: {
    type: Array,
    default: () => [],
  },
  topicosTexto: {
    type: Array,
    default: () => [],
  },
  wmsExternos: {
    type: Array,
    default: () => [],
  },
  herramientasVisibles: {
    type: Array,
    default: () => ['wms', 'capas', 'texto', 'informacion'],
  },
  mostrarAgregarWms: {
    type: Boolean,
    default: false,
  },
  mostrarVerWms: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'seleccionar-herramienta',
  'seleccionar-topico',
  'alternar-wms',
  'reintentar-wms',
  'agregar-wms',
  'ver-wms',
]);

const barraAbierta = ref(false);
const seccionAbierta = ref(null);

const barraRef = ref(null);

const posicionBarra = reactive({
  x: 16,
  y: 16,
});

const arrastreBarra = reactive({
  activo: false,
  movido: false,
  pointerId: null,
  inicioX: 0,
  inicioY: 0,
  posicionInicialX: 0,
  posicionInicialY: 0,
});

const direccionHorizontal = ref('derecha');
const direccionVertical = ref('abajo');

const estiloBarra = computed(() => ({
  left: `${posicionBarra.x}px`,
  top: `${posicionBarra.y}px`,
}));

function limitarPosicionBarra(x, y) {
  const barra = barraRef.value;
  const contenedor = barra?.parentElement;

  if (!barra || !contenedor) {
    return { x, y };
  }

  const margen = 8;
  const anchoBoton = barra.offsetWidth;
  const altoBoton = barra.offsetHeight;

  return {
    x: Math.min(
      Math.max(margen, x),
      Math.max(margen, contenedor.clientWidth - anchoBoton - margen)
    ),
    y: Math.min(
      Math.max(margen, y),
      Math.max(margen, contenedor.clientHeight - altoBoton - margen)
    ),
  };
}

function actualizarDireccionApertura() {
  const barra = barraRef.value;
  const contenedor = barra?.parentElement;

  if (!barra || !contenedor) return;

  const centroX = posicionBarra.x + barra.offsetWidth / 2;
  const centroY = posicionBarra.y + barra.offsetHeight / 2;

  direccionHorizontal.value = centroX <= contenedor.clientWidth / 2 ? 'derecha' : 'izquierda';

  direccionVertical.value = centroY <= contenedor.clientHeight / 2 ? 'abajo' : 'arriba';
}

function ajustarBarraALimite() {
  const posicion = limitarPosicionBarra(posicionBarra.x, posicionBarra.y);

  posicionBarra.x = posicion.x;
  posicionBarra.y = posicion.y;

  actualizarDireccionApertura();
}

function iniciarArrastreBarra(evento) {
  if (evento.pointerType === 'mouse' && evento.button !== 0) return;

  const boton = evento.currentTarget;

  arrastreBarra.activo = true;
  arrastreBarra.movido = false;
  arrastreBarra.pointerId = evento.pointerId;
  arrastreBarra.inicioX = evento.clientX;
  arrastreBarra.inicioY = evento.clientY;
  arrastreBarra.posicionInicialX = posicionBarra.x;
  arrastreBarra.posicionInicialY = posicionBarra.y;

  boton.setPointerCapture?.(evento.pointerId);
}

function moverBarra(evento) {
  if (!arrastreBarra.activo || evento.pointerId !== arrastreBarra.pointerId) {
    return;
  }

  const desplazamientoX = evento.clientX - arrastreBarra.inicioX;
  const desplazamientoY = evento.clientY - arrastreBarra.inicioY;

  if (!arrastreBarra.movido && Math.hypot(desplazamientoX, desplazamientoY) < 5) {
    return;
  }

  arrastreBarra.movido = true;
  evento.preventDefault();

  const posicion = limitarPosicionBarra(
    arrastreBarra.posicionInicialX + desplazamientoX,
    arrastreBarra.posicionInicialY + desplazamientoY
  );

  posicionBarra.x = posicion.x;
  posicionBarra.y = posicion.y;

  actualizarDireccionApertura();
}

function terminarArrastreBarra(evento) {
  if (!arrastreBarra.activo || evento.pointerId !== arrastreBarra.pointerId) {
    return;
  }

  evento.currentTarget.releasePointerCapture?.(evento.pointerId);

  arrastreBarra.activo = false;
  arrastreBarra.pointerId = null;

  actualizarDireccionApertura();
}

function alternarBarraDesdeActivador() {
  if (arrastreBarra.movido) {
    arrastreBarra.movido = false;
    return;
  }

  actualizarDireccionApertura();
  alternarBarra();
}

onMounted(() => {
  nextTick(ajustarBarraALimite);
  window.addEventListener('resize', ajustarBarraALimite);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', ajustarBarraALimite);
});

const catalogoHerramientas = [
  {
    id: 'wms',
    nombre: 'WMS',
    descripcion: 'Servicios WMS externos',
    icono: 'pictograma-enlace-externo',
  },
  {
    id: 'capas',
    nombre: 'Temáticas de capas',
    descripcion: 'Capas disponibles en el panorama',
    icono: 'pictograma-capas',
  },
  {
    id: 'texto',
    nombre: 'Temáticas de texto',
    descripcion: 'Contenidos informativos',
    icono: 'pictograma-vista-simplificada',
  },
  {
    id: 'informacion',
    nombre: 'Información',
    descripcion: 'Información general del panorama',
    icono: 'pictograma-informacion',
  },
];

const herramientas = computed(() =>
  catalogoHerramientas.filter((herramienta) => props.herramientasVisibles.includes(herramienta.id))
);

const topicosCapasOrdenados = computed(() =>
  [...props.topicosCapas].sort((a, b) => a.stack_order - b.stack_order)
);

const topicosTextoOrdenados = computed(() =>
  [...props.topicosTexto].sort((a, b) => a.stack_order - b.stack_order)
);

function alternarBarra() {
  barraAbierta.value = !barraAbierta.value;

  if (!barraAbierta.value) {
    seccionAbierta.value = null;
  }
}

function seleccionarHerramienta(herramientaId) {
  if (['wms', 'capas', 'texto'].includes(herramientaId)) {
    seccionAbierta.value = seccionAbierta.value === herramientaId ? null : herramientaId;

    return;
  }

  emit('seleccionar-herramienta', herramientaId);
  barraAbierta.value = false;
  seccionAbierta.value = null;
}

function seleccionarTopico(tipo, topicoId) {
  emit('seleccionar-topico', {
    tipo,
    id: topicoId,
  });

  barraAbierta.value = false;
  seccionAbierta.value = null;
}

function alternarWms(externo) {
  if (externo.estado === 'loading') {
    return;
  }

  emit('alternar-wms', externo);
}

function reintentarWms(externo) {
  emit('reintentar-wms', externo);
}

function solicitarAgregarWms() {
  emit('agregar-wms');
  barraAbierta.value = false;
  seccionAbierta.value = null;
}

function solicitarVerWms() {
  emit('ver-wms');
  barraAbierta.value = false;
  seccionAbierta.value = null;
}
</script>

<template>
  <div
    ref="barraRef"
    class="barra-herramientas"
    :class="[
      {
        'barra-herramientas--abierta': barraAbierta,
        'barra-herramientas--arrastrando': arrastreBarra.activo && arrastreBarra.movido,
      },
      `barra-herramientas--${direccionHorizontal}`,
      `barra-herramientas--${direccionVertical}`,
    ]"
    :style="estiloBarra"
  >
    <button
      type="button"
      class="barra-herramientas__activador boton-pictograma boton-primario"
      :aria-expanded="barraAbierta"
      aria-controls="herramientas-panorama"
      :aria-label="barraAbierta ? 'Cerrar herramientas' : 'Abrir herramientas'"
      :title="barraAbierta ? 'Cerrar herramientas' : 'Abrir herramientas'"
      @pointerdown.stop="iniciarArrastreBarra"
      @pointermove.stop="moverBarra"
      @pointerup.stop="terminarArrastreBarra"
      @pointercancel.stop="terminarArrastreBarra"
      @click.stop="alternarBarraDesdeActivador"
    >
      <span v-if="barraAbierta" class="pictograma-cerrar" aria-hidden="true" />

      <span v-else class="barra-herramientas__hamburguesa" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
    </button>

    <Transition name="barra-herramientas">
      <nav
        v-if="barraAbierta"
        id="herramientas-panorama"
        class="barra-herramientas__menu"
        aria-label="Herramientas del panorama"
      >
        <div
          v-for="herramienta in herramientas"
          :key="herramienta.id"
          class="barra-herramientas__grupo"
        >
          <button
            type="button"
            class="barra-herramientas__opcion"
            :aria-label="herramienta.nombre"
            :title="herramienta.descripcion"
            :aria-expanded="
              ['wms', 'capas', 'texto'].includes(herramienta.id)
                ? seccionAbierta === herramienta.id
                : undefined
            "
            @click="seleccionarHerramienta(herramienta.id)"
          >
            <span :class="herramienta.icono" class="barra-herramientas__icono" aria-hidden="true" />

            <span class="barra-herramientas__nombre">
              {{ herramienta.nombre }}
            </span>

            <span
              v-if="['wms', 'capas', 'texto'].includes(herramienta.id)"
              :class="seccionAbierta === herramienta.id ? 'pictograma-arriba' : 'pictograma-abajo'"
              class="barra-herramientas__flecha"
              aria-hidden="true"
            />
          </button>

          <!-- Servicios WMS -->
          <div
            v-if="herramienta.id === 'wms' && seccionAbierta === 'wms'"
            class="barra-herramientas__subopciones barra-herramientas__subopciones--wms"
          >
            <button
              v-if="mostrarAgregarWms"
              type="button"
              class="barra-herramientas__subopcion"
              @click.stop="solicitarAgregarWms"
            >
              <span class="pictograma-mas" aria-hidden="true" />
              <span>Agregar capa WMS</span>
            </button>
            <button
              v-if="mostrarVerWms"
              type="button"
              class="barra-herramientas__subopcion"
              @click.stop="solicitarVerWms"
            >
              <span class="pictograma-capas" aria-hidden="true" />
              <span>Ver capas WMS</span>
            </button>
            <p v-if="wmsExternos.length === 0" class="barra-herramientas__vacio">
              No hay servicios WMS disponibles.
            </p>

            <template v-else>
              <div
                v-for="externo in wmsExternos"
                :key="`wms-${externo.id}`"
                class="barra-herramientas__wms"
              >
                <div class="barra-herramientas__wms-principal">
                  <span class="barra-herramientas__wms-nombre">
                    {{ externo.name }}
                  </span>

                  <button
                    type="button"
                    class="barra-herramientas__interruptor"
                    :class="{
                      'barra-herramientas__interruptor--activo': externo.activo,
                    }"
                    :disabled="externo.estado === 'loading'"
                    role="switch"
                    :aria-checked="externo.activo"
                    :aria-label="`${externo.activo ? 'Desactivar' : 'Activar'} ${externo.name}`"
                    :title="externo.activo ? 'Desactivar' : 'Activar'"
                    @click="alternarWms(externo)"
                  >
                    <span class="barra-herramientas__interruptor-control" aria-hidden="true" />
                  </button>
                </div>

                <div
                  v-if="externo.estado !== 'idle'"
                  class="barra-herramientas__wms-estado"
                  :class="`barra-herramientas__wms-estado--${externo.estado}`"
                  :role="externo.estado === 'error' ? 'alert' : 'status'"
                  aria-live="polite"
                >
                  <span
                    v-if="externo.estado === 'loading'"
                    class="barra-herramientas__wms-spinner"
                    aria-hidden="true"
                  />

                  <span v-else-if="externo.estado === 'success'" aria-hidden="true"> ✓ </span>

                  <span v-else-if="externo.estado === 'error'" aria-hidden="true"> ! </span>

                  <span>{{ externo.mensaje }}</span>

                  <button
                    v-if="externo.estado === 'error'"
                    type="button"
                    class="barra-herramientas__wms-reintentar"
                    @click="reintentarWms(externo)"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </template>
          </div>

          <!-- Temáticas de capas -->
          <div
            v-if="herramienta.id === 'capas' && seccionAbierta === 'capas'"
            class="barra-herramientas__subopciones"
          >
            <p v-if="topicosCapasOrdenados.length === 0" class="barra-herramientas__vacio">
              No hay temáticas de capas.
            </p>

            <template v-else>
              <button
                v-for="topico in topicosCapasOrdenados"
                :key="`capas-${topico.id}`"
                type="button"
                class="barra-herramientas__subopcion"
                @click="seleccionarTopico('capas', topico.id)"
              >
                <img
                  v-if="topico.custom_icon"
                  :src="topico.custom_icon"
                  alt=""
                  class="barra-herramientas__topico-icono"
                />

                <span
                  v-else
                  :class="`pictograma-${topico.icon}`"
                  class="barra-herramientas__topico-icono"
                  aria-hidden="true"
                />

                <span>{{ topico.name }}</span>
              </button>
            </template>
          </div>

          <!-- Temáticas de texto -->
          <div
            v-if="herramienta.id === 'texto' && seccionAbierta === 'texto'"
            class="barra-herramientas__subopciones"
          >
            <p v-if="topicosTextoOrdenados.length === 0" class="barra-herramientas__vacio">
              No hay temáticas de texto.
            </p>

            <template v-else>
              <button
                v-for="topico in topicosTextoOrdenados"
                :key="`texto-${topico.id}`"
                type="button"
                class="barra-herramientas__subopcion"
                @click="seleccionarTopico('texto', topico.id)"
              >
                <img
                  v-if="topico.custom_icon"
                  :src="topico.custom_icon"
                  alt=""
                  class="barra-herramientas__topico-icono"
                />

                <span
                  v-else
                  :class="`pictograma-${topico.icon}`"
                  class="barra-herramientas__topico-icono"
                  aria-hidden="true"
                />

                <span>{{ topico.name }}</span>
              </button>
            </template>
          </div>
        </div>
      </nav>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.barra-herramientas {
  position: absolute;
  z-index: 10;
  width: 48px;
  height: 48px;

  &__hamburguesa {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    width: 22px;
    height: 22px;
    pointer-events: none;

    span {
      display: block;
      width: 100%;
      height: 2px;
      background-color: currentcolor;
      border-radius: 2px;
    }
  }

  &--arrastrando {
    z-index: 20;
    user-select: none;
  }

  &--derecha &__menu {
    right: auto;
    left: calc(100% + 8px);
  }

  &--izquierda &__menu {
    right: calc(100% + 8px);
    left: auto;
  }

  &--abajo &__menu {
    top: 0;
    bottom: auto;
  }

  &--arriba &__menu {
    top: auto;
    bottom: 0;
  }

  &__activador {
    width: 48px;
    height: 48px;
    min-width: 48px;
    padding: 0;
    margin: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border: none;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgb(0 0 0 / 25%);

    cursor: grab;
    touch-action: none;

    .barra-herramientas--arrastrando & {
      cursor: grabbing;
      box-shadow: 0 6px 18px rgb(0 0 0 / 32%);
    }

    > span {
      font-size: 1.35rem;
      pointer-events: none;
    }
  }

  &__menu {
    position: absolute;
    z-index: 1;
    display: flex;
    flex-direction: column;
    width: min(280px, calc(100vw - 96px));
    max-height: calc(100vh - 100px);
    padding: 8px;
    gap: 4px;
    overflow-y: auto;
    background-color: var(--fondo);
    border: 1px solid var(--color-secundario-4);
    border-radius: 10px;
    box-shadow: 0 6px 18px rgb(0 0 0 / 22%);
  }

  &__grupo {
    width: 100%;
  }

  &__opcion,
  &__subopcion {
    display: flex;
    align-items: center;
    width: 100%;
    color: var(--texto);
    text-align: left;
    background-color: transparent;
    border: none;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background-color: var(--color-secundario-5);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primario-1);
      outline-offset: 2px;
    }
  }

  &__opcion {
    min-height: 48px;
    padding: 8px 12px;
    gap: 10px;
    border-radius: 8px;
  }

  &__icono {
    flex-shrink: 0;
    font-size: 1.4rem;
    color: var(--color-primario-1);
  }

  &__nombre {
    flex: 1;
    font-size: 0.85rem;
    line-height: 1.25;
  }

  &__flecha {
    flex-shrink: 0;
    font-size: 1rem;
  }

  &__subopciones {
    margin: 2px 0 6px 20px;
    padding-left: 10px;
    border-left: 2px solid var(--color-secundario-4);
  }

  &__subopcion {
    min-height: 40px;
    padding: 6px 10px;
    gap: 8px;
    font-size: 0.8rem;
    border-radius: 6px;
  }

  &__topico-icono {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    object-fit: contain;
    font-size: 1.2rem;
    color: var(--color-primario-1);
  }

  &__vacio {
    margin: 0;
    padding: 8px 10px;
    font-size: 0.75rem;
    color: var(--texto-secundario);
  }

  &__subopciones--wms {
    margin-left: 10px;
    padding: 2px 0 2px 10px;
  }

  &__wms {
    padding: 10px 8px;
    border-bottom: 1px solid var(--color-secundario-4);

    &:last-child {
      border-bottom: none;
    }
  }

  &__wms-principal {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__wms-nombre {
    min-width: 0;
    flex: 1;
    font-size: 0.8rem;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  &__interruptor {
    position: relative;
    width: 40px;
    height: 22px;
    flex: 0 0 40px;
    padding: 0;
    background-color: var(--color-secundario-3);
    border: 1px solid var(--color-secundario-2);
    border-radius: 999px;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      border-color 160ms ease;

    &:focus-visible {
      outline: 2px solid var(--color-primario-1);
      outline-offset: 2px;
    }

    &:disabled {
      cursor: wait;
      opacity: 0.65;
    }

    &--activo {
      background-color: var(--color-primario-1);
      border-color: var(--color-primario-1);
    }
  }

  &__interruptor-control {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background-color: var(--fondo);
    border-radius: 50%;
    box-shadow: 0 1px 3px rgb(0 0 0 / 30%);
    transition: transform 160ms ease;
  }

  &__interruptor--activo &__interruptor-control {
    transform: translateX(18px);
  }

  &__wms-estado {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 6px;
    font-size: 0.7rem;
    line-height: 1.25;

    &--loading {
      color: var(--color-primario-1);
    }

    &--success {
      color: var(--color-confirmacion-1, #216e4e);
    }

    &--error {
      color: var(--color-error-1, #b42318);
    }
  }

  &__wms-spinner {
    width: 11px;
    height: 11px;
    flex-shrink: 0;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: girar-wms 0.75s linear infinite;
  }

  &__wms-reintentar {
    margin-left: auto;
    padding: 2px 0;
    color: inherit;
    font-size: 0.7rem;
    font-weight: 600;
    text-decoration: underline;
    background: transparent;
    border: none;
    cursor: pointer;

    &:hover {
      text-decoration: none;
    }
  }
}

@keyframes girar-wms {
  to {
    transform: rotate(360deg);
  }
}

.barra-herramientas-enter-active,
.barra-herramientas-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.barra-herramientas-enter-from,
.barra-herramientas-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@media (max-width: 600px) {
  .barra-herramientas {
    width: 44px;
    height: 44px;

    &__activador {
      width: 44px;
      height: 44px;
      min-width: 44px;
    }

    &__menu {
      width: min(260px, calc(100vw - 72px));
      max-height: calc(100vh - 72px);
    }

    &__nombre {
      font-size: 0.8rem;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .barra-herramientas__wms-spinner {
    animation-duration: 1.5s;
  }
}
</style>
