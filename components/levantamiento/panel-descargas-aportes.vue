<script setup>
import SisdaiAreaTexto from '@centrogeomx/sisdai-componentes/src/componentes/area-texto/SisdaiAreaTexto.vue';
import SisdaiCampoBusqueda from '@centrogeomx/sisdai-componentes/src/componentes/campo-busqueda/SisdaiCampoBusqueda.vue';
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import SisdaiSelector from '@centrogeomx/sisdai-componentes/src/componentes/selector/SisdaiSelector.vue';

const props = defineProps({
  estado: { type: String, required: true },
  titulo: { type: String, required: true },
  mensajeVacio: { type: String, required: true },
});

const store = useLevantamientoStore();
const { data } = useAuth();
const descargas = ref([]);
const filtradas = ref([]);
const seleccionada = ref(null);
const pagina = ref(1);
const total = ref(0);
const totalPaginas = ref(1);
const cargando = ref(false);
const procesando = ref(false);
const error = ref('');
const mensajeExito = ref('');
const motivo = ref('');
const orden = ref('antiguas');
const modalDetalle = ref(null);
const modalAprobar = ref(null);
const modalRechazar = ref(null);

const estadoVisual = computed(() => ({
  APROBADO: { texto: 'Aprobada', clases: 'fondo-color-confirmacion texto-color-confirmacion borde-color-confirmacion' },
  'NO REVISADO': { texto: 'En revisión', clases: 'fondo-color-alerta texto-color-alerta borde-color-alerta' },
  RECHAZADO: { texto: 'Rechazada', clases: 'fondo-color-error texto-color-error borde-color-error' },
}[props.estado]));

const descargasOrdenadas = computed(() => [...filtradas.value].sort((a, b) => {
  const fechaA = new Date(a.fecha_solicitud || 0).getTime();
  const fechaB = new Date(b.fecha_solicitud || 0).getTime();
  return orden.value === 'recientes' ? fechaB - fechaA : fechaA - fechaB;
}));

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha registrada';
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime())
    ? 'Sin fecha registrada'
    : valor.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
}

function antiguedad(fecha) {
  if (!fecha) return '';
  const dias = Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000));
  if (dias === 0) return 'Solicitada hoy';
  if (dias === 1) return 'Pendiente desde ayer';
  return `Pendiente desde hace ${dias} días`;
}

async function cargar(nuevaPagina = 1) {
  const email = data.value?.user?.email;
  if (!email) return;
  cargando.value = true;
  error.value = '';
  try {
    const respuesta = await store.obtenerDescargasAportesRevision(email, props.estado, nuevaPagina);
    descargas.value = respuesta.descargas;
    filtradas.value = respuesta.descargas;
    pagina.value = respuesta.pagination.page || nuevaPagina;
    total.value = respuesta.pagination.total || 0;
    totalPaginas.value = respuesta.pagination.totalPages || 1;
  } catch (e) {
    error.value = e?.data?.message || 'No fue posible consultar las descargas de aportes.';
  } finally {
    cargando.value = false;
  }
}

function verDetalle(descarga) {
  seleccionada.value = descarga;
  modalDetalle.value?.abrirModal();
}

function prepararRevision(descarga, accion) {
  seleccionada.value = descarga;
  error.value = '';
  modalDetalle.value?.cerrarModal();
  if (accion === 'aprobar') modalAprobar.value?.abrirModal();
  else {
    motivo.value = '';
    modalRechazar.value?.abrirModal();
  }
}

async function cambiarEstado(status) {
  if (!seleccionada.value || procesando.value) return;
  if (status === 'RECHAZADO' && !motivo.value.trim()) return;
  procesando.value = true;
  error.value = '';
  try {
    await store.revisarDescargaAportes(seleccionada.value.id, {
      status,
      user_id: data.value?.user?.email,
      report: status === 'RECHAZADO' ? motivo.value.trim() : undefined,
      es_notificado: false,
    });
    modalAprobar.value?.cerrarModal();
    modalRechazar.value?.cerrarModal();
    mensajeExito.value = status === 'APROBADO'
      ? 'La descarga fue aprobada y ya está disponible para la persona solicitante.'
      : 'La solicitud fue rechazada y el motivo quedó registrado.';
    await cargar(pagina.value);
  } catch (e) {
    error.value = e?.data?.message || 'No fue posible actualizar la descarga.';
  } finally {
    procesando.value = false;
  }
}

