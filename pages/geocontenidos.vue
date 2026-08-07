<script setup>
definePageMeta({ middleware: ['auth', 'redireccionar-modulo-geocontenidos'] });

const config = useRuntimeConfig();
const { status } = useAuth();
const storeCatalogo = useCatalogoStore();
const storeLandingBuilder = useLandingBuilderStore();

const ruta = '/geocontenidos';

const esAdmin = computed(() => Boolean(storeCatalogo.userInfo?.is_superuser));
const mostrarConstructor = computed(
  () => config.public.enableLandingBuilder && status.value === 'authenticated' && esAdmin.value
);

const itemsMenu = computed(() => {
  const items = [
    { nombre: 'Mapas', ruta: '/geocontenidos/mapas' },
    { nombre: 'Panoramas', ruta: `${ruta}/panoramas` },
    { nombre: 'Geo-historias', ruta: `${ruta}/geohistorias` },
    { nombre: 'Tableros de datos', ruta: `${ruta}/tableros` },
  ];

  if (mostrarConstructor.value) {
    const paginasCreadas = storeLandingBuilder.paginas.map((pagina) => ({
      nombre: pagina.nombre,
      ruta: `/paginas/${pagina.slug}`,
    }));

    items.push({
      nombre: 'Constructor de Páginas',
      ruta: '/landing-builder',
      ...(paginasCreadas.length ? { subMenu: paginasCreadas } : {}),
    });
  }

  items.push({ nombre: 'Micrositios' });

  return items;
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
</script>

<template>
  <div class="modulo-geocontenidos flex">
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
    />

    <div class="contenedor-contenido">
      <UiLayoutPaneles>
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
                      :aria-label="`Mostrar páginas de ${item.nombre}`"
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

.menu-lateral-item-fila {
  display: flex;
  align-items: center;
  justify-content: space-between;

  // El estado activo del enlace pinta un acento de 8px con box-shadow (ver
  // sisdai-css .menu-lateral-contenedor a.router-link-exact-active); sin este
  // espacio el acento se dibuja encima de la primera letra del texto.
  a {
    padding-left: 8px;
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
