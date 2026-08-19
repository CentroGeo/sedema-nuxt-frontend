<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const store = useCategoriasStore();

onMounted(() => {
  store.cargarConjuntos();
});

const estados = ['Publicada', 'Borrador'];

// --- Navegación interna: general / detalle de conjunto ---
const vista = ref('general');
const conjuntoSeleccionadoId = ref(null);
// Se deriva del store (no se guarda una copia) para que la vista de detalle
// se mantenga al día cada vez que el store recarga tras una acción CRUD.
const conjuntoSeleccionado = computed(
  () => store.conjuntos.find((conjunto) => conjunto.id === conjuntoSeleccionadoId.value) ?? null
);

function verDetalleConjunto(conjunto) {
  conjuntoSeleccionadoId.value = conjunto.id;
  vista.value = 'detalle';
}

function volverAVistaGeneral() {
  vista.value = 'general';
  conjuntoSeleccionadoId.value = null;
}

function contarPublicadas(conjunto) {
  return store.categoriasPublicadas(conjunto).length;
}

// --- Modal Nuevo / Editar conjunto ---
const modalConjunto = ref(null);
const modoModalConjunto = ref('crear');
const formularioConjunto = reactive({ id: null, nombre: '', descripcion: '' });

function abrirModalNuevoConjunto() {
  modoModalConjunto.value = 'crear';
  formularioConjunto.id = null;
  formularioConjunto.nombre = '';
  formularioConjunto.descripcion = '';
  modalConjunto.value?.abrirModal();
}

function abrirModalEditarConjunto(conjunto) {
  modoModalConjunto.value = 'editar';
  formularioConjunto.id = conjunto.id;
  formularioConjunto.nombre = conjunto.nombre;
  formularioConjunto.descripcion = conjunto.descripcion;
  modalConjunto.value?.abrirModal();
}

async function guardarConjunto() {
  if (!formularioConjunto.nombre.trim()) return;

  if (modoModalConjunto.value === 'crear') {
    await store.crearConjunto({
      nombre: formularioConjunto.nombre,
      descripcion: formularioConjunto.descripcion,
    });
  } else {
    await store.actualizarConjunto(formularioConjunto.id, {
      nombre: formularioConjunto.nombre,
      descripcion: formularioConjunto.descripcion,
    });
  }
  if (!store.error) modalConjunto.value?.cerrarModal();
}

// --- Modal Eliminar conjunto ---
const modalEliminarConjunto = ref(null);
const conjuntoAEliminar = ref(null);

function abrirModalEliminarConjunto(conjunto) {
  conjuntoAEliminar.value = conjunto;
  modalEliminarConjunto.value?.abrirModal();
}

async function confirmarEliminarConjunto() {
  const id = conjuntoAEliminar.value?.id;
  const eliminado = await store.eliminarConjunto(id);
  if (eliminado && vista.value === 'detalle' && conjuntoSeleccionadoId.value === id) {
    volverAVistaGeneral();
  }
  if (eliminado) modalEliminarConjunto.value?.cerrarModal();
}

// --- Modal Nueva / Editar categoría (dentro del conjunto en detalle) ---
const modalCategoria = ref(null);
const modoModalCategoria = ref('crear');
const formularioCategoria = reactive({
  id: null,
  nombre: '',
  tipo: '',
  estado: 'Borrador',
});

function abrirModalNuevaCategoria() {
  modoModalCategoria.value = 'crear';
  formularioCategoria.id = null;
  formularioCategoria.nombre = '';
  formularioCategoria.tipo = '';
  formularioCategoria.estado = 'Borrador';
  modalCategoria.value?.abrirModal();
}

function abrirModalEditarCategoria(categoria) {
  modoModalCategoria.value = 'editar';
  formularioCategoria.id = categoria.id;
  formularioCategoria.nombre = categoria.nombre;
  formularioCategoria.tipo = categoria.tipo;
  formularioCategoria.estado = categoria.estado;
  modalCategoria.value?.abrirModal();
}

