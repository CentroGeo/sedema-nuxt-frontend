<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const props = defineProps({
  capa: { type: Object, required: true },
});

const emit = defineEmits(['guardado']);

const { gnoxyFetch } = useGnoxyUrl();
const config = useRuntimeConfig();
const { data: userData } = useAuth();

const modal = ref(null);
const narrativa = ref('');
const guardando = ref(false);
const errorGuardado = ref('');

function abrir() {
  narrativa.value = props.capa.narrative || '';
  errorGuardado.value = '';
  modal.value?.abrirModal();
}

defineExpose({ abrir });

async function guardarNarrativa() {
  errorGuardado.value = '';
  guardando.value = true;

  const respuesta = await gnoxyFetch(
    `${config.public.geonodeApi}/panorama-layers/${props.capa.id}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userData.value?.accessToken}`,
      },
      body: JSON.stringify({ narrative: narrativa.value }),
    }
  );

  guardando.value = false;

  if (!respuesta.ok) {
    errorGuardado.value = 'Ocurrió un error al guardar la narrativa.';
    return;
  }

  emit('guardado');
  modal.value?.cerrarModal();
}
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modal" tamanio-modal="modal-grande">
      <template #encabezado>
        <h2 class="m-t-0">Narrativa de la capa: {{ capa.dataset_title || capa.name }}</h2>
      </template>

      <template #cuerpo>
        <p v-if="errorGuardado" class="texto-color-error">{{ errorGuardado }}</p>

        <UiEditorTexto v-model="narrativa" />
      </template>

      <template #pie>
        <div class="flex flex-contenido-final">
          <button type="button" class="boton boton-secundario" @click="modal?.cerrarModal()">
            Cancelar
          </button>
          <button
            type="button"
            class="boton-primario"
            :disabled="guardando"
            @click="guardarNarrativa"
          >
            {{ guardando ? 'Guardando…' : 'Guardar narrativa' }}
          </button>
        </div>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>
