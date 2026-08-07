<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import SisdaiCampoBase from '@centrogeomx/sisdai-componentes/src/componentes/campo-base/SisdaiCampoBase.vue';
import SisdaiAreaTexto from '@centrogeomx/sisdai-componentes/src/componentes/area-texto/SisdaiAreaTexto.vue';
import SisdaiBotonesRadioGrupo from '@centrogeomx/sisdai-componentes/src/componentes/boton-radio-grupo/SisdaiBotonesRadioGrupo.vue';
import SisdaiBotonRadio from '@centrogeomx/sisdai-componentes/src/componentes/boton-radio/SisdaiBotonRadio.vue';
import SisdaiCasilla from '@centrogeomx/sisdai-componentes/src/componentes/casilla-verificacion/SisdaiCasillaVerificacion.vue';
import { SisdaiCapaVectorial, SisdaiCapaXyz, SisdaiMapa } from '@centrogeomx/sisdai-mapas';

definePageMeta({
  middleware: 'auth',
});

const storeLevantamiento = useLevantamientoStore();
const { data } = useAuth();

const router = useRouter();
const route = useRoute();

const title = computed(() => route.query.title);
const previous_path = computed(() => route.query.previous_path);
const projectId = computed(() => String(route.query.project_id || route.params.id));
const aporteId = computed(
  () => route.query.aporte_id || (route.query.mode === 'edit' ? route.params.id : null)
);
const esEdicionAporte = computed(() => Boolean(aporteId.value));
const proyecto = ref(null);
const preguntasDetalle = ref([]);
const respuestas = reactive({});
const respuestasCondicionales = reactive({});
const archivos = reactive({});
const latitud = ref(null);
const longitud = ref(null);
const errorUbicacion = ref('');
const errorFormulario = ref('');
const enviando = ref(false);
const modalAporteEnviado = ref(null);

const preguntas = computed(() => {
  // En edición se conserva la ficha almacenada con el aporte para mantener cada respuesta
  // asociada a la pregunta original, aunque el formulario del proyecto haya cambiado.
  if (esEdicionAporte.value && preguntasDetalle.value.length) {
    return preguntasDetalle.value;
  }

  return Array.isArray(proyecto.value?.ficha_proyecto) ? proyecto.value.ficha_proyecto : [];
});
const coordenadasValidas = computed(() => {
  if (
    latitud.value === null ||
    latitud.value === '' ||
    longitud.value === null ||
    longitud.value === ''
  ) {
    return false;
  }

  const lat = Number(latitud.value);
  const lng = Number(longitud.value);
  return (
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
});
const vistaMapa = computed(() =>
  coordenadasValidas.value
    ? { centro: [Number(longitud.value), Number(latitud.value)], acercamiento: 12 }
    : { extension: '-118.3651,14.5321,-86.7104,32.7187' }
);
const puntoSeleccionado = computed(() => ({
  type: 'FeatureCollection',
  features: coordenadasValidas.value
    ? [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [Number(longitud.value), Number(latitud.value)],
          },
        },
      ]
    : [],
}));

onMounted(async () => {
  latitud.value = null;
  longitud.value = null;
  errorUbicacion.value = '';

  const email = data.value?.user.email;
  if (!email) return;

  await Promise.all([
    storeLevantamiento.obtenerProyectosPublicos(),
    storeLevantamiento.obtenerMisProyectos(email),
    storeLevantamiento.obtenerProyectosCompartidos(email),
  ]);

  proyecto.value = [
    ...storeLevantamiento.proyectosPublicos,
    ...storeLevantamiento.proyectos,
    ...storeLevantamiento.proyectosCompartidos,
  ].find((proyectoDisponible) => String(proyectoDisponible.id) === projectId.value);

  if (esEdicionAporte.value) {
    const detalle = await storeLevantamiento.obtenerDetalleAporte(aporteId.value);
    preguntasDetalle.value = detalle.answers || [];
    latitud.value = detalle.latitud;
    longitud.value = detalle.longitud;
    (detalle.answers || []).forEach((pregunta, indice) => {
      // Recupera tanto respuestas simples como el formato compuesto de preguntas condicionales.
      if (
        pregunta.tipo === 'condicional' &&
        pregunta.respuesta &&
        typeof pregunta.respuesta === 'object'
      ) {
        respuestas[indice] = pregunta.respuesta.opcion;
        respuestasCondicionales[indice] = pregunta.respuesta.subrespuesta;
      } else {
        respuestas[indice] = pregunta.respuesta;
      }
    });
  }
});

const editarUbicaAporte = ref(true);

