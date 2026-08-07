<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const props = defineProps({
  tematica: { type: Object, required: true },
});
const emit = defineEmits(['cerrar']);

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { data: userData } = useAuth();

const modal = ref(null);
const cargando = ref(false);
const items = ref([]);

async function cargarItems() {
  cargando.value = true;
  const respuesta = await gnoxyFetch(
    `${config.public.geonodeApi}/panorama-text-topics/${props.tematica.id}/`
  );
  const data = await respuesta.json();
  items.value = data.items || [];
  cargando.value = false;
}

function abrir() {
  cancelarSeleccion();
  cargarItems();
  modal.value?.abrirModal();
}

function cerrar() {
  modal.value?.cerrarModal();
  emit('cerrar');
}

defineExpose({ abrir });

const formulario = reactive({ id: null, name: '', contents: '' });
const guardando = ref(false);
const errorGuardado = ref('');

function cancelarSeleccion() {
  Object.assign(formulario, { id: null, name: '', contents: '' });
  errorGuardado.value = '';
}

function seleccionarItem(item) {
  Object.assign(formulario, { id: item.id, name: item.name, contents: item.contents || '' });
  errorGuardado.value = '';
}

function extraerMensajeError(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object') return 'Ocurrió un error inesperado.';
  if (Array.isArray(cuerpo.errors)) return cuerpo.errors.join(' ');
  if (cuerpo.detail) return String(cuerpo.detail);
  return Object.entries(cuerpo)
    .map(([campo, mensaje]) => `${campo}: ${Array.isArray(mensaje) ? mensaje.join(' ') : mensaje}`)
    .join(' | ');
}

async function guardarItem() {
  errorGuardado.value = '';
  guardando.value = true;

  const esNuevo = formulario.id === null;
  const url = esNuevo
    ? `${config.public.geonodeApi}/panorama-text-topic-items/`
    : `${config.public.geonodeApi}/panorama-text-topic-items/${formulario.id}/`;

  const cuerpo = esNuevo
    ? { text_topic: props.tematica.id, name: formulario.name, contents: formulario.contents }
    : { name: formulario.name, contents: formulario.contents };

  const respuesta = await gnoxyFetch(url, {
    method: esNuevo ? 'POST' : 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userData.value?.accessToken}`,
    },
    body: JSON.stringify(cuerpo),
  });

  guardando.value = false;

  if (!respuesta.ok) {
    errorGuardado.value = extraerMensajeError(await respuesta.json().catch(() => null));
    return;
  }

  cancelarSeleccion();
  await cargarItems();
}

async function eliminarItem(id) {
  guardando.value = true;
  const respuesta = await gnoxyFetch(
    `${config.public.geonodeApi}/panorama-text-topic-items/${id}/`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userData.value?.accessToken}` },
    }
  );
  guardando.value = false;

  if (!respuesta.ok) {
    alert('No se pudo eliminar el contenido.');
    return;
  }

  if (formulario.id === id) cancelarSeleccion();
  await cargarItems();
}
</script>

<template>
  <SisdaiModal ref="modal" tamanio-modal="modal-grande">
    <template #encabezado>
      <h2 class="m-t-0">Contenidos de: {{ tematica.name }}</h2>
    </template>

    <template #cuerpo>
      <div class="flex">
        <div class="columna-8">
          <h3>{{ formulario.id ? 'Editar contenido' : 'Nuevo contenido' }}</h3>

          <p v-if="errorGuardado" class="texto-color-error">{{ errorGuardado }}</p>

          <form @submit.prevent="guardarItem">
            <div class="m-b-4">
              <label for="item-nombre">Nombre</label>
              <input id="item-nombre" v-model="formulario.name" type="text" required />
            </div>

            <div class="m-b-4">
              <label for="item-contenido">Contenido</label>
              <textarea id="item-contenido" v-model="formulario.contents" rows="6" />
            </div>

            <div class="flex flex-contenido-final">
              <button
                v-if="formulario.id"
                type="button"
                class="boton boton-secundario"
                @click="cancelarSeleccion"
              >
                Cancelar edición
              </button>
              <input
                type="submit"
                class="boton-primario"
                :value="formulario.id ? 'Guardar cambios' : 'Agregar contenido'"
                :disabled="guardando"
              />
            </div>
          </form>
        </div>

        <div class="columna-6">
          <h3>Contenidos existentes</h3>

          <GeocontenidosLoader v-if="cargando" />

          <p v-else-if="items.length === 0" class="texto-tamanio-2">
            Esta temática no tiene contenidos.
          </p>

          <ul v-else class="lista-sin-estilo">
            <li
              v-for="item in items"
              :key="item.id"
              class="fondo-color-acento borde-redondeado-8 p-2 m-b-2 flex flex-contenido-separado"
            >
              <button
                type="button"
                class="boton-sin-contenedor-secundario"
                style="text-align: left"
                @click="seleccionarItem(item)"
              >
                {{ item.name }}
              </button>

              <button
                aria-label="Eliminar contenido"
                title="Eliminar contenido"
                type="button"
                class="boton-pictograma boton-sin-contenedor-secundario"
                @click="eliminarItem(item.id)"
              >
                <span class="pictograma-eliminar" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="flex flex-contenido-final m-t-4">
        <button type="button" class="boton boton-secundario" @click="cerrar">Cerrar</button>
      </div>
    </template>
  </SisdaiModal>
</template>
