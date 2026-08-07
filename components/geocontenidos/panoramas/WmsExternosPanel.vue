<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const props = defineProps({
  panoramaId: { type: [String, Number], required: true },
});

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { data: userData } = useAuth();

const wmsExternos = ref([]);
const estaCargando = ref(false);

async function cargarWmsExternos() {
  estaCargando.value = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panoramas/${props.panoramaId}/`);
  const data = await respuesta.json();
  wmsExternos.value = data.external_wms || [];
  estaCargando.value = false;
}
cargarWmsExternos();

const modal = ref(null);
const enEdicionId = ref(null);
const errorGuardado = ref('');
const guardando = ref(false);
const formulario = reactive({
  name: '',
  url: '',
  attribution: '',
  wms_or_tile: 'wms',
  wms_layers: '',
  at_start: false,
});

function abrirCrear() {
  enEdicionId.value = null;
  errorGuardado.value = '';
  Object.assign(formulario, {
    name: '',
    url: '',
    attribution: '',
    wms_or_tile: 'wms',
    wms_layers: '',
    at_start: false,
  });
  modal.value?.abrirModal();
}

function abrirEditar(item) {
  enEdicionId.value = item.id;
  errorGuardado.value = '';
  Object.assign(formulario, {
    name: item.name,
    url: item.url,
    attribution: item.attribution || '',
    wms_or_tile: item.wms_or_tile,
    wms_layers: item.wms_layers || '',
    at_start: item.at_start,
  });
  modal.value?.abrirModal();
}

function extraerMensajeError(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object') return 'Ocurrió un error inesperado.';
  if (Array.isArray(cuerpo.errors)) return cuerpo.errors.join(' ');
  if (cuerpo.detail) return String(cuerpo.detail);
  return Object.entries(cuerpo)
    .map(([campo, mensaje]) => `${campo}: ${Array.isArray(mensaje) ? mensaje.join(' ') : mensaje}`)
    .join(' | ');
}

async function guardar() {
  errorGuardado.value = '';
  guardando.value = true;

  const esNuevo = enEdicionId.value === null;
  const url = esNuevo
    ? `${config.public.geonodeApi}/panorama-external-wms/`
    : `${config.public.geonodeApi}/panorama-external-wms/${enEdicionId.value}/`;

  const respuesta = await gnoxyFetch(url, {
    method: esNuevo ? 'POST' : 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userData.value?.accessToken}`,
    },
    body: JSON.stringify(esNuevo ? { ...formulario, panorama: props.panoramaId } : formulario),
  });

  guardando.value = false;

  if (!respuesta.ok) {
    errorGuardado.value = extraerMensajeError(await respuesta.json().catch(() => null));
    return;
  }

  modal.value?.cerrarModal();
  await cargarWmsExternos();
}

async function eliminar(id) {
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panorama-external-wms/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userData.value?.accessToken}` },
  });
  if (!respuesta.ok) {
    alert('No se pudo eliminar el WMS externo.');
    return;
  }
  await cargarWmsExternos();
}
</script>

<template>
  <div>
    <div class="flex flex-contenido-separado m-b-4">
      <button class="boton boton-primario" @click="abrirCrear">
        <span class="pictograma-agregar m-r-1" />
        Agregar WMS Externo
      </button>
    </div>

    <GeocontenidosLoader v-if="estaCargando" />

    <div v-else-if="wmsExternos.length === 0" class="texto-centrado">
      <p class="h3">No hay WMS externos configurados.</p>
    </div>

    <div v-else class="grid reticula-12">
      <div v-for="item in wmsExternos" :key="item.id" class="columna-8 columna-4-esc">
        <div class="tarjeta">
          <div class="tarjeta-cuerpo">
            <p class="tarjeta-titulo">{{ item.name }}</p>
            <p class="tarjeta-etiqueta">{{ item.url }}</p>
            <p class="tarjeta-etiqueta m-0">
              {{ item.wms_or_tile === 'wms' ? 'WMS' : 'Tile' }} ·
              {{ item.at_start ? 'Visible al inicio' : 'Oculto al inicio' }}
            </p>
          </div>

          <div class="tarjeta-pie flex">
            <button class="boton boton-chico boton-secundario" @click="abrirEditar(item)">
              <span class="pictograma-editar m-r-1" />
              Editar
            </button>

            <button class="boton boton-chico boton-primario" @click="eliminar(item.id)">
              <span class="pictograma-eliminar m-r-1" />
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>

    <ClientOnly>
      <SisdaiModal ref="modal">
        <template #encabezado>
          <h2 class="m-t-0">{{ enEdicionId ? 'Editar' : 'Agregar' }} WMS Externo</h2>
        </template>

        <template #cuerpo>
          <form @submit.prevent="guardar">
            <p v-if="errorGuardado" class="texto-color-error m-b-4">{{ errorGuardado }}</p>

            <div class="m-b-4">
              <label for="wms-nombre">Nombre</label>
              <input id="wms-nombre" v-model="formulario.name" type="text" required />
            </div>

            <div class="m-b-4">
              <label for="wms-url">URL del servicio</label>
              <input id="wms-url" v-model="formulario.url" type="text" required />
            </div>

            <div class="m-b-4">
              <label for="wms-attribution">Atribución</label>
              <input id="wms-attribution" v-model="formulario.attribution" type="text" />
            </div>

            <div class="m-b-4">
              <label for="wms-tipo">Tipo</label>
              <select id="wms-tipo" v-model="formulario.wms_or_tile">
                <option value="wms">WMS</option>
                <option value="tile">Tile (XYZ)</option>
              </select>
            </div>

            <div v-if="formulario.wms_or_tile === 'wms'" class="m-b-4">
              <label for="wms-layers">Nombre(s) de capa WMS</label>
              <input id="wms-layers" v-model="formulario.wms_layers" type="text" />
            </div>

            <div class="m-b-4">
              <input id="wms-inicio" v-model="formulario.at_start" type="checkbox" />
              <label for="wms-inicio">Mostrar al inicio</label>
            </div>

            <div class="flex flex-contenido-final">
              <button type="button" class="boton boton-secundario" @click="modal?.cerrarModal()">
                Cancelar
              </button>
              <input type="submit" class="boton-primario" value="Guardar" :disabled="guardando" />
            </div>
          </form>
        </template>
      </SisdaiModal>
    </ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
.grid.reticula-12 {
  grid-template-columns: repeat(12, 1fr);
}
.tarjeta-cuerpo {
  background-color: var(--color-primario-4);
  color: var(--texto-inverso);
}
</style>
