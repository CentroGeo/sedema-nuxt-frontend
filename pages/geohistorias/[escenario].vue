<script setup>
definePageMeta({ layout: 'geohistorias' });

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { escenario: idEscenario, escena } = useRoute().params;

/**
 *
 */
const escenario = reactive({
  cargando: false,
  datos: {},
  sinEscenas: false,
});

/**
 * Realiza la consulta del escenario
 */
async function consutarEscenario() {
  escenario.cargando = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/scenarios/${idEscenario}`);

  const data = await respuesta.json();
  Object.assign(escenario.datos, data);

  await validarEscena(data.scenes);
  escenario.cargando = false;
}
consutarEscenario();

/**
 * Valida si la escena existe o es parte del escenario, si no lo es se redirige a una escena válida
 * @param {Array<scenes>} Escenas del escenario
 */
async function validarEscena(scenes) {
  if (!scenes?.length) {
    escenario.sinEscenas = true;
    return;
  }
  if (escena === undefined || !scenes.map(({ id }) => String(id)).includes(escena)) {
    await redirigir(scenes[0].id);
  }
}

/**
 * Redirige la navegación a una escena
 * @param {Number|String} Identificador de la escena
 */
async function redirigir(escenaId) {
  await navigateTo(`/geohistorias/${idEscenario}/${escenaId}`);
}

/**
 * Tooltip flotante con el título de la escena, para los nodos de la línea del tiempo.
 */
const tooltip = reactive({
  visible: false,
  texto: '',
  posicion: 'top',
  x: 0,
  y: 0,
});

const ANCHO_MAXIMO = 250;
const ALTO_ESTIMADO = 40;
const MARGEN = 12;

const colorTooltip = computed(
  () => escenario.datos.scenes_layout_styles?.gradient_start || '#9333ea'
);

/**
 * Coloca el tooltip junto al nodo, eligiendo el lado con espacio disponible
 * @param {MouseEvent|FocusEvent} evento Evento del nodo (hover o foco)
 * @param {String} texto Título de la escena
 */
function alEntrarTab(evento, texto) {
  if (!texto) return;

  const rect = evento.currentTarget.getBoundingClientRect();
  const ancho = Math.min(texto.length * 8 + 24, ANCHO_MAXIMO);

  const espacioArriba = rect.top;
  const espacioAbajo = window.innerHeight - rect.bottom;
  const espacioIzquierda = rect.left;
  const espacioDerecha = window.innerWidth - rect.right;
  const alto = ALTO_ESTIMADO + MARGEN;

  let posicion = 'top';
  let x = rect.left + rect.width / 2;
  let y = rect.top;

  if (espacioArriba < alto && espacioAbajo > alto) {
    posicion = 'bottom';
    y = rect.bottom;
  } else if (espacioArriba < alto && espacioAbajo < alto) {
    if (espacioDerecha > ancho + MARGEN) {
      posicion = 'right';
      x = rect.right;
      y = rect.top + rect.height / 2;
    } else if (espacioIzquierda > ancho + MARGEN) {
      posicion = 'left';
      x = rect.left;
      y = rect.top + rect.height / 2;
    }
  }

  if (posicion === 'top' || posicion === 'bottom') {
    // Evita que se salga horizontalmente de la ventana.
    const mitad = ancho / 2;
    x = Math.min(Math.max(x, mitad + MARGEN), window.innerWidth - mitad - MARGEN);
  }

  Object.assign(tooltip, { visible: true, texto, posicion, x, y });
}

function alSalirTab() {
  tooltip.visible = false;
  tooltip.texto = '';
}
</script>

<template>
  <main class="escenario">
    <GeocontenidosLoader v-if="escenario.cargando" />

    <p v-else-if="escenario.sinEscenas" class="escenario__sin-escenas">
      Este escenario no tiene escenas configuradas.
    </p>

    <template v-else>
      <ClientOnly>
        <Teleport to="body">
          <Transition name="tooltip-escena">
            <div
              v-if="tooltip.visible && tooltip.texto"
              class="tooltip-escena"
              :class="`tooltip-escena--${tooltip.posicion}`"
              :style="{
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                '--tooltip-borde': colorTooltip,
              }"
              role="tooltip"
            >
              <div class="tooltip-escena__contenido">{{ tooltip.texto }}</div>
            </div>
          </Transition>
        </Teleport>
      </ClientOnly>

      <GeocontenidosTab
        v-if="escenario.datos.scenes_layout_styles.timeline_position === 'top'"
        :tabs="escenario.datos.scenes"
        :layout-styles="escenario.datos.scenes_layout_styles"
        @al-click-tab="redirigir"
        @al-entrar-tab="alEntrarTab"
        @al-salir-tab="alSalirTab"
      />

      <NuxtPage
        :titulo="escenario.datos.name"
        :escenas="escenario.datos.scenes"
        :gradiente="[
          escenario.datos.scenes_layout_styles.gradient_start,
          escenario.datos.scenes_layout_styles.gradient_end,
        ]"
        :text-panel="escenario.datos.scenes_layout_styles.text_panel"
        :style="`--ancho-panel-texto: ${escenario.datos.scenes_layout_styles.text_panel}%`"
      />

      <GeocontenidosTab
        v-if="escenario.datos.scenes_layout_styles.timeline_position === 'bottom'"
        :layout-styles="escenario.datos.scenes_layout_styles"
        :tabs="escenario.datos.scenes"
        @al-click-tab="redirigir"
        @al-entrar-tab="alEntrarTab"
        @al-salir-tab="alSalirTab"
      />
    </template>
  </main>
</template>

<!-- Sin scope: el tooltip se teletransporta al body. -->
<style lang="scss">
.tooltip-escena {
  position: fixed;
  pointer-events: none;
  z-index: 9999;

  &__contenido {
    position: relative;
    max-width: 250px;
    padding: 0.5rem 0.75rem;
    border: 2px solid var(--tooltip-borde, #9333ea);
    border-radius: 0.5rem;
    background: #fff;
    color: #000;
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.2),
      0 4px 6px -2px rgba(0, 0, 0, 0.1);
    font-size: 0.75rem;
    font-weight: 600;
    white-space: normal;
    word-wrap: break-word;

    &::after {
      content: '';
      position: absolute;
      border: 6px solid transparent;
    }
  }

  &--top {
    transform: translate(-50%, -100%);
    margin-top: -8px;

    .tooltip-escena__contenido::after {
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-top-color: var(--tooltip-borde, #9333ea);
    }
  }

  &--bottom {
    transform: translate(-50%, 0);
    margin-top: 8px;

    .tooltip-escena__contenido::after {
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-bottom-color: var(--tooltip-borde, #9333ea);
    }
  }

  &--right {
    transform: translate(0, -50%);
    margin-left: 8px;

    .tooltip-escena__contenido::after {
      top: 50%;
      right: 100%;
      transform: translateY(-50%);
      border-right-color: var(--tooltip-borde, #9333ea);
    }
  }

  &--left {
    transform: translate(-100%, -50%);
    margin-left: -8px;

    .tooltip-escena__contenido::after {
      top: 50%;
      left: 100%;
      transform: translateY(-50%);
      border-left-color: var(--tooltip-borde, #9333ea);
    }
  }
}

.tooltip-escena-enter-active {
  transition: opacity 0.2s ease;
}
.tooltip-escena-leave-active {
  transition: opacity 0.15s ease;
}
.tooltip-escena-enter-from,
.tooltip-escena-leave-to {
  opacity: 0;
}
</style>
