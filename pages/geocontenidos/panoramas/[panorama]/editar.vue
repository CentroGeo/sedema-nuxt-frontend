<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import { SisdaiCapaXyz, SisdaiMapa } from '@centrogeomx/sisdai-mapas';
import { basemapsPanorama, fuenteBasemap } from '~/utils/geocontenidos/basemapsPanorama';

definePageMeta({ middleware: 'auth' });

const config = useRuntimeConfig();
const { data: userData } = useAuth();
const { gnoxyFetch } = useGnoxyUrl();
const { panorama } = useRoute().params;

const esNuevo = computed(() => panorama === 'nuevo');

const formulario = reactive({
  name: '',
  is_public: false,
  template_style: 'dark',
  icon_title: false,
  description: '',
  config: 'gray',
  bbox_x0: null,
  bbox_y0: null,
  bbox_x1: null,
  bbox_y1: null,
  landing_info: false,
  extra_info: '',
  template_use: 'light',
  limited_zoom: false,
  header_title: '',
  header_color: '#1a1a2e',
  header_title_color: '#ffffff',
});

const pestanas = computed(() =>
  [
    { id: 'configuracion', nombre: 'Configuración', disponible: true },
    { id: 'detalles', nombre: 'Detalles', disponible: true },
    { id: 'encabezado', nombre: 'Encabezado', disponible: formulario.template_use === 'normal' },
    { id: 'tematicas', nombre: 'Temáticas', disponible: !esNuevo.value },
    { id: 'tematicas-texto', nombre: 'Temáticas de Texto', disponible: !esNuevo.value },
    { id: 'wms-externos', nombre: 'WMS Externos', disponible: !esNuevo.value },
  ].filter((p) => p.disponible)
);
const tabInicial = useRoute().query.tab;
const pestanaActiva = ref(
  typeof tabInicial === 'string' && pestanas.value.some((p) => p.id === tabInicial)
    ? tabInicial
    : 'configuracion'
);

const modalStatus = ref(null);
const estatusAlGuardar = reactive({
  cargando: false,
  estado: undefined,
  mensaje: '',
  textoCargando: '',
});

const logoActualUrl = ref(null);
const nuevoLogo = ref(null);

const vista = ref({ centro: [-103.5, 23.6], acercamiento: 5 });