watch(() => data.value?.user?.email, (email) => email && cargar(), { immediate: true });
</script>

<template>
  <section>
    <div class="flex titulo-contenido-levantamiento m-b-3">
      <div>
        <h2 class="m-y-0">{{ titulo }}</h2>
        <p class="texto-color-secundario m-t-minimo m-b-0">
          Consulta y gestiona los archivos con los aportes aprobados de cada proyecto.
        </p>
      </div>
      <UiNumeroElementos :numero="total" etiqueta="Descargas" />
    </div>

    <div
      v-if="mensajeExito"
      class="fondo-color-confirmacion texto-color-confirmacion borde borde-color-confirmacion borde-redondeado-16 p-2 m-b-3"
      role="status"
      aria-live="polite"
    >
      <div class="flex flex-contenido-separado">
        <p class="m-y-0"><b>{{ mensajeExito }}</b></p>
        <button
          type="button"
          class="boton-pictograma boton-sin-contenedor-secundario"
          aria-label="Cerrar mensaje"
          @click="mensajeExito = ''"
        >
          <span class="pictograma-cerrar" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      v-if="error"
      class="fondo-color-error texto-color-error borde borde-color-error borde-redondeado-16 p-2 m-b-3"
      role="alert"
    >
      <p class="m-y-0"><b>No pudimos cargar las descargas.</b></p>
      <p class="m-t-minimo m-b-1">{{ error }}</p>
      <button type="button" class="boton-secundario boton-chico" @click="cargar(pagina)">
        Intentar nuevamente
      </button>
    </div>

    <div v-if="cargando" class="estado-carga fondo-color-neutro borde-redondeado-8 p-3" aria-live="polite">
      <span class="pictograma-archivo-descargar pictograma-grande texto-color-acento" aria-hidden="true" />
      <p class="m-y-1">Cargando descargas de aportes…</p>
    </div>

    <div v-else-if="!descargas.length" class="estado-vacio fondo-color-neutro borde borde-color-secundario borde-redondeado-20 p-3">
      <div class="icono-estado-vacio fondo-color-acento borde-redondeado-16 m-b-2">
        <span class="pictograma-archivo-descargar pictograma-grande texto-color-acento" aria-hidden="true" />
      </div>
      <h3 class="m-y-1">No hay descargas de aportes</h3>
      <p class="texto-color-secundario m-y-0">{{ mensajeVacio }}</p>
    </div>

    <template v-else>
      <div class="grid herramientas m-b-3">
        <div class="columna-8">
          <ClientOnly>
            <label for="busqueda-descargas-aportes">Buscar descarga</label>
            <SisdaiCampoBusqueda
              id="busqueda-descargas-aportes"
              etiqueta=""
              :catalogo="descargas"
              propiedad-busqueda="nombre_descarga"
              @al-filtrar="(resultado) => (filtradas = resultado)"
            />
          </ClientOnly>
        </div>
        <div class="columna-4">
          <SisdaiSelector v-model="orden" etiqueta="Ordenar solicitudes">
            <option value="antiguas">Más antiguas primero</option>
            <option value="recientes">Más recientes primero</option>
          </SisdaiSelector>
        </div>
      </div>

      <div class="grid contenedor-tarjetas">
        <article
          v-for="descarga in descargasOrdenadas"
          :key="descarga.id"
          class="columna-6 fondo-color-neutro borde borde-color-secundario p-3 borde-redondeado-20 tarjeta-descarga"
        >
          <div class="flex flex-contenido-separado encabezado-descarga m-b-3">
            <span class="contenedor-pictograma fondo-color-acento borde-redondeado-8" aria-hidden="true">
              <span class="pictograma-archivo-descargar pictograma-grande texto-color-acento" />
            </span>
            <p class="etiqueta-estado borde borde-redondeado-12 p-x-1 p-y-minimo m-0" :class="estadoVisual.clases">{{ estadoVisual.texto }}</p>
          </div>
          <p class="texto-tamanio-1 texto-color-secundario m-y-0">APORTES DEL PROYECTO</p>
          <h3 class="texto-tamanio-4 nombre-descarga m-t-minimo m-b-2">{{ descarga.nombre_descarga || 'Proyecto sin nombre' }}</h3>
          <p v-if="estado === 'NO REVISADO'" class="texto-color-alerta texto-tamanio-1 m-t-0 m-b-1"><b>{{ antiguedad(descarga.fecha_solicitud) }}</b></p>
          <dl class="datos-descarga texto-tamanio-2 m-b-3">
            <div><dt>Solicitante</dt><dd>{{ descarga.usuario_id }}</dd></div>
            <div><dt>Fecha de solicitud</dt><dd>{{ formatearFecha(descarga.fecha_solicitud) }}</dd></div>
            <div><dt>Formato de entrega</dt><dd><b>Archivo ZIP</b></dd></div>
            <div><dt>Aportes incluidos</dt><dd><b>{{ descarga.num_aportes ?? 'Por calcular' }}</b></dd></div>
          </dl>
          <div class="acciones-tarjeta flex p-t-2 borde-t borde-color-secundario">
            <button type="button" class="boton-secundario boton-chico" @click="verDetalle(descarga)">
              {{ estado === 'NO REVISADO' ? 'Revisar solicitud' : 'Ver detalle' }}
              <span class="pictograma-flecha-derecha" aria-hidden="true" />
            </button>
            <button
              v-if="estado === 'APROBADO' && descarga.file_path"
              type="button"
              class="boton-primario boton-chico"
              disabled
              aria-disabled="true"
              title="Descarga aún no disponible"
            >
              Descargar aportes
              <span class="pictograma-archivo-descargar" aria-hidden="true" />
            </button>
          </div>
        </article>
      </div>

      <div v-if="totalPaginas > 1" class="flex paginacion m-t-3">
        <button class="boton-secundario boton-chico" :disabled="pagina === 1" @click="cargar(pagina - 1)">Anterior</button>
        <span class="texto-color-secundario">Página {{ pagina }} de {{ totalPaginas }}</span>
        <button class="boton-secundario boton-chico" :disabled="pagina === totalPaginas" @click="cargar(pagina + 1)">Siguiente</button>
      </div>
    </template>

    <ClientOnly>
      <SisdaiModal ref="modalDetalle">
        <template #encabezado><h3>Detalle de la descarga de aportes</h3></template>
        <template #cuerpo>
          <div v-if="seleccionada" class="resumen-modal fondo-color-acento borde-redondeado-8 p-2 m-b-2">
            <p class="texto-tamanio-1 texto-color-secundario m-y-0">APORTES DEL PROYECTO</p>
            <h4 class="m-t-minimo m-b-0">{{ seleccionada.nombre_descarga }}</h4>
          </div>
          <dl v-if="seleccionada" class="datos-modal m-y-0">
            <dt>Proyecto</dt><dd>{{ seleccionada.nombre_descarga }}</dd>
            <dt>Solicitante</dt><dd>{{ seleccionada.usuario_id }}</dd>
            <dt>Fecha</dt><dd>{{ formatearFecha(seleccionada.fecha_solicitud) }}</dd>
            <dt>Aportes aprobados incluidos</dt><dd>{{ seleccionada.num_aportes ?? 'Por calcular' }}</dd>
            <dt>Formato de entrega</dt><dd>Archivo ZIP</dd>
            <dt>Uso de los datos</dt><dd>{{ seleccionada.descripcion || 'Sin descripción' }}</dd>
            <template v-if="seleccionada.comentario_curador">
              <dt>Observaciones</dt><dd>{{ seleccionada.comentario_curador }}</dd>
            </template>
          </dl>
        </template>
        <template #pie>
          <button class="boton-secundario boton-chico" @click="modalDetalle?.cerrarModal()">Cerrar</button>
          <template v-if="seleccionada?.status === 'NO REVISADO'">
            <button class="boton-secundario boton-chico" @click="prepararRevision(seleccionada, 'rechazar')">Rechazar solicitud</button>
            <button class="boton-primario boton-chico" @click="prepararRevision(seleccionada, 'aprobar')">Aprobar descarga</button>
          </template>
        </template>
      </SisdaiModal>

      <SisdaiModal ref="modalAprobar">
        <template #encabezado><h3>Aprobar descarga de aportes</h3></template>
        <template #cuerpo>
          <div class="fondo-color-confirmacion borde borde-color-confirmacion borde-redondeado-8 p-2">
            <p class="m-y-0">
              ¿Deseas aprobar la descarga de
              <b>{{ seleccionada?.num_aportes ?? 'los' }} aportes</b> del proyecto
              <b>{{ seleccionada?.nombre_descarga }}</b>? El archivo quedará disponible para
              {{ seleccionada?.usuario_id }}.
            </p>
          </div>
        </template>
        <template #pie>
          <button class="boton-secundario boton-chico" @click="modalAprobar?.cerrarModal()">Cancelar</button>
          <button class="boton-primario boton-chico" :disabled="procesando" @click="cambiarEstado('APROBADO')">
            {{ procesando ? 'Aprobando…' : 'Aprobar descarga' }}
          </button>
        </template>
      </SisdaiModal>

      <SisdaiModal ref="modalRechazar">
        <template #encabezado><h3>Rechazar descarga de aportes</h3></template>
        <template #cuerpo>
          <p class="m-t-0">La persona solicitante podrá consultar esta observación.</p>
          <SisdaiAreaTexto
            v-model="motivo"
            etiqueta="Motivo del rechazo"
            ejemplo="Explica por qué no puede entregarse el archivo"
            :es_etiqueta_visible="true"
            :es_obligatorio="true"
          />
        </template>
        <template #pie>
          <button class="boton-secundario boton-chico" @click="modalRechazar?.cerrarModal()">Cancelar</button>
          <button class="boton-primario boton-chico" :disabled="procesando || !motivo.trim()" @click="cambiarEstado('RECHAZADO')">
            {{ procesando ? 'Rechazando…' : 'Rechazar solicitud' }}
          </button>
        </template>
      </SisdaiModal>
    </ClientOnly>
  </section>
