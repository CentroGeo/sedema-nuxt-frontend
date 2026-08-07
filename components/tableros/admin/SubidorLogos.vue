<script setup>
const props = defineProps({
  siteId: {
    type: Number,
    required: true,
  },
  siteTitle: {
    type: String,
    default: 'Título del tablero',
  },
});

const { data: userData } = useAuth();
const { gnoxyUrl } = useGnoxyUrl();
const { fetchLogosDeSitio, sincronizarLogosSitio } = useTableroApi();

const logos = ref([]);
const cargando = ref(false);
const guardando = ref(false);
const error = ref('');
const inputArchivo = ref(null);
const snapshotInicial = ref('[]');

function normalizarLogosServidor(items) {
  if (!Array.isArray(items)) return [];

  return items.map((logo, index) => ({
    key: `logo-db-${logo.id}`,
    id: logo.id,
    icon: logo.icon,
    icon_link: logo.icon_link || '',
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

function construirSnapshot(items = logos.value) {
  return JSON.stringify(
    items.map((logo, index) => ({
      id: logo.id || null,
      key: logo.id ? null : logo.key,
      icon_link: logo.icon_link || '',
      stack_order: index + 1,
      archivo: firmaArchivo(logo.archivo),
    }))
  );
}

const hayCambios = computed(() => construirSnapshot() !== snapshotInicial.value);

function actualizarOrden() {
  logos.value = logos.value.map((logo, index) => ({
    ...logo,
    stack_order: index + 1,
  }));
}

function obtenerImagen(logo) {
  if (logo.previewUrl) return logo.previewUrl;
  if (logo.icon) return gnoxyUrl(logo.icon);

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

async function cargar() {
  cargando.value = true;
  error.value = '';

  try {
    limpiarPreviewsLocales();

    const respuesta = await fetchLogosDeSitio(props.siteId);
    logos.value = normalizarLogosServidor(respuesta);
    snapshotInicial.value = construirSnapshot(logos.value);
  } catch (e) {
    console.error('Error al cargar logos:', e);
    error.value = 'No fue posible cargar los logos del sitio.';
  } finally {
    cargando.value = false;
  }
}

function agregarArchivos(event) {
  const archivos = Array.from(event.target.files || []);

  if (!archivos.length) return;

  error.value = '';

  const imagenesValidas = archivos.filter((archivo) => archivo.type.startsWith('image/'));

  if (imagenesValidas.length !== archivos.length) {
    error.value = 'Algunos archivos fueron omitidos porque no son imágenes válidas.';
  }

  const timestamp = Date.now();

  const nuevosLogos = imagenesValidas.map((archivo, index) => ({
    key: `logo-local-${timestamp}-${index}-${archivo.name}`,
    id: null,
    icon: '',
    icon_link: '',
    stack_order: logos.value.length + index + 1,
    archivo,
    previewUrl: URL.createObjectURL(archivo),
    esNuevo: true,
  }));

  logos.value.push(...nuevosLogos);
  actualizarOrden();

  if (inputArchivo.value) {
    inputArchivo.value.value = '';
  }
}

function mover(index, direccion) {
  const nuevaPosicion = index + direccion;

  if (nuevaPosicion < 0 || nuevaPosicion >= logos.value.length) return;

  const copia = [...logos.value];

  [copia[index], copia[nuevaPosicion]] = [copia[nuevaPosicion], copia[index]];

  logos.value = copia;
  actualizarOrden();
}

// --- Modal de confirmación de eliminación ---
const modalEliminar = ref(null);
const logoIndexToDelete = ref(null);

function abrirModalEliminar(index) {
  const logo = logos.value[index];
  if (logo.esNuevo) {
    // Si es un logo nuevo no guardado, lo quitamos sin modal
    revocarPreview(logo);
    logos.value.splice(index, 1);
    actualizarOrden();
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
  const logo = logos.value[logoIndexToDelete.value];
  revocarPreview(logo);
  logos.value.splice(logoIndexToDelete.value, 1);
  actualizarOrden();
  logoIndexToDelete.value = null;
  modalEliminar.value?.cerrar();
}

async function restaurar() {
  if (
    hayCambios.value &&
    !confirm('¿Descartar los cambios de logos que todavía no se han guardado?')
  ) {
    return;
  }

  await cargar();
}

async function guardar() {
  if (cargando.value || guardando.value) return false;
  if (!hayCambios.value) return true;

  guardando.value = true;
  error.value = '';

  try {
    const form = new FormData();
    const manifest = [];

    logos.value.forEach((logo, index) => {
      if (logo.id) {
        manifest.push({
          id: logo.id,
          icon_link: logo.icon_link || '',
        });

        return;
      }

      if (!logo.archivo) {
        throw new Error(`No se encontró el archivo del logo en la posición ${index + 1}.`);
      }

      const fileKey = `logo_file_${index}`;

      form.append(fileKey, logo.archivo, logo.archivo.name);

      manifest.push({
        file_key: fileKey,
        icon_link: logo.icon_link || '',
      });
    });

    form.append('manifest', JSON.stringify(manifest));

    const resultado = await sincronizarLogosSitio(props.siteId, form, userData.value?.accessToken);

    if (!Array.isArray(resultado)) {
      throw new Error(resultado?.detail || 'El servidor no pudo guardar los logos.');
    }

    limpiarPreviewsLocales();

    logos.value = normalizarLogosServidor(resultado);
    snapshotInicial.value = construirSnapshot(logos.value);

    return true;
  } catch (e) {
    console.error('Error al guardar logos:', e);
    error.value = e?.message || 'Ocurrió un error al guardar los logos.';

    return false;
  } finally {
    guardando.value = false;
  }
}

watch(() => props.siteId, cargar, { immediate: true });

onBeforeUnmount(() => {
  limpiarPreviewsLocales();
});

defineExpose({
  guardar,
  hayCambios,
  guardando,
});
</script>

<template>
  <div class="subidor-logos">
    <div v-if="cargando">
      <GeocontenidosLoader mensaje="Cargando logos..." />
    </div>

    <template v-else>
      <section class="subidor-logos__vista-previa">
        <div class="subidor-logos__vista-encabezado">
          <div>
            <h4>Vista previa del orden de aparición</h4>
            <p class="formulario-ayuda">
              Los logos aparecerán de izquierda a derecha siguiendo la numeración mostrada.
            </p>
          </div>

          <span v-if="hayCambios" class="subidor-logos__estado"> Cambios sin guardar </span>
        </div>

        <div class="subidor-logos__pantalla">
          <div class="subidor-logos__barra-navegador">
            <span />
            <span />
            <span />
          </div>

          <div class="subidor-logos__encabezado-simulado">
            <div class="subidor-logos__titulo-simulado">
              {{ siteTitle || 'Título del tablero' }}
            </div>

            <div v-if="logos.length" class="subidor-logos__logos-preview">
              <div
                v-for="(logo, index) in logos"
                :key="`preview-${logo.key}`"
                class="subidor-logos__logo-preview"
              >
                <span class="subidor-logos__indice-preview">{{ index + 1 }}</span>

                <img
                  v-if="obtenerImagen(logo)"
                  :src="obtenerImagen(logo)"
                  :alt="`Logo en posición ${index + 1}`"
                />
              </div>
            </div>

            <div v-else class="subidor-logos__sin-logos-preview">Sin logos configurados</div>
          </div>
        </div>
      </section>

      <div class="subidor-logos__explicacion">
        <strong>Orden en el encabezado</strong>
        <span> Usa las flechas para mover cada logo hacia la izquierda o hacia la derecha. </span>
      </div>

      <ul v-if="logos.length" class="subidor-logos__lista">
        <li v-for="(logo, index) in logos" :key="logo.key" class="subidor-logos__item">
          <div class="subidor-logos__posicion">
            <span>Posición</span>
            <strong>{{ index + 1 }}</strong>
          </div>

          <div class="subidor-logos__imagen">
            <img v-if="obtenerImagen(logo)" :src="obtenerImagen(logo)" :alt="`Logo ${index + 1}`" />

            <span v-else>Sin imagen</span>
          </div>

          <div class="subidor-logos__datos">
            <label :for="`logo-link-${logo.key}`" class="formulario-ayuda"> Enlace del logo </label>

            <input
              :id="`logo-link-${logo.key}`"
              v-model="logo.icon_link"
              type="url"
              placeholder="https://"
              :disabled="guardando"
            />

            <p v-if="logo.esNuevo" class="formulario-ayuda">
              Logo nuevo. Se guardará al presionar “Guardar y continuar”.
            </p>
          </div>

          <div class="subidor-logos__acciones">
            <button
              type="button"
              class="boton boton-secundario boton-chico"
              :disabled="index === 0 || guardando"
              :aria-label="`Mover logo ${index + 1} a la izquierda`"
              title="Mover a la izquierda"
              @click="mover(index, -1)"
            >
              ←
            </button>

            <button
              type="button"
              class="boton boton-secundario boton-chico"
              :disabled="index === logos.length - 1 || guardando"
              :aria-label="`Mover logo ${index + 1} a la derecha`"
              title="Mover a la derecha"
              @click="mover(index, 1)"
            >
              →
            </button>

            <button
              type="button"
              class="boton boton-primario boton-chico"
              :disabled="guardando"
              :aria-label="`Quitar logo ${index + 1}`"
              title="Quitar logo"
              @click="abrirModalEliminar(index)"
            >
              <span class="pictograma-eliminar" />
            </button>
          </div>
        </li>
      </ul>

      <p v-else class="formulario-ayuda">
        No hay logos configurados. Agrega una o varias imágenes para comenzar.
      </p>

      <div class="subidor-logos__nuevo">
        <label for="subidor-logos-archivo">
          <span class="pictograma-agregar m-r-1" />
          Agregar logos
        </label>

        <input
          id="subidor-logos-archivo"
          ref="inputArchivo"
          type="file"
          accept="image/*"
          multiple
          :disabled="guardando"
          @change="agregarArchivos"
        />

        <p class="formulario-ayuda">
          Las imágenes se mostrarán en la vista previa, pero no se guardarán hasta presionar
          “Guardar y continuar”.
        </p>
      </div>

      <div v-if="hayCambios" class="subidor-logos__cambios">
        <span>Tienes cambios de logos pendientes.</span>

        <button
          type="button"
          class="boton boton-secundario boton-chico"
          :disabled="guardando"
          @click="restaurar"
        >
          Descartar cambios
        </button>
      </div>

      <p v-if="guardando" class="formulario-ayuda">Guardando logos...</p>

      <p v-if="error" class="formulario-ayuda color-error">
        {{ error }}
      </p>
    </template>

    <ClientOnly>
      <GeocontenidosSisdaiModal ref="modalEliminar">
        <template #encabezado>
          <h2 class="m-t-0">Quitar logo</h2>
        </template>

        <p class="alerta-advertencia-modal">
          ¿Deseas quitar este logo? El logo se eliminará definitivamente de la base de datos al
          guardar los cambios.
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
.subidor-logos {
  &__vista-previa {
    margin-bottom: 1.5rem;
    padding: 1rem;
    border: 1px solid var(--color-neutro-2, #b7b7b7);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
  }

  &__vista-encabezado {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;

    h4 {
      margin: 0 0 0.25rem;
    }

    p {
      margin: 0;
    }
  }

  &__estado {
    flex-shrink: 0;
    padding: 0.35rem 0.65rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  &__pantalla {
    overflow: hidden;
    border: 1px solid var(--color-neutro-2, #b7b7b7);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.12);
  }

  &__barra-navegador {
    display: flex;
    gap: 0.35rem;
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid var(--color-neutro-2, #b7b7b7);
    background: rgba(255, 255, 255, 0.06);

    span {
      width: 8px;
      height: 8px;
      border: 1px solid currentColor;
      border-radius: 50%;
      opacity: 0.6;
    }
  }

  &__encabezado-simulado {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    min-height: 100px;
    padding: 1rem 1.25rem;
  }

  &__titulo-simulado {
    max-width: 40%;
    font-size: 0.9rem;
    font-weight: 700;
  }

  &__logos-preview {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  &__logo-preview {
    position: relative;
    display: grid;
    place-items: center;
    width: 76px;
    height: 52px;
    padding: 0.35rem;
    border: 1px solid var(--color-neutro-2, #b7b7b7);
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.92);

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }

  &__indice-preview {
    position: absolute;
    top: -8px;
    left: -8px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--color-primario, #8c1d40);
    color: #fff;
    font-size: 0.7rem;
    font-weight: 700;
  }

  &__sin-logos-preview {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  &__explicacion {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-bottom: 0.75rem;

    span {
      font-size: 0.85rem;
      opacity: 0.8;
    }
  }

  &__lista {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem;
  }

  &__item {
    display: grid;
    grid-template-columns: 70px 90px minmax(220px, 1fr) auto;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    border: 1px solid var(--color-neutro-2, #b7b7b7);
    border-radius: 6px;
    margin-bottom: 0.65rem;
  }

  &__posicion {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;

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
      font-size: 0.95rem;
    }
  }

  &__imagen {
    display: grid;
    place-items: center;
    min-height: 64px;
    padding: 0.35rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.92);

    img {
      width: 78px;
      height: 58px;
      object-fit: contain;
    }

    span {
      color: #333;
      font-size: 0.7rem;
    }
  }

  &__datos {
    min-width: 0;

    input {
      width: 100%;
    }

    p {
      margin: 0.35rem 0 0;
    }
  }

  &__acciones {
    display: flex;
    gap: 0.35rem;

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
    border: 1px dashed var(--color-neutro-2, #b7b7b7);
    border-radius: 6px;

    label {
      display: inline-block;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    input {
      width: 100%;
    }

    p {
      margin: 0.5rem 0 0;
    }
  }

  &__cambios {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-neutro-2, #b7b7b7);
    border-radius: 6px;
  }

  @media (max-width: 900px) {
    &__encabezado-simulado {
      align-items: flex-start;
      flex-direction: column;
    }

    &__titulo-simulado {
      max-width: none;
    }

    &__logos-preview {
      justify-content: flex-start;
    }

    &__item {
      grid-template-columns: 60px 80px minmax(0, 1fr);
    }

    &__acciones {
      grid-column: 2 / -1;
      justify-content: flex-end;
    }
  }

  @media (max-width: 600px) {
    &__vista-encabezado,
    &__cambios {
      align-items: stretch;
      flex-direction: column;
    }

    &__estado {
      align-self: flex-start;
    }

    &__item {
      grid-template-columns: 55px minmax(0, 1fr);
    }

    &__imagen {
      min-height: 70px;
    }

    &__datos,
    &__acciones {
      grid-column: 1 / -1;
    }

    &__acciones {
      justify-content: flex-end;
    }
  }
}
</style>
