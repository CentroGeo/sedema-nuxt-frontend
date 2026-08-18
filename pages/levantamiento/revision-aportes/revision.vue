<script setup>
import { ref, computed, watch, onMounted, shallowRef } from 'vue';
import { SisdaiCapaVectorial, SisdaiCapaXyz, SisdaiMapa } from '@centrogeomx/sisdai-mapas';
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

definePageMeta({
  middleware: 'auth',
});

// Importaciones para conectar al backend
const storeLevantamiento = useLevantamientoStore();
const { data } = useAuth();

// Arreglo vacío en lugar de datos dummy
const aportesEnRevision = shallowRef([]);
const cargandoAportes = ref(false);

const modalConfirmacion = ref(null);
const mensajeConfirmacion = ref('');

// Conexión de backend
onMounted(async () => {
  const email = data.value?.user?.email;
  if (!email) return;

  cargandoAportes.value = true;
  try {
    const aportes = await storeLevantamiento.obtenerAportesPorEstado(email, 'NO REVISADO');

    aportesEnRevision.value = aportes.map((aporte, index) => {
      let fotosArray = [];
      try {
        fotosArray = aporte.media_array ? JSON.parse(aporte.media_array) : [];
      } catch (error) {
        console.error('Error al obtener aportes de la base de datos:', error);
      }

      const fechaObj = new Date(aporte.fecha_guardado);
      const fechaFormateada = isNaN(fechaObj)
        ? 'Fecha desconocida'
        : fechaObj.toLocaleString('es-MX');

      return {
        ...aporte,
        id: aporte.id || index + 1,
        titulo: aporte.title || aporte.nombre || `Aporte sin título ${index + 1}`,
        fecha: fechaFormateada,
        folio: `F-${aporte.id || index} NO REVISADO`,
        proyecto: aporte.nombre || 'Proyecto Desconocido',
        estado: aporte.status || 'NO REVISADO',
        progreso: 50,
        registrante: aporte.usuario_id || 'Usuario Desconocido',
        latitud: aporte.latitud,
        longitud: aporte.longitud,
        fotos: fotosArray.length > 0 ? fotosArray : [],
        mensajes: aporte.mensajes || [],
        detalle: aporte.detalle || {
          preguntaAbierta: 'Pendiente de enlazar a BD',
          siNo: 'No',
          seleccionSimple: 'Sin selección',
          porqueSi: 'N/A',
          seleccionMultiple: 'N/A',
          colonia: 'Sin colonia',
          calle: 'Sin calle',
          ciudad: 'Sin ciudad',
        },
      };
    });

    if (aportesEnRevision.value.length > 0) {
      aporteSeleccionado.value = aportesEnRevision.value[0];
    }
  } catch (error) {
    console.error('Error al obtener aportes de la base de datos:', error);
  } finally {
    cargandoAportes.value = false;
  }
});

// Función de cambio de estado con los botones
async function cambiarEstadoAporte(idAporte, nuevoEstado) {
  try {
    const email = data.value?.user?.email;
    if (!email) {
      console.error('No se encontró el email del usuario para realizar la acción.');
      return;
    }

    //  JSON (payload)
    const payload = {
      status: nuevoEstado,
      user_id: email,
    };

    await storeLevantamiento.actualizarStatusAporte(payload, idAporte);

    console.log(`El aporte ${idAporte} se actualizó con éxito a: ${nuevoEstado}`);

    aportesEnRevision.value = aportesEnRevision.value.filter((a) => a.id !== idAporte);

    if (aportesEnRevision.value.length > 0) {
      aporteSeleccionado.value = aportesEnRevision.value[0];
    } else {
      aporteSeleccionado.value = null;
    }

    const accion =
      nuevoEstado === 'APROBADO'
        ? 'aprobado'
        : nuevoEstado === 'RECHAZADO'
          ? 'rechazado'
          : 'movido a revisión';
    mensajeConfirmacion.value = `El aporte ha sido ${accion} correctamente.`;
    modalConfirmacion.value?.abrirModal();
  } catch (error) {
    console.error('Error al intentar actualizar el estado en DB:', error);

    // Mostramos el modal de error
    mensajeConfirmacion.value =
      'Ocurrió un error al conectar con el servidor. El estado no pudo actualizarse.';
    modalConfirmacion.value?.abrirModal();
  }
}

function cerrarModalConfirmacion() {
  modalConfirmacion.value?.cerrarModal();
}

