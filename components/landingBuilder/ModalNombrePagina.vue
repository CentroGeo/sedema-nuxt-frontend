<script setup>
import SisdaiCampoBase from '@centrogeomx/sisdai-componentes/src/componentes/campo-base/SisdaiCampoBase.vue';
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

// Uso: const nombre = await modalNombrePagina.value.abrir(); // string o null si se cancela

const modal = ref(null);
const nombre = ref('');
const error = ref('');

let resolver = null;
let dialogEl = null;

function alCerrarDialogo() {
  if (resolver) {
    resolver(null);
    resolver = null;
  }
}

function abrir() {
  nombre.value = '';
  error.value = '';
  modal.value?.abrirModal();

  nextTick(() => {
    if (!dialogEl) {
      const id = modal.value?.id_aleatorio;
      dialogEl = id ? document.getElementById(id) : null;
      dialogEl?.addEventListener('close', alCerrarDialogo);
    }
  });

  return new Promise((resolve) => {
    resolver = resolve;
  });
}

function cerrar() {
  if (resolver) {
    resolver(null);
    resolver = null;
  }
  modal.value?.cerrarModal();
}

function confirmar() {
  const valor = nombre.value.trim();
  if (!valor) {
    error.value = 'El título de la página es obligatorio.';
    return;
  }
  if (resolver) {
    resolver(valor);
    resolver = null;
  }
  modal.value?.cerrarModal();
}

onBeforeUnmount(() => {
  dialogEl?.removeEventListener('close', alCerrarDialogo);
});

defineExpose({ abrir });
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modal">
      <template #encabezado>
        <h1 class="m-0">Título de la página</h1>
      </template>

      <template #cuerpo>
        <SisdaiCampoBase
          v-model="nombre"
          etiqueta="Título*"
          ejemplo="Mi nueva página"
          tipo="text"
          :es_etiqueta_visible="true"
          @keyup.enter="confirmar"
        />

        <p v-if="error" class="m-t-2 texto-color-error">{{ error }}</p>
      </template>

      <template #pie>
        <div class="flex flex-contenido-final pie-acciones">
          <button class="boton-secundario" type="button" @click="cerrar">Cancelar</button>
          <button class="boton-primario" type="button" @click="confirmar">Crear página</button>
        </div>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>

<style lang="scss" scoped>
.pie-acciones {
  gap: 8px;
}
</style>
