<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);

const editableTitulo = ref(null);

const tamanosTitulo = {
  pequeno: '1.5rem',
  mediano: '2rem',
  grande: '2.5rem',
  'extra-grande': '3rem',
};

function colorTextoResuelto(color) {
  return color && color !== '#FFFFFF' ? color : 'var(--texto-primario)';
}

const estilosTitulo = computed(() => ({
  textAlign: props.modelValue.alineacion || 'left',
  color: colorTextoResuelto(props.modelValue.color),
  fontWeight: props.modelValue.negrita ? 700 : 400,
  fontSize: tamanosTitulo[props.modelValue.tamano] || tamanosTitulo.grande,
}));

function obtenerTextoModelo() {
  return String(props.modelValue?.texto ?? '');
}

function actualizarPropiedad(clave, valor) {
  emit('update:modelValue', {
    ...props.modelValue,
    [clave]: valor,
  });
}

function sincronizarContenido() {
  nextTick(() => {
    const elemento = editableTitulo.value;

    if (!elemento || document.activeElement === elemento) return;

    const texto = obtenerTextoModelo();

    if (elemento.textContent !== texto) {
      elemento.textContent = texto;
    }
  });
}

function actualizarTitulo(event) {
  const texto = event.currentTarget?.textContent ?? '';

  actualizarPropiedad('texto', texto);
}

watch(() => props.modelValue?.texto, sincronizarContenido, {
  immediate: true,
});

onMounted(sincronizarContenido);
</script>

<template>
  <section class="editor-titulo contenedor ancho-fijo">
    <LandingBuilderBarraHerramientasTexto
      tipo="titulo"
      :negrita="Boolean(props.modelValue.negrita)"
      :alineacion="props.modelValue.alineacion || 'left'"
      :tamano="props.modelValue.tamano || 'grande'"
      @update:negrita="actualizarPropiedad('negrita', $event)"
      @update:alineacion="actualizarPropiedad('alineacion', $event)"
      @update:tamano="actualizarPropiedad('tamano', $event)"
    />

    <h2
      ref="editableTitulo"
      class="editor-titulo__contenido"
      :style="estilosTitulo"
      data-placeholder="Escribe un título..."
      contenteditable="true"
      spellcheck="true"
      @input="actualizarTitulo"
      @blur="actualizarTitulo"
      @keydown.enter.prevent
    />
  </section>
</template>

<style scoped lang="scss">
.editor-titulo {
  position: relative;
  padding-top: 0;
  padding-bottom: 0;
  transition: padding-top 0.15s ease;

  :deep(.barra-herramientas-texto) {
    position: absolute;
    top: 14px;
    left: 0;
    z-index: 30;
    opacity: 0;
    pointer-events: none;
    transform: translateY(5px);
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
  }

  &:focus-within {
    padding-top: 56px;

    :deep(.barra-herramientas-texto) {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }
  }

  &__contenido {
    min-height: 52px;
    margin: 0;
    padding: 8px 0;
    outline: none;
    line-height: 1.25;
    overflow-wrap: anywhere;
    transition:
      font-size 0.15s ease,
      font-weight 0.15s ease;

    &:empty::before {
      color: var(--texto-secundario);
      content: attr(data-placeholder);
      opacity: 0.75;
      pointer-events: none;
    }

    &:focus-visible {
      outline: none;
    }
  }
}

@media (max-width: 767px) {
  .editor-titulo {
    padding-top: 0;
    padding-bottom: 0;

    &:focus-within {
      padding-top: 58px;
    }

    :deep(.barra-herramientas-texto) {
      top: 12px;
      left: 0;
    }
  }
}
</style>
