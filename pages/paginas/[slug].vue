<script setup>
definePageMeta({ auth: false });

const route = useRoute();

const { data: pagina, error } = await useAsyncData(
  `landing-builder-pagina-${route.params.slug}`,
  () => $fetch(`/api/landing-builder/paginas/${route.params.slug}`)
);

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Página no encontrada' });
}

useHead(() => ({
  title: pagina.value?.nombre,
}));
</script>

<template>
  <div>
    <main id="principal">
      <LandingBuilderRenderizadorBloques v-if="pagina" :bloques="pagina.bloques" />
    </main>
  </div>
</template>
