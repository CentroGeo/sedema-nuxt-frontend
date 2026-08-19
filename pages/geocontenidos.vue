<script setup>
definePageMeta({ middleware: ['auth', 'redireccionar-modulo-geocontenidos'] });

const config = useRuntimeConfig();
const { status } = useAuth();
const storeAdministracion = useAdministracionStore();
const storeLandingBuilder = useLandingBuilderStore();

const ruta = '/geocontenidos';

const puedeAdministrarPlataforma = computed(
  () => storeAdministracion.perfilActual?.can_access_administration === true
);
const mostrarConstructor = computed(
  () =>
    config.public.enableLandingBuilder &&
    status.value === 'authenticated' &&
    puedeAdministrarPlataforma.value
);

const itemsMenu = computed(() => {
  const items = [
    { nombre: 'Mapas', ruta: '/geocontenidos/mapas' },
    { nombre: 'Panoramas', ruta: `${ruta}/panoramas` },
    { nombre: 'Geo-historias', ruta: `${ruta}/geohistorias` },
    { nombre: 'Tableros de datos', ruta: `${ruta}/tableros` },
  ];

  if (mostrarConstructor.value) {
    items.push({
      nombre: 'Constructor de Páginas',
      ruta: '/landing-builder',
      accionesConstructor: true,
    });
  }

  items.push({ nombre: 'Micrositios' });

  return items;
});

const submenusAbiertos = reactive({});
// Dentro del submenú del Constructor de Páginas: null | 'ver' | 'editar' | 'eliminar'
const accionConstructorAbierta = ref(null);
const modalConfirmar = ref(null);

onMounted(() => storeAdministracion.cargarPerfilActual().catch(() => null));

const puedeCrearPagina = computed(() => storeLandingBuilder.puedeCrearPagina());

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
  accionConstructorAbierta.value = null;
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
                    'menu-lateral-item-con-submenu': item.subMenu || item.accionesConstructor,
                    abierto:
                      (item.subMenu || item.accionesConstructor) && submenusAbiertos[item.nombre],
                  }"
                >
                  <div class="menu-lateral-item-fila">
                    <NuxtLink v-if="!item.accionesConstructor" :to="item.ruta">{{
                      item.nombre
                    }}</NuxtLink>
                    <span v-else class="menu-lateral-etiqueta">{{ item.nombre }}</span>

                    <button
                      v-if="item.subMenu || item.accionesConstructor"
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

                  <ul v-if="item.accionesConstructor" class="menu-lateral-submenu">
                    <li>
                      <button
                        type="button"
                        class="menu-lateral-accion"
                        :aria-expanded="accionConstructorAbierta === 'ver'"
                        @click="alternarAccionConstructor('ver')"
                      >
                        Visualizar página
                      </button>

                      <ul v-if="accionConstructorAbierta === 'ver'" class="menu-lateral-submenu">
                        <li v-if="!storeLandingBuilder.paginas.length" class="menu-lateral-vacio">
                          No hay páginas creadas.
                        </li>
                        <li v-for="pagina in storeLandingBuilder.paginas" :key="pagina.id">
                          <button
                            type="button"
                            class="menu-lateral-accion"
                            @click="verPaginaDesdeMenu(pagina)"
                          >
                            {{ pagina.nombre }}
                          </button>
                        </li>
                      </ul>
                    </li>

                    <li>
                      <button
                        type="button"
                        class="menu-lateral-accion"
                        :disabled="!puedeCrearPagina"
                        :title="
                          !puedeCrearPagina
                            ? `Ya tienes el máximo de ${storeLandingBuilder.limitePaginas} páginas. Elimina una para crear otra.`
                            : undefined
                        "
                        @click="crearPaginaDesdeMenu"
                      >
                        Crear página
                      </button>
                    </li>

                    <li>
                      <button
                        type="button"
                        class="menu-lateral-accion"
                        :aria-expanded="accionConstructorAbierta === 'editar'"
                        @click="alternarAccionConstructor('editar')"
                      >
                        Editar página
                      </button>

                      <ul v-if="accionConstructorAbierta === 'editar'" class="menu-lateral-submenu">
                        <li v-if="!storeLandingBuilder.paginas.length" class="menu-lateral-vacio">
                          No hay páginas creadas.
                        </li>
                        <li v-for="pagina in storeLandingBuilder.paginas" :key="pagina.id">
                          <button
                            type="button"
                            class="menu-lateral-accion"
                            @click="editarPaginaDesdeMenu(pagina)"
                          >
                            {{ pagina.nombre }}
                          </button>
                        </li>
                      </ul>
                    </li>

                    <li>
                      <button
                        type="button"
                        class="menu-lateral-accion"
                        :aria-expanded="accionConstructorAbierta === 'eliminar'"
                        @click="alternarAccionConstructor('eliminar')"
                      >
                        Eliminar página
                      </button>

                      <ul
                        v-if="accionConstructorAbierta === 'eliminar'"
                        class="menu-lateral-submenu"
                      >
                        <li v-if="!storeLandingBuilder.paginas.length" class="menu-lateral-vacio">
                          No hay páginas creadas.
                        </li>
                        <li v-for="pagina in storeLandingBuilder.paginas" :key="pagina.id">
                          <button
                            type="button"
                            class="menu-lateral-accion"
                            @click="eliminarPaginaDesdeMenu(pagina)"
                          >
                            {{ pagina.nombre }}
                          </button>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </nav>

          <GeocontenidosModalConfirmar ref="modalConfirmar" />
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
  a,
  .menu-lateral-etiqueta {
    padding-left: 8px;
  }
}

// Constructor de Páginas ya no navega al hacer clic en el texto: solo el
// botón ☰ (Crear/Editar/Eliminar) hace algo, así que su nombre es una
// etiqueta simple, no un enlace.
.menu-lateral-etiqueta {
  color: inherit;
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

.menu-lateral-accion {
  display: block;
  width: 100%;
  padding: 4px 8px;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    text-decoration: none;
  }
}

.menu-lateral-vacio {
  padding: 4px 8px;
  font-size: 0.875rem;
  opacity: 0.7;
}
</style>
