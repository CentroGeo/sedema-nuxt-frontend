<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import pictogramas from '~/utils/geocontenidos/pictogramas.json';

const props = defineProps({
  modelValue: { type: String, default: '' },
  // Por defecto el v-model es el glifo (usado en capas vectoriales de mapas,
  // p.ej. marcadores de escenas/panoramas). Con esta prop el v-model pasa a
  // ser el nombre del pictograma (usado en clases CSS `pictograma-<nombre>`,
  // p.ej. el icono de una temática).
  porNombre: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

// Lista { nombre, etiqueta, glifo } a partir del json de pictogramas.
const opciones = Object.keys(pictogramas)
  .sort()
  .map((nombre) => ({
    nombre,
    etiqueta: nombre.split('-').join(' '),
    glifo: String.fromCharCode(parseInt(pictogramas[nombre], 16)),
  }));

const abierto = ref(false);
const filtro = ref('');
const raiz = ref(null);
const direccion = ref('abajo');

// Alto aproximado del panel (buscador + lista max-height + paddings).
const ALTO_PANEL = 300;

const opcionesFiltradas = computed(() => {
  const q = filtro.value.trim().toLowerCase();
  if (!q) return opciones;
  return opciones.filter((o) => o.etiqueta.toLowerCase().includes(q));
});

const seleccionada = computed(() =>
  opciones.find((o) => (props.porNombre ? o.nombre : o.glifo) === props.modelValue)
);

function calcularDireccion() {
  if (!raiz.value) return;
  const rect = raiz.value.getBoundingClientRect();
  const espacioAbajo = window.innerHeight - rect.bottom;
  const espacioArriba = rect.top;
  // Hacia arriba solo si abajo no cabe y arriba hay más espacio.
  direccion.value = espacioAbajo < ALTO_PANEL && espacioArriba > espacioAbajo ? 'arriba' : 'abajo';
}

function alternar() {
  abierto.value = !abierto.value;
  if (abierto.value) {
    filtro.value = '';
    calcularDireccion();
  }
}

function elegir(opcion) {
  emit('update:modelValue', props.porNombre ? opcion.nombre : opcion.glifo);
  abierto.value = false;
}

function esOpcionActiva(opcion) {
  return (props.porNombre ? opcion.nombre : opcion.glifo) === props.modelValue;
}

function cerrar() {
  abierto.value = false;
}

function alClickFuera(evento) {
  if (abierto.value && raiz.value && !raiz.value.contains(evento.target)) {
    cerrar();
  }
}

onMounted(() => document.addEventListener('click', alClickFuera));
onBeforeUnmount(() => document.removeEventListener('click', alClickFuera));
</script>

<template>
  <div ref="raiz" class="selector-icono" @keydown.esc="cerrar">
    <button
      type="button"
      class="disparador"
      aria-haspopup="listbox"
      :aria-expanded="abierto"
      @click="alternar"
    >
      <span class="glifo" aria-hidden="true">{{ seleccionada?.glifo }}</span>
      <span class="etiqueta">{{ seleccionada?.etiqueta || 'Selecciona un icono' }}</span>
      <span class="pictograma-angulo-abajo caret" aria-hidden="true" />
    </button>

    <div
      v-if="abierto"
      class="panel"
      :class="{ 'hacia-arriba': direccion === 'arriba' }"
      role="listbox"
    >
      <input
        v-model="filtro"
        type="text"
        class="buscador"
        placeholder="Buscar icono…"
        aria-label="Buscar icono"
      />

      <ul class="lista">
        <li v-for="opcion in opcionesFiltradas" :key="opcion.nombre">
          <button
            type="button"
            class="opcion"
            :class="{ activa: esOpcionActiva(opcion) }"
            role="option"
            :aria-selected="esOpcionActiva(opcion)"
            @click="elegir(opcion)"
          >
            <span class="glifo" aria-hidden="true">{{ opcion.glifo }}</span>
            <span class="etiqueta">{{ opcion.etiqueta }}</span>
          </button>
        </li>
        <li v-if="opcionesFiltradas.length === 0" class="vacio">Sin resultados.</li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.selector-icono {
  position: relative;
  width: 100%;
}

.glifo {
  font-family: 'sisdai-pictogramas';
  font-size: 1.25rem;
  line-height: 1;
  flex-shrink: 0;
  color: var(--texto-primario);
}

.disparador {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--color-neutro-1);
  border-radius: 6px;
  background-color: var(--fondo);
  cursor: pointer;
  text-align: left;

  .etiqueta {
    font-size: 1rem;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    background-color: transparent;
    color: var(--texto-secundario);
  }

  .caret {
    flex-shrink: 0;
  }
}

.panel {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  border: 1px solid var(--color-neutro-1);
  border-radius: 8px;
  background-color: var(--fondo);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  padding: 6px;
}

.panel.hacia-arriba {
  top: auto;
  bottom: calc(100% + 4px);
}

.buscador {
  width: 100%;
  padding: 6px 8px;
  margin-bottom: 6px;
  border: 1px solid var(--color-neutro-1);
  border-radius: 6px;
}

.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 240px;
  overflow-y: auto;
}

.opcion {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 0px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  text-align: left;

  .etiqueta {
    flex: 1;
    min-width: 0;
    font-size: 1rem;
    background-color: transparent;
    color: var(--texto-secundario);
  }
}

.opcion:hover {
  background-color: var(--fondo-acento);
}

.opcion.activa {
  background-color: var(--fondo-acento);
  font-weight: 600;
}

.pictograma-angulo-abajo {
  font-size: 1rem;
  color: var(--texto-primario);
}

.vacio {
  padding: 8px;
  color: var(--color-neutro-3);
}
</style>
