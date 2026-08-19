<script setup>
definePageMeta({
  middleware: 'redireccionar-modulo-catalogo',
  bodyAttrs: {
    class: '',
  },
});

const ruta = '/catalogo';

const config = useRuntimeConfig();
const storeCatalogo = useCatalogoStore();
const { cargarConfiguracionModulos, estaHabilitado, estaSubmoduloHabilitado } =
  useConfiguracionModulos();
const esSuperusuaria = computed(() => storeCatalogo.userInfo.is_superuser);
const catalogoHabilitado = estaHabilitado('catalogo');

// El acceso "Explorar" es el hub de la sección: se muestra mientras quede
// habilitado al menos uno de sus submódulos, no solo el de capas.
const SUBMODULOS_EXPLORAR = [
  'catalogo-capas',
  'catalogo-documentos',
  'catalogo-tablas',
  'catalogo-externos',
];

const subPaginas = computed(() =>
  [
    {
      ids: SUBMODULOS_EXPLORAR,
      pictograma: 'pictograma-explorar',
      ruta: `${ruta}/explorar`,
      globo: 'Explorar',
    },
    {
      id: 'catalogo-capas',
      pictograma: 'pictograma-capas',
      ruta: `${ruta}/explorar/capas`,
      globo: 'Capas',
    },
    {
      id: 'catalogo-documentos',
      pictograma: 'pictograma-documento',
      ruta: `${ruta}/explorar/documentos`,
      globo: 'Documentos',
    },
    {
      id: 'catalogo-tablas',
      pictograma: 'pictograma-tabla',
      ruta: `${ruta}/explorar/tablas`,
      globo: 'Datos tabulados',
    },
    // Mapas es propio de esta instancia: no existe como submódulo upstream, así
    // que se filtra por su bandera de entorno (ver habilitar_modulos.global.ts).
    {
      bandera: Boolean(config.public.enableMapas),
      pictograma: 'pictograma-explorar',
      ruta: `${ruta}/explorar/mapas`,
      globo: 'Mapas',
    },
    {
      id: 'catalogo-externos',
      pictograma: 'pictograma-flkt',
      ruta: `${ruta}/explorar/catalogos-externos`,
      globo: 'Catálogos externos',
    },
  ].filter((pagina) =>
    pagina.bandera !== undefined
      ? pagina.bandera
      : (pagina.ids ?? [pagina.id]).some((id) => estaSubmoduloHabilitado(id).value)
  )
);

const paginasSesion = computed(() =>
  [
    {
      id: 'catalogo-mis-archivos',
      pictograma: 'pictograma-proyectos',
      ruta: `${ruta}/mis-recursos`,
      globo: 'Mis recursos',
    },
    {
      id: 'catalogo-cargar',
      pictograma: 'pictograma-archivo-subir',
      ruta: `${ruta}/cargar-archivos`,
      globo: 'Carga de archivos',
    },
    {
      id: 'catalogo-servicios-remotos',
      pictograma: 'pictograma-colaborar',
      ruta: `${ruta}/servicios-remotos`,
      globo: 'Carga de servicios remotos',
    },
    esSuperusuaria.value
      ? {
          id: 'catalogo-revision',
          pictograma: 'pictograma-buscar',
          ruta: `${ruta}/revision-solicitudes`,
          globo: 'Revisión de solicitudes',
        }
      : null,
  ].filter((pagina) => pagina && estaSubmoduloHabilitado(pagina.id).value)
);

onMounted(async () => {
  await cargarConfiguracionModulos();
  await storeCatalogo.getUserInfo();
});

onUnmounted(() => (document.querySelector('body').className = ''));
</script>

<template>
  <div v-if="catalogoHabilitado" class="modulo-catalogo flex">
    <UiNavegacionLateral
      :sub-paginas="subPaginas"
      :sesion-paginas="paginasSesion"
      :id-colapsable="storeCatalogo.idNavegacionLateral"
      :estado-colapable="storeCatalogo.catalogoColapsado"
      :funcion-colapsar="storeCatalogo.alternarCatalogoColapsable"
    />
    <div class="contenedor-contenido">
      <NuxtPage />
    </div>
  </div>
</template>

<style lang="scss">
.modulo-catalogo {
  gap: 0;
  .contenedor-contenido {
    flex: 1;
  }
}
</style>
