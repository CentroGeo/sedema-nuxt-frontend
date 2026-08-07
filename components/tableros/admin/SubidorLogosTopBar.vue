<script setup>
const props = defineProps({
  logos: {
    type: Array,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:logos']);

const { gnoxyUrl } = useGnoxyUrl();

const inputArchivo = ref(null);
const nuevoLink = ref('');
const nuevaUrlImagen = ref('');
const nuevoAlt = ref('');
const error = ref('');

function normalizarOrden(items) {
  return items.map((logo, index) => ({
    ...logo,
    stack_order: index + 1,
  }));
}

function actualizarLogos(items) {
  emit('update:logos', normalizarOrden(items));
}

function obtenerImagen(logo) {
  if (logo.previewUrl) return logo.previewUrl;
  if (logo.icon) return gnoxyUrl(logo.icon);
  if (logo.icon_url) return logo.icon_url;

  return '';
}

function actualizarCampo(index, campo, valor) {
  const copia = props.logos.map((logo, logoIndex) =>
    logoIndex === index
      ? {
          ...logo,
          [campo]: valor,
        }
      : logo
  );

  actualizarLogos(copia);
}

function limpiarFormularioNuevo() {
  nuevoLink.value = '';
  nuevaUrlImagen.value = '';
  nuevoAlt.value = '';

  if (inputArchivo.value) {
    inputArchivo.value.value = '';
  }
}

function agregarArchivo(event) {
  const archivo = event.target.files?.[0];

  if (!archivo) return;

  error.value = '';

  if (!archivo.type.startsWith('image/')) {
    error.value = 'Selecciona un archivo de imagen válido.';

    if (inputArchivo.value) {
      inputArchivo.value.value = '';
    }

    return;
  }

  const nuevoLogo = {
    key: `topbar-local-${Date.now()}-${archivo.name}`,
    id: null,
    icon: '',
    icon_url: '',
    icon_link: nuevoLink.value.trim(),
    alt_text: nuevoAlt.value.trim(),
    archivo,
    previewUrl: URL.createObjectURL(archivo),
    esNuevo: true,
  };

  actualizarLogos([...props.logos, nuevoLogo]);
  limpiarFormularioNuevo();
}

function agregarUrlExterna() {
  const url = nuevaUrlImagen.value.trim();

  if (!url) return;

  error.value = '';

  const nuevoLogo = {
    key: `topbar-url-${Date.now()}`,
    id: null,
    icon: '',
    icon_url: url,
    icon_link: nuevoLink.value.trim(),
    alt_text: nuevoAlt.value.trim(),
    archivo: null,
    previewUrl: '',
    esNuevo: true,
  };

  actualizarLogos([...props.logos, nuevoLogo]);
  limpiarFormularioNuevo();
}

function mover(index, direccion) {
  const nuevaPosicion = index + direccion;

  if (nuevaPosicion < 0 || nuevaPosicion >= props.logos.length) return;

  const copia = [...props.logos];

  [copia[index], copia[nuevaPosicion]] = [copia[nuevaPosicion], copia[index]];

  actualizarLogos(copia);
}

function revocarPreview(logo) {
  if (logo?.previewUrl) {
    URL.revokeObjectURL(logo.previewUrl);
  }
}

// --- Modal de confirmación de eliminación ---
const modalEliminar = ref(null);
const logoIndexToDelete = ref(null);

function abrirModalEliminar(index) {
  const logo = props.logos[index];
  if (logo?.esNuevo) {
    // Si es un logo nuevo no guardado, lo quitamos sin modal
    revocarPreview(logo);
    const copia = props.logos.filter((_, logoIndex) => logoIndex !== index);
    actualizarLogos(copia);
    return;
  }
  logoIndexToDelete.value = index;
  modalEliminar.value?.abrir();
}

function cancelarEliminar() {
  logoIndexToDelete.value = null;
  modalEliminar.value?.cerrar();
}

function confirmarEliminar() {
  if (logoIndexToDelete.value === null) return;
  const logo = props.logos[logoIndexToDelete.value];
  revocarPreview(logo);
  const copia = props.logos.filter((_, logoIndex) => logoIndex !== logoIndexToDelete.value);
  actualizarLogos(copia);
  logoIndexToDelete.value = null;
  modalEliminar.value?.cerrar();
}

function limpiarPreviewsLocales() {
  props.logos.forEach(revocarPreview);
}

onBeforeUnmount(() => {
  limpiarPreviewsLocales();
});

defineExpose({
  limpiarPreviewsLocales,
});
</script>

<template>
  <div class="subidor-logos-topbar">
    <h4 class="subidor-logos-topbar__subtitulo">Logos de la banda</h4>

    <p class="formulario-ayuda subidor-logos-topbar__ayuda-orden">
      El orden de esta lista será el orden de aparición de izquierda a derecha en la banda.
    </p>

    <ul v-if="logos.length" class="subidor-logos-topbar__lista">
      <li
        v-for="(logo, idx) in logos"
        :key="logo.key || logo.id"
        class="subidor-logos-topbar__item"
      >
        <div class="subidor-logos-topbar__posicion">
          <span>Posición</span>
          <strong>{{ idx + 1 }}</strong>
        </div>

        <img
          v-if="obtenerImagen(logo)"
          :src="obtenerImagen(logo)"
          :alt="logo.alt_text || `Logo ${idx + 1}`"
          class="subidor-logos-topbar__preview"
        />

        <div v-else class="subidor-logos-topbar__sin-imagen">Sin imagen</div>

        <div class="subidor-logos-topbar__campos">
          <label :for="`topbar-alt-${logo.key || logo.id}`" class="formulario-ayuda">
            Texto alternativo
          </label>

          <input
            :id="`topbar-alt-${logo.key || logo.id}`"
            :value="logo.alt_text"
            type="text"
            placeholder="Ej: Logo SENER"
            :disabled="disabled"
            @input="actualizarCampo(idx, 'alt_text', $event.target.value)"
          />

          <label :for="`topbar-img-${logo.key || logo.id}`" class="formulario-ayuda m-t-1">
            URL de imagen externa
          </label>

          <input
            :id="`topbar-img-${logo.key || logo.id}`"
            :value="logo.icon_url"
            type="url"
            placeholder="https://ejemplo.com/logo.svg"
            :disabled="disabled || Boolean(logo.archivo)"
            @input="actualizarCampo(idx, 'icon_url', $event.target.value)"
          />

          <label :for="`topbar-link-${logo.key || logo.id}`" class="formulario-ayuda m-t-1">
            Enlace al hacer clic
          </label>

          <input
            :id="`topbar-link-${logo.key || logo.id}`"
            :value="logo.icon_link"
            type="url"
            placeholder="https://"
            :disabled="disabled"
            @input="actualizarCampo(idx, 'icon_link', $event.target.value)"
          />

          <p v-if="logo.esNuevo" class="formulario-ayuda subidor-logos-topbar__pendiente">
            Logo nuevo. Se guardará al presionar “Guardar configuración”.
          </p>
        </div>

        <div class="subidor-logos-topbar__acciones">
          <button
            type="button"
            class="boton boton-secundario boton-chico"
            :disabled="idx === 0 || disabled"
            :aria-label="`Mover logo ${idx + 1} hacia la izquierda`"
            title="Mover hacia la izquierda"
            @click="mover(idx, -1)"
          >
            ←
          </button>

          <button
            type="button"
            class="boton boton-secundario boton-chico"
            :disabled="idx === logos.length - 1 || disabled"
            :aria-label="`Mover logo ${idx + 1} hacia la derecha`"
            title="Mover hacia la derecha"
            @click="mover(idx, 1)"
          >
            →
          </button>

          <button
            type="button"
            class="boton boton-primario boton-chico"
            :disabled="disabled"
            :aria-label="`Quitar logo ${idx + 1}`"
            title="Quitar logo"
            @click="abrirModalEliminar(idx)"
          >
            <span class="pictograma-eliminar" />
          </button>
        </div>
      </li>
    </ul>

    <p v-else class="formulario-ayuda">No hay logos en la banda todavía.</p>

    <div class="subidor-logos-topbar__nuevo">
      <p class="formulario-etiqueta">Agregar logo</p>

      <div class="subidor-logos-topbar__nuevo-campos">
        <label for="topbar-nuevo-alt" class="formulario-ayuda"> Texto alternativo </label>

        <input
          id="topbar-nuevo-alt"
          v-model="nuevoAlt"
          type="text"
          placeholder="Ej: Logo SENER"
          :disabled="disabled"
        />

        <label for="topbar-nuevo-link" class="formulario-ayuda m-t-1"> Enlace al hacer clic </label>

        <input
          id="topbar-nuevo-link"
          v-model="nuevoLink"
          type="url"
          placeholder="https://"
          :disabled="disabled"
        />
      </div>

      <div class="subidor-logos-topbar__nuevo-opciones">
        <div class="subidor-logos-topbar__opcion">
          <p class="formulario-ayuda">Opción A — subir archivo</p>

          <input
            ref="inputArchivo"
            type="file"
            accept="image/*"
            :disabled="disabled"
            @change="agregarArchivo"
          />
        </div>

        <div class="subidor-logos-topbar__separador">o</div>

        <div class="subidor-logos-topbar__opcion">
          <label for="topbar-nuevo-url" class="formulario-ayuda">
            Opción B — URL externa de imagen
          </label>

          <div class="subidor-logos-topbar__url-fila">
            <input
              id="topbar-nuevo-url"
              v-model="nuevaUrlImagen"
              type="url"
              placeholder="https://ejemplo.com/logo.svg"
              :disabled="disabled"
            />

            <button
              type="button"
              class="boton boton-secundario boton-chico"
              :disabled="disabled || !nuevaUrlImagen.trim()"
              @click="agregarUrlExterna"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>

      <p class="formulario-ayuda subidor-logos-topbar__nota">
        Los cambios de logos permanecerán pendientes hasta presionar “Guardar configuración”.
      </p>

      <p v-if="error" class="formulario-ayuda color-error">
        {{ error }}
      </p>
    </div>

    <ClientOnly>
      <GeocontenidosSisdaiModal ref="modalEliminar">
        <template #encabezado>
          <h2 class="m-t-0">Quitar logo</h2>
        </template>

        <p class="alerta-advertencia-modal">
          ¿Deseas quitar este logo de la banda? El logo se eliminará definitivamente de la base de
          datos al guardar la configuración.
        </p>

        <template #pie>
          <div class="flex brecha-2 flex-contenido-final">
            <button class="boton boton-secundario" @click="cancelarEliminar">Cancelar</button>
            <button class="boton boton-primario" @click="confirmarEliminar">Quitar</button>
          </div>
        </template>
      </GeocontenidosSisdaiModal>
    </ClientOnly>
  </div>
</template>

<style lang="scss" scoped>
.alerta-advertencia-modal {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-neutro-5);
  margin-bottom: 24px;
}
.subidor-logos-topbar {
  &__subtitulo {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 1.5rem 0 0.35rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-neutro-2, #e0e0e0);
  }

  &__ayuda-orden {
    margin: 0 0 0.9rem;
  }

  &__lista {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem;
  }

  &__item {
    display: grid;
    grid-template-columns: 64px 88px minmax(240px, 1fr) auto;
    align-items: start;
    gap: 1rem;
    padding: 0.75rem;
    border: 1px solid var(--color-neutro-2, #e0e0e0);
    border-radius: 6px;
    margin-bottom: 0.6rem;
  }

  &__posicion {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;

    span {
      font-size: 0.7rem;
      opacity: 0.75;
    }

    strong {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 1px solid currentColor;
      border-radius: 50%;
    }
  }

  &__preview,
  &__sin-imagen {
    width: 80px;
    height: 58px;
    border-radius: 4px;
  }

  &__preview {
    object-fit: contain;
    border: 1px solid #eee;
    padding: 4px;
    background: #fff;
  }

  &__sin-imagen {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    color: #777;
    border: 1px dashed #aaa;
  }

  &__campos {
    display: flex;
    flex-direction: column;
    min-width: 0;

    input {
      width: 100%;
      margin-top: 0.15rem;
    }
  }

  &__pendiente {
    margin: 0.5rem 0 0;
  }

  &__acciones {
    display: flex;
    gap: 0.3rem;

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
    }
  }

  &__nuevo {
    padding: 1rem;
    border: 1px dashed var(--color-neutro-2, #e0e0e0);
    border-radius: 6px;
    margin-top: 0.5rem;
  }

  &__nuevo-campos {
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
  }

  &__nuevo-opciones {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__opcion {
    flex: 1;
    min-width: 220px;
  }

  &__separador {
    font-weight: 700;
    opacity: 0.7;
    padding: 0 0.5rem;
  }

  &__url-fila {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.15rem;

    input {
      flex: 1;
    }
  }

  &__nota {
    margin: 0.75rem 0 0;
  }

  @media (max-width: 900px) {
    &__item {
      grid-template-columns: 60px 82px minmax(0, 1fr);
    }

    &__acciones {
      grid-column: 2 / -1;
      justify-content: flex-end;
    }
  }

  @media (max-width: 600px) {
    &__item {
      grid-template-columns: 55px minmax(0, 1fr);
    }

    &__campos,
    &__acciones {
      grid-column: 1 / -1;
    }

    &__acciones {
      justify-content: flex-end;
    }

    &__nuevo-opciones {
      align-items: stretch;
      flex-direction: column;
    }

    &__separador {
      align-self: center;
    }

    &__url-fila {
      align-items: stretch;
      flex-direction: column;
    }
  }
}
</style>