</template>

<style scoped lang="scss">
.titulo-contenido-levantamiento {
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.estado-carga {
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 180px;
  text-align: center;
}

.estado-vacio {
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 48px auto;
  max-width: 720px;
  min-height: 280px;
  text-align: center;
}

.icono-estado-vacio {
  align-items: center;
  display: flex;
  height: 80px;
  justify-content: center;
  width: 80px;
}

.herramientas {
  align-items: end;
  max-width: 980px;
}

.contenedor-tarjetas {
  align-items: stretch;
}

.tarjeta-descarga {
  display: flex;
  flex-direction: column;
  min-height: 440px;
  transition: border-color 0.2s ease;

  &:hover,
  &:focus-within {
    border-color: var(--boton-primario-borde);
  }
}

.encabezado-descarga p {
  align-self: flex-start;
}

.contenedor-pictograma {
  align-items: center;
  display: inline-flex;
  height: 56px;
  justify-content: center;
  width: 56px;
}

.etiqueta-estado {
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.nombre-descarga {
  min-height: 54px;
  overflow-wrap: anywhere;
}

.datos-descarga {
  flex: 1;

  div {
    align-items: start;
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(150px, 42%) minmax(0, 1fr);
    padding: 12px 0;

    &:not(:last-child) {
      border-bottom: 1px solid var(--borde-color-secundario);
    }
  }

  dt {
    color: var(--texto-secundario);
    font-weight: 600;
    line-height: 1.5;
  }

  dd {
    line-height: 1.5;
    margin: 0;
    overflow-wrap: anywhere;
    text-align: left;
  }
}

.acciones-tarjeta {
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
  margin-top: auto;

  .boton,
  button {
    margin: 0;
  }
}

.acciones-descarga,
.paginacion {
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.acciones-descarga button {
  flex: 1;
}

.paginacion {
  justify-content: center;
}

.datos-modal dt {
  color: var(--texto-secundario);
  font-weight: 600;
  line-height: 1.5;
  margin-top: 16px;
}

.datos-modal dd {
  line-height: 1.5;
  margin: 4px 0 0;
  overflow-wrap: anywhere;
}

@media (max-width: 768px) {
  .titulo-contenido-levantamiento {
    flex-direction: column;
  }

  .tarjeta-descarga {
    min-height: auto;
  }

  .datos-descarga div {
    gap: 4px;
    grid-template-columns: 1fr;
  }

  .acciones-tarjeta {
    align-items: stretch;
    flex-direction: column;

    .boton,
    button {
      justify-content: center;
      width: 100%;
    }
  }
}
</style>
