<script setup>
defineProps({
  index: { type: Number, required: true },
  total: { type: Number, required: true },
});
const emit = defineEmits(['eliminar', 'mover-arriba', 'mover-abajo']);
</script>

<template>
  <div class="contenedor-seccion-canvas">
    <div class="contenedor-seccion-controles">
      <span class="controles-tag">Sección</span>

      <button
        type="button"
        class="boton-pictograma boton-sin-contenedor-secundario controle-btn"
        :disabled="index === 0"
        aria-label="Mover arriba"
        @click="emit('mover-arriba')"
      >
        <span class="pictograma-desplazar-arriba" aria-hidden="true"></span>
      </button>

      <button
        type="button"
        class="boton-pictograma boton-sin-contenedor-secundario controle-btn"
        :disabled="index === total - 1"
        aria-label="Mover abajo"
        @click="emit('mover-abajo')"
      >
        <span class="pictograma-desplazar-abajo" aria-hidden="true"></span>
      </button>

      <button
        type="button"
        class="boton-pictograma boton-sin-contenedor-secundario controle-btn controle-btn-delete"
        aria-label="Eliminar sección"
        @click="emit('eliminar')"
      >
        <span class="pictograma-eliminar" aria-hidden="true"></span>
      </button>
    </div>

    <div class="contenedor-seccion-cuerpo">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.contenedor-seccion-canvas {
  position: relative;
  border: 1px dashed transparent;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
  transition:
    border-color 0.2s,
    background-color 0.2s;

  &:hover {
    border-color: var(--color-neutro-3, #bdbdbd);
    background-color: rgb(0 0 0 / 1%);

    .contenedor-seccion-controles {
      opacity: 1;
    }
  }
}

.contenedor-seccion-controles {
  position: absolute;
  top: -14px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--color-neutro-1, #f5f5f5);
  border: 1px solid var(--color-neutro-3, #bdbdbd);
  border-radius: 6px;
  padding: 2px 6px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
  opacity: 0;
  transition: opacity 0.2s;
}

.controles-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-neutro-5, #757575);
  text-transform: uppercase;
  margin-right: 6px;
}

.controle-btn {
  width: 24px !important;
  height: 24px !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-neutro-5, #616161);

  &:hover:not(:disabled) {
    background: var(--color-neutro-2, #e0e0e0) !important;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.controle-btn-delete {
  color: var(--color-informativo-error-2, #b71c1c);
  &:hover:not(:disabled) {
    background: #ffebee !important;
  }
}

.contenedor-seccion-cuerpo {
  width: 100%;
}
</style>
