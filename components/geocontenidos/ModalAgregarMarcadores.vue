<script setup>
import { computed, reactive, ref } from 'vue';
import { GestionMarcadores } from '~/utils/geocontenidos/GestionMarcadores';
import pictogramas from '~/utils/geocontenidos/pictogramas.json';

const emit = defineEmits(['guardado']);

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { data: userData } = useAuth();
const { geonodeApi } = config.public;

const modal = ref(null);
const escenaActual = ref(null);

const guardando = ref(false);
const error = ref('');

/**
 * Datos de la escena y su estado de carga.
 */
const escena = reactive({
  cargando: false,
  datos: {},
  idMarcadorActivo: null,
});

// Instancia recreada en cada apertura para no arrastrar marcadores previos.
const gMarcadores = ref(new GestionMarcadores());

// Marcador actualmente en edición (según el selector).
const marcadorActivo = computed(() => gMarcadores.value.byId(escena.idMarcadorActivo));

// La API serializa los decimales como cadenas; sisdai-mapas exige números.
const vistaDelMapa = computed(() => {
  const { map_center_long, map_center_lat, zoom } = escena.datos;
  const vista = { acercamiento: Number(zoom) || 2 };

  if (map_center_long && map_center_lat) {
    vista.centro = [Number(map_center_long), Number(map_center_lat)];
  } else {
    vista.extension = '-118.3651,14.5321,-86.7104,32.7187';
  }

  return vista;
});

async function API(endPoint, method = 'GET', body = {}) {
  const parametros = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (method !== 'GET') {
    parametros.body = JSON.stringify(body);
    const token = userData.value?.accessToken;
    if (token) parametros.headers.Authorization = `Bearer ${token}`;
  }
  const respuesta = await gnoxyFetch(`${geonodeApi}/${endPoint}`, parametros);
  return await respuesta.json();
}

function idMarcadorActivoValido(id) {
  return id !== undefined && id !== null ? String(id) : undefined;
}

async function consultarEscena() {
  escena.cargando = true;
  const datos = await API(`scenes/${escenaActual.value}`);

  escena.datos = datos;
  escena.idMarcadorActivo = idMarcadorActivoValido(datos.markers?.[0]?.id);
  gMarcadores.value.almacenados = datos.markers;
  delete escena.datos.markers;

  escena.cargando = false;
}

function crearMarca() {
  const nuevaMarca = {
    id: `nuevo-${Date.now()}`,
    scene: escenaActual.value,
    lat: undefined,
    lng: undefined,
    title: 'Nuevo marcador',
    image_url: null,
    content: '',
    icon: String.fromCharCode(parseInt(pictogramas['ayuda'], 16)),
    color: 'pink',
  };
  gMarcadores.value.almacenar.push(nuevaMarca);
  escena.idMarcadorActivo = idMarcadorActivoValido(nuevaMarca.id);
}

function clickVista({ coordenadas }) {
  if (!escena.idMarcadorActivo) {
    crearMarca();
  }
  gMarcadores.value.byId(escena.idMarcadorActivo).lat = coordenadas[1].toFixed(10);
  gMarcadores.value.byId(escena.idMarcadorActivo).lng = coordenadas[0].toFixed(10);
}

function fallo({ errors }) {
  error.value = errors.join(' ');
  guardando.value = false;
}

async function guardarCambios() {
  guardando.value = true;
  error.value = '';

  try {
    for await (const marcador of gMarcadores.value.actualizar) {
      const datos = await API(`scene-markers/${marcador.id}/`, 'PATCH', marcador);
      if (datos?.success === false) return fallo(datos);
    }

    if (gMarcadores.value.almacenar.length) {
      const datos = await API(
        `scene-markers/bulk-add/${escenaActual.value}/`,
        'POST',
        gMarcadores.value.almacenar
      );
      if (datos?.success === false) return fallo(datos);
    }

    guardando.value = false;
    emit('guardado');
    cerrar();
  } catch {
    error.value = 'Ocurrió un error al guardar los marcadores.';
    guardando.value = false;
  }
}

/**
 * Abre el modal para la escena indicada, reiniciando el estado.
 * @param {string|number} escenaId identificador de la escena
 */
function abrir(escenaId) {
  escenaActual.value = escenaId;
  gMarcadores.value = new GestionMarcadores();
  escena.datos = {};
  escena.idMarcadorActivo = null;
  escena.cargando = false;
  guardando.value = false;
  error.value = '';

  modal.value?.abrir();

  consultarEscena();
}

function cerrar() {
  modal.value?.cerrar();
}

defineExpose({ abrir, cerrar });
</script>

