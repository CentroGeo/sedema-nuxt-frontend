<script setup>
const store = useLandingBuilderStore();
const { sanitizarHtmlEnriquecido } = useTextoEnriquecido();

defineProps({
  datos: {
    type: Object,
    required: true,
  },
});

function estiloImagenTarjeta(tarjeta) {
  const posicion = tarjeta.imagenPosicion || { x: 50, y: 50 };
  return {
    objectPosition: `${posicion.x}% ${posicion.y}%`,
  };
}

// Mientras el color siga en el blanco por defecto, se deja que el texto se
// adapte al tema claro/oscuro; solo se respeta un color explícito elegido
// por la persona usuaria (mismo criterio que RenderizadorBloques.vue).
function colorTextoResuelto(color) {
  return color && color !== '#FFFFFF' ? color : 'var(--texto-primario)';
}
</script>

<template>
  <section class="visor-tarjetas contenedor ancho-fijo m-y-10">
    <div class="flex">
      <div
        v-for="tarjeta in datos.tarjetas"
        :key="tarjeta.id"
        class="m-b-4"
        :class="datos.disposicion === 'horizontal' ? 'columna-8' : 'columna-5'"
      >
        <div
          class="tarjeta visor-tarjeta"
          :class="'visor-tarjeta-orientacion-' + (tarjeta.orientacion || 'vertical-abajo')"
        >
          <div class="visor-tarjeta-imagen-wrapper">
            <video
              v-if="tarjeta.imagenTipo === 'video'"
              class="visor-tarjeta-imagen"
              :style="estiloImagenTarjeta(tarjeta)"
              autoplay
              loop
              muted
              playsinline
            >
              <source :src="store.resolverUrlImagen(tarjeta.imagenUrl)" type="video/mp4" />
            </video>
            <img
              v-else
              :src="store.resolverUrlImagen(tarjeta.imagenUrl)"
              class="visor-tarjeta-imagen"
              :style="estiloImagenTarjeta(tarjeta)"
              alt=""
            />
          </div>

          <div class="visor-tarjeta-cuerpo">
            <h3
              class="visor-tarjeta-titulo"
              :style="{ color: colorTextoResuelto(tarjeta.tituloColor) }"
              v-html="sanitizarHtmlEnriquecido(tarjeta.titulo)"
            />

            <div
              class="visor-tarjeta-descripcion"
              :style="{ color: colorTextoResuelto(tarjeta.descripcionColor) }"
              v-html="sanitizarHtmlEnriquecido(tarjeta.descripcion)"
            />

            <div v-if="tarjeta.botonTexto" class="visor-tarjeta-pie flex flex-contenido-centrado">
              <NuxtLink
                :to="tarjeta.botonUrl || '#'"
                target="_blank"
                rel="noopener noreferrer"
                class="boton-primario boton-chico"
              >
                {{ tarjeta.botonTexto }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.visor-tarjeta {
  display: flex;
  height: 100%;
  min-height: 180px;
  overflow: hidden;
}

.visor-tarjeta-imagen-wrapper {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--color-neutro-2, #e0e0e0);
}

.visor-tarjeta-imagen {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.visor-tarjeta-cuerpo {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 12px;
}

.visor-tarjeta-titulo,
.visor-tarjeta-descripcion {
  margin: 0;
  text-align: left;
}

.visor-tarjeta-titulo {
  font-size: 1.5rem;

  :deep(font[size='3']) {
    font-size: 1.125rem;
  }

  :deep(font[size='4']) {
    font-size: 1.25rem;
  }

  :deep(font[size='5']) {
    font-size: 1.5rem;
  }

  :deep(font[size='6']) {
    font-size: 1.875rem;
  }

  // sisdai-css define b/strong con font-weight: 500, pero la tipografía
  // real no tiene esa variante y el navegador cae a 400 (se ve igual que
  // el texto normal); se fuerza 700 para que la negrita sea visible.
  :deep(b),
  :deep(strong) {
    font-weight: 700;
  }
}

.visor-tarjeta-descripcion {
  font-size: 0.875rem;

  :deep(ul) {
    margin: 0.4em 0;
    padding-left: 1.5rem;
  }

  :deep(font[size='3']) {
    font-size: 0.8125rem;
  }

  :deep(font[size='4']) {
    font-size: 0.875rem;
  }

  :deep(font[size='5']) {
    font-size: 1rem;
  }

  :deep(font[size='6']) {
    font-size: 1.125rem;
  }

  :deep(b),
  :deep(strong) {
    font-weight: 700;
  }
}

.visor-tarjeta-titulo-h1 {
  font-size: 1.75rem;
  font-weight: 700;
}

.visor-tarjeta-titulo-h2 {
  font-size: 1.375rem;
  font-weight: 700;
}

.visor-tarjeta-titulo-p {
  font-size: 0.875rem;
  font-weight: 400;
}

.visor-tarjeta-desc-h1 {
  font-size: 1.75rem;
  font-weight: 700;
}

.visor-tarjeta-desc-h2 {
  font-size: 1.375rem;
  font-weight: 700;
}

.visor-tarjeta-desc-p {
  font-size: 0.875rem;
  font-weight: 400;
}

.visor-tarjeta-pie {
  padding-top: 8px;
  border-top: 1px dashed var(--color-neutro-2, #e0e0e0);
}

.visor-tarjeta-orientacion-vertical-abajo {
  flex-direction: column;

  .visor-tarjeta-imagen-wrapper {
    width: 100%;
    height: 240px;
  }
}

.visor-tarjeta-orientacion-vertical-arriba {
  flex-direction: column-reverse;

  .visor-tarjeta-imagen-wrapper {
    width: 100%;
    height: 240px;
  }
}

.visor-tarjeta-orientacion-horizontal-derecha {
  flex-direction: row;
  align-items: stretch;

  .visor-tarjeta-imagen-wrapper {
    width: 200px;
    min-width: 200px;
    height: auto;
  }
}

.visor-tarjeta-orientacion-horizontal-izquierda {
  flex-direction: row-reverse;
  align-items: stretch;

  .visor-tarjeta-imagen-wrapper {
    width: 200px;
    min-width: 200px;
    height: auto;
  }
}
</style>
