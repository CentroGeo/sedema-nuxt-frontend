<script setup>
import SisdaiCampoBusqueda from '@centrogeomx/sisdai-componentes/src/componentes/campo-busqueda/SisdaiCampoBusqueda.vue';
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import SisdaiSelector from '@centrogeomx/sisdai-componentes/src/componentes/selector/SisdaiSelector.vue';
import { formatDate } from '~/utils/levantamiento';

definePageMeta({
  middleware: 'auth',
});

const storeLevantamiento = useLevantamientoStore();
const { data } = useAuth();

const router = useRouter();
const route = useRoute();

const aprobados = shallowRef([]);
const aprobadosFiltrados = shallowRef([]);
const ordenAportes = ref('antiguas');
const cargandoAprobados = ref(false);
const errorAprobados = ref('');

// Aplica en la vista el filtro y el orden por fecha sin solicitar nuevamente los aportes.
const aportesOrdenados = computed(() =>
  [...aprobadosFiltrados.value].sort((aporteA, aporteB) => {
    const fechaA = new Date(aporteA.fecha_guardado || 0).getTime();
    const fechaB = new Date(aporteB.fecha_guardado || 0).getTime();

    return ordenAportes.value === 'recientes' ? fechaB - fechaA : fechaA - fechaB;
  })
);

onMounted(async () => {
  const email = data.value?.user.email;
  if (!email) return;

  cargandoAprobados.value = true;
  try {
    const aportes = await storeLevantamiento.obtenerAportesPorEstado(email, 'APROBADO');
    const aportesFormateados = aportes.map((aporte) => ({
      ...aporte,
      title: aporte.title || aporte.titulo || aporte.nombre || 'Aporte sin título',
      fecha_formateada: aporte.fecha_guardado ? formatDate(new Date(aporte.fecha_guardado)) : '',
    }));
    aprobados.value = aportesFormateados;
    aprobadosFiltrados.value = aportesFormateados;
  } catch {
    errorAprobados.value = 'No fue posible cargar los aportes aprobados.';
  } finally {
    cargandoAprobados.value = false;
  }
});

const modalEditarAporte = ref(null);
const modalRemoverAporte = ref(null);

const aporteSeleccionado = ref({});
/**
 * Abre el modal de editar aporte y asigna el aporte seleccionado
 * @param aporte del que se va a editar
 */
function editarAporte(aporte) {
  modalEditarAporte.value?.abrirModal();
  aporteSeleccionado.value = aporte;
}
/**
 * Cierra el modal de editar aporte y navega a la vista de editar
 * con los querys de título y ruta previa
 */
