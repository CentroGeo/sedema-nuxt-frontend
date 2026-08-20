<script setup>
const props = defineProps({
  capas: {
    type: Array,
    default: () => [],
  },
  editable: {
    type: Boolean,
    default: false,
  },
  mapa: {
    type: Object,
    default: null,
  },
  estadosCarga: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  'toggle',
  'opacidad',
  'reordenar',
  'eliminar',
  'agregar',
  'vista',
  'guardar-vista',
  'posicion',
]);

// Solo los mapas con dos paneles (swipe/dual) usan map_position.
const tieneLados = computed(
  () => props.mapa?.map_type === 'swipe' || props.mapa?.map_type === 'dual'
);

const vista = reactive({
  zoom: 5,
  center_lat: -101.61,
  center_long: 22.21,
});

const vistaGuardada = reactive({
  zoom: 5,
  center_lat: -101.61,
  center_long: 22.21,
});

const guardandoVista = ref(false);

watch(
  () => props.mapa?.id,
  () => {
    const m = props.mapa;
    if (!m) return;
    vista.zoom = m.zoom ?? 5;
    vista.center_lat = m.center_lat ?? -101.61;
    vista.center_long = m.center_long ?? 22.21;
    vistaGuardada.zoom = vista.zoom;
    vistaGuardada.center_lat = vista.center_lat;
    vistaGuardada.center_long = vista.center_long;
  },
  { immediate: true }
);

watch(
  () => [props.mapa?.zoom, props.mapa?.center_lat, props.mapa?.center_long],
  ([z, lat, lng]) => {
    if (!props.mapa) return;
    if (z !== undefined && Number(z) !== Number(vista.zoom)) vista.zoom = z;
    if (lat !== undefined && Number(lat) !== Number(vista.center_lat)) vista.center_lat = lat;
    if (lng !== undefined && Number(lng) !== Number(vista.center_long)) vista.center_long = lng;
  }
);

const vistaSucia = computed(() => {
  const sucia =
    Number(vista.zoom) !== Number(vistaGuardada.zoom) ||
    Number(vista.center_lat) !== Number(vistaGuardada.center_lat) ||
    Number(vista.center_long) !== Number(vistaGuardada.center_long);
  return sucia;
});

function emitirVista() {
  const payload = {
    zoom: Number(vista.zoom),
    center_lat: Number(vista.center_lat),
    center_long: Number(vista.center_long),
  };
  emit('vista', payload);
}

async function guardarVista() {
  guardandoVista.value = true;
  const payload = {
    zoom: Number(vista.zoom),
    center_lat: Number(vista.center_lat),
    center_long: Number(vista.center_long),
  };
  emit('guardar-vista', payload);
  vistaGuardada.zoom = payload.zoom;
  vistaGuardada.center_lat = payload.center_lat;
  vistaGuardada.center_long = payload.center_long;
  guardandoVista.value = false;
}

const capasOrdenadas = computed(() =>
  [...props.capas].sort((a, b) => b.stack_order - a.stack_order)
);

function esCapaRemota(capa) {
  return String(capa.dataset_sourcetype || '').toUpperCase() === 'REMOTE';
}

function estadoCarga(capa) {
  return props.estadosCarga[capa.id] || 'idle';
}

function textoEstadoCarga(capa) {
  const mensajes = {
    loading: 'Cargando capa…',
    success: 'Capa cargada',
    error: 'No fue posible cargar esta capa',
  };

  return mensajes[estadoCarga(capa)] || '';
}

function alternarVisible(capa) {
  emit('toggle', { id: capa.id, visible: !capa.visible });
}

function cambiarOpacidad(capa, valor) {
  emit('opacidad', { id: capa.id, opacity: Number(valor) });
}

function moverArriba(index) {
  if (index === 0) return;
  const ordenadas = capasOrdenadas.value;
  const a = ordenadas[index];
  const b = ordenadas[index - 1];
  emit('reordenar', [
    { id: a.id, stack_order: b.stack_order },
    { id: b.id, stack_order: a.stack_order },
  ]);
}

function moverAbajo(index) {
  const ordenadas = capasOrdenadas.value;
  if (index === ordenadas.length - 1) return;
  const a = ordenadas[index];
  const b = ordenadas[index + 1];
  emit('reordenar', [
    { id: a.id, stack_order: b.stack_order },
    { id: b.id, stack_order: a.stack_order },
  ]);
}

function cambiarPosicion(capa, valor) {
  if (valor === capa.map_position) return;
  emit('posicion', { id: capa.id, map_position: valor });
}

const modalConfirmar = ref(null);

