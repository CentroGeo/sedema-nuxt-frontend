<script setup>
import { categoriesNamesInSpanish } from '~/utils/consulta';
import { PALETAS, PALETA_POR_DEFECTO, codificarPaleta } from '~/utils/tableros/paletas';

const props = defineProps({
  siteId: { type: Number, required: true },
});

const emit = defineEmits(['creado', 'cerrar']);

const { data: userData } = useAuth();
const { crearIndicador, recalcularIndicador, fetchDatasetsPaginados, fetchDatasetAttributes } =
  useTableroApi();

const modal = ref(null);
const paso = ref(1);
const guardando = ref(false);
const recalculando = ref(false);
const error = ref('');

const formulario = reactive({
  name: '',
  info_text: '',
  layer: '',
  layer_id_field: '',
  field_one: '',
  field_two: '',
  plot_type: 'bar',
  category_method: 'quantil',
  field_category: 5,
  colors: PALETA_POR_DEFECTO,
  reverse_colors: false,
  use_single_field: true,
  is_histogram: false,
  show_general_values: true,
});

const CATEGORIAS_CAPAS = Object.entries(categoriesNamesInSpanish).map(([id, label]) => ({
  id,
  label,
}));

const busquedaDataset = ref('');
const categoriaFiltro = ref('');
const resultadosDataset = ref([]);
const buscandoDataset = ref(false);
const paginaDataset = ref(1);
const hayMasPaginas = ref(false);
const cargandoMas = ref(false);
const datasetSeleccionado = ref(null);
const atributosDataset = ref([]);
const cargandoAtributos = ref(false);
const errorAtributos = ref(false);

const GEO_ATTRS = new Set(['the_geom', 'geometry', 'geom', 'wkb_geometry', 'shape']);

let busquedaTimeout = null;

async function cargarDatasetsIniciales() {
  buscandoDataset.value = true;
  try {
    const token = userData.value?.accessToken;
    const data = await fetchDatasetsPaginados(
      '',
      1,
      token,
      20,
      categoriaFiltro.value,
      'LOCAL',
      'vector'
    );
    resultadosDataset.value = data?.datasets ?? data?.results ?? [];
    paginaDataset.value = 1;
    const total = data?.total ?? data?.count ?? 0;
    hayMasPaginas.value = resultadosDataset.value.length < total;
  } catch {
    resultadosDataset.value = [];
  } finally {
    buscandoDataset.value = false;
  }
}

async function cargarMasDatasets() {
  cargandoMas.value = true;
  try {
    const token = userData.value?.accessToken;
    const siguientePag = paginaDataset.value + 1;
    const data = await fetchDatasetsPaginados(
      busquedaDataset.value,
      siguientePag,
      token,
      20,
      categoriaFiltro.value,
      'LOCAL',
      'vector'
    );
    const nuevos = data?.datasets ?? data?.results ?? [];
    resultadosDataset.value = [...resultadosDataset.value, ...nuevos];
    paginaDataset.value = siguientePag;
    const total = data?.total ?? data?.count ?? 0;
    hayMasPaginas.value = resultadosDataset.value.length < total;
  } catch {
    // silently ignore
  } finally {
    cargandoMas.value = false;
  }
}

function buscarDatasets() {
  paginaDataset.value = 1;
  if (busquedaTimeout) clearTimeout(busquedaTimeout);
  busquedaTimeout = setTimeout(async () => {
    buscandoDataset.value = true;
    try {
      const token = userData.value?.accessToken;
      const data = await fetchDatasetsPaginados(
        busquedaDataset.value,
        1,
        token,
        20,
        categoriaFiltro.value,
        'LOCAL',
        'vector'
      );
      resultadosDataset.value = data?.datasets ?? data?.results ?? [];
      const total = data?.total ?? data?.count ?? 0;
      hayMasPaginas.value = resultadosDataset.value.length < total;
    } catch {
      resultadosDataset.value = [];
    } finally {
      buscandoDataset.value = false;
    }
  }, 350);
}

watch(categoriaFiltro, () => {
  busquedaDataset.value = '';
  cargarDatasetsIniciales();
});

async function cargarAtributos(pk) {
  cargandoAtributos.value = true;
  errorAtributos.value = false;
  try {
    const data = await fetchDatasetAttributes(pk);
    const attrs = data?.dataset?.attribute_set ?? data?.attribute_set ?? [];
    atributosDataset.value = attrs.filter((a) => !GEO_ATTRS.has(a.attribute));
  } catch {
    errorAtributos.value = true;
    atributosDataset.value = [];
  } finally {
    cargandoAtributos.value = false;
  }
}