function irAEditarAporte() {
  modalEditarAporte.value?.cerrarModal();
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

function confirmarEliminarAporte(aporte) {
  aporteSeleccionado.value = aporte;
  modalRemoverAporte.value?.abrirModal();
}

async function eliminarAporte() {
  if (!aporteSeleccionado.value?.id) return;

  await storeLevantamiento.eliminarAporte(aporteSeleccionado.value.id);
  aprobados.value = aprobados.value.filter((aporte) => aporte.id !== aporteSeleccionado.value.id);
  aprobadosFiltrados.value = aprobadosFiltrados.value.filter(
    (aporte) => aporte.id !== aporteSeleccionado.value.id
  );
  modalRemoverAporte.value?.cerrarModal();
  aporteSeleccionado.value = {};
}

const modalCrearAporte = ref(null);
const seleccionProyectos = ref('');
const proyectosDisponibles = ref([]);

async function abrirModalCrearAporte() {
  seleccionProyectos.value = '';
  modalCrearAporte.value?.abrirModal();

  const email = data.value?.user.email;
  if (!email) return;

  await Promise.all([
    storeLevantamiento.obtenerProyectosPublicos(),
    storeLevantamiento.obtenerMisProyectos(email),
    storeLevantamiento.obtenerProyectosCompartidos(email),
  ]);

  const compartidosConPermiso = storeLevantamiento.proyectosCompartidos.filter((proyecto) =>
    ['administrar', 'aporta'].includes(proyecto.rol)
  );
  const proyectosPorId = new Map();

  [
    ...storeLevantamiento.proyectosPublicos,
    ...storeLevantamiento.proyectos,
    ...compartidosConPermiso,
  ].forEach((proyecto) => proyectosPorId.set(proyecto.id, proyecto));

  proyectosDisponibles.value = [...proyectosPorId.values()];
}

function continuarCrearAporte() {
  const proyecto = proyectosDisponibles.value.find(
    (proyectoDisponible) => String(proyectoDisponible.id) === String(seleccionProyectos.value)
  );
  if (!proyecto) return;

  modalCrearAporte.value?.cerrarModal();
  router.push({
    path: `/levantamiento/aportes/editar/${proyecto.id}`,
    query: {
      project_id: proyecto.id,
      title: proyecto.nombre,
      previous_path: route.path,
      mode: 'create',
    },
  });
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
              <h2>Aportes aprobados</h2>
              <UiNumeroElementos :numero="aprobados.length" etiqueta="Aportes" />
            </div>
          </div>
          <!-- Conserva disponible la creación aunque la persona ya tenga aportes aprobados. -->
          <div v-if="aprobados.length" class="columna-16">
            <div class="grid">
              <div class="columna-8"></div>
              <div class="columna-8 flex flex-contenido-final">
                <button
                  class="boton-primario boton-pictograma"
                  type="button"
                  @click="abrirModalCrearAporte"
                >
                  Crear un aporte
                  <span class="pictograma-agregar" aria-hidden="true"></span>
                </button>
              </div>
            </div>
          </div>
          <div v-if="cargandoAprobados" class="columna-16">
            <p>Cargando aportes…</p>
          </div>
          <div v-else-if="errorAprobados" class="columna-16">
            <p class="texto-color-error" role="alert">{{ errorAprobados }}</p>
          </div>
          <div v-else-if="aprobados.length === 0" class="columna-16">
            <div class="flex flex-contenido-centrado">
              <div class="columna-8 flex-vertical-centrado" style="height: 58vh">
                <div class="fondo-color-acento borde-redondeado-16 texto-centrado p-b-3">
                  <span
                    class="pictograma-documento texto-color-acento texto-tamanio-8 m-t-1"
                  ></span>
                  <h3 class="texto-color-acento m-t-0">Empieza a realizar aportes</h3>
                  <p>Cuando tus aportes sean aprobados podrás verlos en esta sección</p>
                  <button
                    class="boton-primario boton-chico"
                    type="button"
                    @click="abrirModalCrearAporte"
                  >
                    Crear un aporte
                    <span class="pictograma-agregar" aria-hidden="true"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="columna-16">
            <div class="grid herramientas m-b-3">
              <div class="columna-8">
                <ClientOnly>
                  <label for="busqueda-aportes-aprobados">Buscar aporte</label>
                  <SisdaiCampoBusqueda
                    id="busqueda-aportes-aprobados"
                    etiqueta=""
                    :catalogo="aprobados"
                    propiedad-busqueda="title"
                    @al-filtrar="(resultado) => (aprobadosFiltrados = resultado)"
                  />
                </ClientOnly>
              </div>
              <div class="columna-4">
                <SisdaiSelector v-model="ordenAportes" etiqueta="Ordenar aportes">
                  <option value="antiguas">Más antiguos primero</option>
                  <option value="recientes">Más recientes primero</option>
                </SisdaiSelector>
              </div>
            </div>
            <div class="grid">
              <div class="columna-16">
                <div class="contenedor-aprobados">
                  <div class="grid">
                    <div v-for="value in aportesOrdenados" :key="value.id" class="columna-5">
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

                        <div class="tarjeta-pie" style="display: block">
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
                              @click="confirmarEliminarAporte(value)"
                            >
                              Eliminar aporte
                            </button>
                          </div>
                        </div>
                        <p
                          class="fondo-color-confirmacion texto-color-confirmacion borde borde-color-confirmacion borde-redondeado-8 p-1"
                          style="position: absolute; top: 0; right: 24px"
                        >
                          Aprobado
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ClientOnly>
        <SisdaiModal ref="modalCrearAporte">
          <template #encabezado> <h2>Selecciona un proyecto</h2> </template>
          <template #cuerpo>
            <ClientOnly>
              <SisdaiSelector
                v-model="seleccionProyectos"
                etiqueta="Proyectos disponibles"
                :es_obligatorio="true"
              >
                <option
                  v-for="proyecto in proyectosDisponibles"
                  :key="proyecto.id"
                  :value="proyecto.id"
                >
                  {{ proyecto.nombre }}
                </option>
              </SisdaiSelector>
            </ClientOnly>
          </template>
          <template #pie>
            <button
              class="boton-secundario boton-chico"
              type="button"
              @click="modalCrearAporte.cerrarModal()"
            >
              Regresar
            </button>
            <button
              class="boton-primario boton-chico"
              type="button"
              :disabled="!seleccionProyectos"
              @click="continuarCrearAporte"
            >
              Siguiente
            </button>
          </template>
        </SisdaiModal>

        <SisdaiModal ref="modalEditarAporte">
          <template #encabezado> <h2>Editar aporte</h2> </template>
          <template #cuerpo>
            <p>
              Este aporte ya fue aprobado. Si realizas cambios, deberá enviarse nuevamente a
              revisión antes de publicarse. ¿Deseas continuar?
            </p>
          </template>
          <template #pie>
            <button
              class="boton-secundario boton-chico"
              type="button"
              @click="modalEditarAporte.cerrarModal()"
            >
              Cancelar
            </button>
            <button class="boton-primario boton-chico" type="button" @click="irAEditarAporte()">
              Continuar con la edición
            </button>
          </template>
        </SisdaiModal>

        <SisdaiModal ref="modalRemoverAporte">
          <template #encabezado> <h2>Eliminar aporte</h2> </template>
          <template #cuerpo>
            <p>
              Este aporte ya fue aprobado. Si lo eliminas, se borrará permanentemente y no podrás
              recuperarlo. ¿Deseas continuar?
            </p>
          </template>
          <template #pie>
            <button
              class="boton-secundario boton-chico"
              type="button"
              @click="modalRemoverAporte.cerrarModal()"
            >
              Cancelar
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
