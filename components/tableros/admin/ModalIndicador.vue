<script setup>
import { basemapsPanorama } from '~/utils/geocontenidos/basemapsPanorama';
import {
  PALETAS,
  PALETA_POR_DEFECTO,
  codificarPaleta,
  decodificarPaleta,
} from '~/utils/tableros/paletas';

/**
 * Editor de indicador: crear y editar en un mismo formulario.
 *
 * Antes eran dos componentes (`ModalNuevoIndicador` y `FormularioIndicador`) que
 * fueron divergiendo: el de edición nunca recibió la capa ni los campos, así que
 * cambiarlos obligaba a borrar el indicador y rehacerlo. Al unificarlos, toda
 * característica configurable existe en ambos modos por construcción.
 */

const props = defineProps({
  siteId: {
    type: Number,
    default: null,
  },
  /** Indicador de DETALLE (`/indicators/{id}/`). `null` = alta. */
  indicador: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['guardado', 'creado', 'cerrar']);

const { data: userData } = useAuth();
const {
  crearIndicador,
  actualizarIndicador,
  recalcularIndicador,
  previsualizarIndicador,
  fetchDatasetAttributes,
  syncDatasetAttributes,
  urlCapaFeatures,
} = useTableroApi();

const esEdicion = computed(() => Boolean(props.indicador?.id));

const modal = ref(null);
const guardando = ref(false);
const recalculando = ref(false);
const error = ref('');
const modalGuardado = ref(null);
const guardadoConExito = ref(false);

const TIPOS_GRAFICA = [
  {
    group: 'Barras',
    options: [
      { value: 'bar', label: 'Barras verticales' },
      { value: 'horizontal_bar', label: 'Barras horizontales' },
      { value: 'histogram', label: 'Histograma' },
    ],
  },
  {
    group: 'Circular',
    options: [
      { value: 'donut', label: 'Dona' },
      { value: 'pie', label: 'Pastel (pie)' },
    ],
  },
  {
    group: 'Líneas y área',
    options: [
      { value: 'line', label: 'Línea' },
      { value: 'area', label: 'Área' },
    ],
  },
  {
    group: 'Otros',
    options: [
      { value: 'scatter', label: 'Dispersión (scatter)' },
      { value: 'gauge', label: 'Gauge' },
      { value: 'radar', label: 'Radar' },
      { value: 'treemap', label: 'Mapa de árbol' },
    ],
  },
];

const METODOS = [
  { value: 'quantil', label: 'Cuantiles' },
  { value: 'naturalb', label: 'Jenks (natural breaks)' },
  { value: 'sameintervals', label: 'Intervalos iguales' },
];

// Indicadores creados antes del fix pueden tener guardados los valores en inglés
// (quantile/jenks/equal) que el backend no reconoce; se normalizan al cargar.
const METODOS_LEGADO = { quantile: 'quantil', jenks: 'naturalb', equal: 'sameintervals' };

const GEO_ATTRS = new Set(['the_geom', 'geometry', 'geom', 'wkb_geometry', 'shape']);

const MAP_PANEL_DEFAULT = 65;

const formulario = reactive({
  name: '',
  info_text: '',
  layer: null,
  layer_id_field: '',
  field_one: '',
  field_two: '',
  use_single_field: true,
  is_histogram: false,
  plot_type: 'bar',
  category_method: 'quantil',
  field_category: 5,
  colors: PALETA_POR_DEFECTO,
  reverse_colors: false,
  show_general_values: false,
  high_values_percentage: 10,
  map_basemap: 'gray',
  map_zoom: null,
  map_center_lat: null,
  map_center_long: null,
  map_bbox_x0: null,
  map_bbox_y0: null,
  map_bbox_x1: null,
  map_bbox_y1: null,
  map_panel: MAP_PANEL_DEFAULT,
  plot_panel: 100 - MAP_PANEL_DEFAULT,
});

// ─── Capa y atributos ────────────────────────────────────────────────────────

const capaSeleccionada = ref(null);
const cambiandoCapa = ref(false);
const atributos = ref([]);
const cargandoAtributos = ref(false);
const errorAtributos = ref(false);
const sincronizandoAtributos = ref(false);
const errorSincronizacion = ref('');

const mostrarSelectorCapa = computed(() => !capaSeleccionada.value || cambiandoCapa.value);

async function cargarAtributos(pk) {
  cargandoAtributos.value = true;
  errorAtributos.value = false;
  try {
    const data = await fetchDatasetAttributes(pk);
    const dataset = data?.dataset ?? data;
    if (dataset?.title && capaSeleccionada.value) {
      capaSeleccionada.value.title = dataset.title;
    }
    const attrs = dataset?.attribute_set ?? [];
    atributos.value = attrs.filter((a) => !GEO_ATTRS.has(a.attribute));
    return dataset;
  } catch {
    errorAtributos.value = true;
    atributos.value = [];
    return null;
  } finally {
    cargandoAtributos.value = false;
  }
}

async function alSeleccionarCapa(capa) {
  const cambia = capaSeleccionada.value && capaSeleccionada.value.pk !== capa.pk;

  capaSeleccionada.value = capa;
  formulario.layer = capa.pk;
  if (!formulario.name) formulario.name = capa.title || '';
  cambiandoCapa.value = false;
  errorSincronizacion.value = '';

  // Los campos pertenecen al esquema de la capa anterior: dejarlos puestos
  // produciría un recálculo contra columnas inexistentes.
  if (cambia) {
    formulario.layer_id_field = '';
    formulario.field_one = '';
    formulario.field_two = '';
    limpiarPrevisualizacion();
  }

  atributos.value = [];
  await cargarAtributos(capa.pk);
}

async function sincronizarAtributos() {
  if (!capaSeleccionada.value) return;
  sincronizandoAtributos.value = true;
  errorSincronizacion.value = '';
  try {
    const data = await syncDatasetAttributes(
      capaSeleccionada.value.pk,
      userData.value?.accessToken
    );
    if (data?.attributes?.length) {
      atributos.value = data.attributes.filter((a) => !GEO_ATTRS.has(a.attribute));
    } else if (data?.error === 'wfs_no_disponible') {
      errorSincronizacion.value =
        'El servicio WFS remoto no está disponible en este momento. ' +
        'Inténtalo más tarde o contacta al administrador del recurso.';
    } else {
      errorSincronizacion.value =
        data?.detail || 'No se encontraron atributos en el servicio remoto para esta capa.';
    }
  } catch {
    errorSincronizacion.value =
      'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
  } finally {
    sincronizandoAtributos.value = false;
  }
}

// ─── Previsualización ────────────────────────────────────────────────────────

const previsualizacion = ref(null);
const previsualizando = ref(false);
const errorPrevisualizacion = ref('');

const featuresUrl = computed(() => (formulario.layer ? urlCapaFeatures(formulario.layer) : null));

const configuracionCompleta = computed(() =>
  Boolean(formulario.layer && formulario.layer_id_field && formulario.field_one)
);

/**
 * Lo que consume `TablerosIndicador`. Se arma con la misma forma que devuelve
 * `view-data`, para que la previsualización sea exactamente lo que verá el visor.
 */
const datosPrevisualizacion = computed(() => {
  const p = previsualizacion.value;
  return {
    plot_values: p?.plot_values ?? null,
    map_values: p?.map_values ?? null,
    plot_config: p?.plot_config ?? null,
    layer_id_field: formulario.layer_id_field,
    layer_name: p?.layer_name ?? capaSeleccionada.value?.alternate ?? null,
    bbox: p?.bbox ?? null,
    info_text: formulario.info_text,
    use_filter: false,
    filters: {},
    info_boxes: [],
  };
});

/** Vista que el mapa usará la próxima vez que se monte. Siempre al día. */
const vistaConfigurada = computed(() => ({
  zoom: formulario.map_zoom,
  centerLat: formulario.map_center_lat,
  centerLong: formulario.map_center_long,
  bbox: bboxFormulario(),
}));

/**
 * Reencuadrar el mapa se pide con este contador, y **solo** desde una edición
 * manual de los campos de vista o desde el botón de restablecer.
 *
 * Deducirlo de que los valores cambiaron no funciona: el propio mapa los escribe
 * al navegarlo, y también al cambiar de tamaño (mover el reparto dispara un
 * `moveend`). Reencuadrar entonces lo devolvería donde ya está y, encadenado,
 * degenera en remontes en cascada que dejan la interfaz sin responder.
 */
const revisionVista = ref(0);

function pedirReencuadre() {
  revisionVista.value += 1;
}

/** Rampa efectiva (ya invertida si aplica) tal como la calculó el backend. */
const swatches = computed(
  () => previsualizacion.value?.plot_config?.ranges?.map((r) => r.color) ?? []
);

function bboxFormulario() {
  const v = [
    formulario.map_bbox_x0,
    formulario.map_bbox_y0,
    formulario.map_bbox_x1,
    formulario.map_bbox_y1,
  ];
  return v.every((n) => n !== null && n !== undefined && isFinite(Number(n)))
    ? v.map(Number)
    : null;
}

function limpiarPrevisualizacion() {
  previsualizacion.value = null;
  errorPrevisualizacion.value = '';
}

async function previsualizar() {
  if (!configuracionCompleta.value) return;
  previsualizando.value = true;
  errorPrevisualizacion.value = '';
  try {
    const data = await previsualizarIndicador(
      {
        layer: formulario.layer,
        layer_id_field: formulario.layer_id_field,
        field_one: formulario.field_one,
        field_two: formulario.field_two || '',
        use_single_field: formulario.use_single_field,
        category_method: formulario.category_method,
        field_category: formulario.field_category,
        colors: codificarPaleta(formulario.colors, formulario.reverse_colors),
        plot_type: formulario.plot_type,
        name: formulario.name,
      },
      userData.value?.accessToken
    );
    if (data?.error || data?.detail) {
      errorPrevisualizacion.value = data.error || data.detail;
      previsualizacion.value = null;
      return;
    }
    previsualizacion.value = data;
  } catch (e) {
    errorPrevisualizacion.value = e?.message || 'No se pudo generar la previsualización.';
  } finally {
    previsualizando.value = false;
  }
}

// Auto-previsualización: el cálculo consulta la base de datos, así que se espera
// a que el usuario deje de tocar controles antes de disparar.
let temporizadorPreview = null;
watch(
  () => [
    formulario.layer,
    formulario.layer_id_field,
    formulario.field_one,
    formulario.field_two,
    formulario.use_single_field,
    formulario.category_method,
    formulario.field_category,
    formulario.colors,
    formulario.reverse_colors,
    formulario.plot_type,
  ],
  () => {
    if (!configuracionCompleta.value) return;
    clearTimeout(temporizadorPreview);
    temporizadorPreview = setTimeout(previsualizar, 700);
  }
);

// ─── Vista del mapa ──────────────────────────────────────────────────────────

const vistaTomadaDelMapa = ref(false);

/**
 * Navegar el mapa **es** configurar la vista: cada desplazamiento o acercamiento
 * queda como lo que se guardará. Se registran centro, zoom y extensión — el visor
 * prefiere centro+zoom y usa la extensión de respaldo.
 *
 * `MapaIndicador` ya descarta el eco que emite al montarse, así que aquí solo
 * llegan movimientos reales del usuario y ajustes de tamaño del propio mapa.
 * Escribir estos campos nunca reencuadra: ver `revisionVista`.
 */
function alMoverVista(evento) {
  if (!evento) return;

  const { centro, acercamiento, vista: vistaOl } = evento;

  if (Array.isArray(centro) && centro.length >= 2) {
    formulario.map_center_long = Number(Number(centro[0]).toFixed(6));
    formulario.map_center_lat = Number(Number(centro[1]).toFixed(6));
  }
  if (isFinite(Number(acercamiento))) {
    formulario.map_zoom = Number(Number(acercamiento).toFixed(1));
  }

  try {
    const [x0, y0, x1, y1] = vistaOl.calculateExtent().map((n) => Number(n.toFixed(6)));
    formulario.map_bbox_x0 = x0;
    formulario.map_bbox_y0 = y0;
    formulario.map_bbox_x1 = x1;
    formulario.map_bbox_y1 = y1;
  } catch {
    // Sin extensión disponible basta con centro y zoom.
  }

  vistaTomadaDelMapa.value = true;
}

function restablecerVista() {
  formulario.map_zoom = null;
  formulario.map_center_lat = null;
  formulario.map_center_long = null;
  formulario.map_bbox_x0 = null;
  formulario.map_bbox_y0 = null;
  formulario.map_bbox_x1 = null;
  formulario.map_bbox_y1 = null;
  vistaTomadaDelMapa.value = false;
  pedirReencuadre();
}

const tieneVistaPropia = computed(
  () =>
    formulario.map_zoom !== null || formulario.map_center_lat !== null || bboxFormulario() !== null
);

// ─── Reparto de ancho ────────────────────────────────────────────────────────

/** Un único control evita estados inválidos: el backend exige que sumen 100. */
function alCambiarReparto(valor) {
  const mapa = Math.min(80, Math.max(20, Number(valor) || MAP_PANEL_DEFAULT));
  formulario.map_panel = mapa;
  formulario.plot_panel = 100 - mapa;
}

function restablecerReparto() {
  alCambiarReparto(MAP_PANEL_DEFAULT);
}

// ─── Carga inicial ───────────────────────────────────────────────────────────

async function cargarDesdeIndicador() {
  const ind = props.indicador;
  if (!ind) return;

  formulario.name = ind.name || '';
  formulario.info_text = ind.info_text || '';
  formulario.layer = ind.layer ?? null;
  formulario.layer_id_field = ind.layer_id_field || '';
  formulario.field_one = ind.field_one || '';
  formulario.field_two = ind.field_two || '';
  formulario.use_single_field = ind.use_single_field ?? true;
  formulario.is_histogram = ind.is_histogram ?? false;
  formulario.plot_type = ind.plot_type || 'bar';

  const paleta = decodificarPaleta(ind.colors);
  formulario.colors = paleta.base || PALETA_POR_DEFECTO;
  formulario.reverse_colors = paleta.invertida;

  const metodo = ind.category_method || 'quantil';
  formulario.category_method = METODOS_LEGADO[metodo] || metodo;
  formulario.field_category = ind.field_category ?? 5;
  formulario.show_general_values = ind.show_general_values ?? false;
  formulario.high_values_percentage = ind.high_values_percentage ?? 10;

  formulario.map_basemap = ind.map_basemap || 'gray';
  formulario.map_zoom = ind.map_zoom ?? null;
  formulario.map_center_lat = ind.map_center_lat ?? null;
  formulario.map_center_long = ind.map_center_long ?? null;
  formulario.map_bbox_x0 = ind.map_bbox_x0 ?? null;
  formulario.map_bbox_y0 = ind.map_bbox_y0 ?? null;
  formulario.map_bbox_x1 = ind.map_bbox_x1 ?? null;
  formulario.map_bbox_y1 = ind.map_bbox_y1 ?? null;
  formulario.map_panel = ind.map_panel ?? MAP_PANEL_DEFAULT;
  formulario.plot_panel = ind.plot_panel ?? 100 - (ind.map_panel ?? MAP_PANEL_DEFAULT);

  if (ind.layer) {
    const dataset = await cargarAtributos(ind.layer);
    capaSeleccionada.value = dataset
      ? {
          pk: dataset.pk ?? ind.layer,
          title: dataset.title,
          alternate: dataset.alternate,
          thumbnail_url: dataset.thumbnail_url,
        }
      : { pk: ind.layer, title: `Capa #${ind.layer}`, alternate: null };
  }
}

watch(
  () => modal.value,
  async (m) => {
    if (!m) return;
    await cargarDesdeIndicador();
    m.abrir();
    if (configuracionCompleta.value) previsualizar();
  }
);

onBeforeUnmount(() => clearTimeout(temporizadorPreview));

// ─── Guardado ────────────────────────────────────────────────────────────────

/**
 * Los colores que se pintan no salen de `colors`: viven ya materializados como hex
 * en `plot_config.ranges[].color` y `map_values[fid].color`. Cambiar la paleta, la
 * clasificación, la capa o los campos solo los regenera si además se recalcula.
 */
function requiereRecalculo(colorsValue) {
  const original = props.indicador;
  if (!original) return true;

  const metodoOriginal =
    METODOS_LEGADO[original.category_method] || original.category_method || 'quantil';

  return (
    colorsValue !== original.colors ||
    Number(formulario.layer) !== Number(original.layer) ||
    formulario.layer_id_field !== (original.layer_id_field || '') ||
    formulario.field_one !== (original.field_one || '') ||
    (formulario.field_two || '') !== (original.field_two || '') ||
    formulario.plot_type !== original.plot_type ||
    formulario.category_method !== metodoOriginal ||
    Number(formulario.field_category) !== Number(original.field_category ?? 5) ||
    formulario.use_single_field !== (original.use_single_field ?? true) ||
    Boolean(original.use_custom_colors)
  );
}

function construirPayload(colorsValue) {
  return {
    name: formulario.name,
    info_text: formulario.info_text,
    layer: formulario.layer ? Number(formulario.layer) : null,
    layer_id_field: formulario.layer_id_field,
    field_one: formulario.field_one,
    field_two: formulario.field_two || '',
    use_single_field: formulario.use_single_field,
    is_histogram: formulario.is_histogram,
    plot_type: formulario.plot_type,
    category_method: formulario.category_method,
    field_category: formulario.field_category,
    colors: colorsValue,
    // Si hay `custom_colors`, el backend ignora por completo la paleta elegida.
    // Elegir paleta aquí es una decisión explícita, así que se descartan.
    use_custom_colors: false,
    custom_colors: '',
    show_general_values: formulario.show_general_values,
    high_values_percentage: formulario.high_values_percentage,
    map_basemap: formulario.map_basemap,
    map_zoom: formulario.map_zoom,
    map_center_lat: formulario.map_center_lat,
    map_center_long: formulario.map_center_long,
    map_bbox_x0: formulario.map_bbox_x0,
    map_bbox_y0: formulario.map_bbox_y0,
    map_bbox_x1: formulario.map_bbox_x1,
    map_bbox_y1: formulario.map_bbox_y1,
    map_panel: formulario.map_panel,
    plot_panel: formulario.plot_panel,
  };
}

async function guardar() {
  error.value = '';

  if (!configuracionCompleta.value) {
    error.value = 'Selecciona una capa y sus campos antes de guardar.';
    return;
  }

  guardando.value = true;
  try {
    const token = userData.value?.accessToken;
    const colorsValue = codificarPaleta(formulario.colors, formulario.reverse_colors);
    const payload = construirPayload(colorsValue);
    const recalcular = requiereRecalculo(colorsValue);

    const data = esEdicion.value
      ? await actualizarIndicador(props.indicador.id, payload, token)
      : await crearIndicador({ ...payload, site: props.siteId, stack_order: 1 }, token);

    if (!data?.id) {
      error.value = data?.detail || JSON.stringify(data);
      return;
    }

    let avisoRecalculo = '';
    if (recalcular) {
      guardando.value = false;
      recalculando.value = true;
      avisoRecalculo = await recalcularColores(data.id, token);
      recalculando.value = false;
    }

    emit(esEdicion.value ? 'guardado' : 'creado', { ...data, avisoRecalculo });
    guardadoConExito.value = true;
    modalGuardado.value?.abrir();
    setTimeout(() => {
      modalGuardado.value?.cerrar();
      modal.value?.cerrar();
    }, 1200);
  } catch (e) {
    error.value = e?.message || 'Error al guardar el indicador';
  } finally {
    guardando.value = false;
    recalculando.value = false;
  }
}

/**
 * Un fallo aquí no invalida el guardado (la configuración ya quedó persistida),
 * así que se devuelve como aviso en vez de propagarse como error.
 * @returns {Promise<string>} mensaje de aviso, o cadena vacía si todo salió bien
 */
async function recalcularColores(id, token) {
  try {
    const resultado = await recalcularIndicador(id, token);
    if (resultado?.status === 'ok') return '';
    return (
      resultado?.error || resultado?.detail || 'No se pudieron calcular los colores del indicador.'
    );
  } catch (e) {
    return e?.message || 'No se pudo conectar con el servidor para calcular los colores.';
  }
}

function alCambiarVisibilidadPestania() {
  if (document.visibilityState === 'visible' && capaSeleccionada.value?.pk) {
    cargarAtributos(capaSeleccionada.value.pk);
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', alCambiarVisibilidadPestania);
});

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', alCambiarVisibilidadPestania);
});
</script>

