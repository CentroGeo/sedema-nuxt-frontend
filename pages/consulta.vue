<script setup>
definePageMeta({
  middleware: 'redireccionar-modulo-consulta',
  bodyAttrs: {
    class: '',
  },
});

const ruta = '/consulta';

const storeConsulta = useConsultaStore();
const { cargarConfiguracionModulos, estaHabilitado, estaSubmoduloHabilitado } =
  useConfiguracionModulos();
const consultaHabilitada = estaHabilitado('consulta');
const subPaginas = computed(() =>
  [
    { id: 'consulta-capas', pictograma: 'pictograma-capas', ruta: `${ruta}/capas`, globo: 'Capas geográficas' },
    { id: 'consulta-documentos', pictograma: 'pictograma-documento', ruta: `${ruta}/documentos`, globo: 'Documentos' },
    { id: 'consulta-tablas', pictograma: 'pictograma-tabla', ruta: `${ruta}/tablas`, globo: 'Tabulados de datos' },
  ].filter((pagina) => estaSubmoduloHabilitado(pagina.id).value)
);

onMounted(() => {
  cargarConfiguracionModulos();
});
onUnmounted(() => (document.querySelector('body').className = ''));
</script>

<template>
  <div v-if="consultaHabilitada" class="modulo-consultas flex">
    <UiNavegacionLateral
      :sub-paginas="subPaginas"
      :funcion-colapsar="storeConsulta.alternarCatalogoColapsable"
      :estado-colapable="storeConsulta.catalogoColapsado"
      id-colapsable="consulta-navegacion-lateral"
    />

    <div class="contenedor-contenido">
      <NuxtPage />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modulo-consultas {
  --altura-consulta-esc: calc(100vh - 112px);
  height: var(--altura-consulta-esc);
  gap: 0;

  .contenedor-contenido {
    flex: 1;
  }
}
</style>
