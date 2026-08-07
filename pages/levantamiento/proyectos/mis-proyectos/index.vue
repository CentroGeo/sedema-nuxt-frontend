<script setup>
import SisdaiAreaTexto from '@centrogeomx/sisdai-componentes/src/componentes/area-texto/SisdaiAreaTexto.vue';
import SisdaiBotonesRadioGrupo from '@centrogeomx/sisdai-componentes/src/componentes/boton-radio-grupo/SisdaiBotonesRadioGrupo.vue';
import SisdaiBotonRadio from '@centrogeomx/sisdai-componentes/src/componentes/boton-radio/SisdaiBotonRadio.vue';
import SisdaiCampoBase from '@centrogeomx/sisdai-componentes/src/componentes/campo-base/SisdaiCampoBase.vue';
import SisdaiCampoBusqueda from '@centrogeomx/sisdai-componentes/src/componentes/campo-busqueda/SisdaiCampoBusqueda.vue';
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import SisdaiSelector from '@centrogeomx/sisdai-componentes/src/componentes/selector/SisdaiSelector.vue';
import { onBeforeUnmount, ref } from 'vue';

definePageMeta({
  middleware: 'auth',
});

const { data } = useAuth();
const config = useRuntimeConfig();

const storeLevantamiento = useLevantamientoStore();

const modalCrearProyecto = ref(null);
const imagenPreview = ref(null);
const imagenProyecto = ref(null);
const reinicioCargaImagen = ref(0);
const errorImagen = ref('');
const errorCrearProyecto = ref('');
const tituloErrorCrearProyecto = ref('Revisa el formulario');
const creandoProyecto = ref(false);

const irACompartirProyecto = (idProyecto) => {
  navigateTo({
    path: `/levantamiento/proyectos/mis-proyectos/${idProyecto}`,
    query: { seccion: 'participantes-permisos' },
  });
};

const erroresNuevoProyecto = reactive({
  nombre: '',
  institucion: '',
  categoria: '',
  objetivo: '',
  instrucciones: '',
});

async function guardarArchivo(archivo) {
  if (!['image/jpeg', 'image/png'].includes(archivo?.type)) {
    imagenProyecto.value = null;
    errorImagen.value = 'Selecciona una imagen en formato JPG o PNG.';
    return;
  }
  if (archivo.size > 5 * 1024 * 1024) {
    imagenProyecto.value = null;
    errorImagen.value = 'La imagen no debe superar los 5 MB.';
    return;
  }

  // Conserva la imagen seleccionada y limpia el error de campo obligatorio.
  imagenProyecto.value = archivo;
  errorImagen.value = '';
  if (!Object.values(erroresNuevoProyecto).some(Boolean)) errorCrearProyecto.value = '';
}

const handleCrearProyecto = async () => {
  errorCrearProyecto.value = '';
  tituloErrorCrearProyecto.value = 'Revisa el formulario';

  erroresNuevoProyecto.nombre = nuevoProyecto.nombre.trim()
    ? ''
    : 'Ingresa el nombre del proyecto.';
  erroresNuevoProyecto.institucion = nuevoProyecto.institucion
    ? ''
    : 'Selecciona la institución a la que pertenece el proyecto.';
  erroresNuevoProyecto.categoria = nuevoProyecto.categoria
    ? ''
    : 'Selecciona una categoría para el proyecto.';
  erroresNuevoProyecto.objetivo = nuevoProyecto.objetivo.trim()
    ? ''
    : 'Describe el objetivo del proyecto.';
  erroresNuevoProyecto.instrucciones = nuevoProyecto.instrucciones.trim()
    ? ''
    : 'Escribe las instrucciones para las personas participantes.';

  // Evita enviar el formulario cuando falta la imagen de identificación.
  errorImagen.value = imagenProyecto.value
    ? ''
    : 'Agrega una imagen de identificación para crear el proyecto.';

  if (Object.values(erroresNuevoProyecto).some(Boolean) || errorImagen.value) {
    errorCrearProyecto.value =
      'Completa los campos señalados como obligatorios antes de crear el proyecto.';
    return;
  }

  const formData = new FormData();

  Object.entries(nuevoProyecto).forEach(([key, value]) => {
    formData.append(key, value);
  });

  formData.append('id_propietario', data.value?.user.email);
  formData.append('lider', data.value?.user.name);

  // Agrega una marca de tiempo para evitar colisiones entre nombres de archivo.
  const timestamp = Date.now();
  const extension = imagenProyecto.value.name.split('.').pop();
  const baseName = imagenProyecto.value.name.replace(`.${extension}`, '');
  const nombreImagen = `${baseName}_${timestamp}.${extension}`;

  formData.append('image', imagenProyecto.value, nombreImagen);

  creandoProyecto.value = true;
  try {
    await storeLevantamiento.guardarProyecto(formData);
    modalCrearProyecto.value.cerrarModal();
    Object.assign(nuevoProyecto, {
      nombre: '',
      institucion: '',
      categoria: '',
      objetivo: '',
      instrucciones: '',
    });
    imagenProyecto.value = null;
    imagenPreview.value = null;
    reinicioCargaImagen.value += 1;
  } catch (error) {
    tituloErrorCrearProyecto.value = 'No pudimos crear el proyecto';
    errorCrearProyecto.value =
      error?.data?.message ||
      'No pudimos crear el proyecto. Revisa la información e inténtalo nuevamente.';
  } finally {
    creandoProyecto.value = false;
  }
};

