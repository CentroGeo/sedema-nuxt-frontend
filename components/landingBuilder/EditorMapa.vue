<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);

const ALTO_POR_DEFECTO = 480;

// El código que se copia en Geocontenidos > Mapas > Compartir > Embed es un
// <iframe src="..." width="..." height="...">; solo nos interesa la URL (el
// ancho se descarta a propósito porque el bloque siempre es responsivo). Si
// en vez del <iframe> pegan solo la URL, se usa tal cual.
function extraerUrlEmbed(codigo) {
  const texto = String(codigo || '').trim();
  const coincidencia = texto.match(/src\s*=\s*["']([^"']+)["']/i);
  if (coincidencia) return coincidencia[1];
  return /^https?:\/\//i.test(texto) ? texto : '';
}

function extraerAltoEmbed(codigo) {
  const texto = String(codigo || '');
  const coincidencia = texto.match(/height\s*=\s*["']?(\d+)/i);
  return coincidencia ? Number(coincidencia[1]) : null;
}

function urlEsSegura(url) {
  if (!url) return false;
  try {
    const analizada = new URL(url);
    return analizada.protocol === 'http:' || analizada.protocol === 'https:';
  } catch {
    return false;
  }
}

const errorEmbed = computed(() => {
  const codigo = props.modelValue?.codigoEmbed || '';
  if (!codigo.trim()) return '';
  return props.modelValue?.url
    ? ''
    : 'No se encontró una URL válida (http/https) en el código pegado.';
});

function actualizarPropiedad(clave, valor) {
  emit('update:modelValue', {
    ...props.modelValue,
    [clave]: valor,
  });
}

function actualizarCodigoEmbed(event) {
  const codigo = event.target.value;
  const urlExtraida = extraerUrlEmbed(codigo);
  const alto = extraerAltoEmbed(codigo);

  emit('update:modelValue', {
    ...props.modelValue,
    codigoEmbed: codigo,
    url: urlEsSegura(urlExtraida) ? urlExtraida : '',
    alto: props.modelValue?.alto || alto || ALTO_POR_DEFECTO,
  });
}
</script>

<template>
  <section class="editor-mapa contenedor ancho-fijo">
    <label class="editor-mapa__etiqueta" for="editor-mapa-codigo">Código embed del mapa</label>
    <textarea
      id="editor-mapa-codigo"
      class="editor-mapa__textarea"
      rows="3"
      placeholder='Pega aquí el código embed, por ejemplo: <iframe src="https://.../admin/mapas/9?marca=true" ...></iframe>'
      :value="modelValue?.codigoEmbed || ''"
      @input="actualizarCodigoEmbed"
    />
    <p v-if="errorEmbed" class="texto-color-error editor-mapa__error" role="alert">
      {{ errorEmbed }}
    </p>
    <p v-else class="editor-mapa__ayuda">
      En Geocontenidos &gt; Mapas, abre un mapa y usa "Compartir" &gt; "Embed" para copiar el
      código.
    </p>

    <div class="editor-mapa__controles">
      <label class="editor-mapa__campo">
        <span class="editor-mapa__etiqueta">Alto (px)</span>
        <input
          type="number"
          min="200"
          step="10"
          :value="modelValue?.alto || ALTO_POR_DEFECTO"
          @input="actualizarPropiedad('alto', Number($event.target.value) || ALTO_POR_DEFECTO)"
        />
      </label>

      <label class="editor-mapa__campo editor-mapa__campo--flex">
        <span class="editor-mapa__etiqueta">Título accesible (opcional)</span>
        <input
          type="text"
          placeholder="Mapa embebido"
          :value="modelValue?.titulo || ''"
          @input="actualizarPropiedad('titulo', $event.target.value)"
        />
      </label>
    </div>

    <div v-if="modelValue?.url" class="editor-mapa__vista-previa">
      <iframe
        class="editor-mapa__iframe"
        :src="modelValue.url"
        :height="modelValue.alto || ALTO_POR_DEFECTO"
        :title="modelValue.titulo || 'Mapa embebido'"
        loading="lazy"
      />
    </div>
    <div v-else class="editor-mapa__vacio">Pega un código embed para ver la vista previa.</div>
  </section>
</template>

<style scoped lang="scss">
.editor-mapa {
  padding-top: 16px;
  padding-bottom: 16px;

  &__etiqueta {
    display: block;
    margin-bottom: 4px;
    color: var(--campo-etiqueta-color);
    font-weight: 600;
    font-size: 0.8125rem;
  }

  &__textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 8px;
    border: 1px solid var(--color-neutro-1);
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.8125rem;
    resize: vertical;
  }

  &__error {
    margin: 6px 0 0;
    font-size: 0.8125rem;
  }

  &__ayuda {
    margin: 6px 0 0;
    color: var(--texto-secundario);
    font-size: 0.8125rem;
  }

  &__controles {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 12px;
  }

  &__campo {
    display: block;

    input {
      box-sizing: border-box;
      width: 140px;
      padding: 6px 8px;
      border: 1px solid var(--color-neutro-1);
      border-radius: 4px;
    }

    &--flex {
      flex: 1;
      min-width: 200px;

      input {
        width: 100%;
      }
    }
  }

  &__vista-previa {
    margin-top: 16px;
    overflow: hidden;
    border-radius: 12px;
  }

  &__iframe {
    display: block;
    width: 100%;
    border: 0;
  }

  &__vacio {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    margin-top: 16px;
    border: 1px dashed rgb(255 255 255 / 32%);
    border-radius: 12px;
    color: var(--texto-secundario);
    font-size: 0.875rem;
    text-align: center;
  }
}
</style>
