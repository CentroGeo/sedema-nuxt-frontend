<script setup>
import SisdaiAreaTexto from '@centrogeomx/sisdai-componentes/src/componentes/area-texto/SisdaiAreaTexto.vue';
import SisdaiBotonesRadioGrupo from '@centrogeomx/sisdai-componentes/src/componentes/boton-radio-grupo/SisdaiBotonesRadioGrupo.vue';
import SisdaiBotonRadio from '@centrogeomx/sisdai-componentes/src/componentes/boton-radio/SisdaiBotonRadio.vue';
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import { SisdaiCapaVectorial, SisdaiCapaXyz, SisdaiMapa } from '@centrogeomx/sisdai-mapas';
import { useRoute } from 'vue-router';

definePageMeta({
  middleware: 'auth',
});

const route = useRoute();
const config = useRuntimeConfig();
const storeLevantamiento = useLevantamientoStore();
const { data: datosSesion } = useAuth();
const proyecto = ref(null);
const resumen = ref({ total: 0, aprobados: 0, revision: 0, rechazados: 0 });
const aportes = ref([]);
const mapaRef = ref(null);
const modalFichaAporte = ref(null);
const fichaAporte = ref(null);
const cargandoFicha = ref(false);
const errorFicha = ref('');
const errorCarga = ref('');
const usoDatos = ref('');
const formato = ref('csv');
const enviandoDescarga = ref(false);
const errorDescarga = ref('');

onMounted(async () => {
  try {
    const data = await storeLevantamiento.obtenerProyectoPublicoPorId(route.params.id);
    proyecto.value = data.proyecto;
    resumen.value = data.resumen;
    aportes.value = Array.isArray(data.aportes) ? data.aportes : [];
  } catch (error) {
    errorCarga.value = error?.data?.message || 'No fue posible cargar el proyecto público.';
  }
});

const aportesGeoJson = computed(() => ({
  type: 'FeatureCollection',
  features: aportes.value.map((aporte) => ({
    type: 'Feature',
    id: aporte.id,
    properties: { id: aporte.id },
    geometry: {
      type: 'Point',
      coordinates: [Number(aporte.longitud), Number(aporte.latitud)],
    },
  })),
}));

const descripcionMapa = computed(() => {
  const cantidad = aportes.value.length;
  const nombre = proyecto.value?.nombre || 'este proyecto';

  return `Mapa de México que muestra la distribución de ${cantidad} ${
    cantidad === 1 ? 'aporte aprobado' : 'aportes aprobados'
  } con ubicación pública del proyecto ${nombre}. Su propósito es facilitar la consulta de su cobertura territorial.`;
});

const textoRespuesta = (respuesta) => {
  if (respuesta === null || respuesta === undefined || respuesta === '') return 'Sin respuesta';
  if (typeof respuesta === 'boolean') return respuesta ? 'Sí' : 'No';
  if (Array.isArray(respuesta)) return respuesta.map(textoRespuesta).join(', ');
  if (typeof respuesta !== 'object') return String(respuesta);

  if (respuesta.otro) return textoRespuesta(respuesta.otro);
  if (respuesta.selected_answer) return textoRespuesta(respuesta.selected_answer);

  return (
    Object.entries(respuesta)
      .filter(([clave]) => !['conditional_answer', 'subpregunta'].includes(clave))
      .map(([clave, valor]) => {
        if (valor === false || valor === null || valor === undefined || valor === '') return null;
        if (valor === true) return clave;
        return `${clave.replaceAll('_', ' ')}: ${textoRespuesta(valor)}`;
      })
      .filter(Boolean)
      .join(', ') || 'Sin respuesta'
  );
};

const respuestasFicha = computed(() => {
  const respuestas = fichaAporte.value?.respuestas;
  if (!Array.isArray(respuestas)) return [];

  return respuestas.map((respuesta, indice) => ({
    id: respuesta.id_pregunta || indice + 1,
    pregunta: respuesta.pregunta || respuesta.texto || `Pregunta ${indice + 1}`,
    respuesta: textoRespuesta(respuesta.respuesta),
  }));
});

