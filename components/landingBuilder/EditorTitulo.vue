<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);

const { sanitizarHtmlEnriquecido } = useTextoEnriquecido();

const editableTitulo = ref(null);
const negritaActiva = ref(false);
const alineacionActiva = ref('left');
const tamanoActivo = ref('grande');

// document.execCommand('fontSize') solo soporta la escala legada 1-7 vía
// <font size="N">; se usa como mecanismo (con estilos propios en CSS) porque
// es lo único que aplica de forma nativa y confiable a la selección actual
// en vez de a todo el bloque.
const TAMANO_A_LEGADO = { pequeno: '3', mediano: '4', grande: '5', 'extra-grande': '6' };
const LEGADO_A_TAMANO = { 3: 'pequeno', 4: 'mediano', 5: 'grande', 6: 'extra-grande' };

const COMANDOS_ALINEACION = {
  left: 'justifyLeft',
  center: 'justifyCenter',
  right: 'justifyRight',
  justify: 'justifyFull',
};

function colorTextoResuelto(color) {
  return color && color !== '#FFFFFF' ? color : 'var(--texto-primario)';
}

const estilosTitulo = computed(() => ({
  color: colorTextoResuelto(props.modelValue.color),
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

    const html = obtenerTextoModelo();

    if (elemento.innerHTML !== html) {
      elemento.innerHTML = html;
    }
  });
}

function actualizarTitulo(event) {
  const html = sanitizarHtmlEnriquecido(event.currentTarget?.innerHTML ?? '');

  actualizarPropiedad('texto', html);
}

function calcularAlineacionActiva() {
  if (document.queryCommandState('justifyCenter')) return 'center';
  if (document.queryCommandState('justifyRight')) return 'right';
  return 'left';
}

function actualizarEstadoFormato() {
  const activo = document.activeElement === editableTitulo.value;

  negritaActiva.value = activo && document.queryCommandState('bold');
  alineacionActiva.value = activo ? calcularAlineacionActiva() : 'left';
  tamanoActivo.value =
    (activo && LEGADO_A_TAMANO[document.queryCommandValue('fontSize')]) || 'grande';
}

function alternarNegrita() {
  editableTitulo.value?.focus();
  document.execCommand('bold');
  actualizarTitulo({ currentTarget: editableTitulo.value });
  actualizarEstadoFormato();
}

function cambiarAlineacion(alineacion) {
  editableTitulo.value?.focus();
  document.execCommand(COMANDOS_ALINEACION[alineacion] || 'justifyLeft');
  actualizarTitulo({ currentTarget: editableTitulo.value });
  actualizarEstadoFormato();
}

function cambiarTamano(tamano) {
  editableTitulo.value?.focus();
  document.execCommand('fontSize', false, TAMANO_A_LEGADO[tamano] || '5');
  actualizarTitulo({ currentTarget: editableTitulo.value });
  actualizarEstadoFormato();
}

watch(() => props.modelValue?.texto, sincronizarContenido, {
  immediate: true,
});

onMounted(() => {
  sincronizarContenido();
  // Fuerza que negritas/etc. produzcan etiquetas semánticas (<b>) en vez de
  // `style` inline; el saneador solo conserva <b> y no atributos de estilo
  // arbitrarios, así que sin esto la negrita se perdía al guardar.
  document.execCommand('styleWithCSS', false, false);
  document.addEventListener('selectionchange', actualizarEstadoFormato);
});

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', actualizarEstadoFormato);
});
</script>

<template>
  <section class="editor-titulo contenedor ancho-fijo">
    <LandingBuilderBarraHerramientasTexto
      tipo="titulo"
      :negrita="negritaActiva"
      :alineacion="alineacionActiva"
      :tamano="tamanoActivo"
      @update:negrita="alternarNegrita"
      @update:alineacion="cambiarAlineacion"
      @update:tamano="cambiarTamano"
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
    font-size: 2.5rem;
    text-align: left;
    transition: color 0.15s ease;

    &:empty::before {
      color: var(--texto-secundario);
      content: attr(data-placeholder);
      opacity: 0.75;
      pointer-events: none;
    }

    &:focus-visible {
      outline: none;
    }

    :deep(font[size='3']) {
      font-size: 1.5rem;
    }

    :deep(font[size='4']) {
      font-size: 2rem;
    }

    :deep(font[size='5']) {
      font-size: 2.5rem;
    }

    :deep(font[size='6']) {
      font-size: 3rem;
    }

    // sisdai-css define b/strong con font-weight: 500, pero la tipografía
    // real no tiene esa variante y el navegador cae a 400 (se ve igual que
    // el texto normal); se fuerza 700 para que la negrita sea visible.
    :deep(b),
    :deep(strong) {
      font-weight: 700;
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
