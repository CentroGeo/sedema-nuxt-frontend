<script setup>
const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { escenario: escenarioId, escena: escenaId } = useRoute().params;

const props = defineProps({
  titulo: { type: String, default: '' },
  // [inicio, fin] del degradado del escenario (lo pasa el padre [escenario].vue).
  gradiente: { type: Array, default: () => [] },
  // Ancho del panel de texto en % (scenes_layout_styles.text_panel del escenario).
  textPanel: { type: [Number, String], default: 50 },
  // Escenas del escenario (lo pasa el padre [escenario].vue) para navegar entre ellas.
  escenas: { type: Array, default: () => [] },
});

/**
 *
 */
const escena = reactive({
  cargando: false,
  datos: {},
});

/**
 * Realiza la consulta de la escena
 */
async function consultarEscena() {
  escena.cargando = true;
  const respuesta = await gnoxyFetch(
    `${config.public.geonodeApi}/scenes/${escenaId}?t=${Date.now()}`
  );

  const datos = await respuesta.json();
  for (const key in escena.datos) delete escena.datos[key];
  Object.assign(escena.datos, datos);

  escena.cargando = false;
}

function alCambiarVisibilidadPestania() {
  if (document.visibilityState === 'visible') {
    consultarEscena();
  }
}

onMounted(() => {
  consultarEscena();
  document.addEventListener('visibilitychange', alCambiarVisibilidadPestania);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', alCambiarVisibilidadPestania);
});

const marcador_visible = ref(null);

const isTextPanelCollapsed = ref(false);
function toggleTextPanel() {
  isTextPanelCollapsed.value = !isTextPanelCollapsed.value;
}
const anchoPanelTexto = computed(() => (isTextPanelCollapsed.value ? '0%' : `${props.textPanel}%`));

/**
 * Navega a otra escena del mismo escenario (controles anterior/siguiente)
 * @param {Number|String} id Identificador de la escena destino
 */
function irAEscena(id) {
  navigateTo(`/geohistorias/${escenarioId}/${id}`);
}
</script>

<template>
  <div class="escena flex flex-contenido-centrado">
    <GeocontenidosLoader v-if="escena.cargando" />

    <template v-else>
      <GeocontenidosEscenaTexto
        v-if="escena.datos.text_position === 'left'"
        class="panel-texto p-3 borde-r borde-color-secundario"
        :class="{ colapsado: isTextPanelCollapsed }"
        :style="{ width: anchoPanelTexto }"
        :contenido="escena.datos.text_content"
        :marcador="marcador_visible"
        :escenas="escenas"
        :gradiente="gradiente"
        @al-cerrar="marcador_visible = null"
        @al-navegar="irAEscena"
      />

      <button
        v-if="escena.datos.text_position === 'left'"
        type="button"
        class="toggle-texto"
        :title="isTextPanelCollapsed ? 'Mostrar panel de texto' : 'Ocultar panel de texto'"
        @click="toggleTextPanel"
      >
        <span
          :class="`pictograma-flecha-${isTextPanelCollapsed ? 'derecha' : 'izquierda'}`"
          aria-hidden="true"
        />
      </button>

      <div class="panel-mapa">
        <MapasVisor
          :vista="{
            acercamiento: escena.datos.zoom,
            centro: [escena.datos.map_center_long, escena.datos.map_center_lat],
          }"
          :capas="escena.datos.layers"
          :marcadores="escena.datos.markers"
          :base-layer="escena.datos.styles?.base_layer || 'satellite'"
          :opciones="{ gradienteControles: gradiente }"
          @click-marcador="(marcador) => (marcador_visible = marcador)"
        />
      </div>

      <button
        v-if="escena.datos.text_position === 'right'"
        type="button"
        class="toggle-texto"
        :title="isTextPanelCollapsed ? 'Mostrar panel de texto' : 'Ocultar panel de texto'"
        @click="toggleTextPanel"
      >
        <span
          :class="`pictograma-flecha-${isTextPanelCollapsed ? 'izquierda' : 'derecha'}`"
          aria-hidden="true"
        />
      </button>

      <GeocontenidosEscenaTexto
        v-if="escena.datos.text_position === 'right'"
        class="panel-texto p-3 borde-l borde-color-secundario"
        :class="{ colapsado: isTextPanelCollapsed }"
        :style="{ width: anchoPanelTexto }"
        :contenido="escena.datos.text_content"
        :marcador="marcador_visible"
        :escenas="escenas"
        :gradiente="gradiente"
        @al-cerrar="marcador_visible = null"
        @al-navegar="irAEscena"
      />
    </template>
  </div>
</template>

<style lang="scss" scoped>
.escena {
  width: 100%;
  height: calc(100vh - 82px);
  gap: 0;

  .panel-texto {
    height: inherit;
    overflow-y: auto;
    flex-shrink: 0;
    transition: width 0.3s ease;

    // Al colapsar (ancho 0%) tambien se anula el padding/borde para que no quede
    // ancho residual. Doble clase gana en especificidad a la utilidad `.p-3`.
    &.colapsado {
      padding: 0;
      border: none;
      overflow: hidden;
    }
  }

  .toggle-texto {
    flex: 0 0 auto;
    width: 22px;
    height: inherit;
    border: none;
    cursor: pointer;
    background: var(--color-neutro-1);
    color: var(--color-primario-4);
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      filter: brightness(0.95);
    }
  }

  .panel-mapa {
    flex: 1 1 auto;
    min-width: 0;
    height: inherit;
  }
}
</style>