async function guardarCategoria() {
  if (!formularioCategoria.nombre.trim() || !formularioCategoria.tipo.trim()) return;

  if (modoModalCategoria.value === 'crear') {
    await store.crearCategoria(conjuntoSeleccionado.value.id, {
      nombre: formularioCategoria.nombre,
      tipo: formularioCategoria.tipo,
      estado: formularioCategoria.estado,
    });
  } else {
    await store.actualizarCategoria(conjuntoSeleccionado.value.id, formularioCategoria.id, {
      nombre: formularioCategoria.nombre,
      tipo: formularioCategoria.tipo,
      estado: formularioCategoria.estado,
    });
  }
  if (!store.error) modalCategoria.value?.cerrarModal();
}

// --- Modal Eliminar categoría ---
const modalEliminarCategoria = ref(null);
const categoriaAEliminar = ref(null);

function abrirModalEliminarCategoria(categoria) {
  categoriaAEliminar.value = categoria;
  modalEliminarCategoria.value?.abrirModal();
}

async function confirmarEliminarCategoria() {
  await store.eliminarCategoria(conjuntoSeleccionado.value.id, categoriaAEliminar.value?.id);
  if (!store.error) modalEliminarCategoria.value?.cerrarModal();
}
</script>

<template>
  <div class="administracion-categorias">
    <p
      v-if="store.error"
      class="p-3 borde-redondeado-8 fondo-color-alerta texto-color-alerta m-b-4"
      role="alert"
    >
      {{ store.error }}
    </p>
    <p v-if="store.cargando" class="texto-color-secundario m-b-4">Cargando…</p>

    <!-- ============ VISTA GENERAL: CONJUNTOS ============ -->
    <section v-if="vista === 'general'" aria-label="Conjuntos de categorías">
      <p class="texto-color-secundario m-b-4">
        Un conjunto agrupa varias categorías (ej. categorias SIGIC). Solo el conjunto marcado como
        <strong>activo en esta instancia</strong> se ofrece en el catálogo y en el formulario de
        llenado de metadatos, y únicamente con sus categorías en estado <strong>Publicada</strong>.
        Las categorías en <strong>Borrador</strong> permanecen ocultas hasta publicarse.
      </p>

      <div
        v-if="store.conjuntoActivo"
        class="tarjeta administracion-conjunto-activo-aviso m-b-4"
        role="status"
      >
        <div class="tarjeta-cuerpo">
          <span>
            El catálogo y el llenado de metadatos usan actualmente
            <strong>{{ store.categoriasVisiblesInstancia.length }}</strong>
            categoría(s) publicada(s) del conjunto
            <strong>{{ store.conjuntoActivo.nombre }}</strong
            >.
          </span>
        </div>
      </div>

      <div class="flex flex-contenido-separado m-b-3">
        <p class="m-0">
          <strong>{{ store.conjuntos.length }}</strong> conjunto(s) de categorías configurados
        </p>
        <button type="button" class="boton-primario" @click="abrirModalNuevoConjunto">
          <span class="pictograma-agregar" aria-hidden="true" /> Nuevo conjunto
        </button>
      </div>

      <div class="flex">
        <div v-for="conjunto in store.conjuntos" :key="conjunto.id" class="columna-4">
          <div class="tarjeta administracion-conjunto-tarjeta">
            <div class="tarjeta-cuerpo">
              <div class="flex flex-contenido-separado">
                <strong>{{ conjunto.nombre }}</strong>
                <span
                  v-if="conjunto.id === store.idConjuntoActivo"
                  class="p-1 borde-redondeado-8 texto-color-confirmacion fondo-color-confirmacion borde borde-color-confirmacion"
                >
                  Activo en esta instancia
                </span>
              </div>
              <p class="texto-color-secundario m-t-2 m-b-2">{{ conjunto.descripcion }}</p>
              <p class="texto-color-secundario m-0">
                {{ conjunto.categorias.length }} categoría(s) ·
                {{ contarPublicadas(conjunto) }} publicada(s)
              </p>

              <div class="flex m-t-3" style="gap: 8px; flex-wrap: wrap">
                <button
                  type="button"
                  class="boton-secundario boton-chico"
                  @click="verDetalleConjunto(conjunto)"
                >
                  Ver categorías
                </button>
                <button
                  v-if="conjunto.id !== store.idConjuntoActivo"
                  type="button"
                  class="boton-secundario boton-chico"
                  @click="store.activarConjunto(conjunto.id)"
                >
                  Usar en esta instancia
                </button>
                <button
                  type="button"
                  class="boton-pictograma boton-secundario"
                  aria-label="Editar conjunto"
                  @click="abrirModalEditarConjunto(conjunto)"
                >
                  <span class="pictograma-editar" aria-hidden="true" />
                </button>
                <button
                  v-globo-informacion="
                    conjunto.protegido
                      ? 'Este conjunto es parte del esquema por defecto y no puede eliminarse'
                      : conjunto.id === store.idConjuntoActivo
                        ? 'No puedes eliminar el conjunto activo en esta instancia'
                        : 'Eliminar conjunto'
                  "
                  type="button"
                  class="boton-pictograma boton-secundario"
                  aria-label="Eliminar conjunto"
                  :disabled="conjunto.protegido || conjunto.id === store.idConjuntoActivo"
                  @click="abrirModalEliminarConjunto(conjunto)"
                >
                  <span class="pictograma-eliminar" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ VISTA DETALLE: CATEGORÍAS DE UN CONJUNTO ============ -->
    <section v-else aria-label="Categorías del conjunto">
      <button type="button" class="boton-secundario boton-chico m-b-3" @click="volverAVistaGeneral">
        <span class="pictograma-flecha-izquierda" aria-hidden="true" /> Volver a conjuntos
      </button>

      <div class="flex flex-contenido-separado m-b-2">
        <div>
          <h2 class="m-0">{{ conjuntoSeleccionado.nombre }}</h2>
          <p class="texto-color-secundario m-0">{{ conjuntoSeleccionado.descripcion }}</p>
        </div>
        <div class="flex administracion-fila-centrada" style="gap: 12px">
          <span
            v-if="conjuntoSeleccionado.id === store.idConjuntoActivo"
            class="p-1 borde-redondeado-8 texto-color-confirmacion fondo-color-confirmacion borde borde-color-confirmacion"
          >
            Activo en esta instancia
          </span>
          <button
            v-else
            type="button"
            class="boton-secundario boton-chico"
            @click="store.activarConjunto(conjuntoSeleccionado.id)"
          >
            Usar en esta instancia
          </button>
        </div>
      </div>

      <p class="texto-color-secundario m-b-4">
        Solo las categorías en estado <strong>Publicada</strong> aparecen en el catálogo y en el
        formulario de metadatos cuando este conjunto está activo.
      </p>

      <div class="flex flex-contenido-separado m-b-3">
        <p class="m-0">
          <strong>{{ conjuntoSeleccionado.categorias.length }}</strong> categorías configuradas
        </p>
        <button type="button" class="boton-primario" @click="abrirModalNuevaCategoria">
          <span class="pictograma-agregar" aria-hidden="true" /> Nueva categoría
        </button>
      </div>

      <div class="contenedor-tabla">
        <table class="tabla-expandida">
          <caption>
            Categorías del conjunto «{{
              conjuntoSeleccionado.nombre
            }}»
          </caption>
          <thead>
            <tr>
              <th scope="col">Categoría</th>
              <th scope="col">Tipo</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="categoria in conjuntoSeleccionado.categorias" :key="categoria.id">
              <td>{{ categoria.nombre }}</td>
              <td>{{ categoria.tipo }}</td>
              <td>
                <span class="p-1 borde-redondeado-8" :class="store.claseEstado(categoria.estado)">
                  {{ categoria.estado }}
                </span>
              </td>
              <td>
                <div class="flex-width flex" style="gap: 8px">
                  <button
                    class="boton-secundario boton-chico"
                    type="button"
                    @click="abrirModalEditarCategoria(categoria)"
                  >
                    <span class="pictograma-editar" aria-hidden="true" /> Editar
                  </button>
                  <button
                    class="boton-pictograma boton-secundario"
                    aria-label="Eliminar categoría"
                    type="button"
                    @click="abrirModalEliminarCategoria(categoria)"
                  >
                    <span class="pictograma-eliminar" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!conjuntoSeleccionado.categorias.length">
              <td colspan="4" class="texto-color-secundario">
                Este conjunto todavía no tiene categorías.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ClientOnly>
      <SisdaiModal ref="modalConjunto">
        <template #encabezado>
          <h2>{{ modoModalConjunto === 'crear' ? 'Nuevo conjunto' : 'Editar conjunto' }}</h2>
        </template>
        <template #cuerpo>
          <label for="conjunto-nombre">Nombre</label>
          <input
            id="conjunto-nombre"
            v-model="formularioConjunto.nombre"
            type="text"
            class="m-b-2"
          />

          <label for="conjunto-descripcion">Descripción</label>
          <textarea
            id="conjunto-descripcion"
            v-model="formularioConjunto.descripcion"
            rows="3"
            class="m-b-2"
          />
        </template>
        <template #pie>
          <button
            class="boton-secundario boton-chico"
            type="button"
            @click="modalConjunto.cerrarModal()"
          >
            Cancelar
          </button>
          <button class="boton-primario boton-chico" type="button" @click="guardarConjunto">
            Guardar
          </button>
        </template>
      </SisdaiModal>

      <SisdaiModal ref="modalEliminarConjunto">
        <template #encabezado>
          <h2>Eliminar conjunto</h2>
        </template>
        <template #cuerpo>
          <p>
            ¿Deseas eliminar el conjunto <strong>{{ conjuntoAEliminar?.nombre }}</strong
            >? Se eliminarán también sus categorías. Esta acción no se puede deshacer.
          </p>
        </template>
        <template #pie>
          <button
            class="boton-secundario boton-chico"
            type="button"
            @click="modalEliminarConjunto.cerrarModal()"
          >
            Cancelar
          </button>
          <button
            class="boton-primario boton-chico"
            type="button"
            @click="confirmarEliminarConjunto"
          >
            Eliminar
          </button>
        </template>
      </SisdaiModal>

      <SisdaiModal ref="modalCategoria">
        <template #encabezado>
          <h2>{{ modoModalCategoria === 'crear' ? 'Nueva categoría' : 'Editar categoría' }}</h2>
        </template>
        <template #cuerpo>
          <label for="categoria-nombre">Nombre</label>
          <input
            id="categoria-nombre"
            v-model="formularioCategoria.nombre"
            type="text"
            class="m-b-2"
          />

          <label for="categoria-tipo">Tipo</label>
          <input id="categoria-tipo" v-model="formularioCategoria.tipo" type="text" class="m-b-2" />

          <label for="categoria-estado">Estado</label>
          <select id="categoria-estado" v-model="formularioCategoria.estado">
            <option v-for="estado in estados" :key="estado" :value="estado">{{ estado }}</option>
          </select>
        </template>
        <template #pie>
          <button
            class="boton-secundario boton-chico"
            type="button"
            @click="modalCategoria.cerrarModal()"
          >
            Cancelar
          </button>
          <button class="boton-primario boton-chico" type="button" @click="guardarCategoria">
            Guardar
          </button>
        </template>
      </SisdaiModal>

      <SisdaiModal ref="modalEliminarCategoria">
        <template #encabezado>
          <h2>Eliminar categoría</h2>
        </template>
        <template #cuerpo>
          <p>
            ¿Deseas eliminar la categoría <strong>{{ categoriaAEliminar?.nombre }}</strong
            >? Esta acción no se puede deshacer.
          </p>
        </template>
        <template #pie>
          <button
            class="boton-secundario boton-chico"
            type="button"
            @click="modalEliminarCategoria.cerrarModal()"
          >
            Cancelar
          </button>
          <button
            class="boton-primario boton-chico"
            type="button"
            @click="confirmarEliminarCategoria"
          >
            Eliminar
          </button>
        </template>
      </SisdaiModal>
    </ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
.administracion-conjunto-tarjeta {
  height: 100%;
}

.administracion-conjunto-activo-aviso {
  border-left: 4px solid var(--color-confirmacion-2, #2e7d32);
}

.administracion-fila-centrada {
  align-items: center;
}

.contenedor-tabla {
  width: 100%;
  overflow-x: auto;

  table {
    width: 100%;
  }
}
</style>