<template>
  <ClientOnly>
    <TablerosAdminModalBase ref="modal" ancho="1280px" adaptar-tema @cerrar="emit('cerrar')">
      <template #encabezado>
        <h2>{{ esEdicion ? 'Editar indicador' : 'Nuevo indicador' }}</h2>
      </template>

      <template #cuerpo>
        <form class="editor-indicador" @submit.prevent="guardar">
          <div class="editor-indicador__cols">
            <!-- ══ Columna de configuración ══ -->
            <div class="editor-indicador__form">
              <div class="seccion-titulo">Identificación</div>
              <div class="campo m-b-2">
                <label for="ind-nombre">
                  Nombre del indicador <span class="requerido">*</span>
                </label>
                <input id="ind-nombre" v-model="formulario.name" type="text" required />
              </div>
              <div class="campo">
                <label for="ind-info">Texto descriptivo</label>
                <textarea
                  id="ind-info"
                  v-model="formulario.info_text"
                  rows="2"
                  placeholder="Descripción del indicador, metodología, fuente..."
                />
              </div>

              <!-- ── Capa ── -->
              <div class="seccion-titulo m-t-4">Capa de datos</div>

              <div v-if="capaSeleccionada && !cambiandoCapa" class="capa-elegida">
                <span v-if="capaSeleccionada.thumbnail_url" class="capa-elegida__thumb">
                  <img :src="capaSeleccionada.thumbnail_url" :alt="capaSeleccionada.title" />
                </span>
                <span class="capa-elegida__info">
                  <strong>{{ capaSeleccionada.title }}</strong>
                  <span v-if="capaSeleccionada.alternate" class="formulario-ayuda monospace">
                    {{ capaSeleccionada.alternate }}
                  </span>
                </span>
                <button
                  type="button"
                  class="boton boton-chico boton-secundario"
                  @click="cambiandoCapa = true"
                >
                  Cambiar capa
                </button>
              </div>

              <template v-if="mostrarSelectorCapa">
                <p v-if="esEdicion && cambiandoCapa" class="formulario-ayuda color-error m-b-1">
                  Al cambiar la capa se limpian los campos y el indicador se recalcula por completo
                  al guardar.
                </p>
                <TablerosAdminSelectorCapa
                  :model-value="capaSeleccionada"
                  @update:model-value="alSeleccionarCapa"
                />
                <button
                  v-if="capaSeleccionada && cambiandoCapa"
                  type="button"
                  class="boton boton-chico boton-secundario m-t-1"
                  @click="cambiandoCapa = false"
                >
                  Conservar la capa actual
                </button>
              </template>

              <!-- ── Campos ── -->
              <template v-if="capaSeleccionada && !cambiandoCapa">
                <p v-if="errorAtributos" class="formulario-ayuda color-error m-t-2">
                  No se pudieron cargar los campos de la capa.
                </p>

                <div
                  v-if="!cargandoAtributos && !errorAtributos && !atributos.length"
                  class="sin-atributos"
                >
                  <p class="formulario-ayuda">
                    Este recurso no tiene atributos registrados. Puedes sincronizarlos desde el
                    servicio de origen.
                  </p>
                  <button
                    type="button"
                    class="boton boton-secundario boton-chico"
                    :disabled="sincronizandoAtributos"
                    @click="sincronizarAtributos"
                  >
                    {{ sincronizandoAtributos ? 'Sincronizando...' : 'Sincronizar atributos' }}
                  </button>
                  <p v-if="errorSincronizacion" class="formulario-ayuda color-error">
                    {{ errorSincronizacion }}
                  </p>
                </div>

                <div class="seccion-titulo m-t-3">Campos</div>
                <div class="form-grid-3">
                  <div class="campo">
                    <label for="ind-field-id">
                      Campo ID de geometría <span class="requerido">*</span>
                    </label>
                    <select
                      id="ind-field-id"
                      v-model="formulario.layer_id_field"
                      :disabled="cargandoAtributos || !atributos.length"
                      required
                    >
                      <option value="" disabled>
                        {{
                          cargandoAtributos
                            ? 'Cargando...'
                            : !atributos.length
                              ? 'Sin atributos'
                              : 'Selecciona'
                        }}
                      </option>
                      <option v-for="a in atributos" :key="a.attribute" :value="a.attribute">
                        {{ a.attribute }}
                      </option>
                    </select>
                  </div>
                  <div class="campo">
                    <label for="ind-field-one">
                      Campo principal <span class="requerido">*</span>
                    </label>
                    <select
                      id="ind-field-one"
                      v-model="formulario.field_one"
                      :disabled="cargandoAtributos || !atributos.length"
                      required
                    >
                      <option value="" disabled>
                        {{
                          cargandoAtributos
                            ? 'Cargando...'
                            : !atributos.length
                              ? 'Sin atributos'
                              : 'Selecciona'
                        }}
                      </option>
                      <option v-for="a in atributos" :key="a.attribute" :value="a.attribute">
                        {{ a.attribute }}{{ a.attribute_type ? ` (${a.attribute_type})` : '' }}
                      </option>
                    </select>
                  </div>
                  <div class="campo">
                    <label for="ind-field-two">Campo secundario</label>
                    <select
                      id="ind-field-two"
                      v-model="formulario.field_two"
                      :disabled="cargandoAtributos || !atributos.length"
                    >
                      <option value="">— ninguno —</option>
                      <option v-for="a in atributos" :key="a.attribute" :value="a.attribute">
                        {{ a.attribute }}{{ a.attribute_type ? ` (${a.attribute_type})` : '' }}
                      </option>
                    </select>
                  </div>
                </div>
              </template>

              <!-- ── Clasificación ── -->
              <div class="seccion-titulo m-t-4">Clasificación</div>
              <div class="form-grid-2">
                <div class="campo">
                  <label for="ind-method">Método</label>
                  <select id="ind-method" v-model="formulario.category_method">
                    <option v-for="m in METODOS" :key="m.value" :value="m.value">
                      {{ m.label }}
                    </option>
                  </select>
                </div>
                <div class="campo">
                  <label for="ind-clases">Número de clases</label>
                  <input
                    id="ind-clases"
                    v-model.number="formulario.field_category"
                    type="number"
                    min="2"
                    max="10"
                  />
                </div>
              </div>
              <div class="campo m-t-2">
                <label for="ind-high-pct">% de geometrías a recuperar (top values)</label>
                <input
                  id="ind-high-pct"
                  v-model.number="formulario.high_values_percentage"
                  type="number"
                  min="1"
                  max="100"
                />
              </div>

              <!-- ── Visualización ── -->
              <div class="seccion-titulo m-t-4">Visualización</div>
              <div class="form-grid-2">
                <div class="campo">
                  <label for="ind-paleta">Paleta de colores</label>
                  <select id="ind-paleta" v-model="formulario.colors">
                    <optgroup v-for="g in PALETAS" :key="g.group" :label="g.group">
                      <option v-for="p in g.options" :key="p.value" :value="p.value">
                        {{ p.label }}
                      </option>
                    </optgroup>
                  </select>
                  <label
                    class="opcion-toggle opcion-toggle--chica m-t-1"
                    :class="{ 'opcion-toggle--activa': formulario.reverse_colors }"
                  >
                    <input
                      v-model="formulario.reverse_colors"
                      class="opcion-toggle__input"
                      type="checkbox"
                      role="switch"
                    />
                    <span class="opcion-toggle__contenido">
                      <strong>Invertir paleta</strong>
                    </span>
                    <span class="opcion-toggle__estado" aria-hidden="true">
                      {{ formulario.reverse_colors ? 'Activado' : 'Desactivado' }}
                    </span>
                  </label>
                  <ul v-if="swatches.length" class="swatches" aria-label="Colores de la rampa">
                    <li
                      v-for="(color, i) in swatches"
                      :key="`${color}-${i}`"
                      class="swatches__item"
                      :style="{ background: color }"
                      :title="color"
                    />
                  </ul>
                </div>
                <div class="campo">
                  <label for="ind-tipo">Tipo de gráfica</label>
                  <select id="ind-tipo" v-model="formulario.plot_type">
                    <optgroup v-for="g in TIPOS_GRAFICA" :key="g.group" :label="g.group">
                      <option v-for="t in g.options" :key="t.value" :value="t.value">
                        {{ t.label }}
                      </option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <!-- ── Vista del mapa ── -->
              <div class="seccion-titulo m-t-4">Vista del mapa</div>
              <div class="form-grid-2">
                <div class="campo">
                  <label for="ind-basemap">Mapa base</label>
                  <select id="ind-basemap" v-model="formulario.map_basemap">
                    <option v-for="b in basemapsPanorama" :key="b.id" :value="b.id">
                      {{ b.label }}
                    </option>
                  </select>
                </div>
                <div class="campo">
                  <label for="ind-zoom">Acercamiento (zoom)</label>
                  <!-- `change` y no `input`: reencuadrar en cada tecla remontaría
                       el mapa con valores a medio escribir. -->
                  <input
                    id="ind-zoom"
                    v-model.number="formulario.map_zoom"
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    placeholder="Automático"
                    @change="pedirReencuadre"
                  />
                </div>
              </div>
              <div class="form-grid-2 m-t-2">
                <div class="campo">
                  <label for="ind-lat">Latitud del centro</label>
                  <input
                    id="ind-lat"
                    v-model.number="formulario.map_center_lat"
                    type="number"
                    step="0.000001"
                    placeholder="Automático"
                    @change="pedirReencuadre"
                  />
                </div>
                <div class="campo">
                  <label for="ind-long">Longitud del centro</label>
                  <input
                    id="ind-long"
                    v-model.number="formulario.map_center_long"
                    type="number"
                    step="0.000001"
                    placeholder="Automático"
                    @change="pedirReencuadre"
                  />
                </div>
              </div>
              <p class="formulario-ayuda m-t-1">
                Extensión (bbox):
                <template v-if="bboxFormulario()">
                  <span class="monospace">{{ bboxFormulario().join(', ') }}</span>
                </template>
                <template v-else>sin definir — se usa la extensión de la capa.</template>
              </p>
              <p class="formulario-ayuda">
                <span v-if="vistaTomadaDelMapa">
                  Tomado de la previsualización. Sigue navegando el mapa para ajustarlo.
                </span>
                <span v-else>
                  Navega la previsualización para fijar estos valores, o escríbelos aquí.
                </span>
              </p>
              <div class="acciones-vista m-t-1">
                <button
                  type="button"
                  class="boton boton-chico boton-secundario"
                  :disabled="!tieneVistaPropia"
                  @click="restablecerVista"
                >
                  Restablecer a la extensión de la capa
                </button>
              </div>

              <!-- ── Opciones ── -->
              <div class="seccion-titulo m-t-4">Opciones</div>
              <div class="opciones-configuracion">
                <label
                  class="opcion-toggle"
                  :class="{ 'opcion-toggle--activa': formulario.use_single_field }"
                >
                  <input
                    v-model="formulario.use_single_field"
                    class="opcion-toggle__input"
                    type="checkbox"
                    role="switch"
                  />
                  <span class="opcion-toggle__contenido">
                    <strong>Usar campo único para gráfica</strong>
                    <span>
                      Usa solamente el campo principal. Desactívalo para agrupar por el campo
                      principal y sumar los valores del campo secundario.
                    </span>
                  </span>
                  <span class="opcion-toggle__estado" aria-hidden="true">
                    {{ formulario.use_single_field ? 'Activado' : 'Desactivado' }}
                  </span>
                </label>

                <label
                  class="opcion-toggle"
                  :class="{ 'opcion-toggle--activa': formulario.show_general_values }"
                >
                  <input
                    v-model="formulario.show_general_values"
                    class="opcion-toggle__input"
                    type="checkbox"
                    role="switch"
                  />
                  <span class="opcion-toggle__contenido">
                    <strong>Mostrar valores generales</strong>
                    <span>
                      Calcula cifras resumidas que pueden utilizar los cuadros de datos del
                      indicador.
                    </span>
                  </span>
                  <span class="opcion-toggle__estado" aria-hidden="true">
                    {{ formulario.show_general_values ? 'Activado' : 'Desactivado' }}
                  </span>
                </label>
              </div>
            </div>

            <!-- ══ Columna de previsualización ══ -->
            <aside class="editor-indicador__preview">
              <div class="preview-cabecera">
                <h3>Previsualización</h3>
                <button
                  type="button"
                  class="boton boton-chico boton-secundario"
                  :disabled="!configuracionCompleta || previsualizando"
                  @click="previsualizar"
                >
                  {{ previsualizando ? 'Calculando...' : 'Actualizar' }}
                </button>
              </div>

              <p v-if="!formulario.layer" class="formulario-ayuda">
                Selecciona una capa para ver el mapa.
              </p>
              <p v-else-if="!configuracionCompleta" class="formulario-ayuda">
                Elige el campo ID y el campo principal para ver la tematización y la gráfica.
              </p>
              <p v-if="errorPrevisualizacion" class="formulario-ayuda color-error">
                {{ errorPrevisualizacion }}
              </p>

              <TablerosIndicador
                v-if="formulario.layer"
                class="preview-indicador"
                :nombre="formulario.name"
                :datos="datosPrevisualizacion"
                :features-url="featuresUrl"
                :basemap="formulario.map_basemap"
                :vista-configurada="vistaConfigurada"
                :map-panel="formulario.map_panel"
                :plot-panel="formulario.plot_panel"
                :revision-vista="revisionVista"
                emitir-vista
                @vista="alMoverVista"
              />

              <!-- El reparto vive aquí, pegado a lo que reacomoda. -->
              <div class="reparto">
                <label class="reparto__etiqueta" for="ind-reparto">
                  <span>Reparto de pantalla</span>
                  <span class="reparto__cifras">
                    Mapa {{ formulario.map_panel }}% · Gráfica {{ formulario.plot_panel }}%
                  </span>
                </label>
                <div class="reparto__control">
                  <input
                    id="ind-reparto"
                    type="range"
                    min="20"
                    max="80"
                    step="5"
                    :value="formulario.map_panel"
                    :aria-valuetext="`Mapa ${formulario.map_panel} por ciento`"
                    @input="alCambiarReparto($event.target.value)"
                  />
                  <!-- Etiqueta verbal, no numérica: un "65 / 35" junto a las
                       cifras actuales se lee como un segundo valor en conflicto. -->
                  <button
                    type="button"
                    class="boton boton-chico boton-secundario"
                    title="Volver al reparto por defecto (65 / 35)"
                    :disabled="formulario.map_panel === MAP_PANEL_DEFAULT"
                    @click="restablecerReparto"
                  >
                    Restablecer
                  </button>
                </div>
                <p class="formulario-ayuda">
                  Ancho que ocupa cada componente en el visor. En pantallas angostas se apilan.
                </p>
              </div>
            </aside>
          </div>

          <p v-if="error" class="color-error m-t-2">{{ error }}</p>

          <div class="acciones-modal">
            <button type="button" class="boton boton-secundario" @click="emit('cerrar')">
              Cancelar
            </button>
            <input
              type="submit"
              class="boton boton-primario"
              :value="
                recalculando
                  ? 'Calculando colores...'
                  : guardando
                    ? 'Guardando...'
                    : esEdicion
                      ? 'Guardar cambios'
                      : 'Crear indicador'
              "
              :disabled="guardando || recalculando"
            />
          </div>
        </form>
      </template>
    </TablerosAdminModalBase>

    <GeocontenidosSisdaiModal ref="modalGuardado" :permitir-cerrar="false">
      <template #encabezado>
        <h2 class="m-t-0">Indicador guardado</h2>
      </template>

      <p v-if="guardadoConExito" class="texto-color-exito">
        <span class="pictograma-aprobado m-r-1" />
        El indicador se guardó correctamente.
      </p>
    </GeocontenidosSisdaiModal>
  </ClientOnly>
