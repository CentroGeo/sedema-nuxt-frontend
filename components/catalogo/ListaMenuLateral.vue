<script setup>
const { status } = useAuth();
const estaLogueado = computed(() => status.value === 'authenticated');

const route = useRoute();

const storeCatalogo = useCatalogoStore();
const storeAdministracion = useAdministracionStore();
const puedeRevisarSolicitudes = computed(() =>
  ['superuser', 'administrator', 'editor'].includes(storeAdministracion.perfilActual?.profile)
);

onMounted(async () => {
  if (!estaLogueado.value) {
    storeCatalogo.userInfo = {};
  } else {
    await Promise.all([
      !storeCatalogo.userInfo?.username ? storeCatalogo.getUserInfo() : Promise.resolve(),
      storeAdministracion.cargarPerfilActual().catch(() => null),
    ]);
  }
});
</script>
<template>
  <nav class="menu-lateral">
    <div class="menu-lateral-contenedor">
      <h4 class="m-0 p-4">Catálogo de información</h4>
      <ul class="lista-subpagina">
        <li>
          <nuxt-link to="/catalogo/explorar">Explorar</nuxt-link>
          <ul>
            <li>
              <nuxt-link to="/catalogo/explorar/capas">Capas geográficas</nuxt-link>
            </li>
            <li>
              <nuxt-link to="/catalogo/explorar/tablas">Datos tabulados</nuxt-link>
            </li>
            <li>
              <nuxt-link to="/catalogo/explorar/documentos">Documentos</nuxt-link>
            </li>
            <li>
              <nuxt-link to="/catalogo/explorar/catalogos-externos">Servicios remotos</nuxt-link>
            </li>
          </ul>
        </li>
      </ul>
      <ul v-if="estaLogueado" class="lista-sesion">
        <li>
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']:
                route.path.includes('/catalogo/mis-archivos/'),
            }"
            to="/catalogo/mis-archivos"
            >Mis archivos</nuxt-link
          >
        </li>
        <li>
          <nuxt-link to="/catalogo/cargar-archivos">Carga de archivos</nuxt-link>
        </li>
        <li>
          <nuxt-link to="/catalogo/servicios-remotos">Carga de servicios remotos</nuxt-link>
        </li>
        <li v-if="puedeRevisarSolicitudes">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']: route.path.includes(
                '/catalogo/revision-solicitudes/'
              ),
            }"
            to="/catalogo/revision-solicitudes"
            >Revisión de solicitudes</nuxt-link
          >
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
