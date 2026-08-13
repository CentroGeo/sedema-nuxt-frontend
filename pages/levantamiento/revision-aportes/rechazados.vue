<script setup>
import { ref, computed, watch, onMounted, shallowRef } from 'vue';
import { SisdaiCapaVectorial, SisdaiCapaXyz, SisdaiMapa } from '@centrogeomx/sisdai-mapas';
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

definePageMeta({
  middleware: 'auth',
});

const storeLevantamiento = useLevantamientoStore();
const { data } = useAuth();

const aportesRechazados = shallowRef([]);
const cargandoAportes = ref(false);

const modalConfirmacion = ref(null);
const mensajeConfirmacion = ref('');

onMounted(async () => {
  const email = data.value?.user?.email;
  if (!email) return;

  cargandoAportes.value = true;
  try {
    console.log('[BACKEND] Solicitando aportes RECHAZADOS...');

    const { aportes } = await storeLevantamiento.obtenerAportesRevision(email, 'RECHAZADO');

    console.log('[BACKEND] Datos crudos obtenidos de Rechazados:', aportes);
    if (aportes.length > 0) {
      console.log('Estructura del primer aporte rechazado:', aportes[0]);
    }

    aportesRechazados.value = aportes.map((aporte) => {
      let fotosArray = [];
      try {
        fotosArray = aporte.media_array ? JSON.parse(aporte.media_array) : [];
      } catch (e) {
        console.warn('Error al parsear media_array', e);
      }

      const fechaObj = new Date(aporte.fecha_guardado);
      const fechaFormateada = isNaN(fechaObj) ? 'Fecha inválida' : fechaObj.toLocaleString('es-MX');

      return {
        ...aporte,
        id: aporte.id,
        titulo: aporte.title || 'Aporte sin título',
        fecha: fechaFormateada,
        folio: `F-${aporte.id} RECHAZADO`,
        proyecto: aporte.nombre || 'Proyecto sin nombre',
        estado: aporte.status || 'RECHAZADO',
        registrante: aporte.usuario_id || 'Desconocido',
        atendidoPor: aporte.id_curador || 'Curador no asignado',
        latitud: aporte.latitud,
        longitud: aporte.longitud,
        fotos: fotosArray,
        detalle: {
          preguntaAbierta: 'Información pendiente de mapear desde respuestas_ficha',
          preguntaOpcion: 'N/A',
          seleccionMultiple: 'N/A',
        },
      };
    });

    if (aportesRechazados.value.length > 0) {
      aporteSeleccionado.value = aportesRechazados.value[0];
    }
  } catch (error) {
    console.error('Error al cargar aportes rechazados:', error);
  } finally {
    cargandoAportes.value = false;
  }
});

async function eliminarAporteRechazado(idAporte) {
  try {
    const email = data.value?.user?.email;
    if (!email) return;

    await storeLevantamiento.eliminarAporte(idAporte);
    console.log(`[DB] El aporte ${idAporte} fue eliminado correctamente`);

    aportesRechazados.value = aportesRechazados.value.filter((a) => a.id !== idAporte);

    if (aportesRechazados.value.length > 0) {
      aporteSeleccionado.value = aportesRechazados.value[0];
    } else {
      aporteSeleccionado.value = null;
    }

    mensajeConfirmacion.value = 'El aporte rechazado fue eliminado permanentemente del sistema.';
    modalConfirmacion.value?.abrirModal();
  } catch (error) {
    console.error('Error al eliminar el aporte:', error);
    mensajeConfirmacion.value = 'Ocurrió un error de conexión al intentar eliminar el aporte.';
    modalConfirmacion.value?.abrirModal();
  }
}

function cerrarModalConfirmacion() {
  modalConfirmacion.value?.cerrarModal();
}

const busqueda = ref('');

const aportesFiltrados = computed(() => {
  if (!busqueda.value) return aportesRechazados.value;
  return aportesRechazados.value.filter((aporte) =>
    aporte.titulo?.toLowerCase().includes(busqueda.value.toLowerCase())
  );
});

const paginaActual = ref(1);
const itemsPorPagina = 8;

const totalPaginas = computed(() => Math.ceil(aportesFiltrados.value.length / itemsPorPagina) || 1);

const aportesPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  return aportesFiltrados.value.slice(inicio, fin);
});

watch(busqueda, () => {
  paginaActual.value = 1;
});

function irAPagina(pagina) {
  if (pagina >= 1 && pagina <= totalPaginas.value) {
    paginaActual.value = pagina;
  }
}

const aporteSeleccionado = ref(null);

