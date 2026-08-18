<script setup>
const props = defineProps({
  indicadorId: {
    type: Number,
    required: true,
  },
  cuadro: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['guardado', 'cerrar']);

const { data: userData } = useAuth();
const { crearCuadroDatos, actualizarCuadroDatos, fetchIndicador, fetchDatasetAttributes } =
  useTableroApi();

const modal = ref(null);
const guardando = ref(false);
const error = ref('');
const previewIcono = ref(null);

const esEdicion = computed(() => !!props.cuadro);

// Atributos reales del dataset del indicador, sólo como sugerencia (datalist): el
// campo sigue siendo texto libre porque también se usan campos "virtuales" que sólo
// existen en general_values y no son una columna real del dataset.
const GEO_ATTRS = new Set(['the_geom', 'geometry', 'geom', 'wkb_geometry', 'shape']);
const atributosDataset = ref([]);

async function cargarAtributosDataset() {
  atributosDataset.value = [];
  try {
    const indicador = await fetchIndicador(props.indicadorId);
    const layerId = indicador?.layer;
    if (!layerId) return;
    const data = await fetchDatasetAttributes(layerId);
    const attrs = data?.dataset?.attribute_set ?? data?.attribute_set ?? [];
    atributosDataset.value = attrs
      .map((a) => a.attribute)
      .filter((name) => name && !GEO_ATTRS.has(name));
  } catch {
    atributosDataset.value = [];
  }
}

const formulario = reactive({
  field: '',
  name: '',
  is_percentage: false,
  field_percentage_total: '',
  color: '#691c32',
  text_color: '#ffffff',
  edge_color: '#691c32',
  edge_style: '8',
  size: '1',
  icon: '',
  icon_custom_file: null,
  stack_order: 1,
});

const TAMANIOS = [
  { value: '1', label: 'Normal (SM)' },
  { value: '2', label: 'Grande (MD)' },
  { value: '3', label: 'Extra grande (LG)' },
];

const BORDES = [
  { value: '8', label: 'Sin bordes' },
  { value: '1', label: 'Izquierdo' },
  { value: '2', label: 'Derecho' },
  { value: '3', label: 'Superior' },
  { value: '4', label: 'Inferior' },
  { value: '5', label: 'Paralelos horizontales' },
  { value: '6', label: 'Paralelos verticales' },
  { value: '7', label: 'Borde completo' },
];

function cargarDesdeCuadro() {
  if (!props.cuadro) return;
  formulario.field = props.cuadro.field || '';
  formulario.name = props.cuadro.name || '';
  formulario.is_percentage = !!props.cuadro.is_percentage;
  formulario.field_percentage_total = props.cuadro.field_percentage_total || '';
  formulario.color = props.cuadro.color || '#691c32';
  formulario.text_color = props.cuadro.text_color || '#ffffff';
  formulario.edge_color = props.cuadro.edge_color || '#691c32';
  formulario.edge_style = props.cuadro.edge_style || '8';
  formulario.size = props.cuadro.size || '1';
  formulario.icon = props.cuadro.icon || '';
  formulario.stack_order = props.cuadro.stack_order || 1;
  previewIcono.value = props.cuadro.icon_custom || null;
}

const inputArchivo = ref(null);

watch(
  () => formulario.icon,
  (newIcon) => {
    if (newIcon) {
      formulario.icon_custom_file = null;
      previewIcono.value = null;
      if (inputArchivo.value) {
        inputArchivo.value.value = '';
      }
    }
  }
);

function onArchivoIcono(event) {
  const archivo = event.target.files?.[0];
  if (!archivo) return;
  formulario.icon_custom_file = archivo;
  previewIcono.value = URL.createObjectURL(archivo);
  formulario.icon = '';
}

async function guardar() {
  error.value = '';
  guardando.value = true;

  const form = new FormData();
  form.append('indicator', String(props.indicadorId));
  form.append('field', formulario.field);
  form.append('name', formulario.name);
  form.append('is_percentage', formulario.is_percentage ? 'true' : 'false');
  if (formulario.field_percentage_total)
    form.append('field_percentage_total', formulario.field_percentage_total);
  form.append('color', formulario.color);
  form.append('text_color', formulario.text_color);
  form.append('edge_color', formulario.edge_color);
  form.append('edge_style', formulario.edge_style);
  form.append('size', formulario.size);
  form.append('stack_order', String(formulario.stack_order));

  if (formulario.icon) {
    form.append('icon', formulario.icon);
    form.append('icon_custom', '');
  } else if (formulario.icon_custom_file) {
    form.append('icon', '');
    form.append('icon_custom', formulario.icon_custom_file);
  } else {
    form.append('icon', '');
    if (esEdicion.value && props.cuadro.icon_custom && !previewIcono.value) {
      form.append('icon_custom', '');
    }
  }

  try {
    const token = userData.value?.accessToken;
    const data = esEdicion.value
      ? await actualizarCuadroDatos(props.cuadro.id, form, token)
      : await crearCuadroDatos(form, token);

    if (data?.id) {
      emit('guardado', data);
      modal.value?.cerrar();
    } else {
      error.value = data?.detail || JSON.stringify(data);
    }
  } catch (e) {
    error.value = e?.message || 'Error al guardar';
  } finally {
    guardando.value = false;
  }
}

watch(
  () => modal.value,
  (m) => {
    if (m) {
      cargarDesdeCuadro();
      cargarAtributosDataset();
      m.abrir();
    }
  },
  { once: true }
);
</script>

<template>
  <ClientOnly>
    <TablerosAdminModalBase ref="modal" ancho="760px" @cerrar="emit('cerrar')">
      <template #encabezado>
        <h2>{{ esEdicion ? 'Editar' : 'Crear' }} cuadro de datos</h2>
      </template>

      <template #cuerpo>
        <form @submit.prevent="guardar">
          <!-- ── Datos del indicador ── -->
          <div class="seccion-titulo">Datos del indicador</div>
          <div class="form-grid-2">
            <div class="campo">
              <label for="cd-field">Campo de información <span class="requerido">*</span></label>
              <input
                id="cd-field"
                v-model="formulario.field"
                type="text"
                list="cd-field-sugerencias"
                placeholder="Ej: poblacion_total"
                required
              />
              <datalist id="cd-field-sugerencias">
                <option v-for="attr in atributosDataset" :key="attr" :value="attr" />
              </datalist>
              <p v-if="atributosDataset.length" class="formulario-ayuda">
                Sugerencias tomadas de las columnas reales del dataset del indicador. También puedes
                escribir un campo que sólo exista en los valores generales del indicador.
              </p>
            </div>
            <div class="campo">
              <label for="cd-name">Nombre personalizado <span class="requerido">*</span></label>
              <input id="cd-name" v-model="formulario.name" type="text" required />
            </div>
          </div>

          <div class="check-container m-t-2">
            <input
              id="cd-percentage"
              v-model="formulario.is_percentage"
              type="checkbox"
              class="checkbox-custom"
            />
            <label for="cd-percentage" class="label-custom">¿Es porcentual?</label>
          </div>

          <div v-if="formulario.is_percentage" class="campo m-t-2">
            <label for="cd-total">Campo total para calcular porcentaje</label>
            <input id="cd-total" v-model="formulario.field_percentage_total" type="text" />
          </div>

          <!-- ── Apariencia ── -->
          <div class="seccion-titulo m-t-4">Apariencia</div>

          <div class="colores-fila">
            <div class="campo-color">
              <label for="cd-color">Fondo</label>
              <input id="cd-color" v-model="formulario.color" type="color" class="input-color" />
              <span class="color-hex">{{ formulario.color }}</span>
            </div>
            <div class="campo-color">
              <label for="cd-text">Texto</label>
              <input
                id="cd-text"
                v-model="formulario.text_color"
                type="color"
                class="input-color"
              />
              <span class="color-hex">{{ formulario.text_color }}</span>
            </div>
            <div class="campo-color">
              <label for="cd-edge-color">Borde</label>
              <input
                id="cd-edge-color"
                v-model="formulario.edge_color"
                type="color"
                class="input-color"
              />
              <span class="color-hex">{{ formulario.edge_color }}</span>
            </div>
          </div>

          <div class="form-grid-2 m-t-3">
            <div class="campo">
              <label for="cd-size">Tamaño</label>
              <select id="cd-size" v-model="formulario.size">
                <option v-for="t in TAMANIOS" :key="t.value" :value="t.value">
                  {{ t.label }}
                </option>
              </select>
            </div>
            <div class="campo">
              <label for="cd-edge">Estilo de borde</label>
              <select id="cd-edge" v-model="formulario.edge_style">
                <option v-for="b in BORDES" :key="b.value" :value="b.value">{{ b.label }}</option>
              </select>
            </div>
          </div>

          <!-- ── Ícono ── -->
          <div class="seccion-titulo m-t-4">Ícono</div>
          <div class="campo">
            <label>Seleccionar del catálogo</label>
            <TablerosAdminPickerIcono v-model="formulario.icon" />
          </div>
          <div class="campo m-t-2">
            <label for="cd-icon-custom">O subir ícono personalizado</label>
            <div class="input-archivo-simple">
              <label for="cd-icon-custom" class="input-archivo-simple__gatillo"> Subir </label>
              <span class="input-archivo-simple__nombre">
                {{
                  formulario.icon_custom_file?.name ||
                  (previewIcono ? 'Archivo cargado' : 'Ningún archivo seleccionado')
                }}
              </span>
              <input
                id="cd-icon-custom"
                ref="inputArchivo"
                type="file"
                accept="image/*"
                class="input-archivo-simple__oculto"
                @change="onArchivoIcono"
              />
            </div>
            <img
              v-if="previewIcono"
              :src="previewIcono"
              alt="Preview del ícono"
              class="icono-preview m-t-2"
            />
          </div>

          <!-- ── Vista previa ── -->
          <div class="seccion-titulo m-t-4">Vista previa</div>
          <div
            class="cuadro-preview"
            :style="{
              background: formulario.color,
              color: formulario.text_color,
              borderColor: formulario.edge_color,
            }"
          >
            <div class="cuadro-preview__icono">
              <img
                v-if="previewIcono"
                :src="previewIcono"
                alt="Vista previa del icono"
                class="cuadro-preview__icono-img"
              />
              <span v-else-if="formulario.icon" :class="formulario.icon" />
            </div>
            <div class="cuadro-preview__contenido">
              <p class="cuadro-preview__nombre">{{ formulario.name || 'Nombre del cuadro' }}</p>
              <p class="cuadro-preview__valor">
                123<span v-if="formulario.is_percentage" class="cuadro-preview__porcentaje">%</span>
              </p>
            </div>
          </div>

          <p v-if="error" class="color-error m-t-2">{{ error }}</p>

          <div class="acciones-modal">
            <button type="button" class="boton boton-secundario" @click="emit('cerrar')">
              Cancelar
            </button>
            <input
              type="submit"
              class="boton boton-primario"
              :value="guardando ? 'Guardando...' : 'Guardar'"
              :disabled="guardando"
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
  color: var(--color-texto-secundario, #777);
  border-bottom: 1px solid var(--color-borde, #e8e8e8);
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

.check-row {
  display: flex;
  gap: 1rem;
}

.check-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.colores-fila {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.campo-color {
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-size: 0.85rem;
    color: var(--color-texto-secundario, #666);
    min-width: 36px;
  }
}

.input-color {
  width: 40px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--color-borde, #ccc);
  border-radius: 4px;
  cursor: pointer;
}

.color-hex {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--color-texto-secundario, #888);
}

.icono-preview {
  width: 40px;
  height: 40px;
  margin-top: 0.25rem;
  border-radius: 4px;
  border: 1px solid var(--color-borde, #ccc);
}

.cuadro-preview {
  display: flex;
  align-items: center;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  border-width: 2px;
  border-style: solid;
  max-width: 320px;
  gap: 1rem;

  &__nombre {
    margin: 0;
    font-size: 0.75rem;
    text-transform: uppercase;
    opacity: 0.85;
    letter-spacing: 0.03em;
  }

  &__valor {
    margin: 0.25rem 0 0;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
  }

  &__porcentaje {
    font-size: 0.75em;
  }

  &__icono {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    font-size: 1.5rem;
    opacity: 0.7;
  }

  &__icono-img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
}

.acciones-modal {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-borde, #e8e8e8);
}

.requerido {
  color: var(--color-primario-4, #991f47);
}

.input-archivo-simple {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 0.25rem;
}

.input-archivo-simple__gatillo {
  display: inline-block;
  padding: 4px 12px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  color: #333;
  user-select: none;
}

.input-archivo-simple__gatillo:hover {
  background: #e8e8e8;
  border-color: #bbb;
}

.input-archivo-simple__nombre {
  font-size: 0.85rem;
  color: #666;
}

.input-archivo-simple__oculto {
  display: none;
}

.check-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primario, #691c32);
}

.label-custom {
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
}
</style>