function seleccionarUbicacion({ coordenadas }) {
  longitud.value = coordenadas[0];
  latitud.value = coordenadas[1];
  errorUbicacion.value = '';
}

function usarUbicacionActual() {
  if (!navigator.geolocation) {
    errorUbicacion.value = 'Tu navegador no permite obtener la ubicación.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      latitud.value = coords.latitude;
      longitud.value = coords.longitude;
      errorUbicacion.value = '';
    },
    () => {
      errorUbicacion.value =
        'No pudimos obtener tu ubicación. Selecciona manualmente un punto en el mapa.';
    }
  );
}

function continuarAlFormulario() {
  if (!coordenadasValidas.value) {
    errorUbicacion.value = 'Ingresa una latitud entre -90 y 90 y una longitud entre -180 y 180.';
    return;
  }
  editarUbicaAporte.value = false;
}

function actualizarMultiple(indice, opcion, seleccionado) {
  const actuales = Array.isArray(respuestas[indice]) ? respuestas[indice] : [];
  respuestas[indice] = seleccionado
    ? [...actuales, opcion]
    : actuales.filter((valor) => valor !== opcion);
}

function valorOpcion(opcion) {
  return opcion?.opcion ?? opcion;
}

function obtenerOpcionCondicional(pregunta, indice) {
  return pregunta.opciones?.find((opcion) => valorOpcion(opcion) === respuestas[indice]);
}

function guardarArchivos(indice, evento) {
  archivos[indice] = Array.from(evento.target.files || []);
}

function respuestaVacia(pregunta, indice) {
  if (pregunta.tipo === 'multimedia') {
    return !archivos[indice]?.length && !respuestas[indice]?.length;
  }
  const respuesta = respuestas[indice];
  return Array.isArray(respuesta) ? respuesta.length === 0 : !String(respuesta ?? '').trim();
}

async function guardarAporte(status, validarObligatorios = true) {
  errorFormulario.value = '';
  const indiceIncompleto = validarObligatorios
    ? preguntas.value.findIndex(
        (pregunta, indice) => pregunta.obligatorio && respuestaVacia(pregunta, indice)
      )
    : -1;

  if (indiceIncompleto >= 0) {
    errorFormulario.value = `Completa la pregunta obligatoria ${indiceIncompleto + 1}.`;
    return;
  }

  const respuestasFicha = preguntas.value.map((pregunta, indice) => ({
    ...pregunta,
    respuesta:
      pregunta.tipo === 'multimedia'
        ? [
            ...(Array.isArray(respuestas[indice]) ? respuestas[indice] : []),
            ...(archivos[indice]?.map((archivo) => archivo.name) || []),
          ]
        : pregunta.tipo === 'condicional'
          ? {
              opcion: respuestas[indice],
              subrespuesta: respuestasCondicionales[indice] ?? null,
            }
          : respuestas[indice],
  }));

  const formData = new FormData();
  formData.append('id_usuario', data.value?.user.email || '');
  formData.append('titulo', title.value || proyecto.value?.nombre || 'Aporte');
  formData.append('fuente', 'web');
  formData.append('latitud', String(latitud.value));
  formData.append('longitud', String(longitud.value));
  formData.append('status', status);
  formData.append('id_proyecto', projectId.value);
  formData.append('respuestas', JSON.stringify(respuestasFicha));
  formData.append('ubicacion_sensible', 'false');
  formData.append('ocultar_ficha', 'false');
  Object.values(archivos)
    .flat()
    .forEach((archivo) => formData.append('media', archivo));

  enviando.value = true;
  try {
    if (esEdicionAporte.value) {
      await storeLevantamiento.actualizarAporte(aporteId.value, formData);
    } else {
      await storeLevantamiento.crearAporte(formData);
    }

    if (status === 'SIN EVALUAR') {
      await router.push('/levantamiento/aportes/por-enviar');
    } else {
      modalAporteEnviado.value?.abrirModal();
    }
  } catch (error) {
    errorFormulario.value = error?.data?.message || 'No pudimos enviar el aporte a revisión.';
  } finally {
    enviando.value = false;
  }
}

function enviarARevision() {
  return guardarAporte('NO REVISADO', true);
}

function guardarParaDespues() {
  return guardarAporte('SIN EVALUAR', false);
}

async function irAEnRevision() {
  modalAporteEnviado.value?.cerrarModal();
  await nextTick();
  await router.push('/levantamiento/aportes/en-revision');
}

const rutaAnterior = ref('');
/**
 * Obtiene la ruta anterior y la procesa para devolver
 * @returns {String} con el nombre de la vista anterior
 */
