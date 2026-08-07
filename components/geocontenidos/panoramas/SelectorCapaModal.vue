<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

defineProps({
  capas: { type: Array, default: () => [] },
  titulo: { type: String, default: 'Selecciona una capa' },
});

const emit = defineEmits(['elegir']);

const modal = ref(null);

function abrir() {
  modal.value?.abrirModal();
}

defineExpose({ abrir });

function elegir(capa) {
  emit('elegir', capa);
  modal.value?.cerrarModal();
}
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modal">
      <template #encabezado>
        <h2 class="m-t-0">{{ titulo }}</h2>
      </template>

      <template #cuerpo>
        <p v-if="!capas.length" class="texto-secundario">
          Esta temática no tiene capas todavía. Agrega capas primero.
        </p>

        <ul v-else class="lista-sin-estilo">
          <li v-for="capa in capas" :key="capa.id" class="m-b-2">
            <button
              type="button"
              class="boton boton-secundario"
              style="width: 100%; text-align: left"
              @click="elegir(capa)"
            >
              {{ capa.dataset_title || capa.name }}
            </button>
          </li>
        </ul>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>
