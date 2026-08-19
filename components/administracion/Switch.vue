<script setup>
/**
 * @typedef {Object} Props
 * @property {Boolean} [modelValue=false] - Estado actual del interruptor.
 * @property {Boolean} [disabled=false] - Deshabilita la interacción (ej. submódulo cuyo módulo padre está apagado).
 * @property {String} [labelActivo='Habilitado'] - Texto mostrado cuando el estado es verdadero.
 * @property {String} [labelInactivo='Deshabilitado'] - Texto mostrado cuando el estado es falso.
 * @property {String} [labelDeshabilitado] - Texto mostrado cuando `disabled` es verdadero, en vez de labelActivo/labelInactivo.
 * @property {String} [ariaLabel='Alternar estado'] - Etiqueta accesible del control.
 * @property {Boolean} [ocultarTexto=false] - Oculta el texto de estado, deja solo el control (útil en celdas de tabla).
 */
/** @type {Props} */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  labelActivo: { type: String, default: 'Habilitado' },
  labelInactivo: { type: String, default: 'Deshabilitado' },
  labelDeshabilitado: { type: String, default: '' },
  ariaLabel: { type: String, default: 'Alternar estado' },
  ocultarTexto: { type: Boolean, default: false },
});

defineEmits(['update:modelValue']);

const texto = computed(() => {
  if (props.disabled && props.labelDeshabilitado) return props.labelDeshabilitado;
  return props.modelValue ? props.labelActivo : props.labelInactivo;
});
</script>

<template>
  <div class="administracion-switch" style="gap: 8px">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :aria-label="ariaLabel"
      :disabled="disabled"
      class="administracion-switch-control"
      :class="{ 'administracion-switch-control--activo': modelValue }"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <span class="administracion-switch-perilla" aria-hidden="true" />
    </button>
    <span
      v-if="!ocultarTexto"
      class="administracion-switch-texto"
      :class="
        disabled
          ? 'texto-color-neutro'
          : modelValue
            ? 'texto-color-confirmacion'
            : 'texto-color-neutro'
      "
    >
      {{ texto }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.administracion-switch {
  display: flex;
  align-items: center;
}

.administracion-switch-control {
  position: relative;
  width: 40px;
  height: 22px;
  flex: 0 0 auto;
  border-radius: 20px;
  border: none;
  padding: 0;
  cursor: pointer;
  background-color: var(--color-neutro-3, #bdbdbd);
  transition: background-color 0.2s ease;

  &--activo {
    background-color: var(--color-confirmacion-2, #2e7d32);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primario-2, #691c32);
    outline-offset: 2px;
  }
}

.administracion-switch-perilla {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: #ffffff;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.administracion-switch-control--activo .administracion-switch-perilla {
  transform: translateX(18px);
}

.administracion-switch-texto {
  font-size: 0.85rem;
  font-weight: 600;
}
</style>