function verFichaAporte(aporte) {
  aporteSeleccionado.value = aporte;
}

const imagenAmpliada = ref(null);

function abrirImagen(url) {
  if (url) {
    imagenAmpliada.value = url;
  }
}

function cerrarImagen() {
  imagenAmpliada.value = null;
}
//Lógica de los mapas Sisdai
const coordenadasValidas = computed(() => {
  // Evitamos errores si aporteSeleccionado es null (al cargar la página)
  if (!aporteSeleccionado.value) return false;

  const lat = Number(aporteSeleccionado.value.latitud);
  const lng = Number(aporteSeleccionado.value.longitud);
  return Number.isFinite(lat) && Number.isFinite(lng);
});

const vistaMapa = computed(() =>
  coordenadasValidas.value
    ? {
        centro: [
          Number(aporteSeleccionado.value.longitud),
          Number(aporteSeleccionado.value.latitud),
        ],
        acercamiento: 17,
      }
    : { extension: '-118.3651,14.5321,-86.7104,32.7187' }
);

const puntoSeleccionado = computed(() => ({
  type: 'FeatureCollection',
  features: coordenadasValidas.value
    ? [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [
              Number(aporteSeleccionado.value.longitud),
              Number(aporteSeleccionado.value.latitud),
            ],
          },
        },
      ]
    : [],
}));
</script>

