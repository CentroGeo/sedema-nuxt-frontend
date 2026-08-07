<script setup>
import SisdaiModal from '@centrogeomx/sisdai-componentes/src/componentes/modal/SisdaiModal.vue';
import SisdaiSelector from '@centrogeomx/sisdai-componentes/src/componentes/selector/SisdaiSelector.vue';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  // v-model:abierto
  abierto: { type: Boolean, default: false },
  // Contrato: layersOrdered, isLoading, cargar, agregar, actualizar,
  // actualizarEstilo, eliminar, reordenar (ver composables/capas/*).
  adaptador: { type: Object, required: true },
  opciones: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['update:abierto', 'guardado', 'abrir-marcadores', 'abrir-narrativa']);

const op = computed(() => ({
  titulo: 'Agregar capas',
  contexto: 'mapa', // 'mapa' | 'escena' (para textos)
  mostrarOpacidad: false,
  mostrarEstilo: true,
  mostrarMarcadores: false,
  mostrarNarrativas: false,
  posiciones: null, // p.ej. [{ value:'left', label:'Izquierdo' }, …] para swipe/dual
  permitirDuplicados: false,
  nombreCategoria: undefined,
  ...props.opciones,
}));

const nombresContexto = {
  escena: ['la escena', 'esta escena'],
  tematica: ['la temática', 'esta temática'],
  mapa: ['el mapa', 'este mapa'],
};
const nombreContexto = computed(
  () => (nombresContexto[op.value.contexto] ?? nombresContexto.mapa)[0]
);
const nombreContextoEsta = computed(
  () => (nombresContexto[op.value.contexto] ?? nombresContexto.mapa)[1]
);

const modal = ref(null);
const seleccionadas = ref([]);
const guardando = ref(false);
const error = ref('');
const posicionDefecto = ref('left');

// Ordenado por stack_order descendente (la capa que se dibuja encima aparece
// primero). No basta con invertir el array: tras reordenar, el adaptador
// actualiza el stack_order de cada capa in-place sin recolocarla en el
// array, así que hay que ordenar explícitamente en cada render.
const capasExistentes = computed(() =>
  [...(props.adaptador.layersOrdered.value ?? [])].sort((a, b) => b.stack_order - a.stack_order)
);
const cargando = computed(() => props.adaptador.isLoading?.value ?? false);

const idsSeleccionadas = computed(() => seleccionadas.value.map((l) => l.pk));
const idsExistentes = computed(() =>
  op.value.permitirDuplicados
    ? []
    : capasExistentes.value.map((c) => c.geonode_id).filter((v) => v !== null && v !== undefined)
);
const hayPrivadasSeleccionadas = computed(() => seleccionadas.value.some((l) => !l.is_published));

// ── Selección de capas nuevas ───────────────────────────────────────────────

function alSeleccionarCapa(layer) {
  if (idsExistentes.value.includes(layer.pk)) return;
  const i = seleccionadas.value.findIndex((l) => l.pk === layer.pk);
  if (i >= 0) seleccionadas.value.splice(i, 1);
  else seleccionadas.value.push(layer);
}

function removerSeleccionada(pk) {
  seleccionadas.value = seleccionadas.value.filter((l) => l.pk !== pk);
}

// ── Acciones sobre capas existentes (persisten al instante) ──────────────────

async function alternarVisible(capa) {
  await props.adaptador.actualizar(capa.id, { visible: !capa.visible });
}

async function cambiarOpacidad(capa) {
  await props.adaptador.actualizar(capa.id, { opacity: capa.opacity });
}

async function actualizarEstilo({ layerId, style, styleTitle }) {
  await props.adaptador.actualizarEstilo(layerId, style, styleTitle);
}

async function eliminarExistente(capa) {
  if (!confirm(`¿Eliminar la capa "${capa.name}" de ${nombreContexto.value}?`)) return;
  const ok = await props.adaptador.eliminar(capa);
  if (ok) emit('guardado');
}

