<script setup>
const props = defineProps({
  siteId: {
    type: [Number, String],
    required: true,
  },
});

const { data: userData } = useAuth();

const {
  fetchCapasWmsSitio,
  crearCapaWmsSitio,
  actualizarCapaWmsSitio,
  eliminarCapaWmsSitio,
  fetchDatasetsPaginados,
} = useTableroApi();

const capasWms = ref([]);
const resultadosCatalogo = ref([]);
const busquedaCatalogo = ref('');
const paginaCatalogo = ref(1);
const hayMasPaginas = ref(false);

const cargandoCapas = ref(false);
const buscandoCatalogo = ref(false);
const cargandoMas = ref(false);
const guardandoDatasetId = ref(null);
const operandoId = ref(null);
const errorOperacion = ref('');

const capaConfigurandoId = ref(null);

function alternarConfiguracion(capaId) {
  capaConfigurandoId.value = capaConfigurandoId.value === capaId ? null : capaId;
}

function cerrarConfiguracion() {
  capaConfigurandoId.value = null;
}

let busquedaTimeout = null;
let canalActualizacionWms = null;

const idsAgregados = computed(
  () => new Set(capasWms.value.map((capa) => Number(capa.geonode_id)).filter(Number.isFinite))
);

const catalogoDisponible = computed(() =>
  resultadosCatalogo.value.filter((dataset) => !idsAgregados.value.has(Number(dataset.pk)))
);

const capasOrdenadas = computed(() =>
  [...capasWms.value].sort((a, b) => Number(b.stack_order ?? 0) - Number(a.stack_order ?? 0))
);

function notificarActualizacionWms() {
  canalActualizacionWms?.postMessage({
    siteId: String(props.siteId),
    actualizado: Date.now(),
  });
}

function extraerMensajeError(data, mensajePredeterminado) {
  if (!data || typeof data !== 'object') return mensajePredeterminado;
  if (data.detail) return String(data.detail);

  const mensajes = Object.entries(data)
    .filter(([campo]) => !['success', 'code'].includes(campo))
    .flatMap(([, valor]) => (Array.isArray(valor) ? valor : [valor]))
    .filter(Boolean)
    .map(String);

  return mensajes.join(' ') || mensajePredeterminado;
}

async function cargarCapas() {
  if (!props.siteId) return;

  cargandoCapas.value = true;
  errorOperacion.value = '';

  try {
    capasWms.value = await fetchCapasWmsSitio(props.siteId);
  } catch (error) {
    console.error('No fue posible cargar las capas de referencia:', error);
    capasWms.value = [];
    errorOperacion.value = 'No fue posible cargar las capas de referencia del tablero.';
  } finally {
    cargandoCapas.value = false;
  }
}

async function cargarCatalogo(reiniciar = true) {
  const pagina = reiniciar ? 1 : paginaCatalogo.value + 1;

  if (reiniciar) {
    buscandoCatalogo.value = true;
  } else {
    cargandoMas.value = true;
  }

  errorOperacion.value = '';

  try {
    const data = await fetchDatasetsPaginados(
      busquedaCatalogo.value.trim(),
      pagina,
      userData.value?.accessToken,
      20,
      '',
      'REMOTE'
    );

    const nuevos = data?.datasets ?? data?.results ?? [];
    const total = Number(data?.total ?? data?.count ?? nuevos.length);

    resultadosCatalogo.value = reiniciar ? nuevos : [...resultadosCatalogo.value, ...nuevos];

    paginaCatalogo.value = pagina;
    hayMasPaginas.value = resultadosCatalogo.value.length < total;
  } catch (error) {
    console.error('No fue posible consultar el catálogo remoto:', error);

    if (reiniciar) {
      resultadosCatalogo.value = [];
    }

    errorOperacion.value = 'No fue posible consultar los servicios remotos del catálogo.';
  } finally {
    buscandoCatalogo.value = false;
    cargandoMas.value = false;
  }
}

function programarBusqueda() {
  if (busquedaTimeout) clearTimeout(busquedaTimeout);

  busquedaTimeout = setTimeout(() => {
    cargarCatalogo(true);
  }, 300);
}