<template>
  <UiLayoutPaneles :estado-colapable="storeLevantamiento.catalogoColapsado">
    <template #catalogo>
      <LevantamientoListaMenuLateral />
    </template>

    <template #visualizador>
      <main id="principal" class="contenedor m-b-10 m-t-3">
        <!-- Menú secundario-->
        <LevantamientoMenuSecundario
          :opciones="[
            { texto: 'Aprobados', ruta: '/levantamiento/revision-aportes' },
            {
              texto: 'En revisión',
              ruta: '/levantamiento/revision-aportes/revision',
            },
            {
              texto: 'Rechazados',
              ruta: '/levantamiento/revision-aportes/rechazados',
            },
          ]"
        />

        <!--Contenedor del título-->
        <div class="revision-aportes__header m-b-3">
          <h2 class="revision-aportes__titulo">
            Aportes rechazados
          </h2>

          <UiNumeroElementos
            :numero="aportesFiltrados.length"
            class="revision-aportes__contador"
          />
        </div>

        <div class="grid revision-aportes">
          <!--Columna de las cards -->
          <div class="columna-5 flex flex-columna panel-aportes">
            <!-- Buscador -->
            <div class="panel-aportes__busqueda m-b-2">
              <input
                v-model="busqueda"
                type="text"
                placeholder="Búsqueda de aportes"
                class="ancho-completo p-1 form-input m-b-1"
                style="background: white; border-color: #cbd5e1; color: #333"
              />
            </div>

            <!-- Lista de tarjetas iteradas -->
            <div class="lista-aportes">
              <!-- Loader -->
              <div v-if="cargandoAportes" class="texto-centrado p-3" style="color: #888">
                Cargando aportes rechazados...
              </div>

              <div
                v-for="aporte in aportesPaginados"
                v-else
                :key="aporte.id"
                class="tarjeta-aporte cursor-pointer p-2 borde borde-redondeado-8"
                :class="{ seleccionada: aporteSeleccionado?.id === aporte.id }"
                @click="verFichaAporte(aporte)"
              >
                <div class="flex tarjeta-aporte__contenido m-b-1">
                  <div
                    class="icono-doc m-r-2"
                    style="
                      font-size: 2rem;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      min-width: 40px;
                    "
                  >
                    <span class="pictograma-documento" aria-hidden="true"></span>
                  </div>
                  <div style="flex-grow: 1; overflow: hidden">
                    <p class="titulo m-0">
                      <strong>{{ aporte.titulo }}</strong>
                    </p>
                    <p class="texto-secundario m-0 text-chico">{{ aporte.fecha }}</p>
                    <p class="texto-secundario m-0 text-chico">{{ aporte.folio }}</p>
                    <p class="texto-secundario m-0 text-chico">{{ aporte.proyecto }}</p>
                  </div>
                </div>
              </div>

              <!-- Mensaje sin resultados -->
              <div
                v-if="!cargandoAportes && aportesFiltrados.length === 0"
                class="texto-centrado p-3"
                style="color: #888"
              >
                No se encontraron aportes rechazados.
              </div>
            </div>

            <!-- Controles de Paginación -->
            <div v-if="totalPaginas > 1" class="paginacion flex m-t-3">
              <button
                :disabled="paginaActual === 1"
                class="btn-paginacion"
                @click="irAPagina(paginaActual - 1)"
              >
                &lt;
              </button>
              <button
                v-for="pagina in totalPaginas"
                :key="pagina"
                class="btn-paginacion"
                :class="{ activa: paginaActual === pagina }"
                @click="irAPagina(pagina)"
              >
                {{ pagina }}
              </button>
              <button
                :disabled="paginaActual === totalPaginas"
                class="btn-paginacion"
                @click="irAPagina(paginaActual + 1)"
              >
                &gt;
              </button>
            </div>
          </div>

          <!--Ficha de proyecto rechazado-->
          <div class="columna-11">
            <div v-if="aporteSeleccionado">
              <div class="flex m-b-2" style="justify-content: space-between; align-items: center">
                <h3 class="m-0">Ficha de proyecto</h3>
                <div class="flex botones-exportacion" style="gap: 8px">
                  <LevantamientoBotonesDescargaAporte
                    :aporte-id="aporteSeleccionado.id"
                    :email="data?.user?.email || ''"
                  />

                  <button
                    class="btn-moderno-chico btn-eliminar"
                    @click="eliminarAporteRechazado(aporteSeleccionado.id)"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <!-- Mapa nativo con sisdai-mapas -->
              <div
                v-if="aporteSeleccionado"
                class="mapa-placeholder m-b-3"
                style="padding: 0; overflow: hidden; height: 300px"
              >
                <ClientOnly>
                  <SisdaiMapa
                    id="aportesmapa"
                    class="gema"
                    style="height: 100%; width: 100%"
                    descripcion="Ubicación del aporte"
                    :vista="vistaMapa"
                  >
                    <SisdaiCapaXyz />
                    <SisdaiCapaVectorial
                      :key="`punto-${aporteSeleccionado.latitud}-${aporteSeleccionado.longitud}`"
                      :fuente="puntoSeleccionado"
                      :posicion="1"
                      :estilo="{
                        'circulo-relleno-color': '#d26c89',
                        'circulo-borde-color': '#ffffff',
                        'circulo-borde-grosor': 3,
                        'circulo-radio': 9,
                      }"
                    />
                  </SisdaiMapa>
                </ClientOnly>
              </div>

              <!-- Panel de Detalles del Aporte -->
              <div class="tarjeta-detalle p-4 borde borde-redondeado-8">
                <!-- Cabecera del panel interno -->
                <div class="flex m-b-4" style="justify-content: space-between; align-items: center">
                  <div class="flex" style="gap: 12px; align-items: center">
                    <span class="badge-estado badge-rechazado">{{ aporteSeleccionado.folio }}</span>
                  </div>
                  <span class="text-chico" style="color: #64748b; font-weight: 500">{{
                    aporteSeleccionado.fecha
                  }}</span>
                </div>

                <!-- Metadatos -->
                <div class="grid-metadatos m-b-4">
                  <div class="meta-label">TÍTULO:</div>
                  <div class="meta-value">{{ aporteSeleccionado.titulo }}</div>

                  <div class="meta-label">NOMBRE DEL REGISTRANTE:</div>
                  <div class="meta-value">{{ aporteSeleccionado.registrante }}</div>

                  <div class="meta-label">ATENDIDO POR:</div>
                  <div class="meta-value">{{ aporteSeleccionado.atendidoPor }}</div>
                </div>

                <div class="flex m-b-4" style="gap: 16px; justify-content: center">
                  <template v-if="aporteSeleccionado.fotos && aporteSeleccionado.fotos.length > 0">
                    <div
                      v-for="(foto, index) in aporteSeleccionado.fotos.slice(0, 3)"
                      :key="index"
                      class="imagen-miniatura bg-imagen miniatura-interactiva"
                      :style="{ backgroundImage: `url(${foto})` }"
                      @click="abrirImagen(foto)"
                    ></div>
                  </template>
                  <div v-else class="imagen-miniatura bg-placeholder" style="width: 100%">
                    <span style="color: #94a3b8; font-size: 0.85rem"
                      >Este aporte no contiene fotografías</span
                    >
                  </div>
                </div>

                <!--Ficha de Información-->
                <h4 class="form-titulo m-b-2">Ficha de información:</h4>
                <div class="grid" style="gap: 16px">
                  <div class="columna-16">
                    <label class="form-label">1.- PREGUNTA ABIERTA</label>
                    <input
                      type="text"
                      class="ancho-completo form-input"
                      readonly
                      :value="aporteSeleccionado.detalle.preguntaAbierta"
                      :title="aporteSeleccionado.detalle.preguntaAbierta"
                    />
                  </div>
                  <div class="columna-16">
                    <label class="form-label">2.- PREGUNTA DE OPCIÓN</label>
                    <input
                      type="text"
                      class="ancho-completo form-input"
                      readonly
                      :value="aporteSeleccionado.detalle.preguntaOpcion"
                      :title="aporteSeleccionado.detalle.preguntaOpcion"
                    />
                  </div>
                  <div class="columna-16">
                    <label class="form-label">5.- PREGUNTA DE SELECCIÓN MÚLTIPLE</label>
                    <div class="flex flex-columna" style="gap: 8px">
                      <input
                        type="text"
                        class="ancho-completo form-input"
                        readonly
                        value="Opción 1"
                        title="Opción 1"
                      />
                      <input
                        type="text"
                        class="ancho-completo form-input"
                        readonly
                        value="Opción 3"
                        title="Opción 3"
                      />
                      <input
                        type="text"
                        class="ancho-completo form-input"
                        readonly
                        value="Opción 5"
                        title="Opción 5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Estado vacío de la columna derecha -->
            <div
              v-else
              class="flex flex-vertical-centrado flex-contenido-centrado"
              style="height: 100%; min-height: 400px; color: #94a3b8"
            >
              <p>Selecciona un aporte para ver sus detalles.</p>
            </div>
          </div>
        </div>
      </main>
      <!-- Confirmación de aporte elimnado -->
      <ClientOnly>
        <SisdaiModal ref="modalConfirmacion">
          <template #encabezado>
            <h3 class="m-0" style="color: #d48d95; font-weight: 600">¡Aporte Actualizado!</h3>
          </template>

          <template #cuerpo>
            <div class="p-y-3 texto-centrado">
              <p class="m-b-3" style="color: #d48d95; font-size: 1.05rem">
                {{ mensajeConfirmacion }}
              </p>
            </div>
          </template>

          <template #pie>
            <button
              class="btn-moderno btn-guinda-sisdai"
              type="button"
              @click="cerrarModalConfirmacion"
            >
              Entendido
            </button>
          </template>
        </SisdaiModal>
      </ClientOnly>

      <!--Modal de imágenes-->
      <Teleport to="body">
        <div v-if="imagenAmpliada" class="modal-imagen-overlay" @click="cerrarImagen">
          <div class="modal-imagen-contenido" @click.stop>
            <button class="btn-cerrar-imagen" @click="cerrarImagen">✕</button>
            <img :src="imagenAmpliada" alt="Vista previa de evidencia" class="imagen-grande" />
          </div>
        </div>
      </Teleport>
    </template>
  </UiLayoutPaneles>
