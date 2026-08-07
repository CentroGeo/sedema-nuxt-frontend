<script setup>
const props = defineProps({
  siteId: {
    type: Number,
    required: true,
  },
});

const { data: userData } = useAuth();
const { gnoxyUrl } = useGnoxyUrl();
const { fetchTopBar, sincronizarConfiguracionTopBar } = useTableroApi();

const topBar = ref(null);
const logos = ref([]);
const cargando = ref(false);
const guardando = ref(false);
const mensajeGuardado = ref('');
const errorGuardado = ref('');
const snapshotInicial = ref('');

const form = reactive({
  show: false,
  title: '',
  background_color: '#ffffff',
  text_color: '#333333',
  height: 60,
});

function normalizarLogosServidor(items) {
  if (!Array.isArray(items)) return [];

  return items.map((logo, index) => ({
    key: `topbar-db-${logo.id}`,
    id: logo.id,
    icon: logo.icon || '',
    icon_url: logo.icon_url || '',
    icon_link: logo.icon_link || '',
    alt_text: logo.alt_text || '',
    stack_order: index + 1,
    archivo: null,
    previewUrl: '',
    esNuevo: false,
  }));
}

function firmaArchivo(archivo) {
  if (!archivo) return null;

  return `${archivo.name}:${archivo.size}:${archivo.lastModified}`;
}

function construirSnapshot() {
  return JSON.stringify({
    configuration: {
      show: Boolean(form.show),
      title: form.title || '',
      background_color: form.background_color || '',
      text_color: form.text_color || '',
      height: Number(form.height),
    },
    logos: logos.value.map((logo, index) => ({
      id: logo.id || null,
      key: logo.id ? null : logo.key,
      icon_url: logo.icon_url || '',
      icon_link: logo.icon_link || '',
      alt_text: logo.alt_text || '',
      stack_order: index + 1,
      archivo: firmaArchivo(logo.archivo),
    })),
  });
}

const hayCambios = computed(() => construirSnapshot() !== snapshotInicial.value);

function obtenerImagen(logo) {
  if (logo.previewUrl) return logo.previewUrl;
  if (logo.icon) return gnoxyUrl(logo.icon);
  if (logo.icon_url) return logo.icon_url;

  return '';
}

function revocarPreview(logo) {
  if (logo?.previewUrl) {
    URL.revokeObjectURL(logo.previewUrl);
  }
}

function limpiarPreviewsLocales() {
  logos.value.forEach(revocarPreview);
}

function aplicarDatosServidor(datos) {
  topBar.value = datos;

  Object.assign(form, {
    show: Boolean(datos.show),
    title: datos.title || '',
    background_color: datos.background_color || '#ffffff',
    text_color: datos.text_color || '#333333',
    height: Number(datos.height) || 60,
  });

  logos.value = normalizarLogosServidor(datos.logos);
  snapshotInicial.value = construirSnapshot();
}

async function cargar() {
  cargando.value = true;
  mensajeGuardado.value = '';
  errorGuardado.value = '';

  try {
    limpiarPreviewsLocales();

    const datos = await fetchTopBar(props.siteId);
    aplicarDatosServidor(datos);
  } catch (e) {
    console.error('Error al cargar banda institucional:', e);
    errorGuardado.value = 'No fue posible cargar la configuración de la banda institucional.';
  } finally {
    cargando.value = false;
  }
}

function validarFormulario() {
  const altura = Number(form.height);

  if (!Number.isInteger(altura) || altura < 32 || altura > 120) {
    errorGuardado.value = 'El alto de la banda debe ser un número entero entre 32 y 120 px.';
    return false;
  }

  form.height = altura;
  return true;
}

async function guardar() {
  mensajeGuardado.value = '';
  errorGuardado.value = '';

  if (!validarFormulario()) return;

  guardando.value = true;

  try {
    const formData = new FormData();
    const manifest = [];

    logos.value.forEach((logo, index) => {
      const datosLogo = {
        icon_url: logo.icon_url || '',
        icon_link: logo.icon_link || '',
        alt_text: logo.alt_text || '',
      };

      if (logo.id) {
        manifest.push({
          id: logo.id,
          ...datosLogo,
        });

        return;
      }

      if (logo.archivo) {
        const fileKey = `topbar_logo_file_${index}`;

        formData.append(fileKey, logo.archivo, logo.archivo.name);

        manifest.push({
          file_key: fileKey,
          ...datosLogo,
        });

        return;
      }

      if (logo.icon_url) {
        manifest.push(datosLogo);
        return;
      }

      throw new Error(`El logo nuevo de la posición ${index + 1} no tiene una imagen.`);
    });

    formData.append(
      'configuration',
      JSON.stringify({
        show: Boolean(form.show),
        title: form.title || '',
        background_color: form.background_color || '#ffffff',
        text_color: form.text_color || '#333333',
        height: Number(form.height),
      })
    );

    formData.append('manifest', JSON.stringify(manifest));

    const actualizado = await sincronizarConfiguracionTopBar(
      props.siteId,
      formData,
      userData.value?.accessToken
    );

    if (!actualizado?.id) {
      throw new Error(
        actualizado?.detail ||
          JSON.stringify(actualizado) ||
          'El servidor no pudo guardar la configuración.'
      );
    }

    limpiarPreviewsLocales();
    aplicarDatosServidor(actualizado);

    mensajeGuardado.value = 'Configuración guardada correctamente.';

    setTimeout(() => {
      mensajeGuardado.value = '';
    }, 3000);
  } catch (e) {
    console.error('Error al guardar banda institucional:', e);

    errorGuardado.value = e?.message || 'Ocurrió un error al guardar la banda institucional.';
  } finally {
    guardando.value = false;
  }
}

