<script setup>
import { convertirBytes } from '~/utils/catalogo';
import {
  LIMITE_CARGA_ARCHIVOS_BYTES,
  LIMITE_CARGA_ARCHIVOS_MIB,
} from '#shared/utils/limiteCargaArchivos';
// emit para pasar los archivos al componente padre
const emit = defineEmits(['pasarArchivo']);

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
});

const archivos = ref({});
const archivosArriba = ref(false);
const archivoValido = ref(false);
const mensajeError = ref('');

function filtrarPorTamano(listaArchivos) {
  const arreglo = Array.from(listaArchivos);
  const validos = arreglo.filter((f) => f.size <= LIMITE_CARGA_ARCHIVOS_BYTES);
  const invalidos = arreglo.filter((f) => f.size > LIMITE_CARGA_ARCHIVOS_BYTES);

  if (invalidos.length) {
    archivoValido.value = true;
    mensajeError.value =
      invalidos.length === 1
        ? `"${invalidos[0].name}" supera el límite de ${LIMITE_CARGA_ARCHIVOS_MIB} MiB y no se agregó.`
        : `${invalidos.length} archivos superan el límite de ${LIMITE_CARGA_ARCHIVOS_MIB} MiB y no se agregaron.`;
  } else {
    archivoValido.value = false;
    mensajeError.value = '';
  }

  const dt = new DataTransfer();
  validos.forEach((f) => dt.items.add(f));
  return dt.files;
}

const onDropZone = ref(null);
const { files } = useDropZone(onDropZone, { onDrop });
async function onDrop() {
  if (props.disabled) return;

  archivos.value = filtrarPorTamano(files.value);
  archivosArriba.value = archivos.value.length > 0;
}

const { open, onChange } = useFileDialog({ multiple: true });
onChange(async (files) => {
  if (props.disabled) return;

  archivos.value = filtrarPorTamano(files);
  archivosArriba.value = archivos.value.length > 0;
});

const abrirSelector = () => {
  if (!props.disabled) open();
};

const removerArchivos = () => {
  archivos.value = {};
  archivosArriba.value = false;
  archivoValido.value = false;
  mensajeError.value = '';
};

const archivoNoValido = () => {
  archivoValido.value = true;
};

function deleteFile(file) {
  const newFiles = new DataTransfer();
  const arrayFiles = Array.from(archivos.value);
  const newArray = arrayFiles.filter((d) => d.name !== file.name);
  newArray.forEach((d) => newFiles.items.add(d));
  archivos.value = newFiles.files;
  if (archivos.value.length === 0) {
    archivosArriba.value = false;
    archivoValido.value = false;
    mensajeError.value = '';
  }
}

defineExpose({
  archivoValido,
  archivoNoValido,
});
</script>
<template>
  <div>
    <!-- Drag & Drop -->
    <div>
      <div
        ref="onDropZone"
        class="contenedor-dragnddrop borde borde-redondeado-16 p-1 m-b-3"
        :class="{ 'contenedor-dragnddrop-deshabilitado': props.disabled }"
        :aria-disabled="props.disabled"
        @click="abrirSelector"
      >
        <div
          v-if="archivosArriba"
          class="m-x-2 m-y-1"
          style="max-height: 184px; overflow-y: scroll"
        >
          <div v-for="archivo in archivos" :key="archivo.name" class="flex flex-contenido-separado">
            <p class="nombre-archivo flex flex-vertical-centrado m-y-1 columna-9">
              {{ archivo.name }}
            </p>

            <div class="flex">
              <p
                class="flex flex-vertical-centrado fondo-color-neutro borde borde-redondeado-8 m-y-1"
                style="padding: 4px"
              >
                .{{ archivo.name.split('.')[1] }}
              </p>
              <p class="flex flex-vertical-centrado m-y-1">{{ convertirBytes(archivo.size) }}</p>
              <button
                class="boton-pictograma boton-sin-contenedor-secundario boton-chico"
                @click.stop="deleteFile(archivo)"
              >
                <span class="pictograma-cerrar"></span>
              </button>
            </div>
          </div>
        </div>
        <div
          class="flex flex-contenido-centrado"
          :style="`min-height: ${!archivosArriba ? '281px' : '0px; margin-top: 32px;'}`"
        >
          <div class="flex flex-vertical-centrado">
            <div class="texto-centrado m-b-1">
              <div v-if="!archivosArriba">
                <div>
                  <span class="pictograma-archivo-subir pictograma-mediano" />
                </div>
                <p>Arrastra o suelta tu archivo</p>
              </div>

              <label
                class="boton boton-secundario boton-chico"
                :aria-disabled="props.disabled"
                @click.stop="abrirSelector"
              >
                Elige Archivo
              </label>
            </div>
          </div>
        </div>
      </div>

      <p v-if="archivoValido" class="texto-color-error">{{ mensajeError }}</p>

      <div class="botones-dragnddrop flex">
        <client-only>
          <button
            class="boton-primario boton-chico"
            aria-label="Guardar"
            type="button"
            :disabled="props.disabled || !archivosArriba"
            @click="emit('pasarArchivo', archivos)"
          >
            Guardar
          </button>
          <button
            class="boton-secundario boton-chico"
            aria-label="Eliminar"
            type="button"
            :disabled="props.disabled || !archivosArriba"
            @click="removerArchivos"
          >
            Eliminar
          </button>
        </client-only>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.contenedor-dragnddrop {
  height: 300px;
  border-style: dashed;
  cursor: pointer;
}

.contenedor-dragnddrop-deshabilitado {
  cursor: not-allowed;
  opacity: 0.55;
  pointer-events: none;
}
#identificadorCAMPOFILE {
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  z-index: -1;
}
#identificadorCAMPOFILE + label {
  display: inline-block;
  cursor: pointer;
}
#identificadorCAMPOFILE:focus + label,
#identificadorCAMPOFILE + label:hover {
}

.nombre-archivo {
  overflow-wrap: break-word;
  white-space: normal;
}
</style>