</template>

<style lang="scss" scoped>
.titulo-contenido-levantamiento {
  align-items: center;
  gap: 8px;
}

.cursor-pointer {
  cursor: pointer;
}
.text-chico {
  font-size: 0.75rem;
}
.ancho-completo {
  width: 100%;
  box-sizing: border-box;
}
.flex-columna {
  flex-direction: column;
}

// Tarjetas laterales


.revision-aportes{
    align-items:flex-start;
}
.revision-aportes__header{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
}
.revision-aportes__titulo{
    margin:0;
}
.panel-aportes{
    display:flex;
    flex-direction:column;
    min-width:0;
    height:100%;
}
.panel-aportes__busqueda{
    flex-shrink:0;
}
.lista-aportes{
    display:flex;
    flex-direction:column;
    gap:12px;
    flex:1;
}
.tarjeta-aporte__contenido{
    display:flex;
    align-items:flex-start;
    gap:.75rem;
    min-width:0;
}
.tarjeta-aporte__texto{
    flex:1;
    min-width:0;
}
.tarjeta-aporte {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  overflow: hidden;

  background-color: #715b62;
  border: 1px solid #715b62;
  border-radius: 8px;

  padding: 0.9rem;
  transition:
    background-color .25s ease,
    border-color .25s ease,
    box-shadow .25s ease,
    transform .25s ease;

  .icono-doc,
  .titulo,
  .texto-secundario,
  .texto-porcentaje {
    color: #fff !important;
  }

  .titulo {
    line-height: 1.35;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .texto-secundario {
    line-height: 1.25;
    word-break: break-word;
  }

  .barra-fondo {
    height: 6px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(255,255,255,.20);
  }

  .barra-relleno {
    height: 100%;
    background: #d48d95;
    transition: width .3s ease;
  }

  &:hover:not(.seleccionada) {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0,0,0,.15);
  }

  &.seleccionada {
    background: #d48d95;
    border-color: #d48d95;

    .icono-doc,
    .titulo,
    .texto-secundario,
    .texto-porcentaje {
      color: #391821 !important;
    }

    .barra-fondo {
      background: rgba(255,255,255,.40);
    }

    .barra-relleno {
      background: #391821;
    }
  }
}
// RESPONSIVE TARJETAS LATERALES (Smartphones)
@media (max-width:575px){
.revision-aportes__header{
    align-items:flex-start;
    flex-direction:column;
}

.panel-aportes{
    width:100%;
    padding-inline:0;
}

.lista-aportes{
    gap:10px;
}

}
// Tablets
@media (max-width:991px){
.revision-aportes{
    display:flex;
    flex-direction:column;
    gap:24px;
}

.panel-aportes{
    width:100%;
}

}
// Monitores
@media (min-width:1600px){
  .tarjeta-aporte{
    padding:1.1rem;
    .titulo{
      font-size:1.08rem;
    }
    .texto-secundario{
      font-size:.82rem;
    }
  }

}

