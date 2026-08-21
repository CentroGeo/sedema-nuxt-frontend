<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import { SisdaiCapaXyz, SisdaiMapa } from '@centrogeomx/sisdai-mapas';
import { basemapsPanorama, fuenteBasemap } from '~/utils/geocontenidos/basemapsPanorama';

definePageMeta({ middleware: 'auth' });

const config = useRuntimeConfig();
const { data: userData } = useAuth();
const { gnoxyFetch, gnoxyUrl } = useGnoxyUrl();
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
  header_height: 60,
});

const logos = ref([]);

function normalizarLogosServidor(logosServidor = [], logoLegacyUrl = '') {
  if (Array.isArray(logosServidor) && logosServidor.length > 0) {
    return logosServidor.map((logo, index) => ({
      key: `topbar-saved-${logo.id || index + 1}`,
      id: logo.id || null,
      icon: logo.icon || '',
      icon_url: logo.icon_url || '',
      icon_link: logo.icon_link || '',
      alt_text: logo.alt_text || '',
      stack_order: logo.stack_order || index + 1,
      archivo: null,
      previewUrl: '',
      esNuevo: false,
    }));
  }

  if (logoLegacyUrl) {
    return [
      {
        key: 'topbar-legacy-1',
        id: null,
        icon: '',
        icon_url: logoLegacyUrl,
        icon_link: '',
        alt_text: '',
        stack_order: 1,
        archivo: null,
        previewUrl: '',
        esNuevo: false,
      },
    ];
  }

  return [];
}

function obtenerImagen(logo) {
  if (logo.previewUrl) return logo.previewUrl;
  if (logo.icon_url) return logo.icon_url;
  if (logo.icon) return gnoxyUrl(logo.icon);
  return '';
}

