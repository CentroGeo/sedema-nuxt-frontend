<script setup>
import { valoresPorDefecto as valoresModal } from '~/components/geocontenidos/loaderModal.vue';
import { wait } from '~/utils/consulta';

definePageMeta({ middleware: 'auth' });

const { status } = useAuth();
const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const estaLogueado = computed(() => status.value === 'authenticated');

const escenarios = ref([]);
const estaCargando = ref(false);
const paginaActual = ref(0);
const elementosPorPagina = 6;
const inputBusqueda = ref('');
const seleccionOrden = ref('titulo');

const escenariosFiltrados = computed(() => {
  const termino = inputBusqueda.value.trim().toLowerCase();
  let lista = escenarios.value;
  if (termino) {
    lista = lista.filter((e) => (e.name || '').toLowerCase().includes(termino));
  }
  return [...lista].sort((a, b) => {
    switch (seleccionOrden.value) {
      case 'titulo':
        return (a.name || '').localeCompare(b.name || '');
      case 'fecha_descendente':
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      case 'fecha_ascendente':
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      default:
        return 0;
    }
  });
});

const totalPags = computed(() =>
  Math.max(1, Math.ceil(escenariosFiltrados.value.length / elementosPorPagina))
);

const escenariosPaginados = computed(() => {
  const inicio = paginaActual.value * elementosPorPagina;
  return escenariosFiltrados.value.slice(inicio, inicio + elementosPorPagina);
});

function limpiarBusqueda() {
  inputBusqueda.value = '';
}

watch([inputBusqueda, seleccionOrden], () => {
  paginaActual.value = 0;
});