async function moverArriba(idx) {
  if (idx === 0) return;
  const ord = capasExistentes.value;
  await props.adaptador.reordenar([
    { id: ord[idx].id, stack_order: ord[idx - 1].stack_order },
    { id: ord[idx - 1].id, stack_order: ord[idx].stack_order },
  ]);
}

async function moverAbajo(idx) {
  const ord = capasExistentes.value;
  if (idx === ord.length - 1) return;
  await props.adaptador.reordenar([
    { id: ord[idx].id, stack_order: ord[idx + 1].stack_order },
    { id: ord[idx + 1].id, stack_order: ord[idx].stack_order },
  ]);
}

// ── Guardar capas nuevas (lote) ─────────────────────────────────────────────

async function guardar() {
  if (!seleccionadas.value.length) {
    cerrar();
    return;
  }
  guardando.value = true;
  error.value = '';

  const data = await props.adaptador.agregar(seleccionadas.value, {
    posicion: posicionDefecto.value,
  });
  guardando.value = false;

  if (!data || data?.success === false) {
    error.value = data?.errors?.join(' ') || 'No se pudieron agregar las capas.';
    return;
  }

  seleccionadas.value = [];
  emit('guardado');
}

// ── Apertura / cierre (v-model:abierto + evento close del <dialog>) ──────────

function cerrar() {
  emit('update:abierto', false);
}

function sincronizarCierre() {
  emit('update:abierto', false);
}

let dialogEl = null;

watch(
  () => props.abierto,
  async (abierto) => {
    if (abierto) {
      seleccionadas.value = [];
      error.value = '';
      posicionDefecto.value = 'left';
      await props.adaptador.cargar();
      await nextTick();
      modal.value?.abrirModal();
      const id = modal.value?.id_aleatorio;
      if (id) {
        dialogEl = document.getElementById(id);
        dialogEl?.addEventListener('close', sincronizarCierre);
      }
    } else {
      dialogEl?.removeEventListener('close', sincronizarCierre);
      modal.value?.cerrarModal();
      dialogEl = null;
    }
  }
);

onBeforeUnmount(() => {
  dialogEl?.removeEventListener('close', sincronizarCierre);
});
</script>