const multimediaFicha = computed(() => {
  const archivos = fichaAporte.value?.multimedia;
  if (!Array.isArray(archivos)) return [];

  const apiUrl = String(config.public.levantamientoBackendUrl || '').replace(/\/$/, '');
  return archivos.map((archivo, indice) => ({
    ...archivo,
    id: `${archivo.tipo}-${indice}`,
    urlPublica: `${apiUrl}${archivo.url}`,
  }));
});

// La ficha se solicita bajo demanda para no cargar respuestas y multimedia de
// todos los aportes junto con la vista inicial del proyecto.
const abrirFichaAporte = async (id) => {
  if (cargandoFicha.value) return;

  cargandoFicha.value = true;
  errorFicha.value = '';
  fichaAporte.value = null;
  modalFichaAporte.value?.abrirModal();

  try {
    fichaAporte.value = await storeLevantamiento.obtenerAportePublico(route.params.id, id);
  } catch (error) {
    errorFicha.value = error?.data?.message || 'No fue posible cargar la ficha del aporte.';
  } finally {
    cargandoFicha.value = false;
  }
};

// La versión publicada de SISDAI Mapas entrega la coordenada del clic; se usa
// OpenLayers para identificar si debajo del píxel existe un marcador público.
const alClickMapa = ({ coordenadas }) => {
  const mapa = mapaRef.value?.mapa;
  if (!mapa || !Array.isArray(coordenadas)) return;

  const pixel = mapa.getPixelFromCoordinate(coordenadas);
  const feature = mapa.forEachFeatureAtPixel(pixel, (item, layer) =>
    layer?.get('id') === 'aportes-publicos' ? item : undefined
  );

  if (feature) abrirFichaAporte(feature.get('id'));
};

const modalSolicitarDescarga = ref(null);
const modalDescargaSolicitada = ref(null);

