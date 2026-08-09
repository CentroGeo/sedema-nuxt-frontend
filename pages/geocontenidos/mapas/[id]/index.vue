<script setup>
definePageMeta({ middleware: 'auth' });

const route = useRoute();
const store = useMapasStore();
const { data: session } = useAuth();
const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { esAdmin, cargarEsAdmin } = useEsAdmin();

const mapaId = computed(() => Number(route.params.id));
const mapa = computed(() => store.activeMap);
const capas = computed(() => store.layersOrdered);

// El owner del backend es {pk, username}; la sesión Keycloak expone email/name.
const esOwner = computed(() => {
  const ownerUsername = mapa.value?.owner?.username;
  const sessionEmail = session.value?.user?.email;
  const sessionName = session.value?.user?.name;
  if (!ownerUsername || !session.value) return false;
  return ownerUsername === sessionEmail || ownerUsername === sessionName;
});

// Un mapa público solo es editable por su dueño o por un administrador.
const puedeEditar = computed(() => esAdmin.value || esOwner.value);

const modalEditar = ref(null);
const modalCompartir = ref(null);
const abrirEditar = () => modalEditar.value?.abrir();
const abrirCompartir = () => modalCompartir.value?.abrir();

// Edición de capas en línea.
const editandoCapas = ref(false);
const alternarEdicionCapas = () => (editandoCapas.value = !editandoCapas.value);

const panelActivo = ref('capas');
const wmsExternosTemporales = ref([]);

const wmsEnEdicion = ref(null);
const origenFormularioWms = ref('capas');

const temporizadoresWms = new Map();

const mensajesEstadoWms = {
  loading: 'Cargando capa…',
  success: 'Capa agregada al mapa',
  error: 'No fue posible cargar esta capa',
  idle: '',
};

async function cargarWmsExternos() {
  try {
    const headers = {};

    if (session.value?.accessToken) {
      headers.Authorization = `Bearer ${session.value.accessToken}`;
    }

    const respuesta = await gnoxyFetch(
      `${config.public.geonodeApi}/sigic-map-external-wms/?map=${mapaId.value}`,
      { headers }
    );

    if (!respuesta.ok) {
      throw new Error(`Error ${respuesta.status} al consultar las capas WMS`);
    }

    const cuerpo = await respuesta.json();
    const capasWms = Array.isArray(cuerpo) ? cuerpo : cuerpo.results || [];

    wmsExternosTemporales.value = capasWms.map((capa) => ({
      ...capa,
      activo: Boolean(capa.at_start),
      estado: 'idle',
      mensaje: '',
    }));
  } catch (error) {
    console.error('No se pudieron cargar las capas WMS del mapa:', error);

    wmsExternosTemporales.value = [];
  }
}

function abrirFormularioWms() {
  origenFormularioWms.value = panelActivo.value === 'listado-wms' ? 'listado-wms' : 'capas';
  wmsEnEdicion.value = null;
  panelActivo.value = 'wms';
}

function abrirListadoWms() {
  panelActivo.value = 'listado-wms';
}

function cerrarFormularioWms() {
  panelActivo.value = origenFormularioWms.value;
  wmsEnEdicion.value = null;
}

function editarWmsTemporal(capa) {
  origenFormularioWms.value = 'listado-wms';
  wmsEnEdicion.value = { ...capa };
  panelActivo.value = 'wms';
}

