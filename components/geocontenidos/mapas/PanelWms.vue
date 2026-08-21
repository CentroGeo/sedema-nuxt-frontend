<script setup>
const props = defineProps({
  capas: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['volver', 'editar', 'eliminar']);

const modalConfirmar = ref(null);

async function solicitarEliminar(capa) {
  const confirmado = await modalConfirmar.value?.abrir({
    titulo: 'Eliminar capa WMS',
    mensaje: `¿Eliminar la capa WMS "${capa.name}"?`,
    textoConfirmar: 'Eliminar',
  });

  if (confirmado) {
    emit('eliminar', capa.id);
  }
}
</script>

<template>
  <aside class="panel-wms">
    <div class="panel-wms__encabezado">
      <div>
        <h3 class="m-0">Capas WMS</h3>
        <p class="texto-secundario m-t-1 m-b-0">Servicios externos agregados al mapa</p>
      </div>

      <button type="button" class="boton boton-secundario boton-chico" @click="emit('volver')">
        Volver
      </button>
    </div>

    <p v-if="!props.capas.length" class="panel-wms__vacio texto-secundario">
      Aún no hay capas WMS agregadas.
    </p>

    <div v-else class="panel-wms__lista">
      <article v-for="capa in props.capas" :key="capa.id" class="tarjeta-wms">
        <div class="tarjeta-wms__encabezado">
          <h4 class="tarjeta-wms__nombre">
            {{ capa.name }}
          </h4>
        </div>

        <p class="tarjeta-wms__url" :title="capa.url">
          {{ capa.url }}
        </p>

        <div class="tarjeta-wms__acciones">
          <button
            type="button"
            class="boton boton-secundario boton-chico"
            @click="emit('editar', capa)"
          >
            <span class="pictograma-editar m-r-1" aria-hidden="true" />
            Editar
          </button>

          <button
            type="button"
            class="boton boton-secundario boton-chico texto-color-error"
            @click="solicitarEliminar(capa)"
          >
            <span class="pictograma-eliminar m-r-1" aria-hidden="true" />
            Eliminar
          </button>
        </div>
      </article>
    </div>

    <GeocontenidosModalConfirmar ref="modalConfirmar" />
  </aside>
</template>

<style lang="scss" scoped>
.panel-wms {
  height: 100%;
  min-width: 280px;
  max-width: 280px;
  padding: 12px;
  overflow-y: auto;
  background-color: var(--fondo);
  border-left: 1px solid var(--color-neutro-1);
}

.panel-wms__encabezado {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}

.panel-wms__vacio {
  padding: 16px 10px;
  text-align: center;
  border: 1px dashed var(--color-neutro-1);
  border-radius: 8px;
}

.panel-wms__lista {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tarjeta-wms {
  overflow: hidden;
  background-color: var(--fondo-acento);
  border: 1px solid var(--color-neutro-1);
  border-radius: 8px;
}

.tarjeta-wms__encabezado {
  padding: 10px 12px;
  background-color: var(--color-primario-4);
  color: var(--texto-inverso);
}

.tarjeta-wms__nombre {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 1rem;
  line-height: 1.25;
}

.tarjeta-wms__url {
  display: -webkit-box;
  margin: 0;
  padding: 9px 12px;
  overflow: hidden;
  overflow-wrap: anywhere;
  font-size: 0.75rem;
  line-height: 1.35;
  border-bottom: 1px solid var(--color-neutro-1);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.tarjeta-wms__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding: 8px 10px;
}
</style>
