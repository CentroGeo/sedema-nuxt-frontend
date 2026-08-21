<script setup>
definePageMeta({
  middleware: [
    'admin',
    () => {
      const store = useAdministracionStore();
      return navigateTo(
        store.perfilActual?.can_manage_modules
          ? '/administracion/modulos'
          : '/administracion/permisos',
        { replace: true }
      );
    },
  ],
});
</script>

<template>
  <div />
</template>
