<script setup>
import SisdaiAreaTexto from '@centrogeomx/sisdai-componentes/src/componentes/area-texto/SisdaiAreaTexto.vue';
import SisdaiBotonesRadioGrupo from '@centrogeomx/sisdai-componentes/src/componentes/boton-radio-grupo/SisdaiBotonesRadioGrupo.vue';
import SisdaiBotonRadio from '@centrogeomx/sisdai-componentes/src/componentes/boton-radio/SisdaiBotonRadio.vue';
import SisdaiCampoBase from '@centrogeomx/sisdai-componentes/src/componentes/campo-base/SisdaiCampoBase.vue';
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import SisdaiSelector from '@centrogeomx/sisdai-componentes/src/componentes/selector/SisdaiSelector.vue';
import { useRoute, useRouter } from 'vue-router';

const storeLevantamiento = useLevantamientoStore();

const elementosPrivacidad = [
  {
    name: 'privacidad',
    value: 'publico',
    label: 'Proyecto público',
    description:
      'Cualquier persona puede encontrar el proyecto o cualquier persona con el enlace puede participar',
  },
  {
    name: 'privacidad',
    value: 'privado',
    label: 'Proyecto privado',
    description: 'Solo personas invitadas pueden participar',
  },
];

const permisos = [
  {
    value: 'administrar',
    label: 'Administrar',
    description: 'Control total del proyecto, gestión de usuarios y configuración',
  },
  {
    value: 'revisar',
    label: 'Revisar',
    description: 'Puede revisar, comentar y aprobar cambios en el proyecto',
  },
  {
    value: 'aporta',
    label: 'Participar',
    description: 'Puede contribuir activamente con aportes de información',
  },
  {
    value: 'ver',
    label: 'Solo ver',
    description: 'Solo puede visualizar el contenido sin realizar cambios',
  },
];

const { data } = useAuth();
const route = useRoute();

const participante = reactive({
  email: '',
  rol: '',
  mensaje: '',
});

const enviandoInvitacion = ref(false);
const estadoInvitacion = reactive({
  tipo: '',
  mensaje: '',
});
const erroresInvitacion = reactive({
  email: '',
  rol: '',
  mensaje: '',
});
const guardandoPrivacidad = ref(false);
const estadoPrivacidad = reactive({
  tipo: '',
  mensaje: '',
});
const estadoGestionParticipantes = reactive({
  tipo: '',
  mensaje: '',
});
const procesandoParticipante = ref(false);

const proyecto = ref(null);

watch(
  () => data.value?.user.email,
  async (email) => {
    if (!email) return;

    proyecto.value = await storeLevantamiento.obtenerProyectoPorId(email, route.params.id);
    await storeLevantamiento.obtenerParticipantesPorProyecto(email, route.params.id);
  },
  { immediate: true }
);

const privacidadSeleccionada = ref('privado');

watch(
  () => [proyecto.value?.es_privada, proyecto.value?.status],
  ([esPrivada, status]) => {
    // Conserva la selección pública mientras el proyecto espera aprobación.
    if (status === 'EN REVISION') {
      privacidadSeleccionada.value = 'publico';
    } else if (esPrivada === true) {
      privacidadSeleccionada.value = 'privado';
    } else if (esPrivada === false) {
      privacidadSeleccionada.value = 'publico';
    }
  },
  { immediate: true }
);

const proyectoEnRevision = computed(() => proyecto.value?.status === 'EN REVISION');

const limpiarErrorInvitacion = (campo) => {
  erroresInvitacion[campo] = '';
  if (!Object.values(erroresInvitacion).some(Boolean)) {
    estadoInvitacion.tipo = '';
    estadoInvitacion.mensaje = '';
  }
};

watch(
  () => participante.email,
  (valor) => valor.trim() && limpiarErrorInvitacion('email')
);
watch(
  () => participante.rol,
  (valor) => valor && limpiarErrorInvitacion('rol')
);
watch(
  () => participante.mensaje,
  (valor) => valor.trim() && limpiarErrorInvitacion('mensaje')
);

