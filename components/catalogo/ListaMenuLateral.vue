<script setup>
const { status } = useAuth();
const estaLogueado = computed(() => status.value === 'authenticated');

const route = useRoute();

const storeCatalogo = useCatalogoStore();
const storeAdministracion = useAdministracionStore();

const { cargarConfiguracionModulos, estaHabilitado, estaSubmoduloHabilitado } =
  useConfiguracionModulos();

const mostrarCapas = estaSubmoduloHabilitado('catalogo-capas');
const mostrarTablas = estaSubmoduloHabilitado('catalogo-tablas');
const mostrarDocumentos = estaSubmoduloHabilitado('catalogo-documentos');
const mostrarExternos = estaSubmoduloHabilitado('catalogo-externos');
const mostrarMapas = estaSubmoduloHabilitado('catalogo-mapas');
const mostrarMisArchivos = estaSubmoduloHabilitado('catalogo-mis-archivos');
const mostrarCargar = estaSubmoduloHabilitado('catalogo-cargar');
const mostrarServiciosRemotos = estaSubmoduloHabilitado('catalogo-servicios-remotos');
const mostrarRevision = estaSubmoduloHabilitado('catalogo-revision');

const levantamientoHabilitado = estaHabilitado('levantamiento');
const mostrarProyectosLevantamiento = estaSubmoduloHabilitado('levantamiento-proyectos');

const puedeRevisarSolicitudes = computed(() =>
  ['superuser', 'administrator', 'editor'].includes(storeAdministracion.perfilActual?.profile)
);

const mostrarProyectos = computed(
  () => levantamientoHabilitado.value && mostrarProyectosLevantamiento.value
);

const mostrarExplorar = computed(
  () =>
    mostrarCapas.value ||
    mostrarTablas.value ||
    mostrarDocumentos.value ||
    mostrarMapas.value ||
    mostrarExternos.value ||
    mostrarProyectos.value
);

const mostrarSesion = computed(
  () =>
    mostrarMisArchivos.value ||
    mostrarCargar.value ||
    mostrarServiciosRemotos.value ||
    (mostrarRevision.value && puedeRevisarSolicitudes.value)
);

onMounted(async () => {
  await cargarConfiguracionModulos();

  if (!estaLogueado.value) {
    storeCatalogo.userInfo = {};
    return;
  }

  await Promise.all([
    !storeCatalogo.userInfo?.username ? storeCatalogo.getUserInfo() : Promise.resolve(),
    storeAdministracion.cargarPerfilActual().catch(() => null),
  ]);
});
</script>

<template>
  <nav class="menu-lateral">
    <div class="menu-lateral-contenedor">
      <h4 class="m-0 p-4">Catálogo de información</h4>

      <ul v-if="mostrarExplorar" class="lista-subpagina">
        <li>
          <nuxt-link to="/catalogo/explorar">Explorar</nuxt-link>

          <ul>
            <li v-if="mostrarCapas">
              <nuxt-link to="/catalogo/explorar/capas"> Capas geográficas </nuxt-link>
            </li>

            <li v-if="mostrarTablas">
              <nuxt-link to="/catalogo/explorar/tablas"> Datos tabulados </nuxt-link>
            </li>

            <li v-if="mostrarDocumentos">
              <nuxt-link to="/catalogo/explorar/documentos"> Documentos </nuxt-link>
            </li>

            <li v-if="mostrarMapas">
              <nuxt-link to="/catalogo/explorar/mapas">Mapas</nuxt-link>
            </li>

            <li v-if="mostrarProyectos">
              <nuxt-link to="/levantamiento/proyectos"> Proyectos </nuxt-link>
            </li>

            <li v-if="mostrarExternos">
              <nuxt-link to="/catalogo/explorar/catalogos-externos"> Servicios remotos </nuxt-link>
            </li>
          </ul>
        </li>
      </ul>

      <ul v-if="estaLogueado && mostrarSesion" class="lista-sesion">
        <li v-if="mostrarMisArchivos">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']:
                route.path.includes('/catalogo/mis-recursos/'),
            }"
            to="/catalogo/mis-recursos"
          >
            Mis recursos
          </nuxt-link>
        </li>

        <li v-if="mostrarCargar">
          <nuxt-link to="/catalogo/cargar-archivos"> Carga de archivos </nuxt-link>
        </li>

        <li v-if="mostrarServiciosRemotos">
          <nuxt-link to="/catalogo/servicios-remotos"> Carga de servicios remotos </nuxt-link>
        </li>

        <li v-if="mostrarRevision && puedeRevisarSolicitudes">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']: route.path.includes(
                '/catalogo/revision-solicitudes/'
              ),
            }"
            to="/catalogo/revision-solicitudes"
          >
            Revisión de solicitudes
          </nuxt-link>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.menu-lateral .menu-lateral-contenedor {
  padding: 0;

  .lista-sesion {
    margin-top: 16px;
  }
}
</style>
