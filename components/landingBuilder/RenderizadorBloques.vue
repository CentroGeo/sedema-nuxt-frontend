<script setup>
const store = useLandingBuilderStore();

defineProps({
  bloques: {
    type: Array,
    default: () => [],
  },
});

function estiloFondoPortada(bloque) {
  const posicion = bloque.datos?.posicionFondo || { x: 50, y: 50 };
  return { objectPosition: `${posicion.x}% ${posicion.y}%` };
}

const tamanosTitulo = {
  pequeno: '1.5rem',
  mediano: '2rem',
  grande: '2.5rem',
  'extra-grande': '3rem',
};

const tamanosParrafo = {
  pequeno: '0.875rem',
  normal: '1rem',
  mediano: '1.125rem',
  grande: '1.25rem',
};

function colorTextoResuelto(color) {
  return color && color !== '#FFFFFF' ? color : 'var(--texto-primario)';
}

function obtenerEstilosTitulo(bloque) {
  const datos = bloque.datos || {};
  const tamano = datos.tamano || 'grande';

  return {
    textAlign: datos.alineacion || 'left',
    color: colorTextoResuelto(datos.color),
    fontWeight: datos.negrita ? 700 : 400,
    fontSize: tamanosTitulo[tamano] || tamanosTitulo.grande,
  };
}

function obtenerEstilosParrafo(bloque) {
  const datos = bloque.datos || {};
  const tamano = datos.tamano || 'normal';

  return {
    textAlign: datos.alineacion || 'left',
    color: colorTextoResuelto(datos.color),
    fontWeight: datos.negrita ? 700 : 400,
    fontSize: tamanosParrafo[tamano] || tamanosParrafo.normal,
  };
}

function obtenerLineasParrafo(bloque) {
  return String(bloque.datos?.texto ?? '')
    .replace(/\r/g, '')
    .split('\n');
}

function obtenerParrafoTextoImagen(bloque) {
  return bloque.datos?.parrafo || {};
}

function obtenerEstilosParrafoTextoImagen(bloque) {
  const parrafo = obtenerParrafoTextoImagen(bloque);
  const tamano = parrafo.tamano || 'normal';

  return {
    textAlign: parrafo.alineacion || 'left',
    color: colorTextoResuelto(parrafo.color),
    fontWeight: parrafo.negrita ? 700 : 400,
    fontSize: tamanosParrafo[tamano] || tamanosParrafo.normal,
  };
}

function obtenerLineasParrafoTextoImagen(bloque) {
  return String(obtenerParrafoTextoImagen(bloque).texto ?? '')
    .replace(/\r/g, '')
    .split('\n');
}
</script>