.paginacion {
  justify-content: center;
  gap: 8px;

  .btn-paginacion {
    background: transparent;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 4px 10px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
    color: #444;

    &:hover:not(:disabled) {
      background: #eee;
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    &.activa {
      background-color: #715b62;
      color: #ffffff;
      border-color: #715b62;
    }
  }
}

.mapa-placeholder {
  height: 250px;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tarjeta-detalle {
  background-color: #f8fafc;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
}

.badge-estado {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 0.5px;
}
.badge-rechazado {
  background-color: #ef4444;
  color: #ffffff;
}

.grid-metadatos {
  display: grid;
  grid-template-columns: 220px 1fr;
  row-gap: 12px;
  font-size: 0.85rem;

  .meta-label {
    font-weight: 700;
    color: #64748b;
  }
  .meta-value {
    color: #334155;
    font-weight: 500;
  }
}

.imagen-miniatura {
  width: 140px;
  height: 200px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.bg-imagen {
  background-size: cover;
  background-position: center;
}

.bg-placeholder {
  background-color: #f1f5f9;
}

.miniatura-interactiva {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: scale(1.03);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  }
}

.modal-imagen-overlay,
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(30, 41, 59, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-imagen-contenido {
  position: relative;
  background: white;
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeInZoom 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.btn-cerrar-imagen {
  position: absolute;
  top: -12px;
  right: -12px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background-color: #dc2626;
    transform: scale(1.1);
  }
}

.imagen-grande {
  max-width: 100%;
  max-height: 85vh;
  border-radius: 6px;
  display: block;
}

@keyframes fadeInZoom {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-confirmacion-contenido {
  background: #ffffff;
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: fadeInZoom 0.2s ease-out;
  overflow: hidden;
}

.modal-confirmacion-header {
  padding: 16px 20px;
  text-align: center;
}

.fondo-guinda {
  background-color: #715b62;
}

.form-titulo {
  color: #334155;
  font-size: 1.1rem;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  display: block;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

/* Inputs */
.form-input {
  background-color: #ffffff !important;
  border: 1px solid #cbd5e1 !important;
  border-radius: 8px;
  padding: 10px 14px;

  color: #334155 !important;
  -webkit-text-fill-color: #334155 !important;
  opacity: 1 !important;

  font-size: 0.9rem;
  transition: all 0.3s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-input:hover,
.form-input:focus {
  outline: none !important;
  border-color: #715b62 !important;
  background-color: #ffffff !important;
}

// .boton-secundario {
//   background: white;
//   border: 1px solid #10b981;
//   color: #10b981;
//   border-radius: 6px;
//   font-size: 0.8rem;
//   font-weight: 600;
//   cursor: pointer;
//   transition: all 0.2s ease;

//   &:hover {
//     background: #10b981;
//     color: #FFFFFF;
//   }
// }

.boton-chico {
  padding: 6px 14px;
}

.btn-moderno-chico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  color: white;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    filter: brightness(1.05);
  }
}

.btn-moderno {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 28px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  color: white;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.btn-eliminar {
  background-color: #d48d95;
  color: #391821;
}
.btn-eliminar:hover {
  background-color: #c47c84;
}

.btn-guinda-sisdai {
  background-color: #715b62;
  width: 100%;
  padding: 10px;
  border-radius: 6px;
}
.btn-guinda-sisdai:hover {
  background-color: #271016;
}
</style>
