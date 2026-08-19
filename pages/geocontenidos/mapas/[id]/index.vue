<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
definePageMeta({ middleware: 'auth' });

const route = useRoute();
const store = useMapasStore();
const { data: session } = useAuth();
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

const modalStatus = ref(null);

const estatusAlGuardar = reactive({
  cargando: false,
  estado: true,
  textoCargando: 'Guardando mapa...',
  mensaje: '',
});

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

  estatusAlGuardar.cargando = true;
  estatusAlGuardar.estado = true;
  estatusAlGuardar.textoCargando = 'Guardando mapa...';

  // Usamos el método nativo igual que en panoramas
  modalStatus.value?.abrirModal();

  try {
    await store.actualizarMapa(mapaId.value, {
      zoom: m.zoom,
      center_lat: m.center_lat,
      center_long: m.center_long,
    });

    estatusAlGuardar.cargando = false;
    estatusAlGuardar.estado = true;

    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Si tu componente tiene un método para cerrar, lo usamos.
    // Si no, la redirección lo cerrará de todas formas.
    modalStatus.value?.cerrarModal();
    navigateTo('/geocontenidos/mapas');
  } catch (error) {
    console.error(error);
    estatusAlGuardar.cargando = false;
    estatusAlGuardar.estado = false;
    estatusAlGuardar.mensaje = 'Ocurrió un error al guardar.';
  } finally {
    guardando.value = false;
  }
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
  await Promise.all([recargar(), cargarEsAdmin()]);
});

onUnmounted(() => {
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
        </div>
        <div :key="mapa.map_type" class="columna-12">
          <GeocontenidosMapasVisorMapa
            v-if="mapa.map_type === 'regular'"
            :mapa="mapa"
            :capas="capas"
            @vista="cambiarVista"
          />
          <GeocontenidosMapasVisorSwipe
            v-else-if="mapa.map_type === 'swipe'"
            :mapa="mapa"
            :capas="capas"
            @vista="cambiarVista"
          />
          <GeocontenidosMapasVisorDual
            v-else-if="mapa.map_type === 'dual'"
            :mapa="mapa"
            :capas="capas"
            @vista="cambiarVista"
          />
        </div>
      </div>

      <GeocontenidosMapasModalAgregarCapas :mapa-id="mapa.id" :map-type="mapa.map_type" />
      <GeocontenidosMapasModalEditarMapa ref="modalEditar" :mapa="mapa" @actualizado="recargar" />
      <GeocontenidosMapasModalCompartir ref="modalCompartir" :mapa="mapa" />
      <GeocontenidosModalConfirmar ref="modalConfirmar" />

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
            <p
              v-else-if="estatusAlGuardar.estado === false"
              class="alineacion-centrada"
              v-text="estatusAlGuardar.mensaje"
            />
            <p v-else class="alineacion-centrada">
              <span class="pictograma-aprobado pictograma-grande" />
            </p>
          </template>
        </SisdaiModal>
      </ClientOnly>
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

.alineacion-centrada {
  display: flex !important;
  justify-content: center !important;
  text-align: center !important;
  width: 100% !important;
}
</style>
