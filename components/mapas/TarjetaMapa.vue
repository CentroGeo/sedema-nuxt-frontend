<script setup>
const props = defineProps({
  mapa: {
    type: Object,
    required: true,
  },
  seleccionado: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['seleccionar']);

const config = useRuntimeConfig();
const { rutaApp } = useUrlAbsoluta();
const { data } = useAuth();
const storeCatalogo = useCatalogoStore();

const estaLogueado = computed(() => !!data.value);
const usuarioActual = computed(() => data.value?.user?.email);

const esSuperusuaria = computed(() => storeCatalogo.userInfo?.is_superuser || false);

const esDueno = computed(() => {
  if (!estaLogueado.value) return false;
  const owner = props.mapa.owner;
  return (
    owner?.username === usuarioActual.value ||
    owner?.username === storeCatalogo.userInfo?.username ||
    owner?.pk === storeCatalogo.userInfo?.pk
  );
});

const mostrarConfiguracion = computed(() => esSuperusuaria.value || esDueno.value);

onMounted(async () => {
  if (estaLogueado.value && !storeCatalogo.userInfo?.pk) {
    await storeCatalogo.getUserInfo();
  }
});

const tipoEtiqueta = {
  regular: 'Mapa simple',
  swipe: 'Comparativo',
  dual: 'Dual',
};

const placeholderPreview = computed(() => `${config.app.baseURL}img/icono_sigic.png`);

// Si la preview del backend no carga (aún no generada, borrada o sin permiso),
// el navegador dibuja el texto del alt dentro del recuadro y se encima con las
// etiquetas absolutas. Se cae al placeholder en vez de dejar el hueco.
const previewFallo = ref(false);
const previewSrc = computed(() =>
  props.mapa.preview && !previewFallo.value ? props.mapa.preview : placeholderPreview.value
);

function alFallarPreview() {
  previewFallo.value = true;
}

function abrirMapa() {
  navigateTo(`/geocontenidos/mapas/${props.mapa.id}`);
}

function visualizarMapa() {
  // window.open no pasa por el router, así que hay que incluir el base URL.
  window.open(rutaApp(`/geocontenidos/mapas/${props.mapa.id}/visualizar`), '_blank');
}
</script>

<template>
  <div class="tarjeta columna-5 tarjeta-mapa">
    <div class="tarjeta-cuerpo">
      <div class="preview-contenedor">
        <img
          :src="previewSrc"
          :alt="`Vista previa de ${mapa.name}`"
          class="preview"
          @error="alFallarPreview"
        />
        <span class="borde-redondeado-16 p-1 etiqueta-tipo">
          {{ tipoEtiqueta[mapa.map_type] || mapa.map_type }}
        </span>
        <span v-if="mapa.is_public === false" class="borde-redondeado-16 p-1 etiqueta-privado">
          <i class="fa-solid fa-lock" aria-hidden="true"></i> Privado
        </span>
      </div>

      <div class="tarjeta-titulo flex flex-contenido-separado">
        <p class="m-0" style="font-weight: bold">{{ mapa.name }}</p>
        <!-- Solo quien puede configurar el mapa (dueño/admin) puede seleccionarlo para borrar. -->
        <div v-if="mostrarConfiguracion" class="seleccion-mapa">
          <input
            :id="`seleccionar-mapa-${mapa.id}`"
            type="checkbox"
            :checked="seleccionado"
            :aria-label="`Seleccionar ${mapa.name}`"
            @change="emit('seleccionar', $event.target.checked)"
          />
          <label :for="`seleccionar-mapa-${mapa.id}`">Seleccionar</label>
        </div>
      </div>

      <div class="meta flex">
        <span class="pictograma-persona" aria-hidden="true" />
        <span>{{ mapa.owner?.username || 'Anónimo' }}</span>
      </div>

      <UiNumeroElementos :numero="mapa.layers_count ?? 0" :etiqueta="'Capas'" />

      <button
        v-if="mostrarConfiguracion"
        class="boton-primario flex flex-contenido-centrado"
        style="width: 100%; margin: 8px"
        @click="abrirMapa"
      >
        Abrir configuración
      </button>
      <button
        class="boton-secundario flex flex-contenido-centrado"
        style="width: 100%; margin: 8px"
        @click="visualizarMapa"
      >
        <i
          class="fa-solid fa-arrow-up-right-from-square"
          aria-hidden="true"
          style="margin-right: 6px"
        ></i>
        Visualizar mapa
      </button>
    </div>
    <div class="tarjeta-pie columna-16"></div>
  </div>
</template>

<style lang="scss" scoped>
.tarjeta-mapa {
  display: flex;
  flex-direction: column;
}

.preview-contenedor {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 8px;
  background-color: var(--color-neutro-1);
}

.preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.etiqueta-tipo {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  max-width: calc(100% - 16px);
  background-color: var(--color-secundario-2);
  color: var(--color-primario-4);
  border: solid 1px var(--color-primario-4);
  font-size: 0.85rem;
}

.etiqueta-privado {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  // Sobre imagen arbitraria: overlay neutro translúcido con tokens sisdai.
  background-color: var(--opacidad-fuerte);
  color: var(--texto-inverso);
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.seleccion-mapa {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}

.meta {
  gap: 8px;
  align-items: center;
  color: var(--campo-etiqueta-color);
  font-size: 0.9rem;
}

.flex {
  gap: 8px;
}
</style>
