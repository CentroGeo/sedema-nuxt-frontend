<script setup>
import SelectedLayer from '~/utils/consulta/SelectedLayer';

// Rutas de imagen/video enlazadas (no literales estáticos) a propósito: Vue
// aplica "static hoisting" a bloques de plantilla totalmente estáticos, y
// hay un bug conocido donde ese contenido se rompe al desmontar y volver a
// montar el componente (ej. al navegar a otra sección y regresar a "/").
// https://github.com/vuejs/core/issues/2623
// Además se prefijan con app.baseURL porque en producción el sitio corre bajo
// una subruta (ej. "/admin/", "/app/"), no en la raíz.
const config = useRuntimeConfig();
const videoPortada = `${config.app.baseURL}inicio/Portada_SIGIC_1_1.mp4`;
const imgTarjetaVisualiza = `${config.app.baseURL}inicio/tarjeta_visualiza.png`;
const imgTarjetaAnaliza = `${config.app.baseURL}inicio/tarjeta_analiza.png`;
const imgTarjetaExplora = `${config.app.baseURL}inicio/tarjeta_explora.png`;
const imgTarjetaUsa = `${config.app.baseURL}inicio/tarjeta_usa.png`;
const imgExplorar = `${config.app.baseURL}inicio/imagenexplorar.png`;
const imgProfundizar = `${config.app.baseURL}inicio/imagenprofundizar.png`;
const imgAprovechar = `${config.app.baseURL}inicio/imagenaprovechar.png`;
const imgTener = `${config.app.baseURL}inicio/imagentener.png`;
const imgCompartir = `${config.app.baseURL}inicio/imagencompartir.png`;

const { signIn } = useAuth();

async function iniciarSesion() {
  await signIn('keycloak', {
    callbackUrl: '/', // A dónde volver después del login
  });
}

// Capas recientes
const storeResources = useResourcesCatalogoStore();
const storeSelected = useSelectedResources2Store();
const params = {
  'filter{resource_type}': 'dataset',
  'filter{has_geometry}': 'true',
  //'sort[]': 'last_updated',
};
storeResources.getResourcesByPage('dataLayer', 1, 4, params);

const obtenerMasRecientes = (type) => {
  return computed(() => storeResources.resourcesByType(type) || [{}]);
};

const isLoading = ref(true);
const capasMasRecientes = obtenerMasRecientes('dataLayer');

