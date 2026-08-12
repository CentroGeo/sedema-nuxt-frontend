<script setup>
const props = defineProps({
  valoresIniciales: {
    type: Object,
    default: () => ({}),
  },
  guardando: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  permitirConsultaCapas: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['guardar', 'cancelar']);

const formulario = reactive({
  name: '',
  url: '',
  attribution: '',
  wms_or_tile: 'wms',
  wms_layers: '',
  wms_version: '',
  at_start: false,
});

const consultandoCapas = ref(false);
const errorConsulta = ref('');
const capasDisponibles = ref([]);

function limpiarConsulta() {
  errorConsulta.value = '';
  capasDisponibles.value = [];
  formulario.wms_version = '';
}

function cargarValores(valores = {}) {
  Object.assign(formulario, {
    name: valores.name || '',
    url: valores.url || '',
    attribution: valores.attribution || '',
    wms_or_tile: valores.wms_or_tile || 'wms',
    wms_layers: valores.wms_layers || '',
    wms_version: valores.wms_version || '',
    at_start: Boolean(valores.at_start),
  });

  errorConsulta.value = '';
  capasDisponibles.value = [];
}

watch(
  () => props.valoresIniciales,
  (valores) => cargarValores(valores),
  {
    immediate: true,
    deep: true,
  }
);

watch(
  () => formulario.url,
  (urlActual, urlAnterior) => {
    if (urlAnterior !== undefined && urlActual !== urlAnterior) {
      limpiarConsulta();
    }
  }
);

watch(
  () => formulario.wms_or_tile,
  (tipo) => {
    if (tipo !== 'wms') {
      limpiarConsulta();
      formulario.wms_layers = '';
    }
  }
);

function obtenerHijoDirecto(elemento, nombre) {
  return Array.from(elemento.children).find((hijo) => hijo.localName === nombre);
}

function extraerCapas(xmlTexto) {
  const parser = new DOMParser();
  const documento = parser.parseFromString(xmlTexto, 'application/xml');

  const elementos = Array.from(documento.getElementsByTagName('*'));

  if (elementos.some((elemento) => elemento.localName === 'parsererror')) {
    throw new Error('El servicio devolvió una respuesta XML inválida.');
  }

  const capasUnicas = new Map();

  elementos
    .filter((elemento) => elemento.localName === 'Layer')
    .forEach((elemento) => {
      const elementoNombre = obtenerHijoDirecto(elemento, 'Name');
      const nombre = elementoNombre?.textContent?.trim();

      if (!nombre || capasUnicas.has(nombre)) return;

      const elementoTitulo = obtenerHijoDirecto(elemento, 'Title');
      const titulo = elementoTitulo?.textContent?.trim() || nombre;

      capasUnicas.set(nombre, {
        name: nombre,
        title: titulo,
      });
    });

  return Array.from(capasUnicas.values()).sort((a, b) =>
    a.title.localeCompare(b.title, 'es', { sensitivity: 'base' })
  );
}

async function consultarCapas() {
  errorConsulta.value = '';
  capasDisponibles.value = [];

  if (!formulario.url.trim()) {
    errorConsulta.value = 'Ingresa primero la URL del servicio WMS.';
    return;
  }

  consultandoCapas.value = true;

  try {
    const respuesta = await $fetch('/api/validar-url', {
      method: 'POST',
      body: {
        url: formulario.url,
        serverType: 'wms',
      },
    });

    if (!respuesta?.isValid || !respuesta.capabilities) {
      throw new Error('La URL no corresponde a un servicio WMS válido.');
    }

    const capas = extraerCapas(respuesta.capabilities);

    if (!capas.length) {
      throw new Error('El servicio respondió correctamente, pero no publicó capas disponibles.');
    }

    capasDisponibles.value = capas;
    formulario.wms_version = respuesta.version || '';

    const seleccionActualExiste = capas.some((capa) => capa.name === formulario.wms_layers);

    if (!seleccionActualExiste) {
      formulario.wms_layers = '';
    }
  } catch (error) {
    console.error('No fue posible consultar las capas WMS:', error);
    limpiarConsulta();
    errorConsulta.value =
      error?.data?.message ||
      error?.message ||
      'No fue posible consultar las capas del servicio WMS.';
  } finally {
    consultandoCapas.value = false;
  }
}

function seleccionarCapa() {
  const capaSeleccionada = capasDisponibles.value.find(
    (capa) => capa.name === formulario.wms_layers
  );

  if (capaSeleccionada && !formulario.name.trim()) {
    formulario.name = capaSeleccionada.title;
  }
}

function enviar() {
  emit('guardar', { ...formulario });
}
</script>

<template>
  <form class="formulario-wms" @submit.prevent="enviar">
    <p v-if="error" class="texto-color-error m-b-4" role="alert">
      {{ error }}
    </p>

    <div class="m-b-4">
      <label for="wms-nombre">Nombre</label>
      <input id="wms-nombre" v-model.trim="formulario.name" type="text" required />
    </div>

    <div class="m-b-4">
      <label for="wms-url">URL del servicio</label>

      <div
        :class="{
          'campo-url-wms': permitirConsultaCapas && formulario.wms_or_tile === 'wms',
        }"
      >
        <input id="wms-url" v-model.trim="formulario.url" type="url" required />

        <button
          v-if="permitirConsultaCapas && formulario.wms_or_tile === 'wms'"
          type="button"
          class="boton boton-secundario"
          :disabled="consultandoCapas || !formulario.url"
          @click="consultarCapas"
        >
          {{ consultandoCapas ? 'Consultando…' : 'Consultar capas' }}
        </button>
      </div>

      <p v-if="errorConsulta" class="texto-color-error m-t-2 m-b-0" role="alert">
        {{ errorConsulta }}
      </p>

      <p v-else-if="capasDisponibles.length" class="texto-secundario m-t-2 m-b-0">
        {{ capasDisponibles.length }} capas disponibles
        <template v-if="formulario.wms_version"> · WMS {{ formulario.wms_version }} </template>
      </p>
    </div>

    <div class="m-b-4">
      <label for="wms-attribution">Atribución</label>
      <input id="wms-attribution" v-model.trim="formulario.attribution" type="text" />
    </div>

    <div class="m-b-4">
      <label for="wms-tipo">Tipo</label>
      <select id="wms-tipo" v-model="formulario.wms_or_tile">
        <option value="wms">WMS</option>
        <option value="tile">Tile (XYZ)</option>
      </select>
    </div>

    <div v-if="formulario.wms_or_tile === 'wms'" class="m-b-4">
      <label for="wms-layers">
        {{ capasDisponibles.length ? 'Capa disponible' : 'Nombre(s) de capa WMS' }}
      </label>

      <select
        v-if="capasDisponibles.length"
        id="wms-layers"
        v-model="formulario.wms_layers"
        required
        @change="seleccionarCapa"
      >
        <option disabled value="">Selecciona una capa</option>

        <option v-for="capa in capasDisponibles" :key="capa.name" :value="capa.name">
          {{ capa.title }} — {{ capa.name }}
        </option>
      </select>

      <input v-else id="wms-layers" v-model.trim="formulario.wms_layers" type="text" required />
    </div>

    <div class="m-b-4">
      <input id="wms-inicio" v-model="formulario.at_start" type="checkbox" />
      <label for="wms-inicio">Mostrar al inicio</label>
    </div>

    <div class="flex flex-contenido-final acciones-formulario">
      <button
        type="button"
        class="boton boton-secundario"
        :disabled="guardando || consultandoCapas"
        @click="emit('cancelar')"
      >
        Cancelar
      </button>

      <button type="submit" class="boton boton-primario" :disabled="guardando || consultandoCapas">
        {{ guardando ? 'Guardando…' : 'Guardar' }}
      </button>
    </div>
  </form>
</template>

<style lang="scss" scoped>
.formulario-wms {
  width: 100%;
}

.formulario-wms input:not([type='checkbox']),
.formulario-wms select {
  width: 100%;
}

.campo-url-wms {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: stretch;
}

.campo-url-wms .boton {
  white-space: nowrap;
}

.acciones-formulario {
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .campo-url-wms {
    grid-template-columns: 1fr;
  }
}
</style>