const nuevoProyecto = reactive({
  nombre: '',
  institucion: '',
  categoria: '',
  objetivo: '',
  instrucciones: '',
});

watch(
  nuevoProyecto,
  (valores) => {
    Object.keys(erroresNuevoProyecto).forEach((campo) => {
      if (String(valores[campo] || '').trim()) erroresNuevoProyecto[campo] = '';
    });

    if (!Object.values(erroresNuevoProyecto).some(Boolean) && !errorImagen.value) {
      errorCrearProyecto.value = '';
    }
  },
  { deep: true }
);

const proyectosFiltrado = ref([]);

onMounted(async () => {
  await storeLevantamiento.obtenerMisProyectos(data.value?.user.email);
  proyectosFiltrado.value = storeLevantamiento.proyectos;
});

const modalDescargarDatos = ref(null);
const modalEliminarProyecto = ref(null);
const proyectoSeleccionado = ref(null);

const abrirModalEliminarProyecto = (proyecto) => {
  proyectoSeleccionado.value = proyecto;
  modalEliminarProyecto.value.abrirModal();
};

const modalProyectoEliminado = ref(null);
let timeoutModal = null;

const eliminarProyecto = async () => {
  await storeLevantamiento.eliminarProyecto(data.value?.user.email, proyectoSeleccionado.value.id);
  await storeLevantamiento.obtenerMisProyectos(data.value?.user.email);
  modalEliminarProyecto.value.cerrarModal();

  modalProyectoEliminado.value.abrirModal();
  if (timeoutModal) clearTimeout(timeoutModal);
  timeoutModal = setTimeout(() => {
    modalProyectoEliminado.value.cerrarModal();
    timeoutModal = null;
  }, 3000);
};

