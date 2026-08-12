<script setup>
const props = defineProps({
  siteId: {
    type: [Number, String],
    required: true,
  },
});

const { data: userData } = useAuth();

const { fetchCapasWmsSitio, crearCapaWmsSitio, actualizarCapaWmsSitio, eliminarCapaWmsSitio } =
  useTableroApi();

const capasWms = ref([]);
const capaEnEdicion = ref(null);
const formularioVersion = ref(0);
const cargandoCapas = ref(false);
const guardando = ref(false);
const operandoId = ref(null);
const errorOperacion = ref('');

const valoresIniciales = computed(() => capaEnEdicion.value || {});

let canalActualizacionWms = null;

function notificarActualizacionWms() {
  canalActualizacionWms?.postMessage({
    siteId: String(props.siteId),
    actualizado: Date.now(),
  });
}

function extraerMensajeError(data, mensajePredeterminado) {
  if (!data || typeof data !== 'object') return mensajePredeterminado;

  if (data.detail) return String(data.detail);

  if (Array.isArray(data.errors)) {
    return data.errors.join(' ');
  }

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
    console.error('No fue posible cargar las capas WMS del tablero:', error);
    capasWms.value = [];
    errorOperacion.value = 'No fue posible cargar las capas WMS del tablero.';
  } finally {
    cargandoCapas.value = false;
  }
}

async function guardarCapa(datos) {
  errorOperacion.value = '';
  guardando.value = true;

  const capaActual = capaEnEdicion.value;

  const payload = {
    site: Number(props.siteId),
    name: datos.name,
    url: datos.url,
    attribution: datos.attribution || '',
    wms_or_tile: datos.wms_or_tile || 'wms',
    wms_layers: datos.wms_layers || '',
    wms_version: datos.wms_version || '',
    at_start: capaActual ? Boolean(capaActual.at_start) : false,
    stack_order: capaActual?.stack_order ?? capasWms.value.length,
  };

  try {
    const token = userData.value?.accessToken;

    const respuesta = capaActual
      ? await actualizarCapaWmsSitio(capaActual.id, payload, token)
      : await crearCapaWmsSitio(payload, token);

    if (!respuesta?.id) {
      throw new Error(
        extraerMensajeError(
          respuesta,
          `No fue posible ${capaActual ? 'actualizar' : 'agregar'} la capa WMS.`
        )
      );
    }

    capaEnEdicion.value = null;
    formularioVersion.value += 1;
    await cargarCapas();
    notificarActualizacionWms();
  } catch (error) {
    console.error('No fue posible guardar la capa WMS:', error);
    errorOperacion.value = error?.message || 'No fue posible guardar la capa WMS.';
  } finally {
    guardando.value = false;
  }
}

function editarCapa(capa) {
  errorOperacion.value = '';
  capaEnEdicion.value = { ...capa };
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
      notificarActualizacionWms();
    }

    if (capaEnEdicion.value?.id === capa.id) {
      capaEnEdicion.value = {
        ...capaEnEdicion.value,
        ...respuesta,
      };
    }
  } catch (error) {
    console.error('No fue posible cambiar la visibilidad WMS:', error);
    errorOperacion.value = error?.message || 'No fue posible cambiar la visibilidad de la capa.';
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
      throw new Error('No fue posible eliminar la capa WMS.');
    }

    capasWms.value = capasWms.value.filter((capa) => capa.id !== id);

    notificarActualizacionWms();

    if (capaEnEdicion.value?.id === id) {
      cancelarEdicion();
    }
  } catch (error) {
    console.error('No fue posible eliminar la capa WMS:', error);
    errorOperacion.value = error?.message || 'No fue posible eliminar la capa WMS.';
  } finally {
    operandoId.value = null;
  }
}

function cancelarEdicion() {
  capaEnEdicion.value = null;
  errorOperacion.value = '';
  formularioVersion.value += 1;
}