<template>
  <ClientOnly>
    <SisdaiModal ref="modal" tamanio-modal="modal-grande">
      <template #encabezado>
        <h1 class="m-0">{{ op.titulo }}</h1>
      </template>

      <template #cuerpo>
        <div v-if="op.posiciones" class="m-b-2">
          <SisdaiSelector v-model="posicionDefecto" etiqueta="Asignar capas nuevas al panel">
            <option v-for="p in op.posiciones" :key="p.value" :value="p.value">
              {{ p.label }}
            </option>
          </SisdaiSelector>
        </div>

        <div class="dos-columnas">
          <section class="col-buscador">
            <h2 class="seccion-titulo">Busca, selecciona y agrega capas</h2>
            <CapasBuscador
              :existing-layer-ids="idsExistentes"
              :selected-layer-ids="idsSeleccionadas"
              :nombre-categoria="op.nombreCategoria"
              @select-layer="alSeleccionarCapa"
            />
          </section>

          <section class="col-panel">
            <div class="bloque">
              <h2 class="seccion-titulo m-t-0">
                Capas en {{ nombreContextoEsta }}
                <span class="texto-secundario">({{ capasExistentes.length }})</span>
              </h2>
              <div class="caja-existentes">
                <GeocontenidosLoader v-if="cargando" />

                <p v-else-if="capasExistentes.length === 0" class="texto-secundario p-1">
                  {{ nombreContextoEsta }} aún no tiene capas.
                </p>

                <ul v-else class="lista-bloques">
                  <li
                    v-for="(capa, idx) in capasExistentes"
                    :key="capa.id"
                    class="item-bloque existente"
                  >
                    <div class="bloque-cabecera flex flex-contenido-separado">
                      <label class="capa-toggle flex">
                        <input
                          type="checkbox"
                          :checked="capa.visible"
                          @change="alternarVisible(capa)"
                        />
                        <strong>{{ capa.name }}</strong>
                      </label>
                      <span
                        v-if="capa.dataset_is_published != null"
                        class="etiqueta-visibilidad"
                        :class="capa.dataset_is_published ? 'es-publica' : 'es-privada'"
                      >
                        {{ capa.dataset_is_published ? 'Pública' : 'Privada' }}
                      </span>
                    </div>

                    <p class="texto-secundario m-0">
                      GeoNode ID: {{ capa.geonode_id ?? '—' }} · Opacidad:
                      {{ Math.round((capa.opacity ?? 1) * 100) }}%
                    </p>
                    <div class="acciones-capa flex flex-contenido-final m-t-2">
                      <CapasSelectorEstilo
                        v-if="op.mostrarEstilo"
                        :capa="capa"
                        @update:style="actualizarEstilo"
                      />
                      <button
                        v-if="op.mostrarMarcadores"
                        class="boton-pictograma boton-sin-contenedor-secundario"
                        type="button"
                        aria-label="Marcadores"
                        title="Marcadores"
                        @click="emit('abrir-marcadores', capa)"
                      >
                        <span class="pictograma-mapa-generador" aria-hidden="true" />
                      </button>
                      <button
                        v-if="op.mostrarNarrativas"
                        class="boton-pictograma boton-sin-contenedor-secundario"
                        type="button"
                        aria-label="Narrativa"
                        title="Narrativa"
                        @click="emit('abrir-narrativa', capa)"
                      >
                        <span class="pictograma-escribir" aria-hidden="true" />
                      </button>
                      <button
                        class="boton-pictograma boton-sin-contenedor-secundario"
                        type="button"
                        aria-label="Eliminar capa"
                        title="Eliminar capa"
                        @click="eliminarExistente(capa)"
                      >
                        <span class="pictograma-eliminar" aria-hidden="true" />
                      </button>
                      <button
                        :aria-label="capa.visible ? 'Ocultar' : 'Mostrar'"
                        :title="capa.visible ? 'Ocultar' : 'Mostrar'"
                        type="button"
                        class="boton-pictograma boton-sin-contenedor-secundario"
                        @click="alternarVisible(capa)"
                      >
                        <span
                          :class="`pictograma-ojo-${capa.visible ? 'ver' : 'ocultar'}`"
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    <div class="acciones flex flex-contenido-final m-t-1">
                      <fieldset v-if="op.mostrarOpacidad" class="opacidad m-t-1 m-b-0">
                        <label :for="`opacidad-${capa.id}`">Opacidad</label>
                        <input
                          :id="`opacidad-${capa.id}`"
                          v-model.number="capa.opacity"
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          @change="cambiarOpacidad(capa)"
                        />
                      </fieldset>
                      <button
                        class="boton-pictograma boton-sin-contenedor-secundario"
                        :disabled="idx === 0"
                        type="button"
                        aria-label="Subir capa"
                        title="Subir capa"
                        @click="moverArriba(idx)"
                      >
                        <span class="pictograma-angulo-arriba" aria-hidden="true" />
                      </button>
                      <button
                        class="boton-pictograma boton-sin-contenedor-secundario"
                        :disabled="idx === capasExistentes.length - 1"
                        type="button"
                        aria-label="Bajar capa"
                        title="Bajar capa"
                        @click="moverAbajo(idx)"
                      >
                        <span class="pictograma-angulo-abajo" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div class="bloque">
              <h2 class="seccion-titulo">
                Por agregar
                <span class="texto-secundario">({{ seleccionadas.length }})</span>
              </h2>

              <p v-if="hayPrivadasSeleccionadas" class="aviso-privadas m-t-0">
                Las capas privadas no se mostrarán en el visor público hasta que se publiquen en el
                catálogo.
              </p>

              <div class="caja-pendientes">
                <p v-if="!seleccionadas.length" class="texto-secundario p-1">
                  Selecciona capas en la columna izquierda.
                </p>
                <ul v-else class="lista-bloques">
                  <li
                    v-for="layer in seleccionadas"
                    :key="`sel-${layer.pk}`"
                    class="item-bloque pendiente"
                  >
                    <div class="bloque-cabecera flex flex-contenido-separado">
                      <div class="min-w-0">
                        <strong>{{ layer.title || layer.alternate }}</strong>
                        <p class="texto-secundario m-0">{{ layer.alternate }}</p>
                      </div>
                      <span
                        class="etiqueta-visibilidad"
                        :class="layer.is_published ? 'es-publica' : 'es-privada'"
                      >
                        {{ layer.is_published ? 'Pública' : 'Privada' }}
                      </span>
                      <button
                        class="boton-pictograma boton-sin-contenedor-secundario"
                        type="button"
                        aria-label="Quitar"
                        title="Quitar"
                        @click="removerSeleccionada(layer.pk)"
                      >
                        <span class="pictograma-cerrar" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <p v-if="error" class="texto-error m-t-2">{{ error }}</p>
      </template>

      <template #pie>
        <div class="flex flex-contenido-separado">
          <span class="texto-secundario">
            <strong>{{ capasExistentes.length }}</strong> en {{ nombreContextoEsta }} ·
            <strong>{{ seleccionadas.length }}</strong> por agregar
          </span>
          <div class="flex flex-contenido-final">
            <button class="boton-secundario" type="button" @click="cerrar">Cerrar</button>
            <button
              class="boton-primario"
              type="button"
              :disabled="guardando || !seleccionadas.length"
              @click="guardar"
            >
              {{
                guardando
                  ? 'Guardando…'
                  : `Agregar ${seleccionadas.length} ${
                      seleccionadas.length === 1 ? 'capa' : 'capas'
                    }`
              }}
            </button>
          </div>
        </div>
      </template>
    </SisdaiModal>
  </ClientOnly>
