<script setup>
const props = defineProps({
  tipo: {
    type: String,
    required: true,
    validator: (valor) => ['titulo', 'parrafo'].includes(valor),
  },
  negrita: {
    type: Boolean,
    default: false,
  },
  alineacion: {
    type: String,
    default: 'left',
  },
  tamano: {
    type: String,
    default: 'normal',
  },
  tipoLista: {
    type: String,
    default: 'ninguna',
  },
});

const emit = defineEmits([
  'update:negrita',
  'update:alineacion',
  'update:tamano',
  'update:tipoLista',
]);

const opcionesTamano = computed(() => {
  if (props.tipo === 'titulo') {
    return [
      {
        id: 'pequeno',
        etiqueta: 'Título pequeño',
      },
      {
        id: 'mediano',
        etiqueta: 'Título mediano',
      },
      {
        id: 'grande',
        etiqueta: 'Título grande',
      },
      {
        id: 'extra-grande',
        etiqueta: 'Título extra grande',
      },
    ];
  }

  return [
    {
      id: 'pequeno',
      etiqueta: 'Texto pequeño',
    },
    {
      id: 'normal',
      etiqueta: 'Texto normal',
    },
    {
      id: 'mediano',
      etiqueta: 'Texto mediano',
    },
    {
      id: 'grande',
      etiqueta: 'Texto grande',
    },
  ];
});

const opcionesAlineacion = computed(() => {
  const opciones = [
    {
      id: 'left',
      etiqueta: 'Alinear a la izquierda',
      ruta: 'M4 6h16 M4 10h11 M4 14h16 M4 18h9',
    },
    {
      id: 'center',
      etiqueta: 'Centrar',
      ruta: 'M4 6h16 M6.5 10h11 M4 14h16 M7.5 18h9',
    },
    {
      id: 'right',
      etiqueta: 'Alinear a la derecha',
      ruta: 'M4 6h16 M9 10h11 M4 14h16 M11 18h9',
    },
  ];

  if (props.tipo === 'parrafo') {
    opciones.push({
      id: 'justify',
      etiqueta: 'Justificar',
      ruta: 'M4 6h16 M4 10h16 M4 14h16 M4 18h16',
    });
  }

  return opciones;
});

const listaActiva = computed(() => props.tipoLista === 'vinetas');

function cambiarNegrita() {
  emit('update:negrita', !props.negrita);
}

function cambiarTamano(event) {
  emit('update:tamano', event.target.value);
}

function cambiarAlineacion(alineacion) {
  emit('update:alineacion', alineacion);
}

function cambiarTipoLista() {
  emit('update:tipoLista', listaActiva.value ? 'ninguna' : 'vinetas');
}
</script>

<template>
  <div
    class="barra-herramientas-texto"
    role="toolbar"
    :aria-label="tipo === 'titulo' ? 'Formato del título' : 'Formato del párrafo'"
    @pointerdown.stop
    @click.stop
  >
    <label class="barra-herramientas-texto__campo">
      <span class="barra-herramientas-texto__etiqueta-oculta"> Tamaño del texto </span>

      <select
        class="barra-herramientas-texto__selector"
        :value="tamano"
        title="Tamaño del texto"
        aria-label="Tamaño del texto"
        @change="cambiarTamano"
      >
        <option v-for="opcion in opcionesTamano" :key="opcion.id" :value="opcion.id">
          {{ opcion.etiqueta }}
        </option>
      </select>
    </label>

    <span class="barra-herramientas-texto__separador" aria-hidden="true" />

    <button
      type="button"
      class="barra-herramientas-texto__boton barra-herramientas-texto__boton--negrita"
      :class="{
        'barra-herramientas-texto__boton--activo': negrita,
      }"
      :aria-pressed="negrita"
      aria-label="Negritas"
      title="Negritas"
      @pointerdown.prevent
      @click="cambiarNegrita"
    >
      B
    </button>

    <span class="barra-herramientas-texto__separador" aria-hidden="true" />

    <button
      v-for="opcion in opcionesAlineacion"
      :key="opcion.id"
      type="button"
      class="barra-herramientas-texto__boton"
      :class="[
        `barra-herramientas-texto__boton--${opcion.id}`,
        {
          'barra-herramientas-texto__boton--activo': alineacion === opcion.id,
        },
      ]"
      :aria-label="opcion.etiqueta"
      :title="opcion.etiqueta"
      :aria-pressed="alineacion === opcion.id"
      @pointerdown.prevent
      @click="cambiarAlineacion(opcion.id)"
    >
      <svg
        class="barra-herramientas-texto__icono-alineacion"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          :d="opcion.ruta"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <template v-if="tipo === 'parrafo'">
      <span class="barra-herramientas-texto__separador" aria-hidden="true" />

      <button
        type="button"
        class="barra-herramientas-texto__boton"
        :class="{
          'barra-herramientas-texto__boton--activo': listaActiva,
        }"
        :aria-pressed="listaActiva"
        aria-label="Lista con viñetas"
        title="Lista con viñetas"
        @pointerdown.prevent
        @click="cambiarTipoLista"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="7" r="1.5" fill="currentColor" />
          <circle cx="5" cy="12" r="1.5" fill="currentColor" />
          <circle cx="5" cy="17" r="1.5" fill="currentColor" />

          <path
            d="M9 7h10M9 12h10M9 17h10"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.barra-herramientas-texto {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 3px;
  padding: 3px 5px;
  border: 1px solid rgb(255 255 255 / 16%);
  border-radius: 999px;
  background: rgb(105 28 50 / 92%);
  box-shadow: 0 10px 24px rgb(0 0 0 / 24%);
  color: white;
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);

  &__campo {
    display: inline-flex;
    align-items: center;
  }

  &__selector {
    max-width: 148px;
    min-height: 26px;
    padding: 2px 24px 2px 8px;
    border: 0;
    border-radius: 999px;
    outline: none;
    background: rgb(255 255 255 / 8%);
    color: white;
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: rgb(255 255 255 / 14%);
    }

    option {
      background: var(--color-primario-5, #3b111d);
      color: white;
    }
  }

  &__boton {
    display: inline-flex;
    width: 27px;
    height: 27px;
    flex: 0 0 27px;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: rgb(255 255 255 / 76%);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: rgb(255 255 255 / 12%);
      color: white;
    }

    &--activo {
      background: rgb(255 255 255 / 18%);
      color: white;
      box-shadow: inset 0 0 0 1px rgb(255 255 255 / 12%);
    }

    &--negrita {
      font-weight: 800;
    }

    svg {
      width: 16px;
      height: 16px;
    }
  }

  &__icono-alineacion {
    display: block;
    width: 17px;
    height: 17px;
    flex-shrink: 0;
  }

  &__separador {
    width: 1px;
    height: 18px;
    margin: 0 2px;
    background: rgb(255 255 255 / 16%);
  }

  &__etiqueta-oculta {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    padding: 0;
    border: 0;
    margin: -1px;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
}

@media (max-width: 767px) {
  .barra-herramientas-texto {
    max-width: calc(100vw - 64px);
    overflow-x: auto;

    &__selector {
      max-width: 128px;
    }
  }
}
</style>
