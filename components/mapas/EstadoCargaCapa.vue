<script setup>
defineProps({
  estado: {
    type: String,
    default: 'idle',
    validator: (valor) => ['idle', 'loading', 'success', 'error'].includes(valor),
  },
  mensaje: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <div
    v-if="estado !== 'idle'"
    class="estado-carga-capa"
    :class="`estado-carga-capa--${estado}`"
    :role="estado === 'error' ? 'alert' : 'status'"
    aria-live="polite"
  >
    <span v-if="estado === 'loading'" class="estado-carga-capa__spinner" aria-hidden="true" />

    <span v-else-if="estado === 'success'" aria-hidden="true">✓</span>
    <span v-else-if="estado === 'error'" aria-hidden="true">!</span>

    <span>{{ mensaje }}</span>
  </div>
</template>

<style lang="scss" scoped>
.estado-carga-capa {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  line-height: 1.25;

  &--loading {
    color: var(--color-primario-1);
  }

  &--success {
    color: var(--color-confirmacion-1, #216e4e);
  }

  &--error {
    color: var(--color-error-1, #b42318);
  }

  &__spinner {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: girar-carga-capa 0.75s linear infinite;
  }
}

@keyframes girar-carga-capa {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .estado-carga-capa__spinner {
    animation-duration: 1.5s;
  }
}
</style>