async function agregarCapa(dataset) {
  const datasetId = Number(dataset.pk);

  if (!Number.isFinite(datasetId)) return;

  errorOperacion.value = '';
  guardandoDatasetId.value = datasetId;

  try {
    const respuesta = await crearCapaWmsSitio(
      {
        site: Number(props.siteId),
        geonode_id: datasetId,
        opacity: 1,
        at_start: true,
        stack_order: capasWms.value.length,
      },
      userData.value?.accessToken
    );

    if (!respuesta?.id) {
      throw new Error(
        extraerMensajeError(respuesta, 'No fue posible agregar la capa de referencia.')
      );
    }

    await cargarCapas();
    notificarActualizacionWms();
  } catch (error) {
    console.error('No fue posible agregar la capa de referencia:', error);
    errorOperacion.value = error?.message || 'No fue posible agregar la capa de referencia.';
  } finally {
    guardandoDatasetId.value = null;
  }
}

async function alternarVisibilidad(capa) {
  errorOperacion.value = '';
  operandoId.value = capa.id;

  try {
    const respuesta = await actualizarCapaWmsSitio(
      capa.id,
      {
        at_start: !capa.at_start,
      },
      userData.value?.accessToken
    );

    if (!respuesta?.id) {
      throw new Error(
        extraerMensajeError(respuesta, 'No fue posible cambiar la visibilidad de la capa.')
      );
    }

    const indice = capasWms.value.findIndex((item) => item.id === capa.id);

    if (indice !== -1) {
      capasWms.value[indice] = {
        ...capasWms.value[indice],
        ...respuesta,
      };
    }

    notificarActualizacionWms();
  } catch (error) {
    console.error('No fue posible cambiar la visibilidad:', error);
    errorOperacion.value = error?.message || 'No fue posible cambiar la visibilidad de la capa.';
  } finally {
    operandoId.value = null;
  }
}

async function actualizarOpacidad(capa, event) {
  const opacity = Number(event.target.value);

  if (!Number.isFinite(opacity)) return;

  errorOperacion.value = '';
  operandoId.value = capa.id;

  try {
    const respuesta = await actualizarCapaWmsSitio(
      capa.id,
      { opacity },
      userData.value?.accessToken
    );

    if (!respuesta?.id) {
      throw new Error(extraerMensajeError(respuesta, 'No fue posible actualizar la opacidad.'));
    }

    const indice = capasWms.value.findIndex((item) => item.id === capa.id);

    if (indice !== -1) {
      capasWms.value[indice] = {
        ...capasWms.value[indice],
        ...respuesta,
      };
    }

    notificarActualizacionWms();
  } catch (error) {
    console.error('No fue posible actualizar la opacidad:', error);
    errorOperacion.value = error?.message || 'No fue posible actualizar la opacidad.';
  } finally {
    operandoId.value = null;
  }
}

async function moverCapa(capa, direccion) {
  if (operandoId.value !== null) return;

  const indice = capasOrdenadas.value.findIndex((item) => item.id === capa.id);
  const destino = indice + direccion;

  if (indice === -1 || destino < 0 || destino >= capasOrdenadas.value.length) {
    return;
  }

  const capaDestino = capasOrdenadas.value[destino];

  let ordenActual = Number(capa.stack_order);
  let ordenDestino = Number(capaDestino.stack_order);

  if (
    !Number.isFinite(ordenActual) ||
    !Number.isFinite(ordenDestino) ||
    ordenActual === ordenDestino
  ) {
    ordenActual = capasOrdenadas.value.length - indice;
    ordenDestino = capasOrdenadas.value.length - destino;
  }

  errorOperacion.value = '';
  operandoId.value = capa.id;

  try {
    const [respuestaActual, respuestaDestino] = await Promise.all([
      actualizarCapaWmsSitio(capa.id, { stack_order: ordenDestino }, userData.value?.accessToken),
      actualizarCapaWmsSitio(
        capaDestino.id,
        { stack_order: ordenActual },
        userData.value?.accessToken
      ),
    ]);

    if (!respuestaActual?.id || !respuestaDestino?.id) {
      throw new Error('No fue posible cambiar el orden de las capas.');
    }

    await cargarCapas();
    notificarActualizacionWms();
  } catch (error) {
    console.error('No fue posible ordenar las capas:', error);
    errorOperacion.value = error?.message || 'No fue posible cambiar el orden.';
  } finally {
    operandoId.value = null;
  }
}

