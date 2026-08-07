<script setup>
import SisdaiCampoBase from '@centrogeomx/sisdai-componentes/src/componentes/campo-base/SisdaiCampoBase.vue';
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import SisdaiSelector from '@centrogeomx/sisdai-componentes/src/componentes/selector/SisdaiSelector.vue';

const emit = defineEmits(['creado']);

const mapasStore = useMapasStore();
const { capasNoPublicas, puedeSerPublico } = useMapaPublicable();
const modal = ref(null);
const guardando = ref(false);
const error = ref('');

const form = reactive({
  name: '',
  base_layer: 'osm',
  map_type: 'regular',
  is_public: true,
});

function abrir() {
  form.name = '';
  form.base_layer = 'osm';
  form.map_type = 'regular';
  form.is_public = true;
  error.value = '';
  modal.value?.abrirModal();
  if (!puedeSerPublico.value) form.is_public = false;
}

// Si el mapa deja de poder ser público (capas sin publicar), forzar privado.
watch(puedeSerPublico, (ok) => {
  if (!ok) form.is_public = false;
});

function cerrar() {
  modal.value?.cerrarModal();
}

async function guardar() {
  if (!form.name.trim()) {
    error.value = 'El nombre es obligatorio.';
    return;
  }
  if (form.is_public && !puedeSerPublico.value) {
    error.value = 'El mapa no puede ser público mientras tenga capas no publicadas en el catálogo.';
    return;
  }
  guardando.value = true;
  error.value = '';
  const data = await mapasStore.crearMapa({
    name: form.name.trim(),
    base_layer: form.base_layer,
    map_type: form.map_type,
    is_public: Boolean(form.is_public),
  });
  guardando.value = false;
  if (!data) {
    error.value = 'No se pudo crear el mapa. Verifica tu sesión.';
    return;
  }
  emit('creado', data);
  cerrar();
}

defineExpose({ abrir, cerrar });
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modal">
      <template #encabezado>
        <h1 class="m-0">Crear mapa</h1>
      </template>

      <template #cuerpo>
        <SisdaiCampoBase
          v-model="form.name"
          etiqueta="Nombre*"
          ejemplo="Mi mapa"
          tipo="text"
          :es_etiqueta_visible="true"
        />

        <div class="m-t-2">
          <SisdaiSelector v-model="form.map_type" etiqueta="Tipo de mapa*">
            <option value="regular">Regular — capas apiladas</option>
            <option value="swipe">Swipe — comparativo deslizante</option>
            <option value="dual">Dual — dos mapas sincronizados</option>
          </SisdaiSelector>
        </div>

        <div class="m-t-2">
          <SisdaiSelector v-model="form.base_layer" etiqueta="Capa base">
            <option value="osm">OpenStreetMap</option>
            <option value="carto">Carto Light</option>
            <option value="carto_dark">Carto Dark</option>
            <option value="satellite">Satélite</option>
          </SisdaiSelector>
        </div>

        <div class="m-t-2">
          <label class="campo-toggle">
            <input v-model="form.is_public" type="checkbox" :disabled="!puedeSerPublico" />
            <span class="campo-etiqueta">
              {{ form.is_public ? 'Mapa público' : 'Mapa privado' }}
            </span>
          </label>
          <p class="texto-secundario m-0">
            {{
              form.is_public
                ? 'Cualquier persona con el enlace puede ver el mapa.'
                : 'Sólo tú puedes ver el mapa.'
            }}
          </p>
          <p v-if="!puedeSerPublico" class="texto-error m-t-1 m-b-0">
            Este mapa tiene {{ capasNoPublicas.length }}
            {{ capasNoPublicas.length === 1 ? 'capa no publicada' : 'capas no publicadas' }}
            en el catálogo. Para hacerlo público, todas sus capas deben estar publicadas.
          </p>
        </div>

        <p v-if="error" class="m-t-2 texto-error">{{ error }}</p>
      </template>

      <template #pie>
        <div class="flex flex-contenido-final">
          <button class="boton-secundario" type="button" @click="cerrar">Cancelar</button>
          <button class="boton-primario" type="button" :disabled="guardando" @click="guardar">
            {{ guardando ? 'Creando…' : 'Crear' }}
          </button>
        </div>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>

<style lang="scss" scoped>
.campo-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.campo-etiqueta {
  font-weight: 600;
}

.texto-error {
  color: var(--texto-error);
}

.flex {
  gap: 8px;
}
</style>
