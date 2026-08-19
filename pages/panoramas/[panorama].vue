<script setup>
import SisdaiControlDeslizante from '@centrogeomx/sisdai-componentes/src/componentes/control-deslizante/SisdaiControlDeslizante.vue';
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import {
  SisdaiCapaVectorial,
  SisdaiCapaWms,
  SisdaiCapaXyz,
  SisdaiLeyendaWms,
} from '@centrogeomx/sisdai-mapas';
import DOMPurify from 'dompurify';
import { useDownloadResources } from '~/composables/useDownloadResources';
import { basemapsPanorama } from '~/utils/geocontenidos/basemapsPanorama';
import pictogramas from '~/utils/geocontenidos/pictogramas.json';

definePageMeta({ layout: 'geohistorias' });

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { panorama: panoramaId } = useRoute().params;

const panorama = reactive({ cargando: true, datos: null, sinAcceso: false });
// topicoModalId: se pueden combinar capas de varias temáticas a la vez sobre el mapa, como en geoweb
const topicoModalId = ref(null);
const textoActivoId = ref(null);
const capasPorTopico = reactive({});
const itemsPorTextoTopico = reactive({});
const capasEncendidasIds = reactive(new Set());
const marcadoresPorCapa = reactive({});
const cargandoCapasModal = ref(false);
const cargandoTexto = ref(false);
const modalTopico = ref(null);
const mapaContenedorRef = ref(null);
const ventanaInfoRef = ref(null);
const ventanaInfoVisible = ref(false);
const tipoInfoFlotante = ref(null);
const capaInfo = ref(null);

const posicionVentanaInfo = reactive({
  x: 16,
  y: 16,
});

const arrastreVentanaInfo = reactive({
  activo: false,
  pointerId: null,
  desplazamientoX: 0,
  desplazamientoY: 0,
});
const modalItemTexto = ref(null);
const itemTextoActivo = ref(null);
const basemapActivo = ref(null);
const wmsExternosEncendidos = reactive(new Set());
const estadosWmsExternos = reactive({});
const temporizadoresWms = new Map();

function obtenerEstadoWms(id) {
  return estadosWmsExternos[id] || 'idle';
}

function limitarPosicionVentanaInfo(x, y) {
  const mapa = mapaContenedorRef.value;
  const ventana = ventanaInfoRef.value;

  if (!mapa || !ventana) {
    return { x: 16, y: 16 };
  }

  const margen = 16;
  const maximoX = Math.max(margen, mapa.clientWidth - ventana.offsetWidth - margen);
  const maximoY = Math.max(margen, mapa.clientHeight - ventana.offsetHeight - margen);

  return {
    x: Math.min(Math.max(x, margen), maximoX),
    y: Math.min(Math.max(y, margen), maximoY),
  };
}

function ajustarVentanaInfoALimite() {
  if (!ventanaInfoVisible.value) return;

  const posicion = limitarPosicionVentanaInfo(posicionVentanaInfo.x, posicionVentanaInfo.y);

  posicionVentanaInfo.x = posicion.x;
  posicionVentanaInfo.y = posicion.y;
}

async function abrirVentanaInfo(tipo, capa = null) {
  tipoInfoFlotante.value = tipo;
  capaInfo.value = capa;
  ventanaInfoVisible.value = true;

  await nextTick();

  const mapa = mapaContenedorRef.value;
  const ventana = ventanaInfoRef.value;

  if (!mapa || !ventana) return;

  const posicion = limitarPosicionVentanaInfo(
    Math.round((mapa.clientWidth - ventana.offsetWidth) / 2),
    Math.round((mapa.clientHeight - ventana.offsetHeight) / 2)
  );

  posicionVentanaInfo.x = posicion.x;
  posicionVentanaInfo.y = posicion.y;
}

function abrirInformacionGeneral() {
  abrirVentanaInfo('panorama');
}

function cerrarVentanaInfo() {
  ventanaInfoVisible.value = false;
  tipoInfoFlotante.value = null;
  capaInfo.value = null;
  arrastreVentanaInfo.activo = false;
  arrastreVentanaInfo.pointerId = null;
}

function iniciarArrastreVentanaInfo(evento) {
  if (evento.pointerType === 'mouse' && evento.button !== 0) return;

  const mapa = mapaContenedorRef.value;
  if (!mapa) return;

  const rectMapa = mapa.getBoundingClientRect();

  arrastreVentanaInfo.activo = true;
  arrastreVentanaInfo.pointerId = evento.pointerId;
  arrastreVentanaInfo.desplazamientoX = evento.clientX - rectMapa.left - posicionVentanaInfo.x;
  arrastreVentanaInfo.desplazamientoY = evento.clientY - rectMapa.top - posicionVentanaInfo.y;

  evento.currentTarget.setPointerCapture(evento.pointerId);
}