function seleccionarDataset(ds) {
  datasetSeleccionado.value = ds;
  formulario.layer = ds.pk;
  formulario.name = formulario.name || ds.title;
  resultadosDataset.value = [];
  busquedaDataset.value = '';
  atributosDataset.value = [];
  cargarAtributos(ds.pk);
}

function limpiarDataset() {
  datasetSeleccionado.value = null;
  formulario.layer = '';
  formulario.layer_id_field = '';
  formulario.field_one = '';
  formulario.field_two = '';
  atributosDataset.value = [];
}

async function guardar() {
  error.value = '';
  guardando.value = true;
  try {
    const colorsValue = codificarPaleta(formulario.colors, formulario.reverse_colors);
    const payload = {
      site: props.siteId,
      group: null,
      subgroup: null,
      name: formulario.name,
      info_text: formulario.info_text,
      layer: formulario.layer ? Number(formulario.layer) : null,
      layer_id_field: formulario.layer_id_field,
      field_one: formulario.field_one,
      field_two: formulario.field_two || '',
      plot_type: formulario.plot_type,
      category_method: formulario.category_method,
      field_category: formulario.field_category,
      colors: colorsValue,
      use_single_field: formulario.use_single_field,
      is_histogram: formulario.is_histogram,
      show_general_values: formulario.show_general_values,
      stack_order: 1,
    };
    const token = userData.value?.accessToken;
    const data = await crearIndicador(payload, token);
    if (!data?.id) {
      error.value = data?.detail || JSON.stringify(data);
      return;
    }

    // La creación solo persiste la configuración: los colores del mapa y la gráfica
    // (plot_config / map_values) se materializan hasta el recálculo. Sin esto el
    // indicador nace "Sin datos" y la paleta elegida no se aplica.
    guardando.value = false;
    recalculando.value = true;
    const avisoRecalculo = await recalcularColores(data.id, token);
    recalculando.value = false;

    emit('creado', { ...data, avisoRecalculo });
    modal.value?.cerrar();
  } catch (e) {
    error.value = e?.message || 'Error al crear indicador';
  } finally {
    guardando.value = false;
    recalculando.value = false;
  }
}

