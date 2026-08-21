<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import { useMapaCapasAdapter } from '~/composables/capas/useMapaCapasAdapter';
import { categoriesNamesInSpanish } from '~/utils/consulta';

definePageMeta({ middleware: 'auth' });

const route = useRoute();
const store = useMapasStore();
const { data: session } = useAuth();
const storeAdministracion = useAdministracionStore();

const mapaId = computed(() => Number(route.params.id));
const mapa = computed(() => store.activeMap);
const capas = computed(() => store.layersOrdered);

const adaptadorCapas = useMapaCapasAdapter(mapaId);
const posicionesCapas = computed(() =>
  mapa.value?.map_type === 'swipe' || mapa.value?.map_type === 'dual'
    ? [
        { value: 'left', label: 'Izquierdo' },
        { value: 'right', label: 'Derecho' },
      ]
    : null
);

// El owner del backend es {pk, username}; la sesión Keycloak expone email/name.
const esOwner = computed(() => {
  const ownerUsername = mapa.value?.owner?.username;
  const sessionEmail = session.value?.user?.email;
  const sessionName = session.value?.user?.name;
  if (!ownerUsername || !session.value) return false;
  return ownerUsername === sessionEmail || ownerUsername === sessionName;
});

// Un mapa público solo es editable por su dueño o por un administrador.
const puedeEditar = computed(
  () => storeAdministracion.perfilActual?.can_administer_content === true || esOwner.value
);

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

function alCambiarVisibilidadPestania() {
  // silencioso: si usara recargar() (isLoadingMap), desmontaría la vista
  // completa (incluido el modal de capas si está abierto) solo por volver
  // a la pestaña.
  if (document.visibilityState === 'visible') {
    store.refrescarMapa(mapaId.value);
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', alCambiarVisibilidadPestania);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', alCambiarVisibilidadPestania);
});

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
//const modalStatus = ref(null);
//const estatusAlGuardar = reactive({
//cargando: false,
//estado: undefined,
//mensaje: '',
//textoCargando: '',
//});

const guardando = ref(false);
async function guardarYSalir() {
  const m = store.activeMap;
  if (!m) return;

  guardando.value = true;
  estatusAlGuardar.cargando = true;
  estatusAlGuardar.textoCargando = 'Guardando mapa...';
  modalStatus.value?.abrirModal();

  const data = await store.actualizarMapa(mapaId.value, {
    zoom: m.zoom,
    center_lat: m.center_lat,
    center_long: m.center_long,
  });
  guardando.value = false;

  if (!data) {
    estatusAlGuardar.cargando = false;
    estatusAlGuardar.estado = false;
    estatusAlGuardar.mensaje = 'Error al guardar el mapa.';
    return;
  }

  estatusAlGuardar.cargando = false;
  estatusAlGuardar.estado = true;
  setTimeout(() => {
    modalStatus.value?.cerrarModal();
    navigateTo('/geocontenidos/mapas');
  }, 1200);
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
  await Promise.all([recargar(), storeAdministracion.cargarPerfilActual().catch(() => null)]);
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
      <header class="encabezado-mapa flex flex-alineado-centrado p-x-3 p-y-3">
        <NuxtLink
          to="/geocontenidos/mapas"
          class="boton boton-secundario boton-chico m-r-2"
          aria-label="Volver a mapas"
        >
          <span class="pictograma-flecha-izquierda" />
        </NuxtLink>

        <div>
          <h2 class="m-0">{{ mapa.name }}</h2>
          <p class="texto-secundario m-0">
            Por {{ mapa.owner?.username || 'Anónimo' }} · Tipo: {{ mapa.map_type }}
          </p>
        </div>
      </header>

      <div class="area-editor">
        <!-- Panel Lateral Izquierdo: Acciones y Herramientas -->
        <aside class="panel-acciones-columna">
          <div class="lista-acciones flex-vertical">
            <button
              v-if="puedeEditar"
              class="boton-accion-lateral boton-sin-contenedor-secundario"
              type="button"
              @click="abrirEditar"
            >
              <span class="pictograma-editar" aria-hidden="true" />
              <span>Propiedades</span>
            </button>

            <button
              v-if="puedeEditar"
              class="boton-accion-lateral boton-sin-contenedor-secundario"
              :class="{ activo: editandoCapas }"
              type="button"
              :aria-pressed="editandoCapas"
              @click="alternarEdicionCapas"
            >
              <span class="pictograma-capas" aria-hidden="true" />
              <span>{{ editandoCapas ? 'Cerrar edición' : 'Editar capas' }}</span>
            </button>

            <NuxtLink
              :to="`/mapas/${mapaId}`"
              target="_blank"
              class="boton-accion-lateral boton-sin-contenedor-secundario"
            >
              <span class="pictograma-visualizador" aria-hidden="true" />
              <span>Visualizar mapa</span>
            </NuxtLink>

            <button
              class="boton-accion-lateral boton-sin-contenedor-secundario"
              type="button"
              @click="abrirCompartir"
            >
              <span class="pictograma-compartir" aria-hidden="true" />
              <span>Compartir</span>
            </button>

            <button
              v-if="puedeEditar"
              class="boton-accion-lateral boton-sin-contenedor-secundario texto-color-error m-t-3"
              type="button"
              @click="eliminarMapa"
            >
              <span class="pictograma-eliminar" aria-hidden="true" />
              <span>Eliminar mapa</span>
            </button>
          </div>
        </aside>

        <!-- Panel Central: Visor del Mapa Amplio con Botón Guardar al Extremo Derecho -->
        <main :key="mapa.map_type" class="panel-mapa-central">
          <div class="contenedor-mapa">
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

          <footer
            v-if="puedeEditar"
            class="barra-guardar-inferior flex flex-contenido-final flex-alineado-centrado m-t-3"
          >
            <button
              class="boton-primario"
              type="button"
              :disabled="guardando"
              @click="guardarYSalir"
            >
              {{ guardando ? 'Guardando…' : 'Guardar' }}
            </button>
          </footer>
        </main>

        <!-- Panel Lateral Derecho: Gestión de Capas (280px originales) -->
        <aside class="panel-capas-columna">
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
        </aside>
      </div>

      <CapasModalAgregar
        :abierto="store.modalAgregarCapasAbierto"
        :adaptador="adaptadorCapas"
        :opciones="{
          contexto: 'mapa',
          mostrarOpacidad: false,
          mostrarEstilo: true,
          posiciones: posicionesCapas,
          nombreCategoria: (c) => categoriesNamesInSpanish[c.identifier] ?? c.identifier,
        }"
        @update:abierto="(v) => (v ? null : store.cerrarModalAgregarCapas())"
        @guardado="recargar"
      />
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
  box-sizing: border-box;
}

