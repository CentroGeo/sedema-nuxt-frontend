<script setup>
import DOMPurify from 'dompurify';

const props = defineProps({
  contenido: { type: String, required: true },
  marcador: { type: Object, default: null },
  // Escenas del escenario (en orden) para los controles de navegación.
  escenas: { type: Array, default: () => [] },
  // [inicio, fin] del degradado del escenario, para los botones de navegación.
  gradiente: { type: Array, default: () => [] },
});

defineEmits({ alCerrar: [], alNavegar: [] });

const route = useRoute();

const indiceActual = computed(() =>
  props.escenas.findIndex(({ id }) => String(id) === String(route.params.escena))
);

const escenaAnterior = computed(() => props.escenas[indiceActual.value - 1]);
const escenaSiguiente = computed(() => props.escenas[indiceActual.value + 1]);

// Sin escenas hermanas (o con una escena que no pertenece al escenario) no hay a dónde navegar.
const mostrarControles = computed(() => props.escenas.length > 1 && indiceActual.value >= 0);

const estiloBoton = computed(() => {
  const [inicio, fin] = props.gradiente;
  return inicio && fin ? { background: `linear-gradient(to right, ${inicio}, ${fin})` } : {};
});

const contenidoSeguro = computed(() => DOMPurify.sanitize(props.contenido));
const contenidoMarcadorSeguro = computed(() => DOMPurify.sanitize(props.marcador?.content || ''));
</script>

<template>
  <div class="escena-texto">
    <div class="escena-texto__contenido">
      <!-- eslint-disable vue/no-v-html -->
      <div v-if="!marcador" v-html="contenidoSeguro" />

      <div v-else>
        <button class="boton-primario boton-chico" @click="$emit('alCerrar')">
          <span class="pictograma-cerrar m-r-1" aria-hidden="true" />
        </button>

        <div>
          <h2 class="m-b-1">{{ marcador.title }}</h2>
          <p class="m-t-0">
            <span class="pictograma-ubicacion pictograma-mediano p-0 m-r-1" aria-hidden="true" />
            <span> {{ marcador.lat }}, {{ marcador.lng }} </span>
          </p>

          <img v-if="marcador.image_url" :src="marcador.image_url" :alt="marcador.title" />

          <!-- eslint-disable vue/no-v-html -->
          <div v-html="contenidoMarcadorSeguro" />
        </div>
      </div>
    </div>

    <nav v-if="mostrarControles" class="escena-texto__navegacion">
      <button
        type="button"
        class="control-escena"
        :style="estiloBoton"
        :disabled="!escenaAnterior"
        @click="$emit('alNavegar', escenaAnterior.id)"
      >
        <span class="pictograma-flecha-izquierda" aria-hidden="true" />
        <span>Anterior</span>
      </button>

      <span class="escena-texto__contador">{{ indiceActual + 1 }} / {{ escenas.length }}</span>

      <button
        type="button"
        class="control-escena"
        :style="estiloBoton"
        :disabled="!escenaSiguiente"
        @click="$emit('alNavegar', escenaSiguiente.id)"
      >
        <span>Siguiente</span>
        <span class="pictograma-flecha-derecha" aria-hidden="true" />
      </button>
    </nav>
  </div>
</template>

<style lang="scss" scoped>
.escena-texto {
  display: flex;
  flex-direction: column;

  &__contenido {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  &__navegacion {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-neutro-3, #e5e7eb);
  }

  &__contador {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-neutro-6, #4b5563);
    white-space: nowrap;
  }

  .control-escena {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    background: var(--color-primario-4, #9333ea);
    color: #fff;
    font-weight: 500;
    cursor: pointer;
    transition:
      filter 0.2s ease,
      transform 0.2s ease;

    &:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

@media (max-width: 768px) {
  .escena-texto .control-escena {
    gap: 0.25rem;
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
  }
}
</style>
