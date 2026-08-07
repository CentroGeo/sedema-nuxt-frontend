<script setup>
const props = defineProps({
  siteId: {
    type: Number,
    required: true,
  },
});

const { data: userData } = useAuth();
const { fetchIndicadores, fetchCuadrosDatos, eliminarCuadroDatos } = useTableroApi();

const indicadores = ref([]);
const indicadorActivo = ref(null);
const cuadros = ref([]);
const cargandoIndicadores = ref(false);
const cargandoCuadros = ref(false);
const mostrarFormulario = ref(false);
const cuadroEditando = ref(null);

const MAX_CUADROS = 8;

async function cargarIndicadores() {
  cargandoIndicadores.value = true;
  try {
    const data = await fetchIndicadores(props.siteId);
    indicadores.value = data.results || [];
    if (indicadores.value.length && !indicadorActivo.value) {
      indicadorActivo.value = indicadores.value[0].id;
    }
  } catch (e) {
    console.error('Error al cargar indicadores:', e);
  } finally {
    cargandoIndicadores.value = false;
  }
}

async function cargarCuadros() {
  if (!indicadorActivo.value) {
    cuadros.value = [];
    return;
  }
  cargandoCuadros.value = true;
  try {
    const data = await fetchCuadrosDatos(indicadorActivo.value);
    cuadros.value = data.results || data || [];
  } catch (e) {
    console.error('Error al cargar cuadros:', e);
  } finally {
    cargandoCuadros.value = false;
  }
}

watch(indicadorActivo, cargarCuadros);

// --- Modal de confirmación de eliminación ---
const modalEliminar = ref(null);
const cuadroToDelete = ref(null);
const isBeingDeleted = ref(false);
const wasDeletionSuccesful = ref(null);

function abrirModalEliminar(cuadro) {
  cuadroToDelete.value = cuadro;
  wasDeletionSuccesful.value = null;
  modalEliminar.value?.abrir();
}

function cancelarEliminar() {
  cuadroToDelete.value = null;
  modalEliminar.value?.cerrar();
}

async function confirmarEliminar() {
  if (!cuadroToDelete.value) return;
  isBeingDeleted.value = true;
  try {
    const ok = await eliminarCuadroDatos(cuadroToDelete.value.id, userData.value?.accessToken);
    if (ok) {
      wasDeletionSuccesful.value = true;
      cuadros.value = cuadros.value.filter((c) => c.id !== cuadroToDelete.value.id);
      setTimeout(() => {
        modalEliminar.value?.cerrar();
      }, 1200);
    } else {
      wasDeletionSuccesful.value = false;
    }
  } catch (e) {
    console.error('Error al eliminar cuadro:', e);
    wasDeletionSuccesful.value = false;
  } finally {
    isBeingDeleted.value = false;
  }
}

function editarCuadro(cuadro) {
  cuadroEditando.value = cuadro;
  mostrarFormulario.value = true;
}

function crearCuadro() {
  cuadroEditando.value = null;
  mostrarFormulario.value = true;
}

function alGuardarCuadro() {
  mostrarFormulario.value = false;
  cuadroEditando.value = null;
  cargarCuadros();
}

onMounted(cargarIndicadores);
</script>