<template>
  <div class="renderizador-bloques">
    <template v-for="bloque in bloques" :key="bloque.id">
      <section v-if="bloque.tipo === 'portada'" class="visor-portada">
        <video
          v-if="bloque.datos.fondo?.tipo === 'video'"
          aria-hidden="true"
          role="presentation"
          class="visor-portada__media"
          :style="estiloFondoPortada(bloque)"
          autoplay
          loop
          muted
          playsinline
        >
          <source :src="store.resolverUrlImagen(bloque.datos.fondo.url)" type="video/mp4" />
        </video>

        <img
          v-else
          class="visor-portada__media"
          :src="store.resolverUrlImagen(bloque.datos.fondo?.url)"
          :style="estiloFondoPortada(bloque)"
          alt=""
        />

        <div class="visor-portada__degradado">
          <div class="visor-portada__contenido">
            <h1 :style="{ color: bloque.datos.colorTitulo }">{{ bloque.datos.titulo }}</h1>
            <p :style="{ color: bloque.datos.colorSubtitulo }">{{ bloque.datos.subtitulo }}</p>
          </div>
        </div>
      </section>

      <section
        v-else-if="bloque.tipo === 'titulo'"
        class="visor-titulo contenedor ancho-fijo m-y-6"
      >
        <h2 class="visor-titulo__contenido" :style="obtenerEstilosTitulo(bloque)">
          {{ bloque.datos?.texto }}
        </h2>
      </section>

      <section
        v-else-if="bloque.tipo === 'parrafo'"
        class="visor-parrafo contenedor ancho-fijo m-y-6"
      >
        <ul
          v-if="bloque.datos?.tipoLista === 'vinetas'"
          class="visor-parrafo__lista"
          :style="obtenerEstilosParrafo(bloque)"
        >
          <li
            v-for="(linea, indice) in obtenerLineasParrafo(bloque)"
            :key="`${bloque.id}-linea-${indice}`"
          >
            {{ linea }}
          </li>
        </ul>

        <p v-else class="visor-parrafo__contenido" :style="obtenerEstilosParrafo(bloque)">
          {{ bloque.datos?.texto }}
        </p>
      </section>

      <section
        v-else-if="bloque.tipo === 'texto-imagen'"
        class="visor-texto-imagen"
        :class="`visor-texto-imagen--imagen-${bloque.datos?.posicionImagen || 'derecha'}`"
      >
        <div class="visor-texto-imagen__rejilla">
          <div class="visor-texto-imagen__texto">
            <ul
              v-if="bloque.datos?.parrafo?.tipoLista === 'vinetas'"
              class="visor-texto-imagen__lista"
              :style="obtenerEstilosParrafoTextoImagen(bloque)"
            >
              <li
                v-for="(linea, indice) in obtenerLineasParrafoTextoImagen(bloque)"
                :key="`${bloque.id}-texto-imagen-linea-${indice}`"
              >
                {{ linea }}
              </li>
            </ul>

            <p
              v-else
              class="visor-texto-imagen__parrafo"
              :style="obtenerEstilosParrafoTextoImagen(bloque)"
            >
              {{ bloque.datos?.parrafo?.texto }}
            </p>
          </div>

          <div v-if="bloque.datos?.imagen?.url" class="visor-texto-imagen__media">
            <img
              class="visor-texto-imagen__imagen"
              :src="store.resolverUrlImagen(bloque.datos.imagen.url)"
              :alt="bloque.datos.imagen.alt || ''"
            />
          </div>
        </div>
      </section>

      <section v-else-if="bloque.tipo === 'texto'" class="visor-texto contenedor ancho-fijo m-y-6">
        <component
          :is="item.componente"
          v-for="item in bloque.datos.bloquesTexto"
          :key="item.id"
          :class="item.clase"
          :style="{ textAlign: item.alineacion, color: item.color }"
        >
          {{ item.texto }}
        </component>
      </section>

      <section v-else-if="bloque.tipo === 'carrusel'" class="m-y-6">
        <LandingBuilderCarruselVistaPrevia :diapositivas="bloque.datos.diapositivas" />
      </section>

      <LandingBuilderSeccionesTarjetasBloqueVisor
        v-else-if="bloque.tipo === 'tarjetas'"
        :datos="bloque.datos"
      />

      <section
        v-else-if="bloque.tipo === 'mapa' && bloque.datos?.url"
        class="visor-mapa contenedor ancho-fijo m-y-6"
      >
        <iframe
          class="visor-mapa__iframe"
          :src="bloque.datos.url"
          :height="bloque.datos.alto || 480"
          :title="bloque.datos.titulo || 'Mapa embebido'"
          loading="lazy"
        />
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.visor-titulo {
  &__contenido {
    margin: 0;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
}

.visor-parrafo {
  &__contenido,
  &__lista {
    margin: 0;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  &__contenido {
    white-space: pre-wrap;
  }

  &__lista {
    padding-left: 1.75rem;

    li {
      min-height: 1.6em;
      padding-left: 0.2rem;
    }
  }
}

.visor-texto-imagen {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 120px;

  &__rejilla {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 1fr);
    align-items: center;
    gap: clamp(24px, 4vw, 64px);
  }

  &__texto,
  &__media {
    min-width: 0;
  }

  &__parrafo,
  &__lista {
    margin: 0;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  &__parrafo {
    white-space: pre-wrap;
  }

  &__lista {
    padding-left: 1.75rem;

    li {
      min-height: 1.6em;
      padding-left: 0.2rem;
    }
  }

  &__media {
    display: flex;
    min-height: 320px;
    align-items: stretch;
  }

  &__imagen {
    display: block;
    width: 100%;
    min-height: 320px;
    max-height: 460px;
    border-radius: 24px;
    object-fit: cover;
  }

  &--imagen-izquierda {
    .visor-texto-imagen__media {
      order: 1;
    }

    .visor-texto-imagen__texto {
      order: 2;
    }
  }

  &--imagen-derecha {
    .visor-texto-imagen__texto {
      order: 1;
    }

    .visor-texto-imagen__media {
      order: 2;
    }
  }
}

.visor-mapa {
  &__iframe {
    display: block;
    width: 100%;
    border: 0;
    border-radius: 12px;
  }
}

.visor-portada {
  position: relative;
  min-height: clamp(320px, 52vh, 580px);
  overflow: hidden;

  &__media {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__degradado {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    background: linear-gradient(
      180deg,
      rgb(0 0 0 / 18%) 0%,
      rgb(0 0 0 / 38%) 55%,
      rgb(0 0 0 / 65%) 100%
    );
  }

  &__contenido {
    width: min(820px, 100%);
    color: white;
    text-align: center;

    h1 {
      margin: 0 0 16px;
    }

    p {
      max-width: 680px;
      margin: 0 auto;
      font-size: 1.125rem;
    }
  }
}

@media (max-width: 1024px) {
  .visor-texto-imagen {
    padding: 10px 40px;
  }
}

@media (max-width: 767px) {
  .visor-texto-imagen {
    padding: 10px 16px;

    &__rejilla {
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
    }

    &__texto {
      order: 1;
    }

    &__media {
      min-height: 220px;
      order: 2;
    }

    &__imagen {
      min-height: 220px;
      max-height: 360px;
      border-radius: 16px;
    }
  }

  .visor-portada {
    min-height: 420px;

    &__degradado {
      padding: 72px 20px 24px;
    }

    &__contenido p {
      font-size: 1rem;
    }
  }
}
</style>
