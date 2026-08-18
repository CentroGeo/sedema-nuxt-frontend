<script setup>
const props = defineProps({
  siteId: {
    type: Number,
    required: true,
  },
  indicadores: {
    type: Array,
    default: () => [],
  },
  grupos: {
    type: Array,
    default: () => [],
  },
  cargando: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['crear', 'eliminar']);

const { data: userData } = useAuth();
const { eliminarIndicador, recalcularIndicador, fetchIndicador } = useTableroApi();

const filtro = ref('');
const filtroGrupo = ref('');
const mostrarModalNuevo = ref(false);
const indicadorEditando = ref(null);
const abriendoEdicionId = ref(null);
const errorEdicion = ref('');
const recalculandoId = ref(null);
const mensajeRecalculo = ref('');

const filtrados = computed(() => {
  let lista = props.indicadores;
  if (filtroGrupo.value) {
    lista = lista.filter((i) => String(i.group) === String(filtroGrupo.value));
  }
  if (!filtro.value) return lista;
  const t = filtro.value.toLowerCase();
  return lista.filter((i) => i.name?.toLowerCase().includes(t));
});

// --- Modal de confirmación de eliminación ---
const modalEliminar = ref(null);
const indToDelete = ref(null);
const isBeingDeleted = ref(false);
const wasDeletionSuccesful = ref(null);

function abrirModalEliminar(ind) {
  indToDelete.value = ind;
  wasDeletionSuccesful.value = null;
  modalEliminar.value?.abrir();
}

function cancelarEliminar() {
  indToDelete.value = null;
  modalEliminar.value?.cerrar();
}

async function confirmarEliminar() {
  if (!indToDelete.value) return;
  isBeingDeleted.value = true;
  try {
    const ok = await eliminarIndicador(indToDelete.value.id, userData.value?.accessToken);
    if (ok) {
      wasDeletionSuccesful.value = true;
      emit('eliminar');
      setTimeout(() => {
        modalEliminar.value?.cerrar();
      }, 1200);
    } else {
      wasDeletionSuccesful.value = false;
    }
  } catch (e) {
    console.error('Error al eliminar indicador:', e);
    wasDeletionSuccesful.value = false;
  } finally {
    isBeingDeleted.value = false;
  }
}

function alCrear(indicador) {
  mostrarModalNuevo.value = false;
  mostrarAviso(indicador?.avisoRecalculo);
  emit('crear');
}

function alGuardarEdicion(indicador) {
  indicadorEditando.value = null;
  // El formulario recalcula los colores al guardar; si eso falló, la paleta sí quedó
  // guardada pero el mapa sigue con los colores anteriores. Hay que decirlo.
  mostrarAviso(indicador?.avisoRecalculo);
  emit('crear'); // recarga la lista
}

function mostrarAviso(mensaje) {
  if (!mensaje) return;
  mensajeRecalculo.value = `Se guardó la configuración, pero no se recalcularon los colores: ${mensaje}`;
  setTimeout(() => {
    mensajeRecalculo.value = '';
  }, 8000);
}

/**
 * La lista viene de `IndicatorListSerializer`, que no incluye la capa ni los
 * campos: abrir el editor con ese objeto dejaba media configuración vacía. Se
 * pide el detalle antes de abrir.
 */
async function abrirEdicion(ind) {
  abriendoEdicionId.value = ind.id;
  errorEdicion.value = '';
  try {
    const detalle = await fetchIndicador(ind.id);
    if (!detalle?.id) {
      errorEdicion.value = 'No se pudo cargar la configuración del indicador.';
      return;
    }
    indicadorEditando.value = detalle;
  } catch (e) {
    errorEdicion.value = e?.message || 'No se pudo cargar la configuración del indicador.';
  } finally {
    abriendoEdicionId.value = null;
  }
}

async function recalcular(ind) {
  recalculandoId.value = ind.id;
  mensajeRecalculo.value = '';
  try {
    const result = await recalcularIndicador(ind.id, userData.value?.accessToken);
    if (result?.status === 'ok') {
      mensajeRecalculo.value = `✓ ${ind.name}: ${result.rangos} rangos calculados`;
      emit('crear'); // recarga la lista para actualizar el badge
    } else {
      mensajeRecalculo.value = `Error: ${result?.error || 'No se pudo recalcular'}`;
    }
  } catch (e) {
    mensajeRecalculo.value = `Error: ${e?.message || 'Error de conexión'}`;
  } finally {
    recalculandoId.value = null;
    setTimeout(() => {
      mensajeRecalculo.value = '';
    }, 4000);
  }
}
</script>

<template>
  <div class="repo-indicadores">
    <div class="repo-indicadores__toolbar">
      <input
        v-model="filtro"
        type="search"
        placeholder="Buscar indicador..."
        class="repo-indicadores__buscar"
      />
      <select
        v-if="grupos.length"
        v-model="filtroGrupo"
        class="repo-indicadores__filtro-grupo"
        title="Filtrar por grupo"
      >
        <option value="">Todos los grupos</option>
        <option v-for="g in grupos" :key="g.id" :value="g.id">{{ g.name }}</option>
      </select>
      <button
        type="button"
        class="boton boton-primario boton-chico"
        @click="mostrarModalNuevo = true"
      >
        <span class="pictograma-agregar m-r-1" />
        Nuevo indicador
      </button>
    </div>

    <GeocontenidosLoader v-if="cargando" mensaje="Cargando indicadores..." />

    <p v-else-if="!filtrados.length" class="formulario-ayuda">
      {{ filtro ? 'Sin coincidencias.' : 'No hay indicadores aún. Crea uno para empezar.' }}
    </p>

    <ul v-else class="repo-indicadores__lista">
      <li
        v-for="ind in filtrados"
        :key="ind.id"
        class="repo-indicadores__item"
        :draggable="true"
        @dragstart="(ev) => ev.dataTransfer.setData('indicator-id', String(ind.id))"
      >
        <div class="repo-indicadores__nombre">
          <strong>{{ ind.name }}</strong>
          <span
            v-if="ind.is_configured"
            class="repo-indicadores__estado repo-indicadores__estado--ok"
            >Configurado</span
          >
          <span v-else class="repo-indicadores__estado">Sin datos</span>
        </div>
        <div class="repo-indicadores__acciones">
          <button
            type="button"
            class="boton boton-secundario boton-chico"
            title="Recalcular datos desde el dataset"
            :disabled="recalculandoId === ind.id"
            @click="recalcular(ind)"
          >
            <span
              class="pictograma-actualizar"
              :class="{ 'repo-indicadores__spin': recalculandoId === ind.id }"
            />
          </button>
          <button
            type="button"
            class="boton boton-secundario boton-chico"
            title="Editar indicador"
            :disabled="abriendoEdicionId === ind.id"
            @click="abrirEdicion(ind)"
          >
            <span
              class="pictograma-editar"
              :class="{ 'repo-indicadores__spin': abriendoEdicionId === ind.id }"
            />
          </button>
          <button
            type="button"
            class="boton boton-secundario boton-chico"
            @click="abrirModalEliminar(ind)"
          >
            <span class="pictograma-eliminar" />
          </button>
        </div>
      </li>
    </ul>

    <p v-if="mensajeRecalculo" class="repo-indicadores__feedback">{{ mensajeRecalculo }}</p>
    <p v-if="errorEdicion" class="repo-indicadores__feedback">{{ errorEdicion }}</p>

    <TablerosAdminModalIndicador
      v-if="mostrarModalNuevo"
      :site-id="siteId"
      @creado="alCrear"
      @cerrar="mostrarModalNuevo = false"
    />

    <TablerosAdminModalIndicador
      v-if="indicadorEditando"
      :key="indicadorEditando.id"
      :site-id="siteId"
      :indicador="indicadorEditando"
      @guardado="alGuardarEdicion"
      @cerrar="indicadorEditando = null"
    />
    <ClientOnly>
      <GeocontenidosSisdaiModal ref="modalEliminar" :permitir-cerrar="!isBeingDeleted">
        <template #encabezado>
          <h2 class="m-t-0">Eliminar indicador</h2>
        </template>

        <p v-if="wasDeletionSuccesful === null || isBeingDeleted" class="alerta-advertencia-modal">
          El indicador <strong style="font-weight: bold">{{ indToDelete?.name }}</strong> será
          eliminado permanentemente del servidor y no será posible recuperarlo.
        </p>

        <p v-else-if="wasDeletionSuccesful === true" class="texto-color-exito">
          <span class="pictograma-aprobado m-r-1" />
          El indicador fue eliminado correctamente.
        </p>

        <p v-else class="texto-color-error">No se pudo eliminar el indicador. Intenta de nuevo.</p>

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
.repo-indicadores {
  &__toolbar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  &__buscar {
    flex: 1;
  }

  &__filtro-grupo {
    max-width: 160px;
  }

  &__lista {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  &__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: nowrap;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.4rem;
    background: transparent;
    border: 1px solid var(--color-neutro-2, #e0e0e0);
    border-radius: 6px;
    cursor: grab;
    color: inherit;

    &:hover {
      border-color: var(--color-primario, #691c32);
    }
  }

  &__nombre {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
    overflow: hidden;

    strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__acciones {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;

      // Sin texto junto al ícono: anula el padding-left que sisdai reserva
      // para separar ícono y texto, que aquí descentraba el pictograma.
      [class*='pictograma-'] {
        padding: 0;
      }
    }
  }

  &__estado {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    background: var(--color-neutro-4, #666666);
    color: #ffffff;

    &--ok {
      background: #2e7d32;
      color: #ffffff;
    }
  }

  &__feedback {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    background: transparent;
    border: 1px solid var(--color-neutro-2, #e0e0e0);
  }

  &__spin {
    display: inline-block;
    animation: girar 0.8s linear infinite;
  }
}

@keyframes girar {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
