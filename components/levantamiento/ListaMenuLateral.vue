<script setup>
import { tieneRolAdministrador } from '~/utils/levantamiento';

const route = useRoute();
const { data } = useAuth();
const storeLevantamiento = useLevantamientoStore();
const { cargarConfiguracionModulos, estaSubmoduloHabilitado } = useConfiguracionModulos();
const esAdministradorLevantamiento = computed(() => tieneRolAdministrador(data.value?.accessToken));
const mostrarProyectos = estaSubmoduloHabilitado('levantamiento-proyectos');
const mostrarAportes = estaSubmoduloHabilitado('levantamiento-aportes');
const mostrarDescargas = estaSubmoduloHabilitado('levantamiento-descargas');
const mostrarRevisionProyectos = estaSubmoduloHabilitado('levantamiento-revision-proyectos');
const mostrarRevisionAportes = estaSubmoduloHabilitado('levantamiento-revision-aportes');
const mostrarRevisionDescargas = estaSubmoduloHabilitado('levantamiento-revision-descargas');
const mostrarRevisiones = computed(
  () =>
    (storeLevantamiento.esRevisor || esAdministradorLevantamiento.value) &&
    (mostrarRevisionProyectos.value ||
      mostrarRevisionAportes.value ||
      mostrarRevisionDescargas.value)
);

onMounted(async () => {
  await cargarConfiguracionModulos();
  await storeLevantamiento.obtenerEsRevisor(data.value?.user.email);
});
</script>
<template>
  <nav class="menu-lateral">
    <div class="menu-lateral-contenedor">
      <h4 class="m-0 p-4">Explora y aporta</h4>
      <ul class="lista-subpagina">
        <li v-if="mostrarProyectos">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']: route.path.includes(
                '/levantamiento/proyectos/'
              ),
            }"
            to="/levantamiento/proyectos"
            >Proyectos</nuxt-link
          >
        </li>
        <li v-if="mostrarAportes">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']:
                route.path.includes('/levantamiento/aportes/'),
            }"
            to="/levantamiento/aportes"
            >Aportes</nuxt-link
          >
        </li>
        <li v-if="mostrarDescargas">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']: route.path.includes(
                '/levantamiento/descargas/'
              ),
            }"
            to="/levantamiento/descargas"
            >Descargas</nuxt-link
          >
        </li>
      </ul>
      <ul v-if="mostrarRevisiones" class="lista-subpagina" :class="{ revisor: mostrarRevisiones }">
        <li v-if="esAdministradorLevantamiento && mostrarRevisionProyectos">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']: route.path.includes(
                '/levantamiento/revision-proyectos'
              ),
            }"
            to="/levantamiento/revision-proyectos"
            >Revisión de proyectos</nuxt-link
          >
        </li>
        <li v-if="mostrarRevisionAportes">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']: route.path.includes(
                '/levantamiento/revision-aportes'
              ),
            }"
            to="/levantamiento/revision-aportes"
            >Revisión de aportes</nuxt-link
          >
        </li>
        <li v-if="mostrarRevisionDescargas">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']: route.path.includes(
                '/levantamiento/revision-descargas'
              ),
            }"
            to="/levantamiento/revision-descargas"
            >Revisión de descargar</nuxt-link
          >
        </li>
      </ul>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.menu-lateral .menu-lateral-contenedor {
  padding: 0;

  .lista-subpagina.revisor {
    margin-top: 32px;
  }
}
</style>
