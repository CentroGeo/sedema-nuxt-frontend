<script setup>
const store = useLandingBuilderStore();

const idArrastrado = ref(null);

function alIniciarArrastre(id) {
  idArrastrado.value = id;
}

function alSoltar(idDestino) {
  if (idArrastrado.value) {
    store.reordenarTarjetas(idArrastrado.value, idDestino);
  }
  idArrastrado.value = null;
}

function manejarSeleccionImagen(id, archivo) {
  store.setImagenTarjeta(id, archivo);
}
</script>

<template>
  <section class="tarjetas-editor panel-edicion__tarjeta borde borde-redondeado-16 p-3">
    <div class="flex flex-contenido-separado tarjetas-editor__encabezado">
      <div>
        <h3 class="panel-edicion__titulo">Tarjetas de la sección</h3>
        <p class="panel-edicion__ayuda">
          Agrega, edita, reordena o elimina las tarjetas informativas de la landing page. Arrastra
          una tarjeta desde el ícono de mover para cambiar su posición.
        </p>
      </div>

      <span class="tarjetas-editor__contador" aria-live="polite">
        {{ store.tarjetas.length }}/10
      </span>
    </div>

    <p v-if="store.tarjetas.length === 0" class="texto-color-secundario">
      Aún no hay tarjetas. Agrega la primera con el botón de abajo.
    </p>

    <ul class="tarjetas-editor__lista">
      <li
        v-for="(tarjeta, indice) in store.tarjetas"
        :key="tarjeta.id"
        class="tarjetas-editor__item borde borde-redondeado-8"
        @dragover.prevent
        @drop="alSoltar(tarjeta.id)"
      >
        <div
          class="tarjetas-editor__item-encabezado"
          draggable="true"
          @dragstart="alIniciarArrastre(tarjeta.id)"
        >
          <button
            type="button"
            class="boton-pictograma boton-sin-contenedor-secundario boton-chico"
            aria-label="Arrastra para reordenar la tarjeta"
            title="Arrastra para reordenar"
          >
            <span class="pictograma-mover" aria-hidden="true" />
          </button>

          <p class="tarjetas-editor__item-titulo">Tarjeta {{ indice + 1 }}</p>

          <button
            type="button"
            class="boton-pictograma boton-sin-contenedor-secundario boton-chico"
            aria-label="Eliminar tarjeta"
            title="Eliminar tarjeta"
            @click="store.eliminarTarjeta(tarjeta.id)"
          >
            <span class="pictograma-eliminar" aria-hidden="true" />
          </button>
        </div>

        <div class="tarjetas-editor__campo">
          <LandingBuilderCargaLogo
            :logo-url="tarjeta.imagenUrl"
            label="Imagen de la tarjeta"
            @seleccionar-logo="(archivo) => manejarSeleccionImagen(tarjeta.id, archivo)"
          />
        </div>

        <div class="tarjetas-editor__campo">
          <label :for="`tarjeta-titulo-${tarjeta.id}`">
            <span class="pictograma-editar m-r-1" aria-hidden="true" />
            Título
          </label>
          <input
            :id="`tarjeta-titulo-${tarjeta.id}`"
            v-model="tarjeta.titulo"
            type="text"
            placeholder="Título de la tarjeta"
          />
        </div>

        <div class="tarjetas-editor__campo">
          <label :for="`tarjeta-descripcion-${tarjeta.id}`">
            <span class="pictograma-editar m-r-1" aria-hidden="true" />
            Descripción
          </label>
          <textarea
            :id="`tarjeta-descripcion-${tarjeta.id}`"
            v-model="tarjeta.descripcion"
            rows="3"
            placeholder="Descripción de la tarjeta"
          />
        </div>

        <div class="flex tarjetas-editor__fila">
          <div class="tarjetas-editor__campo columna-8">
            <label :for="`tarjeta-texto-boton-${tarjeta.id}`">Texto del botón</label>
            <input
              :id="`tarjeta-texto-boton-${tarjeta.id}`"
              v-model="tarjeta.textoBoton"
              type="text"
              placeholder="Ej. Ir al visualizador"
            />
          </div>

          <div class="tarjetas-editor__campo columna-8">
            <label :for="`tarjeta-enlace-boton-${tarjeta.id}`">Enlace del botón</label>
            <input
              :id="`tarjeta-enlace-boton-${tarjeta.id}`"
              v-model="tarjeta.enlaceBoton"
              type="text"
              placeholder="Ej. /consulta"
            />
          </div>
        </div>
      </li>
    </ul>

    <button
      type="button"
      class="boton-secundario boton-chico"
      :disabled="!store.puedeAgregarTarjeta()"
      @click="store.agregarTarjeta()"
    >
      <span class="pictograma-agregar m-r-1" aria-hidden="true" />
      Agregar tarjeta
    </button>

    <p v-if="!store.puedeAgregarTarjeta()" class="texto-color-secundario m-t-1">
      Alcanzaste el límite máximo de 10 tarjetas.
    </p>
  </section>
</template>

<style scoped lang="scss">
.tarjetas-editor {
  &__encabezado {
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
  }

  &__contador {
    flex-shrink: 0;
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--fondo-acento);
    font-size: 0.8125rem;
    font-weight: 600;
    white-space: nowrap;
  }

  &__lista {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
  }

  &__item {
    padding: 16px;
  }

  &__item-encabezado {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  &__item-titulo {
    flex: 1;
    margin: 0;
    font-weight: 600;
  }

  &__campo {
    margin-bottom: 12px;

    label {
      display: flex;
      align-items: center;
    }
  }

  &__fila {
    gap: 12px;
  }
}

.panel-edicion {
  &__titulo {
    margin: 0 0 4px;
  }

  &__ayuda {
    margin-top: 0;
    color: var(--texto-secundario);
    font-size: 0.875rem;
  }
}
</style>
