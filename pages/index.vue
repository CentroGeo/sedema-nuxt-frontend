<script setup>
definePageMeta({ auth: false, key: 'inicio' });

const { data: paginaInicio } = await useAsyncData(
  'pagina-inicio',
  () => $fetch('/api/landing-builder/pagina-inicio'),
  // La página de inicio puede cambiar en cualquier momento desde el admin;
  // sin esto, Nuxt reutilizaría el resultado cacheado de la primera visita
  // a "/" en toda la sesión, incluso después de navegar a otra ruta y volver.
  { getCachedData: () => undefined }
);

useHead(() => ({
  title: paginaInicio.value
    ? paginaInicio.value.identidad?.nombrePlataforma || paginaInicio.value.nombre
    : undefined,
}));
</script>

<template>
  <div>
    <main id="principal">
      <InicioPredeterminado v-if="!paginaInicio" />
      <LandingBuilderRenderizadorBloques v-else :bloques="paginaInicio.bloques" />
    </main>
  </div>
</template>