const pestanas = computed(() =>
  [
    { id: 'configuracion', nombre: 'Configuración', icono: 'pictograma-editar', disponible: true },
    { id: 'detalles', nombre: 'Detalles', icono: 'pictograma-documento', disponible: true },
    {
      id: 'encabezado',
      nombre: 'Encabezado',
      icono: 'pictograma-visualizador',
      disponible: formulario.template_use === 'normal',
    },
    {
      id: 'tematicas',
      nombre: 'Temáticas',
      icono: 'pictograma-mapa-generador',
      disponible: !esNuevo.value,
    },
    {
      id: 'tematicas-texto',
      nombre: 'Temáticas de Texto',
      icono: 'pictograma-escribir',
      disponible: !esNuevo.value,
    },
    {
      id: 'wms-externos',
      nombre: 'WMS Externos',
      icono: 'pictograma-enlace-externo',
      disponible: !esNuevo.value,
    },
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
  formulario.header_height = data.header_height || 60;
  logos.value = normalizarLogosServidor(data.header_logos, data.header_logo);

  if (data.bbox_x0 !== null && data.bbox_x0 !== undefined) {
    vista.value = { extension: `${data.bbox_x0},${data.bbox_y0},${data.bbox_x1},${data.bbox_y1}` };
  }

  estatusAlGuardar.cargando = false;
  modalStatus.value?.cerrarModal();
}
cargarDatosPanorama();

function alMoverVista({ vista: vistaOl }) {
  const [x0, y0, x1, y1] = vistaOl.calculateExtent().map((n) => Number(n.toFixed(6)));
  formulario.bbox_x0 = x0;
  formulario.bbox_y0 = y0;
  formulario.bbox_x1 = x1;
  formulario.bbox_y1 = y1;
}

function construirFormDataHeader() {
  const formData = new FormData();
  const manifest = [];

  logos.value.forEach((logo, index) => {
    const datosLogo = {
      icon_url: logo.icon_url || '',
      icon_link: (logo.icon_link || '').trim(),
      alt_text: (logo.alt_text || '').trim(),
    };

    if (logo.id) {
      manifest.push({ id: logo.id, ...datosLogo });
      return;
    }

    if (logo.archivo) {
      const fileKey = `logo_file_${index}`;
      formData.append(fileKey, logo.archivo, logo.archivo.name);
      manifest.push({ file_key: fileKey, ...datosLogo });
      return;
    }

    if (logo.icon_url) {
      manifest.push(datosLogo);
    }
  });

  formData.append(
    'configuration',
    JSON.stringify({
      header_title: formulario.header_title,
      header_color: formulario.header_color,
      header_title_color: formulario.header_title_color,
      header_height: formulario.header_height,
    })
  );
  formData.append('manifest', JSON.stringify(manifest));

  return formData;
}

async function guardarCambios() {
  const altura = Number(formulario.header_height);
  if (!Number.isInteger(altura) || altura < 32 || altura > 120) {
    formulario.header_height = 60;
  } else {
    formulario.header_height = altura;
  }

  modalStatus.value?.abrirModal();
  estatusAlGuardar.cargando = true;
  estatusAlGuardar.textoCargando = 'Guardando...';

  const headers = { Authorization: `Bearer ${userData.value?.accessToken}` };

  if (esNuevo.value) {
    const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panoramas/`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formulario),
    });

    if (!respuesta.ok) {
      estatusAlGuardar.cargando = false;
      estatusAlGuardar.estado = false;
      estatusAlGuardar.mensaje = 'Ocurrió un error al crear el panorama.';
      return;
    }

    const data = await respuesta.json();

    if (logos.value.length > 0) {
      const formData = construirFormDataHeader();
      await gnoxyFetch(`${config.public.geonodeApi}/panoramas/${data.id}/sync-header/`, {
        method: 'POST',
        headers,
        body: formData,
      });
    }

    estatusAlGuardar.cargando = false;
    estatusAlGuardar.estado = true;
    setTimeout(() => {
      modalStatus.value?.cerrarModal();
      navigateTo(`/geocontenidos/panoramas/${data.id}/editar`);
    }, 1200);
    return;
  }

  if (pestanaActiva.value === 'encabezado') {
    const formData = construirFormDataHeader();
    const respuesta = await gnoxyFetch(
      `${config.public.geonodeApi}/panoramas/${panorama}/sync-header/`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    if (!respuesta.ok) {
      estatusAlGuardar.cargando = false;
      estatusAlGuardar.estado = false;
      estatusAlGuardar.mensaje = 'Ocurrió un error al guardar el encabezado del panorama.';
      return;
    }

    const data = await respuesta.json();
    formulario.header_title = data.header_title || '';
    formulario.header_color = data.header_color || '#1a1a2e';
    formulario.header_title_color = data.header_title_color || '#ffffff';
    formulario.header_height = data.header_height || 60;
    logos.value = normalizarLogosServidor(data.header_logos, data.header_logo);

    estatusAlGuardar.cargando = false;
    estatusAlGuardar.estado = true;
    setTimeout(() => {
      modalStatus.value?.cerrarModal();
    }, 1200);
    return;
  }

  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panoramas/${panorama}/`, {
    method: 'PATCH',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formulario),
  });

  if (!respuesta.ok) {
    estatusAlGuardar.cargando = false;
    estatusAlGuardar.estado = false;
    estatusAlGuardar.mensaje = 'Ocurrió un error al guardar el panorama.';
    return;
  }

  await respuesta.json();
  estatusAlGuardar.cargando = false;
  estatusAlGuardar.estado = true;
  setTimeout(() => {
    modalStatus.value?.cerrarModal();
  }, 1200);
}
</script>