const agregarParticipante = async () => {
  estadoInvitacion.tipo = '';
  estadoInvitacion.mensaje = '';

  const correo = participante.email.trim();
  erroresInvitacion.email = !correo
    ? 'Ingresa el correo electrónico de la persona participante.'
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
      ? ''
      : 'Ingresa un correo electrónico válido.';
  erroresInvitacion.rol = participante.rol
    ? ''
    : 'Selecciona el permiso de la persona participante.';
  erroresInvitacion.mensaje = participante.mensaje.trim()
    ? ''
    : 'Escribe el mensaje de invitación.';

  if (Object.values(erroresInvitacion).some(Boolean)) {
    estadoInvitacion.tipo = 'error';
    estadoInvitacion.mensaje =
      'Completa el correo, el permiso y el mensaje de invitación antes de continuar.';
    return;
  }

  enviandoInvitacion.value = true;
  try {
    // Envía el permiso canónico y el mensaje personalizado de la invitación.
    await storeLevantamiento.agregarParticipanteProyecto(
      data.value?.user.email,
      correo,
      participante.rol,
      route.params.id,
      participante.mensaje.trim()
    );

    await storeLevantamiento.obtenerParticipantesPorProyecto(
      data.value?.user.email,
      route.params.id
    );
    // Limpia el formulario únicamente después de una invitación exitosa.
    participante.email = '';
    participante.rol = '';
    participante.mensaje = '';
    estadoInvitacion.tipo = 'confirmacion';
    estadoInvitacion.mensaje = 'La persona fue agregada al proyecto correctamente.';
  } catch (error) {
    estadoInvitacion.tipo = 'error';
    estadoInvitacion.mensaje =
      error?.data?.message ||
      'No pudimos agregar a la persona. Revisa los datos e inténtalo nuevamente.';
  } finally {
    enviandoInvitacion.value = false;
  }
};

const formatearFecha = (fechaISO) => {
  const fecha = new Date(fechaISO).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return fecha;
};

const modalCambiarPermiso = ref(null);
const participanteSeleccionado = ref(null);
const permisoSeleccionado = ref('');

const abrirModalCambiarPermiso = (participante) => {
  participanteSeleccionado.value = participante;
  permisoSeleccionado.value = participante.rol;
  modalCambiarPermiso.value.abrirModal();
};

const actualizarPermiso = async () => {
  estadoGestionParticipantes.tipo = '';
  estadoGestionParticipantes.mensaje = '';
  procesandoParticipante.value = true;
  try {
    await storeLevantamiento.actualizarParticipanteProyecto(
      data.value?.user.email,
      permisoSeleccionado.value,
      route.params.id,
      participanteSeleccionado.value.id
    );
    await storeLevantamiento.obtenerParticipantesPorProyecto(
      data.value?.user.email,
      route.params.id
    );
    modalCambiarPermiso.value.cerrarModal();
    estadoGestionParticipantes.tipo = 'confirmacion';
    estadoGestionParticipantes.mensaje = 'El permiso se actualizó correctamente.';
  } catch (error) {
    estadoGestionParticipantes.tipo = 'error';
    estadoGestionParticipantes.mensaje =
      error?.data?.message || 'No pudimos actualizar el permiso. Inténtalo nuevamente.';
  } finally {
    procesandoParticipante.value = false;
  }
};

const modalEliminarPermiso = ref(null);

const abrirModalEliminarPermiso = (participante) => {
  participanteSeleccionado.value = participante;
  modalEliminarPermiso.value.abrirModal();
};
const eliminarPermiso = async () => {
  estadoGestionParticipantes.tipo = '';
  estadoGestionParticipantes.mensaje = '';
  procesandoParticipante.value = true;
  try {
    await storeLevantamiento.eliminarParticipanteProyecto(
      data.value?.user.email,
      route.params.id,
      participanteSeleccionado.value.id
    );
    await storeLevantamiento.obtenerParticipantesPorProyecto(
      data.value?.user.email,
      route.params.id
    );
    modalEliminarPermiso.value.cerrarModal();
    estadoGestionParticipantes.tipo = 'confirmacion';
    estadoGestionParticipantes.mensaje = 'La persona fue eliminada del proyecto.';
  } catch (error) {
    estadoGestionParticipantes.tipo = 'error';
    estadoGestionParticipantes.mensaje =
      error?.data?.message || 'No pudimos eliminar a la persona. Inténtalo nuevamente.';
  } finally {
    procesandoParticipante.value = false;
  }
};