</template>

<style lang="scss" scoped>
.editor-indicador {
  color: var(--tableros-modal-texto, inherit);

  &__cols {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.5rem;
    align-items: start;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr;
    }
  }

  &__form {
    min-width: 0;
  }

  &__preview {
    min-width: 0;
    position: sticky;
    top: 0;
    padding: 0.75rem;
    border: 1px solid var(--tableros-modal-control-borde, #ccc);
    border-radius: 8px;
    background: var(--tableros-modal-superficie-suave, #f7f7f7);
  }
}

.preview-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;

  h3 {
    margin: 0;
    font-size: 0.95rem;
  }
}

.preview-indicador {
  // El componente del visor trae su propio padding y ancho máximo; aquí estorban.
  :deep(.tablero-indicador) {
    padding: 0;
    max-width: none;
  }

  :deep(.mapa-indicador),
  :deep(.mapa-indicador .gema) {
    min-height: 320px;
    height: 320px;
  }

  :deep(.tablero-indicador__grafica) {
    height: 320px;
  }
}

.seccion-titulo {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--tableros-modal-texto-secundario, var(--color-texto-secundario, #777));
  border-bottom: 1px solid var(--tableros-modal-control-borde, var(--color-borde, #e8e8e8));
  padding-bottom: 4px;
  margin-bottom: 1rem;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.check-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.capa-elegida {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 8px 12px;
  border: 1px solid var(--tableros-modal-control-borde, #ccc);
  border-radius: 6px;
  background: var(--tableros-modal-superficie-suave, #fcf3f5);

  &__thumb {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    border-radius: 4px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-wrap: anywhere;
  }
}

.sin-atributos {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.swatches {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
  border-radius: 4px;
  overflow: hidden;

  &__item {
    flex: 1;
    height: 14px;
  }
}

.acciones-vista {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reparto {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--tableros-modal-control-borde, #ccc);

  &__etiqueta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    font-size: 0.85rem;
    font-weight: 600;
  }

  &__cifras {
    font-weight: 400;
    color: var(--tableros-modal-texto-secundario, #666);
  }

  &__control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.35rem;

    input[type='range'] {
      flex: 1;
      min-width: 0;
      accent-color: var(--tableros-modal-acento, #991f47);
    }
  }
}

.acciones-modal {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--tableros-modal-control-borde, var(--color-borde, #e8e8e8));
}

.campo input:not([type='checkbox']):not([type='range']),
.campo textarea,
.campo select {
  background: var(--tableros-modal-control-fondo, #ffffff);
  border-color: var(--tableros-modal-control-borde, #cccccc);
  color: var(--tableros-modal-texto, inherit);
}

.campo input::placeholder,
.campo textarea::placeholder {
  color: var(--tableros-modal-placeholder, #777777);
  opacity: 1;
}

.campo select option,
.campo select optgroup {
  background: var(--tableros-modal-control-fondo, #ffffff);
  color: var(--tableros-modal-texto, inherit);
}

.check-inline input[type='checkbox'] {
  accent-color: var(--color-primario-2, #cc7a88);
}

.opciones-configuracion {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.opcion-toggle {
  position: relative;
  width: 100%;
  min-height: 72px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--tableros-modal-control-borde, #cccccc);
  border-radius: 8px;
  background: var(--tableros-modal-superficie-suave, #f7f7f7);
  color: var(--tableros-modal-texto, inherit);
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    background: var(--tableros-modal-hover-fondo, #fcf3f5);
    border-color: var(--tableros-modal-acento, #991f47);
  }

  &:focus-within {
    outline: 2px solid var(--tableros-modal-acento, #991f47);
    outline-offset: 2px;
  }

  &--activa {
    background: var(--tableros-modal-acento-suave, #f8e1e8);
    border-color: var(--tableros-modal-acento, #991f47);
    box-shadow: inset 4px 0 0 var(--tableros-modal-acento, #991f47);

    .opcion-toggle__estado {
      background: var(--tableros-modal-acento, #991f47);
      border-color: var(--tableros-modal-acento, #991f47);
      color: var(--tableros-modal-fondo, #ffffff);
    }
  }

  &__input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  &__contenido {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    pointer-events: none;

    strong {
      color: var(--tableros-modal-texto, inherit);
      font-size: 0.92rem;
      font-weight: 700;
    }

    span {
      color: var(--tableros-modal-texto-secundario, #666666);
      font-size: 0.8rem;
      line-height: 1.35;
    }
  }

  &__estado {
    min-width: 92px;
    display: inline-flex;
    justify-content: center;
    padding: 0.35rem 0.65rem;
    border: 1px solid var(--tableros-modal-control-borde, #cccccc);
    border-radius: 999px;
    background: var(--tableros-modal-fondo, #ffffff);
    color: var(--tableros-modal-texto-secundario, #666666);
    font-size: 0.75rem;
    font-weight: 700;
    pointer-events: none;
  }

  // Variante compacta: para opciones sin texto de ayuda (una sola línea),
  // el alto mínimo de la tarjeta completa deja demasiado espacio vacío.
  &--chica {
    min-height: auto;
    padding: 0.5rem 0.75rem;
  }
}

@media (max-width: 640px) {
  .form-grid-2 {
    grid-template-columns: 1fr;
  }

  .opcion-toggle {
    grid-template-columns: 1fr;
    gap: 0.65rem;

    &__estado {
      min-width: 0;
      justify-self: start;
    }
  }
}

.requerido {
  color: var(--color-primario-4, #991f47);
}

.monospace {
  font-family: monospace;
}
</style>