<template>
  <ClientOnly>
    <GeocontenidosSisdaiModal ref="modal" tamanio-modal="modal-grande">
      <template #encabezado>
        <h1 class="m-t-0">Agregar/Editar marcadores</h1>
      </template>

      <form id="form-marcadores" class="gestion-marcadores" @submit.prevent="guardarCambios">
        <p class="m-t-0">
          Agrega puntos de interés en el mapa de esta escena.
          {{ gMarcadores.visualizar.length }} marcador{{
            gMarcadores.visualizar.length !== 1 ? 'es' : ''
          }}
          en esta escena.
        </p>

        <GeocontenidosLoader v-if="escena.cargando" />

        <div v-else class="dos-columnas">
          <section class="col-mapa">
            <h2 class="seccion-titulo">Mapa interactivo</h2>
            <p class="texto-secundario m-t-0">
              Haz click en el mapa para seleccionar la ubicación del marcador.
            </p>

            <MapasVisor
              class="mapa-escena borde borde-color-secundario"
              :vista="vistaDelMapa"
              :capas="escena.datos.layers"
              :marcadores="gMarcadores.visualizar"
              :base-layer="escena.datos.styles?.base_layer || 'satellite'"
              :opciones="{ info: false, cambiarBase: false, leyenda: false, coordenadas: false }"
              @click-vista="clickVista"
            />

            <template v-if="marcadorActivo">
              <div class="campos-marcadores flex flex-contenido-separado" style="gap: 0">
                <fieldset class="columna-8">
                  <label for="lng">Longitud</label>
                  <input
                    id="lng"
                    v-model="marcadorActivo.lng"
                    type="number"
                    step="any"
                    max="180"
                    min="-180"
                    required
                  />
                </fieldset>

                <fieldset class="columna-8">
                  <label for="lat">Latitud</label>
                  <input
                    id="lat"
                    v-model="marcadorActivo.lat"
                    type="number"
                    step="any"
                    max="90"
                    min="-90"
                    required
                  />
                </fieldset>
              </div>

              <fieldset class="m-t-0">
                <label>Icono</label>
                <GeocontenidosSelectorIcono v-model="marcadorActivo.icon" />
              </fieldset>

              <fieldset>
                <label for="color">Color del marcador</label>
                <input id="color" v-model="marcadorActivo.color" type="color" required />
              </fieldset>
            </template>
          </section>

          <section class="col-panel">
            <div class="flex flex-contenido-separado" style="align-items: center">
              <h2 class="seccion-titulo m-0">Marcadores</h2>

              <button
                type="button"
                class="boton-primario boton-chico"
                style="height: fit-content"
                @click="crearMarca"
              >
                Agregar
                <span class="pictograma-agregar" aria-hidden="true" />
              </button>
            </div>

            <fieldset>
              <label for="marcador-activo">Marcador</label>
              <select id="marcador-activo" v-model="escena.idMarcadorActivo">
                <option
                  v-for="m in gMarcadores.visualizar"
                  :key="`opcion-marcador-${m.id}`"
                  :value="String(m.id)"
                >
                  {{ m.title }}
                </option>
              </select>
            </fieldset>

            <p v-if="!marcadorActivo" class="texto-secundario">
              No hay marcadores en esta escena. Usa «Agregar» o haz click en el mapa.
            </p>

            <template v-else>
              <fieldset>
                <label for="titulo">Titulo</label>
                <input id="titulo" v-model="marcadorActivo.title" type="text" required />
              </fieldset>

              <fieldset>
                <label for="imagen">Url de la imagen (opcional)</label>
                <input
                  id="imagen"
                  v-model="marcadorActivo.image_url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  type="url"
                />
              </fieldset>

              <fieldset>
                <label>Descripción</label>
                <UiEditorTexto v-model="marcadorActivo.content" />
              </fieldset>
            </template>
          </section>
        </div>
      </form>

      <template #pie>
        <div class="pie-modal">
          <p v-if="error" class="texto-error m-0">{{ error }}</p>
          <div class="flex flex-contenido-final">
            <button type="button" class="boton-secundario" @click="cerrar">Cerrar</button>

            <button
              type="submit"
              form="form-marcadores"
              class="boton-primario"
              :disabled="guardando || !gMarcadores.hayCambios"
            >
              {{ guardando ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </div>
      </template>
    </GeocontenidosSisdaiModal>
  </ClientOnly>
</template>

<style lang="scss" scoped>
.modal {
  border: 2px solid var(--color-secundario-2);
}

.modal::backdrop {
  background-color: rgba(0, 0, 0, 0.8);
}

.dos-columnas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;

  // Los items de grid tienen min-width:auto: sin esto, el editor (CKEditor) con
  // texto largo ensancha su columna hacia la derecha en lugar de crecer hacia
  // abajo. min-width:0 mantiene la pista en 1fr y obliga a que el texto envuelva.
  > * {
    min-width: 0;
  }
}

.seccion-titulo {
  font-size: 1rem;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.col-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.campos-marcadores {
  margin-top: 56px;
}

.pie-modal {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.texto-error {
  color: var(--color-error, #c0392b);
}

:deep(.modal) {
  margin-top: -20rem !important;
  margin-bottom: 2vh !important;
}
:deep(.modal-cuerpo) {
  max-height: calc(76vh - 120px) !important;
}
:deep(.modal-pie) {
  margin-top: 20px !important;
}

@media (max-width: 900px) {
  .dos-columnas {
    grid-template-columns: 1fr;
  }
}

fieldset {
  margin: 0 0 12px 0;
  min-width: 0;
}
</style>

<style lang="scss">
.gestion-marcadores .sisdai-mapa.gema {
  height: 340px;
}

// El editor no debe desbordar su columna; el texto largo envuelve hacia abajo.
.gestion-marcadores .editor-texto,
.gestion-marcadores .ck.ck-editor,
.gestion-marcadores .ck.ck-editor__main,
.gestion-marcadores .ck-editor__editable {
  min-width: 0;
  max-width: 100%;
}
.gestion-marcadores .ck-content {
  overflow-wrap: break-word;
  word-break: break-word;
}

// Altura minima del area editable del CKEditor.
.gestion-marcadores .ck-editor__editable_inline,
.gestion-marcadores .ck-editor__editable {
  min-height: 225px;
}
</style>