.area-editor {
  display: flex;
  height: calc(100vh - 120px);
  gap: 0;
  box-sizing: border-box;
  width: 100%;

  .panel-acciones-columna {
    width: 240px;
    min-width: 240px;
    max-width: 240px;
    height: 100%;
    overflow-y: auto;
    background-color: var(--fondo);
    padding: 16px 10px;
    box-sizing: border-box;
  }

  .panel-mapa-central {
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow-y: auto;
    position: relative;
    background-color: var(--fondo-acento);
    box-sizing: border-box;
    padding: 12px;
    display: flex;
    flex-direction: column;

    .contenedor-mapa {
      flex: 1;
      position: relative;
      width: 100%;
      min-height: 560px;
      height: calc(100vh - 200px);
      border-radius: 8px;
      overflow: hidden;
      background-color: var(--fondo);
      box-sizing: border-box;
    }

    .barra-guardar-inferior {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-top: 12px;
      padding: 0 4px;
      box-sizing: border-box;
    }
  }

  .panel-capas-columna {
    width: 270px;
    min-width: 270px;
    max-width: 270px;
    height: 100%;
    overflow-y: auto;
    background-color: var(--fondo);
    box-sizing: border-box;
  }
}

.lista-acciones {
  gap: 8px;
}

.boton-accion-lateral {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  gap: 12px;
  padding: 12px 14px;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  font-family: var(--tipografia-familia, 'Montserrat', sans-serif);
  font-size: 1rem;
  font-weight: 400;
  color: var(--texto-primario);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
  line-height: 1.3;

  .pictograma,
  [class^='pictograma-'],
  [class*=' pictograma-'] {
    font-size: 1.25rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
    margin: 0;
    color: inherit;
  }

  span:not([class^='pictograma-']) {
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: inherit;
  }

  &:hover {
    background-color: transparent;
    border-color: var(--color-neutro-2, #e0e0e0);
    color: var(--texto-primario);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-primario-2);
  }

  &:active,
  &.activo {
    background-color: var(--color-primario-4) !important;
    color: var(--texto-inverso, #ffffff) !important;
    font-weight: 600 !important;
    border-color: var(--color-primario-4) !important;

    span {
      color: var(--texto-inverso, #ffffff) !important;
      font-weight: 600 !important;
    }

    .pictograma,
    [class^='pictograma-'],
    [class*=' pictograma-'] {
      color: var(--texto-inverso, #ffffff) !important;
    }
  }

  &.texto-color-error {
    color: var(--texto-error, #b00020);
    border-color: transparent;

    &:hover {
      background-color: var(--fondo-error, #ffebee);
      border-color: var(--texto-error, #b00020);
      color: var(--texto-error, #b00020);
    }
  }
}

@media screen and (max-width: 1024px) {
  .encabezado-mapa {
    flex-wrap: wrap;
    gap: 8px;
  }

  .area-editor {
    flex-direction: column;
    height: auto;
    width: 100%;

    .panel-mapa-central {
      order: 1;
      width: 100%;
      height: auto;
      padding: 12px 8px;

      .contenedor-mapa {
        height: 460px;
        min-height: 360px;
      }
    }

    .panel-acciones-columna {
      order: 2;
      width: 100%;
      min-width: 100%;
      max-width: 100%;
      height: auto;
      padding: 16px 12px;

      .lista-acciones {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 8px;
      }
    }

    .panel-capas-columna {
      order: 3;
      width: 100%;
      min-width: 100%;
      max-width: 100%;
      height: auto;
      max-height: 420px;
      padding: 16px 12px;
    }
  }
}

@media screen and (max-width: 600px) {
  .area-editor {
    .panel-mapa-central {
      .contenedor-mapa {
        height: 340px;
        min-height: 280px;
      }
    }

    .panel-acciones-columna {
      .lista-acciones {
        grid-template-columns: 1fr;
      }
    }
  }
}

.alineacion-centrada {
  display: flex !important;
  justify-content: center !important;
  text-align: center !important;
  width: 100% !important;
}
</style>
