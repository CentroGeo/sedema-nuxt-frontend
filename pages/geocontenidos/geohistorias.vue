<script setup>
definePageMeta({ middleware: 'auth' });
</script>

<template>
  <main id="principal" class="contenedor m-b-10">
    <NuxtPage />
  </main>
</template>