<template>
  <div class="tab-datos">
    <GeocontenidosLoader v-if="cargandoIndicadores" mensaje="Cargando indicadores..." />

    <p v-else-if="!indicadores.length" class="formulario-ayuda">
      Aún no hay indicadores. Crea uno desde la pestaña Estructura.
    </p>

    <template v-else>
      <div class="tab-datos__selector m-b-3">
        <label for="tab-datos-indicador">Indicador</label>
        <select id="tab-datos-indicador" v-model="indicadorActivo">
          <option v-for="ind in indicadores" :key="ind.id" :value="ind.id">
            {{ ind.name }}
          </option>
        </select>
      </div>

      <div class="tab-datos__acciones m-b-3">
        <button
          type="button"
          class="boton boton-primario"
          :disabled="cuadros.length >= MAX_CUADROS"
          @click="crearCuadro"
        >
          <span class="pictograma-agregar m-r-1" />
          Crear cuadro de datos
        </button>
        <span class="formulario-ayuda">{{ cuadros.length }} / {{ MAX_CUADROS }} cuadros</span>
      </div>

      <GeocontenidosLoader v-if="cargandoCuadros" mensaje="Cargando cuadros..." />

      <p v-else-if="!cuadros.length" class="formulario-ayuda">
        Este indicador aún no tiene cuadros de datos.
      </p>

      <div v-else class="tab-datos__grid">
        <article
          v-for="cuadro in cuadros"
          :key="cuadro.id"
          class="tab-datos__tarjeta"
          :style="{
            background: cuadro.color,
            color: cuadro.text_color,
            borderColor: cuadro.edge_color,
          }"
        >
          <header class="tab-datos__cabecera-tarjeta">
            <div class="tab-datos__icono-contenedor">
              <img
                v-if="cuadro.icon_custom"
                :src="cuadro.icon_custom"
                alt="Icono personalizado"
                class="tab-datos__icono-img"
              />
              <span v-else-if="cuadro.icon" :class="cuadro.icon" class="tab-datos__icono" />
            </div>
            <h4 class="tab-datos__titulo-tarjeta">{{ cuadro.name }}</h4>
          </header>

          <p class="tab-datos__campo">Campo: {{ cuadro.field }}</p>
          <p v-if="cuadro.is_percentage" class="tab-datos__badge">Porcentual</p>

          <footer class="tab-datos__pie">
            <button
              type="button"
              class="boton boton-chico tab-datos__btn-tarjeta"
              @click="editarCuadro(cuadro)"
            >
              Editar
            </button>
            <button
              type="button"
              class="boton boton-chico tab-datos__btn-tarjeta tab-datos__btn-tarjeta--eliminar"
              @click="abrirModalEliminar(cuadro)"
            >
              Eliminar
            </button>
          </footer>
        </article>
      </div>

      <TablerosAdminFormularioCuadroDatos
        v-if="mostrarFormulario && indicadorActivo"
        :indicador-id="indicadorActivo"
        :cuadro="cuadroEditando"
        @guardado="alGuardarCuadro"
        @cerrar="mostrarFormulario = false"
      />
    </template>

    <ClientOnly>
      <GeocontenidosSisdaiModal ref="modalEliminar" :permitir-cerrar="!isBeingDeleted">
        <template #encabezado>
          <h2 class="m-t-0">Eliminar cuadro de datos</h2>
        </template>

        <p v-if="wasDeletionSuccesful === null || isBeingDeleted" class="alerta-advertencia-modal">
          El cuadro de datos
          <strong style="font-weight: bold">{{ cuadroToDelete?.name }}</strong> será eliminado
          permanentemente del servidor y no será posible recuperarlo.
        </p>

        <p v-else-if="wasDeletionSuccesful === true" class="texto-color-exito">
          <span class="pictograma-aprobado m-r-1" />
          El cuadro de datos fue eliminado correctamente.
        </p>

        <p v-else class="texto-color-error">
          No se pudo eliminar el cuadro de datos. Intenta de nuevo.
        </p>

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
.tab-datos {
  &__selector {
    label {
      display: block;
      margin-bottom: 0.3rem;
    }
  }

  &__acciones {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
  }

  &__tarjeta {
    padding: 1rem;
    border-radius: 8px;
    border-width: 2px;
    border-style: solid;

    /* Cabecera estilizada de forma global */

    footer {
      display: flex;
      gap: 0.3rem;
      margin-top: 0.75rem;
    }

    &__btn-tarjeta {
      background: rgba(255, 255, 255, 0.88);
      color: #111 !important;
      border: 1px solid rgba(0, 0, 0, 0.18);

      &:hover {
        background: rgba(255, 255, 255, 1);
        border-color: rgba(0, 0, 0, 0.35);
      }

      &--eliminar {
        background: rgba(220, 53, 69, 0.1);

        &:hover {
          background: rgba(220, 53, 69, 0.85);
          color: #fff !important;
        }
      }
    }
  }

  &__icono {
    font-size: 1.5rem;
  }

  &__icono-img {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  &__cabecera-tarjeta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    margin-bottom: 0.5rem;
  }

  &__titulo-tarjeta {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }

  &__icono-contenedor {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 1.3rem;
  }

  &__campo {
    font-size: 0.85rem;
    margin: 0.5rem 0 0;
  }

  &__badge {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    font-size: 0.75rem;
    margin-top: 0.3rem;
  }
}
</style>