watch(() => props.siteId, cargar, { immediate: true });

onBeforeUnmount(() => {
  limpiarPreviewsLocales();
});
</script>

<template>
  <div class="tab-banda">
    <div v-if="cargando">
      <GeocontenidosLoader mensaje="Cargando configuración..." />
    </div>

    <form v-else-if="topBar" class="tab-banda__formulario" @submit.prevent="guardar">
      <section class="tab-banda__seccion">
        <h3 class="tab-banda__titulo-seccion">Configuración de la banda</h3>

        <div class="tab-banda__visibilidad-fila">
          <div class="tab-banda__visibilidad-texto">
            <label for="banda-show"> Mostrar banda institucional </label>

            <p
              id="banda-show-ayuda"
              class="formulario-ayuda tab-banda__estado"
              :class="{ 'tab-banda__estado--activa': form.show }"
            >
              {{
                form.show
                  ? 'La banda se mostrará en el tablero después de guardar.'
                  : 'La banda permanecerá oculta, pero puedes editar su configuración.'
              }}
            </p>
          </div>

          <label for="banda-show" class="tab-banda__switch-control">
            <input
              id="banda-show"
              v-model="form.show"
              type="checkbox"
              class="tab-banda__switch-input"
              aria-describedby="banda-show-ayuda"
              :disabled="guardando"
            />

            <span class="tab-banda__switch-track" aria-hidden="true">
              <span class="tab-banda__switch-thumb" />
            </span>

            <span class="tab-banda__switch-estado">
              {{ form.show ? 'Activa' : 'Oculta' }}
            </span>
          </label>
        </div>

        <div class="tab-banda__campo">
          <label class="formulario-etiqueta" for="banda-title"> Título (lado izquierdo) </label>

          <input
            id="banda-title"
            v-model="form.title"
            type="text"
            placeholder="Ej: Secretaría de Energía · CNE"
            :disabled="guardando"
          />
        </div>

        <div class="tab-banda__fila">
          <div class="tab-banda__campo">
            <label class="formulario-etiqueta" for="banda-bg"> Color de fondo </label>

            <div class="tab-banda__color-fila">
              <input
                id="banda-bg"
                v-model="form.background_color"
                type="color"
                :disabled="guardando"
              />

              <input
                v-model="form.background_color"
                type="text"
                maxlength="7"
                placeholder="#ffffff"
                :disabled="guardando"
              />
            </div>
          </div>

          <div class="tab-banda__campo">
            <label class="formulario-etiqueta" for="banda-text"> Color de texto </label>

            <div class="tab-banda__color-fila">
              <input id="banda-text" v-model="form.text_color" type="color" :disabled="guardando" />

              <input
                v-model="form.text_color"
                type="text"
                maxlength="7"
                placeholder="#333333"
                :disabled="guardando"
              />
            </div>
          </div>

          <div class="tab-banda__campo">
            <label class="formulario-etiqueta" for="banda-height"> Alto (px) </label>

            <input
              id="banda-height"
              v-model.number="form.height"
              type="number"
              min="32"
              max="120"
              :disabled="guardando"
            />
          </div>
        </div>

        <div class="tab-banda__preview-contenedor">
          <div class="tab-banda__preview-encabezado">
            <strong>Vista previa</strong>

            <span v-if="hayCambios" class="tab-banda__cambios-pendientes">
              Cambios sin guardar
            </span>
          </div>

          <div
            class="tab-banda__preview"
            :style="{
              backgroundColor: form.background_color,
              color: form.text_color,
              height: `${form.height}px`,
            }"
          >
            <span v-if="form.title" class="tab-banda__preview-titulo">
              {{ form.title }}
            </span>

            <span v-else class="tab-banda__preview-placeholder"> Vista previa de la banda </span>

            <div class="tab-banda__preview-logos">
              <div
                v-for="(logo, index) in logos"
                :key="`preview-${logo.key || logo.id}`"
                class="tab-banda__preview-logo"
              >
                <span class="tab-banda__preview-indice">
                  {{ index + 1 }}
                </span>

                <img
                  v-if="obtenerImagen(logo)"
                  :src="obtenerImagen(logo)"
                  :alt="logo.alt_text || `Logo ${index + 1}`"
                  :style="{
                    maxHeight: `${Math.max(20, Number(form.height) - 20)}px`,
                  }"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="tab-banda__seccion">
        <TablerosAdminSubidorLogosTopBar v-model:logos="logos" :disabled="guardando" />
      </section>

      <footer class="tab-banda__acciones-finales">
        <div class="tab-banda__estado-final">
          <span v-if="hayCambios"> Tienes cambios pendientes por guardar. </span>

          <span v-else> La configuración está actualizada. </span>

          <p v-if="mensajeGuardado" class="tab-banda__mensaje-ok">
            {{ mensajeGuardado }}
          </p>

          <p v-if="errorGuardado" class="formulario-ayuda color-error">
            {{ errorGuardado }}
          </p>
        </div>

        <button type="submit" class="boton boton-primario" :disabled="guardando">
          {{ guardando ? 'Guardando configuración...' : 'Guardar configuración' }}
        </button>
      </footer>
    </form>
  </div>
