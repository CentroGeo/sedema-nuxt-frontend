<script setup>
const props = defineProps({
  grupo: {
    type: Object,
    required: true,
  },
  indicadoresSitio: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['eliminar', 'cambio']);

const { data: userData } = useAuth();
const {
  crearSubgrupo,
  eliminarSubgrupo,
  actualizarGrupo,
  actualizarSubgrupo,
  actualizarIndicador,
  fetchSubgrupos,
  fetchIndicadoresPorGrupo,
  fetchIndicadoresPorSubgrupo,
} = useTableroApi();

const expandido = ref(true);
const mostrarFormSubgrupo = ref(false);
const nuevoSubgrupo = reactive({ name: '', info_text: '', icon: '' });
const errorSubgrupo = ref('');
const detalle = ref(null);
const cargandoDetalle = ref(false);

const editandoGrupo = ref(false);
const formularioGrupo = reactive({ name: '', description: '', info_text: '' });
const guardandoGrupo = ref(false);

const subgrupoEditandoId = ref(null);
const formularioSubgrupo = reactive({ name: '', icon: '', info_text: '' });
const guardandoSubgrupo = ref(false);

// --- Confirmación de guardado (grupo o subgrupo) ---
const modalGuardado = ref(null);
const estatusGuardado = reactive({ titulo: '', guardando: false, exito: null, mensaje: '' });

async function cargarDetalle() {
  cargandoDetalle.value = true;
  try {
    const [subgruposData, indDirectosData] = await Promise.all([
      fetchSubgrupos(props.grupo.id),
      fetchIndicadoresPorGrupo(props.grupo.id),
    ]);

    const subgrupos = subgruposData.results || [];
    const indicadoresDirectos = indDirectosData.results || [];

    const subgruposConIndicadores = await Promise.all(
      subgrupos.map(async (sg) => {
        const indsData = await fetchIndicadoresPorSubgrupo(sg.id);
        return { ...sg, indicators: indsData.results || [] };
      })
    );

    detalle.value = {
      subgroups: subgruposConIndicadores,
      indicators: indicadoresDirectos,
    };
  } catch (e) {
    console.error('Error al cargar detalle:', e);
  } finally {
    cargandoDetalle.value = false;
  }
}

async function agregarSubgrupo() {
  if (!nuevoSubgrupo.name) return;
  errorSubgrupo.value = '';
  const form = new FormData();
  form.append('group', String(props.grupo.id));
  form.append('name', nuevoSubgrupo.name);
  if (nuevoSubgrupo.info_text) form.append('info_text', nuevoSubgrupo.info_text);
  if (nuevoSubgrupo.icon) form.append('icon', nuevoSubgrupo.icon);

  try {
    const data = await crearSubgrupo(form, userData.value?.accessToken);
    if (data?.id) {
      nuevoSubgrupo.name = '';
      nuevoSubgrupo.info_text = '';
      nuevoSubgrupo.icon = '';
      mostrarFormSubgrupo.value = false;
      await cargarDetalle();
      emit('cambio');
    } else {
      errorSubgrupo.value = data?.detail || JSON.stringify(data) || 'Error al crear subgrupo.';
    }
  } catch (e) {
    errorSubgrupo.value = e?.message || 'Error al crear subgrupo.';
  }
}

// --- Modal de confirmación de eliminación ---
const modalEliminar = ref(null);
const subgrupoToDelete = ref(null);
const isBeingDeleted = ref(false);
const wasDeletionSuccesful = ref(null);

function abrirModalEliminar(sg) {
  subgrupoToDelete.value = sg;
  wasDeletionSuccesful.value = null;
  modalEliminar.value?.abrir();
}

function cancelarEliminar() {
  subgrupoToDelete.value = null;
  modalEliminar.value?.cerrar();
}

async function confirmarEliminar() {
  if (!subgrupoToDelete.value) return;
  isBeingDeleted.value = true;
  try {
    const ok = await eliminarSubgrupo(subgrupoToDelete.value.id, userData.value?.accessToken);
    if (ok) {
      wasDeletionSuccesful.value = true;
      await cargarDetalle();
      emit('cambio');
      setTimeout(() => {
        modalEliminar.value?.cerrar();
      }, 1200);
    } else {
      wasDeletionSuccesful.value = false;
    }
  } catch (e) {
    console.error('Error al eliminar subgrupo:', e);
    wasDeletionSuccesful.value = false;
  } finally {
    isBeingDeleted.value = false;
  }
}

async function onDropGrupo(ev) {
  ev.stopPropagation();

  const indicadorId = ev.dataTransfer.getData('indicator-id');
  if (!indicadorId) return;
  await actualizarIndicador(
    Number(indicadorId),
    { group: props.grupo.id, subgroup: null },
    userData.value?.accessToken
  );
  await cargarDetalle();
  emit('cambio');
}

async function onDropSubgrupo(ev, subgrupoId) {
  // Sin esto el 'drop' burbujea al contenedor del grupo (arbol-grupo__drop) y
  // onDropGrupo también se dispara, sobreescribiendo esta asignación con subgroup: null.
  ev.stopPropagation();

  const indicadorId = ev.dataTransfer.getData('indicator-id');
  if (!indicadorId) return;
  await actualizarIndicador(
    Number(indicadorId),
    { subgroup: subgrupoId, group: null },
    userData.value?.accessToken
  );
  await cargarDetalle();
  emit('cambio');
}

async function desasignar(indicadorId) {
  await actualizarIndicador(
    indicadorId,
    { group: null, subgroup: null },
    userData.value?.accessToken
  );
  await cargarDetalle();
  emit('cambio');
}

function abrirEdicionGrupo() {
  formularioGrupo.name = props.grupo.name || '';
  formularioGrupo.description = props.grupo.description || '';
  formularioGrupo.info_text = props.grupo.info_text || '';
  editandoGrupo.value = true;
}

async function guardarGrupo() {
  if (!formularioGrupo.name) return;
  guardandoGrupo.value = true;
  estatusGuardado.titulo = 'grupo';
  estatusGuardado.guardando = true;
  estatusGuardado.exito = null;
  estatusGuardado.mensaje = '';
  modalGuardado.value?.abrir();
  try {
    await actualizarGrupo(props.grupo.id, formularioGrupo, userData.value?.accessToken);
    editandoGrupo.value = false;
    emit('cambio');
    estatusGuardado.guardando = false;
    estatusGuardado.exito = true;
    setTimeout(() => {
      modalGuardado.value?.cerrar();
    }, 1200);
  } catch (e) {
    console.error('Error al actualizar grupo:', e);
    estatusGuardado.guardando = false;
    estatusGuardado.exito = false;
    estatusGuardado.mensaje = e?.message || 'No se pudo guardar el grupo.';
  } finally {
    guardandoGrupo.value = false;
  }
}

function abrirEdicionSubgrupo(sg) {
  formularioSubgrupo.name = sg.name || '';
  formularioSubgrupo.icon = sg.icon || '';
  formularioSubgrupo.info_text = sg.info_text || '';
  subgrupoEditandoId.value = sg.id;
}

async function guardarSubgrupo(sgId) {
  if (!formularioSubgrupo.name) return;
  guardandoSubgrupo.value = true;
  estatusGuardado.titulo = 'subgrupo';
  estatusGuardado.guardando = true;
  estatusGuardado.exito = null;
  estatusGuardado.mensaje = '';
  modalGuardado.value?.abrir();
  const form = new FormData();
  form.append('name', formularioSubgrupo.name);
  if (formularioSubgrupo.icon) form.append('icon', formularioSubgrupo.icon);
  form.append('info_text', formularioSubgrupo.info_text || '');
  try {
    await actualizarSubgrupo(sgId, form, userData.value?.accessToken);
    subgrupoEditandoId.value = null;
    await cargarDetalle();
    emit('cambio');
    estatusGuardado.guardando = false;
    estatusGuardado.exito = true;
    setTimeout(() => {
      modalGuardado.value?.cerrar();
    }, 1200);
  } catch (e) {
    console.error('Error al actualizar subgrupo:', e);
    estatusGuardado.guardando = false;
    estatusGuardado.exito = false;
    estatusGuardado.mensaje = e?.message || 'No se pudo guardar el subgrupo.';
  } finally {
    guardandoSubgrupo.value = false;
  }
}

onMounted(cargarDetalle);
</script>

<template>
  <div class="arbol-grupo">
    <header class="arbol-grupo__header">
      <button type="button" class="arbol-grupo__toggle" @click="expandido = !expandido">
        <span>{{ expandido ? '▼' : '▶' }}</span>
        <strong>{{ grupo.name }}</strong>
        <span v-if="grupo.description" class="arbol-grupo__desc">{{ grupo.description }}</span>
      </button>

      <div class="arbol-grupo__acciones">
        <button
          type="button"
          class="boton boton-secundario boton-chico"
          title="Editar grupo"
          @click="abrirEdicionGrupo"
        >
          <span class="pictograma-editar" />
        </button>
        <button
          type="button"
          class="boton boton-secundario boton-chico"
          @click="mostrarFormSubgrupo = !mostrarFormSubgrupo"
        >
          + Subgrupo
        </button>
        <button
          type="button"
          class="boton boton-primario boton-chico"
          title="Eliminar grupo"
          @click="emit('eliminar')"
        >
          <span class="pictograma-eliminar" />
        </button>
      </div>
    </header>

    <div v-if="editandoGrupo" class="arbol-grupo__edit-form">
      <form @submit.prevent="guardarGrupo">
        <input v-model="formularioGrupo.name" type="text" placeholder="Nombre del grupo" required />
        <input
          v-model="formularioGrupo.description"
          type="text"
          placeholder="Descripción (opcional)"
        />
        <textarea
          v-model="formularioGrupo.info_text"
          rows="2"
          placeholder="Info (texto que aparece como ayuda del grupo, opcional)"
        />
        <div class="arbol-grupo__edit-acciones">
          <button
            type="button"
            class="boton boton-secundario boton-chico"
            @click="editandoGrupo = false"
          >
            Cancelar
          </button>
          <input
            type="submit"
            class="boton boton-primario boton-chico"
            :value="guardandoGrupo ? 'Guardando...' : 'Guardar'"
            :disabled="guardandoGrupo"
          />
        </div>
      </form>
    </div>

    <div v-if="expandido" class="arbol-grupo__drop" @dragover.prevent @drop.prevent="onDropGrupo">
      <div v-if="mostrarFormSubgrupo">
        <form class="arbol-grupo__form" @submit.prevent="agregarSubgrupo">
          <input
            v-model="nuevoSubgrupo.name"
            type="text"
            placeholder="Nombre del subgrupo"
            required
          />
          <input v-model="nuevoSubgrupo.info_text" type="text" placeholder="Info (opcional)" />
          <TablerosAdminPickerIcono v-model="nuevoSubgrupo.icon" />
          <input type="submit" class="boton boton-primario boton-chico" value="Crear" />
        </form>
        <p v-if="errorSubgrupo" class="formulario-ayuda color-error">{{ errorSubgrupo }}</p>
      </div>

      <div v-if="cargandoDetalle">Cargando...</div>

      <div v-else>
        <ul v-if="detalle?.indicators?.length" class="arbol-grupo__items">
          <li v-for="ind in detalle.indicators" :key="ind.id">
            <span class="pictograma-reporte m-r-1" />
            {{ ind.name }}
            <button
              type="button"
              class="boton boton-secundario boton-chico m-l-1"
              @click="desasignar(ind.id)"
            >
              Quitar
            </button>
          </li>
        </ul>

        <ul v-if="detalle?.subgroups?.length" class="arbol-grupo__subgrupos">
          <li
            v-for="sg in detalle.subgroups"
            :key="sg.id"
            class="arbol-grupo__subgrupo"
            @dragover.prevent
            @drop.prevent="onDropSubgrupo($event, sg.id)"
          >
            <div class="arbol-grupo__subgrupo-cab">
              <template v-if="subgrupoEditandoId === sg.id">
                <form class="arbol-grupo__subgrupo-form" @submit.prevent="guardarSubgrupo(sg.id)">
                  <input
                    v-model="formularioSubgrupo.name"
                    type="text"
                    placeholder="Nombre del subgrupo"
                    required
                  />
                  <input
                    v-model="formularioSubgrupo.info_text"
                    type="text"
                    placeholder="Info (opcional)"
                  />
                  <TablerosAdminPickerIcono v-model="formularioSubgrupo.icon" />
                  <input
                    type="submit"
                    class="boton boton-primario boton-chico"
                    :value="guardandoSubgrupo ? '...' : 'Guardar'"
                    :disabled="guardandoSubgrupo"
                  />
                  <button
                    type="button"
                    class="boton boton-secundario boton-chico"
                    @click="subgrupoEditandoId = null"
                  >
                    Cancelar
                  </button>
                </form>
              </template>
              <template v-else>
                <span v-if="sg.icon" :class="sg.icon" />
                <strong>{{ sg.name }}</strong>
                <button
                  type="button"
                  class="boton boton-secundario boton-chico"
                  title="Editar subgrupo"
                  @click="abrirEdicionSubgrupo(sg)"
                >
                  <span class="pictograma-editar m-r-1" />
                  Editar
                </button>
                <button
                  type="button"
                  class="boton boton-primario boton-chico"
                  title="Eliminar subgrupo"
                  @click="abrirModalEliminar(sg)"
                >
                  <span class="pictograma-eliminar" />
                </button>
              </template>
            </div>
            <ul v-if="sg.indicators?.length">
              <li v-for="ind in sg.indicators" :key="ind.id">
                <span class="pictograma-reporte m-r-1" />
                {{ ind.name }}
                <button
                  type="button"
                  class="boton boton-secundario boton-chico m-l-1"
                  @click="desasignar(ind.id)"
                >
                  Quitar
                </button>
              </li>
            </ul>
            <p v-else class="formulario-ayuda">Arrastra indicadores aquí.</p>
          </li>
        </ul>

        <p
          v-if="!detalle?.indicators?.length && !detalle?.subgroups?.length"
          class="formulario-ayuda"
        >
          Grupo vacío. Arrastra indicadores desde el repositorio o crea un subgrupo.
        </p>
      </div>
    </div>
    <ClientOnly>
      <GeocontenidosSisdaiModal ref="modalEliminar" :permitir-cerrar="!isBeingDeleted">
        <template #encabezado>
          <h2 class="m-t-0">Eliminar subgrupo</h2>
        </template>

        <p v-if="wasDeletionSuccesful === null || isBeingDeleted" class="alerta-advertencia-modal">
          El subgrupo <strong style="font-weight: bold">{{ subgrupoToDelete?.name }}</strong> será
          eliminado permanentemente del servidor y no será posible recuperarlo.
        </p>

        <p v-else-if="wasDeletionSuccesful === true" class="texto-color-exito">
          <span class="pictograma-aprobado m-r-1" />
          El subgrupo fue eliminado correctamente.
        </p>

        <p v-else class="texto-color-error">No se pudo eliminar el subgrupo. Intenta de nuevo.</p>

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

      <GeocontenidosSisdaiModal ref="modalGuardado" :permitir-cerrar="!estatusGuardado.guardando">
        <template #encabezado>
          <h2 class="m-t-0">
            {{
              estatusGuardado.exito === false
                ? 'Error al guardar'
                : `Guardar ${estatusGuardado.titulo}`
            }}
          </h2>
        </template>

        <GeocontenidosLoader
          v-if="estatusGuardado.guardando"
          :mensaje="`Guardando ${estatusGuardado.titulo}...`"
        />

        <p v-else-if="estatusGuardado.exito === true" class="texto-color-exito">
          <span class="pictograma-aprobado m-r-1" />
          El {{ estatusGuardado.titulo }} se guardó correctamente.
        </p>

        <p v-else class="texto-color-error">{{ estatusGuardado.mensaje }}</p>

        <template v-if="estatusGuardado.exito === false" #pie>
          <div class="flex flex-contenido-final">
            <button class="boton boton-primario" @click="modalGuardado?.cerrar()">Cerrar</button>
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
.arbol-grupo {
  background: transparent;
  border: 1px solid var(--color-neutro-2, #e0e0e0);
  border-radius: 6px;
  margin-bottom: 0.75rem;
  color: inherit;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
  }

  &__toggle {
    background: none;
    border: 0;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    color: inherit;
  }

  &__acciones {
    display: flex;
    gap: 0.25rem;

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;

      &:has(.pictograma-eliminar),
      &:has(.pictograma-editar) {
        width: 28px;
        height: 28px;
        padding: 0;

        // El botón no lleva texto junto al ícono: sin esto hereda el
        // padding-left que sisdai reserva para separar ícono y texto,
        // y el pictograma queda descentrado dentro del cuadro.
        [class*='pictograma-'] {
          padding: 0;
        }
      }
    }
  }

  button[title='Eliminar subgrupo'] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;

    [class*='pictograma-'] {
      padding: 0;
    }
  }

  &__drop {
    padding: 0.5rem 0.75rem 0.75rem;
    border-top: 1px dashed var(--color-neutro-2, #e0e0e0);
    min-height: 60px;
  }

  &__form {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;

    input[type='text'] {
      flex: 1;
    }
  }

  &__items,
  &__subgrupos {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  &__desc {
    font-size: 0.75rem;
    color: var(--color-neutro-5, #888);
    font-weight: normal;
  }

  &__edit-form {
    padding: 0.5rem 0.75rem;
    border-top: 1px dashed var(--color-neutro-2, #e0e0e0);
    background: transparent;

    form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  }

  &__edit-acciones {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  &__subgrupo {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: transparent;
    border: 1px solid var(--color-neutro-2, #e0e0e0);
    border-radius: 4px;
    color: inherit;

    &-cab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.4rem;
      flex-wrap: wrap;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      padding: 0.25rem 0;
    }
  }

  &__subgrupo-form {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
    width: 100%;

    input[type='text'] {
      flex: 1;
      min-width: 120px;
    }
  }
}
</style>
