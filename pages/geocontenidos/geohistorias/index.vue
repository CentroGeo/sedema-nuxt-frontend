<script setup>
definePageMeta({ middleware: 'auth' });

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { status, data: userData } = useAuth();
const estaLogueado = computed(() => status.value === 'authenticated');

const escenarios = ref([]);
const estaCargando = ref(false);
const paginaActual = ref(0);
const elementosPorPagina = 6;

const totalPags = computed(() =>
  Math.max(1, Math.ceil(escenarios.value.length / elementosPorPagina))
);

const escenariosPaginados = computed(() => {
  const inicio = paginaActual.value * elementosPorPagina;
  return escenarios.value.slice(inicio, inicio + elementosPorPagina);
});

async function cargarEscenarios() {
  estaCargando.value = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/scenarios/`);

  const data = await respuesta.json();
  escenarios.value = data.results;
  estaCargando.value = false;
}
cargarEscenarios();

// --- Modal de confirmación de eliminación ---
const modalEliminar = ref(null);
const resourceToDelete = ref(null);
const resourceToDeleteTitle = computed(() => resourceToDelete.value?.name ?? '');
const isBeingDeleted = ref(false);
const wasDeletionSuccesful = ref(null);

function abrirModalEliminar(escenario) {
  resourceToDelete.value = escenario;
  wasDeletionSuccesful.value = null;
  modalEliminar.value?.abrir();
}

function cancelarEliminar() {
  resourceToDelete.value = null;
  modalEliminar.value?.cerrar();
}

async function confirmarEliminar() {
  if (!resourceToDelete.value) return;
  isBeingDeleted.value = true;
  const token = userData.value?.accessToken;
  const respuesta = await gnoxyFetch(
    `${config.public.geonodeApi}/scenarios/${resourceToDelete.value.id}/`,
    {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );
  isBeingDeleted.value = false;
  if (respuesta.ok) {
    wasDeletionSuccesful.value = true;
    escenarios.value = escenarios.value.filter((e) => e.id !== resourceToDelete.value.id);
    setTimeout(() => modalEliminar.value?.cerrar(), 1200);
  } else {
    wasDeletionSuccesful.value = false;
  }
}

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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
              <button
                class="boton boton-chico boton-primario"
                @click="abrirModalEliminar(escenario)"
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
      v-if="escenarios.length > 0"
      class="m-t-4"
      :pagina-parent="paginaActual"
      :total-paginas="totalPags"
      @cambio="paginaActual = $event"
    />

    <div v-else class="texto-centrado">
      <p class="h3">No hay escenarios disponibles.</p>
    </div>

    <ClientOnly>
      <GeocontenidosSisdaiModal ref="modalEliminar" :permitir-cerrar="!isBeingDeleted">
        <template #encabezado>
          <h2 class="m-t-0">Eliminar escenario</h2>
        </template>

        <p v-if="wasDeletionSuccesful === null || isBeingDeleted" class="alerta-advertencia-modal">
          <span v-if="resourceToDelete?.is_published">
            El recurso <strong style="font-weight: bold">{{ resourceToDeleteTitle }}</strong> está
            publicado actualmente. ¿Deseas eliminarlo de todos modos?
          </span>
          <span v-else>
            ¿Estás seguro de que deseas eliminar el escenario
            <strong style="font-weight: bold">{{ resourceToDeleteTitle }}</strong
            >?
          </span>
        </p>

        <p v-else-if="wasDeletionSuccesful" class="alerta-exito-modal">
          ¡El escenario ha sido eliminado exitosamente!
        </p>
        <p v-else class="alerta-error-modal">
          Hubo un problema al intentar eliminar el escenario. Por favor, intenta de nuevo más tarde.
        </p>

        <template #pie>
          <div class="flex flex-contenido-fin brecha-2">
            <button
              v-if="wasDeletionSuccesful === null"
              class="boton boton-secundario"
              :disabled="isBeingDeleted"
              @click="cancelarEliminar"
            >
              Cancelar
            </button>
            <button
              v-else
              class="boton boton-primario"
              :disabled="isBeingDeleted"
              @click="cerrarModal"
            >
              Cerrar
            </button>
            <button
              v-if="wasDeletionSuccesful === null"
              class="boton boton-primario"
              :disabled="isBeingDeleted"
              @click="confirmarEliminar"
            >
              <span v-if="isBeingDeleted" class="cargador cargador-chico m-r-1" />
              Eliminar
            </button>
          </div>
        </template>
      </GeocontenidosSisdaiModal>
    </ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
.alerta-advertencia-modal {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-neutro-5);
  margin-bottom: 24px;
}

.alerta-exito-modal {
  color: var(--color-exito-1);
}

.alerta-error-modal {
  color: var(--color-error-1);
}

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
