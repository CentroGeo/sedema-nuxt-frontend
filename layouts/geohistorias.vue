<script setup>
import SisdaiMenuAccesibilidad from '@centrogeomx/sisdai-componentes/src/componentes/menu-accesibilidad/SisdaiMenuAccesibilidad.vue';
import { useAccesibilidadStore } from '~/stores/accesibilidad';

const accesibilidadStore = useAccesibilidadStore();
const { mostrarIdentidadGobMx } = useIdentidadGobMx();
const { perfil } = useAplicarPerfilSisdai();

// Font Awesome 6 para los iconos (fa-solid) de los controles del visor de mapa
// (MapasControlInfo, MapasControlCapaBase). El resto de layouts ya lo cargan.
useHead({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
    },
  ],
});
</script>

<template>
  <div>
    <a href="#principal" class="ir-contenido-principal">Ir a contenido principal</a>
    <SisdaiNavegacionGobMx v-if="mostrarIdentidadGobMx" />

    <div id="principal" class="contenido vista-geohistorias">
      <slot />
    </div>

    <client-only>
      <SisdaiMenuAccesibilidad :objeto-store="accesibilidadStore" :perfil-color="perfil" />
    </client-only>
    <SisdaiPiePaginaGobMx v-if="mostrarIdentidadGobMx" />
  </div>
</template>

<style lang="scss" scoped>
.vista-geohistorias {
  height: 100%;
}
</style>
