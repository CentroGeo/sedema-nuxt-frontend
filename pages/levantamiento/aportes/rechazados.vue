<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import { formatDate } from '~/utils/levantamiento';

definePageMeta({
  middleware: 'auth',
});

const storeLevantamiento = useLevantamientoStore();
const { data } = useAuth();

const rechazados = shallowRef([]);
const cargandoRechazados = ref(false);
const errorRechazados = ref('');
const mensajes = shallowRef([]);
const cargandoMensajes = ref(false);
const aporteSeleccionado = ref({});

const modalMensajes = ref(null);
const modalRemoverAporte = ref(null);

onMounted(async () => {
  const email = data.value?.user.email;
  if (!email) return;

  cargandoRechazados.value = true;
  try {
    const aportes = await storeLevantamiento.obtenerAportesPorEstado(email, 'RECHAZADO');
    rechazados.value = aportes.map((aporte) => ({
      ...aporte,
      title: aporte.title || aporte.titulo || aporte.nombre || 'Aporte sin título',
      fecha_formateada: aporte.fecha_guardado ? formatDate(new Date(aporte.fecha_guardado)) : '',
    }));
  } catch {
    errorRechazados.value = 'No fue posible cargar los aportes rechazados.';
  } finally {
    cargandoRechazados.value = false;
  }
});

async function abrirMensajes(aporte) {
  aporteSeleccionado.value = aporte;
  mensajes.value = [];
  modalMensajes.value?.abrirModal();
  cargandoMensajes.value = true;
  try {
    mensajes.value = await storeLevantamiento.obtenerMensajesAporte(aporte.id);
  } finally {
    cargandoMensajes.value = false;
  }
}

function confirmarEliminarAporte(aporte) {
  aporteSeleccionado.value = aporte;
  modalRemoverAporte.value?.abrirModal();
}

async function eliminarAporte() {
  if (!aporteSeleccionado.value?.id) return;

  await storeLevantamiento.eliminarAporte(aporteSeleccionado.value.id);
  rechazados.value = rechazados.value.filter((aporte) => aporte.id !== aporteSeleccionado.value.id);
  modalRemoverAporte.value?.cerrarModal();
  aporteSeleccionado.value = {};
}
</script>
<template>
  <UiLayoutPaneles :estado-colapable="storeLevantamiento.catalogoColapsado">
    <template #catalogo>
      <LevantamientoListaMenuLateral />
    </template>

    <template #visualizador>
      <main id="principal" class="contenedor m-b-10 m-t-3">
        <LevantamientoMenuSecundario
          :opciones="[
            { texto: 'Aprobados', ruta: '/levantamiento/aportes' },
            {
              texto: 'Por modificar',
              ruta: '/levantamiento/aportes/por-modificar',
              notificacion: false,
            },
            {
              texto: 'En revisión',
              ruta: '/levantamiento/aportes/en-revision',
              notificacion: true,
            },
            {
              texto: 'Por enviar',
              ruta: '/levantamiento/aportes/por-enviar',
              notificacion: true,
            },
            {
              texto: 'Rechazados',
              ruta: '/levantamiento/aportes/rechazados',
              notificacion: false,
            },
          ]"
        />

        <div class="grid">
          <div class="columna-16">
            <div class="flex">
              <h2>Aportes rechazados</h2>
              <UiNumeroElementos :numero="rechazados.length" etiqueta="Aportes" />
            </div>
          </div>
          <div class="columna-8">
            <!-- Buscador -->
          </div>
          <div class="columna-16">
            <div
              class="fondo-color-alerta texto-color-alerta borde borde-color-alerta borde-redondeado-16 p-3"
            >
              <p class="m-0">
                Los aportes rechazados no pueden modificarse y se eliminarán automáticamente después
                de 10 días. Puedes consultar los motivos del dictamen desde el botón "Mensajes" de
                cada aporte.
              </p>
            </div>
          </div>
          <div class="columna-16">
            <div class="contenedor-rechazados">
              <p v-if="cargandoRechazados">Cargando aportes…</p>
              <p v-else-if="errorRechazados" class="texto-color-error" role="alert">
                {{ errorRechazados }}
              </p>
              <div class="grid">
                <div v-for="value in rechazados" :key="value.id" class="columna-5">
                  <div class="tarjeta" style="position: relative">
                    <div
                      class="tarjeta-imagen flex flex-contenido-centrado flex-vertical-centrado fondo-color-acento"
                    >
                      <span class="pictograma-documento pictograma-grande" aria-hidden="true" />
                    </div>

                    <div class="tarjeta-cuerpo">
                      <p class="tarjeta-etiqueta">Aporte creado en:</p>
                      <p class="tarjeta-titulo">{{ value.title }}</p>
                      <p>{{ value.fecha_formateada }}</p>
                    </div>

                    <div class="tarjeta-pie">
                      <div class="flex" style="row-gap: 8px">
                        <button
                          class="boton-secundario boton-chico texto-centrado tarjeta-pie-boton"
                          type="button"
                          @click="abrirMensajes(value)"
                        >
                          Mensajes
                        </button>
                        <button
                          class="boton-primario boton-chico texto-centrado tarjeta-pie-boton"
                          type="button"
                          @click="confirmarEliminarAporte(value)"
                        >
                          Eliminar aporte
                        </button>
                      </div>
                    </div>
                    <p
                      class="fondo-color-error texto-color-error borde borde-color-error borde-redondeado-8 p-1"
                      style="position: absolute; top: 0; right: 24px"
                    >
                      Rechazado
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <ClientOnly>
        <SisdaiModal ref="modalMensajes">
          <template #encabezado> <h2>Aporte rechazado</h2> </template>
          <template #cuerpo>
            <p>Tu aporte fue rechazado, estos fueron los motivos.</p>
            <p v-if="cargandoMensajes">Cargando mensajes…</p>
            <p
              v-for="mensaje in mensajes"
              :key="mensaje.id"
              class="fondo-color-error texto-color-error borde borde-color-error borde-redondeado-16 p-3"
            >
              {{ mensaje.texto }}
            </p>
            <p
              v-if="!cargandoMensajes && mensajes.length === 0"
              class="fondo-color-error texto-color-error borde borde-color-error borde-redondeado-16 p-3"
            >
              No hay mensajes registrados para este aporte.
            </p>
          </template>
          <template #pie>
            <button
              class="boton-secundario boton-chico"
              type="button"
              @click="modalMensajes.cerrarModal()"
            >
              Cerrar
            </button>
          </template>
        </SisdaiModal>

        <SisdaiModal ref="modalRemoverAporte">
          <template #encabezado> <h2>Eliminar aporte</h2> </template>
          <template #cuerpo>
            <p>¿Deseas eliminar este aporte? Esta acción no se puede deshacer.</p>
          </template>
          <template #pie>
            <button
              class="boton-secundario boton-chico"
              type="button"
              @click="modalRemoverAporte.cerrarModal()"
            >
              Regresar
            </button>
            <button class="boton-primario boton-chico" type="button" @click="eliminarAporte">
              Eliminar aporte
            </button>
          </template>
        </SisdaiModal>
      </ClientOnly>
    </template>
  </UiLayoutPaneles>
</template>
<style lang="scss" scoped>
.tarjeta-pie-boton {
  width: 100%;
  display: inline-block;
}
</style>