function obtenerRutaAnterior() {
  if (!route.query.previous_path) return 'aprobados';
  // se divide la ruta por / y se toma el tercer índice
  rutaAnterior.value = route.query.previous_path.split('/', 4)[3];
  if (rutaAnterior.value === undefined) {
    // si es indefinido no tiene tercer índice
    return 'aprobados';
  } else {
    if (rutaAnterior.value === 'en-revision') {
      return 'en revisión';
    } else {
      return rutaAnterior.value.replace('-', ' ');
    }
  }
}
const modalRegresar = ref(null);
</script>
<template>
  <UiLayoutPaneles :estado-colapable="storeLevantamiento.catalogoColapsado">
    <template #catalogo>
      <LevantamientoListaMenuLateral />
    </template>

    <template #visualizador>
      <main id="principal" class="m-t-4">
        <div class="contenedor">
          <div class="flex">
            <nuxt-link aria-label="Regresar a aportes" @click="modalRegresar.abrirModal()">
              <span
                class="pictograma-flecha-izquierda pictograma-mediano texto-color-acento m-r-2"
                aria-hidden="true"
              />
              <span class="h5 texto-color-primario">Aportes {{ obtenerRutaAnterior() }}</span>
            </nuxt-link>
          </div>
          <h2>Editando aporte en:</h2>
          <h3>{{ title }}</h3>
        </div>
        <hr />

        <div v-if="editarUbicaAporte" class="contenedor m-b-1">
          <div class="flex m-t-3">
            <div class="columna-5">
              <h4 class="m-t-0">1. Ubica tu aporte</h4>
              <p>
                Usa tu ubicación actual, escribe un lugar en el buscador o selecciona un punto en el
                mapa.
              </p>
              <button
                class="boton-secundario boton-chico m-b-2"
                type="button"
                @click="usarUbicacionActual"
              >
                Usar mi ubicación actual
              </button>
              <ClientOnly>
                <SisdaiCampoBase
                  v-model="latitud"
                  etiqueta="Latitud"
                  ejemplo="19.432600"
                  :es_etiqueta_visible="true"
                  tipo="number"
                  @update:model-value="errorUbicacion = ''"
                />
                <SisdaiCampoBase
                  v-model="longitud"
                  etiqueta="Longitud"
                  ejemplo="-99.133200"
                  :es_etiqueta_visible="true"
                  tipo="number"
                  @update:model-value="errorUbicacion = ''"
                />
              </ClientOnly>
              <p v-if="errorUbicacion" class="texto-color-error" role="alert">
                {{ errorUbicacion }}
              </p>
              <button class="boton-primario" type="button" @click="continuarAlFormulario">
                Siguiente
              </button>
            </div>
            <div class="columna-11">
              <ClientOnly>
                <SisdaiMapa
                  id="aportesmapa"
                  class="gema"
                  style="height: 60vh; width: 100%"
                  descripcion="Este mapa permite seleccionar una ubicación y buscar un lugar en el buscador"
                  :vista="vistaMapa"
                  @click-vista="seleccionarUbicacion"
                >
                  <SisdaiCapaXyz />
                  <SisdaiCapaVectorial
                    :key="`punto-${latitud}-${longitud}`"
                    :fuente="puntoSeleccionado"
                    :posicion="1"
                    :estilo="{
                      'circulo-relleno-color': '#d26c89',
                      'circulo-borde-color': '#ffffff',
                      'circulo-borde-grosor': 3,
                      'circulo-radio': 9,
                    }"
                  />
                </SisdaiMapa>
              </ClientOnly>
            </div>
          </div>
        </div>

        <div v-if="!editarUbicaAporte" class="contenedor m-b-3" style="overflow-y: hidden">
          <div class="flex m-t-3">
            <div class="columna-5">
              <h4 class="m-t-0">2. Completa el formulario</h4>
              <p>Completa la información solicitada relacionada con tu aporte.</p>
              <button class="boton-secundario" type="button" @click="editarUbicaAporte = true">
                Regresar
              </button>
            </div>
            <div
              class="columna-11 fondo-color-acento borde-redondeado-16"
              style="height: 60vh; overflow-y: auto"
            >
              <ol class="lista-sin-estilo m-3">
                <li
                  v-for="(pregunta, indice) in preguntas"
                  :key="indice"
                  class="fondo-color-primario borde-redondeado-16 p-3 m-b-2"
                >
                  <p>{{ indice + 1 }}. {{ pregunta.pregunta || pregunta.instrucciones }}</p>
                  <label v-if="pregunta.pregunta" class="p-b-3">
                    {{ pregunta.instrucciones }}
                  </label>
                  <hr class="m-b-3" />

                  <SisdaiAreaTexto
                    v-if="pregunta.tipo === 'abierta'"
                    v-model="respuestas[indice]"
                    etiqueta="Respuesta"
                    ejemplo="Escribe tu respuesta"
                    :es_etiqueta_visible="false"
                    :es_obligatorio="pregunta.obligatorio"
                  />

                  <SisdaiBotonesRadioGrupo
                    v-else-if="pregunta.tipo === 'unica' || pregunta.tipo === 'condicional'"
                    leyenda=""
                    :es_vertical="true"
                  >
                    <SisdaiBotonRadio
                      v-for="opcion in pregunta.opciones"
                      :key="valorOpcion(opcion)"
                      v-model="respuestas[indice]"
                      :etiqueta="valorOpcion(opcion)"
                      :value="valorOpcion(opcion)"
                      :name="`pregunta-${indice}`"
                    />
                  </SisdaiBotonesRadioGrupo>

                  <template v-if="pregunta.tipo === 'condicional'">
                    <div
                      v-if="obtenerOpcionCondicional(pregunta, indice)?.tipoCondicion === 'abierta'"
                      class="m-t-2"
                    >
                      <p>
                        {{ obtenerOpcionCondicional(pregunta, indice).subpregunta?.pregunta }}
                      </p>
                      <SisdaiAreaTexto
                        v-model="respuestasCondicionales[indice]"
                        etiqueta="Respuesta"
                        ejemplo="Escribe tu respuesta"
                        :es_etiqueta_visible="false"
                      />
                    </div>
                    <SisdaiBotonesRadioGrupo
                      v-else-if="
                        obtenerOpcionCondicional(pregunta, indice)?.tipoCondicion === 'opcion'
                      "
                      class="m-t-2"
                      leyenda=""
                      :es_vertical="true"
                    >
                      <SisdaiBotonRadio
                        v-for="subopcion in obtenerOpcionCondicional(pregunta, indice).subpregunta
                          ?.opciones || []"
                        :key="subopcion"
                        v-model="respuestasCondicionales[indice]"
                        :etiqueta="subopcion"
                        :value="subopcion"
                        :name="`subpregunta-${indice}`"
                      />
                    </SisdaiBotonesRadioGrupo>
                  </template>

                  <div v-else-if="pregunta.tipo === 'multiple'">
                    <SisdaiCasilla
                      v-for="opcion in pregunta.opciones"
                      :key="opcion"
                      :etiqueta="opcion"
                      :model-value="
                        Array.isArray(respuestas[indice]) && respuestas[indice].includes(opcion)
                      "
                      @update:model-value="
                        (seleccionado) => actualizarMultiple(indice, opcion, seleccionado)
                      "
                    />
                  </div>

                  <input
                    v-else-if="pregunta.tipo === 'multimedia'"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,video/mp4,audio/mpeg"
                    @change="guardarArchivos(indice, $event)"
                  />

                  <p v-if="pregunta.obligatorio" class="texto-tamanio-2">(Obligatorio)</p>
                </li>
              </ol>
              <div class="p-x-3 p-b-3">
                <p v-if="errorFormulario" class="texto-color-error" role="alert">
                  {{ errorFormulario }}
                </p>
                <button
                  class="boton-primario"
                  type="button"
                  :disabled="enviando"
                  @click="enviarARevision"
                >
                  {{ enviando ? 'Enviando…' : 'Enviar a revisión' }}
                </button>
                <button
                  class="boton-secundario m-l-1"
                  type="button"
                  :disabled="enviando"
                  @click="guardarParaDespues"
                >
                  Guardar para después
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ClientOnly>
        <SisdaiModal ref="modalRegresar">
          <template #encabezado> <h2>Guardar cambios</h2> </template>
          <template #cuerpo>
            <p>¿Deseas guardar los cambios realizados en tu aporte y enviar de nuevo a revisión?</p>
          </template>
          <template #pie>
            <button
              class="boton-secundario boton-chico"
              type="button"
              @click="router.push(previous_path)"
            >
              Regresar sin guardar
            </button>
          </template>
        </SisdaiModal>

        <SisdaiModal ref="modalAporteEnviado">
          <template #encabezado><h2>Aporte enviado</h2></template>
          <template #cuerpo>
            <p>Tu aporte fue enviado correctamente y ahora se encuentra en revisión.</p>
          </template>
          <template #pie>
            <button class="boton-primario boton-chico" type="button" @click="irAEnRevision">
              Ir a En revisión
            </button>
          </template>
        </SisdaiModal>
      </ClientOnly>
    </template>
  </UiLayoutPaneles>
</template>