async function cargarDatosPanorama() {
  if (esNuevo.value) return;

  estatusAlGuardar.cargando = true;
  estatusAlGuardar.textoCargando = 'Cargando panorama...';
  modalStatus.value?.abrirModal();

  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panoramas/${panorama}/`);
  const data = await respuesta.json();

  formulario.name = data.name;
  formulario.is_public = data.is_public;
  formulario.template_style = data.template_style;
  formulario.icon_title = data.icon_title;
  formulario.description = data.description || '';
  formulario.config = data.config;
  formulario.bbox_x0 = data.bbox_x0;
  formulario.bbox_y0 = data.bbox_y0;
  formulario.bbox_x1 = data.bbox_x1;
  formulario.bbox_y1 = data.bbox_y1;
  formulario.landing_info = data.landing_info;
  formulario.extra_info = data.extra_info || '';
  formulario.template_use = data.template_use;
  formulario.limited_zoom = data.limited_zoom;
  formulario.header_title = data.header_title || '';
  formulario.header_color = data.header_color || '#1a1a2e';
  formulario.header_title_color = data.header_title_color || '#ffffff';
  logoActualUrl.value = data.header_logo || null;

  if (data.bbox_x0 !== null && data.bbox_x0 !== undefined) {
    vista.value = { extension: `${data.bbox_x0},${data.bbox_y0},${data.bbox_x1},${data.bbox_y1}` };
  }

  estatusAlGuardar.cargando = false;
  modalStatus.value?.cerrarModal();
}
cargarDatosPanorama();

function alMoverVista({ vista: vistaOl }) {
  // El backend guarda el bbox en DecimalField(decimal_places=10); los floats crudos de OL
  // suelen traer mas decimales de los permitidos y el guardado truena con un 400.
  const [x0, y0, x1, y1] = vistaOl.calculateExtent().map((n) => Number(n.toFixed(6)));
  formulario.bbox_x0 = x0;
  formulario.bbox_y0 = y0;
  formulario.bbox_x1 = x1;
  formulario.bbox_y1 = y1;
}

function alSeleccionarLogo(event) {
  nuevoLogo.value = event.target.files?.[0] || null;
}

function construirCuerpoPeticion() {
  if (!nuevoLogo.value) {
    return { body: JSON.stringify(formulario), esFormData: false };
  }

  const formData = new FormData();
  Object.entries(formulario).forEach(([clave, valor]) => {
    if (valor === null || valor === undefined) return;
    formData.append(clave, valor);
  });
  formData.append('header_logo', nuevoLogo.value);
  return { body: formData, esFormData: true };
}

async function guardarCambios() {
  modalStatus.value?.abrirModal();
  estatusAlGuardar.cargando = true;
  estatusAlGuardar.textoCargando = 'Guardando...';

  const url = esNuevo.value
    ? `${config.public.geonodeApi}/panoramas/`
    : `${config.public.geonodeApi}/panoramas/${panorama}/`;

  const { body, esFormData } = construirCuerpoPeticion();
  const headers = { Authorization: `Bearer ${userData.value?.accessToken}` };
  if (!esFormData) headers['Content-Type'] = 'application/json';

  const respuesta = await gnoxyFetch(url, {
    method: esNuevo.value ? 'POST' : 'PATCH',
    headers,
    body,
  });

  if (!respuesta.ok) {
    estatusAlGuardar.cargando = false;
    estatusAlGuardar.estado = false;
    estatusAlGuardar.mensaje = 'Ocurrió un error al guardar el panorama.';
    return;
  }

  const data = await respuesta.json();
  nuevoLogo.value = null;

  estatusAlGuardar.cargando = false;
  estatusAlGuardar.estado = true;
  setTimeout(() => {
    modalStatus.value?.cerrarModal();
    if (esNuevo.value) {
      navigateTo(`/geocontenidos/panoramas/${data.id}/editar`);
    }
  }, 1200);
}
</script>

<template>
  <div class="editor-panorama">
    <GeocontenidosTituloVolver volver="/panoramas" titulo="Edición del panorama" />

    <div class="editor-panorama__cuerpo flex">
      <nav class="editor-panorama__menu">
        <button
          v-for="pestana in pestanas"
          :key="pestana.id"
          class="editor-panorama__item"
          :class="{ activo: pestanaActiva === pestana.id }"
          @click="pestanaActiva = pestana.id"
        >
          {{ pestana.nombre }}
        </button>
      </nav>

      <div class="editor-panorama__contenido">
        <form
          v-show="['configuracion', 'detalles', 'encabezado'].includes(pestanaActiva)"
          @submit.prevent="guardarCambios"
        >
          <div v-show="pestanaActiva === 'configuracion'">
            <h2>Configuración principal del panorama</h2>

            <div class="m-b-4">
              <label for="nombre">Nombre</label>
              <input id="nombre" v-model="formulario.name" type="text" required />
            </div>

            <div class="m-b-4">
              <input id="casilla-publico" v-model="formulario.is_public" type="checkbox" />
              <label for="casilla-publico">Hacer público este panorama</label>
            </div>

            <div class="m-b-4">
              <label for="estilo">Estilo del panorama</label>
              <select id="estilo" v-model="formulario.template_style">
                <option value="light">Claro</option>
                <option value="dark">Obscuro</option>
              </select>
            </div>

            <div class="m-b-4">
              <input id="casilla-icono-titulo" v-model="formulario.icon_title" type="checkbox" />
              <label for="casilla-icono-titulo">
                Incluir el nombre de la temática junto con su ícono
              </label>
            </div>

            <div class="m-b-4">
              <label for="descripcion"
                >Descripción ({{ formulario.description.length }} / 400)</label
              >
              <textarea
                id="descripcion"
                v-model="formulario.description"
                rows="4"
                :maxlength="400"
              />
            </div>
          </div>

          <div v-show="pestanaActiva === 'detalles'">
            <h2>Detalles</h2>

            <div class="m-b-4">
              <label for="diseno">Diseño del panorama</label>
              <select id="diseno" v-model="formulario.template_use">
                <option value="light">Sólo mapa</option>
                <option value="normal">Mapa y encabezado</option>
              </select>
            </div>

            <div class="m-b-4">
              <input id="casilla-zoom" v-model="formulario.limited_zoom" type="checkbox" />
              <label for="casilla-zoom">Restringir zoom</label>
            </div>

            <div class="m-b-4">
              <input
                id="casilla-info-adicional"
                v-model="formulario.landing_info"
                type="checkbox"
              />
              <label for="casilla-info-adicional">Mostrar información adicional al entrar</label>
            </div>

            <div v-if="formulario.landing_info" class="m-b-4">
              <label for="info-adicional">Información adicional</label>
              <textarea id="info-adicional" v-model="formulario.extra_info" rows="4" />
            </div>

            <h3>Mapa base y vista inicial</h3>
            <p>
              Elige el mapa base y mueve/acerca el mapa para fijar la vista con la que abrirá el
              panorama.
            </p>

            <div class="m-b-4">
              <label for="mapa-base">Mapa base</label>
              <select id="mapa-base" v-model="formulario.config">
                <option v-for="basemap in basemapsPanorama" :key="basemap.id" :value="basemap.id">
                  {{ basemap.label }}
                </option>
              </select>
            </div>

            <ClientOnly>
              <SisdaiMapa
                class="gema mapa-vista-inicial"
                :vista="vista"
                @al-mover-vista="alMoverVista"
              >
                <SisdaiCapaXyz
                  :key="formulario.config"
                  :posicion="0"
                  :fuente="fuenteBasemap(formulario.config)"
                />
              </SisdaiMapa>
            </ClientOnly>
          </div>

          <div v-show="pestanaActiva === 'encabezado'">
            <h2>Encabezado</h2>
            <p>Se muestra arriba del mapa cuando el diseño es "Mapa y encabezado".</p>

            <div class="m-b-4">
              <label for="header-titulo">Título del encabezado</label>
              <input id="header-titulo" v-model="formulario.header_title" type="text" />
            </div>

            <div class="flex flex-contenido-separado m-b-4">
              <div>
                <label for="header-color">Color de fondo</label>
                <input id="header-color" v-model="formulario.header_color" type="color" />
              </div>

              <div>
                <label for="header-color-titulo">Color del texto</label>
                <input
                  id="header-color-titulo"
                  v-model="formulario.header_title_color"
                  type="color"
                />
              </div>
            </div>

            <div class="m-b-4">
              <label for="header-logo">Logo</label>
              <input id="header-logo" type="file" accept="image/*" @change="alSeleccionarLogo" />
              <p v-if="logoActualUrl && !nuevoLogo" class="formulario-ayuda">
                Ya hay un logo cargado. Selecciona un archivo para reemplazarlo.
              </p>
              <p v-if="nuevoLogo" class="formulario-ayuda">
                Nuevo archivo seleccionado: {{ nuevoLogo.name }}
              </p>
            </div>

            <div
              class="p-3 borde-redondeado-8 m-b-4"
              :style="{
                backgroundColor: formulario.header_color,
                color: formulario.header_title_color,
              }"
            >
              <strong>{{ formulario.header_title || 'Vista previa del título' }}</strong>
            </div>
          </div>

          <input
            type="submit"
            class="boton-primario m-t-4"
            value="Guardar"
            style="margin-left: auto; display: block"
          />
        </form>

        <GeocontenidosPanoramasTematicasPanel
          v-if="pestanaActiva === 'tematicas'"
          :panorama-id="panorama"
        />

        <GeocontenidosPanoramasTematicasTextoPanel
          v-if="pestanaActiva === 'tematicas-texto'"
          :panorama-id="panorama"
        />

        <GeocontenidosPanoramasWmsExternosPanel
          v-if="pestanaActiva === 'wms-externos'"
          :panorama-id="panorama"
        />
      </div>
    </div>

    <ClientOnly>
      <SisdaiModal ref="modalStatus">
        <template #encabezado>
          <span v-if="estatusAlGuardar.cargando" />
          <h2 v-else>{{ estatusAlGuardar.estado ? 'Guardado con éxito' : 'Error' }}</h2>
        </template>

        <template #cuerpo>
          <GeocontenidosLoader
            v-if="estatusAlGuardar.cargando"
            :mensaje="estatusAlGuardar.textoCargando"
          />
          <p
            v-else-if="estatusAlGuardar.estado === false"
            class="alineacion-centrada"
            v-text="estatusAlGuardar.mensaje"
          />
          <p v-else class="alineacion-centrada">
            <span class="pictograma-aprobado pictograma-grande" />
          </p>
        </template>
      </SisdaiModal>
    </ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
.editor-panorama {
  &__cuerpo {
    gap: 0;
    align-items: flex-start;
  }

  &__menu {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--color-secundario-4);
  }

  &__item {
    text-align: left;
    padding: 12px 16px;
    background: none;
    color: inherit;
    border: none;
    cursor: pointer;
    border-left: 3px solid transparent;

    &.activo {
      background-color: var(--color-primario-4);
      border-left-color: var(--color-primario-1);
      font-weight: bold;
    }
  }

  &__contenido {
    flex: 1;
    padding: 0 24px;
    min-width: 0;
  }
}

.alineacion-centrada {
  display: flex !important;
  justify-content: center !important;
  text-align: center !important;
  width: 100% !important;
}

.mapa-vista-inicial {
  height: 400px;
  width: 100%;
}
</style>
