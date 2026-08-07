<script setup>
const emit = defineEmits(['agregar']);
</script>

<template>
  <div class="divisor-lienzo">
    <hr class="divisor-linea" />
    <button
      type="button"
      class="boton-pictograma boton-sin-contenedor-secundario divisor-boton"
      aria-label="Agregar sección aquí"
      @click="emit('agregar')"
    >
      <span class="pictograma-agregar" aria-hidden="true"></span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.divisor-lienzo {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  margin: 8px 0;
  opacity: 0.15;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
}

.divisor-linea {
  width: 100%;
  border: 0;
  border-top: 1px dashed var(--color-neutro-3, #bdbdbd);
  margin: 0;
}

.divisor-boton {
  position: absolute;
  background: var(--color-neutro-1, #f5f5f5) !important;
  border: 1px solid var(--color-neutro-3, #bdbdbd) !important;
  border-radius: 50% !important;
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-neutro-5, #424242);

  &:hover {
    background: var(--color-neutro-2, #e0e0e0) !important;
  }
}
</style>
