<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import { formatDate } from '~/utils/levantamiento';

definePageMeta({
  middleware: 'auth',
});

const storeLevantamiento = useLevantamientoStore();
const { data } = useAuth();

const router = useRouter();
const route = useRoute();

const notificacion = ref(true);

const porModificar = shallowRef([]);
const cargandoAportes = ref(false);
const errorAportes = ref('');
const mensajes = shallowRef([]);
const cargandoMensajes = ref(false);

onMounted(async () => {
  const email = data.value?.user.email;
  if (!email) return;

  cargandoAportes.value = true;
  try {
    const aportes = await storeLevantamiento.obtenerAportesPorEstado(email, 'EN PAUSA');
    porModificar.value = aportes.map((aporte) => ({
      ...aporte,
      title: aporte.title || aporte.nombre || 'Aporte sin título',
      fecha_formateada: aporte.fecha_guardado
        ? formatDate(new Date(aporte.fecha_guardado))
        : '',
    }));
  } catch {
    errorAportes.value = 'No fue posible cargar los aportes por modificar.';
  } finally {
    cargandoAportes.value = false;
  }
});

const modalMensajes = ref(null);
const modalRemoverAporte = ref(null);

const aporteSeleccionado = ref({});
/**
 * Asigna el aporte seleccionado y navega a la vista de editar
 * @param aporte del que se va a editar
 */
function editarAporte(aporte) {
  aporteSeleccionado.value = aporte;
  irAEditarAporte();
}
/**
 * Navega a la vista de editar con los querys de título y ruta previa
 */
function irAEditarAporte() {
  router.push({
    path: `/levantamiento/aportes/editar/${aporteSeleccionado.value.id}`,
    query: {
      title: aporteSeleccionado.value.title,
      aporte_id: aporteSeleccionado.value.id,
      project_id: aporteSeleccionado.value.id_proyecto,
      previous_path: route.path,
      mode: 'edit',
    },
  });
}

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
  porModificar.value = porModificar.value.filter(
    (aporte) => aporte.id !== aporteSeleccionado.value.id
  );
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
              <h2>Aportes por modificar</h2>
              <UiNumeroElementos :numero="porModificar.length" etiqueta="Aportes" />
            </div>
          </div>
          <div class="columna-8">
            <!-- Buscador -->
          </div>
          <div class="columna-16">
            <div
              v-if="notificacion && porModificar.length"
              class="fondo-color-informacion texto-color-informacion borde borde-color-informacion borde-redondeado-16 p-3"
            >
              <div class="flex flex-contenido-separado">
                <p class="m-0 texto-peso-600 texto-tamanio-4">
                  <span class="pictograma-informacion m-r-1" />Notificaciones
                </p>
                <button
                  class="boton-pictograma boton-sin-contenedor-primario"
                  aria-label="Cerrar notificación"
                  type="button"
                  @click="notificacion = false"
                >
                  <span
                    class="pictograma-cerrar"
                    style="color: var(--texto-informacion)"
                    aria-hidden="true"
                  />
                </button>
              </div>
              <p class="m-0">
                Tienes {{ porModificar.length }} aporte(s) por modificar. Puedes ver las
                observaciones en el botón "Mensajes" de cada aporte.
              </p>
            </div>
          </div>
          <div class="columna-16">
            <div class="contenedor-por-modificar">
              <p v-if="cargandoAportes">Cargando aportes…</p>
              <p v-else-if="errorAportes" class="texto-color-error" role="alert">
                {{ errorAportes }}
              </p>
              <div class="grid">
                <div v-for="value in porModificar" :key="value.id" class="columna-5">
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
                          class="boton-primario boton-chico texto-centrado tarjeta-pie-boton"
                          type="button"
                          @click="editarAporte(value)"
                        >
                          Editar aporte
                        </button>
                        <button
                          class="boton-secundario boton-chico texto-centrado tarjeta-pie-boton"
                          type="button"
                          @click="abrirMensajes(value)"
                        >
                          Mensajes
                        </button>
                        <button
                          class="boton-secundario boton-chico texto-centrado tarjeta-pie-boton"
                          type="button"
                          @click="confirmarEliminarAporte(value)"
                        >
                          Eliminar aporte
                        </button>
                      </div>
                    </div>
                    <p
                      class="fondo-color-alerta texto-color-alerta borde borde-color-alerta borde-redondeado-8 p-1"
                      style="position: absolute; top: 0; right: 24px"
                    >
                      Por modificar
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
          <template #encabezado> <h2>Modificaciones pendientes</h2> </template>
          <template #cuerpo>
            <p>
              Realiza las siguientes modificaciones a tu aporte y envíalo de nuevo a aprobación, lo
              revisaremos a la brevedad.
            </p>
            <p v-if="cargandoMensajes">Cargando mensajes…</p>
            <p
              v-for="mensaje in mensajes"
              :key="mensaje.id"
              class="fondo-color-informacion texto-color-informacion borde borde-color-informacion borde-redondeado-16 p-3"
            >
              {{ mensaje.texto }}
            </p>
            <p
              v-if="!cargandoMensajes && mensajes.length === 0"
              class="fondo-color-informacion texto-color-informacion borde borde-color-informacion borde-redondeado-16 p-3"
            >
              No hay observaciones registradas para este aporte.
            </p>
          </template>
          <template #pie>
            <button
              class="boton-secundario boton-chico"
              type="button"
              @click="modalMensajes.cerrarModal()"
            >
              Regresar
            </button>
            <button class="boton-primario boton-chico" type="button" @click="eliminarAporte">
              Eliminar aporte
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
