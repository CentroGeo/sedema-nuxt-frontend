<script setup>
definePageMeta({ middleware: 'admin' });

const ruta = '/administracion';
const store = useAdministracionStore();

const submodulos = computed(() => [
  ...(store.perfilActual?.can_manage_modules
    ? [{ nombre: 'Gestión de módulos', ruta: `${ruta}/modulos` }]
    : []),
  { nombre: 'Gestión de permisos', ruta: `${ruta}/permisos` },
  { nombre: 'Gestión de categorías y metadatos', ruta: `${ruta}/categorias` },
  { nombre: 'Gestión de estilos y apariencias', ruta: `${ruta}/estilos-apariencia` },
]);
</script>

<template>
  <div class="modulo-administracion flex">
    <div class="contenedor-contenido">
      <UiLayoutPaneles>
        <template #catalogo>
          <nav class="menu-lateral" aria-label="Submódulos de administración">
            <div class="menu-lateral-contenedor">
              <h4 class="m-0 p-4">Administración</h4>

              <ul>
                <li v-for="submodulo in submodulos" :key="submodulo.ruta">
                  <NuxtLink :to="submodulo.ruta">{{ submodulo.nombre }}</NuxtLink>
                </li>
              </ul>
            </div>
          </nav>
        </template>

        <template #visualizador>
          <div class="p-4">
            <NuxtPage />
          </div>
        </template>
      </UiLayoutPaneles>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modulo-administracion {
  &.flex {
    gap: 0;
  }

  .contenedor-contenido {
    flex: 1;
    min-width: 0;
  }
}
</style>
