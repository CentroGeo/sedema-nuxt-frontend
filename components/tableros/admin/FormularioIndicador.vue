<script setup>
import { PALETAS, codificarPaleta, decodificarPaleta } from '~/utils/tableros/paletas';

const props = defineProps({
  indicador: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['guardado', 'cerrar']);

const { data: userData } = useAuth();
const { actualizarIndicador, recalcularIndicador } = useTableroApi();

const modal = ref(null);
const guardando = ref(false);
const recalculando = ref(false);
const error = ref('');

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
  { value: 'manual', label: 'Manual' },
];

// Indicadores creados antes de este fix pueden tener guardados los valores en inglés
// (quantile/jenks/equal) que el backend no reconoce; se normalizan al cargar.
const METODOS_LEGADO = { quantile: 'quantil', jenks: 'naturalb', equal: 'sameintervals' };

const formulario = reactive({
  name: '',
  info_text: '',
  plot_type: 'bar',
  colors: 'azules_3',
  reverse_colors: false,
  category_method: 'quantil',
  field_category: 5,
  use_single_field: true,
  show_general_values: false,
  high_values_percentage: 10,
});

function cargarDesdeIndicador() {
  formulario.name = props.indicador.name || '';
  formulario.info_text = props.indicador.info_text || '';
  formulario.plot_type = props.indicador.plot_type || 'bar';
  const paleta = decodificarPaleta(props.indicador.colors);
  formulario.colors = paleta.base;
  formulario.reverse_colors = paleta.invertida;
  const rawMethod = props.indicador.category_method || 'quantil';
  formulario.category_method = METODOS_LEGADO[rawMethod] || rawMethod;
  formulario.field_category = props.indicador.field_category ?? 5;
  formulario.use_single_field = props.indicador.use_single_field ?? true;
  formulario.show_general_values = props.indicador.show_general_values ?? false;
  formulario.high_values_percentage = props.indicador.high_values_percentage ?? 10;
}

watch(
  () => modal.value,
  (m) => {
    if (m) {
      cargarDesdeIndicador();
      m.abrir();
    }
  }
);

/**
 * Los colores que se pintan no salen de `colors`: viven ya materializados como hex en
 * `plot_config.ranges[].color` y `map_values[fid].color`. Cambiar la paleta, invertirla o
 * ajustar la clasificación solo los regenera si además se recalcula el indicador; de lo
 * contrario quedan los hex anteriores y el mapa cae a sus grises de respaldo.
 */
function requiereRecalculo(colorsValue) {
  const original = props.indicador;
  const metodoOriginal = METODOS_LEGADO[original.category_method] || original.category_method;

  return (
    colorsValue !== original.colors ||
    formulario.category_method !== (metodoOriginal || 'quantil') ||
    Number(formulario.field_category) !== Number(original.field_category ?? 5) ||
    formulario.use_single_field !== (original.use_single_field ?? true) ||
    Boolean(original.use_custom_colors)
  );
}

async function guardar() {
  error.value = '';
  guardando.value = true;
  try {
    const token = userData.value?.accessToken;
    const colorsValue = codificarPaleta(formulario.colors, formulario.reverse_colors);
    const recalcular = requiereRecalculo(colorsValue);

    const payload = {
      name: formulario.name,
      info_text: formulario.info_text,
      plot_type: formulario.plot_type,
      colors: colorsValue,
      // Si hay `custom_colors`, el backend ignora por completo la paleta seleccionada.
      // Elegir paleta aquí es una decisión explícita, así que se descartan.
      use_custom_colors: false,
      custom_colors: '',
      category_method: formulario.category_method,
      field_category: formulario.field_category,
      use_single_field: formulario.use_single_field,
      show_general_values: formulario.show_general_values,
      high_values_percentage: formulario.high_values_percentage,
    };

    const data = await actualizarIndicador(props.indicador.id, payload, token);
    if (!data?.id) {
      error.value = data?.detail || JSON.stringify(data);
      return;
    }

    let avisoRecalculo = '';
    if (recalcular) {
      guardando.value = false;
      recalculando.value = true;
      avisoRecalculo = await recalcularColores(token);
      recalculando.value = false;
    }

    emit('guardado', { ...data, avisoRecalculo });
    modal.value?.cerrar();
  } catch (e) {
    error.value = e?.message || 'Error al guardar';
  } finally {
    guardando.value = false;
    recalculando.value = false;
  }
}

