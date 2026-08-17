<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

definePageMeta({ middleware: 'auth' });

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { data: userData } = useAuth();
const { escenario: escenarioId, escena: escenaId } = useRoute().params;

const ESTILOS_POR_DEFECTO = { text_panel: 40, map_panel: 60 };

const modalStatus = ref(null);
const estatusAlGuardar = reactive({
  cargando: false,
  estado: undefined,
  mensaje: '',
  textoCargando: '',
});

const escena = reactive({
  name: '',
  text_content: '',
  scenario: escenarioId,
  text_position: 'left',
  map_center_lat: null,
  map_center_long: null,
  zoom: null,
  base_layer: 'satellite',
  styles: { ...ESTILOS_POR_DEFECTO },
  layers: [],
  markers: [],
});

async function cargarDatosEscena() {
  if (escenaId === 'nuevo') return;

  const url = `${config.public.geonodeApi}/scenes/${escenaId}`;
  const respuesta = await gnoxyFetch(url);
  const data = await respuesta.json();

  Object.assign(escena, data);
  escena.styles = { ...ESTILOS_POR_DEFECTO, ...data.styles };
  escena.base_layer = escena.styles.base_layer || 'satellite';
}
cargarDatosEscena();

async function guardarCambios() {
  modalStatus.value?.abrirModal();
  estatusAlGuardar.cargando = true;
  estatusAlGuardar.textoCargando = 'Guardando...';

  escena.zoom = escena.zoom !== null ? Number(Number(escena.zoom).toFixed(1)) : null;

  const url = `${config.public.geonodeApi}/scenes/${escenaId !== 'nuevo' ? `${escenaId}/` : ''}/`;
  const { base_layer, ...cuerpo } = escena;
  cuerpo.styles = { ...escena.styles, base_layer };

  const respuesta = await gnoxyFetch(url, {
    method: escenaId === 'nuevo' ? 'POST' : 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userData.value?.accessToken}`,
    },
    body: JSON.stringify(cuerpo),
  });

  const data = await respuesta.json();

  if (data?.success === false) {
    estatusAlGuardar.cargando = false;
    estatusAlGuardar.mensaje = data.errors.join(' ');
    estatusAlGuardar.estado = false;
    return;
  }

  estatusAlGuardar.cargando = false;
  estatusAlGuardar.estado = true;
  setTimeout(() => {
    modalStatus.value?.cerrarModal();

    if (escenaId === 'nuevo') {
      navigateTo(`/geocontenidos/geohistorias/${escenarioId}/escenas/`);
    } else {
      reloadNuxtApp();
    }
  }, 1500);
}

function alMoverVista({ acercamiento, centro }) {
  escena.map_center_long = centro[0];
  escena.map_center_lat = centro[1];
  escena.zoom = Number(Number(acercamiento).toFixed(1));
}
const vistaDelMapa = computed(() => {
  // La API serializa los decimales como cadenas; sisdai-mapas exige números.
  const vista = { acercamiento: Number(escena.zoom) || 2 };

  if (escena.map_center_long && escena.map_center_lat) {
    vista.centro = [Number(escena.map_center_long), Number(escena.map_center_lat)];
  } else {
    vista.extension = '-118.3651,14.5321,-86.7104,32.7187';
  }

  return vista;
});
</script>

<template>
  <form @submit.prevent="guardarCambios">
    <section class="flex p-y-3">
      <NuxtLink
        :to="`/geocontenidos/geohistorias/${escenarioId}/escenas`"
        class="boton boton-secundario boton-chico"
      >
        <span class="pictograma-flecha-izquierda m-r-1" />
      </NuxtLink>

      <h2 class="m-0">Edición de la escena</h2>
    </section>

    <section>
      <div class="m-b-4">
        <label for="nombre">Nombre de la escena <span class="requerido">*</span></label>
        <input
          id="nombre"
          v-model="escena.name"
          type="text"
          placeholder="Ej: Vista general del área de estudio"
          required
        />
      </div>

      <div class="m-b-4">
        <label>Contenido de la escena</label>
        <UiEditorTexto v-model="escena.text_content" />
      </div>

      <div class="m-b-4">
        <label for="posicion">Posición del texto</label>
        <select id="posicion" v-model="escena.text_position">
          <option value="left">Izquierda</option>
          <option value="right">Derecha</option>
        </select>
      </div>
    </section>

    <section class="m-b-4">
      <h2>Vista previa interactiva</h2>

      <div class="grid">
        <div class="columna-8-mov columna-6-esc">
          <p class="m-t-0">Ajusta el mapa y zoom para ajustar la vista</p>

          <fieldset>
            <label for="lng">Longitud <span class="requerido">*</span></label>
            <input
              id="lng"
              v-model="escena.map_center_long"
              type="number"
              step="any"
              max="180"
              min="-180"
              required
            />
          </fieldset>

          <fieldset>
            <label for="lat">Latitud <span class="requerido">*</span></label>
            <input
              id="lat"
              v-model="escena.map_center_lat"
              type="number"
              step="any"
              max="90"
              min="-90"
              required
            />
          </fieldset>

          <fieldset>
            <label for="zoom">Nivel de acercamiento <span class="requerido">*</span></label>
            <input
              id="zoom"
              v-model="escena.zoom"
              type="number"
              step="0.1"
              max="90"
              min="-90"
              required
            />
          </fieldset>

          <fieldset>
            <label for="capa-base">Capa base</label>
            <select id="capa-base" v-model="escena.base_layer">
              <option value="osm">OpenStreetMap</option>
              <option value="carto">Carto Light</option>
              <option value="carto_dark">Carto Dark</option>
              <option value="satellite">Satélite</option>
            </select>
          </fieldset>
        </div>

        <MapasVisor
          :vista="vistaDelMapa"
          class="columna-8-mov columna-10-esc"
          :capas="escena.layers"
          :marcadores="escena.markers"
          :base-layer="escena.base_layer"
          :opciones="{ titulo: escena.name }"
          @vista="alMoverVista"
        />
      </div>
    </section>

    <section class="flex flex-contenido-final">
      <NuxtLink to="/geocontenidos/geohistorias" class="boton boton-secundario">Volver</NuxtLink>

      <input type="submit" class="boton-primario" value="Guardar" />
    </section>

    <ClientOnly>
      <SisdaiModal ref="modalStatus">
        <template #encabezado>
          <span v-if="estatusAlGuardar.cargando" />
          <h2 v-else>{{ estatusAlGuardar.estado ? 'Guardado con éxito' : 'Error' }}</h2>
        </template>

        <template #cuerpo>
          <GeocontenidosLoader
            v-if="estatusAlGuardar.cargando"
            :mensaje="estatusAlGuardar.textoCargando"
          />

          <p v-else-if="estatusAlGuardar.estado === false" v-text="estatusAlGuardar.mensaje" />

          <p v-else>
            <span class="pictograma-aprobado pictograma-grande" />
          </p>
        </template>
      </SisdaiModal>
    </ClientOnly>
  </form>
</template>