const handleDescarga = async () => {
  const email = datosSesion.value?.user?.email;
  if (!proyecto.value || !email || !usoDatos.value.trim() || enviandoDescarga.value) return;

  enviandoDescarga.value = true;
  errorDescarga.value = '';
  const formData = new FormData();
  formData.append('project_id', proyecto.value.id);
  formData.append('project_name', proyecto.value.nombre);
  formData.append('descriptionFileToExport', usoDatos.value.trim());
  formData.append('user_id', email);
  formData.append('format', formato.value);

  try {
    await storeLevantamiento.solicitarDescarga(formData);
    modalSolicitarDescarga.value?.cerrarModal();
    modalDescargaSolicitada.value?.abrirModal();
    usoDatos.value = '';
  } catch (error) {
    errorDescarga.value =
      error?.data?.message || error?.message || 'No fue posible solicitar la descarga.';
  } finally {
    enviandoDescarga.value = false;
  }
};
</script>
<template>
  <UiLayoutPaneles :estado-colapable="storeLevantamiento.catalogoColapsado">
    <template #catalogo>
      <LevantamientoListaMenuLateral />
    </template>

    <template #visualizador>
      <main class="mis-proyectos-levantamiento contenedor m-b-10 m-t-3">
        <div class="grid m-b-3">
          <div class="columna-16 flex regresar mis-proyectos-encabezado">
            <NuxtLink
              class="boton-regresar"
              to="/levantamiento/proyectos/"
              aria-label="Regresar a proyectos públicos"
            >
              <span
                class="boton-pictograma boton-sin-contenedor-secundario m-r-2"
                aria-hidden="true"
              >
                <span class="pictograma-flecha-izquierda" aria-hidden="true" />
              </span>
              Proyectos públicos
            </NuxtLink>
          </div>
        </div>
        <h3 class="m-t-0 m-b-1">{{ proyecto?.nombre }}</h3>
        <div class="flex proyecto-encabezado texto-color-secundario m-b-3">
          <div
            class="p-x-1 p-y-minimo borde-redondeado-8 borde borde-color-acento fondo-color-acento"
          >
            {{ proyecto?.categoria || 'Sin categoría' }}
          </div>
          <UiNumeroElementos :numero="resumen.total" etiqueta="Aportes" />
          <div>{{ proyecto?.institucion }}</div>
          <div>{{ proyecto?.lider }}</div>
        </div>
        <div class="contenedor">
          <p v-if="errorCarga" class="texto-color-error" role="alert">{{ errorCarga }}</p>
          <div v-else class="grid detalle-publico">
            <section class="columna-6 informacion-proyecto">
              <h4 class="m-t-0">Información del proyecto</h4>
              <div class="m-b-3">
                <h5 class="m-t-0 m-b-2">Objetivo del proyecto:</h5>
                <p class="m-y-0">
                  {{ proyecto?.objetivo }}
                </p>
              </div>
              <div class="m-b-3">
                <h5 class="m-t-0 m-b-2">Instrucciones clave del formulario:</h5>
                <p class="m-y-0">{{ proyecto?.instrucciones }}</p>
              </div>
              <h4>Resumen de aportes</h4>
              <div class="grid resumen-aportes">
                <div class="columna-8 fondo-color-neutro p-2 borde-redondeado-8">
                  <strong>{{ resumen.total }}</strong
                  ><span>Aportes totales</span>
                </div>
                <div class="columna-8 fondo-color-neutro p-2 borde-redondeado-8">
                  <strong>{{ resumen.aprobados }}</strong
                  ><span>Aprobados</span>
                </div>
                <div class="columna-8 fondo-color-neutro p-2 borde-redondeado-8">
                  <strong>{{ resumen.revision }}</strong
                  ><span>En revisión</span>
                </div>
                <div class="columna-8 fondo-color-neutro p-2 borde-redondeado-8">
                  <strong>{{ resumen.rechazados }}</strong
                  ><span>Rechazados</span>
                </div>
              </div>
            </section>
            <section class="columna-10 mapa-publico">
              <h4 class="m-t-0">Distribución geográfica de aportes</h4>
              <ClientOnly>
                <SisdaiMapa
                  id="aportesmapa"
                  ref="mapaRef"
                  class="mapa-aportes"
                  :descripcion="descripcionMapa"
                  :vista="{ extension: '-118.3651,14.5321,-86.7104,32.7187' }"
                  @click-vista="alClickMapa"
                >
                  <SisdaiCapaXyz />
                  <SisdaiCapaVectorial
                    id="aportes-publicos"
                    :fuente="aportesGeoJson"
                    :posicion="1"
                    :estilo="{
                      'circulo-relleno-color': '#d26c89',
                      'circulo-borde-color': '#ffffff',
                      'circulo-borde-grosor': 2,
                      'circulo-radio': 6,
                    }"
                  />
                </SisdaiMapa>
              </ClientOnly>
              <p class="leyenda-aportes m-b-0">
                <span aria-hidden="true"></span>Aportes aprobados con ubicación pública
              </p>
              <p v-if="aportes.length" class="texto-color-secundario m-y-1">
                Selecciona un punto para consultar las respuestas de ese aporte.
              </p>
              <p v-if="!aportes.length" class="texto-color-secundario" aria-live="polite">
                Este proyecto todavía no tiene aportes aprobados con ubicación pública.
              </p>
            </section>
          </div>
        </div>

        <ClientOnly>
          <SisdaiModal ref="modalFichaAporte">
            <template #encabezado>
              <div>
                <h3 class="m-b-1">Ficha del aporte</h3>
                <p v-if="fichaAporte" class="m-y-0 texto-color-secundario">
                  Aporte {{ fichaAporte.id }}
                </p>
              </div>
            </template>
            <template #cuerpo>
              <p v-if="cargandoFicha" aria-live="polite">Cargando respuestas…</p>
              <p v-else-if="errorFicha" class="texto-color-error" role="alert">
                {{ errorFicha }}
              </p>
              <div v-else-if="fichaAporte" class="ficha-contenido">
                <section v-if="multimediaFicha.length" class="m-b-3" aria-labelledby="evidencias">
                  <h4 id="evidencias" class="m-t-0 m-b-2">Evidencia multimedia</h4>
                  <div class="galeria-evidencias">
                    <figure
                      v-for="archivo in multimediaFicha"
                      :key="archivo.id"
                      class="evidencia fondo-color-neutro borde-redondeado-8 p-2 m-y-0"
                    >
                      <a
                        v-if="archivo.tipo === 'imagen' || archivo.tipo === 'image'"
                        :href="archivo.urlPublica"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Abrir imagen de evidencia en tamaño completo"
                      >
                        <img
                          :src="archivo.urlPublica"
                          alt="Evidencia fotográfica del aporte"
                          loading="lazy"
                        />
                      </a>
                      <video
                        v-else-if="archivo.tipo === 'video'"
                        controls
                        preload="metadata"
                        aria-label="Evidencia de video del aporte"
                      >
                        <source :src="archivo.urlPublica" :type="archivo.mime" />
                        Tu navegador no puede reproducir este video.
                      </video>
                      <audio
                        v-else-if="archivo.tipo === 'audio'"
                        controls
                        preload="metadata"
                        aria-label="Evidencia de audio del aporte"
                      >
                        <source :src="archivo.urlPublica" :type="archivo.mime" />
                        Tu navegador no puede reproducir este audio.
                      </audio>
                    </figure>
                  </div>
                </section>
                <section aria-labelledby="respuestas-formulario">
                  <h4 id="respuestas-formulario" class="m-t-0 m-b-2">Respuestas del formulario</h4>
                  <p v-if="!respuestasFicha.length" class="texto-color-secundario m-t-0">
                    Este aporte no contiene respuestas del formulario.
                  </p>
                  <dl v-else class="m-y-0">
                    <div
                      v-for="respuesta in respuestasFicha"
                      :key="respuesta.id"
                      class="respuesta-aporte fondo-color-neutro borde-redondeado-8 p-2 m-b-2"
                    >
                      <dt>
                        <strong>{{ respuesta.id }}. {{ respuesta.pregunta }}</strong>
                      </dt>
                      <dd class="m-x-0 m-t-1">{{ respuesta.respuesta }}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            </template>
            <template #pie>
              <button
                type="button"
                class="boton-secundario boton-chico"
                @click="modalFichaAporte?.cerrarModal()"
              >
                Cerrar
              </button>
            </template>
          </SisdaiModal>

          <SisdaiModal ref="modalSolicitarDescarga">
            <template #encabezado><h3>Descargar datos</h3></template>
            <template #cuerpo>
              <SisdaiAreaTexto
                v-model="usoDatos"
                etiqueta="Describe el uso que le darás a los datos"
                ejemplo="Describe el uso que le darás a los datos..."
                :es_etiqueta_visible="true"
                :es_obligatorio="true"
                class="m-b-3"
              />
              <p class="m-t-0 m-b-3">
                Selecciona el formato en el cual deseas descargar los datos:
              </p>
              <SisdaiBotonesRadioGrupo
                leyenda="Formato de descarga"
                :es_vertical="true"
                :es_obligatorio="true"
              >
                <SisdaiBotonRadio
                  v-model="formato"
                  etiqueta="Tabulado de datos .csv"
                  value="csv"
                  name="modo-descarga"
                />
                <SisdaiBotonRadio
                  v-model="formato"
                  etiqueta="Geopaquete .gpkg"
                  value="gpkg"
                  name="modo-descarga"
                />
              </SisdaiBotonesRadioGrupo>
              <p v-if="errorDescarga" class="texto-color-error" role="alert">
                {{ errorDescarga }}
              </p>
            </template>
            <template #pie>
              <button
                type="button"
                class="boton-secundario boton-chico"
                @click="modalSolicitarDescarga?.cerrarModal()"
              >
                Cerrar
              </button>
              <button
                type="button"
                class="boton-primario boton-chico"
                :disabled="!usoDatos.trim() || enviandoDescarga"
                @click="handleDescarga"
              >
                {{ enviandoDescarga ? 'Solicitando…' : 'Solicitar descarga' }}
              </button>
            </template>
          </SisdaiModal>

          <SisdaiModal ref="modalDescargaSolicitada">
            <template #encabezado><h3>Descarga solicitada</h3></template>
            <template #cuerpo>
              <div
                class="texto-color-confirmacion fondo-color-confirmacion borde-redondeado-20 borde borde-color-confirmacion p-3 m-b-3"
              >
                <div class="m-0 descarga-notificacion">
                  <span class="pictograma-aprobado" aria-hidden="true"></span>
                  <div>
                    Tu solicitud se ha procesado con éxito, puedes darle seguimiento en la sección
                    “Descargas”.
                  </div>
                </div>
              </div>
            </template>
            <template #pie>
              <button
                type="button"
                class="boton-secundario boton-chico"
                @click="modalDescargaSolicitada?.cerrarModal()"
              >
                Cerrar
              </button>
              <nuxt-link class="boton boton-primario boton-chico" to="/levantamiento/descargas">
                Ir a Descargas
              </nuxt-link>
            </template>
          </SisdaiModal>
        </ClientOnly>
      </main>
    </template>
  </UiLayoutPaneles>