onMounted(() => {
  if ('BroadcastChannel' in window) {
    canalActualizacionWms = new BroadcastChannel('sigic-tablero-wms');
  }

  cargarCapas();
});

onBeforeUnmount(() => {
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
            <h3>Capas WMS agregadas</h3>
            <p>Administra los servicios externos disponibles en este tablero.</p>
          </div>

          <span class="panel-wms__contador">
            {{ capasWms.length }}
          </span>
        </header>

        <GeocontenidosLoader v-if="cargandoCapas" mensaje="Cargando capas WMS..." />
        <div v-else-if="capasWms.length === 0" class="estado-vacio">
          <span class="pictograma-capas estado-vacio__icono" aria-hidden="true" />

          <h4>No hay capas WMS agregadas</h4>

          <p>
            Completa el formulario para agregar una capa y visualizar cómo aparecerá en este
            listado.
          </p>
        </div>

        <div v-else class="lista-wms">
          <article v-for="capa in capasWms" :key="capa.id" class="tarjeta-wms">
            <header class="tarjeta-wms__encabezado">
              <h4>{{ capa.name }}</h4>

              <label
                class="tarjeta-wms__interruptor"
                :class="{ 'tarjeta-wms__interruptor--deshabilitado': operandoId === capa.id }"
              >
                <input
                  type="checkbox"
                  :checked="capa.at_start"
                  :disabled="operandoId === capa.id"
                  :aria-label="`${capa.at_start ? 'Desactivar' : 'Activar'} la capa ${capa.name}`"
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
              <p v-if="capa.wms_layers" class="tarjeta-wms__dato">
                <strong>Capa:</strong>
                {{ capa.wms_layers }}
              </p>

              <p class="tarjeta-wms__url" :title="capa.url">
                {{ capa.url }}
              </p>

              <p class="tarjeta-wms__tipo">
                {{
                  capa.wms_or_tile === 'tile'
                    ? 'Tile (XYZ)'
                    : capa.wms_version
                      ? `WMS ${capa.wms_version}`
                      : 'WMS'
                }}
                <template v-if="capa.attribution"> · {{ capa.attribution }}</template>
              </p>
            </div>

            <footer class="tarjeta-wms__acciones">
              <button
                type="button"
                class="boton boton-secundario boton-chico"
                :disabled="guardando || operandoId === capa.id"
                @click="editarCapa(capa)"
              >
                <span class="pictograma-editar m-r-1" aria-hidden="true" />
                Editar
              </button>

              <button
                type="button"
                class="boton boton-secundario boton-chico texto-color-error"
                :disabled="guardando || operandoId === capa.id"
                @click="eliminarCapa(capa.id)"
              >
                <span class="pictograma-eliminar m-r-1" aria-hidden="true" />
                Eliminar
              </button>
            </footer>
          </article>
        </div>
      </section>

      <section class="panel-wms panel-wms--formulario">
        <header class="panel-wms__encabezado">
          <div>
            <h3>{{ capaEnEdicion ? 'Editar capa WMS' : 'Agregar capa WMS' }}</h3>
            <p>
              {{
                capaEnEdicion
                  ? 'Modifica la configuración de la capa seleccionada.'
                  : 'Ingresa los datos del servicio externo.'
              }}
            </p>
          </div>
        </header>

        <GeocontenidosWmsFormularioWms
          :key="formularioVersion"
          :valores-iniciales="valoresIniciales"
          :mostrar-control-inicio="false"
          permitir-consulta-capas
          :guardando="guardando"
          @guardar="guardarCapa"
          @cancelar="cancelarEdicion"
        />
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

.tarjeta-wms__acciones {
  display: flex;
  padding: 8px 10px;
  justify-content: flex-end;
  gap: 6px;
  border-top: 1px solid var(--color-neutro-1);
}

@media (max-width: 920px) {
  .tab-capas-wms__columnas {
    grid-template-columns: 1fr;
  }

  .panel-wms--formulario {
    grid-row: 1;
  }

  .panel-wms--listado {
    grid-row: 2;
  }
}
</style>
