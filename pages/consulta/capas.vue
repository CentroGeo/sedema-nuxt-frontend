<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import {
  SisdaiCapaArcgis,
  SisdaiCapaWms,
  SisdaiCapaXyz,
  SisdaiMapa,
  utiles,
} from '@centrogeomx/sisdai-mapas';
import html2canvas from 'html2canvas';
import { useResourcesSupplements } from '~/composables/useResourcesSupplements';
import { arrayNewsOlds, resourceTypeDic } from '~/utils/consulta';
import pictogramas from '~/utils/geocontenidos/pictogramas.json';

const storeConsulta = useConsultaStore();
const storeResources = useResourcesConsultaStore();
const storeSelected = useSelectedResources2Store();
const config = useRuntimeConfig();
const { gnoxyFetch } = useGnoxyUrl();
const { getLayerName, findServer, filteredByServerType } = useResourcesSupplements();
const route = useRoute();
const router = useRouter();
storeConsulta.resourceType = resourceTypeDic.dataLayer;
const isSwipeActive = computed(() => storeConsulta.divisionMapaActivado());
const vistaDelMapa = ref({ extension: storeConsulta.mapExtent });
const selectorDivisionAbierto = ref(undefined);
const estaAbiertoSelectorDivisionMapa = (lado) => selectorDivisionAbierto.value === lado;
const owsLayers = computed(() =>
  filteredByServerType(storeResources.findResources(storeSelected.pks), 'ogc')
);
const arcgisLayers = computed(() =>
  filteredByServerType(storeResources.findResources(storeSelected.pks), 'arcgis')
);
const linkExportaMapa = ref();
const attributes = ref({});

// Variables del cambio de estilo en los mapas de consulta
const mapaBaseSeleccionado = ref('claro');
//Variable para abrir/cerrar el menú flotante
const menuMapasAbierto = ref(false);

const urlsMapas = {
  claro: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  oscuro: 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  satelite:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};
const urlCapaFondo = computed(() => urlsMapas[mapaBaseSeleccionado.value]);
// Fin de las variables del mapa de consulta

function alAbrirSelectorDivisionMapa(lado) {
  selectorDivisionAbierto.value = estaAbiertoSelectorDivisionMapa(lado) ? undefined : lado;
}

/**
 * Agrega en un parametro hash los valores de la vista del mapa
 * @param param vista del mapa
 */
function actualizarHashDesdeVista({ acercamiento, centro }) {
  const hash = `#vista=${acercamiento.toFixed(0)}/${centro[1].toFixed(4)}/${centro[0].toFixed(4)}/${isSwipeActive.value}`;

  if (hash !== route.hash) {
    router.replace({ query: route.query, hash });
  }
}

/**
 * Actualiza el estatus del selector de swipe
 */
async function actualizarSwipeEnHash() {
  const hashList = route.hash.split('/');
  hashList[3] = isSwipeActive.value.toString();
  const newHash = hashList.join('/');
  await nextTick();
  router.replace({ query: route.query, hash: newHash });
}

/**
 * Actualiza la vista del mapa dependiendo del hash.
 * @param hashVista texto hash sin el carácter #.
 */
function updateMapFromHash(hashVista) {
  if (hashVista === '') return;
  const [acercamiento, latitud, longitud, swipe] = hashVista.split('=')[1].split('/');
  storeConsulta.mapExtent = undefined;
  vistaDelMapa.value = { acercamiento, centro: [longitud, latitud] };
  if (swipe === 'true') {
    storeConsulta.activarDivisionMapa();
  } else {
    storeConsulta.desactivarDivisionMapa();
  }
}
/**
 * Actualiza el queryParam.
 * @param newQueryParam para asignar.
 */
async function updateQueryParam(capas) {
  const hashList = route.hash.split('/');
  hashList[3] = isSwipeActive.value.toString();
  const newHash = hashList.join('/');
  await nextTick();
  if (capas !== route.query.capas) {
    router.replace({ query: { capas }, hash: newHash });
  }
}

