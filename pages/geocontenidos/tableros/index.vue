<script setup>
definePageMeta({ middleware: 'auth' });

const { status, signIn, data: userData } = useAuth();
const { fetchSitios, eliminarSitio, togglePublic } = useTableroApi();

const estaLogueado = computed(() => status.value === 'authenticated');
const noAutenticado = computed(() => status.value === 'unauthenticated');

function iniciarSesion() {
  signIn('keycloak', { callbackUrl: '/geocontenidos/tableros' });
}

const sitios = ref([]);
const estaCargando = ref(false);

async function cargarSitios() {
  estaCargando.value = true;
  try {
    const data = await fetchSitios();
    sitios.value = data.results || [];
  } catch (e) {
    console.error('Error al cargar sitios:', e);
  } finally {
    estaCargando.value = false;
  }
}

// --- Modal de confirmación de eliminación ---
const modalEliminar = ref(null);
const sitioToDelete = ref(null);
const isBeingDeleted = ref(false);
const wasDeletionSuccesful = ref(null);

function abrirModalEliminar(sitio) {
  sitioToDelete.value = sitio;
  wasDeletionSuccesful.value = null;
  modalEliminar.value?.abrir();
}

function cancelarEliminar() {
  sitioToDelete.value = null;
  modalEliminar.value?.cerrar();
}

async function confirmarEliminar() {
  if (!sitioToDelete.value) return;
  isBeingDeleted.value = true;
  try {
    const ok = await eliminarSitio(sitioToDelete.value.id, userData.value?.accessToken);
    if (ok) {
      wasDeletionSuccesful.value = true;
      sitios.value = sitios.value.filter((s) => s.id !== sitioToDelete.value.id);
      setTimeout(() => {
        modalEliminar.value?.cerrar();
      }, 1200);
    } else {
      wasDeletionSuccesful.value = false;
    }
  } catch (e) {
    console.error('Error al eliminar sitio:', e);
    wasDeletionSuccesful.value = false;
  } finally {
    isBeingDeleted.value = false;
  }
}

