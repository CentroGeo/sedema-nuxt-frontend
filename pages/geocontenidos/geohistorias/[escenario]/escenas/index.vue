<script setup>
import { useEscenasCapasAdapter } from '~/composables/capas/useEscenasCapasAdapter';
import { categoriesNamesInSpanish } from '~/utils/consulta';

definePageMeta({ middleware: 'auth' });

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { data: userData } = useAuth();
const { status } = useAuth();
const estaLogueado = computed(() => status.value === 'authenticated');
const { escenario } = useRoute().params;

const escenas = ref([]);
const estaCargando = ref(false);

const modalMarcadores = ref(null);
function abrirModalMarcadores(id) {
  modalMarcadores.value?.abrir(id);
}

// Modal de capas (componente compartido components/capas/CapasModalAgregar).
const escenaCapasId = ref(null);
const abiertoCapas = ref(false);
const adaptadorCapas = useEscenasCapasAdapter(escenaCapasId);
function abrirModalCapas(id) {
  escenaCapasId.value = id;
  abiertoCapas.value = true;
}

async function cargarEscenas() {
  estaCargando.value = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/scenarios/${escenario}/scenes/`);

  const data = await respuesta.json();
  escenas.value = Object.fromEntries(data.map((escena) => [escena.id, escena]));
  estaCargando.value = false;
}
cargarEscenas();

function alIniciarArrastre({ dataTransfer }, idArrastre, posicionArrastre) {
  dataTransfer.setData('idArrastre', idArrastre);
  dataTransfer.setData('posicionArrastre', posicionArrastre);
}
function alSoltar(event, idQuitar, posicionQuitar) {
  event.preventDefault();
  const idArrastre = event.dataTransfer.getData('idArrastre');
  const posicionArrastre = Number(event.dataTransfer.getData('posicionArrastre'));

  // [x[0], x[2]] = [x[2], x[0]]
  [escenas.value[idArrastre].stack_order, escenas.value[idQuitar].stack_order] = [
    posicionQuitar,
    posicionArrastre,
  ];
}

async function guardarCambios() {
  const formulario = Object.values(escenas.value).map(({ id, stack_order }) => ({
    id,
    stack_order,
  }));

  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/scenes/bulk-reorder//`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userData.value?.accessToken}`,
    },
    body: JSON.stringify(formulario),
  });

  const data = await respuesta.json();
  if (data?.success === false) {
    console.error('Error al reordenar escenas:', data.errors);
  }
}

// --- Modal de confirmación de eliminación ---
const modalEliminar = ref(null);
const escenaAEliminar = ref(null);
const tituloAEliminar = computed(() => escenaAEliminar.value?.name ?? '');
const eliminando = ref(false);
const eliminacionExitosa = ref(null);

function abrirModalEliminar(escena) {
  escenaAEliminar.value = escena;
  eliminacionExitosa.value = null;
  modalEliminar.value?.abrir();
}

function cancelarEliminar() {
  escenaAEliminar.value = null;
  modalEliminar.value?.cerrar();
}

async function confirmarEliminar() {
  if (!escenaAEliminar.value) return;
  eliminando.value = true;

  const respuesta = await gnoxyFetch(
    `${config.public.geonodeApi}/scenes/${escenaAEliminar.value.id}/`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userData.value?.accessToken}` },
    }
  );

  eliminando.value = false;
  if (respuesta.ok) {
    eliminacionExitosa.value = true;
    delete escenas.value[escenaAEliminar.value.id];
    setTimeout(() => modalEliminar.value?.cerrar(), 1200);
  } else {
    eliminacionExitosa.value = false;
  }
}
</script>