// Búsqueda y paginación
const busqueda = ref('');

const aportesFiltrados = computed(() => {
  if (!busqueda.value) return aportesEnRevision.value;
  return aportesEnRevision.value.filter((aporte) =>
    aporte.titulo?.toLowerCase().includes(busqueda.value.toLowerCase())
  );
});

const paginaActual = ref(1);
const itemsPorPagina = 5;

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

// Visor de imágenes
const imagenAmpliada = ref(null);

function abrirImagen(url) {
  if (url) {
    imagenAmpliada.value = url;
  }
}

function cerrarImagen() {
  imagenAmpliada.value = null;
}

const modalMensajes = ref(null);

function abrirMensajes() {
  modalMensajes.value?.abrirModal();
}

function cerrarMensajes() {
  modalMensajes.value?.cerrarModal();
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
        <!-- Menú superior -->
        <LevantamientoMenuSecundario
          :opciones="[
            { texto: 'Aprobados', ruta: '/levantamiento/revision-aportes' },
            {
              texto: 'En revisión',
              ruta: '/levantamiento/revision-aportes/revision',
              notificacion: false,
            },
            {
              texto: 'Rechazados',
              ruta: '/levantamiento/revision-aportes/rechazados',
              notificacion: false,
            },
          ]"
        />

        <div class="flex m-b-3" style="align-items: center; gap: 8px">
          <h2>Revisión del estado de los aportes</h2>
          <UiNumeroElementos :numero="aportesFiltrados.length" />
        </div>

        <div class="grid">
          <!-- Columna Izquierda -->
          <div class="columna-5 flex flex-columna">
            <div class="m-b-3">
              <input
                v-model="busqueda"
                type="text"
                placeholder="Buscar por título de aporte..."
                class="ancho-completo p-1 form-input"
                style="background: white; border-color: #ccc; color: #333"
              />
            </div>

            <!-- Lista de tarjetas iteradas -->
            <div class="flex flex-columna" style="gap: 12px; flex-grow: 1">
              <div v-if="cargandoAportes" class="texto-centrado p-3" style="color: #888">
                Cargando datos del servidor...
              </div>

              <div
                v-for="aporte in aportesPaginados"
                v-else
                :key="aporte.id"
                class="tarjeta-aporte cursor-pointer p-2 borde borde-redondeado-8"
                :class="{ seleccionada: aporteSeleccionado?.id === aporte.id }"
                @click="verFichaAporte(aporte)"
              >
                <div class="flex m-b-1">
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

                <!-- La sección del porcentaje será activada en otro apetito (según el descubrimiento) -->
                <!-- <div class="contenedor-progreso m-t-2">
                  <div class="flex" style="justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span class="text-chico texto-porcentaje">Progreso del aporte</span>
                    <span class="text-chico texto-porcentaje"><strong>{{ aporte.progreso }}%</strong></span>
                  </div>
                  <div class="barra-fondo">
                    <div class="barra-relleno" :style="{ width: aporte.progreso + '%' }"></div>
                  </div>
                </div> -->
              </div>

              <div
                v-if="!cargandoAportes && aportesFiltrados.length === 0"
                class="texto-centrado p-3"
                style="color: #888"
              >
                No se encontraron aportes pendientes de revisión.
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

          <!-- Columna derecha, con fichas de proyectos -->
          <div class="columna-11">
            <div v-if="aporteSeleccionado" class="tarjeta-ficha p-4 borde borde-redondeado-8">
              <div class="flex m-b-3" style="justify-content: space-between; align-items: center">
                <h3 class="m-0">
                  Ficha de proyecto:
                  <span style="font-weight: normal; color: #715b62">{{
                    aporteSeleccionado.titulo
                  }}</span>
                </h3>
                <div class="flex" style="gap: 8px">
                  <button class="boton-secundario boton-chico">GeoJson</button>
                  <button class="boton-secundario boton-chico">KML</button>
                  <button class="boton-secundario boton-chico">Shapefile</button>
                  <button class="boton-secundario boton-chico" @click="abrirMensajes">
                    Mensajes
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

              <div class="m-b-3 flex" style="gap: 8px; align-items: center">
                <span class="form-label" style="margin-bottom: 0">NOMBRE DEL REGISTRANTE:</span>
                <span style="color: #334155; font-size: 0.9rem; font-weight: 500">{{
                  aporteSeleccionado.registrante
                }}</span>
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

              <!-- Formulario de revisión -->
              <div class="grid m-b-4" style="gap: 16px">
                <div class="columna-8">
                  <label class="form-label">1.- PREGUNTA ABIERTA</label>
                  <input
                    type="text"
                    class="ancho-completo form-input"
                    readonly
                    :value="aporteSeleccionado.detalle.preguntaAbierta"
                    :title="aporteSeleccionado.detalle.preguntaAbierta"
                  />
                </div>
                <div class="columna-8">
                  <label class="form-label">4.- ¿SI O NO?</label>
                  <input
                    type="text"
                    class="ancho-completo form-input"
                    readonly
                    :value="aporteSeleccionado.detalle.siNo"
                    :title="aporteSeleccionado.detalle.siNo"
                  />
                </div>
                <div class="columna-8">
                  <label class="form-label">2.- SELECCIÓN SIMPLE</label>
                  <input
                    type="text"
                    class="ancho-completo form-input"
                    readonly
                    :value="aporteSeleccionado.detalle.seleccionSimple"
                    :title="aporteSeleccionado.detalle.seleccionSimple"
                  />
                </div>
                <div class="columna-8">
                  <label class="form-label">4.1.- ¿POR QUÉ SÍ?</label>
                  <input
                    type="text"
                    class="ancho-completo form-input"
                    readonly
                    :value="aporteSeleccionado.detalle.porqueSi"
                    :title="aporteSeleccionado.detalle.porqueSi"
                  />
                </div>
                <div class="columna-8">
                  <label class="form-label">3.- SELECCIÓN MÚLTIPLE</label>
                  <input
                    type="text"
                    class="ancho-completo form-input"
                    readonly
                    :value="aporteSeleccionado.detalle.seleccionMultiple"
                    :title="aporteSeleccionado.detalle.seleccionMultiple"
                  />
                </div>
                <div class="columna-8">
                  <label class="form-label">5.- COLONIA</label>
                  <input
                    type="text"
                    class="ancho-completo form-input"
                    readonly
                    :value="aporteSeleccionado.detalle.colonia"
                    :title="aporteSeleccionado.detalle.colonia"
                  />
                </div>
                <div class="columna-16">
                  <label class="form-label">5.1.- CALLE</label>
                  <input
                    type="text"
                    class="ancho-completo form-input"
                    readonly
                    :value="aporteSeleccionado.detalle.calle"
                    :title="aporteSeleccionado.detalle.calle"
                  />
                </div>
                <div class="columna-16">
                  <label class="form-label">5.2.- CIUDAD</label>
                  <input
                    type="text"
                    class="ancho-completo form-input"
                    readonly
                    :value="aporteSeleccionado.detalle.ciudad"
                    :title="aporteSeleccionado.detalle.ciudad"
                  />
                </div>
              </div>

              <!-- Botones de rechazo y aceptación -->
              <div
                class="flex"
                style="
                  justify-content: center;
                  gap: 24px;
                  padding-top: 1rem;
                  border-top: 1px solid #e0e0e0;
                "
              >
                <button
                  class="btn-moderno btn-aprobar"
                  @click="cambiarEstadoAporte(aporteSeleccionado.id, 'APROBADO')"
                >
                  <span></span> APROBAR APORTE
                </button>
                <button
                  class="btn-moderno btn-rechazar"
                  @click="cambiarEstadoAporte(aporteSeleccionado.id, 'RECHAZADO')"
                >
                  <span></span> RECHAZAR APORTE
                </button>
              </div>
            </div>

            <div
              v-else
              class="flex flex-vertical-centrado flex-contenido-centrado"
              style="height: 100%; min-height: 400px; color: #94a3b8"
            >
              <p>Selecciona un aporte de la lista para evaluarlo.</p>
            </div>
          </div>
        </div>
      </main>

      <!-- Modal de confirmación-->
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

      <!-- Modal de Mensajes-->
      <Teleport to="body">
        <ClientOnly>
          <SisdaiModal ref="modalMensajes">
            <template #encabezado>
              <h4 class="m-0" style="color: #d48d95">Mensajes del Aporte</h4>
            </template>

            <template #cuerpo>
              <div class="chat-area-lectura p-3 m-t-2">
                <template
                  v-if="aporteSeleccionado?.mensajes && aporteSeleccionado.mensajes.length > 0"
                >
                  <div
                    v-for="msj in aporteSeleccionado.mensajes"
                    :key="msj.id"
                    class="mensaje-lectura m-b-2"
                  >
                    <div class="mensaje-header">
                      <span class="autor">{{ msj.autor }}</span>
                      <span class="fecha">{{ msj.fecha }}</span>
                    </div>
                    <p class="m-0 texto-msj">{{ msj.texto }}</p>
                  </div>
                </template>

                <div v-else class="texto-centrado p-y-4" style="color: #d48d95; font-weight: 500">
                  No hay mensajes para este aporte.
                </div>
              </div>
            </template>

            <template #pie>
              <button class="boton-secundario boton-chico" type="button" @click="cerrarMensajes">
                Cerrar
              </button>
            </template>
          </SisdaiModal>
        </ClientOnly>
      </Teleport>

      <!--Modal de Imagen Ampliada-->
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
/* Utilidades base */
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

