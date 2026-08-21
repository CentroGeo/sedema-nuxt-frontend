<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import { usePanoramaCapasAdapter } from '~/composables/capas/usePanoramaCapasAdapter';
import { categoriesNamesInSpanish } from '~/utils/consulta';
import { iconosTematicaPanorama } from '~/utils/geocontenidos/basemapsPanorama';

const props = defineProps({
  panoramaId: { type: [String, Number], required: true },
});

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { data: userData } = useAuth();

const tematicas = ref([]);
const estaCargando = ref(false);

const tematicaCapasId = ref(null);
const abiertoCapas = ref(false);
const adaptadorCapas = usePanoramaCapasAdapter(tematicaCapasId);

function abrirModalCapas(id) {
  tematicaCapasId.value = id;
  abiertoCapas.value = true;
}

const modalMarcadores = ref(null);
const capaMarcadores = ref(null);

function abrirMarcadores(capa) {
  capaMarcadores.value = capa;
  nextTick(() => modalMarcadores.value?.abrir());
}

const modalNarrativa = ref(null);
const capaNarrativa = ref(null);

function abrirNarrativa(capa) {
  capaNarrativa.value = capa;
  nextTick(() => modalNarrativa.value?.abrir());
}

// Selector de capa: marcadores y narrativa son por capa (no por temática), así
// que si la temática tiene más de una capa hay que preguntar cuál antes de
// abrir el modal correspondiente. Reutiliza el mismo adaptador/ref de capas
// que usa el modal "Agregar/Editar capas" solo para cargar la lista.
const modalSelectorCapa = ref(null);
const capasSelector = ref([]);
const modoSelector = ref(null); // 'marcadores' | 'narrativa'

async function abrirSelectorCapa(tematicaId, modo) {
  modoSelector.value = modo;
  tematicaCapasId.value = tematicaId;
  await adaptadorCapas.cargar();

  const capas = adaptadorCapas.layersOrdered.value;
  if (capas.length === 0) {
    alert('Esta temática no tiene capas todavía. Agrega capas primero.');
    return;
  }
  if (capas.length === 1) {
    elegirCapaSelector(capas[0]);
    return;
  }

  capasSelector.value = capas;
  nextTick(() => modalSelectorCapa.value?.abrir());
}

function elegirCapaSelector(capa) {
  if (modoSelector.value === 'marcadores') abrirMarcadores(capa);
  else abrirNarrativa(capa);
}

async function cargarTematicas() {
  estaCargando.value = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panoramas/${props.panoramaId}/`);
  const data = await respuesta.json();
  tematicas.value = data.topics || [];
  estaCargando.value = false;
}
cargarTematicas();

const modalCrear = ref(null);
const tematicaEnEdicion = ref(null);
const errorGuardado = ref('');
const guardando = ref(false);
const formulario = reactive({ name: '', description: '', icon: iconosTematicaPanorama[0] });
const iconoActualUrl = ref(null);
const nuevoIcono = ref(null);

function abrirCrear() {
  tematicaEnEdicion.value = null;
  errorGuardado.value = '';
  Object.assign(formulario, { name: '', description: '', icon: iconosTematicaPanorama[0] });
  iconoActualUrl.value = null;
  nuevoIcono.value = null;
  modalCrear.value?.abrirModal();
}

function abrirEditar(tematica) {
  tematicaEnEdicion.value = tematica.id;
  errorGuardado.value = '';
  Object.assign(formulario, {
    name: tematica.name,
    description: tematica.description || '',
    icon: tematica.icon || iconosTematicaPanorama[0],
  });
  iconoActualUrl.value = tematica.custom_icon || null;
  nuevoIcono.value = null;
  modalCrear.value?.abrirModal();
}

function alSeleccionarIcono(event) {
  nuevoIcono.value = event.target.files?.[0] || null;
}

function extraerMensajeError(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object') return 'Ocurrió un error inesperado.';
  if (Array.isArray(cuerpo.errors)) return cuerpo.errors.join(' ');
  if (cuerpo.detail) return String(cuerpo.detail);
  return Object.entries(cuerpo)
    .map(([campo, mensaje]) => `${campo}: ${Array.isArray(mensaje) ? mensaje.join(' ') : mensaje}`)
    .join(' | ');
}

function construirCuerpoPeticion(esNueva) {
  const datos = esNueva ? { ...formulario, panorama: props.panoramaId } : { ...formulario };

  if (!nuevoIcono.value) {
    return { body: JSON.stringify(datos), esFormData: false };
  }

  const formData = new FormData();
  Object.entries(datos).forEach(([clave, valor]) => {
    if (valor === null || valor === undefined) return;
    formData.append(clave, valor);
  });
  formData.append('custom_icon', nuevoIcono.value);
  return { body: formData, esFormData: true };
}

async function guardarTematica() {
  errorGuardado.value = '';
  guardando.value = true;

  const esNueva = tematicaEnEdicion.value === null;
  const url = esNueva
    ? `${config.public.geonodeApi}/panorama-topics/`
    : `${config.public.geonodeApi}/panorama-topics/${tematicaEnEdicion.value}/`;

  const { body, esFormData } = construirCuerpoPeticion(esNueva);
  const headers = { Authorization: `Bearer ${userData.value?.accessToken}` };
  if (!esFormData) headers['Content-Type'] = 'application/json';

  const respuesta = await gnoxyFetch(url, {
    method: esNueva ? 'POST' : 'PATCH',
    headers,
    body,
  });

  guardando.value = false;

  if (!respuesta.ok) {
    errorGuardado.value = extraerMensajeError(await respuesta.json().catch(() => null));
    return;
  }

  nuevoIcono.value = null;
  modalCrear.value?.cerrarModal();
  await cargarTematicas();
}

async function eliminarTematica(id) {
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panorama-topics/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userData.value?.accessToken}` },
  });
  if (!respuesta.ok) {
    alert('No se pudo eliminar la temática.');
    return;
  }
  await cargarTematicas();
}

