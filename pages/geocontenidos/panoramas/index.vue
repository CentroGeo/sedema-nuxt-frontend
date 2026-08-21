<script setup>
definePageMeta({ middleware: 'auth' });

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { status } = useAuth();
const estaLogueado = computed(() => status.value === 'authenticated');

const panoramas = ref([]);
const estaCargando = ref(false);
const paginaActual = ref(0);
const elementosPorPagina = 6;

const totalPags = computed(() =>
  Math.max(1, Math.ceil(panoramas.value.length / elementosPorPagina))
);

const panoramasPaginados = computed(() => {
  const inicio = paginaActual.value * elementosPorPagina;
  return panoramas.value.slice(inicio, inicio + elementosPorPagina);
});

async function cargarPanoramas() {
  estaCargando.value = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panoramas/`);

  const data = await respuesta.json();
  panoramas.value = data.results;
  estaCargando.value = false;
}
cargarPanoramas();

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const { data: userData } = useAuth();

async function eliminarPanorama(id) {
  await gnoxyFetch(`${config.public.geonodeApi}/panoramas/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userData.value?.accessToken}` },
  });
  await cargarPanoramas();
}
</script>

<template>
  <main id="principal" class="contenedor m-b-10">
    <div>
      <h2>Bienvenido a Panoramas</h2>

      <p
        class="fondo-color-acento borde-redondeado-8 borde-l borde-grosor-4 p-4"
        style="border-color: var(--color-primario-4)"
      >
        Los Panoramas son visores temáticos de mapas con capas, marcadores y contenido narrativo
        asociado.
      </p>

      <NuxtLink
        v-if="estaLogueado"
        to="/geocontenidos/panoramas/nuevo/editar"
        class="boton boton-primario m-b-4"
      >
        <span class="pictograma-agregar m-r-1" />
        Crear Panorama
      </NuxtLink>
    </div>

    <div class="flex">
      <h2>Panoramas</h2>
      <UiNumeroElementos :numero="panoramas.length" />
    </div>

    <GeocontenidosLoader v-if="estaCargando" />

    <div v-else-if="panoramas.length > 0" class="grid reticula-12">
      <div
        v-for="panorama in panoramasPaginados"
        :key="panorama.id"
        class="columna-8 columna-4-esc"
      >
        <div class="tarjeta">
          <div class="tarjeta-cuerpo">
            <div
              class="fila-etiquetas-superiores flex flex-contenido-fin flex-alineado-centrado m-b-1"
            >
              <span
                class="etiqueta-compacta etiqueta-estado"
                :class="panorama.is_public ? 'estado-publico' : 'estado-privado'"
              >
                <span
                  :class="panorama.is_public ? 'pictograma-ojo-ver' : 'pictograma-privado'"
                  class="m-r-1"
                  aria-hidden="true"
                />
                {{ panorama.is_public ? 'Público' : 'Privado' }}
              </span>
            </div>

            <p class="tarjeta-titulo m-0 m-b-1">{{ panorama.name }}</p>

            <p class="tarjeta-etiqueta m-0 m-b-1 flex flex-alineado-centrado">
              <span class="pictograma-persona m-r-1" aria-hidden="true" />
              <span>{{ panorama.owner?.username || panorama.owner || 'Anónimo' }}</span>
            </p>

            <p class="tarjeta-etiqueta m-0">Creado: {{ formatearFecha(panorama.created_at) }}</p>
          </div>

          <div class="tarjeta-pie flex">
            <div class="fondo-color-acento borde borde-color-secundario borde-redondeado-8 m-b-2">
              <p class="m-1" style="display: flex; align-items: end; justify-content: center">
                <span class="pictograma-mapa-generador pictograma-mediano m-r-1" />
                <span>
                  Temáticas: <b>{{ panorama.topic_count }}</b>
                </span>
              </p>
            </div>

            <NuxtLink
              class="boton boton-chico boton-secundario"
              :to="`/panoramas/${panorama.id}`"
              target="_blank"
            >
              <span class="pictograma-ojo-ver m-r-1" />
              Ver
            </NuxtLink>

            <template v-if="estaLogueado">
              <NuxtLink
                class="boton boton-chico boton-secundario"
                :to="`/geocontenidos/panoramas/${panorama.id}/editar`"
              >
                <span class="pictograma-editar m-r-1" />
                Editar
              </NuxtLink>

              <NuxtLink
                class="boton boton-chico boton-secundario"
                :to="`/geocontenidos/panoramas/${panorama.id}/editar?tab=tematicas`"
              >
                <span class="pictograma-agregar m-r-1" />
                Temáticas
              </NuxtLink>

              <button
                class="boton boton-chico boton-primario"
                @click="eliminarPanorama(panorama.id)"
              >
                <span class="pictograma-eliminar m-r-1" />
                Eliminar
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <UiPaginador
      v-if="panoramas.length > 0"
      class="m-t-4"
      :pagina-parent="paginaActual"
      :total-paginas="totalPags"
      @cambio="paginaActual = $event"
    />

    <div v-else class="texto-centrado">
      <p class="h3">No hay panoramas disponibles.</p>
    </div>
  </main>
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
