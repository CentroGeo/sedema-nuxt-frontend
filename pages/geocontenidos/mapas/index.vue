<script setup>
const mapasStore = useMapasStore();
const { status } = useAuth();

const estaLogueado = computed(() => status.value === 'authenticated');

const modalCrear = ref(null);
const paginaActual = ref(0);
const inputBusqueda = ref('');
const seleccionOrden = ref('titulo');
const elementosPorPagina = 6;

async function cargar(pagina) {
  // Sin filtro is_public: el backend devuelve los públicos a cualquiera y, si
  // hay sesión, también los privados del dueño (get_queryset).
  await mapasStore.cargarMapas({ page: pagina + 1, pageSize: elementosPorPagina });
}

const totalPags = computed(() =>
  Math.max(1, Math.ceil((mapasStore.pagination.total || 0) / elementosPorPagina))
);

/**
 * Filtrado y orden del lado del cliente sobre la página cargada.
 * (La búsqueda actúa sobre los resultados de la página actual.)
 */
const mapasFiltrados = computed(() => {
  const termino = inputBusqueda.value.trim().toLowerCase();
  let lista = mapasStore.maps;
  if (termino) {
    lista = lista.filter((m) => (m.name || '').toLowerCase().includes(termino));
  }
  return [...lista].sort((a, b) => {
    switch (seleccionOrden.value) {
      case 'titulo':
        return (a.name || '').localeCompare(b.name || '');
      case 'fecha_descendente':
        return (b.id ?? 0) - (a.id ?? 0);
      case 'fecha_ascendente':
        return (a.id ?? 0) - (b.id ?? 0);
      default:
        return 0;
    }
  });
});

function limpiarBusqueda() {
  inputBusqueda.value = '';
}

function alCrear(mapa) {
  navigateTo(`/geocontenidos/mapas/${mapa.id}`);
}

const modalConfirmar = ref(null);

async function eliminarMapaIndividual(mapa) {
  if (!mapa) return;
  const ok = await modalConfirmar.value?.abrir({
    titulo: 'Eliminar mapa',
    mensaje: `¿Eliminar "${mapa.name}"? Esta acción no se puede deshacer.`,
    textoConfirmar: 'Eliminar',
  });
  if (!ok) return;
  const exito = await mapasStore.eliminarMapa(mapa.id);
  if (exito) {
    await cargar(paginaActual.value);
  } else {
    await modalConfirmar.value?.abrir({
      titulo: 'Error al eliminar',
      mensaje: 'No se pudo eliminar el mapa.',
      soloAviso: true,
    });
  }
}

watch(paginaActual, (p) => {
  cargar(p);
});

function alCambiarVisibilidadPestania() {
  if (document.visibilityState === 'visible') {
    cargar(paginaActual.value);
  }
}

onMounted(() => {
  cargar(paginaActual.value);
  document.addEventListener('visibilitychange', alCambiarVisibilidadPestania);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', alCambiarVisibilidadPestania);
});
</script>

<template>
  <main id="principal" class="contenedor m-b-10">
    <div>
      <h2>Bienvenido a Mapas</h2>

      <p
        class="fondo-color-acento borde-redondeado-8 borde-l borde-grosor-4 p-4"
        style="border-color: var(--color-primario-4)"
      >
        Los Mapas son composiciones interactivas donde puedes visualizar, combinar y personalizar
        capas geográficas con simbologías y herramientas de análisis.
      </p>

      <div class="flex m-b-4">
        <button
          v-if="estaLogueado"
          class="boton boton-primario"
          type="button"
          @click="modalCrear?.abrir()"
        >
          <span class="pictograma-agregar m-r-1" />
          Crear Mapa
        </button>
      </div>
    </div>

    <MapasModalCrearMapa ref="modalCrear" @creado="alCrear" />
    <GeocontenidosModalConfirmar ref="modalConfirmar" />

    <div class="flex flex-alineado-final brecha-3 m-b-4">
      <!-- Selector Orden -->
      <div class="columna-8">
        <ClientOnly>
          <label for="selector-orden-mapas-geocontenidos">Ordenar por</label>
          <select
            id="selector-orden-mapas-geocontenidos"
            v-model="seleccionOrden"
            name="selector-orden-mapas-geocontenidos"
            :disabled="mapasStore.isLoading"
          >
            <option value="titulo">Título</option>
            <option value="fecha_descendente">Más Reciente</option>
            <option value="fecha_ascendente">Más Antiguo</option>
          </select>
        </ClientOnly>
      </div>
      <!-- Campo de búsqueda -->
      <div class="columna-8">
        <ClientOnly>
          <label for="busqueda-mapas-geocontenidos">Campo de búsqueda</label>
          <form class="campo-busqueda" @submit.prevent>
            <input
              id="busqueda-mapas-geocontenidos"
              v-model="inputBusqueda"
              type="search"
              class="campo-busqueda-entrada"
              placeholder="Buscar mapas..."
              :disabled="mapasStore.isLoading"
            />

            <button
              v-if="inputBusqueda"
              class="boton-pictograma boton-sin-contenedor-secundario campo-busqueda-borrar"
              aria-label="Borrar"
              type="button"
              :disabled="mapasStore.isLoading"
              @click="limpiarBusqueda"
            >
              <span aria-hidden="true" class="pictograma-cerrar" />
            </button>

            <button
              class="boton-primario boton-pictograma campo-busqueda-buscar"
              aria-label="Buscar"
              type="button"
              :disabled="mapasStore.isLoading"
            >
              <span class="pictograma-buscar" aria-hidden="true" />
            </button>
          </form>
        </ClientOnly>
      </div>
    </div>

    <GeocontenidosLoader v-if="mapasStore.isLoading" />

    <div v-if="mapasFiltrados.length === 0 && !mapasStore.isLoading" class="flex">
      <div
        class="flex flex-contenido-centrado columna-16 borde-redondeado-16 m-2 fondo-color-informacion texto-color-informacion p-2"
      >
        <p class="nota texto-color-informacion m-2">
          No se encontraron resultados que coincidan con la búsqueda.
        </p>
      </div>
    </div>

    <template v-if="mapasFiltrados.length !== 0 && !mapasStore.isLoading">
      <ClientOnly>
        <div class="grid reticula-12">
          <div v-for="mapa in mapasFiltrados" :key="mapa.id" class="columna-8 columna-4-esc">
            <GeocontenidosMapasTarjetaMapa :mapa="mapa" @eliminar="eliminarMapaIndividual" />
          </div>
        </div>

        <UiPaginador
          class="m-t-4"
          :pagina-parent="paginaActual"
          :total-paginas="totalPags"
          @cambio="paginaActual = $event"
        />
      </ClientOnly>
    </template>
  </main>
</template>

<style lang="scss" scoped>
.modulo-geocontenidos .contenedor {
  .grid.reticula-12 {
    grid-template-columns: repeat(12, 1fr);
  }
}
</style>
