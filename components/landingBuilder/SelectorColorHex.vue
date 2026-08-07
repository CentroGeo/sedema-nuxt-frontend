<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    default: '#FFFFFF',
  },
  id: {
    type: String,
    required: true,
  },
  etiqueta: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const inputColor = ref(null);

const coloresRapidos = [
  {
    nombre: 'Negro',
    valor: '#000000',
  },
  {
    nombre: 'Blanco',
    valor: '#FFFFFF',
  },
  {
    nombre: 'Rojo institucional',
    valor: '#9F2241',
  },
];

const colorValido = computed(() => /^#[0-9A-F]{6}$/i.test(props.modelValue));

const colorSeguro = computed(() => {
  if (colorValido.value) {
    return props.modelValue.toUpperCase();
  }

  return '#FFFFFF';
});

function abrirPaletaColor() {
  inputColor.value?.click();
}

function seleccionarColor(color) {
  emit('update:modelValue', color.toUpperCase());
}

function seleccionarColorNativo(event) {
  const color = event.target.value;

  seleccionarColor(color);
}

function estaSeleccionado(color) {
  return colorSeguro.value === color;
}
</script>

<template>
  <div class="selector-color">
    <label class="selector-color__etiqueta" :for="id">
      {{ etiqueta }}
    </label>

    <div class="selector-color__controles">
      <button
        type="button"
        class="selector-color__boton-paleta"
        :aria-label="`Abrir paleta para ${etiqueta.toLowerCase()}`"
        :title="`Abrir paleta para ${etiqueta.toLowerCase()}`"
        @click="abrirPaletaColor"
      >
        <span
          class="selector-color__muestra"
          :style="{ backgroundColor: colorSeguro }"
          aria-hidden="true"
        />

        <span class="selector-color__valor">
          {{ colorSeguro }}
        </span>

        <span class="selector-color__icono" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 3a9 9 0 0 0 0 18h1.2a1.8 1.8 0 0 0 1.2-3.15 1.25 1.25 0 0 1 .82-2.2H17a4 4 0 0 0 4-4C21 6.9 17 3 12 3ZM7.4 11.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm3-3.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm3.8 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm3 3.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </button>

      <input
        :id="id"
        ref="inputColor"
        class="selector-color__input-nativo"
        type="color"
        :value="colorSeguro"
        @input="seleccionarColorNativo"
      />

      <div
        class="selector-color__opciones"
        role="group"
        :aria-label="`Colores rápidos para ${etiqueta.toLowerCase()}`"
      >
        <button
          v-for="color in coloresRapidos"
          :key="color.valor"
          type="button"
          class="selector-color__circulo"
          :class="{
            'selector-color__circulo--seleccionado': estaSeleccionado(color.valor),
          }"
          :style="{ backgroundColor: color.valor }"
          :aria-label="color.nombre"
          :title="color.nombre"
          :aria-pressed="estaSeleccionado(color.valor)"
          @click="seleccionarColor(color.valor)"
        />
      </div>
    </div>

    <p class="selector-color__ayuda">Selecciona un color desde la paleta o usa un color rápido.</p>
  </div>
</template>

<style scoped lang="scss">
.selector-color {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 6px;

  &__etiqueta {
    font-size: 0.8125rem;
    font-weight: 600;
  }

  &__controles {
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: center;
    gap: 10px;
  }

  &__boton-paleta {
    display: inline-grid;
    width: min(260px, 100%);
    min-height: 42px;
    grid-template-columns: 24px 1fr 32px;
    align-items: center;
    gap: 10px;
    padding: 6px 6px 6px 10px;
    border: 1px solid rgb(255 255 255 / 52%);
    border-radius: 8px;
    background: rgb(255 255 255 / 4%);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      border-color: rgb(255 255 255 / 78%);
      background: rgb(255 255 255 / 8%);
    }

    &:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: 3px;
    }
  }

  &__muestra {
    display: inline-flex;
    width: 20px;
    height: 20px;
    border: 1px solid rgb(255 255 255 / 68%);
    border-radius: 6px;
    box-shadow: 0 1px 4px rgb(0 0 0 / 22%);
  }

  &__valor {
    min-width: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  &__icono {
    display: inline-flex;
    width: 30px;
    height: 30px;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    background: rgb(255 255 255 / 8%);
    color: currentcolor;

    svg {
      width: 17px;
      height: 17px;
    }
  }

  &__input-nativo {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }

  &__opciones {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 7px;
  }

  &__circulo {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 2px solid rgb(128 128 128 / 45%);
    border-radius: 50%;
    box-shadow: 0 2px 5px rgb(0 0 0 / 16%);
    cursor: pointer;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease;

    &:hover {
      transform: scale(1.08);
    }

    &:focus-visible {
      outline: 2px solid currentcolor;
      outline-offset: 3px;
    }

    &--seleccionado {
      box-shadow:
        0 0 0 2px var(--color-neutro-1, white),
        0 0 0 4px var(--color-primario-3, #9f2241);
      transform: scale(1.04);
    }
  }

  &__ayuda {
    margin: 0;
    color: var(--texto-secundario);
    font-size: 0.6875rem;
    line-height: 1.3;
  }
}

@media (max-width: 520px) {
  .selector-color {
    &__controles {
      align-items: flex-start;
      flex-direction: column;
    }

    &__boton-paleta {
      width: 100%;
    }

    &__opciones {
      width: 100%;
    }
  }
}
</style>
