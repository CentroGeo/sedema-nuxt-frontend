<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import { iconosTematicaPanorama } from '~/utils/geocontenidos/basemapsPanorama';

const props = defineProps({
  panoramaId: { type: [String, Number], required: true },
});

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { data: userData } = useAuth();

const tematicas = ref([]);
const estaCargando = ref(false);

async function cargarTematicas() {
  estaCargando.value = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panoramas/${props.panoramaId}/`);
  const data = await respuesta.json();
  tematicas.value = data.text_topics || [];
  estaCargando.value = false;
}
cargarTematicas();

const modalCrear = ref(null);
const tematicaEnEdicion = ref(null);
const errorGuardado = ref('');
const guardando = ref(false);
const formulario = reactive({ name: '', icon: iconosTematicaPanorama[0] });
const iconoActualUrl = ref(null);
const nuevoIcono = ref(null);

function abrirCrear() {
  tematicaEnEdicion.value = null;
  errorGuardado.value = '';
  Object.assign(formulario, { name: '', icon: iconosTematicaPanorama[0] });
  iconoActualUrl.value = null;
  nuevoIcono.value = null;
  modalCrear.value?.abrirModal();
}

function abrirEditar(tematica) {
  tematicaEnEdicion.value = tematica.id;
  errorGuardado.value = '';
  Object.assign(formulario, {
    name: tematica.name,
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
    ? `${config.public.geonodeApi}/panorama-text-topics/`
    : `${config.public.geonodeApi}/panorama-text-topics/${tematicaEnEdicion.value}/`;

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
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panorama-text-topics/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userData.value?.accessToken}` },
  });
  if (!respuesta.ok) {
    alert('No se pudo eliminar la temática de texto.');
    return;
  }
  await cargarTematicas();
}

const modalContenidos = ref(null);
const tematicaContenidos = ref(null);

function abrirContenidos(tematica) {
  tematicaContenidos.value = tematica;
  nextTick(() => modalContenidos.value?.abrir());
}

async function alCerrarContenidos() {
  await cargarTematicas();
}
</script>

<template>
  <div>
    <div class="flex flex-contenido-separado m-b-4">
      <button class="boton boton-primario" @click="abrirCrear">
        <span class="pictograma-agregar m-r-1" />
        Crear Temática de Texto
      </button>
    </div>

    <GeocontenidosLoader v-if="estaCargando" />

    <div v-else-if="tematicas.length === 0" class="texto-centrado">
      <p class="h3">No hay temáticas de texto disponibles.</p>
    </div>

    <div v-else class="grid reticula-12 m-b-4">
      <div
        v-for="tematica in [...tematicas].sort((a, b) => a.stack_order - b.stack_order)"
        :key="tematica.id"
        class="columna-8 columna-4-esc"
      >
        <div class="tarjeta">
          <div class="tarjeta-cuerpo">
            <p class="tarjeta-titulo">
              <span :class="`pictograma-${tematica.icon}`" class="m-r-1" />
              {{ tematica.name }}
            </p>
            <p class="tarjeta-etiqueta m-0">{{ (tematica.items || []).length }} contenido(s)</p>
          </div>

          <div class="tarjeta-pie flex m-t-3">
            <button class="boton boton-chico boton-secundario" @click="abrirEditar(tematica)">
              <span class="pictograma-editar m-r-1" />
              Editar
            </button>

            <button class="boton boton-chico boton-secundario" @click="abrirContenidos(tematica)">
              <span class="pictograma-agregar m-r-1" />
              Agregar/Editar contenidos
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
          <h2 class="m-t-0">{{ tematicaEnEdicion ? 'Editar' : 'Crear' }} temática de texto</h2>
        </template>

        <template #cuerpo>
          <form @submit.prevent="guardarTematica">
            <p v-if="errorGuardado" class="texto-color-error m-b-4">{{ errorGuardado }}</p>

            <div class="m-b-4">
              <label for="nombre-tematica-texto">Nombre *</label>
              <input id="nombre-tematica-texto" v-model="formulario.name" type="text" required />
            </div>

            <div class="m-b-4">
              <label for="icono-tematica-texto">Ícono</label>
              <GeocontenidosSelectorIcono
                id="icono-tematica-texto"
                v-model="formulario.icon"
                por-nombre
              />
            </div>

            <div class="m-b-4">
              <label for="icono-personalizado-tematica-texto">Ícono personalizado (opcional)</label>
              <input
                id="icono-personalizado-tematica-texto"
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

      <GeocontenidosPanoramasContenidosTextoModal
        v-if="tematicaContenidos"
        ref="modalContenidos"
        :tematica="tematicaContenidos"
        @cerrar="alCerrarContenidos"
      />
    </ClientOnly>
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
    button {
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
