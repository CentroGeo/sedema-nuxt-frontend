<script setup>
const props = defineProps({
  siteId: {
    type: Number,
    required: true,
  },
});

const { data: userData } = useAuth();
const { fetchGrupos, crearGrupo, eliminarGrupo, fetchIndicadores } = useTableroApi();

const grupos = ref([]);
const indicadoresSitio = ref([]);
const cargandoGrupos = ref(false);
const cargandoIndicadores = ref(false);
const mostrarFormGrupo = ref(false);
const nuevoGrupo = reactive({ name: '', description: '', info_text: '' });

async function cargarGrupos() {
  cargandoGrupos.value = true;
  try {
    const data = await fetchGrupos(props.siteId);
    grupos.value = data.results || [];
  } catch (e) {
    console.error('Error al cargar grupos:', e);
  } finally {
    cargandoGrupos.value = false;
  }
}

async function cargarIndicadores() {
  cargandoIndicadores.value = true;
  try {
    const data = await fetchIndicadores(props.siteId);
    indicadoresSitio.value = data.results || [];
  } catch (e) {
    console.error('Error al cargar indicadores:', e);
  } finally {
    cargandoIndicadores.value = false;
  }
}

async function agregarGrupo() {
  if (!nuevoGrupo.name) return;
  const payload = {
    site: props.siteId,
    name: nuevoGrupo.name,
    description: nuevoGrupo.description,
    info_text: nuevoGrupo.info_text,
    stack_order: grupos.value.length + 1,
  };
  const data = await crearGrupo(payload, userData.value?.accessToken);
  if (data?.id) {
    grupos.value.push(data);
    nuevoGrupo.name = '';
    nuevoGrupo.description = '';
    nuevoGrupo.info_text = '';
    mostrarFormGrupo.value = false;
  }
}

// --- Modal de confirmación de eliminación ---
const modalEliminar = ref(null);
const grupoToDelete = ref(null);
const isBeingDeleted = ref(false);
const wasDeletionSuccesful = ref(null);

function abrirModalEliminar(grupo) {
  grupoToDelete.value = grupo;
  wasDeletionSuccesful.value = null;
  modalEliminar.value?.abrir();
}

function cancelarEliminar() {
  grupoToDelete.value = null;
  modalEliminar.value?.cerrar();
}

async function confirmarEliminar() {
  if (!grupoToDelete.value) return;
  isBeingDeleted.value = true;
  try {
    const ok = await eliminarGrupo(grupoToDelete.value.id, userData.value?.accessToken);
    if (ok) {
      wasDeletionSuccesful.value = true;
      grupos.value = grupos.value.filter((g) => g.id !== grupoToDelete.value.id);
      setTimeout(() => {
        modalEliminar.value?.cerrar();
      }, 1200);
    } else {
      wasDeletionSuccesful.value = false;
    }
  } catch (e) {
    console.error('Error al eliminar grupo:', e);
    wasDeletionSuccesful.value = false;
  } finally {
    isBeingDeleted.value = false;
  }
}

function recargarTodo() {
  cargarGrupos();
  cargarIndicadores();
}

onMounted(recargarTodo);
</script>

<template>
  <div class="tab-estructura">
    <div class="tab-estructura__panel">
      <header class="tab-estructura__header">
        <h3>Repositorio de indicadores</h3>
      </header>

      <TablerosAdminRepositorioIndicadores
        :site-id="siteId"
        :indicadores="indicadoresSitio"
        :grupos="grupos"
        :cargando="cargandoIndicadores"
        @crear="recargarTodo"
        @eliminar="recargarTodo"
      />
    </div>

    <div class="tab-estructura__panel">
      <header class="tab-estructura__header">
        <h3>Estructura del sitio</h3>
        <button
          type="button"
          class="boton boton-secundario boton-chico"
          @click="mostrarFormGrupo = !mostrarFormGrupo"
        >
          <span class="pictograma-agregar m-r-1" />
          Nuevo grupo
        </button>
      </header>

      <form v-if="mostrarFormGrupo" class="tab-estructura__form" @submit.prevent="agregarGrupo">
        <div class="m-b-2">
          <label for="grupo-nombre">Nombre del grupo</label>
          <input id="grupo-nombre" v-model="nuevoGrupo.name" type="text" required />
        </div>
        <div class="m-b-2">
          <label for="grupo-descripcion">Descripción</label>
          <input id="grupo-descripcion" v-model="nuevoGrupo.description" type="text" />
        </div>
        <div class="m-b-2">
          <label for="grupo-info">Info</label>
          <textarea id="grupo-info" v-model="nuevoGrupo.info_text" rows="2" />
        </div>
        <div class="flex flex-contenido-final">
          <button type="button" class="boton boton-secundario" @click="mostrarFormGrupo = false">
            Cancelar
          </button>
          <input type="submit" class="boton boton-primario" value="Crear" />
        </div>
      </form>

      <GeocontenidosLoader v-if="cargandoGrupos" mensaje="Cargando estructura..." />

      <p v-else-if="!grupos.length" class="formulario-ayuda">
        Aún no hay grupos. Crea uno para empezar a organizar indicadores.
      </p>

      <ul v-else class="tab-estructura__grupos">
        <li v-for="grupo in grupos" :key="grupo.id">
          <TablerosAdminArbolGrupo
            :grupo="grupo"
            :indicadores-sitio="indicadoresSitio"
            @eliminar="abrirModalEliminar(grupo)"
            @cambio="recargarTodo"
          />
        </li>
      </ul>
    </div>

    <ClientOnly>
      <GeocontenidosSisdaiModal ref="modalEliminar" :permitir-cerrar="!isBeingDeleted">
        <template #encabezado>
          <h2 class="m-t-0">Eliminar grupo</h2>
        </template>

        <p v-if="wasDeletionSuccesful === null || isBeingDeleted" class="alerta-advertencia-modal">
          El grupo <strong style="font-weight: bold">{{ grupoToDelete?.name }}</strong> y todos sus
          subgrupos e indicadores asociados serán eliminados permanentemente del servidor y no será
          posible recuperarlos.
        </p>

        <p v-else-if="wasDeletionSuccesful === true" class="texto-color-exito">
          <span class="pictograma-aprobado m-r-1" />
          El grupo fue eliminado correctamente.
        </p>

        <p v-else class="texto-color-error">No se pudo eliminar el grupo. Intenta de nuevo.</p>

        <template #pie>
          <div class="flex brecha-2 flex-contenido-final">
            <button
              class="boton boton-secundario"
              :disabled="isBeingDeleted"
              @click="cancelarEliminar"
            >
              Cancelar
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
.tab-estructura {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }

  &__panel {
    border: 1px solid var(--color-neutro-2, #e0e0e0);
    border-radius: 8px;
    padding: 1rem;
    background: transparent;
    color: inherit;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;

    h3 {
      margin: 0;
    }
  }

  &__form {
    padding: 1rem;
    margin-bottom: 1rem;
    background: transparent;
    border: 1px solid var(--color-neutro-2, #e0e0e0);
    border-radius: 6px;
  }

  &__grupos {
    list-style: none;
    padding: 0;
    margin: 0;
  }
}
</style>