/**
 * Obtiene el attribute set de un recurso a partir del pk del mismo
 * @param pk
 */
async function addAttribute(pk) {
  const maxAttrs = 5;
  const resource = await gnoxyFetch(`${config.public.geonodeApi}/datasets/${pk}`);
  if (!resource.ok) {
    const alternateTitle = storeResources.findResource(pk, 'dataLayer')['alternate'];
    attributes.value[alternateTitle] = [];
  } else {
    const res = await resource.json();
    let visibleAttrs = res.dataset.attribute_set
      .filter((a) => a.visible)
      .sort((a, b) => a.display_order - b.display_order);

    // Limitamos el máximo de atributos visibles
    if (visibleAttrs.length > 0) {
      if (visibleAttrs.length > maxAttrs) {
        visibleAttrs = visibleAttrs.slice(0, maxAttrs);
      }
      attributes.value[res.dataset.alternate] = visibleAttrs;
    } else {
      attributes.value[res.dataset.alternate] = [];
    }
  }
}

/**
 * Crea la información del cuadro de información
 * @param url
 * @param alternate
 * @param title
 * @param sourcetype
 */
async function buildLayerInfo(url, alternate, title, sourcetype) {
  if (sourcetype === 'REMOTE') {
    return `<p style="margin-bottom: 8px;">${title}</p> <p>No hay información disponible para esta capa.</p>`;
    //return undefined;
  } else {
    const res = await gnoxyFetch(url);
    if (!res.ok) {
      return `<p style="margin-bottom: 8px;">${title}</p> <p>No hay información disponible para esta capa.</p>`;
      //return undefined;
    }
    const data = await res.json();
    if (data.features.length === 0) {
      return `<p style="margin-bottom: 8px;">${title}</p> <p>No hay información disponible para este punto.</p>`;
      //return undefined;
    } else {
      const propiedades = data.features[0].properties;
      const match = attributes.value[alternate].map(({ attribute, attribute_label }) => {
        if (attribute_label) {
          return `<li class="m-0">${attribute_label}: ${propiedades[attribute]}</li>`;
        } else {
          return `<li class="m-0">${attribute}: ${propiedades[attribute]}</li>`;
        }
      });
      return `<p style="margin-bottom: 8px;">${title}</p> <ol style="margin-top: 8px">${match.join(
        ''
      )}</ol>`;
    }
  }
}

watch(
  () => storeSelected.resources[storeConsulta.resourceType],
  (nv_) => {
    const selectedPks = Object.keys(nv_);
    const attributesPks = Object.keys(attributes.value);
    const { news, olds } = arrayNewsOlds(attributesPks, selectedPks);
    news.forEach(async (r) => await addAttribute(r));
    olds.forEach((resource) => delete attributes.value[resource]);
  },
  { deep: true }
);

watch(() => storeSelected.asQueryParam(), updateQueryParam, { deep: true });

watch(isSwipeActive, async (nv) => {
  await actualizarSwipeEnHash();
  if (nv === false) {
    await nextTick();
    storeSelected.pks.forEach((pk) => storeSelected.byPk(pk).resetLado());
  }
});

watch(
  () => storeConsulta.mapExtent,
  (extension) => {
    if (extension === undefined) return;
    vistaDelMapa.value = { extension };
  }
);

onMounted(async () => {
  storeConsulta.catalogoColapsado = false;
  updateMapFromHash(route.hash?.slice(1));
  storeResources.resetByType(storeConsulta.resourceType);
  storeSelected.addFromQueryParam(route.query.capas);

  // Cuando hace el cambio de página
  if (storeSelected.pks.length > 0) {
    storeResources.fetchResourcesByPk(storeConsulta.resourceType, storeSelected.pks);
    updateQueryParam(storeSelected.asQueryParam());
  }
});