async function updateSelection(newPk, style) {
  storeSelected.reset();
  storeSelected.add(new SelectedLayer({ pk: newPk }), style, 'dataLayer');

  nextTick(async () => {
    await navigateTo('/consulta/capas');
  });
}
watch(
  capasMasRecientes,
  () => {
    isLoading.value = false;
  },
  { deep: true }
);
</script>
<template>
  <div class="portada portada-secundaria">
    <video
      aria-hidden="true"
      role="presentation"
      class="portada-imagen"
      autoplay=""
      loop=""
      playsinline=""
      muted=""
    >
      <source :src="videoPortada" type="video/mp4" />
    </video>

    <div class="portada-degradado">
      <div class="portada-cuerpo">
        <h1 class="portada-titulo">
          Sistema Integral de Gestión de Información Científica (SIGIC)
        </h1>
        <strong class="portada-subtitulo">
          Integra, visualiza y aprovecha el conocimiento científico de México
        </strong>
      </div>
    </div>
  </div>

  <section id="que-es" class="m-y-10">
    <div class="contenedor ancho-lectura texto-centrado m-b-10">
      <h2>¿Qué es SIGIC?</h2>
      <p>
        SIGIC es la plataforma digital de la Secretaría de Ciencia y Tecnología, desarrollada en
        colaboración con CentroGeo para consultar, visualizar y analizar información científica y
        territorial de México. Reúne datos abiertos, capas geográficas, documentos y herramientas de
        inteligencia artificial en un solo lugar, para que investigadores, tomadores de decisiones y
        público en general puedan explorar el conocimiento generado por el sistema nacional de
        ciencia y tecnología.
      </p>
    </div>
    <div class="contenedor ancho-fijo">
      <div class="flex">
        <div class="columna-8">
          <div class="tarjeta tarjeta-horizontal">
            <img alt="" class="tarjeta-imagen" :src="imgTarjetaVisualiza" />
            <div class="tarjeta-cuerpo">
              <p class="tarjeta-titulo">Visualiza información territorial</p>
              <p>
                Explora mapas interactivos con capas de información geográfica: datos económicos,
                límites administrativos, de infraestructura, población y más. Filtra por región,
                tema o periodo, combina fuentes y descarga tus mapas en formatos estándar.
              </p>
            </div>
            <div class="tarjeta-pie">
              <NuxtLink class="boton-primario boton-chico" to="/consulta"
                >Ir al visualizador</NuxtLink
              >
            </div>
          </div>
        </div>
        <div class="columna-8">
          <div class="tarjeta tarjeta-horizontal">
            <img alt="" class="tarjeta-imagen" :src="imgTarjetaAnaliza" />
            <div class="tarjeta-cuerpo">
              <p class="tarjeta-titulo">Analiza con Inteligencia Artificial</p>
              <p>
                Crea un proyecto de análisis, sube tus documentos o selecciona fuentes del catálogo
                SIGIC, y haz preguntas en lenguaje natural. La IA lee, compara y resume la
                información para darte respuestas con referencias a las fuentes originales.
              </p>
            </div>
            <div class="tarjeta-pie">
              <NuxtLink class="boton-primario boton-chico" to="/ia"
                >Iniciar análisis con IA</NuxtLink
              >
            </div>
          </div>
        </div>
        <div class="columna-8">
          <div class="tarjeta tarjeta-horizontal">
            <img alt="" class="tarjeta-imagen" :src="imgTarjetaExplora" />
            <div class="tarjeta-cuerpo">
              <p class="tarjeta-titulo">Explora los recursos disponibles</p>
              <p>
                Consulta el catálogo completo de recursos del SIGIC: capas geográficas, tablas de
                datos, documentos de investigación y otros servicios remotos. Busca por tema,
                institución, fecha o tipo de recurso, y descarga lo que necesites.
              </p>
            </div>
            <div class="tarjeta-pie">
              <NuxtLink class="boton-primario boton-chico" to="/catalogo"
                >Ir al catálogo de información</NuxtLink
              >
            </div>
          </div>
        </div>
        <div class="columna-8">
          <div class="tarjeta tarjeta-horizontal">
            <img class="tarjeta-imagen" alt="" :src="imgTarjetaUsa" />
            <div class="tarjeta-cuerpo">
              <p class="tarjeta-titulo">Usa tu propia información</p>
              <p>
                Sube tus archivos con información geográfica o científica, y úsalos directamente en
                el visualizador o en tus proyectos de análisis con IA. Sin necesidad de herramientas
                externas, puedes integrar tus datos al ecosistema SIGIC y aprovechar sus
                funcionalidades para explorar, analizar o compartir tu información.
              </p>
            </div>
            <div class="tarjeta-pie">
              <NuxtLink class="boton-primario boton-chico" to="/catalogo/cargar-archivos"
                >Ir a subir archivo</NuxtLink
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section id="que-hacer" class="m-y-10 fondo-color-acento p-y-5">
    <div class="contenedor ancho-lectura texto-centrado">
      <h2>¿Qué puedes hacer en SIGIC?</h2>
    </div>
    <div class="contenedor ancho-fijo">
      <div class="flex m-y-5-esc m-y-0-mov">
        <div class="columna-8 flex-vertical-centrado">
          <h3 class="texto-color-acento">Explorar información territorial diversa</h3>
          <picture class="oculto-esc">
            <img loading="lazy" class="borde-redondeado-20" :src="imgExplorar" alt="" />
          </picture>
          <p>
            Permite superponer múltiples capas temáticas del catálogo SIGIC sobre un mapa base,
            aplicar filtros por región y periodo, y exportar el resultado. Cabe resaltar que no es
            un sistema SIG en su totalidad; está orientado a consulta y visualización, no a edición
            avanzada de geometrías. Admite capas vectoriales (Shapefile, GeoJSON) y archivos
            tabulares (CSV con latitud/longitud). Las capas públicas del catálogo son de libre
            consulta; para subir capas propias o guardar mapas, se requiere una cuenta SIGIC activa.
          </p>
        </div>
        <div class="columna-8">
          <picture class="oculto-mov">
            <img loading="lazy" class="borde-redondeado-20" :src="imgExplorar" alt="" />
          </picture>
        </div>
      </div>
      <div class="flex m-y-5-esc m-y-0-mov">
        <div class="columna-8">
          <picture>
            <img loading="lazy" class="oculto-mov" :src="imgProfundizar" alt="" />
          </picture>
        </div>
        <div class="columna-8 flex-vertical-centrado">
          <h3 class="texto-color-acento">Profundizar en temas con ayuda de la IA</h3>
          <picture>
            <img loading="lazy" class="oculto-esc" :src="imgProfundizar" alt="" />
          </picture>
          <p>
            La IA puede resumir documentos, comparar contenidos entre fuentes, extraer datos clave y
            responder preguntas sobre la información que el usuario le proporcione dentro de un
            proyecto. Las respuestas incluyen referencias a los párrafos o secciones de origen.
            Admite documentos PDF, archivos Word (.doc, .docx) y tablas (.csv). Se requiere una
            cuenta SIGIC activa y el uso de la IA está sujeto a disponibilidad del servicio.
          </p>
        </div>
      </div>
      <div class="flex m-y-5-esc m-y-0-mov">
        <div class="columna-8 flex-vertical-centrado">
          <h3 class="texto-color-acento">Aprovechar tus propios datos dentro del ecosistema</h3>
          <picture class="oculto-esc">
            <img loading="lazy" class="borde-redondeado-20" :src="imgAprovechar" alt="" />
          </picture>
          <p>
            Permite cargar archivos al espacio personal del usuario, georreferenciar tablas con
            coordenadas y publicar recursos en el catálogo público para que otros usuarios los
            consulten. Los archivos subidos quedan disponibles para su uso en los módulos de
            visualización y de IA. Admite capas (GeoJSON, GeoPackage), tablas (CSV con o sin
            coordenadas) y documentos (.pdf, .txt). La georreferenciación automática solo funciona
            con tablas que contengan columnas de latitud y longitud en formato decimal. Se requiere
            cuenta SIGIC activa.
          </p>
        </div>
        <div class="columna-8">
          <picture class="oculto-mov">
            <img loading="lazy" class="borde-redondeado-20" :src="imgAprovechar" alt="" />
          </picture>
        </div>
      </div>
      <div class="flex m-y-5-esc m-y-0-mov">
        <div class="columna-8">
          <picture>
            <img loading="lazy" class="oculto-mov" :src="imgTener" alt="" />
          </picture>
        </div>
        <div class="columna-8 flex-vertical-centrado">
          <h3 class="texto-color-acento">Tener tu información ordenada y disponible</h3>
          <picture>
            <img loading="lazy" class="oculto-esc" :src="imgTener" alt="" />
          </picture>
          <p>
            El catálogo permite buscar, filtrar y previsualizar todos los recursos públicos del
            SIGIC, así como los archivos privados del usuario. Incluye metadatos (autor, fecha,
            descripción, institución de origen, licencia, entre otros) para facilitar la búsqueda.
            Ofrece capas geográficas (GeoPackage, GeoJSON), tablas de datos (CSV) y documentos
            (PDF), organizados por temática. La consulta del catálogo público es libre y no requiere
            cuenta; para acceder a recursos restringidos o descargar en formatos avanzados, se
            requiere iniciar sesión.
          </p>
        </div>
      </div>
      <div class="flex m-y-5-esc m-y-0-mov">
        <div class="columna-8 flex-vertical-centrado">
          <h3 class="texto-color-acento">Compartir tus visualizaciones mediante un enlace único</h3>
          <picture class="oculto-esc">
            <img loading="lazy" class="borde-redondeado-20" :src="imgCompartir" alt="" />
          </picture>
          <p>
            ¿Quieres que tu equipo o colegas accedan exactamente a lo que estás viendo? Con un
            enlace único, puedes compartir tus tablas, documentos o capas con todos los detalles que
            hayas seleccionado.
          </p>
        </div>
        <div class="columna-8">
          <picture class="oculto-mov">
            <img loading="lazy" class="borde-redondeado-20" :src="imgCompartir" alt="" />
          </picture>
        </div>
      </div>
    </div>
  </section>
  <section id="explora" class="m-y-10">
    <div class="contenedor ancho-lectura texto-centrado">
      <h2>Explora las últimas capas geográficas en SIGIC</h2>
      <p>
        Consulta lo más reciente del catálogo: datos geográficos listos para visualizar, compartir o
        descargar.
      </p>
    </div>
    <div class="contenedor ancho-fijo">
      <div v-if="isLoading" class="flex flex-contenido-centrado m-t-3">
        <img
          class="color-invertir"
          :src="`${config.app.baseURL}img/loader.gif`"
          alt="...Cargando"
          height="120px"
        />
      </div>
      <div v-if="!isLoading" class="flex">
        <div v-for="(capa, i) in capasMasRecientes" :key="i" class="columna-4">
          <div class="tarjeta">
            <img class="tarjeta-imagen" :src="capa.thumbnail_url" alt="" />
            <div class="tarjeta-cuerpo">
              <p class="tarjeta-etiqueta">Capa geográfica</p>
              <p class="tarjeta-titulo">{{ capa.title }}</p>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-html="capa.abstract"></div>
            </div>
            <div class="tarjeta-pie">
              <nuxt-link
                class="boton boton-primario boton-chico"
                aria-label="Ver capa en visualizador"
                :to="`/consulta/capas?capas=${capa.pk}`"
                @click.prevent="updateSelection(capa.pk, capa.default_style)"
              >
                Ver Capa en visualizador
              </nuxt-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  <section id="empezar" class="m-t-10 fondo-color-acento p-y-10">
    <div class="contenedor ancho-lectura texto-centrado">
      <h2>¿Con qué quieres empezar?</h2>
      <div class="flex">
        <button
          class="boton-primario boton-chico texto-centrado init-sesion columna-16"
          @click="iniciarSesion"
        >
          Crear una cuenta en SIGIC
        </button>
      </div>
      <h3>o también puedes ir a:</h3>
    </div>
    <div class="contenedor ancho-lectura texto-centrado flex">
      <nuxt-link
        class="boton-secundario boton-chico texto-centrado init-sesion columna-8"
        to="consulta/capas"
      >
        Visualizador de contenido
      </nuxt-link>
      <nuxt-link
        class="boton-secundario boton-chico texto-centrado init-sesion columna-8"
        to="/ia/chats"
      >
        Análisis mediante IA
      </nuxt-link>
      <nuxt-link
        class="boton-secundario boton-chico texto-centrado init-sesion columna-8"
        to="/catalogo/explorar"
      >
        Catálogo de información
      </nuxt-link>
      <nuxt-link
        class="boton-secundario boton-chico texto-centrado init-sesion columna-8"
        to="/catalogo/cargar-archivos"
      >
        Subir mis propios archivos
      </nuxt-link>
    </div>
  </section>
