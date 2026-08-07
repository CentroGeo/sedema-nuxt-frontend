<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);

const editableParrafo = ref(null);

const tamanosParrafo = {
  pequeno: '0.875rem',
  normal: '1rem',
  mediano: '1.125rem',
  grande: '1.25rem',
};

const esLista = computed(() => props.modelValue.tipoLista === 'vinetas');

function colorTextoResuelto(color) {
  return color && color !== '#FFFFFF' ? color : 'var(--texto-primario)';
}

const estilosParrafo = computed(() => ({
  textAlign: props.modelValue.alineacion || 'left',
  color: colorTextoResuelto(props.modelValue.color),
  fontWeight: props.modelValue.negrita ? 700 : 400,
  fontSize: tamanosParrafo[props.modelValue.tamano] || tamanosParrafo.normal,
}));

function obtenerTextoModelo() {
  return String(props.modelValue?.texto ?? '').replace(/\r/g, '');
}

function actualizarPropiedad(clave, valor) {
  emit('update:modelValue', {
    ...props.modelValue,
    [clave]: valor,
  });
}

function escaparHtml(texto) {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function obtenerLineas(texto) {
  const lineas = String(texto).replace(/\r/g, '').split('\n');

  return lineas.length ? lineas : [''];
}

function crearHtmlLista(texto) {
  return obtenerLineas(texto)
    .map((linea) => `<li>${linea ? escaparHtml(linea) : '<br>'}</li>`)
    .join('');
}

function obtenerTextoLista(elemento) {
  const elementosLista = Array.from(elemento.querySelectorAll(':scope > li'));

  if (!elementosLista.length) {
    return elemento.innerText ?? '';
  }

  return elementosLista
    .map((elementoLista) => elementoLista.innerText.replace(/\n/g, ' '))
    .join('\n');
}

function obtenerTextoEditable(elemento) {
  if (esLista.value) {
    return obtenerTextoLista(elemento);
  }

  return elemento.innerText ?? '';
}

function sincronizarContenido() {
  nextTick(() => {
    const elemento = editableParrafo.value;

    if (!elemento || document.activeElement === elemento) return;

    const texto = obtenerTextoModelo();

    if (esLista.value) {
      const textoActual = obtenerTextoLista(elemento);
      const tieneElementosLista = Boolean(elemento.querySelector(':scope > li'));

      if (textoActual !== texto || !tieneElementosLista) {
        elemento.innerHTML = crearHtmlLista(texto);
      }

      return;
    }

    if (elemento.innerText !== texto) {
      elemento.innerText = texto;
    }
  });
}

function actualizarParrafo(event) {
  const elemento = event.currentTarget;
  const texto = obtenerTextoEditable(elemento).replaceAll('\u00a0', ' ');

  actualizarPropiedad('texto', texto);
}

watch([() => props.modelValue?.texto, () => props.modelValue?.tipoLista], sincronizarContenido, {
  immediate: true,
});

onMounted(sincronizarContenido);
</script>

<template>
  <section class="editor-parrafo contenedor ancho-fijo">
    <LandingBuilderBarraHerramientasTexto
      tipo="parrafo"
      :negrita="Boolean(props.modelValue.negrita)"
      :alineacion="props.modelValue.alineacion || 'left'"
      :tamano="props.modelValue.tamano || 'normal'"
      :tipo-lista="props.modelValue.tipoLista || 'ninguna'"
      @update:negrita="actualizarPropiedad('negrita', $event)"
      @update:alineacion="actualizarPropiedad('alineacion', $event)"
      @update:tamano="actualizarPropiedad('tamano', $event)"
      @update:tipo-lista="actualizarPropiedad('tipoLista', $event)"
    />

    <component
      :is="esLista ? 'ul' : 'p'"
      ref="editableParrafo"
      class="editor-parrafo__contenido"
      :class="{
        'editor-parrafo__contenido--lista': esLista,
        'editor-parrafo__contenido--vacio': !obtenerTextoModelo().trim(),
      }"
      :style="estilosParrafo"
      data-placeholder="Escribe un párrafo..."
      contenteditable="true"
      spellcheck="true"
      @input="actualizarParrafo"
      @blur="actualizarParrafo"
    />
  </section>
</template>

<style scoped lang="scss">
.editor-parrafo {
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
    position: relative;
    min-height: 52px;
    margin: 0;
    padding: 8px 0;
    outline: none;
    line-height: 1.6;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    transition:
      color 0.15s ease,
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

    &--lista {
      padding-left: 1.75rem;
      white-space: normal;

      li {
        min-height: 1.6em;
        padding-left: 0.2rem;
      }
    }

    &--lista#{&}--vacio::after {
      position: absolute;
      top: 8px;
      left: 1.75rem;
      color: var(--texto-secundario);
      content: attr(data-placeholder);
      opacity: 0.75;
      pointer-events: none;
    }
  }
}

@media (max-width: 767px) {
  .editor-parrafo {
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
