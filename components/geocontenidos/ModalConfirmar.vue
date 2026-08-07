<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

// Reemplazo de confirm()/alert() nativos con identidad sisdai.
// Uso: const ok = await modalConfirmar.value.abrir({ titulo, mensaje, destructivo: true });
// Con soloAviso: true se comporta como alert() (un solo botón, resuelve true).

const modal = ref(null);
const titulo = ref('Confirmar');
const mensaje = ref('');
const textoConfirmar = ref('Confirmar');
const textoCancelar = ref('Cancelar');
const soloAviso = ref(false);

let resolver = null;
let dialogEl = null;

// Si el dialog se cierra por Esc o clic fuera, resolver como cancelado.
function alCerrarDialogo() {
  if (resolver) {
    resolver(false);
    resolver = null;
  }
}

function abrir(opciones = {}) {
  soloAviso.value = Boolean(opciones.soloAviso);
  titulo.value = opciones.titulo ?? (soloAviso.value ? 'Aviso' : 'Confirmar');
  mensaje.value = opciones.mensaje ?? '';
  textoConfirmar.value = opciones.textoConfirmar ?? (soloAviso.value ? 'Aceptar' : 'Confirmar');
  textoCancelar.value = opciones.textoCancelar ?? 'Cancelar';

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

function responder(valor) {
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
        <h1 class="m-0">{{ titulo }}</h1>
      </template>

      <template #cuerpo>
        <p class="m-0">{{ mensaje }}</p>
      </template>

      <template #pie>
        <div class="flex flex-contenido-final pie-acciones">
          <button
            v-if="!soloAviso"
            class="boton-secundario"
            type="button"
            @click="responder(false)"
          >
            {{ textoCancelar }}
          </button>
          <button class="boton-primario" type="button" @click="responder(true)">
            {{ textoConfirmar }}
          </button>
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