const modalSolicitarAprobacion = ref(null);

const solicitarAprobacion = async () => {
  if (proyectoEnRevision.value || guardandoPrivacidad.value) return;

  const payload = {
    status: 'EN REVISION',
    user_id: data.value?.user.email,
  };

  estadoPrivacidad.tipo = '';
  estadoPrivacidad.mensaje = '';
  guardandoPrivacidad.value = true;
  try {
    await storeLevantamiento.actualizarStatusProyecto(payload, route.params.id);
    proyecto.value.status = 'EN REVISION';
    proyecto.value.es_privada = true;
    estadoPrivacidad.tipo = 'confirmacion';
    estadoPrivacidad.mensaje = 'El proyecto fue enviado a revisión para solicitar su publicación.';
    modalSolicitarAprobacion.value.abrirModal();
  } catch (error) {
    estadoPrivacidad.tipo = 'error';
    estadoPrivacidad.mensaje =
      error?.data?.message || 'No pudimos enviar el proyecto a revisión. Inténtalo nuevamente.';
  } finally {
    guardandoPrivacidad.value = false;
  }
};

const router = useRouter();

const irAMisProyectos = () => {
  router.push('/levantamiento/proyectos/mis-proyectos');
};

const modalProyectoPrivado = ref(null);

const actualizarProyecto = async () => {
  // La visibilidad pública requiere revisión; la privada se guarda directamente.
  if (privacidadSeleccionada.value === 'publico') {
    await solicitarAprobacion();
    return;
  }

  estadoPrivacidad.tipo = '';
  estadoPrivacidad.mensaje = '';
  guardandoPrivacidad.value = true;
  try {
    await storeLevantamiento.actualizarFormularioParticipantesProyecto(
      { isPrivate: true, user_id: data.value?.user.email },
      route.params.id
    );
    proyecto.value.es_privada = true;
    proyecto.value.status = 'SIN EVALUAR';
    estadoPrivacidad.tipo = 'confirmacion';
    estadoPrivacidad.mensaje = 'La privacidad del proyecto se guardó correctamente.';
    modalProyectoPrivado.value.abrirModal();
  } catch (error) {
    estadoPrivacidad.tipo = 'error';
    estadoPrivacidad.mensaje =
      error?.data?.message ||
      'No pudimos cambiar la privacidad del proyecto. Inténtalo nuevamente.';
  } finally {
    guardandoPrivacidad.value = false;
  }
};

defineExpose({
  actualizarProyecto,
});
</script>