</template>

<style lang="scss" scoped>
.modal {
  border: 2px solid var(--color-secundario-2);
}

.modal::backdrop {
  background-color: rgba(0, 0, 0, 0.8);
}

.dos-columnas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;

  // Los items de grid tienen min-width:auto: sin esto, el contenido que no
  // quiere achicarse (nombres de capa largos y sin espacios) ensancha su
  // columna en vez de ajustar el texto, forzando scroll horizontal del modal.
  > * {
    min-width: 0;
  }
}

.seccion-titulo {
  font-size: 1rem;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.col-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.caja-existentes,
.caja-pendientes {
  border: 1px solid var(--color-neutro-1);
  border-radius: 8px;
  padding: 8px;
  max-height: 30vh;
  overflow-y: auto;
  background-color: var(--fondo);
}

.lista-bloques {
  list-style: none;
  padding: 0;
  margin: 0;
}

.item-bloque {
  border: 1px solid var(--color-neutro-1);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 6px;
  background-color: var(--fondo-acento);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.item-bloque.existente {
  border-left: 3px solid #16703c;
}

.item-bloque.pendiente {
  border-left: 3px solid var(--color-primario-4);
}

.bloque-cabecera {
  align-items: flex-start;
}

.capa-toggle {
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.etiqueta-visibilidad {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.7rem;
  white-space: nowrap;
}

.etiqueta-visibilidad.es-publica {
  background-color: #d8f5dc;
  color: #16703c;
}

.etiqueta-visibilidad.es-privada {
  background-color: #fde2e1;
  color: #c0392b;
}

.opacidad,
.min-w-0 {
  min-width: 0;
  flex: 1;
}

.acciones-capa,
.acciones {
  align-items: flex-end;
  gap: 4px;
}

.aviso-privadas {
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  background-color: #fff4e5;
  color: #8a5a00;
  border: 1px solid #f0c674;
}

.texto-error {
  color: var(--color-error, #c0392b);
}

.flex {
  gap: 8px;
}

@media (max-width: 900px) {
  .dos-columnas {
    grid-template-columns: 1fr;
  }
}

:deep(.modal) {
  margin-top: -20rem !important;
  margin-bottom: 2vh !important;
}
:deep(.modal-cuerpo) {
  max-height: calc(76vh - 120px) !important;
}
:deep(.modal-pie) {
  margin-top: 20px !important;
}
</style>