async function eliminarCapa(id) {
  errorOperacion.value = '';
  operandoId.value = id;

  try {
    const eliminada = await eliminarCapaWmsSitio(id, userData.value?.accessToken);

    if (!eliminada) {
      throw new Error('No fue posible eliminar la capa de referencia.');
    }

    capasWms.value = capasWms.value.filter((capa) => capa.id !== id);

    notificarActualizacionWms();
  } catch (error) {
    console.error('No fue posible eliminar la capa:', error);
    errorOperacion.value = error?.message || 'No fue posible eliminar la capa de referencia.';
  } finally {
    operandoId.value = null;
  }
}

onMounted(async () => {
  if ('BroadcastChannel' in window) {
    canalActualizacionWms = new BroadcastChannel('sigic-tablero-wms');
  }

  await Promise.all([cargarCapas(), cargarCatalogo(true)]);
});

onBeforeUnmount(() => {
  if (busquedaTimeout) clearTimeout(busquedaTimeout);
  canalActualizacionWms?.close();
});
</script>

<template>
  <section class="tab-capas-wms">
    <p v-if="errorOperacion" class="texto-color-error m-b-3" role="alert">
      {{ errorOperacion }}
    </p>

    <div class="tab-capas-wms__columnas">
      <section class="panel-wms panel-wms--listado">
        <header class="panel-wms__encabezado">
          <div>
            <h3>Capas de referencia agregadas</h3>
            <p>Controla las capas complementarias visibles en los mapas del tablero.</p>
          </div>

          <span class="panel-wms__contador">
            {{ capasWms.length }}
          </span>
        </header>

        <GeocontenidosLoader v-if="cargandoCapas" mensaje="Cargando capas de referencia..." />

        <div v-else-if="capasWms.length === 0" class="estado-vacio">
          <span class="pictograma-capas estado-vacio__icono" aria-hidden="true" />

          <h4>No hay capas de referencia</h4>
          <p>Selecciona un servicio remoto del catálogo para agregarlo al tablero.</p>
        </div>

        <div v-else class="lista-wms">
          <article
            v-for="(capa, indice) in capasOrdenadas"
            :key="capa.id"
            class="tarjeta-wms"
            :class="{
              'tarjeta-wms--configurando': capaConfigurandoId === capa.id,
            }"
          >
            <header class="tarjeta-wms__encabezado">
              <h4 :title="capa.dataset_title || capa.name">
                {{ capa.dataset_title || capa.name }}
              </h4>

              <label
                class="tarjeta-wms__interruptor"
                :class="{
                  'tarjeta-wms__interruptor--deshabilitado': operandoId === capa.id,
                }"
              >
                <input
                  type="checkbox"
                  :checked="capa.at_start"
                  :disabled="operandoId === capa.id"
                  :aria-label="`${capa.at_start ? 'Desactivar' : 'Activar'} la capa ${
                    capa.dataset_title || capa.name
                  }`"
                  @change="alternarVisibilidad(capa)"
                />

                <span class="tarjeta-wms__interruptor-pista" aria-hidden="true">
                  <span class="tarjeta-wms__interruptor-circulo" />
                </span>

                <span class="tarjeta-wms__interruptor-texto">
                  {{ operandoId === capa.id ? 'Guardando…' : capa.at_start ? 'Activa' : 'Oculta' }}
                </span>
              </label>
            </header>

            <div class="tarjeta-wms__contenido">
              <div class="tarjeta-wms__etiquetas">
                <span class="etiqueta-referencia">WMS remoto</span>

                <span
                  v-if="capa.dataset_is_published != null"
                  class="etiqueta-publicacion"
                  :class="{
                    'es-publicada': capa.dataset_is_published,
                    'es-no-publicada': !capa.dataset_is_published,
                  }"
                >
                  {{ capa.dataset_is_published ? 'Publicada' : 'No publicada' }}
                </span>

                <span v-if="capa.geonode_id == null" class="etiqueta-heredada">
                  Configuración heredada
                </span>
              </div>

              <div class="tarjeta-wms__resumen">
                <div class="tarjeta-wms__resumen-datos">
                  <p v-if="capa.wms_layers" class="tarjeta-wms__dato" :title="capa.wms_layers">
                    <strong>WMS:</strong>
                    {{ capa.wms_layers }}
                  </p>

                  <p class="tarjeta-wms__opacidad-resumen">
                    Opacidad:
                    <strong> {{ Math.round(Number(capa.opacity ?? 1) * 100) }}% </strong>
                  </p>
                </div>

                <div class="tarjeta-wms__acciones-rapidas">
                  <button
                    type="button"
                    class="tarjeta-wms__accion-icono"
                    :class="{
                      'esta-activa': capaConfigurandoId === capa.id,
                    }"
                    :title="
                      capaConfigurandoId === capa.id ? 'Cerrar configuración' : 'Configurar capa'
                    "
                    :aria-label="`${
                      capaConfigurandoId === capa.id ? 'Cerrar configuración de' : 'Configurar'
                    } ${capa.dataset_title || capa.name}`"
                    :aria-expanded="capaConfigurandoId === capa.id"
                    :aria-controls="`configuracion-capa-${capa.id}`"
                    :disabled="operandoId !== null"
                    @click="alternarConfiguracion(capa.id)"
                  >
                    <svg class="tarjeta-wms__icono-svg" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M4 20h4.25L19.5 8.75 15.25 4.5 4 15.75V20Z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linejoin="round"
                      />
                      <path
                        d="m13.75 6 4.25 4.25"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="tarjeta-wms__accion-icono tarjeta-wms__accion-icono--eliminar"
                    :title="`Eliminar ${capa.dataset_title || capa.name}`"
                    :aria-label="`Eliminar ${capa.dataset_title || capa.name}`"
                    :disabled="operandoId !== null"
                    @click="eliminarCapa(capa.id)"
                  >
                    <svg class="tarjeta-wms__icono-svg" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="capaConfigurandoId === capa.id"
              :id="`configuracion-capa-${capa.id}`"
              class="tarjeta-wms__configuracion"
            >
              <p class="tarjeta-wms__url" :title="capa.url">
                {{ capa.url }}
              </p>

              <div class="tarjeta-wms__opacidad">
                <label :for="`opacidad-referencia-${capa.id}`">
                  <span>Opacidad</span>
                  <strong> {{ Math.round(Number(capa.opacity ?? 1) * 100) }}% </strong>
                </label>

                <input
                  :id="`opacidad-referencia-${capa.id}`"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  :value="capa.opacity ?? 1"
                  :disabled="operandoId === capa.id"
                  @change="actualizarOpacidad(capa, $event)"
                />
              </div>

              <footer class="tarjeta-wms__acciones">
                <div class="tarjeta-wms__orden" aria-label="Cambiar orden de la capa">
                  <button
                    type="button"
                    class="boton boton-secundario boton-chico"
                    title="Subir capa"
                    :aria-label="`Subir ${capa.dataset_title || capa.name}`"
                    :disabled="operandoId !== null || indice === 0"
                    @click="moverCapa(capa, -1)"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    class="boton boton-secundario boton-chico"
                    title="Bajar capa"
                    :aria-label="`Bajar ${capa.dataset_title || capa.name}`"
                    :disabled="operandoId !== null || indice === capasOrdenadas.length - 1"
                    @click="moverCapa(capa, 1)"
                  >
                    ↓
                  </button>
                </div>

                <button
                  type="button"
                  class="boton boton-secundario boton-chico"
                  :disabled="operandoId !== null"
                  @click="cerrarConfiguracion"
                >
                  Cerrar
                </button>
              </footer>
            </div>
          </article>
        </div>
      </section>

      <section class="panel-wms panel-wms--catalogo">
        <header class="panel-wms__encabezado">
          <div>
            <h3>Agregar desde el catálogo</h3>
            <p>Selecciona servicios WMS previamente conectados en SIGIC.</p>
          </div>
        </header>

        <div class="catalogo-buscador">
          <label for="buscar-capa-referencia"> Buscar servicio remoto </label>
          <input
            id="buscar-capa-referencia"
            v-model="busquedaCatalogo"
            type="search"
            placeholder="Buscar por nombre..."
            autocomplete="off"
            @input="programarBusqueda"
            @keydown.enter.prevent
          />
        </div>

        <GeocontenidosLoader v-if="buscandoCatalogo" mensaje="Consultando catálogo..." />

        <div
          v-else-if="resultadosCatalogo.length > 0 && catalogoDisponible.length === 0"
          class="estado-vacio estado-vacio--catalogo"
        >
          <h4>Todos los resultados ya están agregados</h4>
          <p>Prueba con otra búsqueda o administra las capas de la columna izquierda.</p>
        </div>

        <div
          v-else-if="catalogoDisponible.length === 0"
          class="estado-vacio estado-vacio--catalogo"
        >
          <h4>No se encontraron servicios remotos</h4>
          <p>Verifica la búsqueda o los permisos de acceso al catálogo.</p>
        </div>

        <div v-else class="lista-catalogo">
          <article v-for="dataset in catalogoDisponible" :key="dataset.pk" class="tarjeta-catalogo">
            <div class="tarjeta-catalogo__contenido">
              <h4>{{ dataset.title }}</h4>
              <p v-if="dataset.alternate">
                {{ dataset.alternate }}
              </p>

              <div class="tarjeta-catalogo__etiquetas">
                <span class="etiqueta-referencia"> WMS remoto </span>
                <span
                  class="etiqueta-publicacion"
                  :class="{
                    'es-publicada': dataset.is_published,
                    'es-no-publicada': !dataset.is_published,
                  }"
                >
                  {{ dataset.is_published ? 'Publicada' : 'No publicada' }}
                </span>
              </div>
            </div>

            <button
              type="button"
              class="boton boton-primario boton-chico"
              :disabled="guardandoDatasetId === Number(dataset.pk)"
              @click="agregarCapa(dataset)"
            >
              {{ guardandoDatasetId === Number(dataset.pk) ? 'Agregando…' : 'Agregar' }}
            </button>
          </article>

          <button
            v-if="hayMasPaginas"
            type="button"
            class="boton boton-secundario"
            :disabled="cargandoMas"
            @click="cargarCatalogo(false)"
          >
            {{ cargandoMas ? 'Cargando…' : 'Mostrar más servicios' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.tab-capas-wms {
  width: 100%;
}

.tab-capas-wms__columnas {
  display: grid;
  grid-template-columns: minmax(280px, 2fr) minmax(360px, 3fr);
  gap: 24px;
  align-items: start;
}

.panel-wms {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-neutro-1);
  border-radius: 8px;
  background-color: var(--fondo);
}

.panel-wms__encabezado {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-wms__encabezado h3,
.panel-wms__encabezado p {
  margin: 0;
}

.panel-wms__encabezado p {
  margin-top: 4px;
  color: var(--texto-secundario);
  font-size: 0.875rem;
}

.panel-wms__contador {
  display: inline-flex;
  min-width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--color-primario-4);
  color: var(--texto-inverso);
  font-weight: 700;
}

.estado-vacio {
  display: flex;
  min-height: 260px;
  padding: 28px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--color-neutro-1);
  border-radius: 8px;
  text-align: center;
}

.estado-vacio__icono {
  margin-bottom: 12px;
  font-size: 2.5rem;
  opacity: 0.6;
}

.estado-vacio h4 {
  margin: 0 0 8px;
}

.estado-vacio p {
  max-width: 360px;
  margin: 0;
  color: var(--texto-secundario);
}

.lista-wms {
  display: flex;
  max-height: 560px;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.tarjeta-wms {
  overflow: hidden;
  border: 1px solid var(--color-neutro-1);
  border-radius: 8px;
  background-color: var(--fondo-acento);
}

.tarjeta-wms__encabezado {
  display: flex;
  padding: 10px 12px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background-color: var(--color-primario-4);
  color: var(--texto-inverso);
}

.tarjeta-wms__encabezado h4 {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 1rem;
}

.tarjeta-wms__interruptor {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
}

.tarjeta-wms__interruptor input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.tarjeta-wms__interruptor-pista {
  position: relative;
  display: inline-flex;
  width: 38px;
  height: 22px;
  align-items: center;
  padding: 2px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 999px;
  background-color: #777;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.tarjeta-wms__interruptor-circulo {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease;
}

.tarjeta-wms__interruptor input:checked + .tarjeta-wms__interruptor-pista {
  border-color: #d8f3dc;
  background-color: #218739;
}

.tarjeta-wms__interruptor
  input:checked
  + .tarjeta-wms__interruptor-pista
  .tarjeta-wms__interruptor-circulo {
  transform: translateX(16px);
}

.tarjeta-wms__interruptor input:focus-visible + .tarjeta-wms__interruptor-pista {
  outline: 2px solid var(--texto-inverso);
  outline-offset: 2px;
}

.tarjeta-wms__interruptor--deshabilitado {
  cursor: wait;
  opacity: 0.65;
}

.tarjeta-wms__interruptor-texto {
  min-width: 54px;
  color: var(--texto-inverso);
}

.tarjeta-wms__contenido {
  padding: 12px;
}

.tarjeta-wms__dato,
.tarjeta-wms__url,
.tarjeta-wms__tipo {
  margin: 0;
  overflow-wrap: anywhere;
}

.tarjeta-wms__url {
  margin-top: 6px;
  font-size: 0.75rem;
}

.tarjeta-wms__tipo {
  margin-top: 8px;
  color: var(--texto-secundario);
  font-size: 0.75rem;
}

.tarjeta-wms__opacidad {
  display: flex;
  margin-top: 14px;
  flex-direction: column;
  gap: 6px;
}

.tarjeta-wms__opacidad label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.8rem;
}

.tarjeta-wms__opacidad input[type='range'] {
  width: 100%;
  accent-color: var(--color-primario-4);
}

.tarjeta-wms__opacidad input:disabled {
  cursor: wait;
  opacity: 0.65;
}

.tarjeta-wms__acciones {
  display: flex;
  padding: 8px 10px;
  justify-content: flex-end;
  gap: 6px;
  border-top: 1px solid var(--color-neutro-1);
}

.tarjeta-wms__acciones {
  justify-content: space-between;
}

.tarjeta-wms__orden {
  display: flex;
  gap: 6px;
}

.tarjeta-wms__etiquetas,
.tarjeta-catalogo__etiquetas {
  display: flex;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 6px;
}

.etiqueta-referencia,
.etiqueta-publicacion,
.etiqueta-heredada {
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
}

.etiqueta-referencia {
  background-color: #f7dce5;
  color: #7c1739;
}

.etiqueta-publicacion.es-publicada {
  background-color: #08783f;
  color: #fff;
}

.etiqueta-publicacion.es-no-publicada {
  background-color: #6b1525;
  color: #fff;
}

.etiqueta-heredada {
  background-color: var(--color-neutro-1);
  color: var(--texto-primario);
}

.catalogo-buscador {
  display: flex;
  margin-bottom: 16px;
  flex-direction: column;
  gap: 6px;
}

.catalogo-buscador label {
  font-weight: 600;
}

.catalogo-buscador input {
  width: 100%;
  min-height: 42px;
  padding: 8px 12px;
  border: 1px solid var(--color-neutro-1);
  border-radius: 6px;
  background-color: var(--fondo);
  color: var(--texto-primario);
}

.lista-catalogo {
  display: flex;
  max-height: 560px;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.tarjeta-catalogo {
  display: flex;
  padding: 14px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--color-neutro-1);
  border-radius: 8px;
  background-color: var(--fondo-acento);
}

.tarjeta-catalogo__contenido {
  min-width: 0;
}

.tarjeta-catalogo__contenido h4,
.tarjeta-catalogo__contenido p {
  margin: 0;
  overflow-wrap: anywhere;
}

.tarjeta-catalogo__contenido p {
  margin-top: 4px;
  color: var(--texto-secundario);
  font-family: monospace;
  font-size: 0.75rem;
}

.tarjeta-catalogo__etiquetas {
  margin-top: 10px;
  margin-bottom: 0;
}

.estado-vacio--catalogo {
  min-height: 220px;
}

@media (max-width: 920px) {
  .tab-capas-wms__columnas {
    grid-template-columns: 1fr;
  }

  .panel-wms--catalogo {
    grid-row: 1;
  }

  .panel-wms--listado {
    grid-row: 2;
  }

  .tarjeta-catalogo {
    align-items: stretch;
    flex-direction: column;
  }

  .tarjeta-catalogo .boton {
    width: 100%;
  }
}
/* Ajuste visual de capas de referencia */
.panel-wms {
  display: flex;
  height: 600px;
  min-height: 600px;
  flex-direction: column;
  overflow: hidden;
}

.panel-wms__encabezado,
.catalogo-buscador {
  flex: 0 0 auto;
}

.lista-wms,
.lista-catalogo {
  min-height: 0;
  max-height: none;
  flex: 1 1 auto;
  padding-right: 6px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.panel-wms > .estado-vacio {
  min-height: 0;
  flex: 1 1 auto;
}

.tarjeta-wms {
  flex: 0 0 auto;
}

.tarjeta-wms__encabezado {
  min-height: 52px;
}

.tarjeta-wms__encabezado h4 {
  display: -webkit-box;
  min-width: 0;
  max-width: 100%;
  flex: 1 1 auto;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.2;
}

.tarjeta-wms__contenido {
  min-height: 112px;
}

.tarjeta-wms__resumen {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.tarjeta-wms__resumen-datos {
  min-width: 0;
}

.tarjeta-wms__dato {
  display: -webkit-box;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.35;
}

.tarjeta-wms__opacidad-resumen {
  margin: 8px 0 0;
  color: var(--texto-secundario);
  font-size: 0.8rem;
}

.tarjeta-wms__acciones-rapidas {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
}

.tarjeta-wms__accion-icono {
  display: inline-flex;
  width: 36px;
  height: 36px;
  padding: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-neutro-1);
  border-radius: 6px;
  background-color: transparent;
  color: var(--texto-primario);
  cursor: pointer;
  font-size: 1rem;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.tarjeta-wms__accion-icono:hover,
.tarjeta-wms__accion-icono.esta-activa {
  border-color: var(--color-primario-4);
  background-color: var(--color-primario-4);
  color: var(--texto-inverso);
}

.tarjeta-wms__accion-icono--eliminar {
  color: var(--color-error, #d32f2f);
}

.tarjeta-wms__accion-icono--eliminar:hover {
  border-color: var(--color-error, #d32f2f);
  background-color: var(--color-error, #d32f2f);
  color: #fff;
}

.tarjeta-wms__accion-icono:focus-visible {
  outline: 2px solid var(--color-primario-4);
  outline-offset: 2px;
}

.tarjeta-wms__accion-icono:disabled {
  cursor: wait;
  opacity: 0.55;
}

.tarjeta-wms__configuracion {
  padding: 12px;
  border-top: 1px solid var(--color-neutro-1);
  background-color: var(--fondo);
}

.tarjeta-wms__configuracion .tarjeta-wms__url {
  margin: 0;
  overflow-wrap: anywhere;
}

.tarjeta-wms__configuracion .tarjeta-wms__acciones {
  margin: 12px -12px -12px;
}

.tarjeta-wms--configurando {
  border-color: var(--color-primario-4);
}

.lista-catalogo .tarjeta-catalogo {
  min-height: 132px;
  flex: 0 0 auto;
}

@media (max-width: 920px) {
  .panel-wms {
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .lista-wms,
  .lista-catalogo {
    max-height: 520px;
    flex: none;
  }

  .tarjeta-wms__encabezado {
    align-items: flex-start;
  }
}

@media (max-width: 520px) {
  .tarjeta-wms__resumen {
    grid-template-columns: 1fr;
  }

  .tarjeta-wms__acciones-rapidas {
    justify-self: end;
  }
}
.tarjeta-wms__icono-svg {
  display: block;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}
</style>
