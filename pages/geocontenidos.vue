<script setup>
definePageMeta({ middleware: ['auth', 'redireccionar-modulo-geocontenidos'] });

const { cargarConfiguracionModulos, estaHabilitado, estaSubmoduloHabilitado } =
  useConfiguracionModulos();

const ruta = '/geocontenidos';
const route = useRoute();

// Las vistas de mapa a pantalla completa (visualizar/embed) se renderizan sin
// el chrome del módulo (navegación lateral + paneles).
const enMapaStandalone = computed(() => /\/mapas\/[^/]+\/(visualizar|embed)$/.test(route.path));

const geocontenidosHabilitados = estaHabilitado('geocontenidos');

const itemsMenu = computed(() => {
  const items = [
    { id: 'geocontenidos-mapas', nombre: 'Mapas', ruta: '/geocontenidos/mapas' },
    { id: 'geocontenidos-panoramas', nombre: 'Panoramas', ruta: `${ruta}/panoramas` },
    { id: 'geocontenidos-geohistorias', nombre: 'Geo-historias', ruta: `${ruta}/geohistorias` },
    { id: 'geocontenidos-tableros', nombre: 'Tableros de datos', ruta: `${ruta}/tableros` },
    { id: 'geocontenidos-importar', nombre: 'Importar datos', ruta: `${ruta}/importar-datos` },
  ].filter((item) => estaSubmoduloHabilitado(item.id).value);

  if (estaSubmoduloHabilitado('geocontenidos-micrositios').value) {
    items.push({ nombre: 'Micrositios' });
  }

  return items;
});

onMounted(() => {
  cargarConfiguracionModulos();
});

const submenusAbiertos = reactive({});

function alternarSubmenu(nombre) {
  submenusAbiertos[nombre] = !submenusAbiertos[nombre];
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
  <NuxtPage v-if="enMapaStandalone" />
  <div v-else-if="geocontenidosHabilitados" class="modulo-geocontenidos flex">
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