<template>
  <div class="editor-panorama">
    <GeocontenidosTituloVolver volver="/panoramas" titulo="Edición del panorama" />

    <div class="editor-panorama__cuerpo flex">
      <nav class="editor-panorama__menu panel-acciones-columna">
        <div class="lista-acciones flex-vertical">
          <button
            v-for="pestana in pestanas"
            :key="pestana.id"
            type="button"
            class="boton-accion-lateral boton-sin-contenedor-secundario"
            :class="{ activo: pestanaActiva === pestana.id }"
            :aria-pressed="pestanaActiva === pestana.id"
            @click="pestanaActiva = pestana.id"
          >
            <span :class="pestana.icono" aria-hidden="true" />
            <span>{{ pestana.nombre }}</span>
          </button>
        </div>
      </nav>

      <div class="editor-panorama__contenido">
        <form
          v-show="['configuracion', 'detalles', 'encabezado'].includes(pestanaActiva)"
          @submit.prevent="guardarCambios"
        >
          <div v-show="pestanaActiva === 'configuracion'">
            <h2>Configuración principal del panorama</h2>

            <div class="m-b-4">
              <label for="nombre">Nombre *</label>
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

            <div class="grid-encabezado-controles m-b-4">
              <div class="campo-color">
                <label for="header-color">Color de fondo</label>
                <div class="color-picker-fila">
                  <input id="header-color" v-model="formulario.header_color" type="color" />
                  <input
                    v-model="formulario.header_color"
                    type="text"
                    maxlength="7"
                    placeholder="#1a1a2e"
                  />
                </div>
              </div>

              <div class="campo-color">
                <label for="header-color-titulo">Color del texto</label>
                <div class="color-picker-fila">
                  <input
                    id="header-color-titulo"
                    v-model="formulario.header_title_color"
                    type="color"
                  />
                  <input
                    v-model="formulario.header_title_color"
                    type="text"
                    maxlength="7"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div class="campo-altura">
                <label for="header-height">Alto (px)</label>
                <input
                  id="header-height"
                  v-model.number="formulario.header_height"
                  type="number"
                  min="32"
                  max="120"
                />
              </div>
            </div>

            <div class="m-b-4">
              <label class="formulario-etiqueta">Vista previa</label>
              <div
                class="encabezado-preview"
                :style="{
                  backgroundColor: formulario.header_color || '#1a1a2e',
                  color: formulario.header_title_color || '#ffffff',
                  height: `${formulario.header_height || 60}px`,
                }"
              >
                <span v-if="formulario.header_title" class="encabezado-preview__titulo">
                  {{ formulario.header_title }}
                </span>
                <span v-else class="encabezado-preview__placeholder">
                  Vista previa del encabezado
                </span>

                <div v-if="logos.length" class="encabezado-preview__logos">
                  <div
                    v-for="(logo, index) in logos"
                    :key="`preview-${logo.key || index}`"
                    class="encabezado-preview__logo"
                  >
                    <span class="encabezado-preview__indice">{{ index + 1 }}</span>
                    <img
                      v-if="obtenerImagen(logo)"
                      :src="obtenerImagen(logo)"
                      :alt="logo.alt_text || `Logo ${index + 1}`"
                      :style="{
                        maxHeight: `${Math.max(20, Number(formulario.header_height || 60) - 20)}px`,
                      }"
                    />
                  </div>
                </div>
              </div>
            </div>

            <TablerosAdminSubidorLogosTopBar
              v-model:logos="logos"
              :disabled="estatusAlGuardar.cargando"
            />
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

.grid-encabezado-controles {
  display: grid;
  grid-template-columns: 1fr 1fr 120px;
  gap: 1.25rem;
  align-items: start;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
}

.color-picker-fila {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;

  input[type='color'] {
    width: 42px;
    height: 38px;
    padding: 2px;
    border: 1px solid var(--color-neutro-2, #ccc);
    border-radius: 4px;
    cursor: pointer;
  }

  input[type='text'] {
    flex: 1;
    min-width: 0;
  }
}

.campo-altura {
  input[type='number'] {
    margin-top: 0.25rem;
    width: 100%;
  }
}

.encabezado-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1.25rem;
  border: 1px dashed var(--color-neutro-2, #ccc);
  border-radius: 6px;
  overflow: hidden;
  box-sizing: border-box;
  margin-top: 0.25rem;
  transition:
    background-color 0.2s,
    color 0.2s,
    height 0.2s;

  &__titulo {
    font-size: 0.95rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__placeholder {
    font-size: 0.85rem;
    font-style: italic;
    opacity: 0.6;
  }

  &__logos {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.85rem;
    margin-left: auto;
  }

  &__logo {
    position: relative;
    display: grid;
    place-items: center;
    background: #ffffff;
    padding: 2px 6px;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);

    img {
      width: auto;
      max-width: 120px;
      object-fit: contain;
    }
  }

  &__indice {
    position: absolute;
    top: -6px;
    left: -6px;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--color-primario-4, #991f47);
    color: #ffffff;
    font-size: 0.6rem;
    font-weight: 700;
  }
}

.editor-panorama__menu {
  width: 250px;
  min-width: 250px;
  box-sizing: border-box;
  padding: 16px 12px;
  background-color: var(--fondo);
  border-right: 1px solid var(--color-neutro-2, #e0e0e0);
}

.lista-acciones {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.boton-accion-lateral {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  font-family: var(--tipografia-familia, 'Montserrat', sans-serif);
  font-size: 1rem;
  font-weight: 500;
  color: var(--texto-primario);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
  line-height: 1.3;

  .pictograma,
  [class^='pictograma-'],
  [class*=' pictograma-'] {
    font-size: 1.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &:hover {
    background-color: transparent;
    border-color: var(--color-neutro-2, #e0e0e0);
  }

  &.activo {
    background-color: var(--color-primario-4);
    color: var(--texto-inverso, #ffffff);
    font-weight: 600;
    border-color: var(--color-primario-4);

    .pictograma,
    [class^='pictograma-'],
    [class*=' pictograma-'] {
      color: var(--texto-inverso, #ffffff);
    }
  }
}
</style>
