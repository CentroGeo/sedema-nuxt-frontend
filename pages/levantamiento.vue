<script setup>
definePageMeta({
  middleware: ['auth', 'redireccionar-modulo-levantamiento'],
});
const storeLevantamiento = useLevantamientoStore();
const ruta = '/levantamiento';
const { cargarConfiguracionModulos, estaHabilitado, estaSubmoduloHabilitado } =
  useConfiguracionModulos();
const levantamientoHabilitado = estaHabilitado('levantamiento');
const subPaginas = computed(() =>
  [
    {
      id: 'levantamiento-proyectos',
      pictograma: 'pictograma-visualizador',
      ruta: `${ruta}/proyectos`,
      globo: 'Proyectos',
    },
    {
      id: 'levantamiento-aportes',
      pictograma: 'pictograma-grupo',
      ruta: `${ruta}/aportes`,
      globo: 'Aportes',
    },
  ].filter((pagina) => estaSubmoduloHabilitado(pagina.id).value)
);

onMounted(() => {
  cargarConfiguracionModulos();
});
</script>

<template>
  <div v-if="levantamientoHabilitado" class="modulo-levantamiento flex">
    <UiNavegacionLateral
      :sub-paginas="subPaginas"
      :funcion-colapsar="storeLevantamiento.alternarCatalogoColapsable"
      :estado-colapable="storeLevantamiento.catalogoColapsado"
      :id-colapsable="storeLevantamiento.idNavegacionLateral"
    />
    <div class="contenedor-contenido">
      <NuxtPage />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modulo-levantamiento {
  --altura-consulta-esc: calc(100vh - 112px);
  height: var(--altura-consulta-esc);
  gap: 0;
  .contenedor-contenido {
    flex: 1;
    .columna-4,
    .columna-8,
    .columna-12,
    .columna-16 {
      height: var(--altura-consulta-esc);
    }
  }
}
</style>
