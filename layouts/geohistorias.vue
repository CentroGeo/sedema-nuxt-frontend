<script setup>
import SisdaiMenuAccesibilidad from '@centrogeomx/sisdai-componentes/src/componentes/menu-accesibilidad/SisdaiMenuAccesibilidad.vue';
import SisdaiNavegacionGobMx from '@centrogeomx/sisdai-componentes/src/componentes/navegacion-gob-mx/SisdaiNavegacionGobMx.vue';
import SisdaiPiePaginaGobMx from '@centrogeomx/sisdai-componentes/src/componentes/pie-pagina-gob-mx/SisdaiPiePaginaGobMx.vue';
import { useAccesibilidadStore } from '~/stores/accesibilidad';

const accesibilidadStore = useAccesibilidadStore();
const { mostrarIdentidadGobMx } = useIdentidadGobMx();
const { perfil } = useAplicarPerfilSisdai();
</script>

<template>
  <div>
    <a href="#principal" class="ir-contenido-principal">Ir a contenido principal</a>
    <SisdaiNavegacionGobMx v-if="mostrarIdentidadGobMx" />

    <div class="contenido vista-geohistorias">
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
  min-height: calc(100vh - 51px);
}
</style>
