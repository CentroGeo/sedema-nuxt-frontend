<script setup>
import { ref } from 'vue';

defineProps({
  titulo: { type: String, default: '' },
});

const abierto = ref(false);

function alternar() {
  abierto.value = !abierto.value;
}
</script>

<template>
  <div class="info-control">
    <button
      class="info-boton sisdai-mapa-control-boton"
      type="button"
      :aria-pressed="abierto"
      :aria-expanded="abierto"
      aria-label="Información del mapa"
      title="Información del mapa"
      @click="alternar"
    >
      <span class="pictograma-informacion" aria-hidden="true"></span>
    </button>

    <div v-if="abierto" class="info-panel">
      <h2 class="info-titulo">{{ titulo || 'Mapa' }}</h2>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.info-control {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.info-boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 46px;
  border: none;
  border-radius: 32px;
  cursor: pointer;
  font-size: 1.5rem;
  background-color: var(--boton-primario-fondo);
  color: var(--boton-primario-color);

  &:hover,
  &:focus-visible {
    background-color: var(--boton-primario-cursor-fondo);
    color: var(--boton-primario-cursor-color);
  }
}

.info-panel {
  max-width: 320px;
  padding: 8px 12px;
  background-color: var(--fondo);
  border: 1px solid var(--borde-secundario);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(var(--color-neutro-7-rgb), 0.25);
}

.info-titulo {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--texto-primario);
}
</style>
