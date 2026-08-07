<script setup>
const store = useLandingBuilderStore();

defineProps({
  nombrePlataforma: { type: String, default: '' },
  titulo: { type: String, default: '' },
  subtitulo: { type: String, default: '' },
  tituloSeccion: { type: String, default: '' },
  descripcion: { type: String, default: '' },
  seccionTexto: { type: String, default: '' },
  logoUrl: { type: String, default: null },
  tarjetas: { type: Array, default: () => [] },
});
</script>

<template>
  <div class="landing-builder-vista-previa borde borde-redondeado-16">
    <div class="portada portada-secundaria">
      <div class="portada-degradado">
        <div class="portada-cuerpo">
          <img
            v-if="logoUrl"
            :src="store.resolverUrlImagen(logoUrl)"
            :alt="`Logo de ${nombrePlataforma || 'la plataforma'}`"
            class="landing-builder-vista-previa__logo"
          />
          <h1 class="portada-titulo">{{ titulo || 'Título de la plataforma' }}</h1>
          <strong class="portada-subtitulo">{{ subtitulo || 'Subtítulo de la plataforma' }}</strong>
        </div>
      </div>
    </div>

    <section class="m-y-6">
      <div class="contenedor ancho-lectura texto-centrado m-b-4">
        <h2>{{ tituloSeccion || `¿Qué es ${nombrePlataforma || 'la plataforma'}?` }}</h2>
        <p>{{ descripcion || 'La descripción de la plataforma aparecerá aquí.' }}</p>
        <p>{{ seccionTexto || 'El texto de la sección descriptiva aparecerá aquí.' }}</p>
      </div>

      <div v-if="tarjetas.length" class="contenedor ancho-fijo">
        <div class="flex">
          <div v-for="tarjeta in tarjetas" :key="tarjeta.id" class="columna-8">
            <div class="tarjeta tarjeta-horizontal">
              <img
                v-if="tarjeta.imagenUrl"
                alt=""
                class="tarjeta-imagen"
                :src="store.resolverUrlImagen(tarjeta.imagenUrl)"
              />
              <div class="tarjeta-cuerpo">
                <p class="tarjeta-titulo">{{ tarjeta.titulo || 'Título de la tarjeta' }}</p>
                <p>{{ tarjeta.descripcion || 'La descripción de la tarjeta aparecerá aquí.' }}</p>
              </div>
              <div v-if="tarjeta.textoBoton" class="tarjeta-pie">
                <a
                  class="boton-primario boton-chico"
                  :href="tarjeta.enlaceBoton || '#'"
                  @click.prevent
                >
                  {{ tarjeta.textoBoton }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.landing-builder-vista-previa {
  overflow: hidden;

  &__logo {
    max-height: 64px;
    margin-bottom: 1rem;
  }

  .portada-secundaria {
    min-height: 260px;
    display: flex;
    align-items: center;
  }
}
</style>