async function cargarEscenarios() {
  estaCargando.value = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/scenarios/`);

  const data = await respuesta.json();
  escenarios.value = data.results;
  estaCargando.value = false;
}
cargarEscenarios();

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const { geonodeApi } = config.public;
async function API(endPoint, method = 'GET', body = {}) {
  const parametros = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (method !== 'GET' && method !== 'DELETE') {
    parametros.body = JSON.stringify(body);
  }

  const respuesta = await gnoxyFetch(`${geonodeApi}/${endPoint}`, parametros);

  if (method === 'DELETE' && respuesta.ok) {
    return { success: true };
  }

  return await respuesta.json();
}

const modal = reactive({ ...valoresModal });
function mostrarError({ errors }) {
  modal.cargando = false;
  modal.titulo = 'Error';
  modal.pictograma = 'cerrar';
  modal.mensaje = errors.join(` `);
  modal.permitirCerrar = true;
}
async function Eliminar(id) {
  const { confirmar } = useDialogo();
  const confirmado = await confirmar({
    mensaje: '¿Eliminar este escenario? Esta acción no se puede deshacer.',
    textoAceptar: 'Eliminar',
    variante: 'peligro',
  });
  if (!confirmado) return;

  modal.visible = true;
  modal.cargando = true;

  modal.mensaje = `Eliminando escenario...`;

  const datos = await API(`scenarios/${id}/`, 'DELETE');
  if (datos?.success === false) {
    return mostrarError(datos);
  }

  modal.titulo = 'Eliminado con éxito';
  modal.cargando = false;
  modal.mensaje = '';
  await wait(1500);
  reloadNuxtApp();
}
</script>

<template>
  <div>
    <div>
      <h2>Bienvenido a Geo-historias</h2>

      <p
        class="fondo-color-acento borde-redondeado-8 borde-l borde-grosor-4 p-4"
        style="border-color: var(--color-primario-4)"
      >
        Las Geo-historias son presentaciones interactivas donde puedes mostrar mapas que cuentan una
        historia con capas de información y texto descriptivo.
      </p>

      <NuxtLink
        v-if="estaLogueado"
        to="/geocontenidos/geohistorias/nuevo/editar"
        class="boton boton-primario m-b-4"
      >
        <span class="pictograma-agregar m-r-1" />
        Crear Geo-historia
      </NuxtLink>
    </div>

    <div class="flex">
      <h2>Geohistorias</h2>
      <UiNumeroElementos :numero="escenarios.length" />
    </div>

    <div v-if="escenarios.length > 0" class="flex flex-alineado-final brecha-3 m-b-4">
      <div class="columna-8">
        <ClientOnly>
          <label for="selector-orden-geohistorias">Ordenar por</label>
          <select
            id="selector-orden-geohistorias"
            v-model="seleccionOrden"
            name="selector-orden-geohistorias"
            :disabled="estaCargando"
          >
            <option value="titulo">Título</option>
            <option value="fecha_descendente">Más Reciente</option>
            <option value="fecha_ascendente">Más Antiguo</option>
          </select>
        </ClientOnly>
      </div>
      <div class="columna-8">
        <ClientOnly>
          <label for="busqueda-geohistorias">Campo de búsqueda</label>
          <form class="campo-busqueda" @submit.prevent>
            <input
              id="busqueda-geohistorias"
              v-model="inputBusqueda"
              type="search"
              class="campo-busqueda-entrada"
              placeholder="Buscar geo-historias..."
              :disabled="estaCargando"
            />
            <button
              v-if="inputBusqueda"
              class="boton-pictograma boton-sin-contenedor-secundario campo-busqueda-borrar"
              aria-label="Borrar"
              type="button"
              :disabled="estaCargando"
              @click="limpiarBusqueda"
            >
              <span aria-hidden="true" class="pictograma-cerrar" />
            </button>
            <button
              class="boton-primario boton-pictograma campo-busqueda-buscar"
              aria-label="Buscar"
              type="button"
              :disabled="estaCargando"
            >
              <span class="pictograma-buscar" aria-hidden="true" />
            </button>
          </form>
        </ClientOnly>
      </div>
    </div>

    <GeocontenidosLoader v-if="estaCargando" />

    <div v-else-if="escenarios.length > 0" class="grid reticula-12">
      <div
        v-for="escenario in escenariosPaginados"
        :key="escenario.id"
        class="columna-8 columna-4-esc"
      >
        <div class="tarjeta">
          <div class="tarjeta-cuerpo">
            <div
              class="fila-etiquetas-superiores flex flex-contenido-fin flex-alineado-centrado m-b-1"
            >
              <span
                class="etiqueta-compacta etiqueta-estado"
                :class="escenario.is_public ? 'estado-publico' : 'estado-privado'"
              >
                <span
                  :class="escenario.is_public ? 'pictograma-ojo-ver' : 'pictograma-privado'"
                  class="m-r-1"
                  aria-hidden="true"
                />
                {{ escenario.is_public ? 'Público' : 'Privado' }}
              </span>
            </div>

            <p class="tarjeta-titulo m-0 m-b-1">{{ escenario.name }}</p>

            <p class="tarjeta-etiqueta m-0 m-b-1 flex flex-alineado-centrado">
              <span class="pictograma-persona m-r-1" aria-hidden="true" />
              <span>{{ escenario.owner?.username || escenario.owner || 'Anónimo' }}</span>
            </p>

            <p class="tarjeta-etiqueta m-0">Creado: {{ formatearFecha(escenario.created_at) }}</p>
          </div>

          <div class="tarjeta-pie flex">
            <div class="fondo-color-acento borde borde-color-secundario borde-redondeado-8 m-b-2">
              <p class="m-1" style="display: flex; align-items: end; justify-content: center">
                <span class="pictograma-mapa-generador pictograma-mediano m-r-1" />
                <span>
                  Escenas: <b>{{ escenario.scene_count }}</b>
                </span>
              </p>
            </div>

            <div v-if="escenario.scenes_layout_styles" class="m-b-1">
              <p class="tarjeta-etiqueta m-0">
                Panel de texto: <b>{{ escenario.scenes_layout_styles.text_panel }}%</b>
              </p>
              <p class="tarjeta-etiqueta m-0">
                Panel de mapa: <b>{{ escenario.scenes_layout_styles.map_panel }}%</b>
              </p>
            </div>

            <NuxtLink
              class="boton boton-chico boton-secundario"
              :to="`/geohistorias/${escenario.id}/`"
              target="_blank"
            >
              <span class="pictograma-ojo-ver m-r-1" />
              Ver
            </NuxtLink>

            <template v-if="estaLogueado">
              <NuxtLink
                class="boton boton-chico boton-secundario"
                :to="`/geocontenidos/geohistorias/${escenario.id}/editar`"
              >
                <span class="pictograma-editar m-r-1" />
                Editar escenario
              </NuxtLink>

              <NuxtLink
                class="boton boton-chico boton-secundario"
                :to="`/geocontenidos/geohistorias/${escenario.id}/escenas`"
              >
                <span class="pictograma-editar m-r-1" />
                Editar escenas
              </NuxtLink>
              <NuxtLink
                class="boton boton-chico boton-secundario"
                :to="`/geocontenidos/geohistorias/${escenario.id}/escenas/nuevo/editar`"
              >
                <span class="pictograma-agregar m-r-1" />
                Crear escena
              </NuxtLink>
              <button class="boton boton-chico boton-primario" @click="Eliminar(escenario.id)">
                <span class="pictograma-eliminar m-r-1" />
                Eliminar
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
    <UiPaginador
      v-if="escenarios.length > 0"
      class="m-t-4"
      :pagina-parent="paginaActual"
      :total-paginas="totalPags"
      @cambio="paginaActual = $event"
    />

    <div v-else class="texto-centrado">
      <p class="h3">No hay escenarios disponibles.</p>
    </div>

    <GeocontenidosLoaderModal v-bind="modal" />
  </div>
</template>

<style lang="scss" scoped>
.modulo-geocontenidos .contenedor {
  .grid.reticula-12 {
    grid-template-columns: repeat(12, 1fr);
  }
}

.tarjeta {
  height: 100%;
  display: flex;
  flex-direction: column;

  &-cuerpo {
    padding: 12px 16px;
    background-color: var(--color-primario-4);
    color: var(--texto-inverso);

    .tarjeta-titulo {
      color: var(--texto-inverso);
      font-size: 1.1rem;
      line-height: 1.25;
      font-weight: 700;
    }

    .tarjeta-etiqueta {
      color: var(--texto-inverso);
      font-size: 0.85rem;
      line-height: 1.3;
    }
  }
  &-pie {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding: 16px;
    gap: 0.5rem;

    button,
    a {
      display: block;
      width: 100%;
      text-align: center;
    }
  }
}

.fila-etiquetas-superiores {
  min-height: 24px;
}

.etiqueta-compacta {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: max-content;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  border-radius: 12px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.estado-publico {
  background-color: var(--color-secundario-1);
  color: var(--color-primario-4);
  border-color: var(--color-primario-4);
}

.estado-privado {
  background-color: var(--color-neutro-2);
  color: var(--color-neutro-5);
  border-color: var(--color-neutro-4);
}
</style>
