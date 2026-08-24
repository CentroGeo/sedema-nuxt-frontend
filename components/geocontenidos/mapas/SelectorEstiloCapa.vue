<script setup>
import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps({
  capa: { type: Object, required: true },
});

const emit = defineEmits(['update:style']);

const config = useRuntimeConfig();
const { gnoxyFetch } = useGnoxyUrl();

const estilos = ref([]);
const cargando = ref(false);
const estiloSeleccionado = ref(props.capa.style || '');

async function cargarEstilos() {
  if (!props.capa.geonode_id) return;
  cargando.value = true;
  try {
    const url = `${config.public.geonodeApi}/datasets/${props.capa.geonode_id}/sldstyles/?t=${Date.now()}`;
    const res = await gnoxyFetch(url);
    if (!res.ok) throw new Error('error');
    const data = await res.json();
    const titulos = data.style_titles || {};

    const lista = [];
    (data.styles || []).forEach((identificador) => {
      const partes = identificador.split(':');
      const nombre = partes.length > 1 ? partes[1] : partes[0];
      if (!lista.some((e) => e.name === nombre)) {
        lista.push({ name: nombre, sld_title: titulos[nombre] || nombre });
      }
    });
    if (data.default_style && !lista.some((e) => e.name === data.default_style)) {
      lista.push({
        name: data.default_style,
        sld_title: titulos[data.default_style] || data.default_style,
      });
    }
    estilos.value = lista;
    if (data.default_style) {
      if (!estiloSeleccionado.value || !lista.some((e) => e.name === estiloSeleccionado.value)) {
        estiloSeleccionado.value = data.default_style;
        const sel = lista.find((e) => e.name === data.default_style);
        emit('update:style', {
          layerId: props.capa.id,
          style: data.default_style,
          styleTitle: sel?.sld_title || data.default_style,
        });
      }
    }
  } catch {
    estilos.value = [];
  } finally {
    cargando.value = false;
  }
}

watch(
  () => props.capa.style,
  (nuevo) => {
    if (nuevo) estiloSeleccionado.value = nuevo;
  }
);

function alCambiar(ev) {
  const name = ev.target.value;
  const sel = estilos.value.find((e) => e.name === name);
  if (!sel) return;
  emit('update:style', {
    layerId: props.capa.id,
    style: name,
    styleTitle: sel.sld_title,
  });
}

const hayEstilos = computed(() => estilos.value.length > 0);

onMounted(cargarEstilos);
</script>

<template>
  <div class="selector-estilo">
    <p v-if="cargando" class="texto-secundario m-0">Cargando estilos…</p>
    <div v-else-if="hayEstilos">
      <label class="texto-secundario">Estilo</label>
      <select v-model="estiloSeleccionado" class="selector-input" @change="alCambiar">
        <option v-for="e in estilos" :key="e.name" :value="e.name">{{ e.sld_title }}</option>
      </select>
    </div>
    <p v-else class="texto-secundario m-0">Sin estilos disponibles.</p>
  </div>
</template>

<style lang="scss" scoped>
.selector-estilo {
  margin-top: 6px;
}

.selector-input {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--color-neutro-1);
  border-radius: 4px;
  font-size: 0.8rem;
}
</style>