onBeforeUnmount(() => {
  if (timeoutModal) clearTimeout(timeoutModal);
});
</script>
<template>
  <UiLayoutPaneles :estado-colapable="storeLevantamiento.catalogoColapsado">
    <template #catalogo>
      <LevantamientoListaMenuLateral />
    </template>

    <template #visualizador>
      <main id="principal" class="principal-levantamiento flex contenedor m-b-10 m-t-3">
        <LevantamientoMenuSecundario
          :opciones="[
            { texto: 'Proyectos públicos', ruta: '/levantamiento/proyectos' },
            {
              texto: 'Mis proyectos',
              ruta: '/levantamiento/proyectos/mis-proyectos',
              notificacion: false,
            },
            {
              texto: 'Proyectos compartidos',
              ruta: '/levantamiento/proyectos/proyectos-compartidos',
              notificacion: true,
            },
          ]"
        />

        <div class="flex titulo-contenido-levantamiento m-b-3">
          <h2>Mis proyectos</h2>
          <UiNumeroElementos
            :numero="storeLevantamiento.obtenerTotalProyectos()"
            etiqueta="Proyectos"
          />
        </div>
        <div
          v-if="!storeLevantamiento.existenProyectos"
          class="flex texto-centrado contenido-levantamiento"
        >
          <div class="columna-4"></div>
          <div class="columna-8 fondo-color-acento p-2 borde-redondeado-8">
            <span class="pictograma-documento pictograma-grande texto-color-acento"></span>
            <h6 class="m-t-0 m-b-1 texto-color-secundario">
              Crea un proyecto y empieza a recibir aportes
            </h6>
            <p class="m-t-0 m-b-1">
              Define la información general de tu proyecto, decide quiénes participarán y diseña un
              formulario para empezar a recibir aportes
            </p>
            <div class="texto-centrado">
              <button
                class="boton-primario boton-pictograma"
                @click="modalCrearProyecto.abrirModal()"
              >
                Crear un proyecto
                <span class="pictograma-agregar" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div class="columna-4"></div>
        </div>
        <div v-else>
          <div class="grid m-b-3">
            <div class="columna-8">
              <ClientOnly>
                <label for="buscadoravanzado">Buscador</label>
                <SisdaiCampoBusqueda
                  etiqueta=""
                  :catalogo="storeLevantamiento.proyectos"
                  propiedad-busqueda="nombre"
                  @al-filtrar="(r) => (proyectosFiltrado = r)"
                />
              </ClientOnly>
            </div>
            <div class="columna-8 flex flex-contenido-final">
              <button
                class="boton-primario boton-pictograma boton-crear-proyecto"
                @click="modalCrearProyecto.abrirModal()"
              >
                Crear un proyecto
                <span class="pictograma-agregar" aria-hidden="true"></span>
              </button>
            </div>
          </div>
          <div class="grid">
            <div
              v-for="proyecto in proyectosFiltrado"
              :key="proyecto.id"
              class="columna-4 fondo-color-neutro p-3 borde-redondeado-20"
            >
              <img
                class="icono-proyecto m-b-minimo color-invertir"
                :src="`${config.app.baseURL}img/icono_sigic.png`"
              />
              <div class="m-b-minimo texto-tamanio-4 nombre-proyecto">
                <b>{{ proyecto.nombre }}</b>
              </div>
              <div class="m-b-minimo texto-color-secundario">{{ proyecto.institucion }}</div>
              <div class="m-b-minimo texto-color-secundario">{{ proyecto.lider }}</div>
              <UiNumeroElementos :numero="proyecto.num_aportaciones" etiqueta="Aportes" />
              <NuxtLink
                class="boton boton-primario boton-chico boton-accion-proyecto m-b-1"
                aria-label="Configurar proyecto"
                :to="`/levantamiento/proyectos/mis-proyectos/${proyecto.id}`"
              >
                Configurar proyecto
              </NuxtLink>
              <div class="flex flex-contenido-final proyecto-acciones">
                <button
                  class="boton-pictograma boton-sin-contenedor-primario"
                  type="button"
                  aria-label="Compartir proyecto"
                  @click="irACompartirProyecto(proyecto.id)"
                >
                  <span class="pictograma-compartir" aria-hidden="true"></span>
                </button>
                <button
                  class="boton-pictograma boton-sin-contenedor-primario"
                  @click="modalDescargarDatos.abrirModal()"
                >
                  <span class="pictograma-archivo-descargar" aria-hidden="true"></span>
                </button>
                <button
                  class="boton-pictograma boton-sin-contenedor-primario"
                  @click="abrirModalEliminarProyecto(proyecto)"
                >
                  <span class="pictograma-eliminar" aria-hidden="true"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ClientOnly>
        <SisdaiModal ref="modalCrearProyecto" class="modal-grande">
          <template #encabezado> <h3>Nuevo proyecto</h3> </template>
          <template #cuerpo>
            <div class="formulario-creacion p-3">
              <div
                v-if="errorCrearProyecto"
                class="mensaje-formulario flex fondo-color-error texto-color-error borde borde-color-error borde-redondeado-8 p-2 m-b-3"
                role="alert"
                aria-live="assertive"
              >
                <span class="pictograma-alerta pictograma-mediano" aria-hidden="true" />
                <div>
                  <strong>{{ tituloErrorCrearProyecto }}</strong>
                  <p class="m-y-0">{{ errorCrearProyecto }}</p>
                </div>
              </div>
              <ClientOnly>
                <SisdaiCampoBase
                  v-model="nuevoProyecto.nombre"
                  etiqueta="Nombre del proyecto"
                  ejemplo="Escribe el nombre de tu proyecto"
                  :es_etiqueta_visible="true"
                  :es_obligatorio="true"
                  :texto_error="erroresNuevoProyecto.nombre"
                  class="m-b-2"
                  :class="{
                    'campo-con-error': erroresNuevoProyecto.nombre,
                    'texto-color-error': erroresNuevoProyecto.nombre,
                  }"
                />
                <SisdaiSelector
                  v-model="nuevoProyecto.institucion"
                  etiqueta="Institución a la que pertenece"
                  instruccional="Selecciona una institución"
                  :es_obligatorio="true"
                  :texto_error="erroresNuevoProyecto.institucion"
                  class="m-b-2"
                  :class="{
                    'campo-con-error': erroresNuevoProyecto.institucion,
                    'texto-color-error': erroresNuevoProyecto.institucion,
                  }"
                >
                  <option value="inst_1">Institución Uno</option>
                  <option value="inst_2">Institución Dos</option>
                  <option value="inst_3">Institución Tres</option>
                </SisdaiSelector>
                <SisdaiSelector
                  v-model="nuevoProyecto.categoria"
                  etiqueta="Categoría del proyecto"
                  instruccional="Selecciona una categoría"
                  :es_obligatorio="true"
                  :texto_error="erroresNuevoProyecto.categoria"
                  class="m-b-2"
                  :class="{
                    'campo-con-error': erroresNuevoProyecto.categoria,
                    'texto-color-error': erroresNuevoProyecto.categoria,
                  }"
                >
                  <option value="cat_1">Categoría Uno</option>
                  <option value="cat_2">Categoría Dos</option>
                  <option value="cat_3">Categoría Tres</option>
                </SisdaiSelector>
                <SisdaiAreaTexto
                  v-model="nuevoProyecto.objetivo"
                  etiqueta="Objetivo del proyecto"
                  ejemplo="Describe brevemente tu proyecto"
                  :es_etiqueta_visible="true"
                  :es_obligatorio="true"
                  :texto_error="erroresNuevoProyecto.objetivo"
                  class="m-b-2"
                  :class="{
                    'campo-con-error': erroresNuevoProyecto.objetivo,
                    'texto-color-error': erroresNuevoProyecto.objetivo,
                  }"
                />
                <SisdaiAreaTexto
                  v-model="nuevoProyecto.instrucciones"
                  etiqueta="Instrucciones para participantes"
                  ejemplo="Indica cómo deben participar y qué información deben aportar"
                  :es_etiqueta_visible="true"
                  :es_obligatorio="true"
                  :texto_error="erroresNuevoProyecto.instrucciones"
                  class="m-b-2"
                  :class="{
                    'campo-con-error': erroresNuevoProyecto.instrucciones,
                    'texto-color-error': erroresNuevoProyecto.instrucciones,
                  }"
                />
                <div class="campo-imagen" :class="{ 'campo-imagen-error': errorImagen }">
                  <label> Imagen de identificación del proyecto </label>
                  <p class="formulario-ayuda m-t-0">
                    Selecciona una imagen JPG o PNG de máximo 5 MB.
                  </p>
                  <IaElementoDragNdDrop
                    :key="reinicioCargaImagen"
                    ref="dragNdDrop"
                    :imagen-inicial="imagenPreview"
                    @pasar-archivo="(i) => guardarArchivo(i)"
                  />
                </div>
                <p
                  v-if="errorImagen"
                  class="mensaje-campo texto-color-error fondo-color-error borde borde-color-error borde-redondeado-8 p-1 m-t-1"
                  role="alert"
                  aria-live="assertive"
                >
                  <span class="pictograma-alerta m-r-1" aria-hidden="true" />
                  {{ errorImagen }}
                </p>
              </ClientOnly>
            </div>
          </template>
          <template #pie>
            <button
              class="boton-primario boton-chico"
              type="button"
              :disabled="creandoProyecto"
              @click="handleCrearProyecto"
            >
              {{ creandoProyecto ? 'Creando proyecto…' : 'Crear proyecto' }}
            </button>
            <button
              class="boton-secundario boton-chico"
              type="button"
              @click="modalCrearProyecto.cerrarModal()"
            >
              Regresar
            </button>
          </template>
        </SisdaiModal>

        <SisdaiModal ref="modalDescargarDatos">
          <template #encabezado><h3>Descargar datos</h3></template>
          <template #cuerpo>
            <p class="m-t-0 m-b-3">Selecciona el formato en el cual deseas descargar los datos:</p>
            <SisdaiBotonesRadioGrupo leyenda="" :es_vertical="true">
              <SisdaiBotonRadio
                etiqueta="Tabulado de datos .csv"
                value="csv"
                name="modo-descarga"
              />
              <SisdaiBotonRadio etiqueta="Reporte en PDF" value="pdf" name="modo-descarga" />
            </SisdaiBotonesRadioGrupo>
          </template>
          <template #pie>
            <button
              type="button"
              class="boton-secundario boton-chico"
              @click="modalDescargarDatos?.cerrarModal()"
            >
              Cerrar
            </button>
            <button type="button" class="boton-primario boton-chico">Descargar</button>
          </template>
        </SisdaiModal>

        <SisdaiModal ref="modalEliminarProyecto">
          <template #encabezado><h3>Eliminar proyecto</h3></template>
          <template #cuerpo>
            <p class="m-t-0 m-b-3">
              ¿Deseas eliminar este proyecto? Toda la información, participantes y formularios se
              perderán y no se podrán recuperar.
            </p>
          </template>
          <template #pie>
            <button
              type="button"
              class="boton-secundario boton-chico"
              @click="modalEliminarProyecto?.cerrarModal()"
            >
              Regresar
            </button>
            <button type="button" class="boton-primario boton-chico" @click="eliminarProyecto">
              Eliminar proyecto
            </button>
          </template>
        </SisdaiModal>

        <SisdaiModal id="proyectoEliminadoModal" ref="modalProyectoEliminado">
          <template #encabezado><h3>Proyecto eliminado</h3></template>
          <template #cuerpo>
            <div
              class="fondo-color-confirmacion p-x-2 p-y-1 borde borde-color-confirmacion borde-redondeado-20"
            >
              <p class="texto-color-confirmacion">
                <span class="pictograma-aprobado" />
                El proyecto y toda su información relacionada se ha eliminado con éxito.
              </p>
            </div>
          </template>
        </SisdaiModal>
      </ClientOnly>
    </template>
  </UiLayoutPaneles>