async function guardarWmsTemporal(datos) {
  const token = session.value?.accessToken;

  if (!token) {
    console.error('No se pudo guardar la capa WMS: no hay token de acceso.');
    return;
  }

  const payload = {
    map: mapaId.value,
    name: datos.name,
    url: datos.url,
    attribution: datos.attribution || '',
    wms_or_tile: datos.wms_or_tile || 'wms',
    wms_layers: datos.wms_layers || '',
    at_start: Boolean(datos.at_start),
    stack_order: Number.isInteger(datos.stack_order) ? datos.stack_order : 0,
  };

  const idEnEdicion = wmsEnEdicion.value?.id;
  const esEdicion = Boolean(idEnEdicion);

  const url = esEdicion
    ? `${config.public.geonodeApi}/sigic-map-external-wms/${idEnEdicion}/`
    : `${config.public.geonodeApi}/sigic-map-external-wms/`;

  try {
    const respuesta = await gnoxyFetch(url, {
      method: esEdicion ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();

      throw new Error(
        `Error ${respuesta.status} al ${esEdicion ? 'editar' : 'guardar'} la capa WMS: ${detalle}`
      );
    }

    await cargarWmsExternos();

    wmsEnEdicion.value = null;
    panelActivo.value = 'listado-wms';
  } catch (error) {
    console.error(`No se pudo ${esEdicion ? 'editar' : 'guardar'} la capa WMS:`, error);
  }
}

async function eliminarWmsTemporal(id) {
  const token = session.value?.accessToken;

  if (!token) {
    console.error('No se pudo eliminar la capa WMS: no hay token de acceso.');
    return;
  }

  try {
    const respuesta = await gnoxyFetch(
      `${config.public.geonodeApi}/sigic-map-external-wms/${id}/`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!respuesta.ok) {
      const detalle = await respuesta.text();

      throw new Error(`Error ${respuesta.status} al eliminar la capa WMS: ${detalle}`);
    }

    await cargarWmsExternos();

    if (wmsEnEdicion.value?.id === id) {
      wmsEnEdicion.value = null;
    }
  } catch (error) {
    console.error('No se pudo eliminar la capa WMS:', error);
  }
}

const wmsExternosParaBarra = computed(() =>
  wmsExternosTemporales.value.map((item) => ({
    ...item,
    activo: Boolean(item.activo),
    estado: item.estado || 'idle',
    mensaje: mensajesEstadoWms[item.estado || 'idle'],
  }))
);

function actualizarWmsTemporal(id, cambios) {
  wmsExternosTemporales.value = wmsExternosTemporales.value.map((item) =>
    item.id === id
      ? {
          ...item,
          ...cambios,
        }
      : item
  );
}

function cambiarEstadoWmsTemporal(id, estado) {
  const temporizador = temporizadoresWms.get(id);

  if (temporizador) {
    clearTimeout(temporizador);
    temporizadoresWms.delete(id);
  }

  actualizarWmsTemporal(id, { estado });
}

function alternarWmsTemporal(item) {
  if (item.activo) {
    cambiarEstadoWmsTemporal(item.id, 'idle');
    actualizarWmsTemporal(item.id, { activo: false });
    return;
  }

  actualizarWmsTemporal(item.id, {
    activo: true,
    estado: item.wms_or_tile === 'wms' ? 'loading' : 'idle',
  });
}

function alIniciarCargaWmsTemporal(item) {
  cambiarEstadoWmsTemporal(item.id, 'loading');

  const temporizador = setTimeout(() => {
    actualizarWmsTemporal(item.id, { estado: 'error' });
    temporizadoresWms.delete(item.id);
  }, 15000);

  temporizadoresWms.set(item.id, temporizador);
}

function alFinalizarCargaWmsTemporal(item, cargaExitosa) {
  cambiarEstadoWmsTemporal(item.id, cargaExitosa ? 'success' : 'error');

  if (!cargaExitosa) return;

  const temporizador = setTimeout(() => {
    actualizarWmsTemporal(item.id, { estado: 'idle' });
    temporizadoresWms.delete(item.id);
  }, 3000);

  temporizadoresWms.set(item.id, temporizador);
}

async function reintentarWmsTemporal(item) {
  actualizarWmsTemporal(item.id, {
    activo: false,
    estado: 'loading',
  });

  await nextTick();

  actualizarWmsTemporal(item.id, {
    activo: true,
    estado: 'loading',
  });
}

const recargar = () => store.cargarMapa(mapaId.value);

// Contrato del backend (congelado): el campo de la capa es `visible`; la vista usa
// center_lat = X/longitud, center_long = Y/latitud (así está en el modelo).
const onToggle = ({ id: capaId, visible }) =>
  store.actualizarCapa(capaId, { visible }).then(recargar);
const onOpacidad = ({ id: capaId, opacity }) =>
  store.actualizarCapa(capaId, { opacity }).then(recargar);
const onReordenar = (items) => store.reordenarCapas(items).then(recargar);
// Mover capa entre panel izquierdo/derecho (mapas swipe y dual).
const onPosicion = ({ id: capaId, map_position }) =>
  store.actualizarCapa(capaId, { map_position }).then(recargar);
const onEliminar = (capaId) => store.eliminarCapa(capaId).then(recargar);

// Vista efímera (mover/zoom sin persistir) vs guardar vista en BD.
function cambiarVista(vista) {
  if (!store.activeMap) return;
  store.activeMap = { ...store.activeMap, ...vista };
}
const onGuardarVista = ({ zoom, center_lat, center_long }) =>
  store.actualizarMapa(mapaId.value, { zoom, center_lat, center_long }).then(recargar);

// Las ediciones de capas persisten al instante (PATCH por cambio); lo único
// efímero es la vista (zoom/centro). "Guardar" la persiste y regresa a la lista.
const guardando = ref(false);
async function guardarYSalir() {
  const m = store.activeMap;
  if (!m) return;
  guardando.value = true;
  await store.actualizarMapa(mapaId.value, {
    zoom: m.zoom,
    center_lat: m.center_lat,
    center_long: m.center_long,
  });
  guardando.value = false;
  navigateTo('/geocontenidos/mapas');
}

const modalConfirmar = ref(null);

async function eliminarMapa() {
  const confirmado = await modalConfirmar.value?.abrir({
    titulo: 'Eliminar mapa',
    mensaje: '¿Eliminar este mapa? Esta acción no se puede deshacer.',
    textoConfirmar: 'Eliminar',
  });
  if (!confirmado) return;
  const ok = await store.eliminarMapa(mapaId.value);
  if (ok) navigateTo('/geocontenidos/mapas');
}

onMounted(async () => {
  await Promise.all([recargar(), cargarEsAdmin(), cargarWmsExternos()]);
});

onUnmounted(() => {
  temporizadoresWms.forEach((temporizador) => clearTimeout(temporizador));
  temporizadoresWms.clear();
  store.limpiarMapa();
});
</script>

<template>
  <ClientOnly>
    <GeocontenidosLoader v-if="store.isLoadingMap || !store.mapaCargado" />

    <div v-else-if="!mapa" class="m-3">
      <p>No se encontró el mapa solicitado.</p>
      <NuxtLink to="/geocontenidos/mapas" class="boton boton-secundario"
        >Volver al listado</NuxtLink
      >
    </div>

    <template v-else>
      <header class="encabezado-mapa flex flex-contenido-separado p-x-3 p-y-2">
        <div>
          <h1 class="m-0">{{ mapa.name }}</h1>
          <p class="texto-secundario m-0">
            Por {{ mapa.owner?.username || 'Anónimo' }} · Tipo: {{ mapa.map_type }}
          </p>
        </div>
        <div class="flex acciones">
          <NuxtLink :to="`/mapas/${mapaId}`" target="_blank" class="boton boton-secundario">
            <span class="pictograma-visualizador m-r-1" aria-hidden="true" />Visualizar
          </NuxtLink>
          <button class="boton-secundario" type="button" @click="abrirCompartir">
            <span class="pictograma-compartir m-r-1" aria-hidden="true" />Compartir
          </button>
          <button v-if="puedeEditar" class="boton-primario" type="button" @click="abrirEditar">
            <span class="pictograma-editar m-r-1" aria-hidden="true" />Propiedades del mapa
          </button>
          <button
            v-if="puedeEditar"
            class="boton-secundario"
            :class="{ 'boton-primario': editandoCapas }"
            type="button"
            :aria-pressed="editandoCapas"
            @click="alternarEdicionCapas"
          >
            <span class="pictograma-capas m-r-1" aria-hidden="true" />
            {{ editandoCapas ? 'Cerrar edición' : 'Editar capas' }}
          </button>
          <button
            v-if="puedeEditar"
            class="boton-primario"
            type="button"
            :disabled="guardando"
            @click="guardarYSalir"
          >
            <span class="pictograma-guardar m-r-1" aria-hidden="true" />
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
          <NuxtLink v-else to="/geocontenidos/mapas" class="boton boton-secundario">
            Lista de mapas
          </NuxtLink>
          <button
            v-if="puedeEditar"
            class="boton-secundario texto-color-error"
            type="button"
            @click="eliminarMapa"
          >
            <span class="pictograma-eliminar m-r-1" aria-hidden="true" />Eliminar mapa
          </button>
        </div>
      </header>

      <div class="grid reticula-12 area-editor">
        <div class="columna-4">
          <GeocontenidosMapasPanelCapas
            v-if="panelActivo === 'capas'"
            :capas="capas"
            :mapa="mapa"
            :editable="editandoCapas"
            @toggle="onToggle"
            @opacidad="onOpacidad"
            @reordenar="onReordenar"
            @posicion="onPosicion"
            @eliminar="onEliminar"
            @vista="cambiarVista"
            @guardar-vista="onGuardarVista"
            @agregar="store.abrirModalAgregarCapas()"
          />

          <aside
            v-else-if="panelActivo === 'wms'"
            class="panel-wms"
            aria-labelledby="titulo-formulario-wms"
          >
            <h3 id="titulo-formulario-wms" class="m-t-0">
              {{ wmsEnEdicion ? 'Editar capa WMS' : 'Agregar capa WMS' }}
            </h3>

            <GeocontenidosWmsFormularioWms
              :valores-iniciales="wmsEnEdicion || {}"
              @guardar="guardarWmsTemporal"
              @cancelar="cerrarFormularioWms"
            />
          </aside>
          <GeocontenidosMapasPanelWms
            v-else-if="panelActivo === 'listado-wms'"
            :capas="wmsExternosTemporales"
            @volver="cerrarFormularioWms"
            @editar="editarWmsTemporal"
            @eliminar="eliminarWmsTemporal"
          />
        </div>
        <div :key="mapa.map_type" class="columna-12">
          <GeocontenidosMapasVisorMapa
            v-if="mapa.map_type === 'regular'"
            :mapa="mapa"
            :capas="capas"
            :wms-externos="wmsExternosParaBarra"
            mostrar-agregar-wms
            mostrar-ver-wms
            @vista="cambiarVista"
            @agregar-wms="abrirFormularioWms"
            @ver-wms="abrirListadoWms"
            @alternar-wms="alternarWmsTemporal"
            @reintentar-wms="reintentarWmsTemporal"
            @iniciar-carga-wms="alIniciarCargaWmsTemporal"
            @finalizar-carga-wms="
              ({ item, cargaExitosa }) => alFinalizarCargaWmsTemporal(item, cargaExitosa)
            "
          />
          <GeocontenidosMapasVisorSwipe
            v-else-if="mapa.map_type === 'swipe'"
            :mapa="mapa"
            :capas="capas"
            :wms-externos="wmsExternosParaBarra"
            mostrar-agregar-wms
            mostrar-ver-wms
            @vista="cambiarVista"
            @agregar-wms="abrirFormularioWms"
            @ver-wms="abrirListadoWms"
            @alternar-wms="alternarWmsTemporal"
            @reintentar-wms="reintentarWmsTemporal"
            @iniciar-carga-wms="alIniciarCargaWmsTemporal"
            @finalizar-carga-wms="
              ({ item, cargaExitosa }) => alFinalizarCargaWmsTemporal(item, cargaExitosa)
            "
          />
          <GeocontenidosMapasVisorDual
            v-else-if="mapa.map_type === 'dual'"
            :mapa="mapa"
            :capas="capas"
            :wms-externos="wmsExternosParaBarra"
            mostrar-agregar-wms
            mostrar-ver-wms
            @vista="cambiarVista"
            @agregar-wms="abrirFormularioWms"
            @ver-wms="abrirListadoWms"
            @alternar-wms="alternarWmsTemporal"
            @reintentar-wms="reintentarWmsTemporal"
            @iniciar-carga-wms="alIniciarCargaWmsTemporal"
            @finalizar-carga-wms="
              ({ item, cargaExitosa }) => alFinalizarCargaWmsTemporal(item, cargaExitosa)
            "
          />
        </div>
      </div>

      <GeocontenidosMapasModalAgregarCapas :mapa-id="mapa.id" :map-type="mapa.map_type" />
      <GeocontenidosMapasModalEditarMapa ref="modalEditar" :mapa="mapa" @actualizado="recargar" />
      <GeocontenidosMapasModalCompartir ref="modalCompartir" :mapa="mapa" />
      <GeocontenidosModalConfirmar ref="modalConfirmar" />
    </template>
  </ClientOnly>
</template>

<style lang="scss" scoped>
.encabezado-mapa {
  align-items: center;
  border-bottom: 1px solid var(--borde, var(--color-neutro-1));
}

.acciones {
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.area-editor {
  height: 80vh;
}

.panel-wms {
  height: 100%;
  min-width: 280px;
  max-width: 280px;
  padding: 12px;
  overflow-y: auto;
  background-color: var(--fondo);
  border-left: 1px solid var(--color-neutro-1);
}
</style>