/**
 * Genera los colores del indicador recién creado. Un fallo aquí no invalida la creación
 * (el indicador ya existe), así que se devuelve como aviso en vez de como error.
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

function siguiente() {
  if (paso.value < 3) paso.value += 1;
  else guardar();
}

function anterior() {
  if (paso.value > 1) paso.value -= 1;
}

watch(
  () => modal.value,
  (m) => {
    if (m) m.abrir();
  },
  { once: true }
);

onMounted(async () => {
  await cargarDatasetsIniciales();
});
</script>

<template>
  <ClientOnly>
    <TablerosAdminModalBase
      ref="modal"
      ancho="960px"
      alto-maximo="94dvh"
      centrar-vertical
      adaptar-tema
      @cerrar="emit('cerrar')"
    >
      <template #encabezado>
        <h2>Nuevo indicador</h2>
        <ol class="pasos-mini" aria-label="Pasos">
          <li :class="{ activo: paso >= 1, actual: paso === 1 }">1. Datos y capa</li>
          <li :class="{ activo: paso >= 2, actual: paso === 2 }">2. Tematización</li>
          <li :class="{ activo: paso >= 3, actual: paso === 3 }">3. Confirmar</li>
        </ol>
      </template>

      <template #cuerpo>
        <form class="modal-nuevo-indicador" @submit.prevent="siguiente">
          <!-- ── Paso 1: Datos del indicador y capa ── -->
          <div v-show="paso === 1">
            <div class="seccion-titulo">Información general</div>
            <div class="form-grid-2">
              <div class="campo">
                <label for="ind-name">Nombre del indicador <span class="requerido">*</span></label>
                <input id="ind-name" v-model="formulario.name" type="text" required />
              </div>
              <div class="campo">
                <label for="ind-info">Descripción</label>
                <input id="ind-info" v-model="formulario.info_text" type="text" />
              </div>
            </div>

            <div class="seccion-titulo m-t-3">Capa de datos</div>

            <p class="formulario-ayuda">
              Selecciona una capa local vectorial con atributos. Los servicios WMS se administran
              por separado en “Capas de referencia”.
            </p>

            <div v-if="datasetSeleccionado" class="dataset-seleccionado">
              <div class="dataset-seleccionado__info">
                <strong>{{ datasetSeleccionado.title }}</strong>
                <span v-if="datasetSeleccionado.alternate" class="formulario-ayuda monospace">
                  {{ datasetSeleccionado.alternate }}
                </span>
              </div>
              <button
                type="button"
                class="boton boton-chico boton-secundario"
                @click="limpiarDataset"
              >
                Cambiar
              </button>
            </div>

            <div v-else>
              <div class="dataset-filtros m-b-1">
                <select v-model="categoriaFiltro" title="Filtrar por categoría">
                  <option value="">Todas las categorías</option>
                  <option v-for="cat in CATEGORIAS_CAPAS" :key="cat.id" :value="cat.id">
                    {{ cat.label }}
                  </option>
                </select>
              </div>
              <div class="dataset-buscador">
                <input
                  v-model="busquedaDataset"
                  type="text"
                  placeholder="Buscar por nombre..."
                  autocomplete="off"
                  @input="buscarDatasets"
                  @keydown.enter.prevent
                  @keydown.stop
                  @keyup.stop
                  @keypress.stop
                />
                <p v-show="buscandoDataset" class="formulario-ayuda">Cargando capas...</p>
                <ul
                  v-show="!buscandoDataset && resultadosDataset.length > 0"
                  class="dataset-resultados"
                  aria-label="Datasets encontrados"
                >
                  <li v-for="ds in resultadosDataset" :key="ds.pk">
                    <button
                      type="button"
                      class="dataset-resultados__opcion"
                      :aria-label="`Seleccionar dataset ${ds.title}`"
                      @mousedown.prevent
                      @click="seleccionarDataset(ds)"
                    >
                      <span class="dataset-resultados__contenido">
                        <span class="fw-500">{{ ds.title }}</span>
                        <span v-if="ds.alternate" class="formulario-ayuda monospace">
                          {{ ds.alternate }}
                        </span>
                      </span>

                      <span class="dataset-resultados__accion" aria-hidden="true">
                        Seleccionar <span>→</span>
                      </span>
                    </button>
                  </li>

                  <li v-if="hayMasPaginas" class="dataset-resultados__mas">
                    <button
                      type="button"
                      class="dataset-resultados__mas-boton"
                      :disabled="cargandoMas"
                      @click="cargarMasDatasets"
                    >
                      {{ cargandoMas ? 'Cargando...' : 'Mostrar más capas...' }}
                    </button>
                  </li>
                </ul>
                <p
                  v-show="!buscandoDataset && resultadosDataset.length === 0"
                  class="formulario-ayuda"
                >
                  Sin resultados.
                </p>
              </div>
            </div>

            <template v-if="datasetSeleccionado">
              <p v-if="errorAtributos" class="formulario-ayuda color-error m-t-2">
                No se pudieron cargar los campos del dataset.
              </p>

              <div
                v-if="!cargandoAtributos && !errorAtributos && atributosDataset.length === 0"
                class="sin-atributos-aviso"
              >
                <p class="formulario-ayuda color-error">
                  Este Dataset local no tiene atributos disponibles y no puede utilizarse para crear
                  un indicador.
                </p>
              </div>

              <div class="seccion-titulo m-t-3">Campos</div>

              <div class="form-grid-3">
                <div class="campo">
                  <label for="ind-field-id"
                    >Campo ID de geometría <span class="requerido">*</span></label
                  >
                  <select
                    id="ind-field-id"
                    v-model="formulario.layer_id_field"
                    :disabled="cargandoAtributos || !atributosDataset.length"
                    required
                  >
                    <option value="" disabled>
                      {{
                        cargandoAtributos
                          ? 'Cargando...'
                          : !atributosDataset.length
                            ? 'Sin atributos'
                            : 'Selecciona'
                      }}
                    </option>
                    <option v-for="a in atributosDataset" :key="a.attribute" :value="a.attribute">
                      {{ a.attribute }}
                    </option>
                  </select>
                </div>
                <div class="campo">
                  <label for="ind-field-one"
                    >Campo principal <span class="requerido">*</span></label
                  >
                  <select
                    id="ind-field-one"
                    v-model="formulario.field_one"
                    :disabled="cargandoAtributos || !atributosDataset.length"
                    required
                  >
                    <option value="" disabled>
                      {{
                        cargandoAtributos
                          ? 'Cargando...'
                          : !atributosDataset.length
                            ? 'Sin atributos'
                            : 'Selecciona'
                      }}
                    </option>
                    <option v-for="a in atributosDataset" :key="a.attribute" :value="a.attribute">
                      {{ a.attribute }}
                      <span v-if="a.attribute_type">({{ a.attribute_type }})</span>
                    </option>
                  </select>
                </div>
                <div class="campo">
                  <label for="ind-field-two">Campo secundario</label>
                  <select
                    id="ind-field-two"
                    v-model="formulario.field_two"
                    :disabled="cargandoAtributos || !atributosDataset.length"
                  >
                    <option value="">— ninguno —</option>
                    <option v-for="a in atributosDataset" :key="a.attribute" :value="a.attribute">
                      {{ a.attribute }}
                      <span v-if="a.attribute_type">({{ a.attribute_type }})</span>
                    </option>
                  </select>
                </div>
              </div>
            </template>
          </div>

          <!-- ── Paso 2: Tematización ── -->
          <div v-show="paso === 2">
            <div class="seccion-titulo">Clasificación</div>
            <div class="form-grid-2">
              <div class="campo">
                <label for="ind-method">Método</label>
                <select id="ind-method" v-model="formulario.category_method">
                  <option value="quantil">Cuantiles</option>
                  <option value="naturalb">Jenks (natural breaks)</option>
                  <option value="sameintervals">Intervalos iguales</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div class="campo">
                <label for="ind-categories">Número de clases</label>
                <input
                  id="ind-categories"
                  v-model.number="formulario.field_category"
                  type="number"
                  min="2"
                  max="10"
                />
              </div>
            </div>

            <div class="seccion-titulo m-t-3">Visualización</div>
            <div class="form-grid-2">
              <div class="campo">
                <label for="ind-colors">Rampa de color</label>
                <select id="ind-colors" v-model="formulario.colors">
                  <optgroup v-for="g in PALETAS" :key="g.group" :label="g.group">
                    <option v-for="p in g.options" :key="p.value" :value="p.value">
                      {{ p.label }}
                    </option>
                  </optgroup>
                </select>
                <label
                  class="opcion-toggle m-t-1"
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
                    <span> Invierte el orden de los colores de la rampa seleccionada. </span>
                  </span>

                  <span class="opcion-toggle__estado" aria-hidden="true">
                    {{ formulario.reverse_colors ? 'Activado' : 'Desactivado' }}
                  </span>
                </label>
              </div>
              <div class="campo">
                <label for="ind-plot-type">Tipo de gráfica</label>
                <select id="ind-plot-type" v-model="formulario.plot_type">
                  <optgroup label="Barras">
                    <option value="bar">Barras verticales</option>
                    <option value="horizontal_bar">Barras horizontales</option>
                    <option value="histogram">Histograma</option>
                  </optgroup>
                  <optgroup label="Circular">
                    <option value="donut">Dona</option>
                    <option value="pie">Pastel (pie)</option>
                  </optgroup>
                  <optgroup label="Líneas y área">
                    <option value="line">Línea</option>
                    <option value="area">Área</option>
                  </optgroup>
                  <optgroup label="Otros">
                    <option value="scatter">Dispersión</option>
                    <option value="gauge">Gauge</option>
                    <option value="radar">Radar</option>
                    <option value="treemap">Mapa de árbol</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <label
              class="opcion-toggle m-t-2"
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
                  Calcula los valores resumidos que utilizan los cuadros de datos del indicador.
                </span>
              </span>

              <span class="opcion-toggle__estado" aria-hidden="true">
                {{ formulario.show_general_values ? 'Activado' : 'Desactivado' }}
              </span>
            </label>
          </div>

          <!-- ── Paso 3: Confirmar ── -->
          <div v-show="paso === 3">
            <div class="seccion-titulo">Resumen del indicador</div>
            <dl class="resumen-dl">
              <div class="resumen-dl__fila">
                <dt>Nombre</dt>
                <dd>{{ formulario.name }}</dd>
              </div>
              <div class="resumen-dl__fila">
                <dt>Capa</dt>
                <dd>{{ datasetSeleccionado?.title || formulario.layer }}</dd>
              </div>
              <div class="resumen-dl__fila">
                <dt>Campo ID</dt>
                <dd>{{ formulario.layer_id_field }}</dd>
              </div>
              <div class="resumen-dl__fila">
                <dt>Campo principal</dt>
                <dd>{{ formulario.field_one }}</dd>
              </div>
              <div v-if="formulario.field_two" class="resumen-dl__fila">
                <dt>Campo secundario</dt>
                <dd>{{ formulario.field_two }}</dd>
              </div>
              <div class="resumen-dl__fila">
                <dt>Método</dt>
                <dd>{{ formulario.category_method }}</dd>
              </div>
              <div class="resumen-dl__fila">
                <dt>Clases</dt>
                <dd>{{ formulario.field_category }}</dd>
              </div>
              <div class="resumen-dl__fila">
                <dt>Colores</dt>
                <dd>
                  {{ formulario.colors }}{{ formulario.reverse_colors ? ' (invertida)' : '' }}
                </dd>
              </div>
              <div class="resumen-dl__fila">
                <dt>Gráfica</dt>
                <dd>{{ formulario.plot_type }}</dd>
              </div>
              <div class="resumen-dl__fila">
                <dt>Valores generales</dt>
                <dd>{{ formulario.show_general_values ? 'Sí' : 'No' }}</dd>
              </div>
            </dl>
            <p class="formulario-ayuda m-t-2">
              Los datos de gráfica y mapa se podrán reconstruir desde la edición del indicador.
            </p>
          </div>

          <p v-if="error" class="color-error m-t-2">{{ error }}</p>

          <div class="acciones-modal">
            <div class="acciones-modal__izq">
              <button
                v-if="paso > 1"
                type="button"
                class="boton boton-secundario"
                @click="anterior"
              >
                ← Atrás
              </button>
              <button type="button" class="boton boton-secundario" @click="emit('cerrar')">
                Cancelar
              </button>
            </div>
            <input
              type="submit"
              class="boton boton-primario"
              :value="
                paso < 3
                  ? 'Siguiente →'
                  : recalculando
                    ? 'Calculando colores...'
                    : guardando
                      ? 'Guardando...'
                      : 'Crear indicador'
              "
              :disabled="guardando || recalculando"
            />
          </div>
        </form>
      </template>
    </TablerosAdminModalBase>
  </ClientOnly>
</template>

<style lang="scss" scoped>
/* Indicador de pasos */
.pasos-mini {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0;

  li {
    font-size: 0.78rem;
    padding: 2px 12px;
    border-radius: 12px;
    color: var(--color-texto-secundario, #999);
    white-space: nowrap;

    &.activo {
      color: var(--color-secundario-8, #5f3e47);
    }
    &.actual {
      background: var(--color-secundario-3, #f8e1e8);
      color: var(--color-primario-4, #991f47);
      font-weight: 600;
    }
  }
}

/* Secciones */
.seccion-titulo {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-texto-secundario, #777);
  border-bottom: 1px solid var(--color-borde, #e8e8e8);
  padding-bottom: 4px;
  margin-bottom: 1rem;
}

/* Grillas */
.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
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
  font-size: 0.85rem;
  cursor: pointer;
}

/* Dataset */
.dataset-seleccionado {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 8px 12px;
  border: 1px solid var(--color-borde, #ccc);
  border-radius: 6px;
  background: var(--tableros-modal-superficie-suave, #fcf3f5);
  margin-bottom: 0.5rem;

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
}

.dataset-filtros {
  select {
    width: 100%;
  }
}

.dataset-buscador {
  position: relative;
  input {
    width: 100%;
  }
}

.dataset-resultados {
  position: absolute;
  z-index: 100;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  list-style: none;
  padding: 0;
  margin: 0;
  background: var(--tableros-modal-control-fondo, #ffffff);
  color: var(--tableros-modal-texto, inherit);
  border: 1px solid var(--tableros-modal-control-borde, #cccccc);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  max-height: 260px;
  overflow-y: auto;

  li {
    padding: 0;
    margin: 0;
    border-bottom: 1px solid var(--tableros-modal-control-borde, #e4e4e4);

    &:last-child {
      border-bottom: none;
    }
  }

  &__opcion {
    width: 100%;
    min-height: 58px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 1rem;
    padding: 0.7rem 0.9rem;
    border: none;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition:
      background 0.15s ease,
      box-shadow 0.15s ease;

    &:hover,
    &:focus-visible {
      background: var(--tableros-modal-hover-fondo, #fcf3f5);
      box-shadow: inset 4px 0 0 var(--tableros-modal-acento, #991f47);
      outline: none;
    }

    &:hover .dataset-resultados__accion,
    &:focus-visible .dataset-resultados__accion {
      opacity: 1;
      transform: translateX(2px);
    }
  }

  &__contenido {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__accion {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--tableros-modal-acento, #991f47);
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
    opacity: 0.72;
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
  }

  &__mas-boton {
    width: 100%;
    padding: 0.7rem 1rem;
    border: none;
    background: transparent;
    color: var(--tableros-modal-acento, #991f47);
    font-size: 0.82rem;
    font-weight: 700;
    text-align: center;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: var(--tableros-modal-hover-fondo, #fcf3f5);
      outline: 2px solid var(--tableros-modal-acento, #991f47);
      outline-offset: -2px;
    }

    &:disabled {
      cursor: wait;
      opacity: 0.65;
    }
  }
}

.sin-atributos-aviso {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 10px 12px;
  border: 1px dashed var(--color-borde, #ccc);
  border-radius: 6px;
  background: var(--color-fondo-2, #f5f5f5);
  margin-top: 0.75rem;
}

/* Resumen */
.resumen-dl {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--color-borde, #e0e0e0);
  border-radius: 6px;
  overflow: hidden;

  &__fila {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 0;
    border-bottom: 1px solid var(--color-borde, #e8e8e8);

    &:last-child {
      border-bottom: none;
    }

    dt {
      padding: 7px 12px;
      background: var(--color-fondo-2, #f5f5f5);
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--color-texto-secundario, #666);
    }

    dd {
      padding: 7px 12px;
      margin: 0;
      font-size: 0.9rem;
    }
  }
}

/* Acciones */
.acciones-modal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-borde, #e8e8e8);

  &__izq {
    display: flex;
    gap: 0.5rem;
  }
}

.requerido {
  color: var(--color-primario-4, #991f47);
}
.fw-500 {
  font-weight: 500;
}
.monospace {
  font-family: monospace;
  font-size: 0.78rem;
}

/* Opciones booleanas mostradas como botones de activación */
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
    box-shadow 0.15s ease,
    transform 0.15s ease;

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
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }
}

@media (max-width: 640px) {
  .opcion-toggle {
    grid-template-columns: 1fr;
    gap: 0.65rem;

    &__estado {
      min-width: 0;
      justify-self: start;
    }
  }
}

/* Tema local: únicamente modal Nuevo indicador */
.modal-nuevo-indicador {
  color: var(--tableros-modal-texto, inherit);

  .campo label,
  .check-inline,
  .checks-col {
    color: var(--tableros-modal-texto, inherit);
  }

  .formulario-ayuda {
    color: var(--tableros-modal-texto-secundario, #777777);
  }

  input:not([type='checkbox']),
  textarea,
  select {
    background: var(--tableros-modal-control-fondo, #ffffff);
    border-color: var(--tableros-modal-control-borde, #cccccc);
    color: var(--tableros-modal-texto, inherit);
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--tableros-modal-placeholder, #777777);
    opacity: 1;
  }

  select option,
  select optgroup {
    background: var(--tableros-modal-control-fondo, #ffffff);
    color: var(--tableros-modal-texto, inherit);
  }

  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--tableros-modal-acento, #991f47);
    outline-offset: 1px;
  }

  .seccion-titulo {
    color: var(--tableros-modal-texto-secundario, #777777);
    border-color: var(--tableros-modal-control-borde, #e8e8e8);
  }

  .dataset-seleccionado,
  .sin-atributos-aviso {
    background: var(--tableros-modal-superficie-suave, #f7f7f7);
    border-color: var(--tableros-modal-control-borde, #cccccc);
    color: var(--tableros-modal-texto, inherit);
  }

  .resumen-dl {
    border-color: var(--tableros-modal-control-borde, #e0e0e0);

    &__fila {
      border-color: var(--tableros-modal-control-borde, #e8e8e8);

      dt {
        background: var(--tableros-modal-superficie-suave, #f5f5f5);
        color: var(--tableros-modal-texto-secundario, #666666);
      }

      dd {
        background: var(--tableros-modal-fondo, #ffffff);
        color: var(--tableros-modal-texto, inherit);
      }
    }
  }

  .acciones-modal {
    border-color: var(--tableros-modal-control-borde, #e8e8e8);
  }
}

.pasos-mini {
  li {
    color: var(--tableros-modal-texto-secundario, #777777);
  }

  li.activo {
    color: var(--tableros-modal-texto, inherit);
  }

  li.actual {
    background: var(--tableros-modal-acento-suave, #f8e1e8);
    color: var(--tableros-modal-acento, #991f47);
  }
}
</style>
