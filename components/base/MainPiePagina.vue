<script setup>
const route = useRoute();
const store = useLandingBuilderStore();

const REDES_SOCIALES = [
  { valor: 'facebook', etiqueta: 'Facebook' },
  { valor: 'x', etiqueta: 'X' },
  { valor: 'instagram', etiqueta: 'Instagram' },
  { valor: 'youtube', etiqueta: 'YouTube' },
  { valor: 'linkedin', etiqueta: 'LinkedIn' },
];

const esConstructor = computed(() => route.path.startsWith('/landing-builder'));
const esPaginaPublica = computed(() => route.path.startsWith('/paginas/'));

const identidadActiva = computed(() => (esConstructor.value ? store : store.identidadPublica));

const piePaginaActivo = computed(() =>
  esConstructor.value ? store.piePagina : store.identidadPublica.piePagina
);

const logoActivo = computed(() => identidadActiva.value.logoUrl);

const colorTemaActivo = computed(() =>
  esConstructor.value ? store.colorTema : store.identidadPublica.colorTema
);

const estiloTemaFooter = computed(() => {
  if (!colorTemaActivo.value) return {};
  const tintClaro = calcularColorClaro(colorTemaActivo.value);
  return {
    backgroundColor: colorTemaActivo.value,
    color: calcularColorTextoContraste(colorTemaActivo.value),
    // Fondo hover/focus de los enlaces y redes sociales: mismo tinte claro
    // del colorTema que ya se usa en el header, para quedar homologados.
    '--tema-pagina-cursor-fondo': tintClaro,
    '--tema-pagina-cursor-color': calcularColorTextoContraste(tintClaro),
  };
});

const mostrarFooter = computed(() => {
  if (esConstructor.value) return true;
  if (!esPaginaPublica.value && !store.paginaInicioActiva) return false;

  const pie = piePaginaActivo.value;
  return Boolean(
    logoActivo.value || pie?.texto || pie?.enlaces?.length || pie?.redesSociales?.length
  );
});

function actualizarTexto(event) {
  store.piePagina.texto = event.target.textContent.trim();
}
</script>