</template>

<style lang="scss" scoped>
.principal-levantamiento {
  flex-direction: column;
  gap: 0;
}

.nombre-proyecto {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 22.5px;
  min-height: calc(22.5px * 3);
}

.titulo-contenido-levantamiento {
  align-items: center;
}

.contenido-levantamiento {
  flex: 1;
  align-items: center;
}

.boton-crear-proyecto {
  align-self: flex-end;
}

.icono-proyecto {
  width: 40px;
  height: 40px;
}

.boton-accion-proyecto {
  width: 100%;
  justify-content: center;
}

.proyecto-acciones {
  gap: 8px;
}

.mensaje-formulario {
  align-items: flex-start;
  gap: 0.75rem;
}

.mensaje-formulario p {
  margin-top: 0.25rem;
}

.campo-imagen-error {
  border-left: 4px solid currentColor;
  color: var(--color-error, inherit);
  padding-left: 1rem;
}

.mensaje-campo {
  display: flex;
  align-items: center;
}

.campo-con-error :deep(input),
.campo-con-error :deep(select),
.campo-con-error :deep(textarea) {
  border-color: currentColor;
  color: inherit;
}

.campo-con-error :deep(.formulario-ayuda) {
  color: inherit;
}

.formulario-creacion :deep(.formulario-obligatoriedad) {
  display: none;
}
</style>

<style lang="scss">
dialog#proyectoEliminadoModal.modal .modal-contenedor .modal-cerrar {
  display: none;
}
</style>