function moverVentanaInfo(evento) {
  if (!arrastreVentanaInfo.activo || evento.pointerId !== arrastreVentanaInfo.pointerId) {
    return;
  }

  const mapa = mapaContenedorRef.value;
  if (!mapa) return;

  const rectMapa = mapa.getBoundingClientRect();
  const posicion = limitarPosicionVentanaInfo(
    evento.clientX - rectMapa.left - arrastreVentanaInfo.desplazamientoX,
    evento.clientY - rectMapa.top - arrastreVentanaInfo.desplazamientoY
  );

  posicionVentanaInfo.x = posicion.x;
  posicionVentanaInfo.y = posicion.y;
}

function terminarArrastreVentanaInfo(evento) {
  if (evento.pointerId !== arrastreVentanaInfo.pointerId) return;

  arrastreVentanaInfo.activo = false;
  arrastreVentanaInfo.pointerId = null;

  if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
    evento.currentTarget.releasePointerCapture(evento.pointerId);
  }
}

onMounted(() => {
  window.addEventListener('resize', ajustarVentanaInfoALimite);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', ajustarVentanaInfoALimite);
});

function cambiarEstadoWms(id, estado) {
  const temporizador = temporizadoresWms.get(id);

  if (temporizador) {
    clearTimeout(temporizador);
    temporizadoresWms.delete(id);
  }

  estadosWmsExternos[id] = estado;
}

function alIniciarCargaWms(item) {
  cambiarEstadoWms(item.id, 'loading');

  const temporizador = setTimeout(() => {
    if (estadosWmsExternos[item.id] === 'loading') {
      estadosWmsExternos[item.id] = 'error';
    }

    temporizadoresWms.delete(item.id);
  }, 15000);

  temporizadoresWms.set(item.id, temporizador);
}

function alFinalizarCargaWms(item, cargaExitosa) {
  cambiarEstadoWms(item.id, cargaExitosa ? 'success' : 'error');

  if (cargaExitosa) {
    const temporizador = setTimeout(() => {
      if (estadosWmsExternos[item.id] === 'success') {
        estadosWmsExternos[item.id] = 'idle';
      }

      temporizadoresWms.delete(item.id);
    }, 3000);

    temporizadoresWms.set(item.id, temporizador);
  }
}

async function reintentarWmsExterno(item) {
  wmsExternosEncendidos.delete(item.id);
  cambiarEstadoWms(item.id, 'loading');

  await nextTick();

  wmsExternosEncendidos.add(item.id);
}
const modalBasemap = ref(null);
const capaMascara = ref(null);
const leyendaVisible = ref(true);
const visorRef = ref(null);

// se replican los botones de consulta
const opacidadPorCapa = reactive({});
const leyendaOcultaCapas = reactive(new Set());
const extentPorCapa = reactive({});
const modalOpacidad = ref(null);
const capaOpacidadActiva = ref(null);
const modalTabla = ref(null);
const capaTablaActiva = ref(null);
const tablaPagina = ref(0);
const tamanioPaginaTabla = 8;
const modalDescarga = ref(null);
const capaDescargaActiva = ref(null);
const descargandoCapa = ref(false);
const descargaFallo = ref(false);

const { downloadWMS } = useDownloadResources();
const {
  variables: tablaVariables,
  datos: tablaDatos,
  totalFeatures: tablaTotalFeatures,
  refetch: refetchTabla,
} = useGeoserverDataTable({ paginaActual: 0, tamanioPagina: tamanioPaginaTabla, resource: null });

function elegirBasemap(id) {
  basemapActivo.value = id;
  modalBasemap.value?.cerrarModal();
}

async function cargarCapaMascara(datasetId) {
  if (!datasetId) return;

  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/datasets/${datasetId}/`);
  if (!respuesta.ok) return;

  const datos = await respuesta.json();
  capaMascara.value = (datos.dataset || datos).alternate || null;
}

async function cargarMarcadoresCapa(capaId) {
  if (marcadoresPorCapa[capaId]) return;
  marcadoresPorCapa[capaId] = [];

  const respuesta = await gnoxyFetch(
    `${config.public.geonodeApi}/panorama-markers/by-layer/${capaId}/`
  );
  marcadoresPorCapa[capaId] = await respuesta.json();
}

async function cargarPanorama() {
  panorama.cargando = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panoramas/${panoramaId}/`);

  if (!respuesta.ok) {
    panorama.sinAcceso = true;
    panorama.cargando = false;
    return;
  }

  const data = await respuesta.json();
  panorama.datos = data;
  panorama.cargando = false;
  basemapActivo.value = data.config;
  if (data.bbox_x0 !== null && data.bbox_x0 !== undefined) {
    vista.value = { extension: `${data.bbox_x0},${data.bbox_y0},${data.bbox_x1},${data.bbox_y1}` };
  }
  (data.external_wms || [])
    .filter((item) => item.at_start)
    .forEach((item) => wmsExternosEncendidos.add(item.id));
  cargarCapaMascara(data.mask_dataset_id);

  if (data.landing_info && data.extra_info) {
    await nextTick();
    abrirInformacionGeneral();
  }

  const primerTopico = [...(data.topics || [])].sort((a, b) => a.stack_order - b.stack_order)[0];
  if (primerTopico) await cargarTopico(primerTopico.id);
}
cargarPanorama();

