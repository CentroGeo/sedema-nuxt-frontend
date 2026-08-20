<script setup>
const props = defineProps({
  estado: { type: String, required: true },
  titulo: { type: String, required: true },
  mensajeVacio: { type: String, required: true },
});

const { data } = useAuth();
const store = useLevantamientoStore();
const descargas = ref([]);
const pagina = ref(1);
const total = ref(0);
const totalPaginas = ref(1);
const cargando = ref(false);
const procesandoId = ref(null);
const error = ref('');
const mensaje = ref('');

const etiquetaEstado = computed(
  () =>
    ({
      APROBADO: 'Aprobada',
      'NO REVISADO': 'En revisión',
      RECHAZADO: 'Rechazada',
    })[props.estado] || props.estado
);

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha';
  const date = new Date(fecha);
  return Number.isNaN(date.getTime())
    ? 'Sin fecha'
    : date.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
}

async function cargar(nuevaPagina = 1) {
  const email = data.value?.user?.email;
  if (!email) return;
  cargando.value = true;
  error.value = '';
  try {
    const response = await store.obtenerDescargasUsuario(email, props.estado, nuevaPagina);
    descargas.value = response.descargas;
    pagina.value = response.pagination.page || nuevaPagina;
    total.value = response.pagination.total || 0;
    totalPaginas.value = response.pagination.totalPages || 1;
  } catch (e) {
    error.value = e?.data?.message || 'No fue posible consultar las descargas.';
  } finally {
    cargando.value = false;
  }
}

async function descargar(descarga) {
  procesandoId.value = descarga.id;
  error.value = '';
  try {
    await store.descargarArchivoDescarga(descarga.id, data.value?.user?.email);
  } catch (e) {
    error.value = e?.data?.message || e?.message || 'No fue posible descargar el archivo.';
  } finally {
    procesandoId.value = null;
  }
}

async function eliminar(descarga) {
  procesandoId.value = descarga.id;
  error.value = '';
  try {
    await store.eliminarDescargaEnRevision(descarga.id, data.value?.user?.email);
    mensaje.value = 'La solicitud fue eliminada.';
    await cargar(pagina.value);
  } catch (e) {
    error.value = e?.data?.message || 'No fue posible eliminar la solicitud.';
  } finally {
    procesandoId.value = null;
  }
}

watch(
  () => data.value?.user?.email,
  (email) => email && cargar(),
  { immediate: true }
);
</script>

<template>
  <section>
    <div class="flex flex-contenido-separado m-b-3">
      <h2 class="m-y-0">{{ titulo }}</h2>
      <UiNumeroElementos :numero="total" etiqueta="Descargas" />
    </div>

    <p v-if="mensaje" class="texto-color-confirmacion" role="status">{{ mensaje }}</p>
    <p v-if="error" class="texto-color-error" role="alert">{{ error }}</p>
    <p v-if="cargando" aria-live="polite">Cargando descargas…</p>

    <div v-else-if="!descargas.length" class="flex texto-centrado contenido-levantamiento">
      <div>
        <p>{{ mensajeVacio }}</p>
        <LevantamientoSolicitaUnaDescarga @solicitud-creada="cargar(1)" />
      </div>
    </div>

    <template v-else>
      <div class="flex flex-contenido-final m-b-3">
        <LevantamientoSolicitaUnaDescarga :es-estado-vacio="false" @solicitud-creada="cargar(1)" />
      </div>

      <div class="grid">
        <article
          v-for="descarga in descargas"
          :key="descarga.id"
          class="columna-5 fondo-color-neutro p-3 borde-redondeado-20"
        >
          <div class="flex flex-contenido-separado m-b-2">
            <span class="pictograma-archivo-descargar pictograma-grande texto-color-acento" />
            <b>{{ etiquetaEstado }}</b>
          </div>
          <h3>{{ descarga.nombre_descarga }}</h3>
          <p><b>Formato:</b> {{ (descarga.formato || 'xlsx').toUpperCase() }}</p>
          <p><b>Fecha de solicitud:</b> {{ formatearFecha(descarga.fecha_solicitud) }}</p>
          <p v-if="estado === 'RECHAZADO'">
            <b>Motivo:</b> {{ descarga.comentario_curador || 'Sin motivo registrado' }}
          </p>
          <div class="flex">
            <button
              v-if="estado === 'APROBADO'"
              type="button"
              class="boton-primario boton-chico"
              :disabled="procesandoId === descarga.id"
              @click="descargar(descarga)"
            >
              {{ procesandoId === descarga.id ? 'Descargando…' : 'Descargar' }}
            </button>
            <button
              v-if="estado === 'NO REVISADO'"
              type="button"
              class="boton-secundario boton-chico"
              :disabled="procesandoId === descarga.id"
              @click="eliminar(descarga)"
            >
              {{ procesandoId === descarga.id ? 'Eliminando…' : 'Eliminar solicitud' }}
            </button>
          </div>
        </article>
      </div>

      <div v-if="totalPaginas > 1" class="flex flex-contenido-centrado m-t-3">
        <button
          type="button"
          class="boton-secundario boton-chico"
          :disabled="pagina <= 1"
          @click="cargar(pagina - 1)"
        >
          Anterior
        </button>
        <span>Página {{ pagina }} de {{ totalPaginas }}</span>
        <button
          type="button"
          class="boton-secundario boton-chico"
          :disabled="pagina >= totalPaginas"
          @click="cargar(pagina + 1)"
        >
          Siguiente
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.contenido-levantamiento {
  align-items: center;
  min-height: 320px;
}
</style>