/**
 * Regenera los colores del indicador. Un fallo aquí no invalida el guardado (la paleta ya
 * quedó persistida), así que se devuelve como aviso en vez de propagarse como error.
 * @returns {Promise<string>} mensaje de aviso, o cadena vacía si todo salió bien
 */
async function recalcularColores(token) {
  try {
    const resultado = await recalcularIndicador(props.indicador.id, token);
    if (resultado?.status === 'ok') return '';
    return (
      resultado?.error ||
      resultado?.detail ||
      'No se pudieron recalcular los colores del indicador.'
    );
  } catch (e) {
    return e?.message || 'No se pudo conectar con el servidor para recalcular los colores.';
  }
}
</script>

<template>
  <ClientOnly>
    <TablerosAdminModalBase ref="modal" ancho="720px" adaptar-tema @cerrar="emit('cerrar')">
      <template #encabezado>
        <h2>Editar indicador</h2>
      </template>

      <template #cuerpo>
        <form @submit.prevent="guardar">
          <!-- ── Identificación ── -->
          <div class="seccion-titulo">Identificación</div>
          <div class="campo m-b-2">
            <label for="ind-nombre">Nombre del indicador <span class="requerido">*</span></label>
            <input id="ind-nombre" v-model="formulario.name" type="text" required />
          </div>
          <div class="campo">
            <label for="ind-info">Texto descriptivo</label>
            <textarea
              id="ind-info"
              v-model="formulario.info_text"
              rows="3"
              placeholder="Descripción del indicador, metodología, fuente..."
            />
          </div>

          <!-- ── Visualización ── -->
          <div class="seccion-titulo m-t-4">Visualización</div>
          <div class="form-grid-2">
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
            <div class="campo">
              <label for="ind-paleta">Paleta de colores</label>
              <select id="ind-paleta" v-model="formulario.colors">
                <optgroup v-for="g in PALETAS" :key="g.group" :label="g.group">
                  <option v-for="p in g.options" :key="p.value" :value="p.value">
                    {{ p.label }}
                  </option>
                </optgroup>
              </select>
              <label class="check-inline m-t-1">
                <input v-model="formulario.reverse_colors" type="checkbox" />
                Invertir paleta
              </label>
              <p class="formulario-ayuda m-t-1">
                Al guardar se recalculan los colores del mapa y la gráfica.
              </p>
            </div>
          </div>

          <!-- ── Clasificación ── -->
          <div class="seccion-titulo m-t-4">Clasificación</div>
          <div class="form-grid-2">
            <div class="campo">
              <label for="ind-method">Método</label>
              <select id="ind-method" v-model="formulario.category_method">
                <option v-for="m in METODOS" :key="m.value" :value="m.value">{{ m.label }}</option>
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
                  Usa solamente el campo principal. Desactívalo para agrupar por el campo principal
                  y sumar los valores del campo secundario.
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
                  Calcula cifras resumidas que pueden utilizar los cuadros de datos del indicador.
                </span>
              </span>

              <span class="opcion-toggle__estado" aria-hidden="true">
                {{ formulario.show_general_values ? 'Activado' : 'Desactivado' }}
              </span>
            </label>
          </div>

          <p v-if="error" class="color-error m-t-2">{{ error }}</p>

          <div class="acciones-modal">
            <button
              type="button"
              class="boton boton-secundario"
              :disabled="guardando || recalculando"
              @click="emit('cerrar')"
            >
              Cancelar
            </button>
            <input
              type="submit"
              class="boton boton-primario"
              :value="
                recalculando ? 'Recalculando colores...' : guardando ? 'Guardando...' : 'Guardar'
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

.campo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.checks-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.check-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.acciones-modal {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--tableros-modal-control-borde, var(--color-borde, #e8e8e8));
}

form {
  color: var(--tableros-modal-texto, inherit);
}

.campo input:not([type='checkbox']),
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

.check-inline,
.checks-col {
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

.requerido {
  color: var(--color-primario-4, #991f47);
}
</style>
