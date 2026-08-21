<script setup>
definePageMeta({
  middleware: 'redireccionar-modulo-catalogo',
  bodyAttrs: {
    class: '',
  },
});

const ruta = '/catalogo';

const storeCatalogo = useCatalogoStore();
const storeAdministracion = useAdministracionStore();

const { cargarConfiguracionModulos, estaHabilitado, estaSubmoduloHabilitado } =
  useConfiguracionModulos();

const catalogoHabilitado = estaHabilitado('catalogo');

const puedeRevisarSolicitudes = computed(() =>
  ['superuser', 'administrator', 'editor'].includes(
    storeAdministracion.perfilActual?.profile
  )
);

// El acceso "Explorar" se muestra mientras al menos uno de sus
// submódulos permanezca habilitado.
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
    {
      id: 'catalogo-externos',
      pictograma: 'pictograma-flkt',
      ruta: `${ruta}/explorar/catalogos-externos`,
      globo: 'Catálogos externos',
    },
  ].filter((pagina) =>
    (pagina.ids ?? [pagina.id]).some(
      (id) => estaSubmoduloHabilitado(id).value
    )
  )
);

const paginasSesion = computed(() => {
  const paginas = [
    {
      id: 'catalogo-mis-archivos',
      pictograma: 'pictograma-proyectos',
      ruta: `${ruta}/mis-archivos`,
      globo: 'Mis archivos',
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
  ];

  if (
    puedeRevisarSolicitudes.value &&
    estaSubmoduloHabilitado('catalogo-revision').value
  ) {
    paginas.push({
      id: 'catalogo-revision',
      pictograma: 'pictograma-buscar',
      ruta: `${ruta}/revision-solicitudes`,
      globo: 'Revisión de solicitudes',
    });
  }

  return paginas.filter((pagina) =>
    estaSubmoduloHabilitado(pagina.id).value
  );
});

onMounted(async () => {
  await Promise.all([
    cargarConfiguracionModulos(),
    storeCatalogo.getUserInfo(),
    storeAdministracion.cargarPerfilActual().catch(() => null),
  ]);
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