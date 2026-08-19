<script setup>
import { categoriesNamesInSpanish } from '~/utils/consulta';

/**
 * Selector de UNA capa para un indicador de tablero.
 *
 * Equivale al buscador de geo-historias (`CapasBuscador`) en prestaciones —
 * categorías a la izquierda, búsqueda por nombre, miniatura de cada capa — pero
 * con selección única y con la búsqueda combinable con la categoría, en vez de
 * excluyentes.
 */

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue']);

const { data: userData } = useAuth();
const { fetchCategorias, fetchDatasetsPaginados } = useTableroApi();

const TAM_PAGINA = 12;
const DEBOUNCE_MS = 350;

const categorias = ref([]);
const cargandoCategorias = ref(false);
const categoriaSeleccionada = ref(null);

const busqueda = ref('');
const capas = ref([]);
const cargandoCapas = ref(false);
const errorCapas = ref('');
const pagina = ref(1);
const totalCapas = ref(0);

const totalPaginas = computed(() => Math.max(1, Math.ceil(totalCapas.value / TAM_PAGINA)));

function nombreCategoria(cat) {
  return categoriesNamesInSpanish[cat.identifier] ?? cat.gn_description ?? cat.identifier;
}

async function cargarCategorias() {
  cargandoCategorias.value = true;
  try {
    const data = await fetchCategorias();
    const lista = data?.categories ?? data?.results ?? [];
    categorias.value = [...lista].sort((a, b) =>
      nombreCategoria(a).localeCompare(nombreCategoria(b))
    );
  } catch {
    categorias.value = [];
  } finally {
    cargandoCategorias.value = false;
  }
}

async function cargarCapas() {
  cargandoCapas.value = true;
  errorCapas.value = '';
  try {
    const data = await fetchDatasetsPaginados(
      busqueda.value.trim(),
      pagina.value,
      userData.value?.accessToken,
      TAM_PAGINA,
      categoriaSeleccionada.value?.identifier ?? ''
    );
    capas.value = data?.datasets ?? data?.results ?? [];
    totalCapas.value = data?.total ?? data?.count ?? capas.value.length;
  } catch {
    capas.value = [];
    totalCapas.value = 0;
    errorCapas.value = 'No se pudieron cargar las capas. Inténtalo de nuevo.';
  } finally {
    cargandoCapas.value = false;
  }
}

let temporizadorBusqueda = null;

function alEscribir() {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(() => {
    pagina.value = 1;
    cargarCapas();
  }, DEBOUNCE_MS);
}

function elegirCategoria(cat) {
  // Volver a hacer clic en la categoría activa la quita: es el modo "todas".
  categoriaSeleccionada.value =
    categoriaSeleccionada.value?.identifier === cat.identifier ? null : cat;
  pagina.value = 1;
  cargarCapas();
}

function limpiarFiltros() {
  busqueda.value = '';
  categoriaSeleccionada.value = null;
  pagina.value = 1;
  cargarCapas();
}

function irAPagina(n) {
  pagina.value = Math.min(Math.max(1, n), totalPaginas.value);
  cargarCapas();
}

function seleccionar(capa) {
  emit('update:modelValue', capa);
}

function limpiarHtml(s) {
  if (!s) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = s;
  return tmp.textContent || tmp.innerText || '';
}

function estaSeleccionada(capa) {
  return props.modelValue?.pk === capa.pk;
}

function alCambiarVisibilidadPestania() {
  if (document.visibilityState === 'visible') {
    cargarCategorias();
    cargarCapas();
  }
}

onMounted(async () => {
  await cargarCategorias();
  cargarCapas();
  document.addEventListener('visibilitychange', alCambiarVisibilidadPestania);
});

onBeforeUnmount(() => {
  clearTimeout(temporizadorBusqueda);
  document.removeEventListener('visibilitychange', alCambiarVisibilidadPestania);
});
</script>