const modalDescarga = ref(null);
const mapaImagen = ref('');
const tituloDescarga = ref('');
const leyendasDescarga = ref([]);
function AbrirModalDescarga() {
  leyendasDescarga.value = [];
  html2canvas(document.querySelectorAll('.mapa .ol-viewport').item(0), { useCORS: true }).then(
    (canvas) => {
      mapaImagen.value = canvas.toDataURL('image/png');

      leyendasDescarga.value = owsLayers.value.map((resource) => ({
        ...resource,
        fuente: findServer(resource).replace('?', ''),
        lado: storeSelected.byPk(resource.pk).lado,
        opacidad: storeSelected.byPk(resource.pk).opacidad,
        posicion: storeSelected.byPk(resource.pk).posicion,
        visible: storeSelected.byPk(resource.pk).visible,
        estilo: storeSelected.byPk(resource.pk).estilo,
      }));
      modalDescarga.value.abrirModal();
    }
  );
}
function DescargarMapa() {
  const elemento = document.querySelectorAll('.mapa-descarga').item(0);
  html2canvas(elemento, { useCORS: true }).then((canvas) => {
    const link = linkExportaMapa.value;
    link.href = canvas.toDataURL('image/png');
    link.download = `${tituloDescarga.value || 'mapa'}.png`;
    link.click();
  });
  modalDescarga.value?.cerrarModal();
}
</script>