<template>
  <div
    v-if="!storeLevantamiento.existenParticipantes"
    class="columna-8 texto-centrado fondo-color-acento p-2 borde-redondeado-8 contenido-participantes"
  >
    <span class="pictograma-grupo pictograma-grande texto-color-acento"></span>
    <h6 class="m-t-0 m-b-1 texto-color-secundario">Invita participantes</h6>
    <p class="m-t-0 m-b-1">
      Define si tu proyecto es publico o privado e invita a otras personas a participar con aportes.
    </p>
    <div class="texto-centrado">
      <button
        class="boton-primario boton boton-chico"
        aria-label="Agregar participantes"
        @click="storeLevantamiento.alternarParticipantes"
      >
        Agregar participantes
      </button>
    </div>
  </div>

  <div v-else class="columna-10">
    <h6 class="m-b-3">Selecciona la privacidad de tu proyecto</h6>
    <div
      v-if="estadoPrivacidad.mensaje"
      class="mensaje-invitacion flex borde borde-redondeado-8 p-2 m-b-3"
      :class="
        estadoPrivacidad.tipo === 'confirmacion'
          ? 'texto-color-confirmacion fondo-color-confirmacion borde-color-confirmacion'
          : 'texto-color-error fondo-color-error borde-color-error'
      "
      :role="estadoPrivacidad.tipo === 'error' ? 'alert' : 'status'"
      aria-live="polite"
    >
      <span
        :class="
          estadoPrivacidad.tipo === 'confirmacion' ? 'pictograma-aprobado' : 'pictograma-alerta'
        "
        class="pictograma-mediano"
        aria-hidden="true"
      />
      <p class="m-y-0">{{ estadoPrivacidad.mensaje }}</p>
    </div>
    <div class="flex m-b-3">
      <template v-for="elemento in elementosPrivacidad" :key="elemento.value">
        <levantamiento-radio-boton
          v-model="privacidadSeleccionada"
          :name="elemento.name"
          :value="elemento.value"
          :label="elemento.label"
          :description="elemento.description"
        />
      </template>
    </div>
    <div v-if="privacidadSeleccionada === 'publico'">
      <div
        class="privacidad-mensaje p-x-3 p-y-2 borde borde-color-alerta borde-redondeado-20 m-b-3 fondo-color-alerta texto-color-alerta"
      >
        <div class="flex mensaje-contenido">
          <div class="mensaje-titulo m-b-1">
            <span class="pictograma-alerta" />
            <b class="m-l-1">Los proyectos públicos requieren aprobación</b>
          </div>
          <div class="texto-tamanio-2">
            Al hacer público un proyecto será visible para todas las personas, con el fin de
            asegurar el correcto funcionamiento del proyecto y la calidad de los aportes, un
            proyecto configurado como “público” debe ser aprobado por un administrador
          </div>
        </div>
      </div>
      <div class="flex flex-contenido-final">
        <button
          class="boton-primario boton-chico"
          aria-label="Solicitar aprobación"
          :disabled="proyectoEnRevision || guardandoPrivacidad"
          @click="solicitarAprobacion"
        >
          {{ proyectoEnRevision ? 'Proyecto en revisión' : 'Solicitar aprobación' }}
        </button>
      </div>
    </div>

    <div>
      <h6>Invita por correo electrónico</h6>
      <p>Asigna los niveles de acceso y edición de cada persona usuaria en el proyecto.</p>
      <div class="grid m-b-3">
        <template v-for="permiso in permisos" :key="permiso.value">
          <div class="columna-4 permiso-container p-2 borde-redondeado-8 fondo-color-neutro">
            <span class="m-b-minimo texto-tamanio-3">{{ permiso.label }}</span>
            <span class="texto-tamanio-2">{{ permiso.description }}</span>
          </div>
        </template>
      </div>
      <div class="formulario-invitacion m-b-3">
        <div
          v-if="estadoInvitacion.mensaje"
          class="mensaje-invitacion flex borde borde-redondeado-8 p-2 m-b-3"
          :class="
            estadoInvitacion.tipo === 'confirmacion'
              ? 'texto-color-confirmacion fondo-color-confirmacion borde-color-confirmacion'
              : 'texto-color-error fondo-color-error borde-color-error'
          "
          :role="estadoInvitacion.tipo === 'error' ? 'alert' : 'status'"
          :aria-live="estadoInvitacion.tipo === 'error' ? 'assertive' : 'polite'"
        >
          <span
            :class="
              estadoInvitacion.tipo === 'confirmacion' ? 'pictograma-aprobado' : 'pictograma-alerta'
            "
            class="pictograma-mediano"
            aria-hidden="true"
          />
          <div>
            <strong>
              {{
                estadoInvitacion.tipo === 'confirmacion'
                  ? 'Invitación registrada'
                  : 'Revisa la invitación'
              }}
            </strong>
            <p class="m-y-0">{{ estadoInvitacion.mensaje }}</p>
          </div>
        </div>
        <ClientOnly>
          <div class="flex privacidad-acciones m-b-3">
            <div class="privacidad-input">
              <SisdaiCampoBase
                v-model="participante.email"
                etiqueta="Correo electrónico del participante"
                ejemplo="Ingresa un correo electrónico"
                tipo="email"
                :es_etiqueta_visible="true"
                :es_obligatorio="true"
                :texto_error="erroresInvitacion.email"
              />
            </div>
            <div class="privacidad-input">
              <SisdaiSelector
                v-model="participante.rol"
                etiqueta="Permiso"
                :es_obligatorio="true"
                :texto_error="erroresInvitacion.rol"
              >
                <option value="" disabled>Selecciona un permiso</option>
                <option value="administrar">Administrar</option>
                <option value="revisar">Revisar</option>
                <option value="aporta">Participar</option>
                <option value="ver">Solo ver</option>
              </SisdaiSelector>
            </div>
          </div>
          <SisdaiAreaTexto
            v-model="participante.mensaje"
            etiqueta="Mensaje para la invitación"
            ejemplo="Escribe un mensaje para la persona invitada"
            :es_etiqueta_visible="true"
            :es_obligatorio="true"
            :texto_error="erroresInvitacion.mensaje"
            texto-ayuda="Explica brevemente por qué deseas invitar a esta persona."
            maxlength="500"
            class="m-b-3"
          />
        </ClientOnly>
        <div class="flex flex-contenido-final">
          <button
            class="boton-primario boton boton-chico"
            :disabled="enviandoInvitacion"
            @click="agregarParticipante"
          >
            {{ enviandoInvitacion ? 'Registrando invitación…' : 'Agregar participante' }}
          </button>
        </div>
      </div>
      <div>
        <h6>Permisos asignados</h6>
        <div
          v-if="estadoGestionParticipantes.mensaje"
          class="mensaje-invitacion flex borde borde-redondeado-8 p-2 m-b-3"
          :class="
            estadoGestionParticipantes.tipo === 'confirmacion'
              ? 'texto-color-confirmacion fondo-color-confirmacion borde-color-confirmacion'
              : 'texto-color-error fondo-color-error borde-color-error'
          "
          :role="estadoGestionParticipantes.tipo === 'error' ? 'alert' : 'status'"
          aria-live="polite"
        >
          <span
            :class="
              estadoGestionParticipantes.tipo === 'confirmacion'
                ? 'pictograma-aprobado'
                : 'pictograma-alerta'
            "
            class="pictograma-mediano"
            aria-hidden="true"
          />
          <p class="m-y-0">{{ estadoGestionParticipantes.mensaje }}</p>
        </div>
        <div class="flex usuarios-asignados">
          <div
            v-for="i_participante in storeLevantamiento.participantes"
            :key="i_participante.id"
            class="correo-participante borde-redondeado-8 fondo-color-acento p-2 flex flex-contenido-separado"
          >
            <div>
              <div class="m-b-minimo texto-tamanio-3 asignado-email">
                {{ i_participante.correo }}
              </div>
              <div class="flex">
                <span
                  class="p-x-1 p-y-minimo borde borde-color-acento borde-redondeado-8 texto-color-secundario"
                  >{{ i_participante.rol }}</span
                >
                <span class="asignado-fecha texto-tamanio-2"
                  >Asignado el {{ formatearFecha(i_participante.created_date) }}</span
                >
              </div>
            </div>
            <div class="flex">
              <button
                class="boton-secundario boton boton-chico"
                @click="abrirModalCambiarPermiso(i_participante)"
              >
                Cambiar permiso
              </button>
              <button
                class="boton-secundario boton boton-chico"
                @click="abrirModalEliminarPermiso(i_participante)"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ClientOnly>
      <SisdaiModal ref="modalCambiarPermiso">
        <template #encabezado><h3>Cambiar permiso</h3></template>
        <template #cuerpo>
          <p class="m-t-0 m-b-3">
            Selecciona los permisos que deseas asignarle a esta persona usuaria
          </p>
          <SisdaiBotonesRadioGrupo leyenda="" :es_vertical="true">
            <SisdaiBotonRadio
              v-model="permisoSeleccionado"
              etiqueta="Administrar"
              value="administrar"
              name="permiso-usuario"
            />
            <SisdaiBotonRadio
              v-model="permisoSeleccionado"
              etiqueta="Revisar"
              value="revisar"
              name="permiso-usuario"
            />
            <SisdaiBotonRadio
              v-model="permisoSeleccionado"
              etiqueta="Participar"
              value="aporta"
              name="permiso-usuario"
            />
            <SisdaiBotonRadio
              v-model="permisoSeleccionado"
              etiqueta="Solo ver"
              value="ver"
              name="permiso-usuario"
            />
          </SisdaiBotonesRadioGrupo>
        </template>
        <template #pie>
          <button
            type="button"
            class="boton-secundario boton-chico"
            @click="modalCambiarPermiso?.cerrarModal()"
          >
            Cerrar
          </button>
          <button
            type="button"
            class="boton-primario boton-chico"
            :disabled="procesandoParticipante"
            @click="actualizarPermiso"
          >
            {{ procesandoParticipante ? 'Guardando…' : 'Asignar permiso' }}
          </button>
        </template>
      </SisdaiModal>

      <SisdaiModal ref="modalEliminarPermiso">
        <template #encabezado><h3>Eliminar permiso</h3></template>
        <template #cuerpo>
          <p class="m-t-0 m-b-3">
            ¿Deseas eliminar los permisos de esta persona usuaria? después de realizar esta acción
            ya no podrá participar en tu proyecto hasta que sea invitada nuevamente.
          </p>
        </template>
        <template #pie>
          <button
            type="button"
            class="boton-secundario boton-chico"
            @click="modalEliminarPermiso?.cerrarModal()"
          >
            Regresar
          </button>
          <button
            type="button"
            class="boton-primario boton-chico"
            :disabled="procesandoParticipante"
            @click="eliminarPermiso"
          >
            {{ procesandoParticipante ? 'Eliminando…' : 'Confirmar' }}
          </button>
        </template>
      </SisdaiModal>

      <SisdaiModal ref="modalSolicitarAprobacion">
        <template #encabezado><h3>Proyecto enviado a aprobación</h3></template>
        <template #cuerpo>
          <p class="m-t-0 m-b-3">
            Tu proyecto se ha enviado a aprobación para hacerlo público, te enviaremos un correo
            electrónico cuando se haya revisado.
          </p>
        </template>
        <template #pie>
          <button
            type="button"
            class="boton-secundario boton-chico"
            @click="modalSolicitarAprobacion?.cerrarModal()"
          >
            Cerrar
          </button>
          <button type="button" class="boton-primario boton-chico" @click="irAMisProyectos">
            Ir a Mis proyectos
          </button>
        </template>
      </SisdaiModal>

      <SisdaiModal ref="modalProyectoPrivado">
        <template #encabezado><h3>Proyecto privado</h3></template>
        <template #cuerpo>
          <p class="m-t-0 m-b-3">Tu proyecto se ha cambiado a privado.</p>
        </template>
        <template #pie>
          <button
            type="button"
            class="boton-secundario boton-chico"
            @click="modalProyectoPrivado?.cerrarModal()"
          >
            Cerrar
          </button>
          <button type="button" class="boton-primario boton-chico" @click="irAMisProyectos">
            Ir a Mis proyectos
          </button>
        </template>
      </SisdaiModal>
    </ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
.contenido-participantes {
  align-self: center;
}

.privacidad-mensaje {
  gap: 0;

  .mensaje-contenido {
    gap: 0;
  }
}

.permiso-container {
  display: flex;
  flex-direction: column;

  .texto-tamanio-3 {
    font-weight: 500;
  }

  .texto-tamanio-2 {
    font-weight: 400;
  }
}

.privacidad-acciones {
  .privacidad-input {
    flex: 1;
  }

  button {
    align-self: flex-end;
  }
}

.usuarios-asignados {
  flex-direction: column;

  button {
    align-self: center;
  }
}

.asignado-email {
  font-weight: 500;
}

.asignado-fecha {
  align-self: flex-end;
}

.mensaje-invitacion {
  align-items: flex-start;
  gap: 0.75rem;
}

.mensaje-invitacion p {
  margin-top: 0.25rem;
}

.formulario-invitacion :deep(.formulario-obligatoriedad) {
  display: none;
}
</style>
