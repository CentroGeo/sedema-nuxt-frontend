<script setup>
const store = useLandingBuilderStore();
const modalConfirmar = ref(null);
const modalNombrePagina = ref(null);

// 'menu' | 'lienzo' | 'lista-editar' | 'lista-visualizar' | 'lista-borrar'
const vista = ref('menu');

// MainNavegacion.vue y MainPiePagina.vue usan este flag (compartido vía
// store) para mostrar los controles de edición de logos/color/pie de página
// solo mientras se está viendo el lienzo, no en el menú ni en las listas.
watch(
  vista,
  (nuevaVista) => {
    store.enEdicionLienzo = nuevaVista === 'lienzo';
  },
  { immediate: true }
);

const paginaEnEdicion = computed(() =>
  store.paginas.find((pagina) => pagina.id === store.paginaEditandoId)
);

const tituloLista = computed(
  () =>
    ({
      'lista-editar': 'Editar página',
      'lista-visualizar': 'Visualizar página',
      'lista-borrar': 'Eliminar página',
    })[vista.value]
);

async function confirmarSiHayCambiosSinGuardar() {
  if (vista.value !== 'lienzo' || !store.hayCambiosSinGuardar()) return true;

  const mensaje = store.paginaEditandoId
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

async function irAlMenu() {
  if (!(await confirmarSiHayCambiosSinGuardar())) return;
  vista.value = 'menu';
}

function cancelarEdicion() {
  store.cancelarEdicionPagina();
  vista.value = 'menu';
}

async function abrirNuevo() {
  if (!store.puedeCrearPagina()) return;
  if (!(await confirmarSiHayCambiosSinGuardar())) return;

  store.cancelarEdicionPagina();
  vista.value = 'lienzo';
}

async function abrirListaEditar() {
  if (!(await confirmarSiHayCambiosSinGuardar())) return;
  vista.value = 'lista-editar';
}

async function abrirListaVisualizar() {
  if (!(await confirmarSiHayCambiosSinGuardar())) return;
  vista.value = 'lista-visualizar';
}

async function abrirListaBorrar() {
  if (!(await confirmarSiHayCambiosSinGuardar())) return;
  vista.value = 'lista-borrar';
}

function seleccionarParaEditar(pagina) {
  store.cargarPaginaParaEditar(pagina);
  vista.value = 'lienzo';
}

function verPagina(pagina) {
  // navigateTo(..., { open }) no resuelve rutas string contra el baseURL de la
  // app (queda como /paginas/x en vez de /admin/paginas/x en producción, y el
  // nginx externo la manda a GeoNode como 404); router.resolve() sí lo aplica.
  const router = useRouter();
  window.open(router.resolve(`/paginas/${pagina.slug}`).href, '_blank');
}

async function eliminarPagina(pagina) {
  const ok = await modalConfirmar.value?.abrir({
    titulo: 'Eliminar página',
    mensaje: `¿Estás seguro que deseas eliminar la página publicada "${pagina.nombre}"?`,
    textoConfirmar: 'Eliminar',
  });
  if (!ok) return;
  await store.eliminarPagina(pagina.id);
}

async function manejarCrearOGuardar() {
  if (store.paginaEditandoId) {
    await store.crearPagina();
    return;
  }

  const nombre = await modalNombrePagina.value?.abrir();
  if (!nombre) return;

  await store.crearPagina(nombre);
}

onMounted(() => {
  store.cargarConfiguracion();
});
</script>

<template>
  <div class="landing-builder-pagina">
    <!-- Vista: Menú principal -->
    <section v-if="vista === 'menu'" class="contenedor m-y-3 constructor-menu">
      <div class="constructor-menu__acciones">
        <button type="button" class="boton-primario boton-grande" @click="abrirNuevo">Nuevo</button>
        <button type="button" class="boton-secundario boton-grande" @click="abrirListaEditar">
          Editar
        </button>
        <button type="button" class="boton-secundario boton-grande" @click="abrirListaVisualizar">
          Visualizar
        </button>
        <button type="button" class="boton-secundario boton-grande" @click="abrirListaBorrar">
          Borrar
        </button>
      </div>

      <section v-if="store.paginas.length" class="m-t-3 landing-builder-pagina-inicio">
        <label for="select-pagina-inicio">Página de inicio</label>

        <select
          id="select-pagina-inicio"
          class="landing-builder-pagina-inicio__select"
          :value="store.paginaInicioId ?? ''"
          @change="store.establecerPaginaInicio($event.target.value || null)"
        >
          <option value="">Predeterminada (Index)</option>
          <option v-for="pagina in store.paginas" :key="pagina.id" :value="pagina.id">
            {{ pagina.nombre }}
          </option>
        </select>

        <p class="texto-color-secundario m-t-1">
          Elige qué página se muestra cuando alguien visita el sitio en "/".
        </p>
      </section>
    </section>

    <!-- Vista: Lienzo (Nuevo / Editar) -->
    <template v-else-if="vista === 'lienzo'">
      <div class="contenedor m-t-3 constructor-lienzo__encabezado">
        <button type="button" class="boton-secundario boton-chico" @click="irAlMenu">
          ← Volver
        </button>

        <p v-if="paginaEnEdicion" class="landing-builder-editando-aviso">
          Editando: <strong>{{ paginaEnEdicion.nombre }}</strong>
          <button type="button" class="boton-secundario boton-chico m-l-2" @click="cancelarEdicion">
            Cancelar edición
          </button>
        </p>
      </div>

      <LandingBuilderLienzoBloques v-model="store.bloques" />

      <div class="contenedor flex flex-vertical-centrado m-y-3 landing-builder-acciones">
        <button
          class="boton-primario boton-chico"
          type="button"
          :disabled="
            store.isSaving ||
            store.isCreandoPagina ||
            (!store.paginaEditandoId && !store.puedeCrearPagina())
          "
          :title="
            !store.paginaEditandoId && !store.puedeCrearPagina()
              ? `Ya tienes el máximo de ${store.limitePaginas} páginas. Elimina una para crear otra.`
              : undefined
          "
          @click="manejarCrearOGuardar"
        >
          {{
            store.isCreandoPagina
              ? 'Guardando página...'
              : store.paginaEditandoId
                ? 'Guardar cambios en esta página'
                : 'Crear página'
          }}
        </button>

        <p v-if="store.saveSuccess" class="texto-color-confirmacion m-l-2">
          {{ store.mensajeExito }}
        </p>

        <p v-if="store.error" class="texto-color-error m-l-2">
          {{ store.error }}
        </p>
      </div>
    </template>

    <!-- Vista: listas de Editar / Visualizar / Borrar -->
    <section v-else class="contenedor m-y-3 constructor-lista">
      <div class="constructor-lista__encabezado">
        <button type="button" class="boton-secundario boton-chico" @click="irAlMenu">
          ← Volver
        </button>
        <h3>{{ tituloLista }} ({{ store.paginas.length }}/{{ store.limitePaginas }})</h3>
      </div>

      <p v-if="!store.paginas.length" class="texto-color-secundario">No hay páginas creadas.</p>

      <ul v-else class="landing-builder-paginas__lista">
        <li v-for="pagina in store.paginas" :key="pagina.id" class="landing-builder-paginas__item">
          <span
            v-if="vista === 'lista-editar'"
            contenteditable="true"
            class="landing-builder-paginas__nombre"
            title="Haz clic para editar el nombre"
            @blur="store.renombrarPagina(pagina.id, $event.target.textContent)"
            @keydown.enter.prevent="$event.target.blur()"
          >
            {{ pagina.nombre }}
          </span>
          <span v-else class="landing-builder-paginas__nombre">{{ pagina.nombre }}</span>

          <button
            v-if="vista === 'lista-editar'"
            type="button"
            class="boton-secundario boton-chico"
            @click="seleccionarParaEditar(pagina)"
          >
            Editar
          </button>
          <button
            v-else-if="vista === 'lista-visualizar'"
            type="button"
            class="boton-secundario boton-chico"
            @click="verPagina(pagina)"
          >
            Ver
          </button>
          <button
            v-else
            type="button"
            class="boton-secundario boton-chico"
            @click="eliminarPagina(pagina)"
          >
            Eliminar
          </button>
        </li>
      </ul>
    </section>

    <GeocontenidosModalConfirmar ref="modalConfirmar" />
    <LandingBuilderModalNombrePagina ref="modalNombrePagina" />

    <!--
    Formulario existente (config, editor de portada/sección/logo, tarjetas y vista previa).
    Se deja comentado mientras el lienzo en blanco reemplaza este flujo; no se elimina por si
    se necesita recuperar la lógica más adelante.

    <section
      class="contenedor m-y-4 landing-builder-configuracion"
      aria-labelledby="landing-builder-configuracion-titulo"
    >
      <div class="landing-builder-configuracion__encabezado">
        <h2 id="landing-builder-configuracion-titulo">Configuración de la landing page</h2>

        <p>
          Configura los textos y el logo principales de la landing page. Los cambios se reflejan en
          la vista previa antes de guardarlos.
        </p>
      </div>

      <div v-if="store.isLoading" class="flex flex-contenido-centrado m-y-4">
        <p>Cargando configuración...</p>
      </div>

      <div v-else class="landing-builder-contenido">
        <div class="landing-builder-panel">
          <h3 class="landing-builder-panel__titulo">Editor</h3>

          <LandingBuilderPanelEdicion />

          <LandingBuilderTarjetasEditor class="m-t-3" />

          <div class="flex flex-vertical-centrado m-t-3 landing-builder-acciones">
            <button
              class="boton-primario boton-chico"
              type="button"
              :disabled="store.isSaving"
              @click="store.guardarConfiguracion"
            >
              {{ store.isSaving ? 'Guardando...' : 'Guardar cambios' }}
            </button>

            <p v-if="store.saveSuccess" class="texto-color-confirmacion m-l-2">
              Configuración guardada.
            </p>

            <p v-if="store.error" class="texto-color-error m-l-2">
              {{ store.error }}
            </p>
          </div>
        </div>

        <div class="landing-builder-panel landing-builder-panel--vista-previa">
          <h3 class="landing-builder-panel__titulo">Vista previa</h3>

          <LandingBuilderVistaPrevia
            :nombre-plataforma="store.nombrePlataforma"
            :titulo="store.titulo"
            :subtitulo="store.subtitulo"
            :titulo-seccion="store.tituloSeccion"
            :descripcion="store.descripcion"
            :seccion-texto="store.seccionTexto"
            :logo-url="store.logoUrl"
            :tarjetas="store.tarjetas"
          />
        </div>
      </div>
    </section>
    -->
  </div>
</template>

<style scoped lang="scss">
.landing-builder-pagina {
  width: 100%;
}

.landing-builder-editando-aviso {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 20%);
  color: #ffffff;
}