<template>
  <div>
    <div>
      <div class="flex p-y-3">
        <NuxtLink to="/geocontenidos/geohistorias" class="boton boton-secundario boton-chico">
          <span class="pictograma-flecha-izquierda m-r-1" />
        </NuxtLink>

        <h2 class="m-0">Escenas</h2>
      </div>
    </div>

    <div class="flex flex-contenido-separado m-b-4">
      <NuxtLink
        v-if="estaLogueado"
        :to="`/geocontenidos/geohistorias/${escenario}/escenas/nuevo/editar`"
        class="boton boton-primario"
      >
        <span class="pictograma-agregar m-r-1" />
        Crear Escena
      </NuxtLink>

      <NuxtLink class="boton boton-secundario" :to="`/geohistorias/${escenario}`" target="_blank">
        <span class="pictograma-mapa-generador m-r-1" />
        Visualizar escenario
      </NuxtLink>
    </div>

    <GeocontenidosLoader v-if="estaCargando" />

    <div v-else-if="escenas.length === 0" class="texto-centrado">
      <p class="h3">No hay escenas disponibles.</p>
    </div>

    <template v-else>
      <div class="grid reticula-12 m-b-4">
        <div
          v-for="escena in Object.values(escenas).sort((a, b) => a.stack_order - b.stack_order)"
          :key="escena.id"
          class="columna-8 columna-4-esc"
          @drop="alSoltar($event, escena.id, escena.stack_order)"
          @dragover="$event.preventDefault()"
        >
          <div
            :id="escena.id"
            class="tarjeta"
            draggable="true"
            @dragstart="alIniciarArrastre($event, escena.id, escena.stack_order)"
          >
            <div class="tarjeta-cuerpo flex flex-contenido-separado">
              <p class="tarjeta-titulo">{{ escena.name }}</p>

              <button class="boton boton-chico boton-primario" style="margin-top: 0">
                <span class="pictograma-mover pictograma-grande" style="padding: 0" />
              </button>
            </div>

            <div class="tarjeta-pie flex m-t-3">
              <NuxtLink
                class="boton boton-chico boton-secundario"
                :to="`/geocontenidos/geohistorias/${escenario}/escenas/${escena.id}/editar`"
              >
                <span class="pictograma-editar m-r-1" />
                Editar escena
              </NuxtLink>

              <button
                type="button"
                class="boton boton-chico boton-secundario"
                @click="abrirModalCapas(escena.id)"
              >
                <span :class="`pictograma-${escena.layers.length ? 'editar' : 'agregar'} m-r-1`" />
                {{ escena.layers.length ? 'Editar' : 'Agregar' }} capas
              </button>

              <button
                type="button"
                class="boton boton-chico boton-secundario"
                @click="abrirModalMarcadores(escena.id)"
              >
                <span :class="`pictograma-${escena.markers.length ? 'editar' : 'agregar'} m-r-1`" />
                {{ escena.markers.length ? 'Editar' : 'Agregar' }} marcadores
              </button>

              <button class="boton boton-chico boton-primario" @click="abrirModalEliminar(escena)">
                <span class="pictograma-eliminar m-r-1" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      <section class="flex flex-contenido-final">
        <button class="boton-primario" @click="guardarCambios">Guardar orden</button>
      </section>
    </template>

    <CapasModalAgregar
      v-model:abierto="abiertoCapas"
      :adaptador="adaptadorCapas"
      :opciones="{
        contexto: 'escena',
        titulo: 'Agregar/Editar capas',
        mostrarOpacidad: true,
        mostrarEstilo: true,
        permitirDuplicados: true,
        nombreCategoria: (c) => categoriesNamesInSpanish[c.identifier] ?? c.identifier,
      }"
      @guardado="cargarEscenas"
    />

    <ClientOnly>
      <GeocontenidosModalAgregarMarcadores ref="modalMarcadores" @guardado="cargarEscenas" />

      <GeocontenidosSisdaiModal ref="modalEliminar" :permitir-cerrar="!eliminando">
        <template #encabezado>
          <h2 class="m-t-0">Eliminar escena</h2>
        </template>

        <p v-if="eliminacionExitosa === null || eliminando" class="alerta-advertencia-modal">
          La escena <strong style="font-weight: bold">{{ tituloAEliminar }}</strong> será eliminada
          permanentemente y no será posible recuperarla.
        </p>

        <p v-else-if="eliminacionExitosa === true" class="texto-color-exito">
          <span class="pictograma-aprobado m-r-1" />
          La escena fue eliminada correctamente.
        </p>

        <p v-else class="texto-color-error">No se pudo eliminar la escena. Intenta de nuevo.</p>

        <template #pie>
          <div class="flex brecha-2 flex-contenido-final">
            <button class="boton boton-secundario" :disabled="eliminando" @click="cancelarEliminar">
              Cancelar
            </button>
            <button
              v-if="eliminacionExitosa === null"
              class="boton boton-primario"
              :disabled="eliminando"
              @click="confirmarEliminar"
            >
              <span v-if="eliminando" class="cargador cargador-chico m-r-1" />
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

.modulo-geocontenidos .contenedor {
  .grid.reticula-12 {
    grid-template-columns: repeat(12, 1fr);
  }
  .tarjeta {
    &-cuerpo {
      background-color: var(--color-primario-4);
      color: var(--texto-inverso);
    }
    &-pie {
      flex-direction: column;
      button,
      a {
        display: block;
      }
    }
  }
}
</style>