</template>

<style scoped lang="scss">
.regresar {
  &.mis-proyectos-encabezado {
    flex-direction: column;
    align-items: flex-start;

    .boton-regresar {
      display: flex;
      align-items: center;
      color: inherit;
      font-size: var(--Tipos-Tamao-Prrafos-Texto-alto, 20px);
      font-weight: 400;
      line-height: var(--Tipos-Interlineado-Prrafos-Texto-alto, 30px);
    }
  }
}

.mis-proyectos-levantamiento {
  display: flex;
  flex-direction: column;
}

.proyecto-encabezado {
  align-items: center;
}

.detalle-publico {
  align-items: stretch;
}

.informacion-proyecto,
.mapa-publico {
  min-width: 0;
}

.resumen-aportes > div {
  display: flex;
  flex-direction: column;
  text-align: center;
}

.resumen-aportes strong {
  font-size: 1.5rem;
}

.mapa-aportes {
  width: 100%;
  height: 430px;
  border-radius: 20px;
  overflow: hidden;
}

/* La biblioteca enlaza su marca; se conserva la atribución como texto no interactivo. */
.mapa-aportes :deep(.contenedor-vis-atribuciones) {
  display: none;
}

.leyenda-aportes {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.leyenda-aportes span {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: #d26c89;
  border: 2px solid currentColor;
}

.ficha-contenido {
  max-height: min(65vh, 42rem);
  overflow-y: auto;
  padding-right: 0.25rem;
}

.galeria-evidencias {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  gap: 1rem;
}

.evidencia img,
.evidencia video {
  display: block;
  width: 100%;
  max-height: 18rem;
  object-fit: contain;
  border-radius: 8px;
  background: var(--fondo-neutro);
}

.evidencia audio {
  display: block;
  width: 100%;
}

.respuesta-aporte dt,
.respuesta-aporte dd {
  overflow-wrap: anywhere;
}

@media (max-width: 767px) {
  .informacion-proyecto,
  .mapa-publico {
    grid-column: 1 / -1;
  }

  .mapa-aportes {
    height: 360px;
  }
}

.descarga-notificacion {
  display: flex;
  align-items: center;

  span {
    margin-right: 10px;
  }
}
</style>