<template>
  <div class="selector-capa">
    <div class="selector-capa__barra">
      <input
        v-model="busqueda"
        type="search"
        class="selector-capa__input"
        placeholder="Buscar capas por nombre…"
        aria-label="Buscar capas por nombre"
        @input="alEscribir"
      />
      <button
        v-if="busqueda || categoriaSeleccionada"
        type="button"
        class="boton boton-secundario boton-chico"
        @click="limpiarFiltros"
      >
        Limpiar filtros
      </button>
    </div>

    <div class="selector-capa__columnas">
      <div>
        <h4 class="selector-capa__titulo-col">Categorías</h4>
        <div class="selector-capa__caja">
          <p v-if="cargandoCategorias" class="texto-secundario p-1">Cargando…</p>
          <ul v-else-if="categorias.length" class="selector-capa__lista-cat">
            <li v-for="cat in categorias" :key="cat.identifier">
              <button
                type="button"
                class="selector-capa__cat"
                :class="{
                  'selector-capa__cat--activa':
                    categoriaSeleccionada?.identifier === cat.identifier,
                }"
                :aria-pressed="categoriaSeleccionada?.identifier === cat.identifier"
                @click="elegirCategoria(cat)"
              >
                <span class="selector-capa__cat-nombre">{{ nombreCategoria(cat) }}</span>
                <span class="selector-capa__cat-conteo">{{ cat.count ?? 0 }}</span>
              </button>
            </li>
          </ul>
          <p v-else class="texto-secundario p-1">Sin categorías.</p>
        </div>
      </div>

      <div>
        <h4 class="selector-capa__titulo-col">
          Capas
          <span v-if="totalCapas" class="texto-secundario">({{ totalCapas }})</span>
        </h4>
        <div class="selector-capa__caja">
          <p v-if="cargandoCapas" class="texto-secundario p-1">Buscando…</p>
          <p v-else-if="errorCapas" class="selector-capa__error p-1">{{ errorCapas }}</p>
          <p v-else-if="!capas.length" class="texto-secundario p-1">
            Sin resultados con estos filtros.
          </p>
          <ul v-else class="selector-capa__lista">
            <li v-for="capa in capas" :key="capa.pk">
              <button
                type="button"
                class="selector-capa__item"
                :class="{ 'selector-capa__item--activa': estaSeleccionada(capa) }"
                :aria-pressed="estaSeleccionada(capa)"
                @click="seleccionar(capa)"
              >
                <span class="selector-capa__thumb">
                  <img v-if="capa.thumbnail_url" :src="capa.thumbnail_url" :alt="capa.title" />
                  <span v-else class="pictograma-imagen" aria-hidden="true" />
                </span>
                <span class="selector-capa__info">
                  <span class="selector-capa__fila">
                    <strong class="selector-capa__nombre">{{
                      capa.title || capa.alternate
                    }}</strong>
                    <span v-if="estaSeleccionada(capa)" class="etiqueta etiqueta-sel">
                      Seleccionada
                    </span>
                  </span>
                  <span class="selector-capa__desc texto-secundario">
                    {{ limpiarHtml(capa.abstract) || 'Sin descripción.' }}
                  </span>
                  <span class="selector-capa__meta">
                    <span class="etiqueta">{{ capa.subtype }}</span>
                    <span
                      class="etiqueta"
                      :class="capa.is_published ? 'etiqueta-publica' : 'etiqueta-privada'"
                    >
                      {{ capa.is_published ? 'Pública' : 'Privada' }}
                    </span>
                    <span class="texto-secundario">{{ capa.workspace }}</span>
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </div>

        <div v-if="totalPaginas > 1" class="selector-capa__paginacion">
          <button
            type="button"
            class="boton boton-secundario boton-chico"
            :disabled="pagina === 1"
            @click="irAPagina(pagina - 1)"
          >
            Anterior
          </button>
          <span class="texto-secundario">Página {{ pagina }} de {{ totalPaginas }}</span>
          <button
            type="button"
            class="boton boton-secundario boton-chico"
            :disabled="pagina === totalPaginas"
            @click="irAPagina(pagina + 1)"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.selector-capa {
  display: flex;
  flex-direction: column;
  min-width: 0;

  &__barra {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  &__input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--color-neutro-1);
    border-radius: 6px;
  }

  &__columnas {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) 2fr;
    gap: 12px;

    > * {
      min-width: 0;
    }

    @media (max-width: 720px) {
      grid-template-columns: 1fr;
    }
  }

  &__titulo-col {
    margin: 0 0 6px;
    font-size: 0.8rem;
    text-transform: uppercase;
    color: var(--color-neutro-3);
  }

  &__caja {
    border: 1px solid var(--color-neutro-1);
    border-radius: 8px;
    max-height: 34vh;
    overflow-y: auto;
    background-color: var(--fondo);
  }

  &__lista-cat,
  &__lista {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  &__lista {
    padding: 8px;
  }

  &__cat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-left: 3px solid transparent;
    border-bottom: 1px solid var(--color-neutro-1);
    background: none;
    text-align: left;
    font-size: 0.85rem;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background-color: var(--fondo-acento);
    }

    &--activa {
      border-left-color: var(--color-primario-4);
      background-color: var(--fondo-acento);
    }
  }

  &__cat-nombre {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__cat-conteo {
    background-color: var(--color-neutro-3);
    color: #fff;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 6px;
  }

  &__item {
    display: flex;
    gap: 10px;
    width: 100%;
    padding: 8px;
    margin-bottom: 8px;
    border: 2px solid var(--color-neutro-1);
    border-radius: 8px;
    background: none;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s;
    overflow-wrap: anywhere;

    &:hover,
    &:focus-visible {
      border-color: var(--color-primario-4);
      background-color: var(--fondo-acento);
    }

    &--activa {
      border-color: var(--color-primario-4);
      background-color: var(--fondo-acento);
    }
  }

  &__thumb {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    border-radius: 6px;
    overflow: hidden;
    background-color: var(--color-neutro-1);
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    // Sin texto junto al ícono: anula el padding-left que sisdai reserva
    // para separar ícono y texto, que aquí descentraba el pictograma.
    [class*='pictograma-'] {
      padding: 0;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__fila {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }

  &__nombre {
    min-width: 0;
  }

  &__desc {
    font-size: 0.8rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__meta {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 0.75rem;
    flex-wrap: wrap;
  }

  &__paginacion {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 8px;
  }

  &__error {
    color: var(--color-error, #c0392b);
  }
}

.etiqueta {
  background-color: var(--color-secundario-2);
  color: var(--color-primario-4);
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.7rem;
  white-space: nowrap;
}

.etiqueta-publica {
  background-color: #d8f5dc;
  color: #16703c;
}

.etiqueta-privada {
  background-color: #fde2e1;
  color: #c0392b;
}

.etiqueta-sel {
  background-color: var(--color-secundario-2);
  color: var(--color-primario-4);
}
</style>