.constructor-menu__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.constructor-lienzo__encabezado,
.constructor-lista__encabezado {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  h3 {
    margin: 0;
  }
}

.landing-builder-paginas__lista {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.landing-builder-paginas__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--color-neutro-2, #e0e0e0);
  border-radius: 6px;
}

.landing-builder-paginas__nombre {
  padding: 2px 6px;
  border: 1px dashed transparent;
  border-radius: 4px;
  outline: none;

  &:hover,
  &:focus {
    border-color: var(--color-neutro-3, #bdbdbd);
  }
}

.landing-builder-pagina-inicio {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-weight: 600;
  }
}

.landing-builder-pagina-inicio__select {
  width: fit-content;
  min-width: 220px;
  padding: 8px 12px;
  border: 1px solid var(--color-neutro-2, #e0e0e0);
  border-radius: 6px;
}

.landing-builder-configuracion {
  padding-top: 32px;
  padding-bottom: 48px;
}

.landing-builder-configuracion__encabezado {
  max-width: 780px;
  margin-bottom: 32px;
}

.landing-builder-configuracion__encabezado h2 {
  margin-bottom: 8px;
}

.landing-builder-panel {
  min-width: 0;

  &__titulo {
    margin: 0 0 16px;
  }
}

@media (min-width: 768px) {
  .landing-builder-contenido {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
    gap: 32px;
  }

  .landing-builder-panel--vista-previa {
    position: sticky;
    top: 24px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
  }
}

.landing-builder-acciones {
  // Sobrescribe flex-direction: column / align-items: stretch de la utilidad
  // "flex-vertical-centrado" (sisdai-css); sin esto los botones se apilan y
  // se estiran a todo el ancho en vez de quedar chicos uno junto al otro.
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.landing-builder-acciones p {
  margin-top: 0;
  margin-bottom: 0;
}

@media (max-width: 767px) {
  .landing-builder-configuracion {
    padding-top: 24px;
    padding-bottom: 32px;
  }

  .landing-builder-panel + .landing-builder-panel {
    margin-top: 40px;
  }

  .landing-builder-acciones {
    align-items: flex-start;
    flex-direction: column;
  }

  .landing-builder-acciones p {
    margin-left: 0;
  }
}
</style>