// Trae y cachea las capas de una temática. No toca
// topicoModalId ni abre ningún modal.
async function cargarTopico(topicoId) {
  if (capasPorTopico[topicoId]) return;

  cargandoCapasModal.value = true;
  const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/panorama-topics/${topicoId}/`);
  const data = await respuesta.json();
  const capas = data.layers || [];
  capasPorTopico[topicoId] = capas;
  capas
    .filter((capa) => capa.visible)
    .forEach((capa) => {
      capasEncendidasIds.add(capa.id);
      cargarMarcadoresCapa(capa.id);
    });
  cargandoCapasModal.value = false;
}

async function abrirModalTopico(topicoId) {
  topicoModalId.value = topicoId;
  textoActivoId.value = null;
  modalTopico.value?.abrirModal();
  await cargarTopico(topicoId);
}

function manejarHerramientaPanorama(herramientaId) {
  switch (herramientaId) {
    case 'informacion':
      abrirInformacionGeneral();
      break;

    default:
      break;
  }
}

async function manejarTopicoPanorama({ tipo, id }) {
  if (tipo === 'capas') {
    await abrirModalTopico(id);
    return;
  }

  if (tipo === 'texto') {
    await seleccionarTextoTopico(id);
    leyendaVisible.value = true;
  }
}

async function seleccionarTextoTopico(textoId) {
  textoActivoId.value = textoId;
  if (itemsPorTextoTopico[textoId]) return;

  cargandoTexto.value = true;
  const respuesta = await gnoxyFetch(
    `${config.public.geonodeApi}/panorama-text-topics/${textoId}/`
  );
  const data = await respuesta.json();
  itemsPorTextoTopico[textoId] = data.items || [];
  cargandoTexto.value = false;
}

function abrirItemTexto(item) {
  itemTextoActivo.value = item;
  modalItemTexto.value?.abrirModal();
}

function alternarCapa(capa) {
  if (capasEncendidasIds.has(capa.id)) {
    capasEncendidasIds.delete(capa.id);
  } else {
    capasEncendidasIds.add(capa.id);
    cargarMarcadoresCapa(capa.id);
  }
}

function abrirInfoCapa(capa) {
  abrirVentanaInfo('capa', capa);
}

// Trae la extensión del dataset bajo demanda y reasigna `vista` para que SisdaiMapa haga fit,
// igual que storeConsulta.mapExtent en el módulo Consulta.
async function zoomACapa(capa) {
  if (!capa.geonode_id) return;
  if (!extentPorCapa[capa.id]) {
    const respuesta = await gnoxyFetch(`${config.public.geonodeApi}/datasets/${capa.geonode_id}/`);
    if (!respuesta.ok) return;
    const datos = await respuesta.json();
    extentPorCapa[capa.id] = (datos.dataset || datos).extent?.coords || null;
  }
  const coords = extentPorCapa[capa.id];
  if (coords) vista.value = { extension: coords.join(',') };
}

function abrirOpacidad(capa) {
  capaOpacidadActiva.value = capa;
  modalOpacidad.value?.abrirModal();
}

async function abrirTabla(capa) {
  capaTablaActiva.value = capa;
  tablaPagina.value = 0;
  modalTabla.value?.abrirModal();
  await refetchTabla({
    paginaActual: 0,
    tamanioPagina: tamanioPaginaTabla,
    resource: { alternate: capa.name },
  });
}

watch(tablaPagina, (paginaActual) => {
  if (!capaTablaActiva.value) return;
  refetchTabla({
    paginaActual,
    tamanioPagina: tamanioPaginaTabla,
    resource: { alternate: capaTablaActiva.value.name },
  });
});

function abrirDescarga(capa) {
  capaDescargaActiva.value = capa;
  descargaFallo.value = false;
  modalDescarga.value?.abrirModal();
}

async function descargarCapa(formato) {
  if (!capaDescargaActiva.value) return;
  descargandoCapa.value = true;
  descargaFallo.value = false;
  const resultado = await downloadWMS(
    {
      alternate: capaDescargaActiva.value.name,
      title: capaDescargaActiva.value.dataset_title || capaDescargaActiva.value.name,
    },
    formato,
    'all'
  );
  descargandoCapa.value = false;
  if (resultado === 'Error') descargaFallo.value = true;
}

function alternarLeyendaCapa(capa) {
  if (leyendaOcultaCapas.has(capa.id)) leyendaOcultaCapas.delete(capa.id);
  else leyendaOcultaCapas.add(capa.id);
}

// acciones por capa homologada con ContenidoCapaSeleccionada.vue
// (módulo Consulta)mmismo patrón de arreglo { label, pictograma, accion }.
function botonesCapa(capa) {
  const encendida = capasEncendidasIds.has(capa.id);
  return [
    {
      label: 'Hacer zoom',
      pictograma: 'pictograma-zoom-instruccional',
      accion: () => zoomACapa(capa),
    },
    { label: 'Ver tabla', pictograma: 'pictograma-tabla', accion: () => abrirTabla(capa) },
    {
      label: encendida ? 'Ocultar capa' : 'Mostrar capa',
      pictograma: encendida ? 'pictograma-ojo-ver' : 'pictograma-ojo-ocultar',
      accion: () => alternarCapa(capa),
    },
    {
      label: 'Cambiar opacidad',
      pictograma: 'pictograma-contraste',
      accion: () => abrirOpacidad(capa),
    },
    {
      label: 'Ver metadatos',
      pictograma: 'pictograma-metadatos',
      accion: () => abrirInfoCapa(capa),
    },
    {
      label: leyendaOcultaCapas.has(capa.id) ? 'Mostrar leyenda' : 'Ocultar leyenda',
      pictograma: 'pictograma-vista-simplificada',
      accion: () => alternarLeyendaCapa(capa),
    },
    {
      label: 'Descargar archivo',
      pictograma: 'pictograma-archivo-descargar',
      accion: () => abrirDescarga(capa),
    },
  ];
}

// MapasVisor solo reemite { acercamiento, centro }; para animar la vista nativa
// de OL (snap-back de zoom) se accede a la instancia real via visorRef.
function alMoverVista({ acercamiento }) {
  const datos = panorama.datos;
  if (!datos?.limited_zoom || !datos.custom_zoom) return;
  if (acercamiento >= datos.custom_zoom) return;

  const vistaOl = visorRef.value?.mapaRef?.mapa?.getView();
  vistaOl?.animate({ zoom: datos.custom_zoom, duration: 250 });
}

// Capas de la temática cuyo modal está abierto, replica de funcionalidades de repo geoweb.
const capasModalActivas = computed(() => capasPorTopico[topicoModalId.value] || []);
const topicoModalActivo = computed(() =>
  (panorama.datos?.topics || []).find((topico) => topico.id === topicoModalId.value)
);
const itemsTextoActivos = computed(() => itemsPorTextoTopico[textoActivoId.value] || []);
// Unión de las capas encendidas de las temáticas ya cargada para combinar temáticas en el mapa y en el aside.
const capasActivasGlobal = computed(() =>
  Object.values(capasPorTopico)
    .flat()
    .filter((capa) => capasEncendidasIds.has(capa.id))
);
const capasVisibles = computed(() =>
  capasActivasGlobal.value.map((capa) => ({
    ...capa,
    opacity: (opacidadPorCapa[capa.id] ?? 100) / 100,
  }))
);

function caracterPictograma(nombre) {
  const codigo = pictogramas[nombre];
  return codigo ? String.fromCharCode(parseInt(codigo, 16)) : '';
}

const marcadoresParaVisor = computed(() =>
  capasVisibles.value.flatMap((capa) =>
    (marcadoresPorCapa[capa.id] || []).map((marcador) => ({
      id: marcador.id,
      title: marcador.title,
      content: marcador.narrative,
      icon: caracterPictograma(marcador.icon),
      color: (marcador.options && marcador.options.color) || '#df4242',
      lat: marcador.lat,
      lng: marcador.lng,
    }))
  )
);

function contenidoGloboMarcador({ title, content }) {
  const partes = [`<strong>${DOMPurify.sanitize(title)}</strong>`];
  if (content) partes.push(`<div>${DOMPurify.sanitize(content)}</div>`);
  return partes.join('');
}

async function contenidoCuadroInfoCapa(url, capa) {
  const titulo = DOMPurify.sanitize(capa.dataset_title || capa.name);

  const respuesta = await gnoxyFetch(url);
  if (!respuesta.ok) return `<p>${titulo}</p><p>No hay información disponible.</p>`;

  const datos = await respuesta.json();
  if (!datos.features?.length) {
    return `<p>${titulo}</p><p>No hay información disponible para este punto.</p>`;
  }

  const filas = Object.entries(datos.features[0].properties)
    .map(
      ([clave, valor]) =>
        `<li>${DOMPurify.sanitize(clave)}: ${DOMPurify.sanitize(String(valor))}</li>`
    )
    .join('');
  return `<p>${titulo}</p><ul>${filas}</ul>`;
}

const mensajesEstadoWms = {
  loading: 'Cargando capa…',
  success: 'Capa agregada al mapa',
  error: 'No fue posible cargar esta capa',
  idle: '',
};

const wmsExternosParaBarra = computed(() =>
  (panorama.datos?.external_wms || []).map((item) => {
    const estado = obtenerEstadoWms(item.id);

    return {
      ...item,
      activo: wmsExternosEncendidos.has(item.id),
      estado,
      mensaje: mensajesEstadoWms[estado] || '',
    };
  })
);

const wmsExternosActivos = computed(() =>
  (panorama.datos?.external_wms || []).filter((item) => wmsExternosEncendidos.has(item.id))
);

function alternarWmsExterno(item) {
  if (wmsExternosEncendidos.has(item.id)) {
    wmsExternosEncendidos.delete(item.id);
    cambiarEstadoWms(item.id, 'idle');
    return;
  }

  if (item.wms_or_tile === 'wms') {
    cambiarEstadoWms(item.id, 'loading');
  } else {
    cambiarEstadoWms(item.id, 'idle');
  }

  wmsExternosEncendidos.add(item.id);
}

// Ref además de la extensión inicial del panorama, zoomACapa
// la reasigna en caliente para hacer fit a la extensión de una capa.
const vista = ref({ centro: [-103.5, 23.6], acercamiento: 5 });
</script>

<template>
  <main class="panorama">
    <GeocontenidosLoader v-if="panorama.cargando" />

    <p v-else-if="panorama.sinAcceso" class="texto-centrado h3 p-4">
      Este panorama no existe o no tienes acceso a él.
    </p>

    <template v-else>
      <header
        v-if="panorama.datos.template_use === 'normal' && panorama.datos.header_title"
        class="panorama__encabezado"
        :style="{
          backgroundColor: panorama.datos.header_color || '#1a1a2e',
          color: panorama.datos.header_title_color || '#ffffff',
        }"
      >
        <img
          v-if="panorama.datos.header_logo"
          :src="panorama.datos.header_logo"
          alt=""
          class="panorama__encabezado-logo"
        />
        <h1 class="m-0">{{ panorama.datos.header_title }}</h1>
      </header>

      <div class="panorama__contenedor">
        <div ref="mapaContenedorRef" class="panorama__mapa">
          <PanoramasBarraHerramientasFlotante
            :topicos-capas="panorama.datos.topics || []"
            :topicos-texto="panorama.datos.text_topics || []"
            :wms-externos="wmsExternosParaBarra"
            @seleccionar-herramienta="manejarHerramientaPanorama"
            @seleccionar-topico="manejarTopicoPanorama"
            @alternar-wms="alternarWmsExterno"
            @reintentar-wms="reintentarWmsExterno"
          />

          <section
            v-if="ventanaInfoVisible"
            ref="ventanaInfoRef"
            class="panorama__ventana-info"
            :class="{ 'esta-arrastrando': arrastreVentanaInfo.activo }"
            :style="{
              left: `${posicionVentanaInfo.x}px`,
              top: `${posicionVentanaInfo.y}px`,
            }"
            role="dialog"
            aria-modal="false"
            aria-labelledby="titulo-ventana-info"
          >
            <header
              class="panorama__ventana-info-encabezado"
              @pointerdown="iniciarArrastreVentanaInfo"
              @pointermove="moverVentanaInfo"
              @pointerup="terminarArrastreVentanaInfo"
              @pointercancel="terminarArrastreVentanaInfo"
            >
              <h2 id="titulo-ventana-info" class="panorama__ventana-info-titulo">
                {{
                  tipoInfoFlotante === 'capa'
                    ? capaInfo?.dataset_title || capaInfo?.name
                    : panorama.datos.name
                }}
              </h2>

              <button
                type="button"
                class="panorama__ventana-info-cerrar"
                aria-label="Cerrar información"
                title="Cerrar información"
                @pointerdown.stop
                @click="cerrarVentanaInfo"
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div class="panorama__ventana-info-contenido">
              <p v-if="tipoInfoFlotante === 'panorama'">
                {{ panorama.datos.extra_info }}
              </p>

              <template v-else-if="tipoInfoFlotante === 'capa'">
                <template v-if="capaInfo?.narrative || capaInfo?.dataset_abstract">
                  <div v-if="capaInfo.narrative" class="m-b-4">
                    <h3>Narrativa</h3>
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <div
                      class="panorama__texto-info"
                      v-html="DOMPurify.sanitize(capaInfo.narrative)"
                    />
                  </div>

                  <div v-if="capaInfo.dataset_abstract">
                    <h3>Descripción de la capa</h3>
                    <p class="panorama__texto-info">
                      {{ capaInfo.dataset_abstract }}
                    </p>
                  </div>
                </template>

                <p v-else>Esta capa no tiene información adicional.</p>
              </template>
            </div>
          </section>

          <div class="panorama__control panorama__control--leyenda">
            <button
              type="button"
              class="boton-pictograma boton-primario"
              aria-label="Leyenda"
              title="Mostrar/ocultar leyenda"
              @click="leyendaVisible = !leyendaVisible"
            >
              <span class="pictograma-vista-simplificada" aria-hidden="true" />
            </button>
          </div>

          <div class="panorama__control panorama__control--basemap">
            <button
              type="button"
              class="boton-pictograma boton-primario"
              aria-label="Mapa base"
              title="Cambiar mapa base"
              @click="modalBasemap?.abrirModal()"
            >
              <span class="pictograma-capas" aria-hidden="true" />
            </button>
          </div>

          <MapasVisor
            ref="visorRef"
            class="panorama__visor"
            :vista="vista"
            :capas="capasVisibles"
            :marcadores="marcadoresParaVisor"
            :base-layer="basemapActivo"
            :basemaps="basemapsPanorama"
            :cuadro-informativo="contenidoCuadroInfoCapa"
            :globo-marcador="contenidoGloboMarcador"
            :opciones="{ cambiarBase: false, leyenda: false, info: false, coordenadas: true }"
            @vista="alMoverVista"
          >
            <SisdaiCapaVectorial
              v-if="capaMascara"
              :fuente="`${config.public.geoserverUrl}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${capaMascara}&outputFormat=application%2Fjson&srsName=EPSG%3A4326`"
              :posicion="capasVisibles.length + wmsExternosActivos.length + 1"
              :estilo="{
                'relleno-color': 'transparent',
                'contorno-color': '#ff9800',
                'contorno-grosor': 3,
              }"
            />

            <template v-for="externo in wmsExternosActivos" :key="`externo-${externo.id}`">
              <SisdaiCapaWms
                v-if="externo.wms_or_tile === 'wms'"
                :fuente="externo.url"
                :capa="externo.wms_layers"
                :posicion="externo.stack_order"
                :consulta="(url) => gnoxyFetch(url)"
                @al-iniciar-carga="alIniciarCargaWms(externo)"
                @al-finalizar-carga="(cargaExitosa) => alFinalizarCargaWms(externo, cargaExitosa)"
              />
              <SisdaiCapaXyz v-else :fuente="externo.url" :posicion="externo.stack_order" />
            </template>
          </MapasVisor>
        </div>

        <aside v-if="textoActivoId && leyendaVisible" class="panorama__leyenda">
          <h3>Contenidos</h3>

          <GeocontenidosLoader v-if="cargandoTexto" />

          <p v-else-if="itemsTextoActivos.length === 0" class="texto-tamanio-2">
            Esta temática no tiene contenidos.
          </p>

          <button
            v-for="item in itemsTextoActivos"
            v-else
            :key="`item-texto-${item.id}`"
            type="button"
            class="panorama__item-texto"
            @click="abrirItemTexto(item)"
          >
            {{ item.name }}
          </button>
        </aside>

        <aside v-else-if="leyendaVisible" class="panorama__leyenda">
          <h3>Capas</h3>

          <p v-if="capasActivasGlobal.length === 0" class="texto-tamanio-2">
            No hay capas activas. Actívalas desde las temáticas de la cintilla.
          </p>

          <div
            v-for="capa in capasActivasGlobal"
            v-else
            :key="`capa-control-${capa.id}`"
            class="panorama__capa"
          >
            <p class="panorama__capa-titulo">{{ capa.dataset_title || capa.name }}</p>

            <div class="flex panorama__capa-botones">
              <button
                v-for="boton in botonesCapa(capa)"
                :key="boton.label"
                v-globo-informacion:derecha="boton.label"
                type="button"
                class="boton-pictograma boton-sin-contenedor-secundario"
                :aria-label="boton.label"
                @click="boton.accion"
              >
                <span :class="boton.pictograma" aria-hidden="true" />
              </button>
            </div>

            <SisdaiLeyendaWms
              v-if="!leyendaOcultaCapas.has(capa.id)"
              :fuente="`${config.public.geoserverUrl}/wms`"
              :nombre="capa.name"
              :titulo="capa.dataset_title"
              :estilo="capa.style || undefined"
              :sin-control="true"
            />
          </div>
        </aside>
      </div>

      <ClientOnly>
        <SisdaiModal ref="modalTopico">
          <template #encabezado>
            <h2 class="m-t-0">{{ topicoModalActivo?.name }}</h2>
          </template>
          <template #cuerpo>
            <GeocontenidosLoader v-if="cargandoCapasModal" />

            <p v-else-if="capasModalActivas.length === 0" class="texto-tamanio-2">
              Esta temática no tiene capas.
            </p>

            <div
              v-for="capa in capasModalActivas"
              v-else
              :key="`modal-capa-${capa.id}`"
              class="flex flex-contenido-separado panorama__modal-capa"
            >
              <div class="panorama__capa-etiqueta">
                <input
                  :id="`toggle-capa-${capa.id}`"
                  type="checkbox"
                  :checked="capasEncendidasIds.has(capa.id)"
                  @change="alternarCapa(capa)"
                />
                <label :for="`toggle-capa-${capa.id}`">{{ capa.dataset_title || capa.name }}</label>
              </div>

              <button
                type="button"
                class="boton-pictograma boton-sin-contenedor-secundario"
                aria-label="Ver metadatos"
                title="Ver metadatos"
                @click="abrirInfoCapa(capa)"
              >
                <span class="pictograma-metadatos" aria-hidden="true" />
              </button>
            </div>
          </template>
        </SisdaiModal>

        <SisdaiModal ref="modalOpacidad">
          <template #encabezado>
            <h2 class="m-t-0">Opacidad</h2>
          </template>
          <template #cuerpo>
            <p>{{ capaOpacidadActiva?.dataset_title || capaOpacidadActiva?.name }}</p>
            <div class="flex panorama__opacidad-control">
              <div class="columna-11">
                <SisdaiControlDeslizante
                  :val_min="0"
                  :val_max="100"
                  :val_entrada="opacidadPorCapa[capaOpacidadActiva?.id] ?? 100"
                  step="1"
                  @update:val_entrada="
                    ($event) => {
                      if (capaOpacidadActiva) opacidadPorCapa[capaOpacidadActiva.id] = $event;
                    }
                  "
                />
              </div>
              <div class="columna-5">
                <input
                  type="number"
                  :value="opacidadPorCapa[capaOpacidadActiva?.id] ?? 100"
                  min="0"
                  max="100"
                  step="1"
                  @change="
                    (e) => {
                      if (capaOpacidadActiva)
                        opacidadPorCapa[capaOpacidadActiva.id] = Number(e.target.value);
                    }
                  "
                />
              </div>
            </div>
          </template>
        </SisdaiModal>

        <SisdaiModal id="modal-tabla-panorama" ref="modalTabla">
          <template #encabezado>
            <h2 class="m-t-0">{{ capaTablaActiva?.dataset_title || capaTablaActiva?.name }}</h2>
          </template>
          <template #cuerpo>
            <div class="panorama__contenedor-tabla">
              <UiPaginador
                :pagina-parent="tablaPagina"
                :total-paginas="Math.ceil(tablaTotalFeatures / tamanioPaginaTabla)"
                @cambio="tablaPagina = $event"
              />
              <UiTablaAccesible :variables="tablaVariables" :datos="tablaDatos" />
            </div>
          </template>
        </SisdaiModal>

        <SisdaiModal ref="modalDescarga">
          <template #encabezado>
            <h2 class="m-t-0">Descargar capa</h2>
          </template>
          <template #cuerpo>
            <p>{{ capaDescargaActiva?.dataset_title || capaDescargaActiva?.name }}</p>
            <p v-if="descargaFallo" class="panorama__texto-error">
              No se pudo completar la descarga. Verifica tu conexión e inténtalo de nuevo.
            </p>
            <div class="flex flex-contenido-final">
              <button
                v-for="formato in [
                  { label: 'GeoJSON', valor: 'geojson' },
                  { label: 'CSV', valor: 'csv' },
                  { label: 'GeoPackage', valor: 'gpkg' },
                  { label: 'KML', valor: 'kml' },
                ]"
                :key="formato.valor"
                type="button"
                class="boton-secundario boton-chico m-t-2"
                :disabled="descargandoCapa"
                @click="descargarCapa(formato.valor)"
              >
                {{ formato.label }}
              </button>
            </div>
          </template>
        </SisdaiModal>

        <SisdaiModal ref="modalBasemap">
          <template #encabezado>
            <h2 class="m-t-0">Mapa base</h2>
          </template>
          <template #cuerpo>
            <ul class="lista-sin-estilo">
              <li v-for="basemap in basemapsPanorama" :key="basemap.id">
                <button
                  type="button"
                  class="boton boton-secundario panorama__opcion-basemap"
                  :class="{ activo: basemap.id === basemapActivo }"
                  @click="elegirBasemap(basemap.id)"
                >
                  {{ basemap.label }}
                </button>
              </li>
            </ul>
          </template>
        </SisdaiModal>

        <SisdaiModal ref="modalItemTexto">
          <template #encabezado>
            <h2 class="m-t-0">{{ itemTextoActivo?.name }}</h2>
          </template>
          <template #cuerpo>
            <p class="panorama__texto-info">{{ itemTextoActivo?.contents }}</p>
          </template>
        </SisdaiModal>
      </ClientOnly>
    </template>
  </main>
</template>

<style lang="scss" scoped>
.panorama {
  &__encabezado {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 24px;
  }

  &__encabezado-logo {
    height: 40px;
    width: auto;
  }

  &__contenedor {
    display: flex;
    height: calc(100vh - 51px);
  }

  &__temas {
    width: 84px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    background-color: var(--color-primario-4);
    overflow-y: auto;

    &--ancho {
      width: 120px;
    }
  }

  &__temas-separador {
    width: 80%;
    border: none;
    border-top: 1px solid var(--texto-inverso);
    opacity: 0.3;
    margin: 4px 0;
    flex-shrink: 0;
  }

  &__tema-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 8px 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--texto-inverso);

    &.activo {
      background-color: var(--color-primario-2);
      border-radius: 8px;
    }

    span[class^='pictograma-'] {
      font-size: 1.6rem;
    }
  }

  &__tema-icono {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  &__tema-nombre {
    font-size: 0.7rem;
    line-height: 1.2;
    text-align: center;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__mapa {
    flex: 1;
    position: relative;
  }

  &__visor {
    height: 100%;
    width: 100%;
  }

  // reorganizacion de botones WMS e info adicional.
  &__control {
    position: absolute;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 4px;

    &--info {
      top: 8px;
      left: 8px;
    }

    &--leyenda {
      bottom: 42px;
      left: 8px;
    }

    &--basemap {
      bottom: 40px;
      right: 8px;
    }
  }

  &__opcion-basemap {
    width: 100%;
    text-align: left;
    margin-bottom: 8px;

    &.activo {
      font-weight: bold;
      border-color: var(--color-primario-1);
    }
  }

  &__leyenda {
    width: 360px;
    overflow-y: auto;
    padding: 16px;
    border-left: 1px solid var(--color-secundario-4);
  }

  &__item-texto {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 0;
    background: none;
    border: none;
    border-bottom: 1px solid var(--color-secundario-4);
    cursor: pointer;
  }

  &__capa {
    padding: 8px 0;
    border-bottom: 1px solid var(--color-secundario-4);
  }

  &__capa-etiqueta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
  }

  &__wms-item {
    padding: 10px 0;
    border-bottom: 1px solid var(--color-secundario-4);

    &:last-child {
      border-bottom: none;
    }
  }

  &__wms-item .estado-carga-capa {
    margin-top: 5px;
    margin-left: 22px;
  }

  &__wms-reintentar {
    margin-top: 4px;
    margin-left: 22px;
    padding: 0;
    color: var(--color-primario-1);
    font-size: 0.78rem;
    text-decoration: underline;
    background: transparent;
    border: none;
    cursor: pointer;

    &:hover {
      text-decoration: none;
    }
  }

  &__capa-titulo {
    margin: 0 0 4px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  &__capa-botones {
    gap: 2px;
    flex-wrap: nowrap;
  }

  &__modal-capa {
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--color-secundario-4);
  }

  &__opacidad-control {
    margin: 8px 0;
    align-items: center;
    gap: 8px;
  }

  &__contenedor-tabla {
    overflow-y: auto;
  }

  &__ventana-info {
    position: absolute;
    z-index: 30;

    // Es más ancho que alto y se adapta al espacio disponible.
    width: clamp(520px, 42vw, 760px);
    max-width: calc(100% - 32px);
    max-height: min(55vh, calc(100% - 32px));

    display: flex;
    flex-direction: column;
    overflow: hidden;

    // Evita que el contenido desaparezca en vista oscura.
    color: #1f1f1f;
    background-color: #ffffff;

    border: 1px solid #b8b8b8;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgb(0 0 0 / 22%);

    &.esta-arrastrando {
      user-select: none;
    }
  }

  &__ventana-info-encabezado {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 16px;
    color: var(--texto-inverso);
    background-color: var(--color-primario-4);
    cursor: grab;
    touch-action: none;

    .esta-arrastrando & {
      cursor: grabbing;
    }
  }

  &__ventana-info-titulo {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.3;
  }

  &__ventana-info-cerrar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    padding: 0;
    color: inherit;
    font-size: 1.7rem;
    line-height: 1;
    background: transparent;
    border: none;
    border-radius: 50%;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background-color: rgb(255 255 255 / 18%);
    }
  }

  &__ventana-info-contenido {
    min-height: 96px;
    padding: 16px;
    overflow: auto;
    overscroll-behavior: contain;
    color: #1f1f1f;
    background-color: #ffffff;

    h3,
    p,
    li,
    strong,
    div {
      color: inherit;
    }
  }
  @media (max-width: 600px) {
    &__ventana-info {
      width: calc(100% - 24px);
      max-height: calc(100% - 24px);
    }

    &__ventana-info-encabezado {
      padding: 10px 12px;
    }

    &__ventana-info-contenido {
      padding: 12px;
    }
  }

  &__texto-error {
    color: var(--texto-error);
  }

  &__texto-info {
    white-space: pre-wrap;
  }
}
</style>
