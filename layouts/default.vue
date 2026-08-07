<script setup>
import SisdaiMenuAccesibilidad from '~/components/base/SisdaiMenuAccesibilidad.vue';
import SisdaiNavegacionGobMx from '@centrogeomx/sisdai-componentes/src/componentes/navegacion-gob-mx/SisdaiNavegacionGobMx.vue';
import SisdaiPiePaginaGobMx from '~/components/base/SisdaiPiePaginaGobMxCustom.vue';
import MainNavegacion from '~/components/base/MainNavegacion.vue';
import { useAccesibilidadStore } from '~/stores/accesibilidad';
import { useLandingBuilderStore } from '~/stores/landingBuilder';

const accesibilidadStore = useAccesibilidadStore();
const storeLandingBuilder = useLandingBuilderStore();
const route = useRoute();
const currentPath = computed(() => route.fullPath);

// La barra de Gobierno de México puede desactivarse por página desde el
// constructor de páginas (ver LandingBuilderPaginaIdentidad); en el resto del
// sitio se muestra siempre, como antes.
const esConstructor = computed(() => route.path.startsWith('/landing-builder'));
const mostrarBarraGobMx = computed(() =>
  esConstructor.value
    ? storeLandingBuilder.mostrarBarraGobMx
    : storeLandingBuilder.mostrarBarraGobMxPublica
);

useHead(() => ({
  meta: [
    { property: 'og:url', content: currentPath.value, key: 'og-url' },
    { name: 'twitter:url', content: currentPath.value, key: 'twitter-url' },
  ],
}));
</script>

<template>
  <div>
    <a href="#principal" class="ir-contenido-principal"> Ir a contenido principal </a>
    <SisdaiNavegacionGobMx v-if="mostrarBarraGobMx" />

    <MainNavegacion />

    <div class="contenido">
      <slot />
    </div>

    <!-- parece que botón flotante agrega un id al elemento html que no
    coincide al hacer server side rendering -->
    <client-only>
      <SisdaiMenuAccesibilidad :objeto-store="accesibilidadStore" perfil-color="sigic" />
    </client-only>
    <SisdaiPiePaginaGobMx />
  </div>
</template>