<template>
  <ConsultaLayoutPaneles>
    <template #catalogo>
      <ConsultaLayoutCatalogo titulo="Capas geográficas" etiqueta-elementos="Capas" />
    </template>

    <template #visualizador>
      <div v-if="storeSelected.pks.length === 0" class="contenedor">
        <ConsultaTarjetaSinSeleccion />
      </div>
      <ClientOnly v-else>
        <SisdaiMapa
          :key="`mapa-`"
          class="gema"
          :vista="vistaDelMapa"
          :dividir="storeConsulta.divisionMapa"
          @click-centrar="storeConsulta.resetMapExtent"
          @al-mover-vista="actualizarHashDesdeVista"
        >
          <div
            class="selectores-division-contenedor fondo-color-neutro borde-redondeado-4"
            :class="{
              colapsado: !(
                storeConsulta.contenedorSelectoresDivisionColapsado &&
                storeConsulta.divisionMapaActivado()
              ),
            }"
          >
            <ConsultaSelectorDivisionMapa
              :abierto="estaAbiertoSelectorDivisionMapa(utiles.capa.lados.derecho)"
              :lado="utiles.capa.lados.derecho"
              @al-abrir="alAbrirSelectorDivisionMapa"
            />
            <ConsultaSelectorDivisionMapa
              :abierto="estaAbiertoSelectorDivisionMapa(utiles.capa.lados.izquierdo)"
              :lado="utiles.capa.lados.izquierdo"
              @al-abrir="alAbrirSelectorDivisionMapa"
            />
          </div>

          <SisdaiCapaXyz
            :key="urlCapaFondo"
            :posicion="0"
            :url="urlCapaFondo"
            :fuente="urlCapaFondo"
          />
          <!-- 
            Se añade el estilo seleccionado a la propiedad :key para forzar a Vue 
            a desmontar y volver a montar la capa (descartando la caché vieja de imágenes) 
            cuando el usuario cambie el estilo.
          -->
          <SisdaiCapaWms
            v-for="resource in owsLayers"
            :key="`wms-${resource.pk}-${resource.position_}-${storeSelected.byPk(resource.pk).estilo}`"
            :capa="getLayerName(resource)"
            :consulta="gnoxyFetch"
            :fuente="findServer(resource)"
            :lado="storeSelected.byPk(resource.pk).lado"
            :mosaicos="true"
            :opacidad="storeSelected.byPk(resource.pk).opacidad"
            :posicion="storeSelected.byPk(resource.pk).posicion + 1"
            :visible="storeSelected.byPk(resource.pk).visible"
            :estilo="storeSelected.byPk(resource.pk).estilo"
            :cuadro-informativo="
              (url) =>
                buildLayerInfo(url, getLayerName(resource), resource.title, resource.sourcetype)
            "
          />
          <SisdaiCapaArcgis
            v-for="resource in arcgisLayers"
            :key="`arcgis-${resource.pk}-${resource.position_}`"
            :fuente="findServer(resource).replace('?', '')"
            :capa="getLayerName(resource).split(':')[1]"
            :mosaicos="true"
            :lado="storeSelected.byPk(resource.pk).lado"
            :opacidad="storeSelected.byPk(resource.pk).opacidad"
            :posicion="storeSelected.byPk(resource.pk).posicion + 1"
            :visible="storeSelected.byPk(resource.pk).visible"
          />

          <div
            class="menu-flotante-mapa"
            style="position: absolute; bottom: 30px; right: 20px; z-index: 1000"
          >
            <div
              v-if="menuMapasAbierto"
              style="
                position: absolute;
                bottom: 50px;
                right: 0;
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                width: 150px;
                border: 1px solid #ddd;
              "
            >
              <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333; text-align: left">
                Fondo del mapa
              </h4>
              <div v-for="(url, tipo) in urlsMapas" :key="tipo" class="opcion-fondo-mapa">
                <label>
                  <input
                    v-model="mapaBaseSeleccionado"
                    type="radio"
                    :value="tipo"
                    style="margin-right: 8px"
                  />
                  {{ tipo }}
                </label>
              </div>
            </div>

            <button
              type="button"
              class="boton-secundario"
              style="
                border-radius: 50%;
                width: 44px;
                height: 44px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                cursor: pointer;
              "
              title="Cambiar mapa base"
              @click="menuMapasAbierto = !menuMapasAbierto"
            >
              <span
                style="font-family: 'sisdai-pictogramas'; font-size: 24px"
                v-html="String.fromCharCode(parseInt(pictogramas['capas'], 16))"
              ></span>
            </button>
          </div>
        </SisdaiMapa>

        <SisdaiModal ref="modalDescarga" tamanio-modal="modal-grande">
          <template #encabezado>
            <h1 class="m-t-0">Descargar mapa como imagen</h1>
          </template>

          <template #cuerpo>
            <fieldset>
              <label for="titulo-mapa-descarga">Titulo de la descarga</label>
              <input
                id="titulo-mapa-descarga"
                v-model="tituloDescarga"
                type="text"
                placeholder="Ingrese el título para la descarga"
              />
            </fieldset>

            <ConsultaMapaDescarga
              :ows-layers="leyendasDescarga"
              :funcion-consulta="gnoxyFetch"
              :mapa-imagen="mapaImagen"
              :titulo-descarga="tituloDescarga"
            />
          </template>

          <template #pie>
            <button type="button" class="boton-primario" value="acepta" @click="DescargarMapa">
              Descargar
            </button>
          </template>
        </SisdaiModal>
      </ClientOnly>
    </template>

    <template #seleccion>
      <ConsultaLayoutSeleccion
        titulo="Capas seleccionadas"
        :resource-type="storeConsulta.resourceType"
        etiqueta-elementos="Capas"
        :funcion-descarga="AbrirModalDescarga"
      />
      <a ref="linkExportaMapa" class="oculto" download="sigic.png" />
    </template>
  </ConsultaLayoutPaneles>
</template>

<style lang="scss" scoped>
.selectores-division-contenedor {
  z-index: 2;
  right: 0;
  top: 160px;
  position: absolute;

  cursor: inherit;
  pointer-events: inherit;
  opacity: 1;
  max-width: 260px;

  &.colapsado {
    cursor: default;
    pointer-events: none;
    opacity: 0;
    max-width: 0;
    transition:
      opacity 0.27s ease,
      max-width 0.27s ease;
  }
}
/* Estilos para el menú flotante del mapa base */
.opcion-fondo-mapa {
  margin-bottom: 4px;
  border-radius: 6px;
  transition: background-color 0.2s ease;

  label {
    display: flex;
    align-items: center;
    cursor: pointer;
    text-transform: capitalize;
    color: #333;
    font-size: 14px;
    padding: 8px 10px;
    width: 100%;
    margin: 0;
    box-sizing: border-box;
    transition: color 0.2 ease;
  }

  &:hover {
    background-color: #381821bf;

    label {
      color: white;
    }
  }
}
</style>