/* TARJETAS LATERALES*/
.tarjeta-aporte {
  background-color: #715b62;
  border: 1px solid #715b62;
  transition: all 0.25s ease;

  .icono-doc,
  .titulo,
  .texto-secundario,
  .texto-porcentaje {
    color: #ffffff !important;
  }

  .barra-fondo {
    height: 6px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    overflow: hidden;
  }
  .barra-relleno {
    height: 100%;
    background-color: #d48d95;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  &:hover:not(.seleccionada) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    filter: brightness(1.05);
  }

  &.seleccionada {
    background-color: #d48d95;
    border-color: #d48d95;

    .icono-doc,
    .titulo,
    .texto-secundario,
    .texto-porcentaje {
      color: #391821 !important;
    }

    .barra-fondo {
      background-color: rgba(255, 255, 255, 0.4);
    }
    .barra-relleno {
      background-color: #391821;
    }
  }
}

/* Paginación */
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

/* FICHA Y FORMULARIOS*/
.tarjeta-ficha {
  background-color: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

.mapa-placeholder {
  height: 250px;
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  display: block;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

/* FOTOGRAFÍAS*/
.imagen-miniatura {
  width: 120px;
  height: 80px;
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
    transform: scale(1.05);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  }
}

/* MODAL DE IMÁGENES Y GLOBALES */
.modal-imagen-overlay,
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 23, 42, 0.6);
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

