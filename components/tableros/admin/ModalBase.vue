<script setup>
const emit = defineEmits(['cerrar']);

const props = defineProps({
  ancho: { type: String, default: '900px' },
  altoMaximo: { type: String, default: '90vh' },
  adaptarTema: { type: Boolean, default: false },
  centrarVertical: { type: Boolean, default: false },
});

const dialogRef = ref(null);
const temaOscuro = ref(false);

let observadorTema = null;
let filePickerOpened = false;

function handleFileInputClick(event) {
  if (event.target?.tagName === 'INPUT' && event.target.type === 'file') {
    filePickerOpened = true;
  }
}

function handleWindowFocus() {
  setTimeout(() => {
    filePickerOpened = false;
  }, 300);
}

function sincronizarTemaModal() {
  if (!props.adaptarTema || !document?.body) {
    temaOscuro.value = false;
    return;
  }

  temaOscuro.value =
    document.body.dataset.tema === 'oscuro' ||
    document.body.classList.contains('a11y-oscura');
}

function abrir() {
  document.body.classList.add('overflow-hidden');
  dialogRef.value?.showModal();
}

function cerrar() {
  document.body.classList.remove('overflow-hidden');
  dialogRef.value?.close();
  emit('cerrar');
}

onMounted(() => {
  window.addEventListener('click', handleFileInputClick, true);
  window.addEventListener('focus', handleWindowFocus);

  // Escape nativo: prevenimos el cierre automático del <dialog> y emitimos nosotros
  dialogRef.value?.addEventListener('cancel', (event) => {
    event.preventDefault();

    if (filePickerOpened) {
      return;
    }

    cerrar();
  });

  if (props.adaptarTema) {
    sincronizarTemaModal();

    observadorTema = new MutationObserver(sincronizarTemaModal);
    observadorTema.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-tema', 'class'],
    });
  }
});

onUnmounted(() => {
  observadorTema?.disconnect();
  window.removeEventListener('click', handleFileInputClick, true);
  window.removeEventListener('focus', handleWindowFocus);
});

defineExpose({ abrir, cerrar });
</script>

<template>
  <dialog
    ref="dialogRef"
    class="modal-base"
    :class="{
      'modal-base--oscuro': temaOscuro,
      'modal-base--centrado': props.centrarVertical,
    }"
    :style="{
      '--modal-ancho': props.ancho,
      '--modal-alto-maximo': props.altoMaximo,
    }"
  >
    <div class="modal-base__contenedor">
      <div class="modal-base__cabecera">
        <slot name="encabezado" />
        <button type="button" class="modal-base__btn-cerrar" aria-label="Cerrar" @click="cerrar">
          <span class="pictograma-cerrar" aria-hidden="true" />
        </button>
      </div>

      <div class="modal-base__cuerpo">
        <slot name="cuerpo" />
      </div>
    </div>
  </dialog>
</template>

<style lang="scss" scoped>
.modal-base {
  --modal-ancho: 900px;
  --modal-alto-maximo: 90vh;
  --tableros-modal-fondo: var(--color-fondo-1, #fff);
  --tableros-modal-cabecera: var(--color-fondo-1, #fff);
  --tableros-modal-texto: inherit;
  --tableros-modal-titulo: var(--color-primario-4, #991f47);
  --tableros-modal-control-fondo: #ffffff;
  --tableros-modal-control-borde: var(--color-borde, #cccccc);
  --tableros-modal-texto-secundario: var(--color-texto-secundario, #777777);
  --tableros-modal-placeholder: #777777;
  --tableros-modal-superficie-suave: #f7f7f7;
  --tableros-modal-hover-fondo: #fcf3f5;
  --tableros-modal-acento: var(--color-primario-4, #991f47);
  --tableros-modal-acento-suave: var(--color-secundario-3, #f8e1e8);
  --tableros-modal-cerrar-hover-fondo: var(--color-secundario-3, #f8e1e8);
  --tableros-modal-cerrar-hover-texto: var(--color-primario-4, #991f47);

  width: min(var(--modal-ancho), 96vw);
  max-height: min(var(--modal-alto-maximo), calc(100dvh - 2rem));
  padding: 0;
  border: none;
  border-radius: 10px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22);
  overflow: hidden;
  background: var(--tableros-modal-fondo);
  color: var(--tableros-modal-texto);

  &--oscuro {
    --tableros-modal-fondo: var(--color-secundario-11, #3f1d26);
    --tableros-modal-cabecera: var(--color-secundario-11, #3f1d26);
    --tableros-modal-texto: #ffffff;
    --tableros-modal-titulo: #ffffff;
    --tableros-modal-control-fondo: var(--color-secundario-12, #391821);
    --tableros-modal-control-borde: var(--color-secundario-7, #876670);
    --tableros-modal-texto-secundario: var(--color-secundario-4, #f5d4dd);
    --tableros-modal-placeholder: var(--color-secundario-5, #dab9c2);
    --tableros-modal-superficie-suave: #4a252f;
    --tableros-modal-hover-fondo: #57303a;
    --tableros-modal-acento: #f3a6b8;
    --tableros-modal-acento-suave: #56303a;
    --tableros-modal-cerrar-hover-fondo: var(--color-secundario-9, #53323c);
    --tableros-modal-cerrar-hover-texto: var(--color-secundario-3, #f8e1e8);

    color-scheme: dark;
  }

  &--centrado {
    position: fixed;
    inset: 0;
    margin: auto;
  }

  &::backdrop {
    background: rgba(0, 0, 0, 0.45);
  }

  &__contenedor {
    display: flex;
    flex-direction: column;
    max-height: min(var(--modal-alto-maximo), calc(100dvh - 2rem));
    background: var(--tableros-modal-fondo);
    color: var(--tableros-modal-texto);
  }

  &__cabecera {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: var(--tableros-modal-cabecera);
    border-bottom: 2px solid var(--color-primario-4, #991f47);

    :deep(h2),
    :deep(h3) {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--tableros-modal-titulo);
    }
  }

  &__btn-cerrar {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    color: var(--tableros-modal-texto-secundario);
    transition:
      background 0.15s,
      color 0.15s;

    &:hover {
      background: var(--tableros-modal-cerrar-hover-fondo);
      color: var(--tableros-modal-cerrar-hover-texto);
    }

    .pictograma-cerrar {
      font-size: 1.1rem;
    }
  }

  &__cuerpo {
    overflow-y: auto;
    padding: 1.5rem;
    flex: 1;
    background: var(--tableros-modal-fondo);
    color: var(--tableros-modal-texto);
  }
}
</style>
