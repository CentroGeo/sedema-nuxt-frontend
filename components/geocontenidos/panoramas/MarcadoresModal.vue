<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import { iconosTematicaPanorama } from '~/utils/geocontenidos/basemapsPanorama';
import pictogramas from '~/utils/geocontenidos/pictogramas.json';

const props = defineProps({
  capa: { type: Object, required: true },
});

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { data: userData } = useAuth();

const modal = ref(null);
const cargando = ref(false);
const marcadores = ref([]);

function caracterPictograma(nombre) {
  return String.fromCharCode(parseInt(pictogramas[nombre], 16));
}

const formularioVacio = () => ({
  id: null,
  title: '',
  narrative: '',
  icon: iconosTematicaPanorama[0],
  color: '#df4242',
  lat: null,
  lng: null,
});

const formulario = reactive(formularioVacio());
const guardando = ref(false);
const errorGuardado = ref('');

const capaMapa = computed(() => [
  { name: props.capa.name, opacity: 1, stack_order: 1, visible: true },
]);

const marcadoresMapa = computed(() => {
  const lista = marcadores.value.map((m) => ({
    id: m.id,
    title: m.title,
    content: m.narrative,
    icon: caracterPictograma(m.icon || iconosTematicaPanorama[0]),
    color: (m.options && m.options.color) || '#df4242',
    lat: m.lat,
    lng: m.lng,
  }));

  if (formulario.lat !== null && formulario.lng !== null) {
    lista.push({
      id: 'nuevo',
      title: formulario.title || 'Nueva ubicación',
      content: formulario.narrative,
      icon: caracterPictograma(formulario.icon),
      color: formulario.color,
      lat: formulario.lat,
      lng: formulario.lng,
    });
  }

  return lista;
});

async function cargarMarcadores() {
  cargando.value = true;
  const respuesta = await gnoxyFetch(
    `${config.public.geonodeApi}/panorama-markers/by-layer/${props.capa.id}/`
  );
  marcadores.value = await respuesta.json();
  cargando.value = false;
}

function abrir() {
  Object.assign(formulario, formularioVacio());
  errorGuardado.value = '';
  cargarMarcadores();
  modal.value?.abrirModal();
}

defineExpose({ abrir });

function clickVista({ coordenadas }) {
  // El backend guarda lat/lng en DecimalField(decimal_places=10); los floats crudos de OL
  // suelen traer mas decimales de los permitidos y el guardado truena con un 400.
  formulario.lng = Number(coordenadas[0].toFixed(6));
  formulario.lat = Number(coordenadas[1].toFixed(6));
}

function seleccionarMarcador(marcador) {
  Object.assign(formulario, {
    id: marcador.id,
    title: marcador.title,
    narrative: marcador.narrative || '',
    icon: marcador.icon || iconosTematicaPanorama[0],
    color: (marcador.options && marcador.options.color) || '#df4242',
    lat: marcador.lat,
    lng: marcador.lng,
  });
}

function cancelarSeleccion() {
  Object.assign(formulario, formularioVacio());
}

function extraerMensajeError(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object') return 'Ocurrió un error inesperado.';
  if (Array.isArray(cuerpo.errors)) return cuerpo.errors.join(' ');
  if (cuerpo.detail) return String(cuerpo.detail);
  return Object.entries(cuerpo)
    .map(([campo, mensaje]) => `${campo}: ${Array.isArray(mensaje) ? mensaje.join(' ') : mensaje}`)
    .join(' | ');
}

