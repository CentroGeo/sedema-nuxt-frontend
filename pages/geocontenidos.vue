<script setup>
definePageMeta({ middleware: ['auth', 'redireccionar-modulo-geocontenidos'] });

const config = useRuntimeConfig();
const { status } = useAuth();
const storeCatalogo = useCatalogoStore();
const storeLandingBuilder = useLandingBuilderStore();
const { cargarConfiguracionModulos, estaHabilitado, estaSubmoduloHabilitado } =
  useConfiguracionModulos();

const ruta = '/geocontenidos';
const geocontenidosHabilitados = estaHabilitado('geocontenidos');

const esAdmin = computed(() => Boolean(storeCatalogo.userInfo?.is_superuser));
const mostrarConstructor = computed(
  () => config.public.enableLandingBuilder && status.value === 'authenticated' && esAdmin.value
);

const itemsMenu = computed(() => {
  const items = [
    { id: 'geocontenidos-mapas', nombre: 'Mapas', ruta: '/geocontenidos/mapas' },
    { id: 'geocontenidos-panoramas', nombre: 'Panoramas', ruta: `${ruta}/panoramas` },
    { id: 'geocontenidos-geohistorias', nombre: 'Geo-historias', ruta: `${ruta}/geohistorias` },
    { id: 'geocontenidos-tableros', nombre: 'Tableros de datos', ruta: `${ruta}/tableros` },
    { id: 'geocontenidos-importar', nombre: 'Importar datos', ruta: `${ruta}/importar-datos` },
  ].filter((item) => estaSubmoduloHabilitado(item.id).value);

  if (mostrarConstructor.value) {
    items.push({
      nombre: 'Constructor de Páginas',
      ruta: '/landing-builder',
      accionesConstructor: true,
    });
  }

  if (estaSubmoduloHabilitado('geocontenidos-micrositios').value) {
    items.push({ nombre: 'Micrositios' });
  }

  return items;
});

const submenusAbiertos = reactive({});

onMounted(() => {
  cargarConfiguracionModulos();
});

function alternarSubmenu(nombre) {
  submenusAbiertos[nombre] = !submenusAbiertos[nombre];
  if (nombre === 'Constructor de Páginas' && !submenusAbiertos[nombre]) {
    accionConstructorAbierta.value = null;
  }
}

function alternarAccionConstructor(accion) {
  accionConstructorAbierta.value = accionConstructorAbierta.value === accion ? null : accion;
}

function cerrarMenuConstructor() {
  submenusAbiertos['Constructor de Páginas'] = false;
  accionConstructorAbierta.value = null;
}

// Mismo aviso que ya existía en pages/landing-builder/index.vue al cambiar
// de página con cambios sin guardar en el lienzo, ahora reutilizable desde
// este menú.
async function confirmarSiHayCambiosSinGuardar() {
  if (!storeLandingBuilder.hayCambiosSinGuardar()) return true;

  const mensaje = storeLandingBuilder.paginaEditandoId
    ? 'Tienes cambios sin guardar en la página que estás editando. Se perderán si continúas. ¿Deseas continuar?'
    : 'Tienes bloques sin guardar en el lienzo. Se perderán si continúas. ¿Deseas continuar?';

  return Boolean(
    await modalConfirmar.value?.abrir({
      titulo: 'Cambios sin guardar',
      mensaje,
      textoConfirmar: 'Continuar',
    })
  );
}

async function crearPaginaDesdeMenu() {
  if (!puedeCrearPagina.value) return;
  if (!(await confirmarSiHayCambiosSinGuardar())) return;

  storeLandingBuilder.cancelarEdicionPagina();
  storeLandingBuilder.solicitarLienzoEnBlanco = true;
  cerrarMenuConstructor();
  await navigateTo('/landing-builder');
}

async function editarPaginaDesdeMenu(pagina) {
  if (!(await confirmarSiHayCambiosSinGuardar())) return;

  storeLandingBuilder.cargarPaginaParaEditar(pagina);
  cerrarMenuConstructor();
  await navigateTo('/landing-builder');
}