/* Modal de confirmación */
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

/* Modal de mensajes */
.modal-mensajes-contenido {
  background: #ffffff;
  width: 100%;
  max-width: 450px;
  height: 70vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: fadeInZoom 0.2s ease-out;
  overflow: hidden;
}

.modal-mensajes-header {
  padding: 16px 20px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

// .btn-cerrar-sutil {
//   background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; transition: color 0.2s;
//   &:hover { color: #ef4444; }
// }

// .chat-area {
//   flex: 1; padding: 20px; overflow-y: auto; background-color: #f1f5f9; display: flex; flex-direction: column; gap: 12px;
// }

// .burbuja {
//   padding: 12px 16px; border-radius: 12px; max-width: 85%; font-size: 0.9rem; line-height: 1.4; position: relative;
// }

// .ajena {
//   background-color: #ffffff; color: #334155; border: 1px solid #e2e8f0; align-self: flex-start; border-bottom-left-radius: 4px;
// }

// .propia {
//   background-color: #715B62; color: #ffffff; align-self: flex-end; border-bottom-right-radius: 4px;
// }

// .fecha-msj {
//   display: block; font-size: 0.65rem; margin-top: 6px; text-align: right;
// }

// .ajena .fecha-msj { color: #94a3b8; }
// .propia .fecha-msj { color: rgba(255,255,255,0.7); }

// .chat-input-area {
//   padding: 16px; background-color: #ffffff; border-top: 1px solid #e2e8f0; display: flex; gap: 12px;
// }

// .input-chat {
//   flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 20px; font-size: 0.9rem; transition: border-color 0.2s;
//   &:focus { outline: none; border-color: #715B62; }
// }

// .btn-enviar-chat {
//   background-color: #10b981; color: white; border: none; padding: 0 20px; border-radius: 20px; font-weight: 600; cursor: pointer; transition: background 0.2s;
//   &:hover { background-color: #059669; }
// }

/* Inputs form */

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

.btn-aprobar {
  background: linear-gradient(135deg, #d48d95 0%, #d47782 100%);
}
.btn-rechazar {
  background: linear-gradient(135deg, #46252e 0%, #361d24 100%);
}
.btn-guinda-sisdai {
  background-color: #715b62;
  width: 100%;
  padding: 10px;
  border-radius: 6px;
}
</style>
