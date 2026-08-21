<script setup>
import { tieneRolAdministrador } from '~/utils/levantamiento';

const route = useRoute();
const { data } = useAuth();

const storeLevantamiento = useLevantamientoStore();
const storeAdministracion = useAdministracionStore();

const { cargarConfiguracionModulos, estaSubmoduloHabilitado } =
  useConfiguracionModulos();

/**
 * El usuario puede considerarse administrador de Levantamiento si:
 * - Su token contiene el rol correspondiente.
 * - Su perfil de Administración tiene permisos suficientes.
 */
const esAdministradorLevantamiento = computed(
  () =>
    tieneRolAdministrador(data.value?.accessToken) ||
    ['superuser', 'administrator', 'editor'].includes(
      storeAdministracion.perfilActual?.profile
    )
);

/**
 * Submódulos generales de Levantamiento.
 */
const mostrarProyectos = estaSubmoduloHabilitado(
  'levantamiento-proyectos'
);

const mostrarAportes = estaSubmoduloHabilitado(
  'levantamiento-aportes'
);

const mostrarDescargas = estaSubmoduloHabilitado(
  'levantamiento-descargas'
);

/**
 * Submódulos de revisión.
 */
const mostrarRevisionProyectos = estaSubmoduloHabilitado(
  'levantamiento-revision-proyectos'
);

const mostrarRevisionAportes = estaSubmoduloHabilitado(
  'levantamiento-revision-aportes'
);

const mostrarRevisionDescargas = estaSubmoduloHabilitado(
  'levantamiento-revision-descargas'
);

/**
 * Revisión de proyectos:
 * requiere permisos de administración y que el submódulo esté habilitado.
 */
const puedeVerRevisionProyectos = computed(
  () =>
    esAdministradorLevantamiento.value &&
    mostrarRevisionProyectos.value
);

/**
 * Revisión de aportes:
 * puede verla un revisor o administrador, siempre que el submódulo
 * esté habilitado.
 */
const puedeVerRevisionAportes = computed(
  () =>
    (storeLevantamiento.esRevisor ||
      esAdministradorLevantamiento.value) &&
    mostrarRevisionAportes.value
);

/**
 * Revisión de descargas:
 * puede verla un revisor o administrador, siempre que el submódulo
 * esté habilitado.
 */
const puedeVerRevisionDescargas = computed(
  () =>
    (storeLevantamiento.esRevisor ||
      esAdministradorLevantamiento.value) &&
    mostrarRevisionDescargas.value
);

/**
 * La sección de revisión aparece únicamente si existe al menos
 * una opción visible para el usuario actual.
 */
const mostrarRevisiones = computed(
  () =>
    puedeVerRevisionProyectos.value ||
    puedeVerRevisionAportes.value ||
    puedeVerRevisionDescargas.value
);

onMounted(async () => {
  await Promise.all([
    cargarConfiguracionModulos(),
    storeLevantamiento.obtenerEsRevisor(data.value?.user?.email),
    storeAdministracion.cargarPerfilActual().catch(() => null),
  ]);
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
              ['router-link-active router-link-exact-active']:
                route.path.includes('/levantamiento/proyectos/'),
            }"
            to="/levantamiento/proyectos"
          >
            Proyectos
          </nuxt-link>
        </li>

        <li v-if="mostrarAportes">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']:
                route.path.includes('/levantamiento/aportes/'),
            }"
            to="/levantamiento/aportes"
          >
            Aportes
          </nuxt-link>
        </li>

        <li v-if="mostrarDescargas">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']:
                route.path.includes('/levantamiento/descargas/'),
            }"
            to="/levantamiento/descargas"
          >
            Descargas
          </nuxt-link>
        </li>
      </ul>

      <ul
        v-if="mostrarRevisiones"
        class="lista-subpagina"
        :class="{ revisor: mostrarRevisiones }"
      >
        <li v-if="puedeVerRevisionProyectos">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']:
                route.path.includes('/levantamiento/revision-proyectos'),
            }"
            to="/levantamiento/revision-proyectos"
          >
            Revisión de proyectos
          </nuxt-link>
        </li>

        <li v-if="puedeVerRevisionAportes">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']:
                route.path.includes('/levantamiento/revision-aportes'),
            }"
            to="/levantamiento/revision-aportes"
          >
            Revisión de aportes
          </nuxt-link>
        </li>

        <li v-if="puedeVerRevisionDescargas">
          <nuxt-link
            :class="{
              ['router-link-active router-link-exact-active']:
                route.path.includes('/levantamiento/revision-descargas'),
            }"
            to="/levantamiento/revision-descargas"
          >
            Revisión de descargas
          </nuxt-link>
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