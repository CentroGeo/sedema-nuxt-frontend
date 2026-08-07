<script setup>
const props = defineProps({
  layoutStyles: { type: Object, default: () => ({}) },
  tabs: {
    type: Array,
    default: () => [],
  },
});

defineEmits(['alClickTab', 'alEntrarTab', 'alSalirTab']);

const route = useRoute();
// Tab activo = escena actual de la ruta.
function esActiva(id) {
  return String(route.params.escena) === String(id);
}

const fondoDegradado = computed(
  () =>
    `linear-gradient(to right, ${props.layoutStyles.gradient_start}, ${props.layoutStyles.gradient_end})`
);
</script>

<template>
  <div class="timeline-container-horizontal p-4" :style="{ background: fondoDegradado }">
    <div class="linea-tiempo flex flex-contenido-centrado p-2">
      <div class="timeline-line" />
      <button
        v-for="({ id, name }, idx) in tabs"
        :key="`menu-tab-opcion-${id}`"
        class="boton-tab"
        :class="{ seleccionado: esActiva(id) }"
        :style="esActiva(id) ? { background: fondoDegradado } : {}"
        :aria-label="name"
        @click="() => $emit('alClickTab', id)"
        @mouseenter="$emit('alEntrarTab', $event, name)"
        @mouseleave="$emit('alSalirTab')"
        @focus="$emit('alEntrarTab', $event, name)"
        @blur="$emit('alSalirTab')"
      >
        {{ idx + 1 }}
      </button>
    </div>
  </div>
</template>

<style lang="scss">
.timeline-container-horizontal {
  max-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.linea-tiempo {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  max-width: 1200px;
  width: 100%;
  padding: 0 40px;

  .timeline-line {
    position: absolute;
    left: 40px;
    right: 40px;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }

  .boton-tab {
    position: relative;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    align-items: center;
    justify-content: center;
    padding: 16px 21px;
    box-shadow: rgba(252, 190, 165, 0.314) 0px 0px 20px;
    border: 4px solid #fff;
    color: #fff;
    z-index: 1;

    // No seleccionado: fondo blanco y numero oscuro para que sea legible.
    &:not(.seleccionado) {
      background: #fff;
      color: var(--color-primario-4, #333);
    }
  }
}
</style>
