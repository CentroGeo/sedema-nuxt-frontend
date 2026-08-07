<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';

const props = defineProps({
  mapa: {
    type: Object,
    default: null,
  },
});

const modal = ref(null);
const tab = ref('enlace');
const ancho = ref(800);
const alto = ref(600);
const copiado = ref('');
const haciendoPublico = ref(false);

const mapasStore = useMapasStore();
const { capasNoPublicas, puedeSerPublico } = useMapaPublicable();
const { urlAbsoluta } = useUrlAbsoluta();

// El backend aún no expone by-slug: la URL pública usa el id del mapa.
const urlVisualizar = computed(() => urlAbsoluta(`/mapas/${props.mapa?.id}`));
// El embed lleva marca de agua con enlace a la fuente; acepta además
// ?controles=false para ocultar los controles del visor.
const urlEmbed = computed(() => urlAbsoluta(`/mapas/${props.mapa?.id}?marca=true`));

const snippetEmbed = computed(
  () =>
    `<iframe src="${urlEmbed.value}" width="${ancho.value}" height="${alto.value}" frameborder="0" allowfullscreen style="display:block;margin:0 auto;max-width:100%;border:0"></iframe>`
);

const esPublico = computed(() => props.mapa?.is_public !== false);

async function copiar(texto, clave) {
  try {
    await navigator.clipboard.writeText(texto);
    copiado.value = clave;
    setTimeout(() => {
      if (copiado.value === clave) copiado.value = '';
    }, 2000);
  } catch (e) {
    console.warn('[ModalCompartir] copy failed', e);
  }
}

async function hacerPublico() {
  if (!props.mapa?.id || !puedeSerPublico.value) return;
  haciendoPublico.value = true;
  await mapasStore.actualizarMapa(props.mapa.id, { is_public: true });
  haciendoPublico.value = false;
}

function abrir() {
  tab.value = 'enlace';
  copiado.value = '';
  modal.value?.abrirModal();
}

function cerrar() {
  modal.value?.cerrarModal();
}

defineExpose({ abrir, cerrar });
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modal">
      <template #encabezado>
        <h1 class="m-0">Compartir mapa</h1>
      </template>

      <template #cuerpo>
        <div v-if="!esPublico" class="aviso-privado m-b-2">
          <span class="pictograma-alerta" aria-hidden="true"></span>
          <div class="aviso-cuerpo">
            <div class="flex flex-contenido-separado">
              <span>
                Este mapa está marcado como privado. Nadie más podrá verlo con el enlace o embed.
              </span>
              <button
                type="button"
                class="boton-primario boton-chico"
                :disabled="haciendoPublico || !puedeSerPublico"
                @click="hacerPublico"
              >
                {{ haciendoPublico ? 'Guardando…' : 'Hacer público' }}
              </button>
            </div>
            <p v-if="!puedeSerPublico" class="m-0 m-t-1">
              No puede hacerse público: tiene {{ capasNoPublicas.length }}
              {{ capasNoPublicas.length === 1 ? 'capa no publicada' : 'capas no publicadas' }}
              en el catálogo. Publícalas primero.
            </p>
          </div>
        </div>

        <div class="tabs flex m-b-2" role="tablist" aria-label="Formas de compartir">
          <button
            id="tab-compartir-enlace"
            type="button"
            class="tab-boton"
            :class="{ activa: tab === 'enlace' }"
            role="tab"
            :aria-selected="tab === 'enlace'"
            aria-controls="panel-compartir-enlace"
            @click="tab = 'enlace'"
          >
            <span class="pictograma-enlace-subrayado" aria-hidden="true"></span> Enlace
          </button>
          <button
            id="tab-compartir-embed"
            type="button"
            class="tab-boton"
            :class="{ activa: tab === 'embed' }"
            role="tab"
            :aria-selected="tab === 'embed'"
            aria-controls="panel-compartir-embed"
            @click="tab = 'embed'"
          >
            <span class="pictograma-documento" aria-hidden="true"></span> Embed
          </button>
        </div>

        <div
          v-if="tab === 'enlace'"
          id="panel-compartir-enlace"
          class="panel-tab"
          role="tabpanel"
          aria-labelledby="tab-compartir-enlace"
        >
          <label class="campo-etiqueta" for="entrada-enlace-publico">Enlace público</label>
          <div class="flex campo-copia">
            <input
              id="entrada-enlace-publico"
              :value="urlVisualizar"
              readonly
              type="text"
              class="entrada-copia"
            />
            <button
              type="button"
              class="boton-secundario boton-chico"
              @click="copiar(urlVisualizar, 'enlace')"
            >
              {{ copiado === 'enlace' ? '¡Copiado!' : 'Copiar' }}
            </button>
          </div>
          <p class="texto-secundario m-t-1">Cualquier persona con este enlace puede ver el mapa.</p>
        </div>

        <div
          v-else-if="tab === 'embed'"
          id="panel-compartir-embed"
          class="panel-tab"
          role="tabpanel"
          aria-labelledby="tab-compartir-embed"
        >
          <div class="flex dimensiones">
            <label>
              <span class="campo-etiqueta">Ancho (px)</span>
              <input v-model.number="ancho" type="number" min="100" step="10" />
            </label>
            <label>
              <span class="campo-etiqueta">Alto (px)</span>
              <input v-model.number="alto" type="number" min="100" step="10" />
            </label>
          </div>

          <label class="campo-etiqueta m-t-2" for="entrada-codigo-embed">Código embed</label>
          <textarea
            id="entrada-codigo-embed"
            :value="snippetEmbed"
            readonly
            rows="4"
            class="textarea-copia"
          />
          <div class="flex flex-contenido-final m-t-1">
            <button
              type="button"
              class="boton-secundario boton-chico"
              @click="copiar(snippetEmbed, 'embed')"
            >
              {{ copiado === 'embed' ? '¡Copiado!' : 'Copiar código' }}
            </button>
          </div>
          <p class="texto-secundario m-t-1">Pega este código en cualquier sitio web.</p>
        </div>
      </template>

      <template #pie>
        <div class="flex flex-contenido-final">
          <button class="boton-secundario" type="button" @click="cerrar">Cerrar</button>
        </div>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>

<style lang="scss" scoped>
.aviso-privado {
  padding: 8px 12px;
  border-radius: 6px;
  background-color: var(--fondo-alerta);
  color: var(--texto-alerta);
  border: 1px solid var(--borde-alerta);
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.aviso-cuerpo {
  flex: 1;
  align-items: center;
  gap: 12px;
}

.tabs {
  gap: 0;
  border-bottom: 1px solid var(--borde);
}

.tab-boton {
  color: var(--texto-secundario);
  background: none;
  border: none;
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &.activa {
    color: var(--texto-primario);
    border-bottom-color: var(--texto-acento);
    font-weight: 600;
  }
}

.campo-etiqueta {
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.campo-copia {
  align-items: center;
  gap: 8px;
}

.entrada-copia {
  flex: 1;
  font-family: monospace;
  padding: 6px 8px;
  border: 1px solid var(--color-neutro-1);
  border-radius: 4px;
}

.textarea-copia {
  width: 100%;
  font-family: monospace;
  font-size: 0.85rem;
  padding: 8px;
  border: 1px solid var(--color-neutro-1);
  border-radius: 4px;
  resize: vertical;
}

.dimensiones {
  gap: 12px;

  label {
    flex: 1;
  }

  input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--color-neutro-1);
    border-radius: 4px;
  }
}

.flex {
  gap: 8px;
}
</style>