async function guardarMarcador() {
  if (formulario.lat === null || formulario.lng === null) {
    errorGuardado.value = 'Haz click en el mapa para ubicar el marcador.';
    return;
  }

  errorGuardado.value = '';
  guardando.value = true;

  const esNuevo = formulario.id === null;
  const url = esNuevo
    ? `${config.public.geonodeApi}/panorama-markers/`
    : `${config.public.geonodeApi}/panorama-markers/${formulario.id}/`;

  const cuerpo = {
    layer: props.capa.id,
    title: formulario.title,
    narrative: formulario.narrative,
    icon: formulario.icon,
    lat: formulario.lat,
    lng: formulario.lng,
    options: { color: formulario.color },
  };

  const respuesta = await gnoxyFetch(url, {
    method: esNuevo ? 'POST' : 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userData.value?.accessToken}`,
    },
    body: JSON.stringify(cuerpo),
  });

  guardando.value = false;

  if (!respuesta.ok) {
    errorGuardado.value = extraerMensajeError(await respuesta.json().catch(() => null));
    return;
  }

  cancelarSeleccion();
  await cargarMarcadores();
}

async function eliminarMarcador(id) {
  guardando.value = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panorama-markers/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userData.value?.accessToken}` },
  });
  guardando.value = false;

  if (!respuesta.ok) {
    alert('No se pudo eliminar la ubicación.');
    return;
  }

  if (formulario.id === id) cancelarSeleccion();
  await cargarMarcadores();
}
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modal" tamanio-modal="modal-grande">
      <template #encabezado>
        <h2 class="m-t-0 m-b-0">Ubicaciones de la capa: {{ capa.dataset_title || capa.name }}</h2>
      </template>

      <template #cuerpo>
        <p class="marcadores-modal__instruccion">
          Selecciona un punto en el mapa para crear una ubicación o elige una ubicación guardada
          para editarla.
        </p>

        <div class="marcadores-modal__distribucion">
          <!-- Mapa -->
          <section class="marcadores-modal__mapa-panel" aria-label="Mapa de ubicaciones">
            <div class="marcadores-modal__contenedor-mapa">
              <MapasVisor
                class="borde borde-color-secundario"
                :vista="{ centro: [-103.5, 23.6], acercamiento: 5 }"
                :capas="capaMapa"
                :marcadores="marcadoresMapa"
                base-layer="satellite"
                :opciones="{
                  info: false,
                  cambiarBase: false,
                  leyenda: false,
                  coordenadas: false,
                }"
                @click-vista="clickVista"
              />
            </div>

            <p class="marcadores-modal__ayuda-mapa texto-color-secundario">
              Selecciona directamente sobre el mapa el punto que deseas registrar.
            </p>
          </section>

          <!-- Panel lateral -->
          <aside class="marcadores-modal__panel">
            <section
              class="marcadores-modal__seccion fondo-color-neutro borde borde-color-secundario texto-color-primario"
            >
              <h3 class="m-t-0">
                {{ formulario.id ? 'Editar ubicación' : 'Nueva ubicación' }}
              </h3>

              <p v-if="errorGuardado" class="texto-color-error" role="alert">
                {{ errorGuardado }}
              </p>

              <form @submit.prevent="guardarMarcador">
                <div class="m-b-4">
                  <label for="marcador-titulo">Título *</label>
                  <input id="marcador-titulo" v-model="formulario.title" type="text" required />
                </div>

                <div class="m-b-4">
                  <label>Narrativa</label>
                  <UiEditorTexto v-model="formulario.narrative" />
                </div>

                <div class="marcadores-modal__personalizacion m-b-4">
                  <div>
                    <label for="marcador-icono">Ícono</label>
                    <GeocontenidosSelectorIcono
                      id="marcador-icono"
                      v-model="formulario.icon"
                      por-nombre
                    />
                  </div>

                  <div class="marcadores-modal__campo-color">
                    <label for="marcador-color">Color</label>
                    <input id="marcador-color" v-model="formulario.color" type="color" />
                  </div>
                </div>

                <div class="marcadores-modal__acciones">
                  <button
                    v-if="formulario.id"
                    type="button"
                    class="boton boton-secundario"
                    @click="cancelarSeleccion"
                  >
                    Cancelar edición
                  </button>

                  <button type="submit" class="boton boton-primario" :disabled="guardando">
                    <svg
                      v-if="!guardando"
                      class="marcadores-modal__icono-boton"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M20 6 9 17l-5-5"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>

                    {{
                      guardando
                        ? 'Guardando...'
                        : formulario.id
                          ? 'Guardar cambios'
                          : 'Guardar ubicación'
                    }}
                  </button>
                </div>
              </form>
            </section>

            <section
              class="marcadores-modal__seccion fondo-color-neutro borde borde-color-secundario texto-color-primario"
            >
              <h3 class="m-t-0">Ubicaciones guardadas</h3>

              <GeocontenidosLoader v-if="cargando" />

              <p v-else-if="marcadores.length === 0" class="texto-tamanio-2 m-b-0">
                Esta capa aún no tiene ubicaciones.
              </p>

              <ul v-else class="lista-sin-estilo marcadores-modal__lista">
                <li
                  v-for="marcador in marcadores"
                  :key="marcador.id"
                  class="marcadores-modal__item"
                  :class="{
                    'marcadores-modal__item--activo': formulario.id === marcador.id,
                  }"
                >
                  <button
                    type="button"
                    class="boton-sin-contenedor-secundario marcadores-modal__seleccionar texto-color-primario"
                    @click="seleccionarMarcador(marcador)"
                  >
                    <span class="pictograma-editar m-r-1" aria-hidden="true" />
                    <span>{{ marcador.title }}</span>
                  </button>

                  <button
                    type="button"
                    class="boton-pictograma boton-sin-contenedor-secundario marcadores-modal__eliminar"
                    aria-label="Eliminar ubicación"
                    title="Eliminar ubicación"
                    @click="eliminarMarcador(marcador.id)"
                  >
                    <span class="pictograma-eliminar" aria-hidden="true" />
                  </button>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>