<template>
  <div v-if="mostrarFooter" class="contenedor piepagina-constructor" :style="estiloTemaFooter">
    <div class="flex flex-wrap">
      <div class="columna-8 columna-8-esc">
        <img
          v-if="logoActivo"
          :src="store.resolverUrlImagen(logoActivo)"
          class="piepagina-constructor__logo"
          alt="Logo"
        />

        <p
          v-if="esConstructor"
          contenteditable="true"
          class="piepagina-constructor__texto piepagina-constructor__texto--editable"
          data-placeholder="Texto de contacto (dirección, teléfono, etc.)"
          @blur="actualizarTexto"
        >
          {{ store.piePagina.texto }}
        </p>
        <p v-else-if="piePaginaActivo.texto" class="piepagina-constructor__texto">
          {{ piePaginaActivo.texto }}
        </p>
      </div>

      <div v-if="esConstructor || piePaginaActivo.enlaces.length" class="columna-8 columna-4-esc">
        <p class="piepagina-titulo">Enlaces</p>

        <ul v-if="esConstructor" class="piepagina-constructor__lista-edicion">
          <li v-for="enlace in store.piePagina.enlaces" :key="enlace.id">
            <input
              v-model="enlace.texto"
              type="text"
              class="piepagina-constructor__input"
              placeholder="Texto"
            />
            <input
              v-model="enlace.url"
              type="text"
              class="piepagina-constructor__input"
              placeholder="URL"
            />
            <button
              type="button"
              class="boton-pictograma boton-sin-contenedor-secundario boton-chico"
              aria-label="Eliminar enlace"
              @click="store.eliminarEnlacePie(enlace.id)"
            >
              <span class="pictograma-eliminar" aria-hidden="true"></span>
            </button>
          </li>
          <li>
            <button
              type="button"
              class="boton-secundario boton-chico"
              :disabled="!store.puedeAgregarEnlacePie()"
              @click="store.agregarEnlacePie()"
            >
              + Agregar enlace
            </button>
          </li>
        </ul>

        <ul v-else>
          <li v-for="enlace in piePaginaActivo.enlaces" :key="enlace.id">
            <a
              :href="enlace.url"
              target="_blank"
              rel="noopener noreferrer"
              class="piepagina-constructor__enlace"
              :style="{ color: estiloTemaFooter.color }"
            >
              {{ enlace.texto || enlace.url }}
            </a>
          </li>
        </ul>
      </div>

      <div
        v-if="esConstructor || piePaginaActivo.redesSociales.length"
        class="columna-8 columna-4-esc"
      >
        <p class="piepagina-titulo">
          Síguenos en <span class="a11y-solo-lectura">nuestras redes sociales:</span>
        </p>

        <ul v-if="esConstructor" class="piepagina-constructor__lista-edicion">
          <li v-for="red in store.piePagina.redesSociales" :key="red.id">
            <select v-model="red.red" class="piepagina-constructor__select">
              <option v-for="opcion in REDES_SOCIALES" :key="opcion.valor" :value="opcion.valor">
                {{ opcion.etiqueta }}
              </option>
            </select>
            <input
              v-model="red.url"
              type="text"
              class="piepagina-constructor__input"
              placeholder="URL del perfil"
            />
            <button
              type="button"
              class="boton-pictograma boton-sin-contenedor-secundario boton-chico"
              aria-label="Eliminar red social"
              @click="store.eliminarRedSocialPie(red.id)"
            >
              <span class="pictograma-eliminar" aria-hidden="true"></span>
            </button>
          </li>
          <li>
            <button
              type="button"
              class="boton-secundario boton-chico"
              :disabled="!store.puedeAgregarRedSocialPie()"
              @click="store.agregarRedSocialPie()"
            >
              + Agregar red social
            </button>
          </li>
        </ul>

        <ul v-else class="piepagina-social">
          <li v-for="red in piePaginaActivo.redesSociales" :key="red.id">
            <a
              :href="red.url"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="red.red"
              :style="{ color: estiloTemaFooter.color }"
            >
              <span :class="`pictograma-social-${red.red}`" aria-hidden="true"></span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.piepagina-constructor {
  padding-top: 32px;
  padding-bottom: 32px;
  background: var(--fondo-acento, #f5f5f5);
  color: var(--texto-primario, #141414);
  font-size: 0.875rem;

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    margin: 8px 0;
  }
}

.piepagina-constructor__logo {
  box-sizing: border-box;
  max-height: 48px;
  width: auto;
  margin-bottom: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  // Fondo blanco fijo, igual que el "chip" del logo en el header
  // (.nav-logo--chip): sin esto, un logo oscuro se pierde contra un
  // colorTema oscuro.
  background: var(--color-neutro-0, #ffffff);
}

.piepagina-constructor__texto {
  white-space: pre-wrap;
}

.piepagina-constructor__texto--editable {
  min-height: 1.4em;
  border: 1px dashed rgba(128, 128, 128, 0.5);
  border-radius: 4px;
  padding: 4px 6px;
  outline: none;

  &:empty::before {
    content: attr(data-placeholder);
    opacity: 0.6;
    font-style: italic;
  }
}

.piepagina-constructor__enlace {
  display: inline-block;
  border-radius: 4px;
  margin: -2px -6px;
  padding: 2px 6px;
  text-decoration: none;

  &:hover,
  &:focus-visible {
    background-color: var(--tema-pagina-cursor-fondo, transparent);
    color: var(--tema-pagina-cursor-color, inherit) !important;
    text-decoration: underline;
  }
}

.piepagina-constructor__lista-edicion li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.piepagina-constructor__input,
.piepagina-constructor__select {
  min-width: 0;
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--color-neutro-3, #bdbdbd);
  border-radius: 4px;
  font: inherit;
  // Fondo blanco fijo a propósito (para que se lea con cualquier colorTema);
  // por eso el texto también usa un tono fijo (--color-neutro-6, no
  // --texto-primario) en vez de un token semántico: --texto-primario se
  // invierte a blanco en modo oscuro y quedaría invisible sobre este fondo.
  color: var(--color-neutro-6, #141414);
  background: var(--color-neutro-0, #ffffff);

  // sisdai-css define fondos oscuros globales para inputs en hover/focus
  // (input:hover / input:focus { background-color: var(--campo-cursor-fondo)
  // / var(--campo-enfoque-fondo) }), más específicos que esta clase por el
  // selector `input` que agregan; en modo oscuro esos fondos son vino
  // oscuro y el texto (fijo en oscuro) queda casi invisible. !important es
  // necesario para ganarles: estos campos siempre deben verse igual
  // (blanco/oscuro), sin importar el colorTema de la página ni el estado.
  &:hover,
  &:focus {
    color: var(--color-neutro-6, #141414) !important;
    background: var(--color-neutro-0, #ffffff) !important;
  }
}

.piepagina-social li {
  display: inline-block;
  margin-right: 12px;
}

.piepagina-social a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;

  &:hover,
  &:focus-visible {
    background-color: var(--tema-pagina-cursor-fondo, transparent);
    color: var(--tema-pagina-cursor-color, inherit) !important;
  }
}
</style>