</template>
<style lang="scss">
.init-sesion {
  display: inline;
}
/*
.solo-en-index {
  .contenido {
    padding-top: 54px;
  }
  nav.navegacion.navegacion-pegada {
    top: 54px;
  }
}
*/
:root {
  --escala-rem-gob-sisdai: 0.65;
}
nav.navbar {
  padding-top: calc(var(--escala-rem-gob-sisdai) * 0.5rem);
  padding-bottom: calc(var(--escala-rem-gob-sisdai) * 0.5rem);
}
nav.navbar.navbar-fixed-top {
  z-index: 9999;
}
a.navbar-brand {
  margin-right: calc(var(--escala-rem-gob-sisdai) * 63rem);
  margin-top: 0;
  margin-bottom: 0;
  padding: 0 0 calc(var(--escala-rem-gob-sisdai) * 0.3125rem) 0 !important;
}
.navbar-expand-md .navbar-nav .nav-link {
  padding-right: calc(var(--escala-rem-gob-sisdai) * 0.5rem);
  padding-left: calc(var(--escala-rem-gob-sisdai) * 1.5rem);
  padding-top: calc(var(--escala-rem-gob-sisdai) * 1.8rem);
}
@media (min-width: 768px) and (max-width: 992px) {
  a.navbar-brand {
    margin-right: calc(var(--escala-rem-gob-sisdai) * 61rem);
  }
}
@media (min-width: 576px) and (max-width: 768px) {
  .navbar-dark .navbar-toggler {
    margin-right: calc(var(--escala-rem-gob-sisdai) * 9rem);
  }
  a.navbar-brand {
    margin-right: calc(var(--escala-rem-gob-sisdai) * 41rem);
  }
}
@media (max-width: 576px) {
  a.navbar-brand {
    margin-right: calc(var(--escala-rem-gob-sisdai) * 41rem);
  }
}
.navbar-toggler-icon {
  display: inline-block;
  width: calc(var(--escala-rem-gob-sisdai) * 1.5em);
  height: calc(var(--escala-rem-gob-sisdai) * 1.5em);
}
footer {
  .accordion {
    input {
      display: none !important;
      &:hover {
        background: transparent;
        label {
          background: transparent;
        }
      }
    }
    [type='checkbox']:not(:disabled):hover + label,
    [type='radio']:not(:disabled):hover + label {
      background-color: transparent;
      border-color: transparent;
    }
  }
  [type='checkbox'] + label::before,
  [type='radio'] + label::before {
    display: none;
  }
  [type='checkbox'] + label,
  [type='radio'] + label {
    line-height: 1.25em;
    background-color: none;
    border: none;
    box-shadow: none;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    position: relative;
    margin: 0;
    padding: 8px 8px 8px 0;
    color: #fff;
    &:hover {
      background: transparent;
    }
  }
}

/* Centrado del contenido principal de la portada */
.portada.portada-secundaria {
  position: relative;
}

.portada.portada-secundaria .portada-degradado {
  position: absolute;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;
}

.portada.portada-secundaria .portada-cuerpo {
  width: min(900px, calc(100% - 48px));
  margin: 0 auto;
  padding: 24px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  text-align: center;
}

.portada.portada-secundaria .portada-titulo,
.portada.portada-secundaria .portada-subtitulo {
  width: 100%;
  margin-right: auto;
  margin-left: auto;
  text-align: center;
}

.portada.portada-secundaria .portada-subtitulo {
  display: block;
}
</style>