async function eliminarPaginaDesdeMenu(pagina) {
  const ok = await modalConfirmar.value?.abrir({
    titulo: 'Eliminar página',
    mensaje: `¿Estás seguro que deseas eliminar la página publicada "${pagina.nombre}"?`,
    textoConfirmar: 'Eliminar',
  });
  if (!ok) return;

  await storeLandingBuilder.eliminarPagina(pagina.id);
}

function verPaginaDesdeMenu(pagina) {
  cerrarMenuConstructor();
  navigateTo(`/paginas/${pagina.slug}`, { open: { target: '_blank' } });
}

const menuLateralRef = ref(null);
onClickOutside(menuLateralRef, () => {
  Object.keys(submenusAbiertos).forEach((nombre) => {
    submenusAbiertos[nombre] = false;
  });
});

const menuColapsado = ref(false);
function alternarMenuColapsable() {
  menuColapsado.value = !menuColapsado.value;
}
</script>

<template>
  <div v-if="geocontenidosHabilitados" class="modulo-geocontenidos flex">
    <UiNavegacionLateral
      :sub-paginas="[
        {
          pictograma: 'pictograma-proyectos',
          // ruta: `${ruta}/`,
          globo: '',
        },
        {
          pictograma: 'pictograma-archivo-subir',
          // ruta: `${ruta}/`,
          globo: '',
        },
        {
          pictograma: 'pictograma-ayuda',
          // ruta: `${ruta}/`,
          globo: '',
        },
      ]"
      :funcion-colapsar="alternarMenuColapsable"
      :estado-colapable="menuColapsado"
      id-colapsable="geocontenidos-navegacion-lateral"
    />

    <div class="contenedor-contenido">
      <UiLayoutPaneles :estado-colapable="menuColapsado">
        <template #catalogo>
          <nav ref="menuLateralRef" class="menu-lateral">
            <div class="menu-lateral-contenedor">
              <h4 class="m-0 p-4">Menú</h4>

              <ul>
                <li
                  v-for="item in itemsMenu"
                  :key="item.nombre"
                  :class="{
                    'menu-lateral-item-con-submenu': item.subMenu,
                    abierto: item.subMenu && submenusAbiertos[item.nombre],
                  }"
                >
                  <div class="menu-lateral-item-fila">
                    <NuxtLink :to="item.ruta">{{ item.nombre }}</NuxtLink>

                    <button
                      v-if="item.subMenu"
                      type="button"
                      class="pictograma-menu"
                      :aria-expanded="Boolean(submenusAbiertos[item.nombre])"
                      :aria-label="`Mostrar opciones de ${item.nombre}`"
                      @click="alternarSubmenu(item.nombre)"
                    >
                      ☰
                    </button>
                  </div>

                  <ul v-if="item.subMenu" class="menu-lateral-submenu">
                    <li v-for="subItem in item.subMenu" :key="subItem.nombre">
                      <NuxtLink :to="subItem.ruta">{{ subItem.nombre }}</NuxtLink>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </nav>
        </template>

        <template #visualizador>
          <NuxtPage />
        </template>
      </UiLayoutPaneles>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modulo-geocontenidos {
  // min-height: 100vh;
  &.flex {
    gap: 0;
  }
  .contenedor-contenido {
    flex: 1;
    // padding: 16px;
  }
}

.menu-lateral .menu-lateral-contenedor {
  padding: 0;
}

.menu-lateral-item-fila {
  display: flex;
  align-items: center;
  justify-content: space-between;

  a {
    flex: 1;
    padding-left: 24px;
    padding-right: 16px;
  }
}

.pictograma-menu-hamburguesa {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 4px 8px;
}

.menu-lateral-item-con-submenu {
  .menu-lateral-submenu {
    display: none;
  }

  &.abierto .menu-lateral-submenu {
    display: block;
  }
}

.menu-lateral-submenu {
  list-style: none;
  padding-left: 16px;
}
</style>