</template>

<style lang="scss" scoped>
.tab-banda {
  padding: 1.5rem;

  &__formulario {
    margin: 0;
  }

  &__titulo-seccion {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 1.25rem;
  }

  &__seccion {
    background: transparent;
    color: inherit;
    border: 0;
    padding: 0;
    margin-bottom: 1.5rem;
  }

  &__visibilidad-fila {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    margin-bottom: 1.25rem;
    padding: 0.9rem 1rem;
    border: 1px solid var(--color-neutro-2, #ccc);
    border-radius: 8px;
  }

  &__visibilidad-texto {
    min-width: 0;

    label {
      font-weight: 600;
      cursor: pointer;
    }
  }

  &__estado {
    margin: 0.3rem 0 0;
  }

  &__estado--activa {
    color: var(--color-exito, #2e7d32);
  }

  &__switch-control {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    flex-shrink: 0;
    cursor: pointer;
  }

  &__switch-input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    overflow: hidden;
  }

  &__switch-track {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 27px;
    border-radius: 999px;
    background: var(--color-neutro-4, #777);
    transition:
      background-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  &__switch-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 21px;
    height: 21px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
    transition: transform 0.2s ease;
  }

  &__switch-input:checked + &__switch-track {
    background: var(--color-primario-4, #991f47);
  }

  &__switch-input:checked + &__switch-track &__switch-thumb {
    transform: translateX(21px);
  }

  &__switch-input:focus-visible + &__switch-track {
    outline: 3px solid rgba(0, 102, 204, 0.3);
    outline-offset: 2px;
  }

  &__switch-input:disabled + &__switch-track {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &__switch-estado {
    min-width: 42px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  &__campo {
    margin-bottom: 1rem;

    input[type='text'],
    input[type='url'],
    input[type='number'] {
      display: block;
      width: 100%;
      margin-top: 0.25rem;
    }
  }

  &__fila {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 1rem;
    align-items: start;
  }

  &__color-fila {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;

    input[type='color'] {
      width: 40px;
      height: 36px;
      padding: 2px;
      border: 1px solid var(--color-neutro-2, #ccc);
      border-radius: 4px;
      cursor: pointer;
    }

    input[type='text'] {
      flex: 1;
    }
  }

  &__preview-contenedor {
    margin-top: 1.25rem;
  }

  &__preview-encabezado {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  &__cambios-pendientes {
    padding: 0.25rem 0.6rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  &__preview {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0 1rem;
    border: 1px dashed var(--color-neutro-2, #ccc);
    border-radius: 4px;
    overflow: hidden;
    transition:
      background-color 0.2s,
      color 0.2s,
      height 0.2s;
  }

  &__preview-titulo {
    min-width: 0;
    font-size: 0.875rem;
    font-weight: 600;
  }

  &__preview-placeholder {
    font-size: 0.8rem;
    font-style: italic;
    opacity: 0.5;
  }

  &__preview-logos {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
  }

  &__preview-logo {
    position: relative;
    display: grid;
    place-items: center;

    img {
      width: auto;
      max-width: 120px;
      object-fit: contain;
    }
  }

  &__preview-indice {
    position: absolute;
    top: -8px;
    left: -8px;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-primario-4, #991f47);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 700;
  }

  &__acciones-finales {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1.5rem;
    margin-top: 2rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--color-neutro-2, #ccc);
  }

  &__estado-final {
    font-size: 0.875rem;

    p {
      margin: 0.35rem 0 0;
    }
  }

  &__mensaje-ok {
    color: var(--color-exito, #2e7d32);
  }

  @media (max-width: 700px) {
    &__visibilidad-fila,
    &__acciones-finales {
      align-items: stretch;
      flex-direction: column;
    }

    &__switch-control {
      align-self: flex-start;
    }

    &__fila {
      grid-template-columns: 1fr;
    }

    &__preview {
      align-items: flex-start;
      flex-direction: column;
      height: auto !important;
      min-height: 80px;
      padding: 1rem;
    }

    &__preview-logos {
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    &__acciones-finales button {
      align-self: flex-end;
    }
  }
}
</style>