async function togglearPublico(sitio) {
  try {
    const data = await togglePublic(sitio.id, userData.value?.accessToken);
    if (data && typeof data.is_public === 'boolean') {
      sitio.is_public = data.is_public;
    }
  } catch (e) {
    console.error('Error al cambiar visibilidad:', e);
    alert('No se pudo cambiar la visibilidad del tablero.');
  }
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

if (estaLogueado.value) cargarSitios();
watch(estaLogueado, (v) => {
  if (v) cargarSitios();
});
</script>

<template>
  <div>
    <!-- Sesión requerida -->
    <div v-if="noAutenticado" class="sesion-requerida">
      <span class="pictograma-privado sesion-requerida__icono" aria-hidden="true" />
      <h2 class="sesion-requerida__titulo">Acceso restringido</h2>
      <p class="sesion-requerida__desc">
        Para ver y gestionar tus tableros necesitas iniciar sesión con tu cuenta institucional.
      </p>
      <button type="button" class="boton boton-primario" @click="iniciarSesion">
        Iniciar sesión
      </button>
    </div>

    <template v-else>
      <div>
        <h2>Bienvenido a Tableros</h2>

        <p
          class="fondo-color-acento borde-redondeado-8 borde-l borde-grosor-4 p-4"
          style="border-color: var(--color-primario-4)"
        >
          Los Tableros de datos son sitios interactivos donde se presentan indicadores temáticos con
          mapas, gráficas y tarjetas de resumen, organizados en grupos y subgrupos.
        </p>

        <div v-if="estaLogueado" class="flex brecha-2 m-b-2">
          <NuxtLink to="/geocontenidos/tableros/nuevo" class="boton boton-secundario">
            <span class="pictograma-agregar m-r-1" />
            Crear Tablero
          </NuxtLink>
          <NuxtLink to="/geocontenidos/importar-datos" class="boton boton-primario">
            <span class="pictograma-archivo-subir m-r-1" />
            Importar datos
          </NuxtLink>
        </div>

        <p v-if="estaLogueado" class="formulario-ayuda m-b-4">
          <strong>Importar datos</strong> publica un archivo tuyo (CSV, XLSX, XLS o JSON) como capa
          y genera un tablero nuevo con sus indicadores. Usa <strong>Crear Tablero</strong> si
          prefieres partir de capas que ya están en el catálogo.
        </p>
      </div>

      <GeocontenidosLoader v-if="estaCargando" />

      <div v-else-if="sitios.length > 0" class="grid reticula-12">
        <div v-for="sitio in sitios" :key="sitio.id" class="columna-8 columna-4-esc">
          <div class="tarjeta">
            <div class="tarjeta-cuerpo">
              <div
                class="fila-etiquetas-superiores flex flex-contenido-fin flex-alineado-centrado m-b-1"
              >
                <span
                  class="etiqueta-compacta etiqueta-estado"
                  :class="sitio.is_public ? 'estado-publico' : 'estado-privado'"
                >
                  <span
                    :class="sitio.is_public ? 'pictograma-ojo-ver' : 'pictograma-privado'"
                    class="m-r-1"
                    aria-hidden="true"
                  />
                  {{ sitio.is_public ? 'Público' : 'Privado' }}
                </span>
              </div>

              <p class="tarjeta-titulo m-0 m-b-1">{{ sitio.name }}</p>

              <p v-if="sitio.subtitle" class="tarjeta-etiqueta m-0 m-b-1">{{ sitio.subtitle }}</p>

              <p class="tarjeta-etiqueta m-0 m-b-1 flex flex-alineado-centrado">
                <span class="pictograma-persona m-r-1" aria-hidden="true" />
                <span>{{ sitio.owner?.username || sitio.owner || 'Anónimo' }}</span>
              </p>

              <p class="tarjeta-etiqueta m-0">Creado: {{ formatearFecha(sitio.created) }}</p>
            </div>

            <div class="tarjeta-pie flex">
              <NuxtLink
                class="boton boton-chico boton-secundario"
                :to="`/tableros/${sitio.id}`"
                target="_blank"
                title="Previsualizar tablero"
              >
                <span class="pictograma-ojo-ver m-r-1" />
                Previsualizar
              </NuxtLink>

              <NuxtLink
                v-if="sitio.is_public && sitio.url"
                class="boton boton-chico boton-secundario"
                :to="`/tableros/${sitio.url}`"
                target="_blank"
                title="Ver URL pública"
              >
                <span class="pictograma-compartir m-r-1" />
                /{{ sitio.url }}
              </NuxtLink>

              <template v-if="sitio.is_owner">
                <button
                  class="boton boton-chico"
                  :class="sitio.is_public ? 'boton-secundario' : 'boton-primario'"
                  :title="sitio.is_public ? 'Hacer privado' : 'Hacer público'"
                  @click="togglearPublico(sitio)"
                >
                  <span
                    :class="sitio.is_public ? 'pictograma-ojo-ver' : 'pictograma-privado'"
                    class="m-r-1"
                    aria-hidden="true"
                  />
                  {{ sitio.is_public ? 'Hacer Privado' : 'Hacer Público' }}
                </button>

                <NuxtLink
                  class="boton boton-chico boton-secundario"
                  :to="`/geocontenidos/tableros/${sitio.id}`"
                >
                  <span class="pictograma-editar m-r-1" />
                  Editar
                </NuxtLink>

                <button class="boton boton-chico boton-primario" @click="abrirModalEliminar(sitio)">
                  <span class="pictograma-eliminar m-r-1" />
                  Eliminar
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="texto-centrado">
        <p class="h3">No hay tableros disponibles.</p>
      </div>

      <ClientOnly>
        <GeocontenidosSisdaiModal ref="modalEliminar" :permitir-cerrar="!isBeingDeleted">
          <template #encabezado>
            <h2 class="m-t-0">Eliminar tablero</h2>
          </template>

          <p
            v-if="wasDeletionSuccesful === null || isBeingDeleted"
            class="alerta-advertencia-modal"
          >
            El tablero <strong style="font-weight: bold">{{ sitioToDelete?.name }}</strong> será
            eliminado permanentemente del servidor y no será posible recuperarlo.
          </p>

          <p v-else-if="wasDeletionSuccesful === true" class="texto-color-exito">
            <span class="pictograma-aprobado m-r-1" />
            El tablero fue eliminado correctamente.
          </p>

          <p v-else class="texto-color-error">No se pudo eliminar el tablero. Intenta de nuevo.</p>

          <template #pie>
            <div class="flex brecha-2 flex-contenido-final">
              <button
                class="boton boton-secundario"
                :disabled="isBeingDeleted"
                @click="cancelarEliminar"
              >
                Cancelar
              </button>
              <button
                v-if="wasDeletionSuccesful === null"
                class="boton boton-primario"
                :disabled="isBeingDeleted"
                @click="confirmarEliminar"
              >
                <span v-if="isBeingDeleted" class="cargador cargador-chico m-r-1" />
                Eliminar
              </button>
            </div>
          </template>
        </GeocontenidosSisdaiModal>
      </ClientOnly> </template
    ><!-- /v-else autenticado -->
  </div>
</template>

<style lang="scss" scoped>
.alerta-advertencia-modal {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-neutro-5);
  margin-bottom: 24px;
}
.sesion-requerida {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 2rem;
  text-align: center;

  &__icono {
    font-size: 3rem;
    color: var(--color-secundario-7, #876670);
    opacity: 0.6;
  }

  &__titulo {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-primario-4, #991f47);
    margin: 0;
  }

  &__desc {
    font-size: 1rem;
    color: var(--color-texto-secundario, #555);
    max-width: 420px;
    margin: 0;
  }
}

.modulo-geocontenidos .contenedor {
  .grid.reticula-12 {
    grid-template-columns: repeat(12, 1fr);
  }
}

.tarjeta {
  height: 100%;
  display: flex;
  flex-direction: column;

  &-cuerpo {
    padding: 12px 16px;
    background-color: var(--color-primario-4);
    color: var(--texto-inverso);

    .tarjeta-titulo {
      color: var(--texto-inverso);
      font-size: 1.1rem;
      line-height: 1.25;
      font-weight: 700;
    }

    .tarjeta-etiqueta {
      color: var(--texto-inverso);
      font-size: 0.85rem;
      line-height: 1.3;
    }
  }
  &-pie {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding: 16px;
    gap: 0.5rem;

    button,
    a {
      display: block;
      width: 100%;
      text-align: center;
    }
  }
}

.fila-etiquetas-superiores {
  min-height: 24px;
}

.etiqueta-compacta {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: max-content;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  border-radius: 12px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.estado-publico {
  background-color: var(--color-secundario-1);
  color: var(--color-primario-4);
  border-color: var(--color-primario-4);
}

.estado-privado {
  background-color: var(--color-neutro-2);
  color: var(--color-neutro-5);
  border-color: var(--color-neutro-4);
}
</style>