async function eliminar(capa) {
  const ok = await modalConfirmar.value?.abrir({
    titulo: 'Eliminar capa',
    mensaje: `¿Eliminar la capa "${capa.dataset_title || capa.name}"?`,
    textoConfirmar: 'Eliminar',
  });
  if (!ok) return;
  emit('eliminar', capa.id);
}
</script>

<template>
  <aside class="panel-capas">
    <div class="panel-encabezado flex flex-contenido-separado">
      <h3 class="m-0">Capas</h3>
      <button
        v-if="editable"
        class="boton-secundario boton-chico"
        type="button"
        @click="emit('agregar')"
      >
        <span class="pictograma-mas" aria-hidden="true" /> Agregar
      </button>
    </div>

    <section v-if="editable && mapa" class="panel-vista">
      <div class="flex flex-contenido-separado vista-encabezado">
        <h4 class="m-0">Vista del mapa</h4>
        <button
          class="boton-primario boton-chico"
          type="button"
          :disabled="!vistaSucia || guardandoVista"
          @click="guardarVista"
        >
          {{ guardandoVista ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>
      <div class="campo-vista">
        <label :for="`vista-zoom-${mapa.id}`" class="texto-secundario">
          Zoom: {{ Number(vista.zoom).toFixed(1) }}
        </label>
        <input
          :id="`vista-zoom-${mapa.id}`"
          v-model.number="vista.zoom"
          type="range"
          min="0"
          max="20"
          step="0.1"
          @input="emitirVista"
        />
      </div>
      <div class="campo-vista">
        <label :for="`vista-lat-${mapa.id}`" class="texto-secundario">Centro (longitud)</label>
        <input
          :id="`vista-lat-${mapa.id}`"
          v-model.number="vista.center_lat"
          type="number"
          step="0.0001"
          @input="emitirVista"
        />
      </div>
      <div class="campo-vista">
        <label :for="`vista-long-${mapa.id}`" class="texto-secundario">Centro (latitud)</label>
        <input
          :id="`vista-long-${mapa.id}`"
          v-model.number="vista.center_long"
          type="number"
          step="0.0001"
          @input="emitirVista"
        />
      </div>
    </section>

    <p v-if="!capasOrdenadas.length" class="m-y-2 texto-secundario">Este mapa no tiene capas.</p>

    <ul class="lista-capas">
      <li v-for="(capa, idx) in capasOrdenadas" :key="capa.id" class="capa-item p-1">
        <div class="capa-cabecera">
          <div class="capa-titulo-fila">
            <span class="capa-nombre">
              {{ capa.dataset_title || capa.name }}
            </span>

            <button
              v-if="editable"
              class="boton-pictograma boton-sin-contenedor-secundario texto-color-error"
              type="button"
              :aria-label="`Eliminar ${capa.dataset_title || capa.name}`"
              @click="eliminar(capa)"
            >
              <span class="pictograma-eliminar" aria-hidden="true"></span>
            </button>
          </div>

          <p v-if="esCapaRemota(capa)" class="capa-identificador m-y-1">
            WMS: {{ capa.wms_layer_name || capa.name }}
          </p>

          <div class="capa-metadatos">
            <label class="control-visibilidad" :class="{ 'esta-deshabilitado': !editable }">
              <input
                class="switch-input"
                type="checkbox"
                :checked="capa.visible"
                :disabled="!editable"
                :aria-label="`${capa.visible ? 'Desactivar' : 'Activar'} ${capa.dataset_title || capa.name}`"
                @change="alternarVisible(capa)"
              />

              <span class="switch-control" aria-hidden="true"></span>

              <span class="switch-etiqueta">
                {{ capa.visible ? 'Activa' : 'Inactiva' }}
              </span>
            </label>

            <span v-if="esCapaRemota(capa)" class="etiqueta-remota">Remota</span>

            <span
              v-if="capa.dataset_is_published != null"
              class="etiqueta-visibilidad"
              :class="capa.dataset_is_published ? 'es-publica' : 'es-privada'"
            >
              {{ capa.dataset_is_published ? 'Publicada' : 'No publicada' }}
            </span>

            <span v-if="tieneLados && capa.map_position" class="etiqueta-pos">
              {{ capa.map_position === 'left' ? 'Izq' : 'Der' }}
            </span>
          </div>
        </div>

        <p
          v-if="estadoCarga(capa) !== 'idle'"
          class="estado-carga m-y-1"
          :class="`es-${estadoCarga(capa)}`"
          aria-live="polite"
        >
          {{ textoEstadoCarga(capa) }}
        </p>

        <div class="capa-opacidad m-t-1">
          <label :for="`op-${capa.id}`" class="texto-secundario">
            Opacidad: {{ Math.round(capa.opacity * 100) }}%
          </label>
          <input
            :id="`op-${capa.id}`"
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="capa.opacity"
            :disabled="!editable"
            @input="cambiarOpacidad(capa, $event.target.value)"
          />
        </div>

        <div v-if="editable && tieneLados" class="capa-posicion m-t-1">
          <label :for="`pos-${capa.id}`" class="texto-secundario">Panel</label>
          <select
            :id="`pos-${capa.id}`"
            :value="capa.map_position"
            @change="cambiarPosicion(capa, $event.target.value)"
          >
            <option value="left">Panel izquierdo</option>
            <option value="right">Panel derecho</option>
          </select>
        </div>

        <div v-if="editable" class="capa-acciones flex flex-contenido-final m-t-1">
          <button
            class="boton-pictograma boton-sin-contenedor-secundario"
            :disabled="idx === 0"
            aria-label="Subir capa"
            type="button"
            @click="moverArriba(idx)"
          >
            <span class="pictograma-angulo-arriba" aria-hidden="true" />
          </button>
          <button
            class="boton-pictograma boton-sin-contenedor-secundario"
            :disabled="idx === capasOrdenadas.length - 1"
            aria-label="Bajar capa"
            type="button"
            @click="moverAbajo(idx)"
          >
            <span class="pictograma-angulo-abajo" aria-hidden="true" />
          </button>
        </div>
      </li>
    </ul>

    <GeocontenidosModalConfirmar ref="modalConfirmar" />
  </aside>
</template>

<style lang="scss" scoped>
.panel-capas {
  padding: 12px;
  background-color: var(--fondo);
  border-left: 1px solid var(--color-neutro-1);
  overflow-y: auto;
  height: 100%;
  width: 100%;
  max-width: none;
  min-width: 0;
}

.panel-encabezado {
  align-items: center;
  margin-bottom: 12px;
}

.lista-capas {
  list-style: none;
  padding: 0;
  margin: 0;
}

.capa-item {
  border: 1px solid var(--color-neutro-1);
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: var(--fondo-acento);
}

.capa-titulo-fila {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.capa-nombre {
  flex: 1;
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  font-weight: 600;
  line-height: 1.3;
}

.capa-identificador {
  font-size: 0.72rem;
  color: var(--texto-secundario);
  overflow-wrap: anywhere;
}

.capa-metadatos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.control-visibilidad {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.control-visibilidad.esta-deshabilitado {
  cursor: not-allowed;
  opacity: 0.65;
}

.switch-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.switch-control {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 21px;
  flex: 0 0 38px;
  border: 1px solid var(--borde-secundario);
  border-radius: 999px;
  background-color: var(--color-neutro-3);
  transition:
    background-color 160ms ease,
    border-color 160ms ease;
}

.switch-control::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 35%);
  transition: transform 160ms ease;
}

.switch-input:checked + .switch-control {
  border-color: var(--texto-confirmacion);
  background-color: var(--fondo-confirmacion);
}

.switch-input:checked + .switch-control::after {
  transform: translateX(17px);
}

.switch-input:focus-visible + .switch-control {
  outline: 2px solid var(--boton-primario-fondo);
  outline-offset: 2px;
}

.switch-input:disabled + .switch-control {
  cursor: not-allowed;
}

.switch-etiqueta {
  min-width: 45px;
}

.etiqueta-remota {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 6px;
  white-space: nowrap;
  background-color: var(--color-secundario-2);
  color: var(--color-primario-4);
}

.estado-carga {
  font-size: 0.75rem;
}

.estado-carga.es-loading {
  color: var(--texto-secundario);
}

.estado-carga.es-success {
  color: var(--texto-confirmacion);
}

.estado-carga.es-error {
  color: var(--texto-error);
}

.etiqueta-pos {
  font-size: 0.75rem;
  background-color: var(--color-secundario-2);
  color: var(--color-primario-4);
  padding: 2px 6px;
  border-radius: 6px;
}

.etiqueta-visibilidad {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 6px;
  white-space: nowrap;
}

.etiqueta-visibilidad.es-publica {
  background-color: var(--fondo-confirmacion);
  color: var(--texto-confirmacion);
}

.etiqueta-visibilidad.es-privada {
  background-color: var(--fondo-error);
  color: var(--texto-error);
}

.capa-opacidad input[type='range'] {
  width: 100%;
}

.capa-posicion {
  display: flex;
  flex-direction: column;
  gap: 4px;

  select {
    width: 100%;
  }
}

.panel-vista {
  padding: 8px 10px;
  border: 1px solid var(--color-neutro-1);
  border-radius: 8px;
  background-color: var(--fondo-acento);
  margin-bottom: 12px;
}

.campo-vista {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;

  input[type='range'],
  input[type='number'] {
    width: 100%;
  }
}

.flex {
  gap: 8px;
}
</style>