<style lang="scss">
.marcadores-modal__instruccion {
  margin: 0 0 1rem;
  max-width: 70ch;
}

.marcadores-modal__distribucion {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 1.5rem;
  align-items: start;
}

.marcadores-modal__mapa-panel {
  position: sticky;
  top: 0;
  min-width: 0;
}

.marcadores-modal__contenedor-mapa {
  height: clamp(340px, 50vh, 480px);
  overflow: hidden;
  border-radius: 0.5rem;
}

.marcadores-modal__contenedor-mapa .visor-mapa-contenedor {
  height: 100%;
}

.marcadores-modal__ayuda-mapa {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  line-height: 1.35;
}

.marcadores-modal__panel {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.marcadores-modal__seccion {
  padding: 1.25rem;
  border-radius: 0.5rem;
}

.marcadores-modal__personalizacion {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: end;
}

.marcadores-modal__campo-color {
  min-width: 72px;
}

.marcadores-modal__campo-color input[type='color'] {
  display: block;
  width: 100%;
  min-width: 64px;
  height: 44px;
  padding: 0.25rem;
  cursor: pointer;
}

.marcadores-modal__acciones {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.marcadores-modal__icono-boton {
  width: 1.1rem;
  height: 1.1rem;
  margin-right: 0.4rem;
  flex-shrink: 0;
}

.marcadores-modal__lista {
  display: grid;
  gap: 0.75rem;
  margin: 0;
}

.marcadores-modal__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--borde-color-secundario);
  border-radius: 0.5rem;
  background-color: transparent;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.marcadores-modal__item:hover {
  border-color: var(--borde-color-acento);
}

.marcadores-modal__item--activo {
  border-color: var(--borde-color-acento);
  box-shadow: inset 4px 0 0 var(--borde-color-acento);
}

.marcadores-modal__seleccionar {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  text-align: left;
}

.marcadores-modal__seleccionar span:last-child {
  overflow-wrap: anywhere;
}

.marcadores-modal__seleccionar:focus-visible,
.marcadores-modal__eliminar:focus-visible {
  outline: 3px solid var(--borde-color-acento);
  outline-offset: 2px;
}

.marcadores-modal__eliminar {
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .marcadores-modal__distribucion {
    grid-template-columns: 1fr;
  }

  .marcadores-modal__mapa-panel {
    position: static;
  }

  .marcadores-modal__contenedor-mapa {
    height: 360px;
  }
}

@media (max-width: 600px) {
  .marcadores-modal__distribucion {
    gap: 1rem;
  }

  .marcadores-modal__contenedor-mapa {
    height: 300px;
  }

  .marcadores-modal__seccion {
    padding: 1rem;
  }

  .marcadores-modal__personalizacion {
    grid-template-columns: 1fr;
  }

  .marcadores-modal__campo-color {
    width: 100%;
  }

  .marcadores-modal__acciones {
    flex-direction: column-reverse;
  }

  .marcadores-modal__acciones .boton {
    justify-content: center;
    width: 100%;
  }
}
</style>