function alIniciarArrastre({ dataTransfer }, idArrastre, posicionArrastre) {
  dataTransfer.setData('idArrastre', idArrastre);
  dataTransfer.setData('posicionArrastre', posicionArrastre);
}

async function alSoltar(event, idQuitar, posicionQuitar) {
  event.preventDefault();
  const idArrastre = Number(event.dataTransfer.getData('idArrastre'));
  const posicionArrastre = Number(event.dataTransfer.getData('posicionArrastre'));
  if (idArrastre === idQuitar) return;

  const arrastrada = tematicas.value.find(({ id }) => id === idArrastre);
  const soltada = tematicas.value.find(({ id }) => id === idQuitar);
  [arrastrada.stack_order, soltada.stack_order] = [posicionQuitar, posicionArrastre];

  await gnoxyFetch(`${config.public.geonodeApi}/panorama-topics/bulk-reorder/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userData.value?.accessToken}`,
    },
    body: JSON.stringify([
      { id: arrastrada.id, stack_order: arrastrada.stack_order },
      { id: soltada.id, stack_order: soltada.stack_order },
    ]),
  });
}
</script>

<template>
  <div>
    <div class="flex flex-contenido-separado m-b-4">
      <button class="boton boton-primario" @click="abrirCrear">
        <span class="pictograma-agregar m-r-1" />
        Crear Temática
      </button>

      <NuxtLink class="boton boton-secundario" :to="`/panoramas/${panoramaId}`" target="_blank">
        <span class="pictograma-mapa-generador m-r-1" />
        Visualizar panorama
      </NuxtLink>
    </div>

    <GeocontenidosLoader v-if="estaCargando" />

    <div v-else-if="tematicas.length === 0" class="texto-centrado">
      <p class="h3">No hay temáticas disponibles.</p>
    </div>

    <div v-else class="grid reticula-12 m-b-4">
      <div
        v-for="tematica in [...tematicas].sort((a, b) => a.stack_order - b.stack_order)"
        :key="tematica.id"
        class="columna-8 columna-4-esc"
        @drop="alSoltar($event, tematica.id, tematica.stack_order)"
        @dragover="$event.preventDefault()"
      >
        <div
          class="tarjeta"
          draggable="true"
          @dragstart="alIniciarArrastre($event, tematica.id, tematica.stack_order)"
        >
          <div class="tarjeta-cuerpo flex flex-contenido-separado">
            <p class="tarjeta-titulo">
              <span :class="`pictograma-${tematica.icon}`" class="m-r-1" />
              {{ tematica.name }}
            </p>

            <span class="pictograma-mover pictograma-grande" />
          </div>

          <div class="tarjeta-pie flex m-t-3">
            <button class="boton boton-chico boton-secundario" @click="abrirEditar(tematica)">
              <span class="pictograma-editar m-r-1" />
              Editar
            </button>

            <button
              class="boton boton-chico boton-secundario"
              type="button"
              @click="abrirModalCapas(tematica.id)"
            >
              <span class="pictograma-agregar m-r-1" />
              Agregar/Editar capas
            </button>

            <button
              class="boton boton-chico boton-secundario"
              type="button"
              title="Administrar las ubicaciones de esta temática"
              @click="abrirSelectorCapa(tematica.id, 'marcadores')"
            >
              <span class="pictograma-mapa-generador m-r-1" aria-hidden="true" />
              Administrar ubicaciones
            </button>

            <button
              class="boton boton-chico boton-secundario"
              type="button"
              @click="abrirSelectorCapa(tematica.id, 'narrativa')"
            >
              <span class="pictograma-escribir m-r-1" />
              Agregar/Editar narrativa
            </button>

            <button class="boton boton-chico boton-primario" @click="eliminarTematica(tematica.id)">
              <span class="pictograma-eliminar m-r-1" />
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>

    <ClientOnly>
      <SisdaiModal ref="modalCrear">
        <template #encabezado>
          <h2 class="m-t-0">{{ tematicaEnEdicion ? 'Editar' : 'Crear' }} temática</h2>
        </template>

        <template #cuerpo>
          <form @submit.prevent="guardarTematica">
            <p v-if="errorGuardado" class="texto-color-error m-b-4">{{ errorGuardado }}</p>

            <div class="m-b-4">
              <label for="nombre-tematica">Nombre *</label>
              <input id="nombre-tematica" v-model="formulario.name" type="text" required />
            </div>

            <div class="m-b-4">
              <label for="descripcion-tematica">Descripción</label>
              <textarea id="descripcion-tematica" v-model="formulario.description" rows="3" />
            </div>

            <div class="m-b-4">
              <label for="icono-tematica">Ícono</label>
              <GeocontenidosSelectorIcono
                id="icono-tematica"
                v-model="formulario.icon"
                por-nombre
              />
            </div>

            <div class="m-b-4">
              <label for="icono-personalizado-tematica">Ícono personalizado (opcional)</label>
              <input
                id="icono-personalizado-tematica"
                type="file"
                accept="image/*"
                @change="alSeleccionarIcono"
              />
              <p v-if="iconoActualUrl && !nuevoIcono" class="formulario-ayuda">
                <img :src="iconoActualUrl" alt="" class="tematicas-panel__icono-actual" />
                Ya hay un ícono personalizado cargado. Selecciona un archivo para reemplazarlo o usa
                el selector de arriba para volver al set de pictogramas.
              </p>
              <p v-if="nuevoIcono" class="formulario-ayuda">
                Nuevo archivo seleccionado: {{ nuevoIcono.name }}
              </p>
            </div>

            <div class="flex flex-contenido-final">
              <button
                type="button"
                class="boton boton-secundario"
                @click="modalCrear?.cerrarModal()"
              >
                Cancelar
              </button>
              <input type="submit" class="boton-primario" value="Guardar" :disabled="guardando" />
            </div>
          </form>
        </template>
      </SisdaiModal>
    </ClientOnly>

    <CapasModalAgregar
      v-model:abierto="abiertoCapas"
      :adaptador="adaptadorCapas"
      :opciones="{
        contexto: 'tematica',
        titulo: 'Agregar/Editar capas',
        mostrarEstilo: true,
        mostrarMarcadores: true,
        mostrarNarrativas: true,
        nombreCategoria: (c) => categoriesNamesInSpanish[c.identifier] ?? c.identifier,
      }"
      @guardado="cargarTematicas"
      @abrir-marcadores="abrirMarcadores"
      @abrir-narrativa="abrirNarrativa"
    />

    <GeocontenidosPanoramasMarcadoresModal
      v-if="capaMarcadores"
      ref="modalMarcadores"
      :capa="capaMarcadores"
    />

    <GeocontenidosPanoramasNarrativaModal
      v-if="capaNarrativa"
      ref="modalNarrativa"
      :capa="capaNarrativa"
    />

    <GeocontenidosPanoramasSelectorCapaModal
      ref="modalSelectorCapa"
      :capas="capasSelector"
      :titulo="
        modoSelector === 'marcadores'
          ? 'Elige la capa para editar sus marcadores'
          : 'Elige la capa para editar su narrativa'
      "
      @elegir="elegirCapaSelector"
    />
  </div>
</template>

<style lang="scss" scoped>
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

.tematicas-panel__icono-actual {
  width: 20px;
  height: 20px;
  object-fit: contain;
  vertical-align: middle;
  margin-right: 4px;
}
</style>
